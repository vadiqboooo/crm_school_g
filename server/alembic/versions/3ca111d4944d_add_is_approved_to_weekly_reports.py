"""add_is_approved_to_weekly_reports

Revision ID: 3ca111d4944d
Revises: 183f071a1dd9
Create Date: 2026-02-20 21:07:33.179118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ca111d4944d'
down_revision: Union[str, None] = '183f071a1dd9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_approved column to weekly_reports table
    op.add_column('weekly_reports', sa.Column('is_approved', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    # Remove is_approved column from weekly_reports table
    op.drop_column('weekly_reports', 'is_approved')
