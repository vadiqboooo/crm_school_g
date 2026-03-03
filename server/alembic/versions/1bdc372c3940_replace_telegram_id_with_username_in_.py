"""replace_telegram_id_with_username_in_parent_contacts

Revision ID: 1bdc372c3940
Revises: 04c8c17da95a
Create Date: 2026-03-02 21:03:26.874305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bdc372c3940'
down_revision: Union[str, None] = '04c8c17da95a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename telegram_id to telegram_username in parent_contacts table
    op.alter_column('parent_contacts', 'telegram_id',
                    new_column_name='telegram_username',
                    existing_type=sa.String(100),
                    existing_nullable=True)


def downgrade() -> None:
    # Rename telegram_username back to telegram_id
    op.alter_column('parent_contacts', 'telegram_username',
                    new_column_name='telegram_id',
                    existing_type=sa.String(100),
                    existing_nullable=True)
