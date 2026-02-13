from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.student import Student, ParentContact, StudentHistory, HistoryEventType
from app.models.employee import Employee
from app.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse,
    ParentContactCreate, ParentContactResponse,
    StudentHistoryResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[StudentResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student).options(selectinload(Student.parent_contacts)).order_by(Student.last_name)
    )
    return result.scalars().all()


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    contacts_data = data.parent_contacts
    student_data = data.model_dump(exclude={"parent_contacts"})
    student = Student(**student_data)

    for c in contacts_data:
        student.parent_contacts.append(ParentContact(**c.model_dump()))

    student.history.append(StudentHistory(
        event_type=HistoryEventType.added_to_db,
        description="Студент добавлен в базу данных",
    ))

    db.add(student)
    await db.commit()
    await db.refresh(student, attribute_names=["parent_contacts"])
    return student


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student).options(selectinload(Student.parent_contacts)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student).options(selectinload(Student.parent_contacts)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(student, field, value)

    await db.commit()
    await db.refresh(student, attribute_names=["parent_contacts"])
    return student


@router.delete("/{student_id}")
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    await db.delete(student)
    await db.commit()
    return {"detail": "Deleted"}


# --- Parent Contacts ---

@router.post("/{student_id}/contacts", response_model=ParentContactResponse, status_code=status.HTTP_201_CREATED)
async def add_parent_contact(
    student_id: UUID,
    data: ParentContactCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    contact = ParentContact(student_id=student_id, **data.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{student_id}/contacts/{contact_id}")
async def delete_parent_contact(
    student_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(ParentContact).where(ParentContact.id == contact_id, ParentContact.student_id == student_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
    return {"detail": "Deleted"}


# --- History ---

@router.get("/{student_id}/history", response_model=list[StudentHistoryResponse])
async def get_student_history(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(StudentHistory)
        .where(StudentHistory.student_id == student_id)
        .order_by(StudentHistory.created_at.desc())
    )
    return result.scalars().all()
