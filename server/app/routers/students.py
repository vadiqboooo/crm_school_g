from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.student import Student, ParentContact, StudentHistory, HistoryEventType
from app.models.group import GroupStudent
from app.models.employee import Employee
from app.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse,
    ParentContactCreate, ParentContactResponse,
    StudentHistoryResponse, GroupInfoResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[StudentResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.parent_contacts),
            selectinload(Student.groups).selectinload(GroupStudent.group)
        )
        .order_by(Student.last_name)
    )
    students = result.scalars().all()

    # Manually construct response to include groups
    students_data = []
    for student in students:
        student_dict = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "phone": student.phone,
            "telegram_id": student.telegram_id,
            "current_school": student.current_school,
            "class_number": student.class_number,
            "status": student.status,
            "created_at": student.created_at,
            "parent_contacts": student.parent_contacts,
            "groups": [
                GroupInfoResponse(
                    id=gs.group.id,
                    name=gs.group.name,
                    school_location=gs.group.school_location
                )
                for gs in student.groups
                if not gs.is_archived
            ],
            "history": []
        }
        students_data.append(StudentResponse(**student_dict))

    return students_data


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
    await db.refresh(student, attribute_names=["parent_contacts", "groups", "history"])

    # Manually construct response to include groups and history
    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "telegram_id": student.telegram_id,
        "current_school": student.current_school,
        "class_number": student.class_number,
        "status": student.status,
        "created_at": student.created_at,
        "parent_contacts": student.parent_contacts,
        "groups": [],  # New students don't have groups yet
        "history": student.history
    }
    return StudentResponse(**student_dict)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.parent_contacts),
            selectinload(Student.groups).selectinload(GroupStudent.group),
            selectinload(Student.history)
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Manually construct response to include groups and history
    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "telegram_id": student.telegram_id,
        "current_school": student.current_school,
        "class_number": student.class_number,
        "status": student.status,
        "created_at": student.created_at,
        "parent_contacts": student.parent_contacts,
        "groups": [
            GroupInfoResponse(
                id=gs.group.id,
                name=gs.group.name,
                school_location=gs.group.school_location
            )
            for gs in student.groups
            if not gs.is_archived
        ],
        "history": student.history
    }
    return StudentResponse(**student_dict)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.parent_contacts),
            selectinload(Student.groups).selectinload(GroupStudent.group),
            selectinload(Student.history)
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Handle parent contacts separately
    update_data = data.model_dump(exclude_unset=True)
    parent_contacts_data = update_data.pop("parent_contacts", None)

    # Update basic fields
    for field, value in update_data.items():
        setattr(student, field, value)

    # Update parent contacts if provided
    if parent_contacts_data is not None:
        # Remove all existing contacts
        for contact in student.parent_contacts:
            await db.delete(contact)

        # Add new contacts
        student.parent_contacts = []
        for contact_data in parent_contacts_data:
            student.parent_contacts.append(ParentContact(**contact_data))

    await db.commit()
    await db.refresh(student, attribute_names=["parent_contacts", "groups", "history"])

    # Manually construct response to include groups and history
    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "telegram_id": student.telegram_id,
        "current_school": student.current_school,
        "class_number": student.class_number,
        "status": student.status,
        "created_at": student.created_at,
        "parent_contacts": student.parent_contacts,
        "groups": [
            GroupInfoResponse(
                id=gs.group.id,
                name=gs.group.name,
                school_location=gs.group.school_location
            )
            for gs in student.groups
            if not gs.is_archived
        ],
        "history": student.history
    }
    return StudentResponse(**student_dict)


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
