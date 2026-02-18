"""extend_subjects_table_with_exam_configuration

Revision ID: 95b4e1c811c3
Revises: b316d2fd37cf
Create Date: 2026-02-15 08:39:42.334285

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '95b4e1c811c3'
down_revision: Union[str, None] = 'b316d2fd37cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to subjects table
    op.add_column('subjects', sa.Column('code', sa.String(length=50), nullable=True))
    op.add_column('subjects', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('subjects', sa.Column('exam_type', sa.String(length=10), nullable=True))
    op.add_column('subjects', sa.Column('tasks', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('subjects', sa.Column('primary_to_secondary_scale', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('subjects', sa.Column('scale_markers', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('subjects', sa.Column('grade_scale', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('subjects', sa.Column('topics', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Create unique constraint for code
    op.create_unique_constraint('uq_subjects_code', 'subjects', ['code'])


def downgrade() -> None:
    # Drop unique constraint for code
    op.drop_constraint('uq_subjects_code', 'subjects', type_='unique')

    # Drop new columns from subjects table
    op.drop_column('subjects', 'topics')
    op.drop_column('subjects', 'grade_scale')
    op.drop_column('subjects', 'scale_markers')
    op.drop_column('subjects', 'primary_to_secondary_scale')
    op.drop_column('subjects', 'tasks')
    op.drop_column('subjects', 'exam_type')
    op.drop_column('subjects', 'is_active')
    op.drop_column('subjects', 'code')
