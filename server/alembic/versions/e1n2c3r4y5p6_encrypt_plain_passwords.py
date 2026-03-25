"""encrypt_plain_passwords

Revision ID: e1n2c3r4y5p6
Revises: a1p2p3
Create Date: 2026-03-24

Encrypts existing plain-text values in students.portal_password_plain and
app_users.password_plain using Fernet (app SECRET_KEY).
"""
import os
import base64
import hashlib

from alembic import op
from sqlalchemy import text

revision = 'e1n2c3r4y5p6'
down_revision = 'a1p2p3'
branch_labels = None
depends_on = None


def _get_fernet():
    from cryptography.fernet import Fernet
    secret = os.environ.get("SECRET_KEY", "")
    key_bytes = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def _is_encrypted(value: str) -> bool:
    """Fernet tokens start with 'gAAAAA' (base64 of version byte 0x80)."""
    return value.startswith("gAAAAA")


def upgrade() -> None:
    conn = op.get_bind()
    fernet = _get_fernet()

    # Encrypt students.portal_password_plain
    rows = conn.execute(text(
        "SELECT id, portal_password_plain FROM students WHERE portal_password_plain IS NOT NULL"
    )).fetchall()
    for row in rows:
        plain = row[1]
        if plain and not _is_encrypted(plain):
            encrypted = fernet.encrypt(plain.encode()).decode()
            conn.execute(
                text("UPDATE students SET portal_password_plain = :enc WHERE id = :id"),
                {"enc": encrypted, "id": str(row[0])},
            )

    # Encrypt app_users.password_plain (table may not exist yet on fresh installs)
    try:
        rows = conn.execute(text(
            "SELECT id, password_plain FROM app_users WHERE password_plain IS NOT NULL"
        )).fetchall()
        for row in rows:
            plain = row[1]
            if plain and not _is_encrypted(plain):
                encrypted = fernet.encrypt(plain.encode()).decode()
                conn.execute(
                    text("UPDATE app_users SET password_plain = :enc WHERE id = :id"),
                    {"enc": encrypted, "id": str(row[0])},
                )
    except Exception:
        pass  # table doesn't exist yet on fresh install — that's fine


def downgrade() -> None:
    # Decrypt back to plain text
    conn = op.get_bind()
    fernet = _get_fernet()

    rows = conn.execute(text(
        "SELECT id, portal_password_plain FROM students WHERE portal_password_plain IS NOT NULL"
    )).fetchall()
    for row in rows:
        value = row[1]
        if value and _is_encrypted(value):
            plain = fernet.decrypt(value.encode()).decode()
            conn.execute(
                text("UPDATE students SET portal_password_plain = :p WHERE id = :id"),
                {"p": plain, "id": str(row[0])},
            )
