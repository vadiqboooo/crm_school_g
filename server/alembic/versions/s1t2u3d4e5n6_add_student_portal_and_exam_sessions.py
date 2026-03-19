"""add_student_portal_and_exam_sessions

Revision ID: s1t2u3d4e5n6
Revises: p1a2y3m4e5n6
Create Date: 2026-03-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "s1t2u3d4e5n6"
down_revision = "p1a2y3m4e5n6"
branch_labels = None
depends_on = None


def upgrade():
    # Student portal credentials
    op.add_column("students", sa.Column("portal_login", sa.String(100), nullable=True))
    op.add_column("students", sa.Column("portal_password_hash", sa.String(255), nullable=True))
    op.create_unique_constraint("uq_students_portal_login", "students", ["portal_login"])

    # Exam portal sessions
    op.create_table(
        "exam_portal_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("school_location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("school_locations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Exam time slots
    op.create_table(
        "exam_time_slots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exam_portal_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(10), nullable=False),
        sa.Column("total_seats", sa.Integer(), nullable=False, server_default="10"),
    )

    # Exam registrations
    op.create_table(
        "exam_registrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time_slot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exam_time_slots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "time_slot_id", name="uq_exam_registration_student_slot"),
    )


def downgrade():
    op.drop_table("exam_registrations")
    op.drop_table("exam_time_slots")
    op.drop_table("exam_portal_sessions")
    op.drop_constraint("uq_students_portal_login", "students", type_="unique")
    op.drop_column("students", "portal_password_hash")
    op.drop_column("students", "portal_login")
