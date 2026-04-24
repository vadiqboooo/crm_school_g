"""
Chat — мессенджер с E2E шифрованием.

REST:
  GET    /chat/rooms                          — список комнат пользователя
  GET    /chat/rooms/{room_id}/messages       — история сообщений
  POST   /chat/rooms/{room_id}/read          — отметить прочитанным
  PATCH  /chat/public-key                    — обновить публичный ключ студента
  GET    /chat/members/{member_id}/public-key — получить публичный ключ участника
  PATCH  /chat/rooms/{room_id}/room-key      — обновить зашифрованный ключ комнаты

WebSocket:
  WS /chat/ws?token={jwt}
"""
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.security import decode_token
from app.crud import chat as crud
from app.database import get_db
from app.models.student import Student, StudentStatus
from app.models.app_user import AppUser
from app.models.employee import Employee
from app.models.group import Group, GroupStudent
from app.schemas.chat import (
    ChatRoomSchema,
    ChatMessageSchema,
    UpdatePublicKeyRequest,
    RoomKeyUpdate,
    EditMessageRequest,
    ForwardMessageRequest,
)
from app.websocket_manager import manager
from app.services.push import send_push_to_users

router = APIRouter(prefix="/chat", tags=["chat"])

_bearer = HTTPBearer()


def _mt(member_type) -> str:
    """Return member_type as plain string regardless of enum vs str."""
    return member_type.value if hasattr(member_type, "value") else str(member_type)


@dataclass
class ChatIdentity:
    member_id: uuid.UUID
    member_type: str   # "student" | "app_user"
    display_name: str


