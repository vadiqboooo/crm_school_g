"""remove_unique_constraint_from_subject_name

Revision ID: cb46d96041c7
Revises: a9d5ab182b1b
Create Date: 2026-02-18 09:27:04.907585

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb46d96041c7'
down_revision: Union[str, None] = 'a9d5ab182b1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove unique constraint from subjects.name
    op.drop_constraint('subjects_name_key', 'subjects', type_='unique')


def downgrade() -> None:
    # Add back unique constraint to subjects.name
    op.create_unique_constraint('subjects_name_key', 'subjects', ['name'])
