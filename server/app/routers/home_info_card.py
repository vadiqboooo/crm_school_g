from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.home_info_card import HomeInfoCard
from app.models.employee import Employee, EmployeeRole
from app.schemas.home_info_card import HomeInfoCardResponse, HomeInfoCardUpdate
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/home-info", tags=["home-info"])


async def _get_or_create(db: AsyncSession) -> HomeInfoCard:
    result = await db.execute(select(HomeInfoCard).limit(1))
    card = result.scalar_one_or_none()
    if card is None:
        card = HomeInfoCard()
        db.add(card)
        await db.commit()
        await db.refresh(card)
    return card


@router.get("/", response_model=HomeInfoCardResponse)
async def get_info_card(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    return await _get_or_create(db)


@router.patch("/", response_model=HomeInfoCardResponse)
async def update_info_card(
    data: HomeInfoCardUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    card = await _get_or_create(db)
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        if field in ("stats", "tags", "formats") and value is not None:
            value = [v.model_dump() if hasattr(v, "model_dump") else v for v in value]
        setattr(card, field, value)
    await db.commit()
    await db.refresh(card)
    return card
