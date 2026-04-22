"""clear default tags from home info card

Revision ID: c1l2e3a4r5t6
Revises: h0i1n2f3o4c5
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op


revision = 'c1l2e3a4r5t6'
down_revision = 'h0i1n2f3o4c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE home_info_card SET tags = '[]'::json")


def downgrade() -> None:
    pass
