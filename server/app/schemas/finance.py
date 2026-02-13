from uuid import UUID
from datetime import date as date_type, datetime as datetime_type
from typing import Optional
from pydantic import BaseModel

from app.models.finance import PaymentStatus, SalaryStatus


class PaymentCreate(BaseModel):
    student_id: UUID
    group_id: UUID
    amount: float
    status: PaymentStatus = PaymentStatus.pending
    due_date: Optional[date_type] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[PaymentStatus] = None
    due_date: Optional[date_type] = None


class PaymentResponse(BaseModel):
    id: UUID
    student_id: UUID
    group_id: UUID
    amount: float
    status: PaymentStatus
    due_date: Optional[date_type]
    created_at: datetime_type

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
    lessons_count: Optional[int]
    rate: Optional[float]
    total: Optional[float]
    status: SalaryStatus
    period_start: Optional[date_type]
    period_end: Optional[date_type]
    created_at: datetime_type

    model_config = {"from_attributes": True}
