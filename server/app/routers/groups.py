from uuid import UUID
from datetime import datetime, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models.group import Group, GroupStudent
from app.models.employee import Employee
from app.models.lesson import Lesson
from app.models.student import Student, StudentHistory, HistoryEventType
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse, GroupStudentAdd, GroupStudentResponse
from app.schemas.lesson import LessonResponse
from app.auth.dependencies import get_current_user, get_manager_location_id

router = APIRouter(prefix="/groups", tags=["groups"])


class GenerateLessonsRequest(BaseModel):
    end_date: Optional[date] = None
    months: Optional[int] = None


@router.get("/")
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    manager_location_id: Optional[UUID] = Depends(get_manager_location_id),
):
    query = select(Group).options(
        selectinload(Group.subject),
        selectinload(Group.teacher),
        selectinload(Group.group_students).selectinload(GroupStudent.student),
        selectinload(Group.schedules),
        selectinload(Group.location)
    )

    # Если пользователь - учитель (не админ), показываем только его группы
    if current_user.role == "teacher":
        query = query.where(Group.teacher_id == current_user.id)

    # Если пользователь - менеджер, показываем только группы его филиала
    elif manager_location_id is not None:
        query = query.where(Group.school_location_id == manager_location_id)

    query = query.order_by(Group.name)
    result = await db.execute(query)
    groups = result.scalars().all()

    # Filter out archived students from each group
    groups_data = []
    for group in groups:
        active_students = [
            {
                "id": gs.student.id,
                "first_name": gs.student.first_name,
                "last_name": gs.student.last_name,
            }
            for gs in group.group_students if not gs.is_archived
        ]

        groups_data.append({
            "id": group.id,
            "name": group.name,
            "subject": group.subject,
            "teacher": group.teacher,
            "level": group.level,
            "schedule_day": group.schedule_day,
            "schedule_time": group.schedule_time,
            "schedule_duration": group.schedule_duration,
            "schedules": group.schedules,
            "start_date": group.start_date,
            "school_location_id": group.school_location_id,
            "location": group.location,
            "description": group.description,
            "comment": group.comment,
            "created_at": group.created_at,
            "students": active_students,
        })

    return groups_data


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group, ["subject", "teacher", "students", "schedules", "location"])
    return group


@router.get("/{group_id}")
async def get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    manager_location_id: Optional[UUID] = Depends(get_manager_location_id),
):
    result = await db.execute(
        select(Group)
        .options(
            selectinload(Group.subject),
            selectinload(Group.teacher),
            selectinload(Group.group_students).selectinload(GroupStudent.student),
            selectinload(Group.schedules),
            selectinload(Group.location)
        )
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Если пользователь - учитель (не админ), проверяем что это его группа
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Если пользователь - менеджер, проверяем что группа относится к его филиалу
    if manager_location_id is not None and group.school_location_id != manager_location_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Filter out archived students
    active_students = [
        {
            "id": gs.student.id,
            "first_name": gs.student.first_name,
            "last_name": gs.student.last_name,
        }
        for gs in group.group_students if not gs.is_archived
    ]

    # Return group data with filtered students
    return {
        "id": group.id,
        "name": group.name,
        "subject": group.subject,
        "teacher": group.teacher,
        "level": group.level,
        "schedule_day": group.schedule_day,
        "schedule_time": group.schedule_time,
        "schedule_duration": group.schedule_duration,
        "schedules": group.schedules,
        "start_date": group.start_date,
        "school_location_id": group.school_location_id,
        "location": group.location,
        "description": group.description,
        "comment": group.comment,
        "created_at": group.created_at,
        "students": active_students,
    }


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Group)
        .options(
            selectinload(Group.subject),
            selectinload(Group.teacher),
            selectinload(Group.students),
            selectinload(Group.schedules),
            selectinload(Group.location)
        )
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Если пользователь - учитель (не админ), проверяем что это его группа
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Use exclude_none=False to include explicitly set None values
    update_data = data.model_dump(exclude_unset=True, exclude_none=False)
    for field, value in update_data.items():
        setattr(group, field, value)

    await db.commit()
    await db.refresh(group, ["subject", "teacher", "students", "schedules", "location"])
    return group


@router.delete("/{group_id}")
async def delete_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Только администратор может удалять группы
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(group)
    await db.commit()
    return {"detail": "Deleted"}


# --- Group Students ---

@router.get("/{group_id}/students", response_model=list[GroupStudentResponse])
async def list_group_students(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        group_result = await db.execute(select(Group).where(Group.id == group_id))
        group = group_result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(GroupStudent).where(GroupStudent.group_id == group_id)
    )
    return result.scalars().all()


