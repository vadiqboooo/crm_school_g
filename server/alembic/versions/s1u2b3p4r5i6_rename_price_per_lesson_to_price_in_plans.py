"""rename price_per_lesson to price in subscription_plans

Revision ID: s1u2b3p4r5i6
Revises: p1o2r3t4a5l6
Create Date: 2026-03-21

"""
from alembic import op

revision = 's1u2b3p4r5i6'
down_revision = 'p1o2r3t4a5l6'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('subscription_plans', 'price_per_lesson', new_column_name='price')


def downgrade():
    op.alter_column('subscription_plans', 'price', new_column_name='price_per_lesson')
