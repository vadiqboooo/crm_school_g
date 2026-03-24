"""add_chat_tables

Revision ID: c1h2a3t4
Revises: v1a2l3i4d5
Create Date: 2026-03-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'c1h2a3t4'
down_revision = 'v1a2l3i4d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add public_key to students for E2E encryption
    op.add_column('students', sa.Column('public_key', sa.Text(), nullable=True))

    # chat_rooms
    op.create_table(
        'chat_rooms',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('room_type', sa.Enum('group', 'direct', name='roomtype'), nullable=False),
        sa.Column('group_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # chat_room_members
    op.create_table(
        'chat_room_members',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('room_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('member_type', sa.Enum('student', 'employee', name='membertype'), nullable=False),
        sa.Column('room_key_encrypted', sa.Text(), nullable=True),
        sa.Column('last_read_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('joined_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # chat_messages
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('room_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_type', sa.Enum('student', 'employee', name='membertype'), nullable=False),
        sa.Column('content_encrypted', sa.Text(), nullable=False),
        sa.Column('message_type', sa.Enum('text', 'image', 'sticker', 'system', name='messagetype'), nullable=False, server_default='text'),
        sa.Column('file_url', sa.Text(), nullable=True),
        sa.Column('reply_to_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Indexes for fast message history queries
    op.create_index('ix_chat_messages_room_created', 'chat_messages', ['room_id', sa.text('created_at DESC')])
    op.create_index('ix_chat_room_members_room', 'chat_room_members', ['room_id'])
    op.create_index('ix_chat_room_members_member', 'chat_room_members', ['member_id', 'member_type'])


def downgrade() -> None:
    op.drop_index('ix_chat_room_members_member')
    op.drop_index('ix_chat_room_members_room')
    op.drop_index('ix_chat_messages_room_created')
    op.drop_table('chat_messages')
    op.drop_table('chat_room_members')
    op.drop_table('chat_rooms')
    op.drop_column('students', 'public_key')
    op.execute('DROP TYPE IF EXISTS messagetype')
    op.execute('DROP TYPE IF EXISTS membertype')
    op.execute('DROP TYPE IF EXISTS roomtype')
