from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal


class SettingsUpdate(BaseModel):
    school_name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    default_rate: Optional[Decimal] = None
    student_fee: Optional[Decimal] = None


class SettingsResponse(BaseModel):
    id: UUID
    school_name: Optional[str]
    description: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    default_rate: Optional[Decimal]
    student_fee: Optional[Decimal]

    model_config = {"from_attributes": True}
