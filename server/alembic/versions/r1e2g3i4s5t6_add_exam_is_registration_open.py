"""add exam is_registration_open

Revision ID: r1e2g3i4s5t6
Revises: t1e2a3c4h5e6
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa

revision = "r1e2g3i4s5t6"
down_revision = "s1t2u3d4e5n6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "exams",
        sa.Column(
            "is_registration_open",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade():
    op.drop_column("exams", "is_registration_open")
