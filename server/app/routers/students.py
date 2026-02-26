from uuid import UUID
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy import select, or_, exists
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import httpx

from app.database import get_db
from app.models.student import Student, ParentContact, StudentHistory, HistoryEventType, ParentFeedback
from app.models.group import GroupStudent, Group
from app.models.lesson import Lesson, LessonAttendance
from app.models.subject import Subject
from app.models.employee import Employee
from app.models.report import WeeklyReport
from app.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse,
    ParentContactCreate, ParentContactResponse,
    StudentHistoryResponse, GroupInfoResponse,
    StudentPerformanceRecord, StudentPerformanceResponse,
    ParentFeedbackCreate, ParentFeedbackUpdate, ParentFeedbackResponse,
)
from app.schemas.report import WeeklyReportResponse, WeeklyReportUpdate, WeeklyReportParentCommentUpdate
from app.auth.dependencies import get_current_user, get_manager_location_id
from app.config import settings

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[StudentResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
    manager_location_id: Optional[UUID] = Depends(get_manager_location_id),
    all: bool = Query(False, description="Return all students regardless of location (for add-to-group search)"),
):
    # Build query with location filter if manager
    query = select(Student).options(
        selectinload(Student.parent_contacts),
        selectinload(Student.groups).selectinload(GroupStudent.group)
    )

    # If manager and not requesting all students, filter by location
    if manager_location_id is not None and not all:
        # Students in at least one active group at manager's location
        in_location = exists(
            select(GroupStudent.id)
            .join(Group, GroupStudent.group_id == Group.id)
            .where(
                GroupStudent.student_id == Student.id,
                Group.school_location_id == manager_location_id,
                GroupStudent.is_archived == False,
            )
        )
        # Students without any active group associations
        no_groups = ~exists(
            select(GroupStudent.id).where(
                GroupStudent.student_id == Student.id,
                GroupStudent.is_archived == False,
            )
        )
        query = query.where(or_(in_location, no_groups))

    result = await db.execute(query.order_by(Student.last_name))
    students = result.scalars().all()

    # Manually construct response to include groups
    students_data = []
    for student in students:
        # Filter groups by location for managers
        groups_to_show = [
            GroupInfoResponse(
                id=gs.group.id,
                name=gs.group.name,
                school_location=None  # Deprecated field, will be removed
            )
            for gs in student.groups
            if not gs.is_archived and (
                manager_location_id is None or
                gs.group.school_location_id == manager_location_id
            )
        ]

        student_dict = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "phone": student.phone,
            "telegram_id": student.telegram_id,
            "current_school": student.current_school,
            "class_number": student.class_number,
            "status": student.status,
            "created_at": student.created_at,
            "parent_contacts": student.parent_contacts,
            "groups": groups_to_show,
            "history": []
        }
        students_data.append(StudentResponse(**student_dict))

    return students_data


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    contacts_data = data.parent_contacts
    student_data = data.model_dump(exclude={"parent_contacts"})
    student = Student(**student_data)

    for c in contacts_data:
        student.parent_contacts.append(ParentContact(**c.model_dump()))

    student.history.append(StudentHistory(
        event_type=HistoryEventType.added_to_db,
        description="Студент добавлен в базу данных",
    ))

    db.add(student)
    await db.commit()
    await db.refresh(student, attribute_names=["parent_contacts", "groups", "history"])

    # Manually construct response to include groups and history
    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "telegram_id": student.telegram_id,
        "current_school": student.current_school,
        "class_number": student.class_number,
        "status": student.status,
        "created_at": student.created_at,
        "parent_contacts": student.parent_contacts,
        "groups": [],  # New students don't have groups yet
        "history": student.history
    }
    return StudentResponse(**student_dict)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.parent_contacts),
            selectinload(Student.groups).selectinload(GroupStudent.group),
            selectinload(Student.history)
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Manually construct response to include groups and history
    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "telegram_id": student.telegram_id,
        "current_school": student.current_school,
        "class_number": student.class_number,
        "status": student.status,
        "created_at": student.created_at,
        "parent_contacts": student.parent_contacts,
        "groups": [
            GroupInfoResponse(
                id=gs.group.id,
                name=gs.group.name,
                school_location=gs.group.school_location
            )
            for gs in student.groups
            if not gs.is_archived
        ],
        "history": student.history
    }
    return StudentResponse(**student_dict)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.parent_contacts),
            selectinload(Student.groups).selectinload(GroupStudent.group),
            selectinload(Student.history)
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Handle parent contacts separately
    update_data = data.model_dump(exclude_unset=True)
    parent_contacts_data = update_data.pop("parent_contacts", None)

    # Track changes for history
    changes = []
    field_labels = {
        "first_name": "Имя",
        "last_name": "Фамилия",
        "phone": "Телефон",
        "telegram_id": "Telegram ID",
        "current_school": "Школа",
        "class_number": "Класс",
        "status": "Статус"
    }

    # Update basic fields and track changes
    for field, value in update_data.items():
        old_value = getattr(student, field, None)
        if old_value != value:
            field_label = field_labels.get(field, field)
            changes.append(f"{field_label}: '{old_value}' → '{value}'")
        setattr(student, field, value)

    # Update parent contacts if provided
    if parent_contacts_data is not None:
        # Remove all existing contacts
        for contact in student.parent_contacts:
            await db.delete(contact)

        # Add new contacts
        student.parent_contacts = []
        for contact_data in parent_contacts_data:
            student.parent_contacts.append(ParentContact(**contact_data))
        changes.append("Обновлены контакты родителей")

    # Add history entry if there were changes
    if changes:
        history_entry = StudentHistory(
            student_id=student_id,
            event_type=HistoryEventType.student_info_updated,
            description=f"Обновлена информация о студенте: {'; '.join(changes)}"
        )
        db.add(history_entry)

    await db.commit()
    await db.refresh(student, attribute_names=["parent_contacts", "groups", "history"])

    # Manually construct response to include groups and history
    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "telegram_id": student.telegram_id,
        "current_school": student.current_school,
        "class_number": student.class_number,
        "status": student.status,
        "created_at": student.created_at,
        "parent_contacts": student.parent_contacts,
        "groups": [
            GroupInfoResponse(
                id=gs.group.id,
                name=gs.group.name,
                school_location=gs.group.school_location
            )
            for gs in student.groups
            if not gs.is_archived
        ],
        "history": student.history
    }
    return StudentResponse(**student_dict)


