"""add_trial_conducted_group_to_leads

Revision ID: i5d6e7f8a9b0
Revises: h4c5d6e7f8a9
Create Date: 2026-03-10 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'i5d6e7f8a9b0'
down_revision: Union[str, None] = 'h4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'leads',
        sa.Column(
            'trial_conducted_group_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('groups.id', ondelete='SET NULL'),
            nullable=True,
        )
    )


def downgrade() -> None:
    op.drop_column('leads', 'trial_conducted_group_id')
