"""add_parent_comment_to_weekly_reports

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('weekly_reports', sa.Column('parent_feedback', sa.Text(), nullable=True))
    op.add_column('weekly_reports', sa.Column('parent_reaction', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('weekly_reports', 'parent_reaction')
    op.drop_column('weekly_reports', 'parent_feedback')
