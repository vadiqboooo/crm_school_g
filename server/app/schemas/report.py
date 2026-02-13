from uuid import UUID
from datetime import date as date_type, time as time_type, datetime as datetime_type
from typing import Optional
from pydantic import BaseModel

from app.models.report import ReportStatus, TaskStatus


class ChurnStudentCreate(BaseModel):
    student_name: Optional[str] = None
    reason: Optional[str] = None


class ChurnStudentResponse(BaseModel):
    id: UUID
    student_name: Optional[str]
    reason: Optional[str]

    model_config = {"from_attributes": True}


class NotifiedStudentCreate(BaseModel):
    student_name: Optional[str] = None


class NotifiedStudentResponse(BaseModel):
    id: UUID
    student_name: Optional[str]

    model_config = {"from_attributes": True}


class DailyReportCreate(BaseModel):
    date: date_type
    start_time: Optional[time_type] = None
    lead_calls: int = 0
    lead_social: int = 0
    lead_website: int = 0
    trial_scheduled: int = 0
    trial_attended: int = 0
    cancellations: Optional[str] = None
    cash_income: float = 0
    cashless_income: float = 0
    water_balance: Optional[int] = None
    shopping_list: Optional[str] = None
    day_comment: Optional[str] = None
    status: ReportStatus = ReportStatus.draft
    churn_students: list[ChurnStudentCreate] = []
    notified_students: list[NotifiedStudentCreate] = []


class DailyReportUpdate(BaseModel):
    start_time: Optional[time_type] = None
    lead_calls: Optional[int] = None
    lead_social: Optional[int] = None
    lead_website: Optional[int] = None
    trial_scheduled: Optional[int] = None
    trial_attended: Optional[int] = None
    cancellations: Optional[str] = None
    cash_income: Optional[float] = None
    cashless_income: Optional[float] = None
    water_balance: Optional[int] = None
    shopping_list: Optional[str] = None
    day_comment: Optional[str] = None
    status: Optional[ReportStatus] = None


class DailyReportResponse(BaseModel):
    id: UUID
    employee_id: UUID
    date: date_type
    start_time: Optional[time_type]
    lead_calls: int
    lead_social: int
    lead_website: int
    trial_scheduled: int
    trial_attended: int
    cancellations: Optional[str]
    cash_income: float
    cashless_income: float
    water_balance: Optional[int]
    shopping_list: Optional[str]
    day_comment: Optional[str]
    status: ReportStatus
    created_at: datetime_type
    churn_students: list[ChurnStudentResponse] = []
    notified_students: list[NotifiedStudentResponse] = []

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    report_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    status: TaskStatus = TaskStatus.new


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[TaskStatus] = None


class TaskResponse(BaseModel):
    id: UUID
    report_id: Optional[UUID]
    title: str
    description: Optional[str]
    deadline: Optional[str]
    status: TaskStatus
    created_at: datetime_type

    model_config = {"from_attributes": True}
