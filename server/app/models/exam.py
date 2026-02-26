import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, Date, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(100))  # Keep for backward compatibility
    subject_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    date: Mapped[str | None] = mapped_column(Date)
    difficulty: Mapped[str | None] = mapped_column(String(100))
    threshold_score: Mapped[int | None] = mapped_column(Integer)
    selected_tasks: Mapped[dict | None] = mapped_column(JSONB)
    task_topics: Mapped[dict | None] = mapped_column(JSONB)
    comment: Mapped[str | None] = mapped_column(Text)

    # Template flag
    is_template: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Metadata
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
    created_by_first_name: Mapped[str | None] = mapped_column(String(100))
    created_by_last_name: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    group = relationship("Group", back_populates="exams")
    subject_rel = relationship("Subject")
    created_by_employee = relationship("Employee", foreign_keys=[created_by])
    results = relationship("ExamResult", back_populates="exam", cascade="all, delete-orphan")


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    primary_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    final_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    answers: Mapped[dict | None] = mapped_column(JSONB)
    task_comments: Mapped[dict | None] = mapped_column(JSONB)
    student_comment: Mapped[str | None] = mapped_column(Text)

    # Metadata
    added_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
    added_by_first_name: Mapped[str | None] = mapped_column(String(100))
    added_by_last_name: Mapped[str | None] = mapped_column(String(100))
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=datetime.utcnow)

    exam = relationship("Exam", back_populates="results")
    student = relationship("Student", back_populates="exam_results")
    added_by_employee = relationship("Employee", foreign_keys=[added_by])
