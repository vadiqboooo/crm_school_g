"""add_subscription_plans_and_balance

Revision ID: k7f8a9b0c1d2
Revises: j6e7f8a9b0c1
Create Date: 2026-03-16 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "k7f8a9b0c1d2"
down_revision: Union[str, None] = "j6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create subscription_plans table
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("lessons_count", sa.Integer, nullable=False),
        sa.Column("price_per_lesson", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # 2. Add balance column to students
    op.add_column(
        "students",
        sa.Column("balance", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )

    # 3. Add subscription_plan_id FK to students
    op.add_column(
        "students",
        sa.Column(
            "subscription_plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subscription_plans.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # 4. Extend historyeventtype enum with new values
    op.execute("ALTER TYPE historyeventtype ADD VALUE IF NOT EXISTS 'balance_replenishment'")
    op.execute("ALTER TYPE historyeventtype ADD VALUE IF NOT EXISTS 'lesson_deduction'")


def downgrade() -> None:
    op.drop_column("students", "subscription_plan_id")
    op.drop_column("students", "balance")
    op.drop_table("subscription_plans")
    # Note: PostgreSQL enums cannot remove values, so we skip downgrade of enum values
