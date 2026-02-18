from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schedule import Schedule
from app.models.group import Group
from app.models.employee import Employee
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/groups/{group_id}/schedules", tags=["schedules"])


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Get all schedules for a group"""
    result = await db.execute(
        select(Schedule)
        .where(Schedule.group_id == group_id)
        .order_by(Schedule.day_of_week, Schedule.start_time)
    )
    return result.scalars().all()


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    group_id: UUID,
    data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Add a schedule to a group"""
    # Check if group exists
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    schedule = Schedule(group_id=group_id, **data.model_dump())
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    group_id: UUID,
    schedule_id: UUID,
    data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Update a schedule"""
    result = await db.execute(
        select(Schedule).where(
            Schedule.id == schedule_id,
            Schedule.group_id == group_id
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)

    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    group_id: UUID,
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Delete a schedule"""
    result = await db.execute(
        select(Schedule).where(
            Schedule.id == schedule_id,
            Schedule.group_id == group_id
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await db.delete(schedule)
    await db.commit()
    return None
