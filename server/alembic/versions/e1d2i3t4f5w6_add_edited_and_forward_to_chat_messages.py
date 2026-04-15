"""add edited_at and forwarded_from_sender_name to chat_messages

Revision ID: e1d2i3t4f5w6
Revises: f1i2l3e4s5
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = 'e1d2i3t4f5w6'
down_revision = 'f1i2l3e4s5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('chat_messages', sa.Column('edited_at', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('chat_messages', sa.Column('forwarded_from_sender_name', sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'forwarded_from_sender_name')
    op.drop_column('chat_messages', 'edited_at')
