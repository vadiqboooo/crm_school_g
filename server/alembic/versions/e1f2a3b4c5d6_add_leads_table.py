"""add_leads_table

Revision ID: e1f2a3b4c5d6
Revises: d3e4f5a6b7c8
Create Date: 2026-03-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'a1e2f3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'leads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contact_name', sa.String(200), nullable=True),
        sa.Column('student_name', sa.String(200), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column(
            'status',
            sa.Enum(
                'not_sorted', 'contact_established', 'trial_assigned', 'trial_conducted', 'archived',
                name='leadstatus',
            ),
            nullable=False,
            server_default='not_sorted',
        ),
        sa.Column('assigned_to_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('school_location_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('trial_group_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['school_location_id'], ['school_locations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['trial_group_id'], ['groups.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'lead_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['employees.id']),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('lead_comments')
    op.drop_table('leads')

    lead_status = postgresql.ENUM(name='leadstatus')
    lead_status.drop(op.get_bind(), checkfirst=True)
