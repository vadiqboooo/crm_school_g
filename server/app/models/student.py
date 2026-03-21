import uuid
import enum
from datetime import datetime, timezone, date

from sqlalchemy import String, Text, ForeignKey, Integer, Boolean, Numeric, Date, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
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
    parent_feedback_added = "parent_feedback_added"
    parent_feedback_deleted = "parent_feedback_deleted"
    student_info_updated = "student_info_updated"
    balance_replenishment = "balance_replenishment"
    lesson_deduction = "lesson_deduction"


class ContactType(str, enum.Enum):
    call = "call"
    telegram = "telegram"
    in_person = "in_person"


class ParentReaction(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class StudentSource(str, enum.Enum):
    website = "Сайт"
    social_media = "Социальные сети"
    recommendation = "Рекомендация"
    advertising = "Реклама"
    other = "Другое"


class EducationType(str, enum.Enum):
    school = "Школа"
    gymnasium = "Гимназия"
    lyceum = "Лицей"
    college = "Колледж"
    spo = "СПО"
    university = "Университет"
    other = "Другое"


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    telegram_id: Mapped[str | None] = mapped_column(String(100))
    telegram_username: Mapped[str | None] = mapped_column(String(100))
    bot_linked: Mapped[bool] = mapped_column(Boolean, default=False)
    contract_number: Mapped[str | None] = mapped_column(String(100))
    source: Mapped[StudentSource | None] = mapped_column(SAEnum(StudentSource, values_callable=lambda x: [e.value for e in x]))
    education_type: Mapped[EducationType | None] = mapped_column(SAEnum(EducationType, values_callable=lambda x: [e.value for e in x]))
    current_school: Mapped[str | None] = mapped_column(String(200))
    class_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[StudentStatus] = mapped_column(SAEnum(StudentStatus, values_callable=lambda x: [e.value for e in x]), default=StudentStatus.active)
    balance: Mapped[float] = mapped_column(Numeric(10, 2), default=0, server_default="0", nullable=False)
    subscription_plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    discount_type: Mapped[str | None] = mapped_column(String(10), nullable=True)   # "fixed" | "percent"
    discount_value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    discount_valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    discount_valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    portal_login: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    portal_password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    portal_password_plain: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    chat_display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    groups = relationship("GroupStudent", back_populates="student")
    subscription_plan = relationship("SubscriptionPlan")
    parent_contacts = relationship("ParentContact", back_populates="student", cascade="all, delete-orphan")
    history = relationship("StudentHistory", back_populates="student", cascade="all, delete-orphan")
    lesson_attendances = relationship("LessonAttendance", back_populates="student")
    exam_results = relationship("ExamResult", back_populates="student")
    payments = relationship("Payment", back_populates="student")
    weekly_reports = relationship("WeeklyReport", back_populates="student", cascade="all, delete-orphan")
    parent_feedbacks = relationship("ParentFeedback", back_populates="student", cascade="all, delete-orphan")
    comments = relationship("StudentComment", back_populates="student", cascade="all, delete-orphan")


class ParentContact(Base):
    __tablename__ = "parent_contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    relation: Mapped[ParentRelation] = mapped_column(SAEnum(ParentRelation), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    telegram_username: Mapped[str | None] = mapped_column(String(100))

    student = relationship("Student", back_populates="parent_contacts")


class StudentHistory(Base):
    __tablename__ = "student_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    event_type: Mapped[HistoryEventType] = mapped_column(SAEnum(HistoryEventType), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="history")


class ParentFeedback(Base):
    __tablename__ = "parent_feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    created_by_first_name: Mapped[str | None] = mapped_column(String(100))
    created_by_last_name: Mapped[str | None] = mapped_column(String(100))
    contact_type: Mapped[ContactType] = mapped_column(SAEnum(ContactType), nullable=False)
    feedback_to_parent: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_from_parent: Mapped[str | None] = mapped_column(Text)
    parent_reaction: Mapped[ParentReaction | None] = mapped_column(SAEnum(ParentReaction))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="parent_feedbacks")
    created_by_employee = relationship("Employee", foreign_keys=[created_by])


class StudentComment(Base):
    __tablename__ = "student_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="comments")
    author = relationship("Employee")
