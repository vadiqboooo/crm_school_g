"""add portal_password_plain to students

Revision ID: p1o2r3t4a5l6
Revises: m1a2r3k4e5d6
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'p1o2r3t4a5l6'
down_revision = 'm1a2r3k4e5d6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('students', sa.Column('portal_password_plain', sa.String(100), nullable=True))


def downgrade():
    op.drop_column('students', 'portal_password_plain')
