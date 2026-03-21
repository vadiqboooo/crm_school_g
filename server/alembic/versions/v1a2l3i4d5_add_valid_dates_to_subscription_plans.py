"""add valid_from and valid_until to subscription_plans

Revision ID: v1a2l3i4d5
Revises: d1i2s3c4o5u6
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'v1a2l3i4d5'
down_revision = 'd1i2s3c4o5u6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('subscription_plans', sa.Column('valid_from', sa.Date(), nullable=True))
    op.add_column('subscription_plans', sa.Column('valid_until', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('subscription_plans', 'valid_until')
    op.drop_column('subscription_plans', 'valid_from')
