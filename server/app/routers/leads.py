from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.lead import Lead, LeadComment, LeadStatus
from app.models.group import Group, GroupStudent
from app.models.student import Student, StudentHistory, HistoryEventType
from app.models.employee import Employee
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse,
    LeadCommentCreate, LeadCommentResponse,
    LeadAssignTrial, LeadConvertToStudent,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])


def _lead_query():
    return select(Lead).options(
        selectinload(Lead.comments).selectinload(LeadComment.author),
        selectinload(Lead.assigned_to),
        selectinload(Lead.trial_group),
        selectinload(Lead.trial_groups),
        selectinload(Lead.trial_conducted_group),
        selectinload(Lead.conducted_groups),
    )


@router.get("/", response_model=list[LeadResponse])
async def list_leads(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(_lead_query().order_by(Lead.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    lead = Lead(
        contact_name=data.contact_name,
        student_name=data.student_name,
        phone=data.phone,
        assigned_to_id=data.assigned_to_id or current_user.id,
        school_location_id=data.school_location_id,
        status=LeadStatus.not_sorted,
    )
    db.add(lead)
    await db.commit()

    result = await db.execute(_lead_query().where(Lead.id == lead.id))
    return result.scalar_one()


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    await db.commit()
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    return result.scalar_one()


@router.post("/{lead_id}/assign-trial", response_model=LeadResponse)
async def assign_trial(
    lead_id: UUID,
    data: LeadAssignTrial,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Assign a trial group to the lead. Creates student record if not exists."""
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    group_result = await db.execute(select(Group).where(Group.id == data.group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Create student record if not exists
    if not lead.student_id:
        name_parts = (lead.student_name or "").strip().split(" ", 1)
        student = Student(
            last_name=name_parts[0] if name_parts[0] else "—",
            first_name=name_parts[1] if len(name_parts) > 1 else "—",
            phone=lead.phone,
        )
        db.add(student)
        await db.flush()
        lead.student_id = student.id

        history = StudentHistory(
            student_id=student.id,
            event_type=HistoryEventType.added_to_db,
            description="Создан из лида для пробного урока",
        )
        db.add(history)

    # Add student to group if not already there; mark as trial
    existing_result = await db.execute(
        select(GroupStudent).where(
            GroupStudent.group_id == data.group_id,
            GroupStudent.student_id == lead.student_id,
            GroupStudent.is_archived == False,
        )
    )
    existing_gs = existing_result.scalar_one_or_none()
    if not existing_gs:
        gs = GroupStudent(group_id=data.group_id, student_id=lead.student_id, is_trial=True)
        db.add(gs)
    else:
        existing_gs.is_trial = True

    # Add group to many-to-many trial_groups if not already present
    if group not in lead.trial_groups:
        lead.trial_groups.append(group)

    lead.trial_group_id = data.group_id
    lead.status = LeadStatus.trial_assigned

    await db.commit()
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    return result.scalar_one()


@router.post("/{lead_id}/convert", response_model=LeadResponse)
async def convert_to_student(
    lead_id: UUID,
    data: LeadConvertToStudent,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Convert a lead to a full student."""
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if not lead.student_id:
        name_parts = (lead.student_name or "").strip().split(" ", 1)
        student = Student(
            last_name=name_parts[0] if name_parts[0] else "—",
            first_name=name_parts[1] if len(name_parts) > 1 else "—",
            phone=lead.phone,
            status="active",
        )
        db.add(student)
        await db.flush()
        lead.student_id = student.id

        history = StudentHistory(
            student_id=student.id,
            event_type=HistoryEventType.added_to_db,
            description="Конвертирован из лида",
        )
        db.add(history)

    if data.group_id:
        existing_result = await db.execute(
            select(GroupStudent).where(
                GroupStudent.group_id == data.group_id,
                GroupStudent.student_id == lead.student_id,
                GroupStudent.is_archived == False,
            )
        )
        if not existing_result.scalar_one_or_none():
            gs = GroupStudent(group_id=data.group_id, student_id=lead.student_id)
            db.add(gs)

    lead.status = LeadStatus.archived

    await db.commit()
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    return result.scalar_one()


@router.delete("/{lead_id}/trial-groups/{group_id}", response_model=LeadResponse)
async def remove_trial_group(
    lead_id: UUID,
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Remove a trial group from the lead."""
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if group and group in lead.trial_groups:
        lead.trial_groups.remove(group)

    # Unmark student as trial in this group (but keep them in the group)
    if lead.student_id:
        gs_result = await db.execute(
            select(GroupStudent).where(
                GroupStudent.group_id == group_id,
                GroupStudent.student_id == lead.student_id,
                GroupStudent.is_archived == False,
            )
        )
        gs = gs_result.scalar_one_or_none()
        if gs:
            gs.is_trial = False

    # If this was the current trial_group_id, point to another or clear
    if lead.trial_group_id == group_id:
        lead.trial_group_id = lead.trial_groups[-1].id if lead.trial_groups else None

    # Clear conducted marker if it was this group
    if lead.trial_conducted_group_id == group_id:
        lead.trial_conducted_group_id = None

    await db.commit()
    result = await db.execute(_lead_query().where(Lead.id == lead_id))
    return result.scalar_one()


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.delete(lead)
    await db.commit()


@router.post("/{lead_id}/comments", response_model=LeadCommentResponse)
async def add_comment(
    lead_id: UUID,
    data: LeadCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    comment = LeadComment(
        lead_id=lead_id,
        author_id=current_user.id,
        content=data.content,
    )
    db.add(comment)
    await db.commit()

    result = await db.execute(
        select(LeadComment)
        .options(selectinload(LeadComment.author))
        .where(LeadComment.id == comment.id)
    )
    return result.scalar_one()
