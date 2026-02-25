from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ManagerInfo(BaseModel):
    """Basic manager information for SchoolLocation response"""
    id: UUID
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}


class SchoolLocationBase(BaseModel):
    name: str
    address: str | None = None
    phone: str | None = None
    description: str | None = None


class SchoolLocationCreate(SchoolLocationBase):
    manager_id: UUID | None = None


class SchoolLocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    description: str | None = None
    manager_id: UUID | None = None


class SchoolLocationResponse(SchoolLocationBase):
    id: UUID
    manager_id: UUID | None
    manager: Optional[ManagerInfo] = None
    created_at: datetime

    model_config = {"from_attributes": True}
