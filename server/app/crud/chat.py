import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatRoom, ChatRoomMember, ChatMessage, RoomType, MemberType, MessageType
from app.models.student import Student, StudentStatus
from app.models.employee import Employee
from app.models.app_user import AppUser


async def get_member_name(db: AsyncSession, member_id: uuid.UUID, member_type: str) -> str:
    if member_type == "student":
        result = await db.execute(select(Student).where(Student.id == member_id))
        s = result.scalar_one_or_none()
        if s:
            return s.chat_display_name or f"{s.first_name} {s.last_name}"
    elif member_type == "app_user":
        result = await db.execute(select(AppUser).where(AppUser.id == member_id))
        u = result.scalar_one_or_none()
        if u:
            return u.display_name
    else:
        result = await db.execute(select(Employee).where(Employee.id == member_id))
        e = result.scalar_one_or_none()
        if e:
            return f"{e.first_name} {e.last_name}"
    return "Unknown"


async def get_member_public_key(db: AsyncSession, member_id: uuid.UUID, member_type: str) -> Optional[str]:
    if member_type == "student":
        result = await db.execute(select(Student.public_key).where(Student.id == member_id))
        return result.scalar_one_or_none()
    if member_type == "app_user":
        result = await db.execute(select(AppUser.public_key).where(AppUser.id == member_id))
        return result.scalar_one_or_none()
    if member_type == "employee":
        result = await db.execute(select(Employee.public_key).where(Employee.id == member_id))
        return result.scalar_one_or_none()
    return None


