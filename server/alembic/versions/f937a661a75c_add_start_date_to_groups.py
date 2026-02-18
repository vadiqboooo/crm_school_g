"""add_start_date_to_groups

Revision ID: f937a661a75c
Revises: 488f62e41c62
Create Date: 2026-02-14 09:12:50.065484

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f937a661a75c'
down_revision: Union[str, None] = '488f62e41c62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('groups', sa.Column('start_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('groups', 'start_date')
