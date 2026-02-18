"""add_class_number_to_students

Revision ID: 37c41d06ab1f
Revises: ac018c9452b2
Create Date: 2026-02-16 20:24:19.290172

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37c41d06ab1f'
down_revision: Union[str, None] = 'ac018c9452b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add class_number column to students table
    op.add_column('students', sa.Column('class_number', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove class_number column
    op.drop_column('students', 'class_number')
