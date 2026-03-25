"""
App Users — пользователи мобильного/веб приложения.

CRM (admin):
  GET    /app-users/                  — список всех
  POST   /app-users/                  — создать
  PATCH  /app-users/{id}              — обновить (display_name, notes, is_active)
  DELETE /app-users/{id}              — удалить
  POST   /app-users/{id}/link-student — привязать студента
  DELETE /app-users/{id}/link-student — отвязать студента

Auth (для приложения):
  POST /app-auth/login    — вход
  POST /app-auth/refresh  — обновление токена
  GET  /app-auth/me       — текущий пользователь
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    derive_chat_public_key, encrypt_field, decrypt_field,
)
from app.database import get_db
from app.models.app_user import AppUser
from app.models.employee import Employee
from app.models.student import Student

router = APIRouter(prefix="/app-users", tags=["app-users"])
auth_router = APIRouter(prefix="/app-auth", tags=["app-auth"])

_bearer = HTTPBearer()


# ── Schemas ────────────────────────────────────────────────────────────────────

class AppUserCreate(BaseModel):
    display_name: str
    login: str
    password: str
    notes: str | None = None


class AppUserUpdate(BaseModel):
    display_name: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class LinkStudentBody(BaseModel):
    student_id: str


class AppUserLoginRequest(BaseModel):
    login: str
    password: str


class AppUserTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    display_name: str
    role: str = "app_user"
    student_id: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _serialize(u: AppUser) -> dict:
    return {
        "id": str(u.id),
        "display_name": u.display_name,
        "login": u.login,
        "password_plain": decrypt_field(u.password_plain) if u.password_plain else None,
        "is_active": u.is_active,
        "notes": u.notes,
        "student_id": str(u.student_id) if u.student_id else None,
        "student_name": (
            f"{u.student.first_name} {u.student.last_name}" if u.student else None
        ),
        "created_at": u.created_at.isoformat(),
    }


# ── CRM endpoints ──────────────────────────────────────────────────────────────

@router.get("/")
async def list_app_users(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(AppUser)
        .options(selectinload(AppUser.student))
        .order_by(AppUser.created_at.desc())
    )
    return [_serialize(u) for u in result.scalars().all()]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_app_user(
    data: AppUserCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    existing = await db.execute(select(AppUser).where(AppUser.login == data.login))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Логин уже занят")

    u = AppUser(
        display_name=data.display_name,
        login=data.login,
        password_hash=hash_password(data.password),
        password_plain=encrypt_field(data.password),
        notes=data.notes,
    )
    db.add(u)
    await db.flush()  # get id before derive
    u.public_key = derive_chat_public_key(data.password, str(u.id))
    await db.commit()
    await db.refresh(u)
    return _serialize(u)


@router.patch("/{user_id}")
async def update_app_user(
    user_id: uuid.UUID,
    data: AppUserUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    u = await db.get(AppUser, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if data.display_name is not None:
        u.display_name = data.display_name
    if data.notes is not None:
        u.notes = data.notes
    if data.is_active is not None:
        u.is_active = data.is_active
    await db.commit()
    await db.refresh(u)
    return _serialize(u)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    u = await db.get(AppUser, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    await db.delete(u)
    await db.commit()


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_app_user_password(
    user_id: uuid.UUID,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    u = await db.get(AppUser, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    u.password_hash = hash_password(data.new_password)
    u.password_plain = encrypt_field(data.new_password)
    u.public_key = derive_chat_public_key(data.new_password, str(u.id))
    await db.commit()


@router.post("/{user_id}/link-student")
async def link_student(
    user_id: uuid.UUID,
    body: LinkStudentBody,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    u = await db.get(AppUser, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    student_uuid = uuid.UUID(body.student_id)

    # Check student exists
    student = await db.get(Student, student_uuid)
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    # Check student not already linked to another app_user
    existing = await db.execute(
        select(AppUser).where(AppUser.student_id == student_uuid, AppUser.id != user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Студент уже привязан к другому аккаунту")

    u.student_id = student_uuid
    await db.commit()
    await db.refresh(u, attribute_names=["student"])
    return _serialize(u)


@router.delete("/{user_id}/link-student")
async def unlink_student(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    u = await db.get(AppUser, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    u.student_id = None
    await db.commit()
    return {"ok": True}


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@auth_router.post("/login", response_model=AppUserTokenResponse)
async def app_user_login(data: AppUserLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUser).where(AppUser.login == data.login))
    u = result.scalar_one_or_none()
    if not u or not verify_password(data.password, u.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    if not u.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт неактивен")

    # Rederive public key if missing (e.g., created before this feature)
    if not u.public_key:
        u.public_key = derive_chat_public_key(data.password, str(u.id))
        await db.commit()

    payload = {"sub": str(u.id), "role": "app_user", "student_id": str(u.student_id) if u.student_id else None}
    return AppUserTokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        user_id=str(u.id),
        display_name=u.display_name,
        student_id=str(u.student_id) if u.student_id else None,
    )


@auth_router.post("/refresh", response_model=AppUserTokenResponse)
async def app_user_refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh" or payload.get("role") != "app_user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")
    user_id = payload.get("sub")
    u = await db.get(AppUser, uuid.UUID(user_id))
    if not u or not u.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")

    new_payload = {"sub": str(u.id), "role": "app_user", "student_id": str(u.student_id) if u.student_id else None}
    return AppUserTokenResponse(
        access_token=create_access_token(new_payload),
        refresh_token=create_refresh_token(new_payload),
        user_id=str(u.id),
        display_name=u.display_name,
        student_id=str(u.student_id) if u.student_id else None,
    )


@auth_router.get("/me")
async def app_user_me(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("role") != "app_user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")
    u = await db.get(AppUser, uuid.UUID(payload["sub"]))
    if not u or not u.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    return {
        "id": str(u.id),
        "display_name": u.display_name,
        "login": u.login,
        "student_id": str(u.student_id) if u.student_id else None,
        "role": "app_user",
    }


# ── Dependency: get current app_user from token ────────────────────────────────

async def get_current_app_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> AppUser:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("role") != "app_user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")
    u = await db.get(AppUser, uuid.UUID(payload["sub"]))
    if not u or not u.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    return u
