from uuid import UUID
from datetime import datetime as datetime_type, date, time
from typing import Optional
from pydantic import BaseModel

from app.models.student import StudentStatus, ParentRelation, HistoryEventType, ContactType, ParentReaction
from app.models.lesson import AttendanceStatus


class ParentContactCreate(BaseModel):
    name: str
    relation: ParentRelation
    phone: str
    telegram_id: Optional[str] = None


class ParentContactResponse(BaseModel):
    id: UUID
    name: str
    relation: ParentRelation
    phone: str
    telegram_id: Optional[str]

    model_config = {"from_attributes": True}


class StudentHistoryResponse(BaseModel):
    id: UUID
    event_type: HistoryEventType
    description: Optional[str]
    created_at: datetime_type

    model_config = {"from_attributes": True}


class GroupInfoResponse(BaseModel):
    id: UUID
    name: str
    school_location: Optional[str] = None

    model_config = {"from_attributes": True}


class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    current_school: Optional[str] = None
    class_number: Optional[int] = None
    status: StudentStatus = StudentStatus.active
    parent_contacts: list[ParentContactCreate] = []


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    current_school: Optional[str] = None
    class_number: Optional[int] = None
    status: Optional[StudentStatus] = None
    parent_contacts: Optional[list[ParentContactCreate]] = None


class StudentResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone: Optional[str]
    telegram_id: Optional[str]
    current_school: Optional[str]
    class_number: Optional[int]
    status: StudentStatus
    created_at: datetime_type
    parent_contacts: list[ParentContactResponse] = []
    groups: list[GroupInfoResponse] = []
    history: list[StudentHistoryResponse] = []

    model_config = {"from_attributes": True}


class StudentPerformanceRecord(BaseModel):
    lesson_id: UUID
    lesson_date: date
    lesson_time: Optional[time]
    lesson_topic: Optional[str]
    lesson_homework: Optional[str]
    group_id: UUID
    group_name: str
    subject_name: str
    attendance: Optional[AttendanceStatus]
    late_minutes: Optional[int]
    lesson_grade: Optional[str]
    homework_grade: Optional[str]
    comment: Optional[str]


class StudentPerformanceResponse(BaseModel):
    student_id: UUID
    student_name: str
    performance_records: list[StudentPerformanceRecord]


class ParentFeedbackCreate(BaseModel):
    contact_type: ContactType
    feedback_to_parent: str
    feedback_from_parent: Optional[str] = None
    parent_reaction: Optional[ParentReaction] = None


class ParentFeedbackUpdate(BaseModel):
    contact_type: Optional[ContactType] = None
    feedback_to_parent: Optional[str] = None
    feedback_from_parent: Optional[str] = None
    parent_reaction: Optional[ParentReaction] = None


class EmployeeInfo(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class ParentFeedbackResponse(BaseModel):
    id: UUID
    student_id: UUID
    created_by: UUID
    created_by_first_name: Optional[str] = None
    created_by_last_name: Optional[str] = None
    contact_type: ContactType
    feedback_to_parent: str
    feedback_from_parent: Optional[str]
    parent_reaction: Optional[ParentReaction]
    created_at: datetime_type
    created_by_employee: Optional[EmployeeInfo] = None

    model_config = {"from_attributes": True}
