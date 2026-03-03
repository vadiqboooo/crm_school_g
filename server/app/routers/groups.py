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
            "is_archived": group.is_archived,
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
        "is_archived": group.is_archived,
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

    # Учителя не могут редактировать группы
    if current_user.role == "teacher":
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

    # Учителя не могут удалять группы
    if current_user.role == "teacher":
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(group)
    await db.commit()
    return {"detail": "Deleted"}


@router.post("/{group_id}/archive")
async def archive_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Учителя не могут архивировать группы
    if current_user.role == "teacher":
        raise HTTPException(status_code=403, detail="Access denied")

    group.is_archived = True
    await db.commit()
    return {"detail": "Archived"}


@router.post("/{group_id}/restore")
async def restore_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Учителя не могут восстанавливать группы
    if current_user.role == "teacher":
        raise HTTPException(status_code=403, detail="Access denied")

    group.is_archived = False
    await db.commit()
    return {"detail": "Restored"}


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
        select(GroupStudent)
        .options(selectinload(GroupStudent.student))
        .where(GroupStudent.group_id == group_id)
        .order_by(GroupStudent.joined_at)
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

    # Load the student relationship
    result = await db.execute(
        select(GroupStudent)
        .options(selectinload(GroupStudent.student))
        .where(GroupStudent.id == gs.id)
    )
    gs_with_student = result.scalar_one()
    return gs_with_student


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
    group_students = result.scalars().all()
    if not group_students:
        raise HTTPException(status_code=404, detail="Student not in group")

    # Add history entry
    history = StudentHistory(
        student_id=student_id,
        event_type=HistoryEventType.removed_from_group,
        description=f"Удален из группы: {group.name}",
    )
    db.add(history)

    # Archive all duplicate entries (in case there are duplicates)
    for gs in group_students:
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

    # Check if there's already an active (non-archived) entry
    active_result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == group_id,
            GroupStudent.student_id == student_id,
            GroupStudent.is_archived == False,
        )
    )
    active_entry = active_result.scalar_one_or_none()
    if active_entry:
        raise HTTPException(status_code=400, detail="Student is already active in this group")

    result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == group_id,
            GroupStudent.student_id == student_id,
            GroupStudent.is_archived == True,
        )
    )
    archived_students = result.scalars().all()
    if not archived_students:
        raise HTTPException(status_code=404, detail="Archived student not found")

    # Add history entry
    history = StudentHistory(
        student_id=student_id,
        event_type=HistoryEventType.added_to_group,
        description=f"Восстановлен в группе: {group.name}",
    )
    db.add(history)

    # Restore the first archived entry and delete the rest (duplicates)
    archived_students[0].is_archived = False
    for duplicate in archived_students[1:]:
        await db.delete(duplicate)

    await db.commit()
    return {"detail": "Restored"}


@router.patch("/{group_id}/students/{student_id}/joined-date")
async def update_student_joined_date(
    group_id: UUID,
    student_id: UUID,
    joined_at: date,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update the joined_at date for a student in a group."""
    # Get group
    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Only admins and managers can update joined date
    if current_user.role == "teacher":
        raise HTTPException(status_code=403, detail="Access denied")

    # Find the active group-student relationship
    result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == group_id,
            GroupStudent.student_id == student_id,
            GroupStudent.is_archived == False,
        )
    )
    group_student = result.scalar_one_or_none()
    if not group_student:
        raise HTTPException(status_code=404, detail="Student not found in group")

    # Update joined_at date
    old_date = group_student.joined_at
    group_student.joined_at = datetime.combine(joined_at, datetime.min.time())

    await db.commit()

    return {
        "detail": f"Updated joined date from {old_date.date()} to {joined_at}",
        "old_date": old_date.date(),
        "new_date": joined_at
    }


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


@router.delete("/{group_id}/lessons")
async def delete_group_lessons(
    group_id: UUID,
    from_date: Optional[date] = Query(None, description="Delete lessons from this date onwards. If not provided, deletes all lessons."),
    only_future: bool = Query(True, description="Only delete future lessons (from today onwards)"),
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Delete lessons for a group.
    - If only_future=true (default), deletes lessons from today onwards
    - If from_date is provided, deletes lessons from that date onwards
    - If both are false/None, deletes ALL lessons
    - Never deletes conducted lessons or lessons with attendance records
    """
    # Get group
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Build query - load attendances to check if lesson was conducted
    query = select(Lesson).options(selectinload(Lesson.attendances)).where(Lesson.group_id == group_id)

    if from_date:
        query = query.where(Lesson.date >= from_date)
    elif only_future:
        from datetime import datetime
        today = datetime.now().date()
        query = query.where(Lesson.date >= today)

    # Get lessons to delete
    lessons_result = await db.execute(query)
    lessons = lessons_result.scalars().all()

    # Filter out conducted lessons and lessons with attendance
    deleted_count = 0
    skipped_count = 0
    for lesson in lessons:
        # Skip if lesson is conducted or has attendance records
        if lesson.status == "conducted" or len(lesson.attendances) > 0:
            skipped_count += 1
            continue

        await db.delete(lesson)
        deleted_count += 1

    await db.commit()

    return {
        "detail": f"Deleted {deleted_count} lessons, skipped {skipped_count} conducted lessons",
        "count": deleted_count,
        "skipped": skipped_count
    }


@router.post("/{group_id}/regenerate-lessons")
async def regenerate_lessons(
    group_id: UUID,
    request: GenerateLessonsRequest,
    delete_existing: bool = Query(True, description="Delete existing future lessons before regenerating"),
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Regenerate lessons for a group.
    First deletes existing future lessons (if delete_existing=true),
    then generates new ones based on current schedule.
    """
    # Get group
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    deleted_count = 0
    skipped_count = 0
    if delete_existing:
        # Delete future lessons (but not conducted ones)
        from datetime import datetime
        today = datetime.now().date()
        lessons_result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.attendances))
            .where(
                Lesson.group_id == group_id,
                Lesson.date >= today
            )
        )
        lessons = lessons_result.scalars().all()
        for lesson in lessons:
            # Skip if lesson is conducted or has attendance records
            if lesson.status == "conducted" or len(lesson.attendances) > 0:
                skipped_count += 1
                continue
            await db.delete(lesson)
            deleted_count += 1
        await db.commit()

    # Generate new lessons using the existing generate_lessons logic
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.schedules))
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()

    if not group.start_date:
        raise HTTPException(status_code=400, detail="Group must have a start_date to generate lessons")

    if not group.schedules or len(group.schedules) == 0:
        raise HTTPException(status_code=400, detail="Group must have at least one schedule to generate lessons")

    # Calculate end date
    if request.end_date:
        end_date = request.end_date
    elif request.months:
        from datetime import datetime
        today = datetime.now().date()
        end_date = today + timedelta(days=30 * request.months)
    else:
        # Default to 3 months from today
        from datetime import datetime
        today = datetime.now().date()
        end_date = today + timedelta(days=90)

    # Generate lessons
    created_lessons = []
    from datetime import datetime
    today = datetime.now().date()
    current_date = max(group.start_date, today)  # Start from today or group start date, whichever is later

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

    detail_parts = [f"Создано {len(created_lessons)} новых уроков"]
    if deleted_count > 0:
        detail_parts.insert(0, f"Удалено {deleted_count} уроков")
    if skipped_count > 0:
        detail_parts.append(f"Пропущено {skipped_count} проведенных уроков")

    return {
        "detail": ", ".join(detail_parts),
        "deleted_count": deleted_count,
        "skipped_count": skipped_count,
        "created_count": len(created_lessons),
        "lessons": created_lessons
    }
