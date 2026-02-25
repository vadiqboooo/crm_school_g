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
    end_time: Optional[time_type] = None
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


class EmployeeInfo(BaseModel):
    """Basic employee info for report response"""
    id: UUID
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}


class AssigneeInfo(BaseModel):
    """Basic employee info for task assignee"""
    id: UUID
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    report_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    status: TaskStatus = TaskStatus.new
    assigned_to: Optional[UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[UUID] = None


class TaskResponse(BaseModel):
    id: UUID
    report_id: Optional[UUID]
    title: str
    description: Optional[str]
    deadline: Optional[str]
    status: TaskStatus
    assigned_to: Optional[UUID]
    assignee: Optional[AssigneeInfo] = None
    created_at: datetime_type

    model_config = {"from_attributes": True}


class DailyReportResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee: Optional[EmployeeInfo] = None
    date: date_type
    start_time: Optional[time_type]
    end_time: Optional[time_type]
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
    tasks: list[TaskResponse] = []

    model_config = {"from_attributes": True}


class WeeklyReportUpdate(BaseModel):
    """Схема для обновления недельного репорта."""
    ai_report: str


class WeeklyReportResponse(BaseModel):
    """Схема для ответа с недельным репортом студента."""
    id: UUID
    student_id: UUID
    created_by: UUID
    period_start: date_type
    period_end: date_type
    attendance_count: int
    absent_count: int
    late_count: int
    homework_completed: int
    homework_total: int
    ai_report: str
    is_approved: bool
    created_at: datetime_type

    model_config = {"from_attributes": True}
