"""add email and chat_display_name to students

Revision ID: s1e2t3t4i5n6
Revises: a1b2e3x4r5e6
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa

revision = "s1e2t3t4i5n6"
down_revision = "a1b2e3x4r5e6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("students", sa.Column("email", sa.String(200), nullable=True))
    op.add_column("students", sa.Column("chat_display_name", sa.String(100), nullable=True))


def downgrade():
    op.drop_column("students", "chat_display_name")
    op.drop_column("students", "email")
