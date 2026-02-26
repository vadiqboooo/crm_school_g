"""add_new_history_event_types

Revision ID: 0c4774554c32
Revises: e8c5e7871df0
Create Date: 2026-02-25 23:28:36.017249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0c4774554c32'
down_revision: Union[str, None] = 'e8c5e7871df0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to the historyeventtype enum
    op.execute("ALTER TYPE historyeventtype ADD VALUE IF NOT EXISTS 'parent_feedback_added'")
    op.execute("ALTER TYPE historyeventtype ADD VALUE IF NOT EXISTS 'parent_feedback_deleted'")
    op.execute("ALTER TYPE historyeventtype ADD VALUE IF NOT EXISTS 'student_info_updated'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values easily
    # This would require recreating the enum type and all dependent columns
    # For simplicity, we'll leave the enum values in place on downgrade
    pass
