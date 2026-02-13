from uuid import UUID
from datetime import datetime as datetime_type
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models.employee import EmployeeRole


class EmployeeCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: EmployeeRole


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[EmployeeRole] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: EmployeeRole
    is_active: bool
    created_at: datetime_type

    model_config = {"from_attributes": True}
