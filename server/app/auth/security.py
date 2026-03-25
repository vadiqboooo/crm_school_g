import base64
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from jose import jwt

from app.config import settings


def _fernet() -> Fernet:
    """Возвращает Fernet instance на основе SECRET_KEY приложения."""
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_field(plain: str) -> str:
    """Шифрует строку для хранения в БД."""
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_field(value: str) -> str:
    """Расшифровывает строку из БД. Поддерживает старые нешифрованные значения."""
    try:
        return _fernet().decrypt(value.encode()).decode()
    except Exception:
        return value  # обратная совместимость: старые plain-text значения


def _prepare_password(password: str) -> bytes:
    """Pre-hash long passwords with sha256 to bypass bcrypt's 72-byte limit."""
    # Ensure we're working with a string and encode it
    password_str = str(password) if not isinstance(password, str) else password
    password_bytes = password_str.encode("utf-8")

    # If password is longer than 72 bytes, pre-hash it with SHA256
    if len(password_bytes) > 72:
        # Return SHA256 hash as bytes
        return hashlib.sha256(password_bytes).digest()
    return password_bytes


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    password_bytes = _prepare_password(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    password_bytes = _prepare_password(plain_password)
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.JWTError:
        return None


def derive_chat_public_key(password: str, student_id: str) -> str:
    """Derive X25519 public key from password + student_id.
    Uses same algorithm as frontend: PBKDF2-SHA256(200k iter) → nacl.box.keyPair.
    """
    private_key_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        student_id.encode("utf-8"),
        200_000,
        dklen=32,
    )
    pub_bytes = X25519PrivateKey.from_private_bytes(private_key_bytes).public_key().public_bytes_raw()
    return base64.b64encode(pub_bytes).decode("utf-8")
