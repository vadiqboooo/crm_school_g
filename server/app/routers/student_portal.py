"""
Student Portal — read-only endpoints for the student-facing app.

GET  /student-portal/me                          — профиль
GET  /student-portal/schedule/today              — уроки на сегодня
GET  /student-portal/performance                 — статистика успеваемости
GET  /student-portal/exam-sessions               — активные сессии экзаменов
GET  /student-portal/exam-sessions/{session_id}  — детали сессии (слоты)
POST /student-portal/exam-sessions/{slot_id}/register   — запись на слот
DELETE /student-portal/registrations/{reg_id}    — отмена записи
GET  /student-portal/my-registrations            — мои записи
GET  /student-portal/results                     — результаты экзаменов
"""
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.exam import Exam, ExamResult
from app.models.exam_portal import ExamPortalSession, ExamTimeSlot, ExamRegistration
from app.models.group import Group, GroupStudent
from app.models.lesson import Lesson, LessonAttendance
from app.models.schedule import Schedule
from app.models.student import Student
from app.models.subject import Subject
from app.auth.security import decode_token, verify_password
from app.models.app_user import AppUser
from app.routers.student_auth import get_current_student_dep

_bearer = HTTPBearer()

router = APIRouter(prefix="/student-portal", tags=["student-portal"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class StudentProfileResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    portal_login: str | None
    class_number: int | None
    balance: float
    phone: str | None
    email: str | None
    chat_display_name: str | None
    groups: list[dict]

    class Config:
        from_attributes = True


class UpdateSettingsRequest(BaseModel):
    portal_login: str | None = None
    old_password: str | None = None
    new_password: str | None = None
    phone: str | None = None
    email: str | None = None
    chat_display_name: str | None = None


class TodayLessonResponse(BaseModel):
    group_id: str
    group_name: str
    subject_name: str | None
    teacher_name: str | None
    location_name: str | None
    date: str
    start_time: str
    end_time: str
    is_now: bool


class PerformanceResponse(BaseModel):
    attendance_percent: float
    homework_done: int
    subjects_count: int
    subject_progress: list[dict]  # [{name, percent}]


class TimeSlotResponse(BaseModel):
    id: str
    date: str
    start_time: str
    total_seats: int
    available_seats: int
    is_registered: bool


class ExamSessionResponse(BaseModel):
    id: str
    exam_id: str
    exam_title: str
    subject_name: str | None
    subject_id: str | None
    exam_type: str | None
    school_location_id: str | None
    school_location_name: str | None
    is_active: bool
    notes: str | None
    time_slots: list[TimeSlotResponse]


class MyRegistrationResponse(BaseModel):
    id: str
    session_id: str
    exam_title: str
    subject_name: str | None
    subject_id: str | None
    exam_type: str | None
    school_location_id: str | None
    school_location_name: str | None
    date: str
    start_time: str
    registered_at: str
    days_until: int


class SubjectResponse(BaseModel):
    id: str
    name: str
    exam_type: str | None


class ExamResultResponse(BaseModel):
    exam_id: str
    exam_title: str
    subject_name: str | None
    exam_date: str | None
    primary_score: int
    final_score: float
    threshold_score: int | None
    is_passed: bool | None
    added_at: str


class RegisterRequest(BaseModel):
    subject_id: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _calc_end_time(start: str, duration_minutes: int) -> str:
    h, m = map(int, start.split(":"))
    total = h * 60 + m + duration_minutes
    return f"{total // 60:02d}:{total % 60:02d}"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=StudentProfileResponse)
async def get_my_profile(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.groups).selectinload(GroupStudent.group).selectinload(Group.subject),
            selectinload(Student.groups).selectinload(GroupStudent.group).selectinload(Group.schedules),
        )
        .where(Student.id == student.id)
    )
    s = result.scalar_one()

    groups_data = []
    for gs in s.groups:
        if gs.is_archived or gs.is_trial:
            continue
        g = gs.group
        groups_data.append({
            "id": str(g.id),
            "name": g.name,
            "subject": g.subject.name if g.subject else None,
            "exam_type": g.subject.exam_type if g.subject else None,
            "schedules": [
                {"day": sch.day_of_week, "start_time": sch.start_time, "duration": sch.duration_minutes}
                for sch in g.schedules
            ],
        })

    return StudentProfileResponse(
        id=str(s.id),
        first_name=s.first_name,
        last_name=s.last_name,
        portal_login=s.portal_login,
        class_number=s.class_number,
        balance=float(s.balance),
        phone=s.phone,
        email=s.email,
        chat_display_name=s.chat_display_name,
        groups=groups_data,
    )


