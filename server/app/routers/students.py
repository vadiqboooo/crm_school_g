from uuid import UUID
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import httpx

from app.database import get_db
from app.models.student import Student, ParentContact, StudentHistory, HistoryEventType
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
)
from app.schemas.report import WeeklyReportResponse
from app.auth.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[StudentResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.parent_contacts),
            selectinload(Student.groups).selectinload(GroupStudent.group)
        )
        .order_by(Student.last_name)
    )
    students = result.scalars().all()

    # Manually construct response to include groups
    students_data = []
    for student in students:
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

    # Update basic fields
    for field, value in update_data.items():
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
    """Get performance data for a specific student (admin only)."""
    # Admin-only access
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")

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

    # Основной промпт - можно настраивать формат и стиль здесь
    prompt = f"""Составь подробное сообщение для родителей от администрации школы (150-200 слов).

ДАННЫЕ:
Студент: {student.first_name} {student.last_name}
Период: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}
Посещаемость: {attendance_count}/{attendance_count + absent_count}, Пропусков: {absent_count}, Опозданий: {late_count}
ДЗ: {homework_completed}/{homework_total}
{subjects_summary}{comments_summary}

ТРЕБОВАНИЯ К СТРУКТУРЕ:

1. ПРИВЕТСТВИЕ (1 предложение):
   - Начни с эмодзи
   - Укажи период отчета

2. ПОСЕЩАЕМОСТЬ (2-3 предложения):
   - ОБЯЗАТЕЛЬНО укажи цифры: "За период посетил(а) X из Y уроков"
   - Если были пропуски - укажи их количество
   - Если были опоздания - укажи их количество
   - Оценить посещаемость (отлично/хорошо/требует внимания)

3. ДОМАШНИЕ ЗАДАНИЯ (2-3 предложения):
   - ОБЯЗАТЕЛЬНО укажи цифры: "Выполнено X из Y домашних заданий"
   - Оценить выполнение ДЗ
   - Если есть невыполненные - отметить это

4. АНАЛИЗ ПО ПРЕДМЕТАМ (2-3 предложения):
   - Упомянуть успехи по конкретным предметам
   - Указать проблемные предметы (если есть)
   - Использовать данные об оценках

5. РЕКОМЕНДАЦИИ (2-3 предложения):
   - Конкретные рекомендации для улучшения
   - Что нужно подтянуть
   - Позитивное завершение

ВАЖНО:
- ОБЯЗАТЕЛЬНО включи в текст цифры посещаемости и ДЗ
- Пиши от лица администрации школы
- Тон: профессиональный, но дружелюбный
- Объем: 150-200 слов

Пример структуры:
"📊 Отчет за период 12.02-19.02.2026

Посещаемость: За период {student.first_name} посетила 5 из 6 уроков. Был один пропуск по математике. Опозданий не зафиксировано. В целом, посещаемость на хорошем уровне.

Домашние задания: Выполнено 4 из 5 домашних заданий (80%). Одно задание по русскому языку осталось невыполненным...

[продолжение]"
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
