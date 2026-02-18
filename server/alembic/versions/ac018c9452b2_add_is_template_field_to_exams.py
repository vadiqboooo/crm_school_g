"""add_is_template_field_to_exams

Revision ID: ac018c9452b2
Revises: 8448fd239fec
Create Date: 2026-02-16 19:37:26.529754

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac018c9452b2'
down_revision: Union[str, None] = '8448fd239fec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_template column
    op.add_column('exams', sa.Column('is_template', sa.Boolean(), nullable=False, server_default='false'))

    # Make group_id nullable
    op.alter_column('exams', 'group_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    # Revert group_id to non-nullable (will fail if templates exist)
    op.alter_column('exams', 'group_id',
               existing_type=sa.UUID(),
               nullable=False)

    # Drop is_template column
    op.drop_column('exams', 'is_template')
