"""add attendance and passed to exam registrations

Revision ID: m1a2r3k4e5d6
Revises: a1b2e3x4r5e6
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'm1a2r3k4e5d6'
down_revision = 's1e2t3t4i5n6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('exam_registrations', sa.Column('attendance', sa.String(20), nullable=True))
    op.add_column('exam_registrations', sa.Column('passed', sa.Boolean(), nullable=True))


def downgrade():
    op.drop_column('exam_registrations', 'passed')
    op.drop_column('exam_registrations', 'attendance')
