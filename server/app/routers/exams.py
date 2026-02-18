from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.exam import Exam, ExamResult
from app.models.group import Group
from app.models.employee import Employee
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse,
    ExamResultCreate, ExamResultUpdate, ExamResultResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("/", response_model=list[ExamResponse])
async def list_exams(
    group_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    query = select(Exam).options(
        selectinload(Exam.group),
        selectinload(Exam.subject_rel),
        selectinload(Exam.created_by_employee)
    ).order_by(Exam.created_at.desc())

    if group_id:
        query = query.where(Exam.group_id == group_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    group = None
    if current_user.role == "teacher" and data.group_id:
        group_result = await db.execute(select(Group).where(Group.id == data.group_id))
        group = group_result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif data.group_id:
        group_result = await db.execute(select(Group).where(Group.id == data.group_id))
        group = group_result.scalar_one_or_none()

    # Auto-populate subject_id from group if not provided
    exam_data = data.model_dump()
    if not exam_data.get('subject_id') and group and group.subject_id:
        exam_data['subject_id'] = group.subject_id
        # Also populate subject name for backward compatibility
        if group.subject:
            exam_data['subject'] = group.subject.name

    # If subject_id is provided, populate subject name for backward compatibility
    if exam_data.get('subject_id'):
        from app.models.subject import Subject
        subject_result = await db.execute(select(Subject).where(Subject.id == exam_data['subject_id']))
        subject = subject_result.scalar_one_or_none()
        if subject:
            exam_data['subject'] = subject.name

    exam = Exam(**exam_data, created_by=current_user.id)
    db.add(exam)
    await db.commit()

    # Reload exam with relationships
    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.group),
            selectinload(Exam.subject_rel),
            selectinload(Exam.created_by_employee)
        )
        .where(Exam.id == exam.id)
    )
    exam = result.scalar_one()
    return exam


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.group),
            selectinload(Exam.subject_rel),
            selectinload(Exam.created_by_employee)
        )
        .where(Exam.id == exam_id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


@router.patch("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: UUID,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and exam.group_id:
        group_result = await db.execute(select(Group).where(Group.id == exam.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)

    # If subject_id is updated, also update the subject name field for backward compatibility
    if data.subject_id is not None:
        from app.models.subject import Subject
        subject_result = await db.execute(select(Subject).where(Subject.id == data.subject_id))
        subject = subject_result.scalar_one_or_none()
        if subject:
            exam.subject = subject.name

    await db.commit()

    # Reload exam with relationships
    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.group),
            selectinload(Exam.subject_rel),
            selectinload(Exam.created_by_employee)
        )
        .where(Exam.id == exam_id)
    )
    exam = result.scalar_one()
    return exam


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Verify group access for teachers
    if current_user.role == "teacher" and exam.group_id:
        group_result = await db.execute(select(Group).where(Group.id == exam.group_id))
        group = group_result.scalar_one_or_none()
        if group and group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(exam)
    await db.commit()
    return {"detail": "Deleted"}


# --- Exam Results ---

@router.get("/results/all", response_model=list[ExamResultResponse])
async def list_all_exam_results(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get all exam results. For teachers, only returns their own results."""
    query = select(ExamResult).options(
        selectinload(ExamResult.student),
        selectinload(ExamResult.added_by_employee),
        selectinload(ExamResult.exam).selectinload(Exam.group),
        selectinload(ExamResult.exam).selectinload(Exam.subject_rel),
        selectinload(ExamResult.exam).selectinload(Exam.created_by_employee)
    ).order_by(ExamResult.added_at.desc())

    # Filter for teachers - only their results
    if current_user.role == "teacher":
        query = query.where(ExamResult.added_by == current_user.id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{exam_id}/results", response_model=list[ExamResultResponse])
async def list_exam_results(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamResult)
        .options(
            selectinload(ExamResult.student),
            selectinload(ExamResult.added_by_employee),
            selectinload(ExamResult.exam).selectinload(Exam.group),
            selectinload(ExamResult.exam).selectinload(Exam.subject_rel),
            selectinload(ExamResult.exam).selectinload(Exam.created_by_employee)
        )
        .where(ExamResult.exam_id == exam_id)
        .order_by(ExamResult.final_score.desc())
    )
    return result.scalars().all()


@router.post("/{exam_id}/results", response_model=ExamResultResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_result(
    exam_id: UUID,
    data: ExamResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
        exam = exam_result.scalar_one_or_none()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        if exam.group_id:
            group_result = await db.execute(select(Group).where(Group.id == exam.group_id))
            group = group_result.scalar_one_or_none()
            if group and group.teacher_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")

    er = ExamResult(exam_id=exam_id, **data.model_dump(), added_by=current_user.id)
    db.add(er)
    await db.commit()
    await db.refresh(er, ["student", "added_by_employee"])
    return er


@router.patch("/{exam_id}/results/{result_id}", response_model=ExamResultResponse)
async def update_exam_result(
    exam_id: UUID,
    result_id: UUID,
    data: ExamResultUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
        exam = exam_result.scalar_one_or_none()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        if exam.group_id:
            group_result = await db.execute(select(Group).where(Group.id == exam.group_id))
            group = group_result.scalar_one_or_none()
            if group and group.teacher_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(ExamResult).where(ExamResult.id == result_id)
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=404, detail="Result not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(er, field, value)

    await db.commit()
    await db.refresh(er, ["student", "added_by_employee"])
    return er


@router.delete("/{exam_id}/results/{result_id}")
async def delete_exam_result(
    exam_id: UUID,
    result_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Verify group access for teachers
    if current_user.role == "teacher":
        exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
        exam = exam_result.scalar_one_or_none()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        if exam.group_id:
            group_result = await db.execute(select(Group).where(Group.id == exam.group_id))
            group = group_result.scalar_one_or_none()
            if group and group.teacher_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(ExamResult).where(ExamResult.id == result_id, ExamResult.exam_id == exam_id)
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=404, detail="Result not found")

    await db.delete(er)
    await db.commit()
    return {"detail": "Deleted"}
