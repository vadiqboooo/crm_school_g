"""add_subject_id_to_exams

Revision ID: a9d5ab182b1b
Revises: 37c41d06ab1f
Create Date: 2026-02-18 08:58:31.400462

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9d5ab182b1b'
down_revision: Union[str, None] = '37c41d06ab1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add subject_id column to exams table
    op.add_column('exams', sa.Column('subject_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_exams_subject_id', 'exams', 'subjects', ['subject_id'], ['id'])


def downgrade() -> None:
    # Remove subject_id column
    op.drop_constraint('fk_exams_subject_id', 'exams', type_='foreignkey')
    op.drop_column('exams', 'subject_id')
