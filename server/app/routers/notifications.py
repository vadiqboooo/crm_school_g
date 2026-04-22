from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.notification import Notification
from app.models.employee import Employee, EmployeeRole
from app.auth.dependencies import require_role


router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationCreate(BaseModel):
    title: str
    body: str
    icon: str | None = None
    color: str | None = None
    action_url: str | None = None
    is_published: bool = True


class NotificationUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    icon: str | None = None
    color: str | None = None
    action_url: str | None = None
    is_published: bool | None = None


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    icon: str | None
    color: str | None
    action_url: str | None
    is_published: bool
    created_at: str


def _serialize(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=str(n.id),
        title=n.title,
        body=n.body,
        icon=n.icon,
        color=n.color,
        action_url=n.action_url,
        is_published=n.is_published,
        created_at=n.created_at.isoformat(),
    )


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin, EmployeeRole.manager)),
):
    result = await db.execute(select(Notification).order_by(Notification.created_at.desc()))
    return [_serialize(n) for n in result.scalars().all()]


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    n = Notification(**data.model_dump())
    db.add(n)
    await db.commit()
    await db.refresh(n)
    return _serialize(n)


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: UUID,
    data: NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(n, field, value)

    await db.commit()
    await db.refresh(n)
    return _serialize(n)


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")

    await db.delete(n)
    await db.commit()
    return {"detail": "Deleted"}
