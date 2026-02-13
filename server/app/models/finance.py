import uuid
import enum
from datetime import datetime, date

from sqlalchemy import Numeric, Integer, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentStatus(str, enum.Enum):
    paid = "paid"
    pending = "pending"
    overdue = "overdue"


class SalaryStatus(str, enum.Enum):
    paid = "paid"
    pending = "pending"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.pending)
    due_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="payments")
    group = relationship("Group", back_populates="payments")


class EmployeeSalary(Base):
    __tablename__ = "employee_salaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    lessons_count: Mapped[int | None] = mapped_column(Integer)
    rate: Mapped[float | None] = mapped_column(Numeric(10, 2))
    total: Mapped[float | None] = mapped_column(Numeric(10, 2))
    status: Mapped[SalaryStatus] = mapped_column(SAEnum(SalaryStatus), default=SalaryStatus.pending)
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="salaries")
