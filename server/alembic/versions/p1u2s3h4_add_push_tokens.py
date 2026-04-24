"""add push_tokens table

Revision ID: p1u2s3h4
Revises: a1v2a3t4a5r6
Create Date: 2026-04-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "p1u2s3h4"
down_revision = "a1v2a3t4a5r6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "push_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_type", sa.String(16), nullable=False),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("platform", sa.String(16), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_push_tokens_token"),
    )
    op.create_index("ix_push_tokens_owner_id", "push_tokens", ["owner_id"])


def downgrade():
    op.drop_index("ix_push_tokens_owner_id", table_name="push_tokens")
    op.drop_table("push_tokens")
