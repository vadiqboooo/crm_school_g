from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.report import DailyReport, ReportChurnStudent, ReportNotifiedStudent, Task, TaskComment, ReportStatus
from app.models.employee import Employee
from app.schemas.report import (
    DailyReportCreate, DailyReportUpdate, DailyReportResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    TaskCommentCreate, TaskCommentResponse,
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
        selectinload(DailyReport.tasks).selectinload(Task.assignee),
        selectinload(DailyReport.tasks).selectinload(Task.comments).selectinload(TaskComment.author),
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

    # Reload with all relationships
    result = await db.execute(
        select(DailyReport)
        .options(
            selectinload(DailyReport.churn_students),
            selectinload(DailyReport.notified_students),
            selectinload(DailyReport.tasks).selectinload(Task.assignee),
            selectinload(DailyReport.tasks).selectinload(Task.comments).selectinload(TaskComment.author),
            selectinload(DailyReport.employee),
        )
        .where(DailyReport.id == report.id)
    )
    return result.scalar_one()


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
            selectinload(DailyReport.tasks).selectinload(Task.assignee),
            selectinload(DailyReport.tasks).selectinload(Task.comments).selectinload(TaskComment.author),
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
            selectinload(DailyReport.tasks).selectinload(Task.assignee),
            selectinload(DailyReport.tasks).selectinload(Task.comments).selectinload(TaskComment.author),
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
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments).selectinload(TaskComment.author)
        )
        .where(Task.report_id == report_id)
        .order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.get("/tasks/all", response_model=list[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = select(Task).options(
        selectinload(Task.assignee),
        selectinload(Task.comments).selectinload(TaskComment.author),
        selectinload(Task.report).selectinload(DailyReport.employee)
    )

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
    """Get filtered tasks for a report.

    Логика фильтрации:
    - Если отчет ЗАВЕРШЕН (completed):
      - Показывать ТОЛЬКО задачи, созданные в этом отчете
    - Если отчет В РАБОТЕ (draft):
      - Показывать задачи, созданные в этом отчете
      - Показывать невыполненные задачи из других отчетов

    Это гарантирует, что:
    - Завершенные отчеты "замораживаются" со своими задачами
    - Невыполненные задачи переносятся только в активные отчеты
    - Выполненные задачи остаются в отчете, где были выполнены
    """

    # Get current report
    result = await db.execute(
        select(DailyReport)
        .where(DailyReport.id == report_id)
    )
    current_report = result.scalar_one_or_none()
    if not current_report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Build query for tasks
    query = select(Task).options(
        selectinload(Task.assignee),
        selectinload(Task.comments).selectinload(TaskComment.author)
    )

    # For managers: only show tasks assigned to them
    if current_user.role == EmployeeRole.manager:
        query = query.where(Task.assigned_to == current_user.id)

    # Filter tasks based on report status
    if current_report.status == ReportStatus.completed:
        # Completed reports: show ONLY tasks created in this report
        query = query.where(Task.report_id == report_id)
    else:
        # Draft reports: show tasks from this report AND incomplete tasks from others
        query = query.where(
            or_(
                Task.report_id == report_id,
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
    await db.refresh(task, attribute_names=["assignee", "comments"])

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
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments).selectinload(TaskComment.author)
        )
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task, attribute_names=["assignee", "comments"])

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


# --- Task Comments ---

@router.post("/tasks/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_task_comment(
    task_id: UUID,
    data: TaskCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Add a comment to a task"""
    # Verify task exists
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = TaskComment(
        task_id=task_id,
        author_id=current_user.id,
        content=data.content
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment, attribute_names=["author"])

    # Broadcast task update via WebSocket to refresh comments
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments).selectinload(TaskComment.author)
        )
        .where(Task.id == task_id)
    )
    updated_task = result.scalar_one()

    await manager.broadcast("tasks", {
        "action": "update",
        "task": TaskResponse.model_validate(updated_task).model_dump(mode="json")
    })

    return comment


@router.get("/tasks/{task_id}/comments", response_model=list[TaskCommentResponse])
async def get_task_comments(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Get all comments for a task"""
    result = await db.execute(
        select(TaskComment)
        .options(selectinload(TaskComment.author))
        .where(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
    )
    return result.scalars().all()


@router.delete("/tasks/{task_id}/comments/{comment_id}")
async def delete_task_comment(
    task_id: UUID,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Delete a comment from a task (only author or admin can delete)"""
    result = await db.execute(
        select(TaskComment)
        .where(TaskComment.id == comment_id, TaskComment.task_id == task_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Only author or admin can delete
    if comment.author_id != current_user.id and current_user.role != EmployeeRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.delete(comment)
    await db.commit()

    # Broadcast task update via WebSocket to refresh comments
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments).selectinload(TaskComment.author)
        )
        .where(Task.id == task_id)
    )
    updated_task = result.scalar_one_or_none()

    if updated_task:
        await manager.broadcast("tasks", {
            "action": "update",
            "task": TaskResponse.model_validate(updated_task).model_dump(mode="json")
        })

    return {"detail": "Deleted"}
