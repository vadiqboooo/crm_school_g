"""add file fields to chat_messages

Revision ID: f1i2l3e4s5
Revises: e1m2p3l4
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa

revision = 'f1i2l3e4s5'
down_revision = 'e1m2p3l4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'file' value to messagetype enum
    op.execute("ALTER TYPE messagetype ADD VALUE IF NOT EXISTS 'file'")

    # Add file_name and file_size columns
    op.add_column('chat_messages', sa.Column('file_name', sa.String(500), nullable=True))
    op.add_column('chat_messages', sa.Column('file_size', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'file_size')
    op.drop_column('chat_messages', 'file_name')
    # Note: PostgreSQL does not support removing values from enums.
    # The 'file' value will remain in the messagetype enum.
