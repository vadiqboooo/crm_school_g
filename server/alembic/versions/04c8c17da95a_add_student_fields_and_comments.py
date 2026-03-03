"""add_student_fields_and_comments

Revision ID: 04c8c17da95a
Revises: 6e9ac6ff6a33
Create Date: 2026-03-02 20:07:33.032966

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '04c8c17da95a'
down_revision: Union[str, None] = '6e9ac6ff6a33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create student source enum
    student_source_enum = sa.Enum('Сайт', 'Социальные сети', 'Рекомендация', 'Реклама', 'Другое', name='studentsource')
    student_source_enum.create(op.get_bind(), checkfirst=True)

    # Add new fields to students table
    op.add_column('students', sa.Column('telegram_username', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('bot_linked', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('students', sa.Column('contract_number', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('source', student_source_enum, nullable=True))

    # Create student_comments table
    op.create_table(
        'student_comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('author_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['author_id'], ['employees.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop student_comments table
    op.drop_table('student_comments')

    # Remove new fields from students table
    op.drop_column('students', 'source')
    op.drop_column('students', 'contract_number')
    op.drop_column('students', 'bot_linked')
    op.drop_column('students', 'telegram_username')

    # Drop student source enum
    sa.Enum(name='studentsource').drop(op.get_bind(), checkfirst=True)
