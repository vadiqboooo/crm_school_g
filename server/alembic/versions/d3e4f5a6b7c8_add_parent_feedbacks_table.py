"""add_parent_feedbacks_table

Revision ID: d3e4f5a6b7c8
Revises: 09fb4150a45b, b2c3d4e5f6a7
Create Date: 2026-02-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = ('09fb4150a45b', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ContactType enum
    contact_type = postgresql.ENUM('звонок', 'телеграм', 'лично', name='contacttype')
    contact_type.create(op.get_bind(), checkfirst=True)

    # Create parent_feedbacks table
    op.create_table(
        'parent_feedbacks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contact_type', sa.Enum('звонок', 'телеграм', 'лично', name='contacttype'), nullable=False),
        sa.Column('feedback_to_parent', sa.Text(), nullable=False),
        sa.Column('feedback_from_parent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['employees.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('parent_feedbacks')

    # Drop ContactType enum
    contact_type = postgresql.ENUM('звонок', 'телеграм', 'лично', name='contacttype')
    contact_type.drop(op.get_bind(), checkfirst=True)
