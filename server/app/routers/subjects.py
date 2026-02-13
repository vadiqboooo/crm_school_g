from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.subject import Subject
from app.models.employee import Employee
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/", response_model=list[SubjectResponse])
async def list_subjects(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Subject).order_by(Subject.name))
    return result.scalars().all()


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    subject = Subject(**data.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.patch("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: UUID,
    data: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)

    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    await db.delete(subject)
    await db.commit()
    return {"detail": "Deleted"}
