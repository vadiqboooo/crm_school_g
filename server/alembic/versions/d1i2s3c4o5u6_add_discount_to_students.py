"""add discount fields to students

Revision ID: d1i2s3c4o5u6
Revises: s1u2b3p4r5i6
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'd1i2s3c4o5u6'
down_revision = 's1u2b3p4r5i6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('students', sa.Column('discount_type', sa.String(10), nullable=True))   # "fixed" | "percent"
    op.add_column('students', sa.Column('discount_value', sa.Numeric(10, 2), nullable=True))
    op.add_column('students', sa.Column('discount_valid_from', sa.Date(), nullable=True))
    op.add_column('students', sa.Column('discount_valid_until', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('students', 'discount_valid_until')
    op.drop_column('students', 'discount_valid_from')
    op.drop_column('students', 'discount_value')
    op.drop_column('students', 'discount_type')
