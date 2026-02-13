from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class SubjectCreate(BaseModel):
    name: str
    color: Optional[str] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class SubjectResponse(BaseModel):
    id: UUID
    name: str
    color: Optional[str]

    model_config = {"from_attributes": True}
