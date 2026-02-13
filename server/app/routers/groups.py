from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.group import Group, GroupStudent
from app.models.employee import Employee
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse, GroupStudentAdd, GroupStudentResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("/", response_model=list[GroupResponse])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).order_by(Group.name))
    return result.scalars().all()


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/{group_id}")
async def delete_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    await db.delete(group)
    await db.commit()
    return {"detail": "Deleted"}


# --- Group Students ---

@router.get("/{group_id}/students", response_model=list[GroupStudentResponse])
async def list_group_students(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(GroupStudent).where(GroupStudent.group_id == group_id)
    )
    return result.scalars().all()


@router.post("/{group_id}/students", response_model=GroupStudentResponse, status_code=status.HTTP_201_CREATED)
async def add_student_to_group(
    group_id: UUID,
    data: GroupStudentAdd,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    gs = GroupStudent(group_id=group_id, student_id=data.student_id)
    db.add(gs)
    await db.commit()
    await db.refresh(gs)
    return gs


@router.delete("/{group_id}/students/{student_id}")
async def remove_student_from_group(
    group_id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == group_id,
            GroupStudent.student_id == student_id,
        )
    )
    gs = result.scalar_one_or_none()
    if not gs:
        raise HTTPException(status_code=404, detail="Student not in group")

    await db.delete(gs)
    await db.commit()
    return {"detail": "Removed"}
