"""add_new_education_types

Revision ID: a1e2f3b4c5d6
Revises: 2c392e47e49d
Create Date: 2026-03-03 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1e2f3b4c5d6'
down_revision: Union[str, None] = '2c392e47e49d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE educationtype ADD VALUE IF NOT EXISTS 'Гимназия'")
    op.execute("ALTER TYPE educationtype ADD VALUE IF NOT EXISTS 'Лицей'")
    op.execute("ALTER TYPE educationtype ADD VALUE IF NOT EXISTS 'СПО'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type
    pass
