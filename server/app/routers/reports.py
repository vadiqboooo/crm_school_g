from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.report import DailyReport, ReportChurnStudent, ReportNotifiedStudent, Task
from app.models.employee import Employee
from app.schemas.report import (
    DailyReportCreate, DailyReportUpdate, DailyReportResponse,
    TaskCreate, TaskUpdate, TaskResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


# --- Daily Reports ---

@router.get("/", response_model=list[DailyReportResponse])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(DailyReport)
        .options(
            selectinload(DailyReport.churn_students),
            selectinload(DailyReport.notified_students),
        )
        .order_by(DailyReport.date.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=DailyReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    data: DailyReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    report_data = data.model_dump(exclude={"churn_students", "notified_students"})
    report = DailyReport(employee_id=current_user.id, **report_data)

    for cs in data.churn_students:
        report.churn_students.append(ReportChurnStudent(**cs.model_dump()))
    for ns in data.notified_students:
        report.notified_students.append(ReportNotifiedStudent(**ns.model_dump()))

    db.add(report)
    await db.commit()
    await db.refresh(report, attribute_names=["churn_students", "notified_students"])
    return report


@router.get("/{report_id}", response_model=DailyReportResponse)
async def get_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(DailyReport)
        .options(
            selectinload(DailyReport.churn_students),
            selectinload(DailyReport.notified_students),
        )
        .where(DailyReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}", response_model=DailyReportResponse)
async def update_report(
    report_id: UUID,
    data: DailyReportUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(DailyReport)
        .options(
            selectinload(DailyReport.churn_students),
            selectinload(DailyReport.notified_students),
        )
        .where(DailyReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    await db.commit()
    await db.refresh(report, attribute_names=["churn_students", "notified_students"])
    return report


@router.delete("/{report_id}")
async def delete_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.delete(report)
    await db.commit()
    return {"detail": "Deleted"}


# --- Tasks ---

@router.get("/tasks/all", response_model=list[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    return result.scalars().all()


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    task = Task(**data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return {"detail": "Deleted"}
