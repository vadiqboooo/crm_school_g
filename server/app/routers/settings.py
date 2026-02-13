from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.settings import Settings
from app.models.employee import Employee, EmployeeRole
from app.schemas.settings import SettingsUpdate, SettingsResponse
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=SettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Get school settings. Creates default if not exists."""
    result = await db.execute(select(Settings))
    settings = result.scalar_one_or_none()

    if not settings:
        # Create default settings if none exist
        settings = Settings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


@router.put("/", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role(EmployeeRole.admin)),
):
    """Update school settings. Only admins can update."""
    result = await db.execute(select(Settings))
    settings = result.scalar_one_or_none()

    if not settings:
        # Create if doesn't exist
        settings = Settings(**data.model_dump(exclude_unset=True))
        db.add(settings)
    else:
        # Update existing
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)
    return settings
