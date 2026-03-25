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
from app.models.group import GroupStudent
from app.models.student import Student
from app.models.subject import Subject
from app.models.app_user import AppUser
from app.auth.security import derive_chat_public_key, hash_password as _hash_pw, encrypt_field, decrypt_field
from app.routers.student_auth import (
    generate_login, generate_password, make_unique_login, hash_password
)


async def _ensure_app_user(
    db: AsyncSession, student: Student, login: str, plain_password: str,
    create_only: bool = False,
) -> None:
    """Создаёт или обновляет AppUser привязанный к студенту.

    create_only=True — пропустить если AppUser уже существует (для bulk-операций).
    """
    existing = await db.execute(select(AppUser).where(AppUser.student_id == student.id))
    app_user = existing.scalar_one_or_none()

    display_name = f"{student.first_name} {student.last_name}"

    if app_user:
        if create_only:
            return  # уже есть — не трогаем
        # Обновить логин/пароль если изменились (одиночное создание/сброс)
        app_user.login = login
        app_user.password_hash = _hash_pw(plain_password)
        app_user.password_plain = encrypt_field(plain_password)
        app_user.display_name = display_name
        app_user.public_key = derive_chat_public_key(plain_password, str(app_user.id))
    else:
        # Создать нового AppUser
        new_user = AppUser(
            display_name=display_name,
            login=login,
            password_hash=_hash_pw(plain_password),
            password_plain=encrypt_field(plain_password),
            student_id=student.id,
        )
        db.add(new_user)
        await db.flush()  # получить id до деривации ключа
        new_user.public_key = derive_chat_public_key(plain_password, str(new_user.id))

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


# ── Registration list ─────────────────────────────────────────────────────────

@router.get("/registrations")
async def list_all_registrations(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamRegistration)
        .options(
            selectinload(ExamRegistration.student),
            selectinload(ExamRegistration.subject),
            selectinload(ExamRegistration.time_slot)
            .selectinload(ExamTimeSlot.session)
            .selectinload(ExamPortalSession.exam),
            selectinload(ExamRegistration.time_slot)
            .selectinload(ExamTimeSlot.session)
            .selectinload(ExamPortalSession.school_location),
        )
        .order_by(ExamRegistration.registered_at.desc())
    )
    registrations = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "student_id": str(r.student_id),
            "student_name": f"{r.student.last_name} {r.student.first_name}" if r.student else "—",
            "subject_name": (
                r.subject.name if r.subject
                else r.time_slot.session.exam.subject if r.time_slot.session.exam.subject
                else None
            ),
            "exam_title": r.time_slot.session.exam.title,
            "school_location_name": (
                r.time_slot.session.school_location.name
                if r.time_slot.session.school_location else None
            ),
            "date": str(r.time_slot.date),
            "start_time": r.time_slot.start_time,
            "registered_at": r.registered_at.isoformat(),
            "exam_type": r.subject.exam_type if r.subject else None,
            "attendance": r.attendance,
            "passed": r.passed,
        }
        for r in registrations
    ]


class MarkRegistrationRequest(BaseModel):
    attendance: Optional[str] = None   # "present" | "absent" | None
    passed: Optional[bool] = None


@router.patch("/registrations/{reg_id}")
async def mark_registration(
    reg_id: uuid.UUID,
    body: MarkRegistrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(ExamRegistration).where(ExamRegistration.id == reg_id))
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if "attendance" in body.model_fields_set:
        reg.attendance = body.attendance
    if "passed" in body.model_fields_set:
        reg.passed = body.passed
    await db.commit()
    return {"ok": True}


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

    if student.portal_login:
        login = student.portal_login
    else:
        base_login = generate_login(student.last_name, student.first_name)
        login = await make_unique_login(base_login, db)
        student.portal_login = login

    if student.portal_password_hash and student.portal_password_plain:
        plain_password = decrypt_field(student.portal_password_plain)
    else:
        plain_password = generate_password()
        student.portal_password_hash = hash_password(plain_password)
        student.portal_password_plain = encrypt_field(plain_password)
    if not student.public_key:
        student.public_key = derive_chat_public_key(plain_password, str(student.id))

    await _ensure_app_user(db, student, login, plain_password)
    await db.commit()

    return PortalCredentialsResponse(
        student_id=str(student.id),
        portal_login=login,
        plain_password=plain_password,
    )


@students_router.post("/generate-portal-credentials-bulk")
async def generate_portal_credentials_bulk(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Генерирует логин/пароль для всех активных студентов."""
    result = await db.execute(
        select(Student).where(Student.status == "active").order_by(Student.last_name, Student.first_name)
    )
    students = result.scalars().all()
    credentials = []
    for student in students:
        if student.portal_login:
            login = student.portal_login
        else:
            base_login = generate_login(student.last_name, student.first_name)
            login = await make_unique_login(base_login, db)
            student.portal_login = login
        if student.portal_password_hash and student.portal_password_plain:
            plain_password = decrypt_field(student.portal_password_plain)
        else:
            plain_password = generate_password()
            student.portal_password_hash = hash_password(plain_password)
            student.portal_password_plain = encrypt_field(plain_password)
        if not student.public_key:
            student.public_key = derive_chat_public_key(plain_password, str(student.id))
        await _ensure_app_user(db, student, login, plain_password, create_only=True)
        credentials.append({
            "student_id": str(student.id),
            "student_name": f"{student.last_name} {student.first_name}",
            "portal_login": login,
            "plain_password": plain_password,
        })
    await db.commit()
    return credentials


@students_router.post("/group/{group_id}/generate-portal-credentials")
async def generate_group_portal_credentials(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Генерирует логин/пароль для всех активных студентов группы."""
    result = await db.execute(
        select(Student)
        .join(GroupStudent, Student.id == GroupStudent.student_id)
        .where(
            GroupStudent.group_id == group_id,
            GroupStudent.is_archived == False,
            GroupStudent.is_trial == False,
            Student.status == "active",
        )
        .order_by(Student.last_name, Student.first_name)
    )
    students = result.scalars().all()
    credentials = []
    for student in students:
        if student.portal_login:
            login = student.portal_login
        else:
            base_login = generate_login(student.last_name, student.first_name)
            login = await make_unique_login(base_login, db)
            student.portal_login = login
        if student.portal_password_hash and student.portal_password_plain:
            plain_password = decrypt_field(student.portal_password_plain)
        else:
            plain_password = generate_password()
            student.portal_password_hash = hash_password(plain_password)
            student.portal_password_plain = encrypt_field(plain_password)
        if not student.public_key:
            student.public_key = derive_chat_public_key(plain_password, str(student.id))
        await _ensure_app_user(db, student, login, plain_password, create_only=True)
        credentials.append({
            "student_id": str(student.id),
            "student_name": f"{student.last_name} {student.first_name}",
            "portal_login": login,
            "plain_password": plain_password,
        })
    await db.commit()
    return credentials


@students_router.post("/backfill-chat-keys")
async def backfill_chat_public_keys(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Проставляет публичные ключи чата всем студентам у кого есть portal_password_plain но нет public_key."""
    result = await db.execute(
        select(Student).where(
            Student.portal_password_plain.isnot(None),
            Student.public_key.is_(None),
        )
    )
    students = result.scalars().all()
    updated = 0
    for student in students:
        student.public_key = derive_chat_public_key(decrypt_field(student.portal_password_plain), str(student.id))
        updated += 1
    await db.commit()
    return {"updated": updated}


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
