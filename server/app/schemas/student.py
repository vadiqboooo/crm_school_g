from uuid import UUID
from datetime import datetime as datetime_type
from typing import Optional
from pydantic import BaseModel

from app.models.student import StudentStatus, ParentRelation, HistoryEventType


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
