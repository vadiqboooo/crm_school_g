"""add subject_id to exam_registrations

Revision ID: a1b2e3x4r5e6
Revises: r1e2g3i4s5t6
Create Date: 2026-03-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1b2e3x4r5e6"
down_revision = "r1e2g3i4s5t6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "exam_registrations",
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_exam_registrations_subject_id",
        "exam_registrations", "subjects",
        ["subject_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_exam_registrations_subject_id", "exam_registrations", type_="foreignkey")
    op.drop_column("exam_registrations", "subject_id")
