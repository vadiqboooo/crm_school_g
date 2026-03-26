"""add public_key to employees

Revision ID: e1m2p3l4
Revises: e1n2c3r4y5p6
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'e1m2p3l4'
down_revision = 'e1n2c3r4y5p6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('employees', sa.Column('public_key', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('employees', 'public_key')
