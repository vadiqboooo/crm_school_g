"""add_task_comments_table

Revision ID: 3c7cd86f63be
Revises: 0c4774554c32
Create Date: 2026-03-02 17:59:59.093326

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '3c7cd86f63be'
down_revision: Union[str, None] = '0c4774554c32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'task_comments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('task_id', UUID(as_uuid=True), sa.ForeignKey('tasks.id'), nullable=False),
        sa.Column('author_id', UUID(as_uuid=True), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Create indexes for better performance
    op.create_index('ix_task_comments_task_id', 'task_comments', ['task_id'])
    op.create_index('ix_task_comments_author_id', 'task_comments', ['author_id'])


def downgrade() -> None:
    op.drop_index('ix_task_comments_author_id', table_name='task_comments')
    op.drop_index('ix_task_comments_task_id', table_name='task_comments')
    op.drop_table('task_comments')
