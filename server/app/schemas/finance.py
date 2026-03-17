from uuid import UUID
from datetime import date as date_type, datetime as datetime_type
from typing import Optional
from pydantic import BaseModel, model_validator

from app.models.finance import PaymentStatus, SalaryStatus


class SubscriptionPlanCreate(BaseModel):
    name: str
    lessons_count: int
    price_per_lesson: float


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    lessons_count: Optional[int] = None
    price_per_lesson: Optional[float] = None
    is_active: Optional[bool] = None


class SubscriptionPlanResponse(BaseModel):
    id: UUID
    name: str
    lessons_count: int
    price_per_lesson: float
    total_price: float = 0.0
    is_active: bool
    created_at: datetime_type

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_total(self) -> "SubscriptionPlanResponse":
        self.total_price = round(self.lessons_count * self.price_per_lesson, 2)
        return self


class PaymentCreate(BaseModel):
    student_id: UUID
    group_id: Optional[UUID] = None
    amount: float
    status: PaymentStatus = PaymentStatus.pending
    due_date: Optional[date_type] = None
    description: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[PaymentStatus] = None
    due_date: Optional[date_type] = None


class PaymentResponse(BaseModel):
    id: UUID
    student_id: UUID
    group_id: Optional[UUID] = None
    amount: float
    status: PaymentStatus
    due_date: Optional[date_type]
    created_at: datetime_type
    student_name: Optional[str] = None
    group_name: Optional[str] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class SalaryCreate(BaseModel):
    employee_id: UUID
    lessons_count: Optional[int] = None
    rate: Optional[float] = None
    total: Optional[float] = None
    status: SalaryStatus = SalaryStatus.pending
    period_start: Optional[date_type] = None
    period_end: Optional[date_type] = None


class SalaryUpdate(BaseModel):
    lessons_count: Optional[int] = None
    rate: Optional[float] = None
    total: Optional[float] = None
    status: Optional[SalaryStatus] = None


class SalaryResponse(BaseModel):
    id: UUID
    employee_id: UUID
    lesson_id: Optional[UUID] = None
    lessons_count: Optional[int]
    rate: Optional[float]
    total: Optional[float]
    students_count: Optional[int] = None
    status: SalaryStatus
    description: Optional[str] = None
    period_start: Optional[date_type]
    period_end: Optional[date_type]
    created_at: datetime_type
    employee_name: Optional[str] = None

    model_config = {"from_attributes": True}
