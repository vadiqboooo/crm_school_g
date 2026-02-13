from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.exam import Exam, ExamResult
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
    query = select(Exam).order_by(Exam.date.desc())
    if group_id:
        query = query.where(Exam.group_id == group_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    exam = Exam(**data.model_dump())
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


@router.patch("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: UUID,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)

    await db.commit()
    await db.refresh(exam)
    return exam


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    await db.delete(exam)
    await db.commit()
    return {"detail": "Deleted"}


# --- Exam Results ---

@router.get("/{exam_id}/results", response_model=list[ExamResultResponse])
async def list_exam_results(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamResult).where(ExamResult.exam_id == exam_id)
    )
    return result.scalars().all()


@router.post("/{exam_id}/results", response_model=ExamResultResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_result(
    exam_id: UUID,
    data: ExamResultCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    er = ExamResult(exam_id=exam_id, **data.model_dump())
    db.add(er)
    await db.commit()
    await db.refresh(er)
    return er


@router.patch("/{exam_id}/results/{result_id}", response_model=ExamResultResponse)
async def update_exam_result(
    exam_id: UUID,
    result_id: UUID,
    data: ExamResultUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamResult).where(ExamResult.id == result_id)
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=404, detail="Result not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(er, field, value)

    await db.commit()
    await db.refresh(er)
    return er
