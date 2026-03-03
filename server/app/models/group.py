import uuid
from datetime import datetime, time, date, timezone

from sqlalchemy import String, Integer, Text, Time, Date, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    level: Mapped[str | None] = mapped_column(String(50))
    schedule_day: Mapped[str | None] = mapped_column(String(20))
    schedule_time: Mapped[time | None] = mapped_column(Time)
    schedule_duration: Mapped[int | None] = mapped_column(Integer)
    start_date: Mapped[date | None] = mapped_column(Date)
    school_location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("school_locations.id"))
    description: Mapped[str | None] = mapped_column(Text)
    comment: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    subject = relationship("Subject", back_populates="groups")
    teacher = relationship("Employee", back_populates="groups")
    location = relationship("SchoolLocation", back_populates="groups")
    group_students = relationship("GroupStudent", back_populates="group", cascade="all, delete-orphan")
    students = relationship("Student", secondary="group_students", viewonly=True)
    schedules = relationship("Schedule", back_populates="group", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="group", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="group", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="group", cascade="all, delete-orphan")


class GroupStudent(Base):
    __tablename__ = "group_students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="group_students")
    student = relationship("Student", back_populates="groups")
