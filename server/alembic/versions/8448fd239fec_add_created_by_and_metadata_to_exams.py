"""add_created_by_and_metadata_to_exams

Revision ID: 8448fd239fec
Revises: 95b4e1c811c3
Create Date: 2026-02-15 18:40:50.075161

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8448fd239fec'
down_revision: Union[str, None] = '95b4e1c811c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to exams table
    op.add_column('exams', sa.Column('difficulty', sa.String(length=100), nullable=True))
    op.add_column('exams', sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('exams', sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')))
    op.create_foreign_key('fk_exams_created_by', 'exams', 'employees', ['created_by'], ['id'])

    # Add new columns to exam_results table
    op.add_column('exam_results', sa.Column('added_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('exam_results', sa.Column('added_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')))
    op.add_column('exam_results', sa.Column('updated_at', sa.DateTime(), nullable=True))

    # Change final_score type from Integer to Float
    op.alter_column('exam_results', 'final_score',
                    existing_type=sa.Integer(),
                    type_=sa.Float(),
                    existing_nullable=True)

    # Update NULL scores to 0
    op.execute("UPDATE exam_results SET primary_score = 0 WHERE primary_score IS NULL")
    op.execute("UPDATE exam_results SET final_score = 0.0 WHERE final_score IS NULL")

    # Make scores NOT NULL
    op.alter_column('exam_results', 'primary_score',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('exam_results', 'final_score',
                    existing_type=sa.Float(),
                    nullable=False)

    op.create_foreign_key('fk_exam_results_added_by', 'exam_results', 'employees', ['added_by'], ['id'])


def downgrade() -> None:
    # Drop foreign keys
    op.drop_constraint('fk_exam_results_added_by', 'exam_results', type_='foreignkey')
    op.drop_constraint('fk_exams_created_by', 'exams', type_='foreignkey')

    # Revert exam_results columns
    op.alter_column('exam_results', 'primary_score',
                    existing_type=sa.Integer(),
                    nullable=True)
    op.alter_column('exam_results', 'final_score',
                    existing_type=sa.Float(),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    nullable=True)
    op.drop_column('exam_results', 'updated_at')
    op.drop_column('exam_results', 'added_at')
    op.drop_column('exam_results', 'added_by')

    # Drop exams columns
    op.drop_column('exams', 'created_at')
    op.drop_column('exams', 'created_by')
    op.drop_column('exams', 'difficulty')
