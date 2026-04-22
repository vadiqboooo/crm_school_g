"""add home_banners table

Revision ID: h1o2m3e4b5n6
Revises: e1d2i3t4f5w6
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'h1o2m3e4b5n6'
down_revision = 'e1d2i3t4f5w6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'home_banners',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('subtitle', sa.Text(), nullable=True),
        sa.Column('badge_text', sa.String(100), nullable=True),
        sa.Column('badge_color', sa.String(20), nullable=True),
        sa.Column('price_text', sa.String(100), nullable=True),
        sa.Column('footer_tags', sa.String(300), nullable=True),
        sa.Column('icon', sa.String(20), nullable=True),
        sa.Column('gradient_from', sa.String(20), nullable=False, server_default='#4f46e5'),
        sa.Column('gradient_to', sa.String(20), nullable=False, server_default='#7c3aed'),
        sa.Column('action_url', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('home_banners')
