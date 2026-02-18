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
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


class GenerateLessonsRequest(BaseModel):
    end_date: Optional[date] = None
    months: Optional[int] = None


@router.get("/", response_model=list[GroupResponse])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = select(Group).options(
        selectinload(Group.subject),
        selectinload(Group.teacher),
        selectinload(Group.students),
        selectinload(Group.schedules)
    )

    # Если пользователь - учитель (не админ), показываем только его группы
    if current_user.role == "teacher":
        query = query.where(Group.teacher_id == current_user.id)

    query = query.order_by(Group.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group, ["subject", "teacher", "students", "schedules"])
    return group


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Group)
        .options(
            selectinload(Group.subject),
            selectinload(Group.teacher),
            selectinload(Group.students),
            selectinload(Group.schedules)
        )
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Если пользователь - учитель (не админ), проверяем что это его группа
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return group


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
            selectinload(Group.schedules)
        )
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Если пользователь - учитель (не админ), проверяем что это его группа
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    await db.commit()
    await db.refresh(group, ["subject", "teacher", "students", "schedules"])
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

    # Если пользователь - учитель (не админ), проверяем что это его группа
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
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

    await db.delete(gs)
    await db.commit()
    return {"detail": "Removed"}


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
