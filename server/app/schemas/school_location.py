from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class SchoolLocationBase(BaseModel):
    name: str
    address: str | None = None
    phone: str | None = None
    description: str | None = None


class SchoolLocationCreate(SchoolLocationBase):
    pass


class SchoolLocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    description: str | None = None


class SchoolLocationResponse(SchoolLocationBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
