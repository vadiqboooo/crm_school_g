"""add_education_type_to_students

Revision ID: b39c425eca2e
Revises: 1bdc372c3940
Create Date: 2026-03-03 10:04:45.594770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b39c425eca2e'
down_revision: Union[str, None] = '1bdc372c3940'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type
    education_type_enum = sa.Enum('Школа', 'Колледж', 'Университет', 'Другое', name='educationtype')
    education_type_enum.create(op.get_bind(), checkfirst=True)

    # Add the column
    op.add_column('students', sa.Column('education_type', education_type_enum, nullable=True))


def downgrade() -> None:
    # Remove the column
    op.drop_column('students', 'education_type')

    # Drop the enum type
    education_type_enum = sa.Enum('Школа', 'Колледж', 'Университет', 'Другое', name='educationtype')
    education_type_enum.drop(op.get_bind(), checkfirst=True)
