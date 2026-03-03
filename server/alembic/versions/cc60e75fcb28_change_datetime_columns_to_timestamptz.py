"""change_datetime_columns_to_timestamptz

Revision ID: cc60e75fcb28
Revises: 3c7cd86f63be
Create Date: 2026-03-02 18:09:43.556019

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc60e75fcb28'
down_revision: Union[str, None] = '3c7cd86f63be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change all TIMESTAMP columns to TIMESTAMP WITH TIME ZONE
    # This is needed to support timezone-aware datetime objects

    # Tasks table
    op.execute("ALTER TABLE tasks ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Task comments table
    op.execute("ALTER TABLE task_comments ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Daily reports table
    op.execute("ALTER TABLE daily_reports ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Weekly reports table
    op.execute("ALTER TABLE weekly_reports ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Students table
    op.execute("ALTER TABLE students ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Student history table
    op.execute("ALTER TABLE student_history ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Parent feedbacks table
    op.execute("ALTER TABLE parent_feedbacks ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Exams table
    op.execute("ALTER TABLE exams ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Exam results table
    op.execute("ALTER TABLE exam_results ALTER COLUMN added_at TYPE TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE exam_results ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE")

    # Groups table
    op.execute("ALTER TABLE groups ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Group students table
    op.execute("ALTER TABLE group_students ALTER COLUMN joined_at TYPE TIMESTAMP WITH TIME ZONE")

    # Employees table
    op.execute("ALTER TABLE employees ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Payments table
    op.execute("ALTER TABLE payments ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # Employee salaries table
    op.execute("ALTER TABLE employee_salaries ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")

    # School locations table
    op.execute("ALTER TABLE school_locations ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    # Revert back to TIMESTAMP WITHOUT TIME ZONE

    # Tasks table
    op.execute("ALTER TABLE tasks ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Task comments table
    op.execute("ALTER TABLE task_comments ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Daily reports table
    op.execute("ALTER TABLE daily_reports ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Weekly reports table
    op.execute("ALTER TABLE weekly_reports ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Students table
    op.execute("ALTER TABLE students ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Student history table
    op.execute("ALTER TABLE student_history ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Parent feedbacks table
    op.execute("ALTER TABLE parent_feedbacks ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Exams table
    op.execute("ALTER TABLE exams ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Exam results table
    op.execute("ALTER TABLE exam_results ALTER COLUMN added_at TYPE TIMESTAMP WITHOUT TIME ZONE")
    op.execute("ALTER TABLE exam_results ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Groups table
    op.execute("ALTER TABLE groups ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Group students table
    op.execute("ALTER TABLE group_students ALTER COLUMN joined_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Employees table
    op.execute("ALTER TABLE employees ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Payments table
    op.execute("ALTER TABLE payments ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # Employee salaries table
    op.execute("ALTER TABLE employee_salaries ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")

    # School locations table
    op.execute("ALTER TABLE school_locations ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")
