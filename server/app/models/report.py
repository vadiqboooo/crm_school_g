import uuid
import enum
from datetime import datetime, date, time

from sqlalchemy import String, Integer, Text, Numeric, Date, Time, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReportStatus(str, enum.Enum):
    draft = "draft"
    completed = "completed"


class TaskStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    urgent = "urgent"
    completed = "completed"


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    lead_calls: Mapped[int] = mapped_column(Integer, default=0)
    lead_social: Mapped[int] = mapped_column(Integer, default=0)
    lead_website: Mapped[int] = mapped_column(Integer, default=0)
    trial_scheduled: Mapped[int] = mapped_column(Integer, default=0)
    trial_attended: Mapped[int] = mapped_column(Integer, default=0)
    cancellations: Mapped[str | None] = mapped_column(Text)
    cash_income: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    cashless_income: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    water_balance: Mapped[int | None] = mapped_column(Integer)
    shopping_list: Mapped[str | None] = mapped_column(Text)
    day_comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(SAEnum(ReportStatus), default=ReportStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="daily_reports")
    churn_students = relationship("ReportChurnStudent", back_populates="report", cascade="all, delete-orphan")
    notified_students = relationship("ReportNotifiedStudent", back_populates="report", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="report")


class ReportChurnStudent(Base):
    __tablename__ = "report_churn_students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("daily_reports.id"), nullable=False)
    student_name: Mapped[str | None] = mapped_column(String(200))
    reason: Mapped[str | None] = mapped_column(Text)

    report = relationship("DailyReport", back_populates="churn_students")


class ReportNotifiedStudent(Base):
    __tablename__ = "report_notified_students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("daily_reports.id"), nullable=False)
    student_name: Mapped[str | None] = mapped_column(String(200))

    report = relationship("DailyReport", back_populates="notified_students")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("daily_reports.id"))
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.new)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    report = relationship("DailyReport", back_populates="tasks")
    assignee = relationship("Employee", foreign_keys=[assigned_to])


class WeeklyReport(Base):
    """Недельные репорты студентов для отправки родителям."""
    __tablename__ = "weekly_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    attendance_count: Mapped[int] = mapped_column(Integer, default=0)
    absent_count: Mapped[int] = mapped_column(Integer, default=0)
    late_count: Mapped[int] = mapped_column(Integer, default=0)
    homework_completed: Mapped[int] = mapped_column(Integer, default=0)
    homework_total: Mapped[int] = mapped_column(Integer, default=0)
    ai_report: Mapped[str] = mapped_column(Text, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_reaction: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="weekly_reports")
    creator = relationship("Employee", back_populates="created_weekly_reports")
