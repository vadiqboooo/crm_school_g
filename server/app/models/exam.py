import uuid

from sqlalchemy import String, Integer, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(100))
    date: Mapped[str | None] = mapped_column(Date)
    threshold_score: Mapped[int | None] = mapped_column(Integer)
    selected_tasks: Mapped[dict | None] = mapped_column(JSONB)
    task_topics: Mapped[dict | None] = mapped_column(JSONB)
    comment: Mapped[str | None] = mapped_column(Text)

    group = relationship("Group", back_populates="exams")
    results = relationship("ExamResult", back_populates="exam", cascade="all, delete-orphan")


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    primary_score: Mapped[int | None] = mapped_column(Integer)
    final_score: Mapped[int | None] = mapped_column(Integer)
    answers: Mapped[dict | None] = mapped_column(JSONB)
    task_comments: Mapped[dict | None] = mapped_column(JSONB)
    student_comment: Mapped[str | None] = mapped_column(Text)

    exam = relationship("Exam", back_populates="results")
    student = relationship("Student", back_populates="exam_results")
