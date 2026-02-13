from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.schemas.employee import EmployeeResponse, EmployeeUpdate, EmployeeCreate
from app.auth.dependencies import get_current_user, require_role
from app.auth.security import hash_password

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Employee).order_by(Employee.last_name))
    return result.scalars().all()


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role(EmployeeRole.admin)),
):
    # Check if email already exists
    result = await db.execute(select(Employee).where(Employee.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new employee
    employee_data = data.model_dump(exclude={"password"})
    employee = Employee(
        **employee_data,
        hashed_password=hash_password(data.password)
    )

    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return employee


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role(EmployeeRole.admin)),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)

    await db.commit()
    await db.refresh(employee)
    return employee


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_role(EmployeeRole.admin)),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    await db.delete(employee)
    await db.commit()
    return {"detail": "Deleted"}
