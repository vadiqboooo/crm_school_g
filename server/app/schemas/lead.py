from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.lead import LeadStatus


class LeadCommentAuthor(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class LeadCommentResponse(BaseModel):
    id: UUID
    lead_id: UUID
    author_id: UUID
    author: LeadCommentAuthor
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LeadCommentCreate(BaseModel):
    content: str


class AssignedToInfo(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class TrialGroupInfo(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


class LeadCreate(BaseModel):
    contact_name: Optional[str] = None
    student_name: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    class_number: Optional[int] = None
    education_type: Optional[str] = None
    current_school: Optional[str] = None
    source: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    school_location_id: Optional[UUID] = None


class LeadUpdate(BaseModel):
    contact_name: Optional[str] = None
    student_name: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    class_number: Optional[int] = None
    education_type: Optional[str] = None
    current_school: Optional[str] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    assigned_to_id: Optional[UUID] = None
    school_location_id: Optional[UUID] = None


class LeadAssignTrial(BaseModel):
    group_id: UUID


class LeadConvertToStudent(BaseModel):
    group_id: Optional[UUID] = None


class LeadResponse(BaseModel):
    id: UUID
    contact_name: Optional[str]
    student_name: Optional[str]
    phone: Optional[str]
    telegram: Optional[str]
    class_number: Optional[int]
    education_type: Optional[str]
    current_school: Optional[str]
    source: Optional[str]
    status: LeadStatus
    assigned_to_id: Optional[UUID]
    assigned_to: Optional[AssignedToInfo]
    school_location_id: Optional[UUID]
    student_id: Optional[UUID]
    trial_group_id: Optional[UUID]
    trial_group: Optional[TrialGroupInfo]
    trial_groups: list[TrialGroupInfo] = []
    trial_conducted_group_id: Optional[UUID]
    trial_conducted_group: Optional[TrialGroupInfo]
    conducted_groups: list[TrialGroupInfo] = []
    created_at: datetime
    comments: list[LeadCommentResponse] = []

    model_config = {"from_attributes": True}
