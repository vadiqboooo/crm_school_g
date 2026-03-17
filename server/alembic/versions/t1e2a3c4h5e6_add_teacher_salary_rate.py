"""add_teacher_salary_rate

Revision ID: t1e2a3c4h5e6
Revises: k7f8a9b0c1d2
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "t1e2a3c4h5e6"
down_revision = "k7f8a9b0c1d2"
branch_labels = None
depends_on = None


def upgrade():
    # Salary rate fields on employees
    op.add_column("employees", sa.Column("salary_rate", sa.Numeric(10, 2), nullable=True))
    op.add_column("employees", sa.Column("salary_bonus_per_student", sa.Numeric(10, 2), nullable=True))
    op.add_column("employees", sa.Column("salary_base_students", sa.Integer, server_default="8", nullable=False))

    # Extra fields on employee_salaries
    op.add_column("employee_salaries", sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("employee_salaries", sa.Column("students_count", sa.Integer, nullable=True))
    op.add_column("employee_salaries", sa.Column("description", sa.String(500), nullable=True))
    op.create_foreign_key(
        "fk_employee_salaries_lesson_id",
        "employee_salaries", "lessons",
        ["lesson_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_employee_salaries_lesson_id", "employee_salaries", type_="foreignkey")
    op.drop_column("employee_salaries", "description")
    op.drop_column("employee_salaries", "students_count")
    op.drop_column("employee_salaries", "lesson_id")
    op.drop_column("employees", "salary_base_students")
    op.drop_column("employees", "salary_bonus_per_student")
    op.drop_column("employees", "salary_rate")
