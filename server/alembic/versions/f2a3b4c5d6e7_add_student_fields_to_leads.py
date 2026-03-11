"""add_student_fields_to_leads

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-03-10 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('class_number', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('education_type', sa.String(100), nullable=True))
    op.add_column('leads', sa.Column('current_school', sa.String(300), nullable=True))
    op.add_column('leads', sa.Column('source', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'source')
    op.drop_column('leads', 'current_school')
    op.drop_column('leads', 'education_type')
    op.drop_column('leads', 'class_number')