async def get_rooms_for_member(
    db: AsyncSession,
    member_id: uuid.UUID,
    member_type: str,
) -> list[ChatRoom]:
    result = await db.execute(
        select(ChatRoom)
        .join(ChatRoomMember, ChatRoom.id == ChatRoomMember.room_id)
        .where(
            and_(
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
        .options(selectinload(ChatRoom.members))
        .order_by(desc(ChatRoom.created_at))
    )
    return list(result.scalars().all())


async def get_room_by_id(db: AsyncSession, room_id: uuid.UUID) -> Optional[ChatRoom]:
    result = await db.execute(
        select(ChatRoom)
        .where(ChatRoom.id == room_id)
        .options(selectinload(ChatRoom.members))
    )
    return result.scalar_one_or_none()


async def is_member(db: AsyncSession, room_id: uuid.UUID, member_id: uuid.UUID, member_type: str) -> bool:
    result = await db.execute(
        select(ChatRoomMember.id).where(
            and_(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def get_messages(
    db: AsyncSession,
    room_id: uuid.UUID,
    before: Optional[datetime] = None,
    limit: int = 50,
) -> list[ChatMessage]:
    q = select(ChatMessage).where(ChatMessage.room_id == room_id)
    if before:
        q = q.where(ChatMessage.created_at < before)
    q = q.order_by(desc(ChatMessage.created_at)).limit(limit)
    result = await db.execute(q)
    messages = list(result.scalars().all())
    messages.reverse()  # chronological order
    return messages


async def create_message(
    db: AsyncSession,
    room_id: uuid.UUID,
    sender_id: uuid.UUID,
    sender_type: str,
    content_encrypted: str,
    message_type: str = "text",
    file_url: Optional[str] = None,
    file_name: Optional[str] = None,
    file_size: Optional[int] = None,
    reply_to_id: Optional[uuid.UUID] = None,
) -> ChatMessage:
    msg = ChatMessage(
        id=uuid.uuid4(),
        room_id=room_id,
        sender_id=sender_id,
        sender_type=sender_type,
        content_encrypted=content_encrypted,
        message_type=message_type,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        reply_to_id=reply_to_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def mark_read(db: AsyncSession, room_id: uuid.UUID, member_id: uuid.UUID, member_type: str):
    result = await db.execute(
        select(ChatRoomMember).where(
            and_(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
    )
    member = result.scalar_one_or_none()
    if member:
        now = datetime.now(timezone.utc)
        member.last_read_at = now
        await db.commit()
        return now
    return None


async def get_unread_count(db: AsyncSession, room_id: uuid.UUID, member_id: uuid.UUID, member_type: str) -> int:
    result = await db.execute(
        select(ChatRoomMember.last_read_at).where(
            and_(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
    )
    last_read = result.scalar_one_or_none()
    q = select(func.count(ChatMessage.id)).where(ChatMessage.room_id == room_id)
    if last_read:
        q = q.where(ChatMessage.created_at > last_read)
    result = await db.execute(q)
    return result.scalar() or 0


async def get_last_message(db: AsyncSession, room_id: uuid.UUID) -> Optional[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(desc(ChatMessage.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_group_room(
    db: AsyncSession,
    group_id: uuid.UUID,
    name: str,
    members: list[dict],  # [{"member_id": uuid, "member_type": str, "room_key_encrypted": str|None}]
) -> ChatRoom:
    room = ChatRoom(
        id=uuid.uuid4(),
        room_type=RoomType.group,
        group_id=group_id,
        name=name,
    )
    db.add(room)
    await db.flush()

    for m in members:
        member = ChatRoomMember(
            id=uuid.uuid4(),
            room_id=room.id,
            member_id=m["member_id"],
            member_type=m["member_type"],
            room_key_encrypted=m.get("room_key_encrypted"),
        )
        db.add(member)

    await db.commit()
    # Re-query with members eagerly loaded (refresh doesn't load relationships in async)
    result = await db.execute(
        select(ChatRoom).where(ChatRoom.id == room.id).options(selectinload(ChatRoom.members))
    )
    return result.scalar_one()


async def create_custom_group_room(
    db: AsyncSession,
    name: str,
    members: list[dict],  # [{"member_id": uuid, "member_type": str}]
) -> ChatRoom:
    """Create a free-form group chat (no school group_id). Any member type can create."""
    room = ChatRoom(
        id=uuid.uuid4(),
        room_type=RoomType.group,
        group_id=None,
        name=name,
    )
    db.add(room)
    await db.flush()

    seen = set()
    for m in members:
        key = (m["member_id"], m["member_type"])
        if key in seen:
            continue
        seen.add(key)
        db.add(ChatRoomMember(
            id=uuid.uuid4(),
            room_id=room.id,
            member_id=m["member_id"],
            member_type=m["member_type"],
            room_key_encrypted=None,
        ))

    await db.commit()
    result = await db.execute(
        select(ChatRoom).where(ChatRoom.id == room.id).options(selectinload(ChatRoom.members))
    )
    return result.scalar_one()


async def add_member_to_room(
    db: AsyncSession,
    room_id: uuid.UUID,
    member_id: uuid.UUID,
    member_type: str,
) -> bool:
    """Add a member to an existing group room. Returns False if already a member."""
    existing = await db.execute(
        select(ChatRoomMember).where(
            and_(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
    )
    if existing.scalar_one_or_none():
        return False
    db.add(ChatRoomMember(
        id=uuid.uuid4(),
        room_id=room_id,
        member_id=member_id,
        member_type=member_type,
        room_key_encrypted=None,
    ))
    await db.commit()
    return True


async def get_room_by_group_id(db: AsyncSession, group_id: uuid.UUID) -> Optional[ChatRoom]:
    result = await db.execute(
        select(ChatRoom)
        .where(and_(ChatRoom.group_id == group_id, ChatRoom.room_type == RoomType.group))
        .options(selectinload(ChatRoom.members))
    )
    return result.scalar_one_or_none()


async def search_students(
    db: AsyncSession,
    query: str,
    exclude_id: uuid.UUID | None = None,
    limit: int = 20,
) -> list[Student]:
    """Search active students by name, portal_login or phone (case-insensitive partial match)."""
    q = f"%{query.strip()}%"
    conditions = [
        Student.status == StudentStatus.active,
        or_(
            Student.portal_login.ilike(q),
            Student.phone.ilike(q),
            Student.first_name.ilike(q),
            Student.last_name.ilike(q),
            func.concat(Student.first_name, ' ', Student.last_name).ilike(q),
            func.concat(Student.last_name, ' ', Student.first_name).ilike(q),
        ),
    ]
    if exclude_id:
        conditions.append(Student.id != exclude_id)
    result = await db.execute(
        select(Student)
        .where(and_(*conditions))
        .limit(limit)
    )
    return list(result.scalars().all())


async def search_employees(
    db: AsyncSession,
    query: str,
    exclude_id: uuid.UUID | None = None,
    limit: int = 20,
) -> list[Employee]:
    """Search active employees by name or email."""
    q = f"%{query.strip()}%"
    conditions = [
        or_(Employee.is_active == True, Employee.is_active.is_(None)),
        or_(
            Employee.first_name.ilike(q),
            Employee.last_name.ilike(q),
            func.concat(Employee.first_name, ' ', Employee.last_name).ilike(q),
            func.concat(Employee.last_name, ' ', Employee.first_name).ilike(q),
            Employee.email.ilike(q),
        ),
    ]
    if exclude_id:
        conditions.append(Employee.id != exclude_id)
    result = await db.execute(
        select(Employee)
        .where(and_(*conditions))
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_or_create_direct_room(
    db: AsyncSession,
    member_a_id: uuid.UUID,
    member_a_type: str,
    member_b_id: uuid.UUID,
    member_b_type: str,
) -> ChatRoom:
    """Return existing direct room between two members, or create a new one."""
    # Find existing: room where both are members
    # Use subquery: rooms where member_a is member AND member_b is member
    subA = select(ChatRoomMember.room_id).where(
        and_(
            ChatRoomMember.member_id == member_a_id,
            ChatRoomMember.member_type == member_a_type,
        )
    )
    subB = select(ChatRoomMember.room_id).where(
        and_(
            ChatRoomMember.member_id == member_b_id,
            ChatRoomMember.member_type == member_b_type,
        )
    )
    result = await db.execute(
        select(ChatRoom)
        .where(
            and_(
                ChatRoom.room_type == RoomType.direct,
                ChatRoom.id.in_(subA),
                ChatRoom.id.in_(subB),
            )
        )
        .options(selectinload(ChatRoom.members))
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Create new direct room
    room = ChatRoom(
        id=uuid.uuid4(),
        room_type=RoomType.direct,
        group_id=None,
        name=None,
    )
    db.add(room)
    await db.flush()

    for mid, mtype in [(member_a_id, member_a_type), (member_b_id, member_b_type)]:
        db.add(ChatRoomMember(
            id=uuid.uuid4(),
            room_id=room.id,
            member_id=mid,
            member_type=mtype,
        ))

    await db.commit()
    await db.refresh(room)
    # reload members
    result = await db.execute(
        select(ChatRoom).where(ChatRoom.id == room.id).options(selectinload(ChatRoom.members))
    )
    return result.scalar_one()


async def soft_delete_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    sender_id: uuid.UUID,
    sender_type: str,
) -> Optional[ChatMessage]:
    result = await db.execute(
        select(ChatMessage).where(
            and_(
                ChatMessage.id == message_id,
                ChatMessage.sender_id == sender_id,
                ChatMessage.sender_type == sender_type,
                ChatMessage.is_deleted == False,
            )
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        return None
    msg.is_deleted = True
    msg.content_encrypted = ""
    await db.commit()
    await db.refresh(msg)
    return msg


async def leave_room(
    db: AsyncSession,
    room_id: uuid.UUID,
    member_id: uuid.UUID,
    member_type: str,
) -> bool:
    result = await db.execute(
        select(ChatRoomMember).where(
            and_(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return False
    await db.delete(member)
    await db.flush()

    # Auto-delete custom group rooms (group_id IS NULL) when they become empty
    room_res = await db.execute(
        select(ChatRoom).options(selectinload(ChatRoom.members)).where(ChatRoom.id == room_id)
    )
    room = room_res.scalar_one_or_none()
    if room and room.group_id is None and room.room_type == RoomType.group and not room.members:
        await db.delete(room)

    await db.commit()
    return True


async def get_group_rooms_needing_key(
    db: AsyncSession,
    member_id: uuid.UUID,
    member_type: str,
) -> list[tuple[uuid.UUID, list[uuid.UUID]]]:
    """Return [(room_id, [employee_member_ids])] for group rooms where member has null room_key_encrypted."""
    result = await db.execute(
        select(ChatRoomMember.room_id)
        .join(ChatRoom, ChatRoom.id == ChatRoomMember.room_id)
        .where(
            and_(
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
                ChatRoomMember.room_key_encrypted.is_(None),
                ChatRoom.room_type == RoomType.group,
            )
        )
    )
    room_ids = list(result.scalars().all())
    if not room_ids:
        return []

    rooms_info = []
    for room_id in room_ids:
        emp_result = await db.execute(
            select(ChatRoomMember.member_id)
            .where(
                and_(
                    ChatRoomMember.room_id == room_id,
                    ChatRoomMember.member_type == "employee",
                )
            )
        )
        emp_ids = list(emp_result.scalars().all())
        rooms_info.append((room_id, emp_ids))
    return rooms_info


async def update_room_key_for_member(
    db: AsyncSession,
    room_id: uuid.UUID,
    member_id: uuid.UUID,
    member_type: str,
    room_key_encrypted: str,
) -> None:
    result = await db.execute(
        select(ChatRoomMember).where(
            and_(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.member_id == member_id,
                ChatRoomMember.member_type == member_type,
            )
        )
    )
    member = result.scalar_one_or_none()
    if member:
        member.room_key_encrypted = room_key_encrypted
        await db.commit()
