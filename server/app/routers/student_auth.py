"""
Student Portal Authentication
POST /student-auth/login   — вход по portal_login / пароль
POST /student-auth/refresh — обновление токена
GET  /student-auth/me      — текущий ученик

Генерация логина: транслитерация фамилии + _ + первые 2 буквы имени
Пароль генерируется автоматически, хранится как bcrypt-хэш
"""
import random
import re
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.database import get_db
from app.models.student import Student
from app.models.app_user import AppUser

router = APIRouter(prefix="/student-auth", tags=["student-auth"])

# ── Transliteration ────────────────────────────────────────────────────────────
_TRANSLIT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',
}


def _translit(text: str) -> str:
    result = []
    for ch in text.lower():
        result.append(_TRANSLIT.get(ch, ch))
    return re.sub(r'[^a-z0-9_]', '', ''.join(result))


def generate_login(last_name: str, first_name: str) -> str:
    last = _translit(last_name)
    first = _translit(first_name)[:2]
    return f"{last}_{first}" if first else last


def generate_password(length: int = 8) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


async def make_unique_login(base: str, db: AsyncSession) -> str:
    login = base
    counter = 1
    while True:
        existing = await db.execute(select(Student).where(Student.portal_login == login))
        if not existing.scalar_one_or_none():
            return login
        login = f"{base}{counter}"
        counter += 1


# ── Schemas ────────────────────────────────────────────────────────────────────

class StudentLoginRequest(BaseModel):
    login: str
    password: str


class StudentTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    student_id: str
    first_name: str
    last_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=StudentTokenResponse)
async def student_login(data: StudentLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.portal_login == data.login))
    student = result.scalar_one_or_none()
    if not student or not student.portal_password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    if not verify_password(data.password, student.portal_password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    if student.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт неактивен")

    payload = {"sub": str(student.id), "role": "student"}
    return StudentTokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        student_id=str(student.id),
        first_name=student.first_name,
        last_name=student.last_name,
    )


@router.post("/refresh", response_model=StudentTokenResponse)
async def student_refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh" or payload.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")
    student_id = payload.get("sub")
    result = await db.execute(select(Student).where(Student.id == uuid.UUID(student_id)))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Студент не найден")

    new_payload = {"sub": str(student.id), "role": "student"}
    return StudentTokenResponse(
        access_token=create_access_token(new_payload),
        refresh_token=create_refresh_token(new_payload),
        student_id=str(student.id),
        first_name=student.first_name,
        last_name=student.last_name,
    )


# ── Helper: get current student from token ────────────────────────────────────

async def get_current_student(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(lambda: None),
) -> Student:
    """Используется как зависимость в student_portal роутере."""
    raise HTTPException(status_code=501, detail="Use get_current_student_dep")


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer()


async def get_current_student_dep(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Student:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    role = payload.get("role")
    if role == "student":
        student_id = payload.get("sub")
    elif role == "app_user":
        student_id = payload.get("student_id")
        if not student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт не привязан к студенту")
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    result = await db.execute(select(Student).where(Student.id == uuid.UUID(student_id)))
    student = result.scalar_one_or_none()
    if not student or student.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Студент не найден")
    return student


class PortalIdentity:
    """Авторизованный пользователь портала: либо Student, либо AppUser (ещё не привязанный)."""

    def __init__(self, student: Student | None, app_user: AppUser | None):
        self.student = student
        self.app_user = app_user

    @property
    def student_id(self) -> uuid.UUID | None:
        return self.student.id if self.student else None


async def get_portal_identity_dep(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> PortalIdentity:
    """Мягкая версия get_current_student_dep: не падает 403 для app_user без student_id."""
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    role = payload.get("role")
    if role == "student":
        student_res = await db.execute(
            select(Student).where(Student.id == uuid.UUID(payload["sub"]))
        )
        student = student_res.scalar_one_or_none()
        if not student or student.status != "active":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Студент не найден")
        return PortalIdentity(student=student, app_user=None)

    if role == "app_user":
        app_user = await db.get(AppUser, uuid.UUID(payload["sub"]))
        if not app_user or not app_user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
        student = None
        if app_user.student_id:
            st_res = await db.execute(select(Student).where(Student.id == app_user.student_id))
            st = st_res.scalar_one_or_none()
            if st and st.status == "active":
                student = st
        return PortalIdentity(student=student, app_user=app_user)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")
