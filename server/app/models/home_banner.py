import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HomeBanner(Base):
    __tablename__ = "home_banners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text)
    badge_text: Mapped[str | None] = mapped_column(String(100))
    badge_color: Mapped[str | None] = mapped_column(String(20))
    price_text: Mapped[str | None] = mapped_column(String(100))
    footer_tags: Mapped[str | None] = mapped_column(String(300))
    icon: Mapped[str | None] = mapped_column(String(20))
    gradient_from: Mapped[str] = mapped_column(String(20), default="#4f46e5", nullable=False)
    gradient_to: Mapped[str] = mapped_column(String(20), default="#7c3aed", nullable=False)
    background_image_url: Mapped[str | None] = mapped_column(Text)
    action_url: Mapped[str | None] = mapped_column(Text)
    signup_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    signup_button_text: Mapped[str | None] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    form_fields = relationship(
        "HomeBannerFormField",
        back_populates="banner",
        cascade="all, delete-orphan",
        order_by="HomeBannerFormField.sort_order",
    )
    signups = relationship("HomeBannerSignup", back_populates="banner", cascade="all, delete-orphan")


class HomeBannerFormField(Base):
    __tablename__ = "home_banner_form_fields"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    banner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("home_banners.id", ondelete="CASCADE"), nullable=False
    )
    # text | phone | email | textarea | select | number
    field_type: Mapped[str] = mapped_column(String(20), nullable=False)
    key: Mapped[str] = mapped_column(String(60), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    placeholder: Mapped[str | None] = mapped_column(String(200))
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    options: Mapped[list | None] = mapped_column(JSON)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    banner = relationship("HomeBanner", back_populates="form_fields")


class HomeBannerSignup(Base):
    __tablename__ = "home_banner_signups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    banner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("home_banners.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL")
    )
    student_name: Mapped[str | None] = mapped_column(String(300))
    student_phone: Mapped[str | None] = mapped_column(String(50))
    student_email: Mapped[str | None] = mapped_column(String(200))
    form_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="new", nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    banner = relationship("HomeBanner", back_populates="signups")
