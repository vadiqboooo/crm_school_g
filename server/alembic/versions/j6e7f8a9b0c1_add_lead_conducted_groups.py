"""add_lead_conducted_groups

Revision ID: j6e7f8a9b0c1
Revises: i5d6e7f8a9b0
Create Date: 2026-03-10 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'j6e7f8a9b0c1'
down_revision: Union[str, None] = 'i5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lead_conducted_groups',
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('lead_id', 'group_id'),
    )
    # Migrate existing trial_conducted_group_id into the new table
    op.execute("""
        INSERT INTO lead_conducted_groups (lead_id, group_id)
        SELECT id, trial_conducted_group_id
        FROM leads
        WHERE trial_conducted_group_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table('lead_conducted_groups')
