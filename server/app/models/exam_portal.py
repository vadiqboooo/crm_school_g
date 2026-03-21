import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, Date, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExamPortalSession(Base):
    """Настройка экзамена для записи через портал ученика."""
    __tablename__ = "exam_portal_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    # Если None — сессия доступна для всех локаций
    school_location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("school_locations.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    exam = relationship("Exam", backref="portal_sessions")
    school_location = relationship("SchoolLocation", backref="exam_portal_sessions")
    time_slots = relationship("ExamTimeSlot", back_populates="session", cascade="all, delete-orphan", order_by="ExamTimeSlot.date, ExamTimeSlot.start_time")


class ExamTimeSlot(Base):
    """Конкретная дата + время + кол-во мест для сессии экзамена."""
    __tablename__ = "exam_time_slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exam_portal_sessions.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[str] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # "09:00"
    total_seats: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    session = relationship("ExamPortalSession", back_populates="time_slots")
    registrations = relationship("ExamRegistration", back_populates="time_slot", cascade="all, delete-orphan")

    @property
    def registered_count(self) -> int:
        return len(self.registrations)

    @property
    def available_seats(self) -> int:
        return max(0, self.total_seats - len(self.registrations))


class ExamRegistration(Base):
    """Запись ученика на экзамен."""
    __tablename__ = "exam_registrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    time_slot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exam_time_slots.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    registered_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    # Отметка присутствия и результата (заполняется после экзамена)
    attendance: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "present" | "absent"
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # True = сдал, False = не сдал

    student = relationship("Student", backref="exam_registrations")
    time_slot = relationship("ExamTimeSlot", back_populates="registrations")
    subject = relationship("Subject")
