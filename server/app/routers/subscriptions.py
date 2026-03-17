from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.finance import SubscriptionPlan
from app.models.employee import Employee
from app.models.student import Student
from app.schemas.finance import SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionPlanResponse
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/subscription-plans", tags=["subscription-plans"])


@router.get("/", response_model=list[SubscriptionPlanResponse])
async def list_subscription_plans(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.created_at))
    return result.scalars().all()


@router.post("/", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    data: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role("admin")),
):
    plan = SubscriptionPlan(**data.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    plan_id: UUID,
    data: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role("admin")),
):
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role("admin")),
):
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")

    # Check if any students are using this plan
    students_result = await db.execute(
        select(Student).where(Student.subscription_plan_id == plan_id)
    )
    if students_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить абонемент — он назначен одному или нескольким студентам",
        )

    await db.delete(plan)
    await db.commit()
