import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StudentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class ParentRelation(str, enum.Enum):
    mom = "мама"
    dad = "папа"
    grandma = "бабушка"
    grandpa = "дедушка"
    aunt = "тетя"
    uncle = "дядя"


class HistoryEventType(str, enum.Enum):
    added_to_db = "added_to_db"
    added_to_group = "added_to_group"
    removed_from_group = "removed_from_group"
    payment = "payment"
    status_change = "status_change"


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    telegram_id: Mapped[str | None] = mapped_column(String(100))
    current_school: Mapped[str | None] = mapped_column(String(200))
    class_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[StudentStatus] = mapped_column(SAEnum(StudentStatus), default=StudentStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    groups = relationship("GroupStudent", back_populates="student")
    parent_contacts = relationship("ParentContact", back_populates="student", cascade="all, delete-orphan")
    history = relationship("StudentHistory", back_populates="student", cascade="all, delete-orphan")
    lesson_attendances = relationship("LessonAttendance", back_populates="student")
    exam_results = relationship("ExamResult", back_populates="student")
    payments = relationship("Payment", back_populates="student")
    weekly_reports = relationship("WeeklyReport", back_populates="student", cascade="all, delete-orphan")


class ParentContact(Base):
    __tablename__ = "parent_contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    relation: Mapped[ParentRelation] = mapped_column(SAEnum(ParentRelation), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    telegram_id: Mapped[str | None] = mapped_column(String(100))

    student = relationship("Student", back_populates="parent_contacts")


class StudentHistory(Base):
    __tablename__ = "student_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    event_type: Mapped[HistoryEventType] = mapped_column(SAEnum(HistoryEventType), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="history")
