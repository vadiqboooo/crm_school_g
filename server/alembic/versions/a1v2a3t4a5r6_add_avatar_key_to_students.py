"""add avatar_key to students

Revision ID: a1v2a3t4a5r6
Revises: e1m2a3i4l5a6
Create Date: 2026-04-24

"""
from alembic import op
import sqlalchemy as sa

revision = "a1v2a3t4a5r6"
down_revision = "e1m2a3i4l5a6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("students", sa.Column("avatar_key", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("students", "avatar_key")