@router.get("/schedule/today", response_model=list[TodayLessonResponse])
async def get_today_schedule(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    now = datetime.now(timezone.utc).time()

    # Get active groups
    gs_result = await db.execute(
        select(GroupStudent)
        .options(selectinload(GroupStudent.group).selectinload(Group.schedules))
        .where(
            GroupStudent.student_id == student.id,
            GroupStudent.is_archived == False,
            GroupStudent.is_trial == False,
        )
    )
    group_memberships = gs_result.scalars().all()
    group_ids = [gs.group_id for gs in group_memberships]

    if not group_ids:
        return []

    # Get today's lessons
    lessons_result = await db.execute(
        select(Lesson)
        .options(
            selectinload(Lesson.group).selectinload(Group.subject),
            selectinload(Lesson.group).selectinload(Group.teacher),
            selectinload(Lesson.group).selectinload(Group.location),
            selectinload(Lesson.group).selectinload(Group.schedules),
        )
        .where(
            Lesson.group_id.in_(group_ids),
            Lesson.date == today,
        )
    )
    lessons = lessons_result.scalars().all()

    result = []
    for lesson in lessons:
        g = lesson.group
        # Use lesson's own time (set at generation time from schedule)
        if lesson.time:
            start_time = lesson.time.strftime("%H:%M")
            duration = lesson.duration or 90
        else:
            schedule = g.schedules[0] if g.schedules else None
            start_time = schedule.start_time.strftime("%H:%M") if schedule else "00:00"
            duration = schedule.duration_minutes if schedule else 90
        end_time = _calc_end_time(start_time, duration)

        # Is lesson happening now?
        from datetime import time as dtime
        sh, sm = map(int, start_time.split(":"))
        eh, em = map(int, end_time.split(":"))
        is_now = dtime(sh, sm) <= now <= dtime(eh, em)

        teacher = g.teacher
        teacher_name = f"{teacher.last_name} {teacher.first_name[0]}." if teacher else None

        result.append(TodayLessonResponse(
            group_id=str(g.id),
            group_name=g.name,
            subject_name=g.subject.name if g.subject else None,
            teacher_name=teacher_name,
            location_name=g.location.name if g.location else None,
            date=str(today),
            start_time=start_time,
            end_time=end_time,
            is_now=is_now,
        ))

    result.sort(key=lambda x: x.start_time)
    return result


@router.get("/performance", response_model=PerformanceResponse)
async def get_performance(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    # Attendance
    att_result = await db.execute(
        select(LessonAttendance)
        .options(selectinload(LessonAttendance.lesson))
        .where(LessonAttendance.student_id == student.id)
    )
    attendances = att_result.scalars().all()
    conducted = [a for a in attendances if a.lesson and a.lesson.status == "conducted"]
    present = [a for a in conducted if a.attendance in ("present", "late")]
    attendance_pct = round(len(present) / len(conducted) * 100) if conducted else 0

    # Homework done (lessons where homework_grade is set)
    hw_done = sum(1 for a in conducted if a.homework_grade and str(a.homework_grade).strip() not in ("", "0"))

    # Subjects
    gs_result = await db.execute(
        select(GroupStudent)
        .options(selectinload(GroupStudent.group).selectinload(Group.subject))
        .where(
            GroupStudent.student_id == student.id,
            GroupStudent.is_archived == False,
            GroupStudent.is_trial == False,
        )
    )
    memberships = gs_result.scalars().all()
    subject_ids = set()
    subject_names = {}
    for gs in memberships:
        if gs.group.subject_id:
            subject_ids.add(gs.group.subject_id)
            subject_names[gs.group.subject_id] = gs.group.subject.name if gs.group.subject else "Предмет"

    # Per-subject attendance %
    subject_progress = []
    for gs in memberships:
        if not gs.group.subject_id:
            continue
        group_att = [a for a in conducted if a.lesson and a.lesson.group_id == gs.group_id]
        group_present = [a for a in group_att if a.attendance in ("present", "late")]
        pct = round(len(group_present) / len(group_att) * 100) if group_att else 0
        name = gs.group.subject.name if gs.group.subject else gs.group.name
        subject_progress.append({"name": name, "percent": pct})

    return PerformanceResponse(
        attendance_percent=attendance_pct,
        homework_done=hw_done,
        subjects_count=len(subject_ids),
        subject_progress=subject_progress,
    )


@router.get("/exam-sessions", response_model=list[ExamSessionResponse])
async def list_exam_sessions(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamPortalSession)
        .options(
            selectinload(ExamPortalSession.exam).selectinload(Exam.subject_rel),
            selectinload(ExamPortalSession.school_location),
            selectinload(ExamPortalSession.time_slots).selectinload(ExamTimeSlot.registrations),
        )
        .join(ExamPortalSession.exam)
        .where(Exam.is_registration_open == True)
        .order_by(ExamPortalSession.created_at.desc())
    )
    sessions = result.scalars().all()

    # Get student's existing registrations
    reg_result = await db.execute(
        select(ExamRegistration).where(ExamRegistration.student_id == student.id)
    )
    registered_slot_ids = {str(r.time_slot_id) for r in reg_result.scalars().all()}

    return [
        ExamSessionResponse(
            id=str(s.id),
            exam_id=str(s.exam_id),
            exam_title=s.exam.title,
            subject_name=s.exam.subject_rel.name if s.exam.subject_rel else s.exam.subject,
            subject_id=str(s.exam.subject_id) if s.exam.subject_id else None,
            exam_type=s.exam.subject_rel.exam_type if s.exam.subject_rel else None,
            school_location_id=str(s.school_location_id) if s.school_location_id else None,
            school_location_name=s.school_location.name if s.school_location else None,
            is_active=s.is_active,
            notes=s.notes,
            time_slots=[
                TimeSlotResponse(
                    id=str(slot.id),
                    date=str(slot.date),
                    start_time=slot.start_time,
                    total_seats=slot.total_seats,
                    available_seats=slot.available_seats,
                    is_registered=str(slot.id) in registered_slot_ids,
                )
                for slot in s.time_slots
            ],
        )
        for s in sessions
    ]


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(Subject.is_active == True).order_by(Subject.name)
    )
    subjects = result.scalars().all()
    return [SubjectResponse(id=str(s.id), name=s.name, exam_type=s.exam_type) for s in subjects]


