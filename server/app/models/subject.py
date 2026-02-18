import uuid

from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(String(50))

    # Extended fields for exam configuration
    code: Mapped[str | None] = mapped_column(String(50), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    exam_type: Mapped[str | None] = mapped_column(String(10))  # "ЕГЭ" or "ОГЭ"

    # JSON fields for complex structures
    tasks: Mapped[dict | None] = mapped_column(JSON)  # [{"label": "1", "maxScore": 1}, ...]
    primary_to_secondary_scale: Mapped[list | None] = mapped_column(JSON)  # [0, 3, 5, 8, ...] for ЕГЭ
    scale_markers: Mapped[list | None] = mapped_column(JSON)  # [{"id": "...", "primaryScore": 10, ...}, ...]
    grade_scale: Mapped[list | None] = mapped_column(JSON)  # [{"grade": 3, "min": 11, "max": 15}, ...] for ОГЭ
    topics: Mapped[list | None] = mapped_column(JSON)  # [{"topic": "...", "taskNumbers": [1, 2]}, ...]

    groups = relationship("Group", back_populates="subject")
