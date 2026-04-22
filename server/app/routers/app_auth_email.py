"""
Email-регистрация и вход для мобильного приложения.

Passwordless flow:
  1. POST /app-auth/email/send-code       — шлём 6-значный код на email
  2. POST /app-auth/email/verify          — проверка кода.
       Если AppUser с таким email уже есть → возвращаем токены.
       Если нет → возвращаем registration_token (JWT, 15 мин) для завершения регистрации.
  3. POST /app-auth/email/complete        — {registration_token, first_name, last_name}
       → создаёт AppUser, возвращает токены.

Rate limiting:
  - Код живёт 10 мин, максимум 5 попыток ввода.
  - Повторный send-code перезаписывает предыдущий.
"""
import hashlib
import random
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import (
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    derive_chat_public_key,
)
from app.database import get_db
from app.models.app_user import AppUser
from app.models.email_verification_code import EmailVerificationCode
from app.services.email import send_verification_code

router = APIRouter(prefix="/app-auth/email", tags=["app-auth-email"])

CODE_TTL_MINUTES = 10
MAX_CODE_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60
REGISTRATION_TOKEN_TTL_MINUTES = 15


# ── Schemas ────────────────────────────────────────────────────────────────────

class SendCodeRequest(BaseModel):
    email: EmailStr


class SendCodeResponse(BaseModel):
    message: str
    expires_in: int  # seconds


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class VerifyCodeResponse(BaseModel):
    status: str  # "authenticated" | "registration_required"
    # When status=authenticated:
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    user_id: str | None = None
    display_name: str | None = None
    student_id: str | None = None
    # When status=registration_required:
    registration_token: str | None = None


class CompleteRequest(BaseModel):
    registration_token: str
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    display_name: str
    role: str = "app_user"
    student_id: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _make_tokens(user: AppUser) -> AuthTokenResponse:
    payload = {
        "sub": str(user.id),
        "role": "app_user",
        "student_id": str(user.student_id) if user.student_id else None,
    }
    return AuthTokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        user_id=str(user.id),
        display_name=user.display_name,
        student_id=str(user.student_id) if user.student_id else None,
    )


def _make_registration_token(email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=REGISTRATION_TOKEN_TTL_MINUTES)
    from jose import jwt as _jwt
    from app.config import settings as _settings
    return _jwt.encode(
        {"email": email, "type": "registration", "exp": exp},
        _settings.SECRET_KEY,
        algorithm=_settings.ALGORITHM,
    )


def _decode_registration_token(token: str) -> str | None:
    payload = decode_token(token)
    if not payload or payload.get("type") != "registration":
        return None
    return payload.get("email")


_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d",
    "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i",
    "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch",
    "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
    "э": "e", "ю": "yu", "я": "ya",
}


def _translit(text: str) -> str:
    result = []
    for ch in text.lower():
        result.append(_TRANSLIT.get(ch, ch))
    return re.sub(r"[^a-z0-9_]", "", "".join(result))


async def _make_unique_login(base: str, db: AsyncSession) -> str:
    candidate = base or "user"
    suffix = 1
    while True:
        existing = await db.execute(select(AppUser).where(AppUser.login == candidate))
        if not existing.scalar_one_or_none():
            return candidate
        candidate = f"{base or 'user'}{suffix}"
        suffix += 1


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/send-code", response_model=SendCodeResponse)
async def send_code(data: SendCodeRequest, db: AsyncSession = Depends(get_db)):
    email = _normalize_email(data.email)

    # Rate limit: если последний код создан меньше RESEND_COOLDOWN_SECONDS назад — не даём слать
    existing = await db.execute(
        select(EmailVerificationCode)
        .where(EmailVerificationCode.email == email)
        .order_by(EmailVerificationCode.created_at.desc())
    )
    last = existing.scalars().first()
    if last and last.used_at is None:
        age = (datetime.now(timezone.utc) - last.created_at).total_seconds()
        if age < RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Подождите {int(RESEND_COOLDOWN_SECONDS - age)} сек перед повторной отправкой",
            )

    # Удаляем все предыдущие неиспользованные коды для email
    await db.execute(
        delete(EmailVerificationCode).where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.used_at.is_(None),
        )
    )

    code = _generate_code()
    evc = EmailVerificationCode(
        email=email,
        code_hash=_hash_code(code),
        purpose="auth",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
    )
    db.add(evc)
    await db.commit()

    try:
        send_verification_code(email, code)
    except Exception:
        # Ошибку не показываем пользователю — чтобы не светить, какие адреса есть.
        # Но в лог улетит через email.py.
        pass

    return SendCodeResponse(
        message="Код отправлен на почту",
        expires_in=CODE_TTL_MINUTES * 60,
    )


@router.post("/verify", response_model=VerifyCodeResponse)
async def verify_code(data: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    email = _normalize_email(data.email)

    result = await db.execute(
        select(EmailVerificationCode)
        .where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.used_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
    )
    evc = result.scalars().first()
    if not evc:
        raise HTTPException(status_code=400, detail="Код не найден. Запросите новый.")

    now = datetime.now(timezone.utc)
    if evc.expires_at < now:
        raise HTTPException(status_code=400, detail="Код истёк. Запросите новый.")

    if evc.attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Слишком много попыток. Запросите новый код.")

    if evc.code_hash != _hash_code(data.code):
        evc.attempts += 1
        await db.commit()
        raise HTTPException(status_code=400, detail="Неверный код")

    evc.used_at = now
    await db.commit()

    # Существует ли уже AppUser?
    user_res = await db.execute(select(AppUser).where(AppUser.email == email))
    user = user_res.scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Аккаунт неактивен")
        tokens = _make_tokens(user)
        return VerifyCodeResponse(
            status="authenticated",
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            user_id=tokens.user_id,
            display_name=tokens.display_name,
            student_id=tokens.student_id,
        )

    registration_token = _make_registration_token(email)
    return VerifyCodeResponse(
        status="registration_required",
        registration_token=registration_token,
    )


@router.post("/complete", response_model=AuthTokenResponse)
async def complete_registration(data: CompleteRequest, db: AsyncSession = Depends(get_db)):
    email = _decode_registration_token(data.registration_token)
    if not email:
        raise HTTPException(status_code=400, detail="Токен регистрации недействителен или истёк")

    # Двойная проверка — вдруг пользователь уже создан пока токен жил
    existing = await db.execute(select(AppUser).where(AppUser.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Аккаунт с этим email уже существует")

    first_name = data.first_name.strip()
    last_name = data.last_name.strip()
    display_name = f"{first_name} {last_name}".strip()

    # login: email-prefix + translit фамилии; уникализация через suffix
    email_prefix = email.split("@")[0]
    email_prefix = re.sub(r"[^a-z0-9_]", "", email_prefix.lower()) or "user"
    base_login = f"{email_prefix}_{_translit(last_name)}".strip("_") or "user"
    login = await _make_unique_login(base_login, db)

    # Passwordless: рандомный пароль, юзер им не пользуется — вход только через email-код.
    # password_plain не сохраняем (Fernet-шифрование не влезет в VARCHAR(100), да и админу незачем видеть).
    random_password = secrets.token_urlsafe(24)

    user = AppUser(
        display_name=display_name or email,
        first_name=first_name,
        last_name=last_name,
        email=email,
        login=login,
        password_hash=hash_password(random_password),
        password_plain=None,
    )
    db.add(user)
    await db.flush()
    user.public_key = derive_chat_public_key(random_password, str(user.id))
    await db.commit()
    await db.refresh(user)

    return _make_tokens(user)
