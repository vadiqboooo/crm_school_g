"""add_app_users_and_membertype_app_user

Revision ID: a1p2p3
Revises: c1h2a3t4
Create Date: 2026-03-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1p2p3'
down_revision = 'c1h2a3t4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'app_user' value to the membertype enum
    op.execute("ALTER TYPE membertype ADD VALUE IF NOT EXISTS 'app_user'")

    # Create app_users table
    op.create_table(
        'app_users',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('display_name', sa.String(200), nullable=False),
        sa.Column('login', sa.String(100), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('password_plain', sa.String(100), nullable=True),
        sa.Column('public_key', sa.Text(), nullable=True),
        sa.Column(
            'student_id',
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey('students.id', ondelete='SET NULL'),
            nullable=True,
            unique=True,
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_app_users_login', 'app_users', ['login'])


def downgrade() -> None:
    op.drop_index('ix_app_users_login', 'app_users')
    op.drop_table('app_users')
    # Note: PostgreSQL does not support removing enum values easily.
    # The 'app_user' value will remain in the enum after downgrade.
