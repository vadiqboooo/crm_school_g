"""add_assigned_to_to_tasks

Revision ID: cb51087cbf3d
Revises: 4d5e6f7a8b9c
Create Date: 2026-02-24 22:17:42.298620

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb51087cbf3d'
down_revision: Union[str, None] = '4d5e6f7a8b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add assigned_to column to tasks table
    op.add_column('tasks', sa.Column('assigned_to', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_tasks_assigned_to_employees', 'tasks', 'employees', ['assigned_to'], ['id'])


def downgrade() -> None:
    # Remove assigned_to column from tasks table
    op.drop_constraint('fk_tasks_assigned_to_employees', 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'assigned_to')
