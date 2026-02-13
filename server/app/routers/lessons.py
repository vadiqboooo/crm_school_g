from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lesson import Lesson, LessonAttendance
from app.models.employee import Employee
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
    _: Employee = Depends(get_current_user),
):
    query = select(Lesson).order_by(Lesson.date.desc())
    if group_id:
        query = query.where(Lesson.group_id == group_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    data: LessonCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: UUID,
    data: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    await db.delete(lesson)
    await db.commit()
    return {"detail": "Deleted"}


# --- Attendance ---

@router.get("/{lesson_id}/attendance", response_model=list[AttendanceResponse])
async def list_attendance(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(LessonAttendance).where(LessonAttendance.lesson_id == lesson_id)
    )
    return result.scalars().all()


@router.post("/{lesson_id}/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    lesson_id: UUID,
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
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
    _: Employee = Depends(get_current_user),
):
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
