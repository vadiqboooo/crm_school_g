"""add_lead_trial_groups_and_is_trial

Revision ID: h4c5d6e7f8a9
Revises: g3b4c5d6e7f8
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'h4c5d6e7f8a9'
down_revision: Union[str, None] = 'g3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_trial flag to group_students
    op.add_column('group_students', sa.Column('is_trial', sa.Boolean(), nullable=False, server_default='false'))

    # Create many-to-many junction table for lead trial groups
    op.create_table(
        'lead_trial_groups',
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('lead_id', 'group_id'),
    )

    # Migrate existing trial_group_id data into the new junction table
    op.execute("""
        INSERT INTO lead_trial_groups (lead_id, group_id)
        SELECT id, trial_group_id
        FROM leads
        WHERE trial_group_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table('lead_trial_groups')
    op.drop_column('group_students', 'is_trial')
