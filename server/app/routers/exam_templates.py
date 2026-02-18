from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.exam import Exam
from app.models.employee import Employee
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/exam-templates", tags=["exam-templates"])


@router.get("/", response_model=list[ExamResponse])
async def list_exam_templates(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Get all exam templates"""
    query = select(Exam).options(
        selectinload(Exam.group),
        selectinload(Exam.subject_rel),
        selectinload(Exam.created_by_employee)
    ).where(Exam.is_template == True).order_by(Exam.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_template(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create a new exam template (admins and teachers can create)"""
    # Template should not have group_id
    exam_data = data.model_dump()
    exam_data['is_template'] = True
    exam_data['group_id'] = None
    exam_data['created_by'] = current_user.id

    # If subject_id is provided, populate subject name for backward compatibility
    if exam_data.get('subject_id'):
        from app.models.subject import Subject
        subject_result = await db.execute(select(Subject).where(Subject.id == exam_data['subject_id']))
        subject = subject_result.scalar_one_or_none()
        if subject:
            exam_data['subject'] = subject.name

    exam = Exam(**exam_data)
    db.add(exam)
    await db.commit()
    await db.refresh(exam, ["group", "subject_rel", "created_by_employee"])
    return exam


@router.get("/{template_id}", response_model=ExamResponse)
async def get_exam_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    """Get a specific exam template"""
    result = await db.execute(
        select(Exam).options(
            selectinload(Exam.group),
            selectinload(Exam.subject_rel),
            selectinload(Exam.created_by_employee)
        ).where(Exam.id == template_id, Exam.is_template == True)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Exam template not found")
    return template


@router.patch("/{template_id}", response_model=ExamResponse)
async def update_exam_template(
    template_id: UUID,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update an exam template (creator or admin can update)"""
    result = await db.execute(
        select(Exam).options(
            selectinload(Exam.group),
            selectinload(Exam.subject_rel),
            selectinload(Exam.created_by_employee)
        ).where(Exam.id == template_id, Exam.is_template == True)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Exam template not found")

    # Check permissions: only admin or creator can update
    if current_user.role != "admin" and template.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update this template"
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    # If subject_id is updated, also update the subject name field for backward compatibility
    if data.subject_id is not None:
        from app.models.subject import Subject
        subject_result = await db.execute(select(Subject).where(Subject.id == data.subject_id))
        subject = subject_result.scalar_one_or_none()
        if subject:
            template.subject = subject.name

    await db.commit()
    await db.refresh(template, ["group", "subject_rel", "created_by_employee"])
    return template


@router.delete("/{template_id}")
async def delete_exam_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Delete an exam template (creator or admin can delete)"""
    result = await db.execute(
        select(Exam).where(Exam.id == template_id, Exam.is_template == True)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Exam template not found")

    # Check permissions: only admin or creator can delete
    if current_user.role != "admin" and template.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this template"
        )

    await db.delete(template)
    await db.commit()
    return {"detail": "Deleted"}


@router.post("/{template_id}/use", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_from_template(
    template_id: UUID,
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create an exam from a template for a specific group"""
    # Get the template
    result = await db.execute(
        select(Exam).where(Exam.id == template_id, Exam.is_template == True)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Exam template not found")

    # Create a new exam from template
    exam = Exam(
        group_id=group_id,
        title=template.title,
        subject=template.subject,
        subject_id=template.subject_id,
        difficulty=template.difficulty,
        threshold_score=template.threshold_score,
        selected_tasks=template.selected_tasks,
        task_topics=template.task_topics,
        comment=template.comment,
        is_template=False,
        created_by=current_user.id,
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam, ["group", "subject_rel", "created_by_employee"])
    return exam
