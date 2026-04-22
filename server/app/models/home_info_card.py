import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HomeInfoCard(Base):
    """Singleton row (only one row used) — content of the info card on the mobile home screen."""

    __tablename__ = "home_info_card"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    center_name: Mapped[str] = mapped_column(String(100), default="ГАРРИ", nullable=False)
    center_subtitle: Mapped[str] = mapped_column(String(200), default="образовательный центр", nullable=False)
    logo_emoji: Mapped[str] = mapped_column(String(20), default="🧙", nullable=False)
    logo_bg_color: Mapped[str] = mapped_column(String(20), default="#f59e0b", nullable=False)

    heading_line1: Mapped[str] = mapped_column(String(200), default="Подготовься к ОГЭ и ЕГЭ", nullable=False)
    heading_line2: Mapped[str | None] = mapped_column(String(100), default="на 80+")
    heading_accent_color: Mapped[str] = mapped_column(String(20), default="#fde047", nullable=False)
    subheading: Mapped[str | None] = mapped_column(String(300), default="В 2 раза выгоднее репетитора")

    gradient_from: Mapped[str] = mapped_column(String(20), default="#7c3aed", nullable=False)
    gradient_to: Mapped[str] = mapped_column(String(20), default="#6366f1", nullable=False)

    # [{value: "100", label: "баллы каждый год"}, ...]
    stats: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    # [{icon: "👓", text: "Преподаватели 100 баллов"}, ...]
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    # [{icon: "🏠", title: "Офлайн", subtitle: "до 10 человек", bg_color: "#..."}, ...]
    formats: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    trial_button_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trial_button_text: Mapped[str] = mapped_column(String(100), default="Записаться на пробный", nullable=False)
    tariffs_button_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tariffs_button_text: Mapped[str] = mapped_column(String(100), default="Тарифы", nullable=False)

    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
