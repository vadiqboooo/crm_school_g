import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum, Table, Column
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# Many-to-many: lead ↔ trial groups
lead_trial_groups = Table(
    "lead_trial_groups",
    Base.metadata,
    Column("lead_id", UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
)

# Many-to-many: lead ↔ conducted groups
lead_conducted_groups = Table(
    "lead_conducted_groups",
    Base.metadata,
    Column("lead_id", UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
)


class LeadStatus(str, enum.Enum):
    not_sorted = "not_sorted"
    contact_established = "contact_established"
    trial_assigned = "trial_assigned"
    trial_conducted = "trial_conducted"
    archived = "archived"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name: Mapped[str | None] = mapped_column(String(200))
    student_name: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(20))
    telegram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    class_number: Mapped[int | None] = mapped_column(nullable=True)
    education_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_school: Mapped[str | None] = mapped_column(String(300), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[LeadStatus] = mapped_column(
        SAEnum(LeadStatus, values_callable=lambda x: [e.value for e in x]),
        default=LeadStatus.not_sorted,
        nullable=False,
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    school_location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("school_locations.id", ondelete="SET NULL"), nullable=True
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL"), nullable=True
    )
    trial_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    trial_conducted_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    comments = relationship(
        "LeadComment", back_populates="lead", cascade="all, delete-orphan",
        order_by="LeadComment.created_at"
    )
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])
    trial_group = relationship("Group", foreign_keys=[trial_group_id])
    trial_conducted_group = relationship("Group", foreign_keys=[trial_conducted_group_id])
    trial_groups = relationship("Group", secondary="lead_trial_groups", viewonly=False)
    conducted_groups = relationship("Group", secondary="lead_conducted_groups", viewonly=False)


class LeadComment(Base):
    __tablename__ = "lead_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    lead = relationship("Lead", back_populates="comments")
    author = relationship("Employee")
