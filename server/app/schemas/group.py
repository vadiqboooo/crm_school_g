from uuid import UUID
from datetime import datetime as datetime_type, time as time_type
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
    school_location: Optional[str] = None
    description: Optional[str] = None
    comment: Optional[str] = None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    subject_id: UUID
    teacher_id: UUID
    level: Optional[str]
    schedule_day: Optional[str]
    schedule_time: Optional[time_type]
    schedule_duration: Optional[int]
    school_location: Optional[str]
    description: Optional[str]
    comment: Optional[str]
    created_at: datetime_type

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
