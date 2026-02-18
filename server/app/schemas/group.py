from uuid import UUID
from datetime import datetime as datetime_type, time as time_type, date as date_type
from typing import Optional
from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str
    subject_id: UUID
    teacher_id: UUID
    level: Optional[str] = None
    schedule_day: Optional[str] = None
    schedule_time: Optional[time_type] = None
    schedule_duration: Optional[int] = None
    start_date: Optional[date_type] = None
    school_location: Optional[str] = None
    description: Optional[str] = None
    comment: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    subject_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None
    level: Optional[str] = None
    schedule_day: Optional[str] = None
    schedule_time: Optional[time_type] = None
    schedule_duration: Optional[int] = None
    start_date: Optional[date_type] = None
    school_location: Optional[str] = None
    description: Optional[str] = None
    comment: Optional[str] = None


# Nested schemas for relationships
class SubjectInGroup(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class TeacherInGroup(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class StudentInGroup(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class ScheduleInGroup(BaseModel):
    id: UUID
    day_of_week: str
    start_time: time_type
    duration_minutes: int

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: UUID
    name: str
    subject: SubjectInGroup
    teacher: TeacherInGroup
    level: Optional[str]
    schedule_day: Optional[str]  # Deprecated, kept for backwards compatibility
    schedule_time: Optional[time_type]  # Deprecated
    schedule_duration: Optional[int]  # Deprecated
    schedules: list[ScheduleInGroup] = []  # New field
    start_date: Optional[date_type]
    school_location: Optional[str]
    description: Optional[str]
    comment: Optional[str]
    created_at: datetime_type
    students: list[StudentInGroup] = []

    model_config = {"from_attributes": True}


class GroupStudentAdd(BaseModel):
    student_id: UUID


class GroupStudentResponse(BaseModel):
    id: UUID
    group_id: UUID
    student_id: UUID
    is_archived: bool
    joined_at: datetime_type

    model_config = {"from_attributes": True}
