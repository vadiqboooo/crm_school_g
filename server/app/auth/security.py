import hashlib
from datetime import datetime, timedelta

import bcrypt
from jose import jwt

from app.config import settings


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
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.JWTError:
        return None
