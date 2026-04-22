"""add home info card

Revision ID: h0i1n2f3o4c5
Revises: b8a9n1n2e3r4
Create Date: 2026-04-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'h0i1n2f3o4c5'
down_revision = 'b8a9n1n2e3r4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'home_info_card',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('center_name', sa.String(length=100), nullable=False, server_default='ГАРРИ'),
        sa.Column('center_subtitle', sa.String(length=200), nullable=False, server_default='образовательный центр'),
        sa.Column('logo_emoji', sa.String(length=20), nullable=False, server_default='🧙'),
        sa.Column('logo_bg_color', sa.String(length=20), nullable=False, server_default='#f59e0b'),
        sa.Column('heading_line1', sa.String(length=200), nullable=False, server_default='Подготовься к ОГЭ и ЕГЭ'),
        sa.Column('heading_line2', sa.String(length=100), nullable=True, server_default='на 80+'),
        sa.Column('heading_accent_color', sa.String(length=20), nullable=False, server_default='#fde047'),
        sa.Column('subheading', sa.String(length=300), nullable=True, server_default='В 2 раза выгоднее репетитора'),
        sa.Column('gradient_from', sa.String(length=20), nullable=False, server_default='#7c3aed'),
        sa.Column('gradient_to', sa.String(length=20), nullable=False, server_default='#6366f1'),
        sa.Column('stats', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('formats', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('trial_button_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('trial_button_text', sa.String(length=100), nullable=False, server_default='Записаться на пробный'),
        sa.Column('tariffs_button_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('tariffs_button_text', sa.String(length=100), nullable=False, server_default='Тарифы'),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )

    default_stats = (
        '['
        '{"value": "100", "label": "баллы каждый год"},'
        '{"value": "80%", "label": "сдают на 85+ баллов"},'
        '{"value": "95%", "label": "поступают на бюджет"},'
        '{"value": "1000+", "label": "учеников поступили"}'
        ']'
    )
    default_tags = '[]'
    default_formats = (
        '['
        '{"icon": "🏠", "title": "Офлайн", "subtitle": "до 10 человек", "bg_color": "#fb923c"},'
        '{"icon": "💻", "title": "Онлайн", "subtitle": "3-8 человек", "bg_color": "#38bdf8"}'
        ']'
    )

    op.execute(
        f"""
        INSERT INTO home_info_card (id, stats, tags, formats)
        VALUES (gen_random_uuid(), '{default_stats}'::json, '{default_tags}'::json, '{default_formats}'::json)
        """
    )


def downgrade() -> None:
    op.drop_table('home_info_card')
