"""email auth: app_users.email + first/last_name + email_verification_codes

Revision ID: e1m2a3i4l5a6
Revises: c1l2e3a4r5t6
Create Date: 2026-04-21 00:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'e1m2a3i4l5a6'
down_revision = 'c1l2e3a4r5t6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # app_users: add email (unique, nullable), first_name, last_name
    op.add_column('app_users', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('app_users', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.add_column('app_users', sa.Column('last_name', sa.String(length=100), nullable=True))
    op.create_unique_constraint('uq_app_users_email', 'app_users', ['email'])
    op.create_index('ix_app_users_email', 'app_users', ['email'])

    # email_verification_codes
    op.create_table(
        'email_verification_codes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('code_hash', sa.String(length=255), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('purpose', sa.String(length=20), nullable=False, server_default='auth'),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('used_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_evc_email', 'email_verification_codes', ['email'])


def downgrade() -> None:
    op.drop_index('ix_evc_email', table_name='email_verification_codes')
    op.drop_table('email_verification_codes')
    op.drop_index('ix_app_users_email', table_name='app_users')
    op.drop_constraint('uq_app_users_email', 'app_users', type_='unique')
    op.drop_column('app_users', 'last_name')
    op.drop_column('app_users', 'first_name')
    op.drop_column('app_users', 'email')