@router.post("/{group_id}/students", response_model=GroupStudentResponse, status_code=status.HTTP_201_CREATED)
async def add_student_to_group(
    group_id: UUID,
    data: GroupStudentAdd,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Get group information for history
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get student
    student_result = await db.execute(select(Student).where(Student.id == data.student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Create group-student relationship
    gs = GroupStudent(group_id=group_id, student_id=data.student_id)
    db.add(gs)

    # Add history entry
    history = StudentHistory(
        student_id=data.student_id,
        event_type=HistoryEventType.added_to_group,
        description=f"Добавлен в группу: {group.name}",
    )
    db.add(history)

    await db.commit()
    await db.refresh(gs)
    return gs


@router.delete("/{group_id}/students/{student_id}")
async def remove_student_from_group(
    group_id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Get group information for history
    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == group_id,
            GroupStudent.student_id == student_id,
        )
    )
    gs = result.scalar_one_or_none()
    if not gs:
        raise HTTPException(status_code=404, detail="Student not in group")

    # Add history entry
    history = StudentHistory(
        student_id=student_id,
        event_type=HistoryEventType.removed_from_group,
        description=f"Удален из группы: {group.name}",
    )
    db.add(history)

    # Archive student instead of deleting
    gs.is_archived = True
    await db.commit()
    return {"detail": "Archived"}


@router.post("/{group_id}/students/{student_id}/restore")
async def restore_student_to_group(
    group_id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Get group information for history
    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == group_id,
            GroupStudent.student_id == student_id,
            GroupStudent.is_archived == True,
        )
    )
    gs = result.scalar_one_or_none()
    if not gs:
        raise HTTPException(status_code=404, detail="Archived student not found")

    # Add history entry
    history = StudentHistory(
        student_id=student_id,
        event_type=HistoryEventType.added_to_group,
        description=f"Восстановлен в группе: {group.name}",
    )
    db.add(history)

    # Restore student
    gs.is_archived = False
    await db.commit()
    return {"detail": "Restored"}


@router.get("/{group_id}/students/archived", response_model=list[GroupStudentResponse])
async def get_archived_students(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Get group for access check
    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(GroupStudent)
        .options(selectinload(GroupStudent.student))
        .where(
            GroupStudent.group_id == group_id,
            GroupStudent.is_archived == True,
        )
    )
    return result.scalars().all()


# --- Lesson Generation ---

# Mapping of Russian day names to weekday numbers (0 = Monday, 6 = Sunday)
DAY_NAME_TO_WEEKDAY = {
    "Понедельник": 0,
    "Вторник": 1,
    "Среда": 2,
    "Четверг": 3,
    "Пятница": 4,
    "Суббота": 5,
    "Воскресенье": 6,
}


@router.post("/{group_id}/generate-lessons", response_model=list[LessonResponse])
async def generate_lessons(
    group_id: UUID,
    request: GenerateLessonsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Generate lessons for a group based on its schedule.
    Either end_date or months must be provided.
    """
    # Get group with schedules
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.schedules))
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not group.start_date:
        raise HTTPException(status_code=400, detail="Group must have a start_date to generate lessons")

    if not group.schedules or len(group.schedules) == 0:
        raise HTTPException(status_code=400, detail="Group must have at least one schedule to generate lessons")

    # Calculate end date
    if request.end_date:
        end_date = request.end_date
    elif request.months:
        end_date = group.start_date + timedelta(days=30 * request.months)
    else:
        # Default to 3 months
        end_date = group.start_date + timedelta(days=90)

    # Generate lessons
    created_lessons = []
    current_date = group.start_date

    # Get existing lessons to avoid duplicates
    existing_result = await db.execute(
        select(Lesson.date).where(Lesson.group_id == group_id)
    )
    existing_dates = {row[0] for row in existing_result.all()}

    while current_date <= end_date:
        weekday = current_date.weekday()

        # Check if there's a schedule for this weekday
        for schedule in group.schedules:
            schedule_weekday = DAY_NAME_TO_WEEKDAY.get(schedule.day_of_week)

            if schedule_weekday == weekday and current_date not in existing_dates:
                lesson = Lesson(
                    group_id=group_id,
                    date=current_date,
                    time=schedule.start_time,
                    duration=schedule.duration_minutes,
                    is_cancelled=False,
                    work_type="none",
                    had_previous_homework=False,
                )
                db.add(lesson)
                created_lessons.append(lesson)

        current_date += timedelta(days=1)

    await db.commit()

    # Refresh all lessons to get their IDs
    for lesson in created_lessons:
        await db.refresh(lesson)

    return created_lessons
