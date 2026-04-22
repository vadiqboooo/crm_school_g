"""add banner signup fields, form fields table, and signups table

Revision ID: b7s8i9g0n1u2
Revises: h1o2m3e4b5n6
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'b7s8i9g0n1u2'
down_revision = 'h1o2m3e4b5n6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'home_banners',
        sa.Column('signup_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'home_banners',
        sa.Column('signup_button_text', sa.String(100), nullable=True),
    )

    op.create_table(
        'home_banner_form_fields',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'banner_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('home_banners.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('field_type', sa.String(20), nullable=False),
        sa.Column('key', sa.String(60), nullable=False),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('placeholder', sa.String(200), nullable=True),
        sa.Column('required', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )

    op.create_table(
        'home_banner_signups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'banner_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('home_banners.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'student_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('students.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('student_name', sa.String(300), nullable=True),
        sa.Column('student_phone', sa.String(50), nullable=True),
        sa.Column('student_email', sa.String(200), nullable=True),
        sa.Column('form_data', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(30), nullable=False, server_default='new'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('home_banner_signups')
    op.drop_table('home_banner_form_fields')
    op.drop_column('home_banners', 'signup_button_text')
    op.drop_column('home_banners', 'signup_enabled')
