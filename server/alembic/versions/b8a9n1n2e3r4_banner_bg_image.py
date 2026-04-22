"""add background_image_url to home_banners

Revision ID: b8a9n1n2e3r4
Revises: n1o2t3i4f5y6
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa


revision = 'b8a9n1n2e3r4'
down_revision = 'n1o2t3i4f5y6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'home_banners',
        sa.Column('background_image_url', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('home_banners', 'background_image_url')
