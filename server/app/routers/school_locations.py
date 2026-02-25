from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.school_location import SchoolLocation
from app.models.employee import Employee
from app.schemas.school_location import SchoolLocationCreate, SchoolLocationUpdate, SchoolLocationResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/school-locations", tags=["school-locations"])


@router.get("/", response_model=list[SchoolLocationResponse])
async def list_school_locations(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(SchoolLocation)
        .options(selectinload(SchoolLocation.manager))
        .order_by(SchoolLocation.name)
    )
    return result.scalars().all()


@router.post("/", response_model=SchoolLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_school_location(
    data: SchoolLocationCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    location = SchoolLocation(**data.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location, attribute_names=["manager"])
    return location


@router.get("/{location_id}", response_model=SchoolLocationResponse)
async def get_school_location(
    location_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(SchoolLocation)
        .options(selectinload(SchoolLocation.manager))
        .where(SchoolLocation.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="School location not found")
    return location


@router.patch("/{location_id}", response_model=SchoolLocationResponse)
async def update_school_location(
    location_id: UUID,
    data: SchoolLocationUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(SchoolLocation)
        .options(selectinload(SchoolLocation.manager))
        .where(SchoolLocation.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="School location not found")

    # Use exclude_none=False to include explicitly set None values
    update_data = data.model_dump(exclude_unset=True, exclude_none=False)
    for field, value in update_data.items():
        setattr(location, field, value)

    await db.commit()
    await db.refresh(location, attribute_names=["manager"])
    return location


@router.delete("/{location_id}")
async def delete_school_location(
    location_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(SchoolLocation).where(SchoolLocation.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="School location not found")

    await db.delete(location)
    await db.commit()
    return {"detail": "Deleted"}
