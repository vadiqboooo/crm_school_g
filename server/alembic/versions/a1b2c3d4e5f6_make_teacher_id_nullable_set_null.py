"""make_teacher_id_nullable_set_null

Revision ID: a1b2c3d4e5f6
Revises: 4d5e6f7a8b9c
Create Date: 2026-02-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '4d5e6f7a8b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing FK constraint on groups.teacher_id
    op.drop_constraint('groups_teacher_id_fkey', 'groups', type_='foreignkey')

    # Make teacher_id nullable
    op.alter_column('groups', 'teacher_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=True)

    # Re-create FK with ON DELETE SET NULL
    op.create_foreign_key(
        'groups_teacher_id_fkey',
        'groups', 'employees',
        ['teacher_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop FK with SET NULL
    op.drop_constraint('groups_teacher_id_fkey', 'groups', type_='foreignkey')

    # Make teacher_id NOT NULL again (requires no NULL values in DB)
    op.alter_column('groups', 'teacher_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=False)

    # Re-create original FK without ON DELETE SET NULL
    op.create_foreign_key(
        'groups_teacher_id_fkey',
        'groups', 'employees',
        ['teacher_id'], ['id']
    )
