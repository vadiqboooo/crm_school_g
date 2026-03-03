"""add_updated_at_to_tasks

Revision ID: 6e9ac6ff6a33
Revises: cc60e75fcb28
Create Date: 2026-03-02 19:15:39.708948

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e9ac6ff6a33'
down_revision: Union[str, None] = 'cc60e75fcb28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add updated_at column to tasks table
    op.add_column('tasks', sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))


def downgrade() -> None:
    # Remove updated_at column from tasks table
    op.drop_column('tasks', 'updated_at')