@router.post("/exam-sessions/{slot_id}/register")
async def register_for_exam(
    slot_id: uuid.UUID,
    body: RegisterRequest = RegisterRequest(),
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    # Load slot with registrations
    result = await db.execute(
        select(ExamTimeSlot)
        .options(
            selectinload(ExamTimeSlot.registrations),
            selectinload(ExamTimeSlot.session).selectinload(ExamPortalSession.exam),
        )
        .where(ExamTimeSlot.id == slot_id)
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")
    if not slot.session.exam.is_registration_open:
        raise HTTPException(status_code=400, detail="Запись на этот экзамен закрыта")
    if slot.available_seats <= 0:
        raise HTTPException(status_code=400, detail="Нет свободных мест")

    # Check not already registered for this slot
    existing = await db.execute(
        select(ExamRegistration).where(
            ExamRegistration.student_id == student.id,
            ExamRegistration.time_slot_id == slot_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Вы уже записаны на этот слот")

    subject_uuid = uuid.UUID(body.subject_id) if body.subject_id else None
    reg = ExamRegistration(student_id=student.id, time_slot_id=slot_id, subject_id=subject_uuid)
    db.add(reg)
    await db.commit()
    return {"message": "Запись успешна", "registration_id": str(reg.id)}


@router.delete("/registrations/{reg_id}", status_code=204)
async def cancel_registration(
    reg_id: uuid.UUID,
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamRegistration).where(
            ExamRegistration.id == reg_id,
            ExamRegistration.student_id == student.id,
        )
    )
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    await db.delete(reg)
    await db.commit()


@router.get("/my-registrations", response_model=list[MyRegistrationResponse])
async def my_registrations(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamRegistration)
        .options(
            selectinload(ExamRegistration.time_slot)
            .selectinload(ExamTimeSlot.session)
            .selectinload(ExamPortalSession.exam)
            .selectinload(Exam.subject_rel),
            selectinload(ExamRegistration.time_slot)
            .selectinload(ExamTimeSlot.session)
            .selectinload(ExamPortalSession.school_location),
            selectinload(ExamRegistration.subject),
        )
        .where(ExamRegistration.student_id == student.id)
        .order_by(ExamRegistration.registered_at.desc())
    )
    registrations = result.scalars().all()

    today = date.today()
    return [
        MyRegistrationResponse(
            id=str(r.id),
            session_id=str(r.time_slot.session_id),
            exam_title=r.time_slot.session.exam.title,
            subject_name=(
                r.subject.name if r.subject else
                r.time_slot.session.exam.subject_rel.name
                if r.time_slot.session.exam.subject_rel
                else r.time_slot.session.exam.subject
            ),
            subject_id=str(r.subject_id) if r.subject_id else None,
            exam_type=r.subject.exam_type if r.subject else None,
            school_location_id=str(r.time_slot.session.school_location_id) if r.time_slot.session.school_location_id else None,
            date=str(r.time_slot.date),
            start_time=r.time_slot.start_time,
            school_location_name=(
                r.time_slot.session.school_location.name
                if r.time_slot.session.school_location else None
            ),
            registered_at=r.registered_at.isoformat(),
            days_until=max(0, (r.time_slot.date - today).days),
        )
        for r in registrations
    ]


class VerifyPasswordRequest(BaseModel):
    password: str


@router.post("/verify-password")
async def verify_student_password(
    body: VerifyPasswordRequest,
    student: Student = Depends(get_current_student_dep),
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(credentials.credentials)
    role = payload.get("role") if payload else None
    if role == "app_user":
        user_id = uuid.UUID(payload["sub"])
        u = await db.get(AppUser, user_id)
        if not u:
            raise HTTPException(status_code=400, detail="Пользователь не найден")
        return {"valid": verify_password(body.password, u.password_hash)}
    # role == "student"
    s_result = await db.execute(select(Student).where(Student.id == student.id))
    s = s_result.scalar_one()
    if not s.portal_password_hash:
        raise HTTPException(status_code=400, detail="Пароль не установлен")
    return {"valid": verify_password(body.password, s.portal_password_hash)}


@router.patch("/settings")
async def update_settings(
    body: UpdateSettingsRequest,
    student: Student = Depends(get_current_student_dep),
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    from app.auth.security import hash_password, encrypt_field
    payload = decode_token(credentials.credentials)
    role = payload.get("role") if payload else None
    is_app_user = role == "app_user"

    s_result = await db.execute(select(Student).where(Student.id == student.id))
    s = s_result.scalar_one()

    # For app_user: load their AppUser record for login/password changes
    app_user = None
    if is_app_user:
        user_id = uuid.UUID(payload["sub"])
        app_user = await db.get(AppUser, user_id)

    if body.portal_login is not None:
        if is_app_user and app_user:
            if body.portal_login != app_user.login:
                taken = await db.execute(
                    select(AppUser).where(AppUser.login == body.portal_login, AppUser.id != app_user.id)
                )
                if taken.scalar_one_or_none():
                    raise HTTPException(status_code=400, detail="Логин уже занят")
                app_user.login = body.portal_login
        elif not is_app_user and body.portal_login != s.portal_login:
            taken = await db.execute(
                select(Student).where(Student.portal_login == body.portal_login, Student.id != s.id)
            )
            if taken.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Логин уже занят")
            s.portal_login = body.portal_login

    if body.new_password is not None and body.new_password.strip():
        if not body.old_password:
            raise HTTPException(status_code=400, detail="Введите старый пароль")
        if is_app_user and app_user:
            if not verify_password(body.old_password, app_user.password_hash):
                raise HTTPException(status_code=400, detail="Старый пароль неверный")
            app_user.password_hash = hash_password(body.new_password)
            app_user.password_plain = body.new_password
        else:
            if not s.portal_password_hash or not verify_password(body.old_password, s.portal_password_hash):
                raise HTTPException(status_code=400, detail="Старый пароль неверный")
            s.portal_password_hash = hash_password(body.new_password)
            s.portal_password_plain = encrypt_field(body.new_password)

    if body.phone is not None:
        s.phone = body.phone or None

    if body.email is not None:
        s.email = body.email or None

    if body.chat_display_name is not None:
        s.chat_display_name = body.chat_display_name or None

    await db.commit()
    return {"message": "Настройки сохранены"}


@router.get("/results", response_model=list[ExamResultResponse])
async def get_exam_results(
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamResult)
        .options(
            selectinload(ExamResult.exam).selectinload(Exam.subject_rel),
        )
        .where(ExamResult.student_id == student.id)
        .order_by(ExamResult.added_at.desc())
    )
    results = result.scalars().all()

    return [
        ExamResultResponse(
            exam_id=str(r.exam_id),
            exam_title=r.exam.title,
            subject_name=r.exam.subject_rel.name if r.exam.subject_rel else r.exam.subject,
            exam_date=str(r.exam.date) if r.exam.date else None,
            primary_score=r.primary_score,
            final_score=r.final_score,
            threshold_score=r.exam.threshold_score,
            is_passed=(
                int(r.final_score) >= r.exam.threshold_score
                if r.exam.threshold_score is not None else None
            ),
            added_at=r.added_at.isoformat(),
        )
        for r in results
    ]
