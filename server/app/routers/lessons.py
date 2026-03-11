from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lesson import Lesson, LessonAttendance
from app.models.group import Group
from app.models.employee import Employee
from app.models.lead import Lead, LeadStatus
from app.models.group import GroupStudent
from sqlalchemy.orm import selectinload
from app.schemas.lesson import (
    LessonCreate, LessonUpdate, LessonResponse,
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/", response_model=list[LessonResponse])
async def list_lessons(
    group_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = select(Lesson).order_by(Lesson.date.desc())

    if group_id:
        # Verify group access for teachers
        if current_user.role == "teacher":
            group_result = await db.execute(select(Group).where(Group.id == group_id))
            group = group_result.scalar_one_or_none()
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
            if group.teacher_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        query = query.where(Lesson.group_id == group_id)
    elif current_user.role == "teacher":
        # Filter lessons to only show teacher's groups
        teacher_groups = await db.execute(
            select(Group.id).where(Group.teacher_id == current_user.id)
        )
        group_ids = [row[0] for row in teacher_groups.all()]
        query = query.where(Lesson.group_id.in_(group_ids))

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    data: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        group_result = await db.execute(select(Group).where(Group.id == data.group_id))
        group = group_result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Verify group access for teachers
    if current_user.role == "teacher":
        group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: UUID,
    data: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Verify group access for teachers
    if current_user.role == "teacher":
        group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    old_status = lesson.status
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)

    # Auto-move leads to "trial_conducted" when lesson is marked as conducted
    if data.status == "conducted" and old_status != "conducted":
        trial_gs_result = await db.execute(
            select(GroupStudent).where(
                GroupStudent.group_id == lesson.group_id,
                GroupStudent.is_trial == True,
                GroupStudent.is_archived == False,
            )
        )
        trial_student_ids = [gs.student_id for gs in trial_gs_result.scalars().all()]
        if trial_student_ids:
            group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
            conducted_group = group_result.scalar_one_or_none()

            trial_leads_result = await db.execute(
                select(Lead)
                .options(selectinload(Lead.conducted_groups))
                .where(
                    Lead.student_id.in_(trial_student_ids),
                    Lead.status.in_([LeadStatus.trial_assigned, LeadStatus.trial_conducted]),
                )
            )
            for lead_obj in trial_leads_result.scalars().all():
                lead_obj.status = LeadStatus.trial_conducted
                lead_obj.trial_conducted_group_id = lesson.group_id
                if conducted_group and conducted_group not in lead_obj.conducted_groups:
                    lead_obj.conducted_groups.append(conducted_group)

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Verify group access for teachers
    if current_user.role == "teacher":
        group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(lesson)
    await db.commit()
    return {"detail": "Deleted"}


# --- Attendance ---

@router.get("/{lesson_id}/attendance", response_model=list[AttendanceResponse])
async def list_attendance(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = lesson_result.scalar_one_or_none()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(LessonAttendance).where(LessonAttendance.lesson_id == lesson_id)
    )
    return result.scalars().all()


@router.post("/{lesson_id}/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    lesson_id: UUID,
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = lesson_result.scalar_one_or_none()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    att = LessonAttendance(lesson_id=lesson_id, **data.model_dump())
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return att


@router.patch("/{lesson_id}/attendance/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    lesson_id: UUID,
    attendance_id: UUID,
    data: AttendanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = lesson_result.scalar_one_or_none()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        group_result = await db.execute(select(Group).where(Group.id == lesson.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(LessonAttendance).where(LessonAttendance.id == attendance_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(att, field, value)

    await db.commit()
    await db.refresh(att)
    return att