@router.delete("/{student_id}")
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    await db.delete(student)
    await db.commit()
    return {"detail": "Deleted"}


# --- Parent Contacts ---

@router.post("/{student_id}/contacts", response_model=ParentContactResponse, status_code=status.HTTP_201_CREATED)
async def add_parent_contact(
    student_id: UUID,
    data: ParentContactCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    contact = ParentContact(student_id=student_id, **data.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{student_id}/contacts/{contact_id}")
async def delete_parent_contact(
    student_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ParentContact).where(ParentContact.id == contact_id, ParentContact.student_id == student_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
    return {"detail": "Deleted"}


# --- History ---

@router.get("/{student_id}/history", response_model=list[StudentHistoryResponse])
async def get_student_history(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(StudentHistory)
        .where(StudentHistory.student_id == student_id)
        .order_by(StudentHistory.created_at.desc())
    )
    return result.scalars().all()


# --- Performance ---

@router.get("/{student_id}/performance", response_model=StudentPerformanceResponse)
async def get_student_performance(
    student_id: UUID,
    group_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get performance data for a specific student (admin and manager)."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Access denied.")

    # Verify student exists
    student_result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Build query with joins
    query = (
        select(
            LessonAttendance,
            Lesson,
            Group,
            Subject
        )
        .join(Lesson, LessonAttendance.lesson_id == Lesson.id)
        .join(Group, Lesson.group_id == Group.id)
        .join(Subject, Group.subject_id == Subject.id)
        .where(
            LessonAttendance.student_id == student_id,
            Lesson.status == "conducted",
            Lesson.is_cancelled == False
        )
    )

    # Apply optional filters
    if group_id:
        query = query.where(Group.id == group_id)
    if start_date:
        query = query.where(Lesson.date >= start_date)
    if end_date:
        query = query.where(Lesson.date <= end_date)

    # Order by date descending
    query = query.order_by(Lesson.date.desc(), Lesson.time.desc())

    # Execute query
    result = await db.execute(query)
    rows = result.all()

    # Build performance records
    performance_records = []
    for attendance, lesson, group, subject in rows:
        performance_records.append(StudentPerformanceRecord(
            lesson_id=lesson.id,
            lesson_date=lesson.date,
            lesson_time=lesson.time,
            lesson_topic=lesson.topic,
            lesson_homework=lesson.homework,
            group_id=group.id,
            group_name=group.name,
            subject_name=subject.name,
            attendance=attendance.attendance,
            late_minutes=attendance.late_minutes,
            lesson_grade=attendance.lesson_grade,
            homework_grade=attendance.homework_grade,
            comment=attendance.comment,
        ))

    return StudentPerformanceResponse(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        performance_records=performance_records
    )


# --- AI Performance Report ---

@router.post("/{student_id}/generate-weekly-report")
async def generate_weekly_report(
    student_id: UUID,
    days: int = Body(7, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Generate AI-powered weekly performance report for a student."""
    # Verify student exists
    student_result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)

    # Build query with joins
    query = (
        select(
            LessonAttendance,
            Lesson,
            Group,
            Subject
        )
        .join(Lesson, LessonAttendance.lesson_id == Lesson.id)
        .join(Group, Lesson.group_id == Group.id)
        .join(Subject, Group.subject_id == Subject.id)
        .where(
            LessonAttendance.student_id == student_id,
            Lesson.status == "conducted",
            Lesson.is_cancelled == False,
            Lesson.date >= start_date,
            Lesson.date <= end_date
        )
        .order_by(Lesson.date.desc(), Lesson.time.desc())
    )

    # Execute query
    result = await db.execute(query)
    rows = result.all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No performance data found for the last {days} days"
        )

    # Prepare data for AI
    attendance_count = 0
    absent_count = 0
    late_count = 0
    homework_completed = 0
    homework_total = 0
    comments = []
    subjects_data = {}

    for attendance, lesson, group, subject in rows:
        # Count attendance
        if attendance.attendance == "present":
            attendance_count += 1
        elif attendance.attendance == "absent":
            absent_count += 1
        elif attendance.attendance == "late":
            late_count += 1
            attendance_count += 1

        # Count homework
        if lesson.had_previous_homework:
            homework_total += 1
            if attendance.homework_grade and attendance.homework_grade != "0":
                homework_completed += 1

        # Collect comments
        if attendance.comment:
            comments.append({
                "date": lesson.date.strftime("%d.%m.%Y"),
                "subject": subject.name,
                "comment": attendance.comment
            })

        # Collect subject data
        subject_name = subject.name
        if subject_name not in subjects_data:
            subjects_data[subject_name] = {
                "lessons": 0,
                "lesson_grades": [],
                "homework_grades": []
            }

        subjects_data[subject_name]["lessons"] += 1
        if attendance.lesson_grade:
            subjects_data[subject_name]["lesson_grades"].append(attendance.lesson_grade)
        if attendance.homework_grade and attendance.homework_grade != "0":
            subjects_data[subject_name]["homework_grades"].append(attendance.homework_grade)

    # Construct prompt for AI
    # ===========================================
    # НАСТРОЙКА ПРОМПТА - РЕДАКТИРУЙТЕ ЗДЕСЬ
    # ===========================================

    # Формируем данные по предметам
    subjects_summary = ""
    for subject_name, data in subjects_data.items():
        subjects_summary += f"\n{subject_name}: {data['lessons']} урок(ов)"
        if data["lesson_grades"]:
            subjects_summary += f", оценки за уроки: {', '.join(data['lesson_grades'])}"
        if data["homework_grades"]:
            subjects_summary += f", оценки за ДЗ: {', '.join(data['homework_grades'])}"

    # Формируем комментарии
    comments_summary = ""
    if comments:
        comments_summary = "\n\nКомментарии преподавателей:\n"
        for c in comments[:3]:  # Берем только первые 3 комментария для краткости
            comments_summary += f"- {c['date']} ({c['subject']}): {c['comment']}\n"

    # Основной промпт - шаблон для мессенджера
    prompt = f"""Составь еженедельный отчет для родителей в формате сообщения для мессенджера.

ДАННЫЕ:
Студент: {student.first_name} {student.last_name}
Период: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}
Посещаемость: {attendance_count}/{attendance_count + absent_count}, Пропусков: {absent_count}, Опозданий: {late_count}
ДЗ: {homework_completed}/{homework_total}
{subjects_summary}{comments_summary}

СТРОГИЙ ФОРМАТ ОТЧЕТА (используй ТОЧНО такую структуру):

Здравствуйте! Отчет об успеваемости {student.first_name} за {start_date.strftime('%d.%m')} — {end_date.strftime('%d.%m.%Y')}

📊 Посещаемость
✅ Присутствовал — {attendance_count} урок(ов)
[ЕСЛИ БЫЛИ ОПОЗДАНИЯ: ⏰ Опоздание — {late_count} (указать предмет и дату, если известно)]
[ЕСЛИ БЫЛИ ПРОПУСКИ: ❌ Отсутствовал — {absent_count} (указать предмет и дату, если известно)]

📝 Домашние задания
Выполнено: {homework_completed} из {homework_total} ({int(homework_completed/homework_total*100) if homework_total > 0 else 0}%)
[ЕСЛИ ЕСТЬ ОЦЕНКИ: Оценки: [список оценок] → средняя [среднее]]

💬 Обратная связь от преподавателей
[ДЛЯ КАЖДОГО КОММЕНТАРИЯ: Предмет (дата) — Текст комментария]
[ЕСЛИ НЕТ КОММЕНТАРИЕВ: Нет комментариев от преподавателей за этот период.]

💡 Рекомендации
• [Конкретная рекомендация на основе данных]
• [Еще одна рекомендация]
[ЕСЛИ ВСЕ ХОРОШО: • Продолжать в том же духе!]

С уважением, администрация школы
По всем вопросам: +7 (999) 123-45-67

КРИТИЧЕСКИ ВАЖНО - ОБРАБОТКА КОММЕНТАРИЕВ ПРЕПОДАВАТЕЛЕЙ:
1. ФИЛЬТРАЦИЯ И СМЯГЧЕНИЕ:
   - Убери любую грубость, сарказм или неуместные выражения
   - Перефрази негативные комментарии в конструктивный формат
   - Замени эмоциональные фразы на профессиональные
   - Пример: "Ученик постоянно отвлекается и мешает другим" → "Рекомендуется больше концентрироваться на уроке"

2. СОКРАЩЕНИЕ ДЛИННЫХ КОММЕНТАРИЕВ:
   - Если комментарий длиннее 100 символов - сократи до сути (50-80 символов)
   - Оставь только главную информацию: факты и рекомендации
   - Убери лишние детали и повторы
   - Пример: "Сегодня на уроке ученик пришел неподготовленным, не сделал домашнее задание, которое я задавала на прошлом уроке, также забыл тетрадь и учебник" → "Пришел неподготовленным, не выполнил ДЗ, забыл материалы"

3. ПРОФЕССИОНАЛЬНЫЙ ТОН:
   - Используй нейтральный, уважительный язык
   - Фокус на фактах, а не на эмоциях
   - Конструктивные замечания вместо критики
   - Положительные моменты выделяй, негативные - смягчай

4. ФОРМАТ:
   - Максимум 2-3 самых важных комментария
   - Каждый комментарий - не более 80 символов
   - Если комментариев много - выбери наиболее значимые

ВАЖНО:
- Используй ТОЧНО такой формат с эмодзи и секциями
- НЕ добавляй лишний текст или объяснения
- ОБЯЗАТЕЛЬНО обработай все комментарии преподавателей (смягчи негатив, сократи длинные)
- Рекомендации должны быть конкретными и основаны на данных
- Формат: короткие строки, как в мессенджере
"""

    # Call OpenRouter API
    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "qwen/qwen3.5-plus-02-15",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 500,  # Увеличено для более подробного отчета (~350 слов)
                    "temperature": 0.7  # Чуть больше креативности
                },
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()

            if "choices" not in result or len(result["choices"]) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate report from AI"
                )

            ai_report = result["choices"][0]["message"]["content"]

            # Сохранить репорт в БД
            weekly_report = WeeklyReport(
                student_id=student_id,
                created_by=current_user.id,
                period_start=start_date,
                period_end=end_date,
                attendance_count=attendance_count,
                absent_count=absent_count,
                late_count=late_count,
                homework_completed=homework_completed,
                homework_total=homework_total,
                ai_report=ai_report
            )
            db.add(weekly_report)
            await db.commit()
            await db.refresh(weekly_report)

            return {
                "report_id": str(weekly_report.id),
                "report": ai_report,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "stats": {
                    "attendance_count": attendance_count,
                    "absent_count": absent_count,
                    "late_count": late_count,
                    "homework_completed": homework_completed,
                    "homework_total": homework_total
                }
            }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to AI service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/weekly-reports/latest-all", response_model=dict[str, WeeklyReportResponse])
async def get_all_students_latest_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Получить последний отчет для каждого активного студента."""
    # Get all active students
    students_result = await db.execute(
        select(Student).where(Student.status == "active")
    )
    students = students_result.scalars().all()

    # Get latest report for each student using a subquery
    from sqlalchemy import func
    from sqlalchemy.orm import aliased

    # Subquery to get max created_at for each student
    subq = (
        select(
            WeeklyReport.student_id,
            func.max(WeeklyReport.created_at).label('max_created_at')
        )
        .group_by(WeeklyReport.student_id)
        .subquery()
    )

    # Join to get the full report rows
    query = (
        select(WeeklyReport)
        .join(
            subq,
            (WeeklyReport.student_id == subq.c.student_id) &
            (WeeklyReport.created_at == subq.c.max_created_at)
        )
    )

    result = await db.execute(query)
    reports = result.scalars().all()

    # Build dict with student_id as key
    reports_dict = {str(report.student_id): report for report in reports}

    return reports_dict


@router.get("/{student_id}/weekly-reports", response_model=list[WeeklyReportResponse])
async def get_weekly_reports_history(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Получить историю недельных репортов студента."""
    # Verify student exists
    student_result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get all weekly reports for this student, ordered by creation date (newest first)
    query = (
        select(WeeklyReport)
        .where(WeeklyReport.student_id == student_id)
        .order_by(WeeklyReport.created_at.desc())
    )

    result = await db.execute(query)
    reports = result.scalars().all()

    return reports


@router.patch("/weekly-reports/{report_id}", response_model=WeeklyReportResponse)
async def update_weekly_report(
    report_id: UUID,
    update_data: WeeklyReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Обновить недельный репорт."""
    # Find the report
    result = await db.execute(
        select(WeeklyReport).where(WeeklyReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")

    # Update the report
    report.ai_report = update_data.ai_report
    await db.commit()
    await db.refresh(report)

    return report


@router.patch("/weekly-reports/{report_id}/parent-comment", response_model=WeeklyReportResponse)
async def update_parent_comment(
    report_id: UUID,
    data: WeeklyReportParentCommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Добавить/обновить комментарий о реакции родителя на отчёт."""
    result = await db.execute(select(WeeklyReport).where(WeeklyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")

    if data.parent_feedback is not None:
        report.parent_feedback = data.parent_feedback
    if data.parent_reaction is not None:
        report.parent_reaction = data.parent_reaction

    await db.commit()
    await db.refresh(report)
    return report


@router.post("/weekly-reports/{report_id}/approve", response_model=WeeklyReportResponse)
async def approve_weekly_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Подтвердить недельный репорт."""
    # Find the report
    result = await db.execute(
        select(WeeklyReport).where(WeeklyReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")

    # Approve the report
    report.is_approved = True
    await db.commit()
    await db.refresh(report)

    return report


@router.post("/weekly-reports/{report_id}/unapprove", response_model=WeeklyReportResponse)
async def unapprove_weekly_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Отменить подтверждение недельного репорта."""
    # Find the report
    result = await db.execute(
        select(WeeklyReport).where(WeeklyReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")

    # Unapprove the report
    report.is_approved = False
    await db.commit()
    await db.refresh(report)

    return report


@router.delete("/weekly-reports/{report_id}")
async def delete_weekly_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Удалить недельный репорт."""
    # Find the report
    result = await db.execute(
        select(WeeklyReport).where(WeeklyReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")

    # Delete the report
    await db.delete(report)
    await db.commit()

    return {"detail": "Weekly report deleted successfully"}


# ============================================
# Parent Feedback Endpoints
# ============================================

@router.post("/{student_id}/parent-feedbacks", response_model=ParentFeedbackResponse)
async def create_parent_feedback(
    student_id: UUID,
    data: ParentFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Создать новую обратную связь с родителем."""
    # Check if student exists
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Create feedback
    feedback = ParentFeedback(
        student_id=student_id,
        created_by=current_user.id,
        created_by_first_name=current_user.first_name,
        created_by_last_name=current_user.last_name,
        contact_type=data.contact_type,
        feedback_to_parent=data.feedback_to_parent,
        feedback_from_parent=data.feedback_from_parent,
        parent_reaction=data.parent_reaction,
    )

    db.add(feedback)

    # Add history entry
    contact_type_label = {
        "call": "Звонок",
        "telegram": "Telegram",
        "in_person": "Лично"
    }.get(data.contact_type, data.contact_type)

    history_entry = StudentHistory(
        student_id=student_id,
        event_type=HistoryEventType.parent_feedback_added,
        description=f"Добавлена обратная связь с родителем ({contact_type_label}). Создал: {current_user.first_name} {current_user.last_name}"
    )
    db.add(history_entry)

    await db.commit()
    await db.refresh(feedback, ["created_by_employee"])

    return feedback


@router.get("/{student_id}/parent-feedbacks", response_model=list[ParentFeedbackResponse])
async def get_student_parent_feedbacks(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Получить все обратные связи для студента."""
    result = await db.execute(
        select(ParentFeedback)
        .where(ParentFeedback.student_id == student_id)
        .options(selectinload(ParentFeedback.created_by_employee))
        .order_by(ParentFeedback.created_at.desc())
    )
    feedbacks = result.scalars().all()
    return feedbacks


@router.patch("/parent-feedbacks/{feedback_id}", response_model=ParentFeedbackResponse)
async def update_parent_feedback(
    feedback_id: UUID,
    data: ParentFeedbackUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Обновить обратную связь с родителем."""
    result = await db.execute(
        select(ParentFeedback)
        .where(ParentFeedback.id == feedback_id)
        .options(selectinload(ParentFeedback.created_by_employee))
    )
    feedback = result.scalar_one_or_none()

    if not feedback:
        raise HTTPException(status_code=404, detail="Parent feedback not found")

    # Update fields
    if data.contact_type is not None:
        feedback.contact_type = data.contact_type
    if data.feedback_to_parent is not None:
        feedback.feedback_to_parent = data.feedback_to_parent
    if data.feedback_from_parent is not None:
        feedback.feedback_from_parent = data.feedback_from_parent
    if data.parent_reaction is not None:
        feedback.parent_reaction = data.parent_reaction

    await db.commit()
    await db.refresh(feedback)

    return feedback


@router.delete("/parent-feedbacks/{feedback_id}")
async def delete_parent_feedback(
    feedback_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Удалить обратную связь с родителем."""
    result = await db.execute(
        select(ParentFeedback).where(ParentFeedback.id == feedback_id)
    )
    feedback = result.scalar_one_or_none()

    if not feedback:
        raise HTTPException(status_code=404, detail="Parent feedback not found")

    # Save info for history before deleting
    student_id = feedback.student_id
    contact_type_label = {
        "call": "Звонок",
        "telegram": "Telegram",
        "in_person": "Лично"
    }.get(feedback.contact_type, feedback.contact_type)

    # Add history entry
    history_entry = StudentHistory(
        student_id=student_id,
        event_type=HistoryEventType.parent_feedback_deleted,
        description=f"Удалена обратная связь с родителем ({contact_type_label}). Удалил: {current_user.first_name} {current_user.last_name}"
    )
    db.add(history_entry)

    await db.delete(feedback)
    await db.commit()

    return {"detail": "Parent feedback deleted successfully"}
