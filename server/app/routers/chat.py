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

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_token
from app.crud import chat as crud
from app.database import get_db
from app.models.student import Student
from app.models.app_user import AppUser
from app.routers.student_auth import get_current_student_dep
from app.schemas.chat import (
    ChatRoomSchema,
    ChatMessageSchema,
    UpdatePublicKeyRequest,
    RoomKeyUpdate,
)
from app.websocket_manager import manager

router = APIRouter(prefix="/chat", tags=["chat"])

_bearer = HTTPBearer()


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
    raise HTTPException(status_code=401, detail="Invalid role for chat")


# ── Helpers ───────────────────────────────────────────────────────────────────

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
        "reply_to_id": str(msg.reply_to_id) if msg.reply_to_id else None,
        "is_deleted": msg.is_deleted,
        "created_at": msg.created_at.isoformat(),
    }


async def _serialize_room(room, db: AsyncSession, member_id: uuid.UUID, member_type: str) -> dict:
    members_out = []
    for m in room.members:
        name = await crud.get_member_name(db, m.member_id, m.member_type)
        pk = await crud.get_member_public_key(db, m.member_id, m.member_type)
        user_key = f"{m.member_type.value}:{m.member_id}"
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
    rooms = await crud.get_rooms_for_member(db, me.member_id, me.member_type)
    result = []
    for room in rooms:
        result.append(await _serialize_room(room, db, me.member_id, me.member_type))
    return result


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
    await crud.mark_read(db, room_id, me.member_id, me.member_type)
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
    if role == "student":
        result = await db.execute(select(Student).where(Student.id == uuid.UUID(payload["sub"])))
        student = result.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=401, detail="Not found")
        student.public_key = body.public_key
    elif role == "app_user":
        u = await db.get(AppUser, uuid.UUID(payload["sub"]))
        if not u:
            raise HTTPException(status_code=401, detail="Not found")
        u.public_key = body.public_key
    else:
        raise HTTPException(status_code=401, detail="Invalid role")
    await db.commit()
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
        reply_to_id=uuid.UUID(body["reply_to_id"]) if body.get("reply_to_id") else None,
    )

    msg_out = await _serialize_message(msg, db)
    payload_out = {"type": "new_message", "message": msg_out}

    # Broadcast to all room members via WebSocket
    room = await crud.get_room_by_id(db, room_id)
    if room:
        for member in room.members:
            key = f"{member.member_type.value}:{member.member_id}"
            await manager.send_to_user(key, payload_out)

    return msg_out


@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2),
    me: ChatIdentity = Depends(get_chat_identity),
    db: AsyncSession = Depends(get_db),
):
    """Search students and app_users by login or phone number."""
    students = await crud.search_students(db, q, exclude_id=me.member_id if me.member_type == "student" else None)
    results = [
        {
            "id": str(s.id),
            "member_type": "student",
            "name": s.chat_display_name or f"{s.first_name} {s.last_name}",
            "portal_login": s.portal_login,
            "phone": s.phone,
            "public_key": s.public_key,
        }
        for s in students
    ]
    # Also search app_users that are NOT linked to a student
    # (linked ones already appear in the students list above)
    from sqlalchemy import or_
    app_users_res = await db.execute(
        select(AppUser).where(
            AppUser.is_active == True,
            AppUser.student_id.is_(None),  # exclude linked app_users — already shown as students
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
            key = f"{member.member_type.value}:{member.member_id}"
            await manager.send_to_user(key, payload)
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
                    reply_to_id=reply_to_id,
                )

                msg_out = await _serialize_message(msg, db)
                payload_out = {"type": "new_message", "message": msg_out}

                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for m in room.members:
                        key = f"{m.member_type.value}:{m.member_id}"
                        await manager.send_to_user(key, payload_out)

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
                        if m.member_id == member_id and m.member_type.value == member_type:
                            continue  # don't send typing to self
                        key = f"{m.member_type.value}:{m.member_id}"
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
                        if m.member_id == member_id and m.member_type.value == member_type:
                            continue
                        key = f"{m.member_type.value}:{m.member_id}"
                        await manager.send_to_user(key, read_payload)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect_user(websocket, user_key)
