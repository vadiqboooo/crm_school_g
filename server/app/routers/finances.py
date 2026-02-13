from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.finance import Payment, EmployeeSalary
from app.models.employee import Employee
from app.schemas.finance import (
    PaymentCreate, PaymentUpdate, PaymentResponse,
    SalaryCreate, SalaryUpdate, SalaryResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/finances", tags=["finances"])


# --- Payments ---

@router.get("/payments", response_model=list[PaymentResponse])
async def list_payments(
    student_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    query = select(Payment).order_by(Payment.created_at.desc())
    if student_id:
        query = query.where(Payment.student_id == student_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    payment = Payment(**data.model_dump())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.patch("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: UUID,
    data: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)

    await db.commit()
    await db.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}")
async def delete_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.delete(payment)
    await db.commit()
    return {"detail": "Deleted"}


# --- Salaries ---

@router.get("/salaries", response_model=list[SalaryResponse])
async def list_salaries(
    employee_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    query = select(EmployeeSalary).order_by(EmployeeSalary.created_at.desc())
    if employee_id:
        query = query.where(EmployeeSalary.employee_id == employee_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/salaries", response_model=SalaryResponse, status_code=status.HTTP_201_CREATED)
async def create_salary(
    data: SalaryCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    salary = EmployeeSalary(**data.model_dump())
    db.add(salary)
    await db.commit()
    await db.refresh(salary)
    return salary


@router.patch("/salaries/{salary_id}", response_model=SalaryResponse)
async def update_salary(
    salary_id: UUID,
    data: SalaryUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(EmployeeSalary).where(EmployeeSalary.id == salary_id))
    salary = result.scalar_one_or_none()
    if not salary:
        raise HTTPException(status_code=404, detail="Salary record not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(salary, field, value)

    await db.commit()
    await db.refresh(salary)
    return salary
