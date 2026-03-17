"""payment_group_nullable_and_description

Revision ID: p1a2y3m4e5n6
Revises: t1e2a3c4h5e6
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa

revision = "p1a2y3m4e5n6"
down_revision = "t1e2a3c4h5e6"
branch_labels = None
depends_on = None


def upgrade():
    # Make group_id nullable in payments (student balance top-ups have no group)
    op.alter_column("payments", "group_id", nullable=True)
    # Add description column to payments
    op.add_column("payments", sa.Column("description", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("payments", "description")
    op.alter_column("payments", "group_id", nullable=False)
