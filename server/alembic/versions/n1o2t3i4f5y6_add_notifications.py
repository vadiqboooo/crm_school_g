"""add notifications and notification_reads tables

Revision ID: n1o2t3i4f5y6
Revises: b7s8i9g0n1u2
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'n1o2t3i4f5y6'
down_revision = 'b7s8i9g0n1u2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('icon', sa.String(20), nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('action_url', sa.Text(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'notification_reads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'notification_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('notifications.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'student_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('students.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('read_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('notification_id', 'student_id', name='uq_notification_reads_notif_student'),
    )


def downgrade() -> None:
    op.drop_table('notification_reads')
    op.drop_table('notifications')
