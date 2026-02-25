"""add_end_time_to_daily_reports

Revision ID: 09fb4150a45b
Revises: cb51087cbf3d
Create Date: 2026-02-25 13:44:47.909598

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09fb4150a45b'
down_revision: Union[str, None] = 'cb51087cbf3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add end_time column to daily_reports table
    op.add_column('daily_reports', sa.Column('end_time', sa.Time(), nullable=True))


def downgrade() -> None:
    # Remove end_time column from daily_reports table
    op.drop_column('daily_reports', 'end_time')
