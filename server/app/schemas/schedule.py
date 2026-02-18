from uuid import UUID
from datetime import time as time_type
from pydantic import BaseModel


class ScheduleBase(BaseModel):
    day_of_week: str
    start_time: time_type
    duration_minutes: int = 90


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    day_of_week: str | None = None
    start_time: time_type | None = None
    duration_minutes: int | None = None


class ScheduleResponse(ScheduleBase):
    id: UUID
    group_id: UUID

    model_config = {"from_attributes": True}
