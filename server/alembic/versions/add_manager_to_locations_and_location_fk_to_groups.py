"""add_manager_to_locations_and_location_fk_to_groups

Revision ID: 4d5e6f7a8b9c
Revises: 3ca111d4944d
Create Date: 2026-02-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4d5e6f7a8b9c'
down_revision: Union[str, None] = '3ca111d4944d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add manager_id to school_locations table
    op.add_column('school_locations', sa.Column('manager_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_school_locations_manager_id', 'school_locations', 'employees', ['manager_id'], ['id'])

    # Add school_location_id to groups table
    op.add_column('groups', sa.Column('school_location_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_groups_school_location_id', 'groups', 'school_locations', ['school_location_id'], ['id'])

    # Drop old school_location column from groups
    op.drop_column('groups', 'school_location')


def downgrade() -> None:
    # Re-add old school_location column to groups
    op.add_column('groups', sa.Column('school_location', sa.String(length=200), nullable=True))

    # Drop new school_location_id column and its foreign key
    op.drop_constraint('fk_groups_school_location_id', 'groups', type_='foreignkey')
    op.drop_column('groups', 'school_location_id')

    # Drop manager_id column and its foreign key from school_locations
    op.drop_constraint('fk_school_locations_manager_id', 'school_locations', type_='foreignkey')
    op.drop_column('school_locations', 'manager_id')
