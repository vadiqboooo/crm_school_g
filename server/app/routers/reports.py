from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.report import DailyReport, ReportChurnStudent, ReportNotifiedStudent, Task, ReportStatus
from app.models.employee import Employee
from app.schemas.report import (
    DailyReportCreate, DailyReportUpdate, DailyReportResponse,
    TaskCreate, TaskUpdate, TaskResponse,
)
from app.auth.dependencies import get_current_user, get_manager_location_id
from app.models.employee import EmployeeRole
from app.websocket_manager import manager

router = APIRouter(prefix="/reports", tags=["reports"])


# --- WebSocket ---

@router.websocket("/ws/tasks")
async def websocket_tasks(websocket: WebSocket):
    await manager.connect(websocket, "tasks")
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "tasks")


# --- Daily Reports ---

@router.get("/", response_model=list[DailyReportResponse])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = select(DailyReport).options(
        selectinload(DailyReport.churn_students),
        selectinload(DailyReport.notified_students),
        selectinload(DailyReport.tasks),
        selectinload(DailyReport.employee),
    )

    # Менеджеры видят только свои отчеты
    if current_user.role == EmployeeRole.manager:
        query = query.where(DailyReport.employee_id == current_user.id)

    query = query.order_by(DailyReport.date.desc())
    result = await db.execute(query)
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
    await db.refresh(report, attribute_names=["churn_students", "notified_students", "tasks", "employee"])
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
            selectinload(DailyReport.tasks),
            selectinload(DailyReport.employee),
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
            selectinload(DailyReport.tasks),
            selectinload(DailyReport.employee),
        )
        .where(DailyReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Use exclude_none=False to allow setting fields to None
    update_data = data.model_dump(exclude_unset=True, exclude_none=False)
    for field, value in update_data.items():
        setattr(report, field, value)

    await db.commit()
    await db.refresh(report, attribute_names=["churn_students", "notified_students", "tasks", "employee"])
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

@router.get("/{report_id}/tasks", response_model=list[TaskResponse])
async def get_report_tasks(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Get all tasks for a specific report"""
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee))
        .where(Task.report_id == report_id)
        .order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.get("/tasks/all", response_model=list[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = select(Task).options(selectinload(Task.assignee))

    # Managers see only tasks assigned to them
    if current_user.role == EmployeeRole.manager:
        query = query.where(Task.assigned_to == current_user.id)

    query = query.order_by(Task.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/daily/{report_id}/filtered-tasks", response_model=list[TaskResponse])
async def get_filtered_tasks_for_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get filtered tasks for a report: exclude completed tasks from previous reports,
    show only incomplete tasks and tasks created after previous report

    Логика фильтрации:
    - Если задача выполнена (completed) в предыдущем отчете или раньше → не показывать
    - Показываются:
      1. Задачи, созданные после предыдущего отчета (независимо от статуса)
      2. Задачи, которые не выполнены (независимо от даты создания)
    """

    # Get current report
    result = await db.execute(
        select(DailyReport)
        .where(DailyReport.id == report_id)
    )
    current_report = result.scalar_one_or_none()
    if not current_report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Find previous COMPLETED report by the same manager created earlier
    # Only completed reports should be used for filtering tasks
    # Use created_at instead of date to handle multiple reports per day
    result = await db.execute(
        select(DailyReport)
        .where(
            DailyReport.employee_id == current_report.employee_id,
            DailyReport.created_at < current_report.created_at,
            DailyReport.status == ReportStatus.completed
        )
        .order_by(DailyReport.created_at.desc())
        .limit(1)
    )
    previous_report = result.scalar_one_or_none()

    # Build query for tasks
    query = select(Task).options(selectinload(Task.assignee))

    # For managers: only show tasks assigned to them
    if current_user.role == EmployeeRole.manager:
        query = query.where(Task.assigned_to == current_user.id)

    if previous_report:
        # Filter tasks based on previous report:
        # Include tasks that are either:
        # 1. Created after previous report was created (Task.created_at > previous_report.created_at)
        # 2. OR not completed yet (Task.status != "completed")
        # This means completed tasks from previous or earlier reports are excluded
        # Using created_at allows multiple reports per day

        query = query.where(
            or_(
                Task.created_at > previous_report.created_at,
                Task.status != "completed"
            )
        )

    query = query.order_by(Task.created_at.desc())
    result = await db.execute(query)
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
    await db.refresh(task, attribute_names=["assignee"])

    # Broadcast task creation via WebSocket
    await manager.broadcast("tasks", {
        "action": "create",
        "task": TaskResponse.model_validate(task).model_dump(mode="json")
    })

    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee))
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task, attribute_names=["assignee"])

    # Broadcast task update via WebSocket
    await manager.broadcast("tasks", {
        "action": "update",
        "task": TaskResponse.model_validate(task).model_dump(mode="json")
    })

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

    task_id_str = str(task.id)
    await db.delete(task)
    await db.commit()

    # Broadcast task deletion via WebSocket
    await manager.broadcast("tasks", {
        "action": "delete",
        "task_id": task_id_str
    })

    return {"detail": "Deleted"}