async def get_chat_identity(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> ChatIdentity:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    role = payload.get("role")
    if role == "student":
        student_id = uuid.UUID(payload["sub"])
        result = await db.execute(select(Student).where(Student.id == student_id))
        student = result.scalar_one_or_none()
        if not student or student.status != "active":
            raise HTTPException(status_code=401, detail="Student not found")
        return ChatIdentity(
            member_id=student.id,
            member_type="student",
            display_name=student.chat_display_name or f"{student.first_name} {student.last_name}",
        )
    if role == "app_user":
        user_id = uuid.UUID(payload["sub"])
        u = await db.get(AppUser, user_id)
        if not u or not u.is_active:
            raise HTTPException(status_code=401, detail="User not found")
        return ChatIdentity(
            member_id=u.id,
            member_type="app_user",
            display_name=u.display_name,
        )
    # Employee tokens have no "role" field — identified by "type": "access" only
    if role is None and payload.get("type") == "access":
        emp_id = uuid.UUID(payload["sub"])
        emp = await db.get(Employee, emp_id)
        if not emp or not emp.is_active:
            raise HTTPException(status_code=401, detail="Employee not found")
        return ChatIdentity(
            member_id=emp.id,
            member_type="employee",
            display_name=f"{emp.first_name} {emp.last_name}",
        )
    raise HTTPException(status_code=401, detail="Invalid role for chat")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _push_new_message(
    db: AsyncSession,
    room,
    msg,
    sender_name: str,
) -> None:
    """Send push notification to all room members except the sender (only student/app_user)."""
    recipients: list[tuple[uuid.UUID, str]] = []
    for m in room.members:
        mt = _mt(m.member_type)
        if mt not in ("student", "app_user"):
            continue
        if m.member_id == msg.sender_id and mt == _mt(msg.sender_type):
            continue
        recipients.append((m.member_id, mt))

    if not recipients:
        return

    if msg.message_type == "image":
        body = "📷 Фото"
    elif msg.file_url:
        body = f"📎 {msg.file_name or 'Файл'}"
    else:
        text = (msg.content_encrypted or "").strip()
        body = text if len(text) <= 120 else text[:117] + "…"

    title = sender_name or "Новое сообщение"
    data = {"type": "chat", "room_id": str(msg.room_id)}
    try:
        await send_push_to_users(db, recipients, title, body, data)
    except Exception:
        pass  # push errors should never break message sending


async def _serialize_message(msg, db: AsyncSession) -> dict:
    sender_name = await crud.get_member_name(db, msg.sender_id, msg.sender_type)
    return {
        "id": str(msg.id),
        "room_id": str(msg.room_id),
        "sender_id": str(msg.sender_id),
        "sender_type": msg.sender_type,
        "sender_name": sender_name,
        "content_encrypted": msg.content_encrypted,
        "message_type": msg.message_type,
        "file_url": msg.file_url,
        "file_name": msg.file_name,
        "file_size": msg.file_size,
        "reply_to_id": str(msg.reply_to_id) if msg.reply_to_id else None,
        "is_deleted": msg.is_deleted,
        "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
        "forwarded_from_sender_name": msg.forwarded_from_sender_name,
        "created_at": msg.created_at.isoformat(),
    }


async def _serialize_room(room, db: AsyncSession, member_id: uuid.UUID, member_type: str) -> dict:
    # Deduplicate: if an app_user member covers the same person as a student member,
    # skip the student entry (prevents showing the same student twice).
    app_user_student_ids: set[uuid.UUID] = set()
    for m in room.members:
        if _mt(m.member_type) == "app_user":
            u = await db.get(AppUser, m.member_id)
            if u and u.student_id:
                app_user_student_ids.add(u.student_id)

    members_out = []
    for m in room.members:
        if _mt(m.member_type) == "student" and m.member_id in app_user_student_ids:
            continue  # skip: this student is already represented by an app_user member
        name = await crud.get_member_name(db, m.member_id, m.member_type)
        pk = await crud.get_member_public_key(db, m.member_id, m.member_type)
        user_key = f"{_mt(m.member_type)}:{m.member_id}"
        is_online = manager.is_user_online(user_key)
        last_seen = manager.get_last_seen(user_key)
        members_out.append({
            "member_id": str(m.member_id),
            "member_type": m.member_type,
            "name": name,
            "public_key": pk,
            "room_key_encrypted": m.room_key_encrypted if (
                m.member_id == member_id and m.member_type == member_type
            ) else None,
            "is_online": is_online,
            "last_seen_at": last_seen.isoformat() if last_seen else None,
            "last_read_at": m.last_read_at.isoformat() if m.last_read_at else None,
        })

    last_msg = await crud.get_last_message(db, room.id)
    last_msg_out = None
    if last_msg and not last_msg.is_deleted:
        last_msg_out = {
            "content_encrypted": last_msg.content_encrypted,
            "created_at": last_msg.created_at.isoformat(),
            "sender_type": last_msg.sender_type,
        }

    unread = await crud.get_unread_count(db, room.id, member_id, member_type)

    return {
        "id": str(room.id),
        "room_type": room.room_type,
        "group_id": str(room.group_id) if room.group_id else None,
        "name": room.name,
        "created_at": room.created_at.isoformat(),
        "members": members_out,
        "last_message": last_msg_out,
        "unread_count": unread,
    }


# ── REST endpoints ────────────────────────────────────────────────────────────

@router.get("/rooms")
async def get_rooms(
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    # Auto-add student/app_user to any group chat rooms for their groups (self-healing sync)
    if me.member_type in ("student", "app_user"):
        from app.models.chat import ChatRoom as ChatRoomModel, ChatRoomMember as ChatRoomMemberModel

        # For app_user: find the linked student_id to look up their groups
        student_id_for_groups: uuid.UUID | None = None
        if me.member_type == "student":
            student_id_for_groups = me.member_id
        else:
            u = await db.get(AppUser, me.member_id)
            if u and u.student_id:
                student_id_for_groups = u.student_id

        if student_id_for_groups:
            # Find all non-archived, non-trial groups for this student
            gs_res = await db.execute(
                select(GroupStudent.group_id)
                .where(
                    and_(
                        GroupStudent.student_id == student_id_for_groups,
                        GroupStudent.is_archived == False,
                        GroupStudent.is_trial == False,
                    )
                )
            )
            group_ids = list(gs_res.scalars().all())
            if group_ids:
                # Find group chat rooms for those groups
                room_res = await db.execute(
                    select(ChatRoomModel)
                    .where(
                        and_(
                            ChatRoomModel.group_id.in_(group_ids),
                            ChatRoomModel.room_type == "group",
                        )
                    )
                    .options(selectinload(ChatRoomModel.members))
                )
                group_rooms = list(room_res.scalars().all())
                added_rooms: list = []
                for room in group_rooms:
                    already_member = any(
                        m.member_id == me.member_id and m.member_type == me.member_type
                        for m in room.members
                    )
                    if not already_member:
                        db.add(ChatRoomMemberModel(
                            id=uuid.uuid4(),
                            room_id=room.id,
                            member_id=me.member_id,
                            member_type=me.member_type,
                            room_key_encrypted=None,
                        ))
                        added_rooms.append(room)
                if added_rooms:
                    await db.commit()
                    # Notify employees so CRM distributes the room key to this user
                    for room in added_rooms:
                        for m in room.members:
                            if m.member_type == "employee":
                                await manager.send_to_user(f"employee:{m.member_id}", {
                                    "type": "key_distribution_needed",
                                    "room_id": str(room.id),
                                })

    rooms = await crud.get_rooms_for_member(db, me.member_id, me.member_type)
    result = []
    for room in rooms:
        result.append(await _serialize_room(room, db, me.member_id, me.member_type))
    return result


@router.get("/rooms/{room_id}")
async def get_room(
    room_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Get single room info (members, type, name). Requester must be a member."""
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Not a member")
    room = await crud.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return await _serialize_room(room, db, me.member_id, me.member_type)


@router.get("/rooms/{room_id}/messages")
async def get_messages(
    room_id: uuid.UUID,
    before: Optional[str] = Query(None, description="ISO8601 datetime for pagination"),
    limit: int = Query(50, le=100),
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Not a member of this room")

    before_dt = None
    if before:
        before_dt = datetime.fromisoformat(before)

    messages = await crud.get_messages(db, room_id, before=before_dt, limit=limit)
    return [await _serialize_message(m, db) for m in messages]


@router.post("/rooms/{room_id}/read")
async def mark_read(
    room_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Not a member of this room")
    read_at = await crud.mark_read(db, room_id, me.member_id, me.member_type)
    # Broadcast read_receipt to other room members via WebSocket
    if read_at:
        read_payload = {
            "type": "read_receipt",
            "room_id": str(room_id),
            "reader_id": str(me.member_id),
            "read_at": read_at.isoformat(),
        }
        room = await crud.get_room_by_id(db, room_id)
        if room:
            for m in room.members:
                if m.member_id == me.member_id and _mt(m.member_type) == me.member_type:
                    continue
                key = f"{_mt(m.member_type)}:{m.member_id}"
                await manager.send_to_user(key, read_payload)
    return {"ok": True}


@router.patch("/public-key")
async def update_public_key(
    body: UpdatePublicKeyRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    role = payload.get("role")
    member_id_str = payload["sub"]
    if role == "student":
        result = await db.execute(select(Student).where(Student.id == uuid.UUID(member_id_str)))
        student = result.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=401, detail="Not found")
        student.public_key = body.public_key
        await db.commit()
        # Notify employees who can distribute the room key to this student
        rooms_info = await crud.get_group_rooms_needing_key(db, uuid.UUID(member_id_str), "student")
        for room_id, emp_ids in rooms_info:
            for emp_id in emp_ids:
                await manager.send_to_user(f"employee:{emp_id}", {
                    "type": "key_distribution_needed",
                    "room_id": str(room_id),
                })
    elif role == "app_user":
        u = await db.get(AppUser, uuid.UUID(member_id_str))
        if not u:
            raise HTTPException(status_code=401, detail="Not found")
        u.public_key = body.public_key
        await db.commit()
        # Also notify for app_user rooms
        rooms_info = await crud.get_group_rooms_needing_key(db, uuid.UUID(member_id_str), "app_user")
        for room_id, emp_ids in rooms_info:
            for emp_id in emp_ids:
                await manager.send_to_user(f"employee:{emp_id}", {
                    "type": "key_distribution_needed",
                    "room_id": str(room_id),
                })
    elif role is None and payload.get("type") == "access":
        emp = await db.get(Employee, uuid.UUID(member_id_str))
        if not emp:
            raise HTTPException(status_code=401, detail="Not found")
        emp.public_key = body.public_key
        await db.commit()
    else:
        raise HTTPException(status_code=401, detail="Invalid role")
    return {"ok": True}


@router.get("/members/{member_id}/public-key")
async def get_public_key(
    member_id: uuid.UUID,
    member_type: str = Query("student"),
    _: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    pk = await crud.get_member_public_key(db, member_id, member_type)
    if not pk:
        raise HTTPException(status_code=404, detail="Public key not found")
    return {"public_key": pk}


@router.post("/rooms/{room_id}/messages")
async def send_message(
    room_id: uuid.UUID,
    body: dict,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Not a member of this room")

    content_encrypted = body.get("content_encrypted", "").strip()
    if not content_encrypted:
        raise HTTPException(status_code=422, detail="content_encrypted required")

    msg = await crud.create_message(
        db,
        room_id=room_id,
        sender_id=me.member_id,
        sender_type=me.member_type,
        content_encrypted=content_encrypted,
        message_type=body.get("message_type", "text"),
        file_url=body.get("file_url"),
        file_name=body.get("file_name"),
        file_size=body.get("file_size"),
        reply_to_id=uuid.UUID(body["reply_to_id"]) if body.get("reply_to_id") else None,
    )

    msg_out = await _serialize_message(msg, db)
    payload_out = {"type": "new_message", "message": msg_out}

    # Broadcast to all room members via WebSocket
    room = await crud.get_room_by_id(db, room_id)
    if room:
        for member in room.members:
            key = f"{_mt(member.member_type)}:{member.member_id}"
            await manager.send_to_user(key, payload_out)
        await _push_new_message(db, room, msg, me.display_name)

    return msg_out


@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2),
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Search students, employees and app_users by name, login or phone."""
    from sqlalchemy import or_

    results = []

    # Search employees (for CRM users searching teachers/managers)
    employees = await crud.search_employees(
        db, q, exclude_id=me.member_id if me.member_type == "employee" else None
    )
    for e in employees:
        results.append({
            "id": str(e.id),
            "member_type": "employee",
            "name": f"{e.first_name} {e.last_name}",
            "portal_login": e.email,
            "phone": e.phone,
            "public_key": e.public_key,
        })

    # Search students
    students = await crud.search_students(
        db, q, exclude_id=me.member_id if me.member_type == "student" else None
    )
    for s in students:
        results.append({
            "id": str(s.id),
            "member_type": "student",
            "name": s.chat_display_name or f"{s.first_name} {s.last_name}",
            "portal_login": s.portal_login,
            "phone": s.phone,
            "public_key": s.public_key,
        })

    # Also search app_users that are NOT linked to a student
    app_users_res = await db.execute(
        select(AppUser).where(
            AppUser.is_active == True,
            AppUser.student_id.is_(None),
            AppUser.id != (me.member_id if me.member_type == "app_user" else uuid.uuid4()),
            or_(AppUser.display_name.ilike(f"%{q}%"), AppUser.login.ilike(f"%{q}%")),
        )
    )
    for u in app_users_res.scalars().all():
        results.append({
            "id": str(u.id),
            "member_type": "app_user",
            "name": u.display_name,
            "portal_login": u.login,
            "phone": None,
            "public_key": u.public_key,
        })

    return results


@router.post("/rooms/direct")
async def get_or_create_direct_room(
    body: dict,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Get or create a direct (1:1) chat room with another user."""
    other_id_str = body.get("other_id")
    other_type = body.get("other_type", "student")
    if not other_id_str:
        raise HTTPException(status_code=422, detail="other_id required")
    try:
        other_id = uuid.UUID(other_id_str)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid other_id")

    room = await crud.get_or_create_direct_room(
        db,
        member_a_id=me.member_id,
        member_a_type=me.member_type,
        member_b_id=other_id,
        member_b_type=other_type,
    )
    return await _serialize_room(room, db, me.member_id, me.member_type)


@router.post("/rooms/custom-group")
async def create_custom_group_room(
    body: dict,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Create a free-form group chat room. Any authenticated user (student, app_user, employee) can create one.
    body: { name: str, members: [{ id: str, type: str }] }
    """
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name required")
    if len(name) > 100:
        raise HTTPException(status_code=422, detail="Название не более 100 символов")

    raw_members: list[dict] = body.get("members") or []
    members: list[dict] = []
    seen = set()

    # Always include creator
    seen.add((str(me.member_id), me.member_type))
    members.append({"member_id": me.member_id, "member_type": me.member_type})

    for m in raw_members:
        mid_str = m.get("id") or m.get("member_id")
        mtype = m.get("type") or m.get("member_type", "student")
        if not mid_str:
            continue
        try:
            mid = uuid.UUID(mid_str)
        except Exception:
            continue
        key = (str(mid), mtype)
        if key in seen:
            continue
        seen.add(key)
        members.append({"member_id": mid, "member_type": mtype})

    if len(members) < 2:
        raise HTTPException(status_code=422, detail="Нужно выбрать хотя бы одного участника")

    room = await crud.create_custom_group_room(db, name=name, members=members)
    return await _serialize_room(room, db, me.member_id, me.member_type)


@router.post("/rooms/{room_id}/add-member")
async def add_member_to_room(
    room_id: uuid.UUID,
    body: dict,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Add a new member to a group chat. Only existing members can add others."""
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Вы не участник этого чата")

    room = await crud.get_room_by_id(db, room_id)
    if not room or room.room_type != "group":
        raise HTTPException(status_code=400, detail="Не групповой чат")
    if room.group_id is not None:
        raise HTTPException(status_code=403, detail="Управление участниками школьных групп недоступно")

    mid_str = body.get("member_id") or body.get("id")
    mtype = body.get("member_type") or body.get("type", "student")
    if not mid_str:
        raise HTTPException(status_code=422, detail="member_id required")
    try:
        mid = uuid.UUID(mid_str)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid member_id")

    added = await crud.add_member_to_room(db, room_id, mid, mtype)
    return {"added": added}


@router.delete("/rooms/{room_id}/members/{target_member_id}")
async def remove_member_from_room(
    room_id: uuid.UUID,
    target_member_id: uuid.UUID,
    member_type: str = "student",
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a custom group chat. Only members can remove others."""
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Вы не участник этого чата")

    room = await crud.get_room_by_id(db, room_id)
    if not room or room.room_type != "group":
        raise HTTPException(status_code=400, detail="Не групповой чат")
    if room.group_id is not None:
        raise HTTPException(status_code=403, detail="Нельзя управлять участниками школьного чата")
    if target_member_id == me.member_id and member_type == me.member_type:
        raise HTTPException(status_code=400, detail="Используйте выход из группы")

    removed = await crud.leave_room(db, room_id, target_member_id, member_type)
    if not removed:
        raise HTTPException(status_code=404, detail="Участник не найден")

    # Auto-delete empty custom group rooms
    room = await crud.get_room_by_id(db, room_id)
    if room and not room.members:
        await db.delete(room)
        await db.commit()

    return {"removed": True}


@router.patch("/rooms/{room_id}/name")
async def rename_room(
    room_id: uuid.UUID,
    body: dict,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Rename a custom group chat room. Only members can rename it."""
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Вы не участник этого чата")

    room = await crud.get_room_by_id(db, room_id)
    if not room or room.room_type != "group":
        raise HTTPException(status_code=400, detail="Не групповой чат")
    if room.group_id is not None:
        raise HTTPException(status_code=403, detail="Нельзя переименовать школьную группу")

    new_name = (body.get("name") or "").strip()
    if not new_name:
        raise HTTPException(status_code=422, detail="name required")
    if len(new_name) > 100:
        raise HTTPException(status_code=422, detail="Название не более 100 символов")

    room.name = new_name
    await db.commit()
    return {"name": new_name}


@router.post("/rooms/group")
async def create_or_get_group_room(
    body: dict,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Create (or return existing) group chat room for a school group.
    Only employees can create group rooms. All active non-trial students in the group are added.
    body: { group_id: str, member_keys: [{ member_id, member_type, room_key_encrypted }] }
    """
    if me.member_type != "employee":
        raise HTTPException(status_code=403, detail="Only employees can create group rooms")

    group_id_str = body.get("group_id")
    if not group_id_str:
        raise HTTPException(status_code=422, detail="group_id required")
    try:
        group_id = uuid.UUID(group_id_str)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid group_id")

    # Return existing room if already created (get_room_by_group_id loads members eagerly)
    existing = await crud.get_room_by_group_id(db, group_id)

    # Fetch group name (needed for both create and sync paths)
    group_res = await db.execute(select(Group).where(Group.id == group_id))
    group = group_res.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_keys: list[dict] = body.get("member_keys", [])

    if existing:
        # Sync: add any new members from member_keys not already in room
        from app.models.chat import ChatRoomMember as ChatRoomMemberModel
        existing_member_ids = {m.member_id for m in existing.members}
        new_members_added = False
        for mk in member_keys:
            try:
                mid = uuid.UUID(mk["member_id"])
            except Exception:
                continue
            if mid not in existing_member_ids:
                mt = mk.get("member_type", "student")
                db.add(ChatRoomMemberModel(
                    id=uuid.uuid4(),
                    room_id=existing.id,
                    member_id=mid,
                    member_type=mt,
                    room_key_encrypted=None,  # CRM loadRooms will distribute existing room key
                ))
                existing_member_ids.add(mid)
                new_members_added = True
        if new_members_added:
            await db.commit()
            existing = await crud.get_room_by_group_id(db, group_id)
        return await _serialize_room(existing, db, me.member_id, me.member_type)

    # Build member list from all member_keys; creator is always included
    seen_ids = set()
    members = []

    for mk in member_keys:
        mt = mk.get("member_type", "student")
        try:
            mid = uuid.UUID(mk["member_id"])
        except Exception:
            continue
        if mid in seen_ids:
            continue
        seen_ids.add(mid)
        members.append({
            "member_id": mid,
            "member_type": mt,
            "room_key_encrypted": mk.get("room_key_encrypted"),
        })

    # Ensure creator is always a member
    if me.member_id not in seen_ids:
        members.append({
            "member_id": me.member_id,
            "member_type": "employee",
            "room_key_encrypted": None,
        })

    room = await crud.create_group_room(db, group_id, group.name, members)
    return await _serialize_room(room, db, me.member_id, me.member_type)


@router.get("/rooms/group/{group_id}")
async def get_group_room_info(
    group_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Get existing group chat room for a group (to check if it exists and get member public keys)."""
    from app.models.chat import ChatRoom as ChatRoomModel
    res = await db.execute(
        select(ChatRoomModel)
        .where(ChatRoomModel.group_id == group_id)
        .options(selectinload(ChatRoomModel.members))
    )
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return await _serialize_room(room, db, me.member_id, me.member_type)


@router.get("/groups/{group_id}/students")
async def get_group_students_for_chat(
    group_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Return active students + teacher of a group with their public keys (for key distribution)."""
    if me.member_type != "employee":
        raise HTTPException(status_code=403, detail="Only employees can access this")
    result = await db.execute(
        select(Student, GroupStudent)
        .join(GroupStudent, Student.id == GroupStudent.student_id)
        .where(
            GroupStudent.group_id == group_id,
            GroupStudent.is_archived == False,
            GroupStudent.is_trial == False,
            Student.status == StudentStatus.active,
        )
    )
    rows = result.all()
    members = [
        {
            "id": str(s.id),
            "member_type": "student",
            "name": s.chat_display_name or f"{s.first_name} {s.last_name}",
            "public_key": s.public_key,
        }
        for s, _ in rows
    ]

    # Add the group teacher if different from the creator
    group_res = await db.execute(select(Group).where(Group.id == group_id))
    group = group_res.scalar_one_or_none()
    if group and group.teacher_id and group.teacher_id != me.member_id:
        teacher = await db.get(Employee, group.teacher_id)
        if teacher and teacher.is_active:
            members.append({
                "id": str(teacher.id),
                "member_type": "employee",
                "name": f"{teacher.first_name} {teacher.last_name}",
                "public_key": teacher.public_key,
            })

    return members


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    msg = await crud.soft_delete_message(db, message_id, me.member_id, me.member_type)
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено или уже удалено")
    # Broadcast to all room members so they see it in real time
    room = await crud.get_room_by_id(db, msg.room_id)
    if room:
        payload = {
            "type": "message_deleted",
            "message_id": str(message_id),
            "room_id": str(msg.room_id),
        }
        for member in room.members:
            key = f"{_mt(member.member_type)}:{member.member_id}"
            await manager.send_to_user(key, payload)
    return {"ok": True}


@router.patch("/messages/{message_id}")
async def edit_message(
    message_id: uuid.UUID,
    body: EditMessageRequest,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    from app.models.chat import ChatMessage as ChatMessageModel
    res = await db.execute(select(ChatMessageModel).where(ChatMessageModel.id == message_id))
    msg = res.scalar_one_or_none()
    if not msg or msg.is_deleted:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    if msg.sender_id != me.member_id or _mt(msg.sender_type) != me.member_type:
        raise HTTPException(status_code=403, detail="Можно редактировать только свои сообщения")
    if msg.file_url:
        raise HTTPException(status_code=400, detail="Нельзя редактировать сообщение с файлом")
    msg.content_encrypted = body.content_encrypted
    msg.edited_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(msg)
    payload = await _serialize_message(msg, db)
    payload_out = {"type": "message_edited", "message": payload}
    room = await crud.get_room_by_id(db, msg.room_id)
    if room:
        for m in room.members:
            key = f"{_mt(m.member_type)}:{m.member_id}"
            await manager.send_to_user(key, payload_out)
    return payload


@router.post("/messages/forward")
async def forward_messages(
    body: ForwardMessageRequest,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    target_room_id = uuid.UUID(body.target_room_id)
    if not await crud.is_member(db, target_room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Вы не состоите в целевом чате")
    from app.models.chat import ChatMessage as ChatMessageModel
    out: list[dict] = []
    for mid_str in body.message_ids:
        try:
            mid = uuid.UUID(mid_str)
        except ValueError:
            continue
        res = await db.execute(select(ChatMessageModel).where(ChatMessageModel.id == mid))
        src = res.scalar_one_or_none()
        if not src or src.is_deleted:
            continue
        # Check sender can access source room
        if not await crud.is_member(db, src.room_id, me.member_id, me.member_type):
            continue
        original_sender_name = (
            src.forwarded_from_sender_name
            or await crud.get_member_name(db, src.sender_id, _mt(src.sender_type))
        )
        new_msg = ChatMessageModel(
            room_id=target_room_id,
            sender_id=me.member_id,
            sender_type=me.member_type,
            content_encrypted=src.content_encrypted,
            message_type=src.message_type,
            file_url=src.file_url,
            file_name=src.file_name,
            file_size=src.file_size,
            forwarded_from_sender_name=original_sender_name,
        )
        db.add(new_msg)
        await db.flush()
        await db.refresh(new_msg)
        payload = await _serialize_message(new_msg, db)
        out.append(payload)
        # Broadcast to target room members
        target_room = await crud.get_room_by_id(db, target_room_id)
        if target_room:
            for m in target_room.members:
                key = f"{_mt(m.member_type)}:{m.member_id}"
                await manager.send_to_user(key, {"type": "new_message", "message": payload})
    await db.commit()
    return out


@router.delete("/rooms/{room_id}/full")
async def delete_room_full(
    room_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Полное удаление комнаты со всеми сообщениями. Только для сотрудников."""
    if me.member_type != "employee":
        raise HTTPException(status_code=403, detail="Only employees can delete rooms")
    from app.models.chat import ChatRoom as ChatRoomModel
    res = await db.execute(select(ChatRoomModel).where(ChatRoomModel.id == room_id))
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.delete(room)
    await db.commit()
    return {"ok": True}


@router.delete("/rooms/{room_id}")
async def leave_room(
    room_id: uuid.UUID,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Not a member")
    await crud.leave_room(db, room_id, me.member_id, me.member_type)
    return {"ok": True}


@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    me: ChatIdentity = Depends(get_chat_identity),
):
    """Upload a file to S3 for chat attachment. Returns file metadata."""
    from app.s3 import (
        ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE,
        upload_file as s3_upload, get_message_type_for_content,
    )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип файла: {content_type}",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 10 МБ)")

    original_name = file.filename or "file"
    key = await s3_upload(data, original_name, content_type)
    msg_type = get_message_type_for_content(content_type)

    return {
        "file_url": key,
        "file_name": original_name,
        "file_size": len(data),
        "message_type": msg_type,
    }


@router.get("/files/{file_key:path}")
async def serve_chat_file(
    file_key: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Proxy-serve a chat file from S3. Auth via ?token= query param (for <img src>)."""
    from app.s3 import download_file

    # Validate token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        data, content_type = download_file(file_key)
    except Exception:
        raise HTTPException(status_code=404, detail="Файл не найден")

    filename = file_key.rsplit("/", 1)[-1] if "/" in file_key else file_key

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "private, max-age=86400",
        },
    )


@router.patch("/rooms/{room_id}/room-key")
async def update_room_key(
    room_id: uuid.UUID,
    body: RoomKeyUpdate,
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, me.member_id, me.member_type):
        raise HTTPException(status_code=403, detail="Not a member of this room")
    await crud.update_room_key_for_member(
        db, room_id,
        uuid.UUID(body.member_id),
        body.member_type,
        body.room_key_encrypted,
    )
    # Notify the member that their room key was distributed
    member_ws_key = f"{body.member_type}:{body.member_id}"
    await manager.send_to_user(member_ws_key, {
        "type": "room_key_updated",
        "room_id": str(room_id),
    })
    return {"ok": True}


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Authenticate — accept both student and app_user tokens
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    role = payload.get("role")
    member_type: str
    member_id: uuid.UUID
    display_name: str

    if role == "student":
        try:
            member_id = uuid.UUID(payload["sub"])
        except Exception:
            await websocket.close(code=4001)
            return
        result = await db.execute(select(Student).where(Student.id == member_id))
        student = result.scalar_one_or_none()
        if not student or student.status != "active":
            await websocket.close(code=4001)
            return
        member_type = "student"
        display_name = student.chat_display_name or f"{student.first_name} {student.last_name}"
    elif role == "app_user":
        try:
            member_id = uuid.UUID(payload["sub"])
        except Exception:
            await websocket.close(code=4001)
            return
        app_user = await db.get(AppUser, member_id)
        if not app_user or not app_user.is_active:
            await websocket.close(code=4001)
            return
        member_type = "app_user"
        display_name = app_user.display_name
    elif role is None and payload.get("type") == "access":
        try:
            member_id = uuid.UUID(payload["sub"])
        except Exception:
            await websocket.close(code=4001)
            return
        emp = await db.get(Employee, member_id)
        if not emp or not emp.is_active:
            await websocket.close(code=4001)
            return
        member_type = "employee"
        display_name = f"{emp.first_name} {emp.last_name}"
    else:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    user_key = f"{member_type}:{member_id}"
    manager.connect_user(websocket, user_key)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "send_message":
                room_id_str = data.get("room_id")
                content_encrypted = data.get("content_encrypted", "")
                message_type = data.get("message_type", "text")
                reply_to_id_str = data.get("reply_to_id")

                if not room_id_str or not content_encrypted:
                    continue

                try:
                    room_id = uuid.UUID(room_id_str)
                except Exception:
                    continue

                if not await crud.is_member(db, room_id, member_id, member_type):
                    continue

                reply_to_id = uuid.UUID(reply_to_id_str) if reply_to_id_str else None

                msg = await crud.create_message(
                    db,
                    room_id=room_id,
                    sender_id=member_id,
                    sender_type=member_type,
                    content_encrypted=content_encrypted,
                    message_type=message_type,
                    file_url=data.get("file_url"),
                    file_name=data.get("file_name"),
                    file_size=data.get("file_size"),
                    reply_to_id=reply_to_id,
                )

                msg_out = await _serialize_message(msg, db)
                payload_out = {"type": "new_message", "message": msg_out}

                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for m in room.members:
                        key = f"{_mt(m.member_type)}:{m.member_id}"
                        await manager.send_to_user(key, payload_out)
                    sender_name = await crud.get_member_name(db, member_id, member_type)
                    await _push_new_message(db, room, msg, sender_name)

            elif msg_type == "typing":
                room_id_str = data.get("room_id")
                if not room_id_str:
                    continue
                try:
                    room_id = uuid.UUID(room_id_str)
                except Exception:
                    continue

                if not await crud.is_member(db, room_id, member_id, member_type):
                    continue

                typing_payload = {
                    "type": "typing",
                    "room_id": room_id_str,
                    "sender_id": str(member_id),
                    "sender_name": display_name,
                }

                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for m in room.members:
                        if m.member_id == member_id and _mt(m.member_type) == member_type:
                            continue  # don't send typing to self
                        key = f"{_mt(m.member_type)}:{m.member_id}"
                        await manager.send_to_user(key, typing_payload)

            elif msg_type == "read":
                room_id_str = data.get("room_id")
                if not room_id_str:
                    continue
                try:
                    room_id = uuid.UUID(room_id_str)
                except Exception:
                    continue
                read_at = await crud.mark_read(db, room_id, member_id, member_type)
                read_payload = {
                    "type": "read_receipt",
                    "room_id": room_id_str,
                    "reader_id": str(member_id),
                    "read_at": read_at.isoformat() if read_at else None,
                }
                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for m in room.members:
                        if m.member_id == member_id and _mt(m.member_type) == member_type:
                            continue
                        key = f"{_mt(m.member_type)}:{m.member_id}"
                        await manager.send_to_user(key, read_payload)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect_user(websocket, user_key)
