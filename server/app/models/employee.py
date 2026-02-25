import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

import enum


class EmployeeRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    manager = "manager"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[EmployeeRole] = mapped_column(SAEnum(EmployeeRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    groups = relationship("Group", back_populates="teacher")
    salaries = relationship("EmployeeSalary", back_populates="employee")
    daily_reports = relationship("DailyReport", back_populates="employee")
    created_weekly_reports = relationship("WeeklyReport", back_populates="creator")
    managed_location = relationship("SchoolLocation", back_populates="manager", uselist=False)
