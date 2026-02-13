import uuid
import enum
from datetime import datetime, date, time

from sqlalchemy import String, Integer, Text, Date, Time, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LessonStatus(str, enum.Enum):
    conducted = "conducted"
    not_conducted = "not_conducted"


class WorkType(str, enum.Enum):
    none = "none"
    control = "control"
    test = "test"


class GradingSystem(str, enum.Enum):
    five_point = "5point"
    tasks = "tasks"


class HomeworkGrading(str, enum.Enum):
    five_point = "5point"
    tasks = "tasks"
    passfall = "passfall"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    trial = "trial"


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    time: Mapped[time | None] = mapped_column(Time)
    duration: Mapped[int | None] = mapped_column(Integer)
    topic: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[LessonStatus | None] = mapped_column(SAEnum(LessonStatus))
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False)
    work_type: Mapped[WorkType] = mapped_column(SAEnum(WorkType), default=WorkType.none)
    grading_system: Mapped[GradingSystem | None] = mapped_column(SAEnum(GradingSystem))
    tasks_count: Mapped[int | None] = mapped_column(Integer)
    homework: Mapped[str | None] = mapped_column(Text)
    homework_grading: Mapped[HomeworkGrading | None] = mapped_column(SAEnum(HomeworkGrading))
    homework_tasks_count: Mapped[int | None] = mapped_column(Integer)
    had_previous_homework: Mapped[bool] = mapped_column(Boolean, default=False)

    group = relationship("Group", back_populates="lessons")
    attendances = relationship("LessonAttendance", back_populates="lesson", cascade="all, delete-orphan")


class LessonAttendance(Base):
    __tablename__ = "lesson_attendance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    attendance: Mapped[AttendanceStatus | None] = mapped_column(SAEnum(AttendanceStatus))
    late_minutes: Mapped[int | None] = mapped_column(Integer)
    lesson_grade: Mapped[str | None] = mapped_column(String(10))
    homework_grade: Mapped[str | None] = mapped_column(String(10))
    comment: Mapped[str | None] = mapped_column(Text)

    lesson = relationship("Lesson", back_populates="attendances")
    student = relationship("Student", back_populates="lesson_attendances")
