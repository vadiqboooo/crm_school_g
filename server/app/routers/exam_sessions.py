"""
Exam Portal Sessions — управление из CRM (admin/manager)

GET    /exam-sessions/                            — список всех сессий
POST   /exam-sessions/                            — создать сессию
PATCH  /exam-sessions/{id}                        — обновить (is_active, notes)
DELETE /exam-sessions/{id}                        — удалить
POST   /exam-sessions/{id}/slots                  — добавить слот
DELETE /exam-sessions/{id}/slots/{slot_id}        — удалить слот
POST   /students/{id}/generate-portal-credentials — сгенерировать логин/пароль
"""
import uuid
from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.exam import Exam
from app.models.exam_portal import ExamPortalSession, ExamTimeSlot, ExamRegistration
from app.models.student import Student
from app.routers.student_auth import (
    generate_login, generate_password, make_unique_login, hash_password
)

router = APIRouter(prefix="/exam-sessions", tags=["exam-sessions"])
students_router = APIRouter(prefix="/students", tags=["students-portal-creds"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ExamSessionCreate(BaseModel):
    exam_id: uuid.UUID
    school_location_id: Optional[uuid.UUID] = None
    is_active: bool = False
    notes: Optional[str] = None


class ExamSessionUpdate(BaseModel):
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class TimeSlotCreate(BaseModel):
    date: date_type    # "YYYY-MM-DD" → parsed to datetime.date by Pydantic
    start_time: str    # "09:00"
    total_seats: int = 10


class SessionResponse(BaseModel):
    id: str
    exam_id: str
    exam_title: str
    school_location_id: str | None
    school_location_name: str | None
    is_active: bool
    notes: str | None
    slots: list[dict]

    class Config:
        from_attributes = True


class PortalCredentialsResponse(BaseModel):
    student_id: str
    portal_login: str
    plain_password: str   # возвращаем один раз для передачи ученику


# ── Session endpoints ─────────────────────────────────────────────────────────

@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamPortalSession)
        .options(
            selectinload(ExamPortalSession.exam),
            selectinload(ExamPortalSession.school_location),
            selectinload(ExamPortalSession.time_slots).selectinload(ExamTimeSlot.registrations),
        )
        .order_by(ExamPortalSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_response(s) for s in sessions]


@router.post("/", response_model=SessionResponse)
async def create_session(
    data: ExamSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    exam = await db.get(Exam, data.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Экзамен не найден")

    session = ExamPortalSession(
        exam_id=data.exam_id,
        school_location_id=data.school_location_id,
        is_active=data.is_active,
        notes=data.notes,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    result = await db.execute(
        select(ExamPortalSession)
        .options(
            selectinload(ExamPortalSession.exam),
            selectinload(ExamPortalSession.school_location),
            selectinload(ExamPortalSession.time_slots).selectinload(ExamTimeSlot.registrations),
        )
        .where(ExamPortalSession.id == session.id)
    )
    return _session_to_response(result.scalar_one())


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: uuid.UUID,
    data: ExamSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamPortalSession)
        .options(
            selectinload(ExamPortalSession.exam),
            selectinload(ExamPortalSession.school_location),
            selectinload(ExamPortalSession.time_slots).selectinload(ExamTimeSlot.registrations),
        )
        .where(ExamPortalSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")

    if data.is_active is not None:
        session.is_active = data.is_active
    if data.notes is not None:
        session.notes = data.notes

    await db.commit()
    await db.refresh(session)

    result = await db.execute(
        select(ExamPortalSession)
        .options(
            selectinload(ExamPortalSession.exam),
            selectinload(ExamPortalSession.school_location),
            selectinload(ExamPortalSession.time_slots).selectinload(ExamTimeSlot.registrations),
        )
        .where(ExamPortalSession.id == session_id)
    )
    return _session_to_response(result.scalar_one())


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    session = await db.get(ExamPortalSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    await db.delete(session)
    await db.commit()


@router.post("/{session_id}/slots", response_model=SessionResponse)
async def add_time_slot(
    session_id: uuid.UUID,
    data: TimeSlotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    session = await db.get(ExamPortalSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")

    slot = ExamTimeSlot(
        session_id=session_id,
        date=data.date,
        start_time=data.start_time,
        total_seats=data.total_seats,
    )
    db.add(slot)
    await db.commit()

    result = await db.execute(
        select(ExamPortalSession)
        .options(
            selectinload(ExamPortalSession.exam),
            selectinload(ExamPortalSession.school_location),
            selectinload(ExamPortalSession.time_slots).selectinload(ExamTimeSlot.registrations),
        )
        .where(ExamPortalSession.id == session_id)
    )
    return _session_to_response(result.scalar_one())


@router.delete("/{session_id}/slots/{slot_id}", status_code=204)
async def delete_time_slot(
    session_id: uuid.UUID,
    slot_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    slot = await db.get(ExamTimeSlot, slot_id)
    if not slot or slot.session_id != session_id:
        raise HTTPException(status_code=404, detail="Слот не найден")
    await db.delete(slot)
    await db.commit()


# ── Student credentials ────────────────────────────────────────────────────────

@students_router.post("/{student_id}/generate-portal-credentials", response_model=PortalCredentialsResponse)
async def generate_portal_credentials(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Генерирует логин и пароль для входа в клиентский портал."""
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    base_login = generate_login(student.last_name, student.first_name)
    # If student already has a login, reuse it; otherwise generate unique
    if student.portal_login:
        login = student.portal_login
    else:
        login = await make_unique_login(base_login, db)

    plain_password = generate_password()
    student.portal_login = login
    student.portal_password_hash = hash_password(plain_password)
    await db.commit()

    return PortalCredentialsResponse(
        student_id=str(student.id),
        portal_login=login,
        plain_password=plain_password,
    )


# ── Helper ─────────────────────────────────────────────────────────────────────

def _session_to_response(s: ExamPortalSession) -> SessionResponse:
    return SessionResponse(
        id=str(s.id),
        exam_id=str(s.exam_id),
        exam_title=s.exam.title if s.exam else "",
        school_location_id=str(s.school_location_id) if s.school_location_id else None,
        school_location_name=s.school_location.name if s.school_location else None,
        is_active=s.is_active,
        notes=s.notes,
        slots=[
            {
                "id": str(slot.id),
                "date": str(slot.date),
                "start_time": slot.start_time,
                "total_seats": slot.total_seats,
                "registered_count": len(slot.registrations),
                "available_seats": max(0, slot.total_seats - len(slot.registrations)),
            }
            for slot in s.time_slots
        ],
    )
