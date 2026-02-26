"""add_employee_name_snapshots_to_parent_feedbacks

Revision ID: e8c5e7871df0
Revises: d3e4f5a6b7c8
Create Date: 2026-02-25 23:23:17.878460

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8c5e7871df0'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add employee name snapshot fields to parent_feedbacks table
    op.add_column('parent_feedbacks', sa.Column('created_by_first_name', sa.String(length=100), nullable=True))
    op.add_column('parent_feedbacks', sa.Column('created_by_last_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remove employee name snapshot fields from parent_feedbacks table
    op.drop_column('parent_feedbacks', 'created_by_last_name')
    op.drop_column('parent_feedbacks', 'created_by_first_name')
