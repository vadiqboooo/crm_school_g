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
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_token
from app.crud import chat as crud
from app.database import get_db
from app.models.student import Student
from app.routers.student_auth import get_current_student_dep
from app.schemas.chat import (
    ChatRoomSchema,
    ChatMessageSchema,
    UpdatePublicKeyRequest,
    RoomKeyUpdate,
)
from app.websocket_manager import manager

router = APIRouter(prefix="/chat", tags=["chat"])


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
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    rooms = await crud.get_rooms_for_member(db, student.id, "student")
    result = []
    for room in rooms:
        result.append(await _serialize_room(room, db, student.id, "student"))
    return result


@router.get("/rooms/{room_id}/messages")
async def get_messages(
    room_id: uuid.UUID,
    before: Optional[str] = Query(None, description="ISO8601 datetime for pagination"),
    limit: int = Query(50, le=100),
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, student.id, "student"):
        raise HTTPException(status_code=403, detail="Not a member of this room")

    before_dt = None
    if before:
        before_dt = datetime.fromisoformat(before)

    messages = await crud.get_messages(db, room_id, before=before_dt, limit=limit)
    return [await _serialize_message(m, db) for m in messages]


@router.post("/rooms/{room_id}/read")
async def mark_read(
    room_id: uuid.UUID,
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, student.id, "student"):
        raise HTTPException(status_code=403, detail="Not a member of this room")
    await crud.mark_read(db, room_id, student.id, "student")
    return {"ok": True}


@router.patch("/public-key")
async def update_public_key(
    body: UpdatePublicKeyRequest,
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    student.public_key = body.public_key
    await db.commit()
    return {"ok": True}


@router.get("/members/{member_id}/public-key")
async def get_public_key(
    member_id: uuid.UUID,
    member_type: str = Query("student"),
    student: Student = Depends(get_current_student_dep),
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
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, student.id, "student"):
        raise HTTPException(status_code=403, detail="Not a member of this room")

    content_encrypted = body.get("content_encrypted", "").strip()
    if not content_encrypted:
        raise HTTPException(status_code=422, detail="content_encrypted required")

    msg = await crud.create_message(
        db,
        room_id=room_id,
        sender_id=student.id,
        sender_type="student",
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
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    """Search students by portal_login or phone number."""
    students = await crud.search_students(db, q, exclude_id=student.id)
    return [
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


@router.post("/rooms/direct")
async def get_or_create_direct_room(
    body: dict,
    student: Student = Depends(get_current_student_dep),
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
        member_a_id=student.id,
        member_a_type="student",
        member_b_id=other_id,
        member_b_type=other_type,
    )
    return await _serialize_room(room, db, student.id, "student")


@router.patch("/rooms/{room_id}/room-key")
async def update_room_key(
    room_id: uuid.UUID,
    body: RoomKeyUpdate,
    student: Student = Depends(get_current_student_dep),
    db: AsyncSession = Depends(get_db),
):
    if not await crud.is_member(db, room_id, student.id, "student"):
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
    # Authenticate
    payload = decode_token(token)
    if not payload or payload.get("role") != "student":
        await websocket.close(code=4001)
        return

    student_id_str = payload.get("sub")
    try:
        student_id = uuid.UUID(student_id_str)
    except Exception:
        await websocket.close(code=4001)
        return

    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student or student.status != "active":
        await websocket.close(code=4001)
        return

    await websocket.accept()
    user_key = f"student:{student_id}"
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

                if not await crud.is_member(db, room_id, student_id, "student"):
                    continue

                reply_to_id = uuid.UUID(reply_to_id_str) if reply_to_id_str else None

                msg = await crud.create_message(
                    db,
                    room_id=room_id,
                    sender_id=student_id,
                    sender_type="student",
                    content_encrypted=content_encrypted,
                    message_type=message_type,
                    reply_to_id=reply_to_id,
                )

                msg_out = await _serialize_message(msg, db)
                payload_out = {"type": "new_message", "message": msg_out}

                # Deliver to all room members
                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for member in room.members:
                        key = f"{member.member_type.value}:{member.member_id}"
                        await manager.send_to_user(key, payload_out)

            elif msg_type == "typing":
                room_id_str = data.get("room_id")
                if not room_id_str:
                    continue
                try:
                    room_id = uuid.UUID(room_id_str)
                except Exception:
                    continue

                if not await crud.is_member(db, room_id, student_id, "student"):
                    continue

                sender_name = student.chat_display_name or f"{student.first_name} {student.last_name}"
                typing_payload = {
                    "type": "typing",
                    "room_id": room_id_str,
                    "sender_id": str(student_id),
                    "sender_name": sender_name,
                }

                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for member in room.members:
                        if member.member_id == student_id and member.member_type.value == "student":
                            continue  # don't send typing to self
                        key = f"{member.member_type.value}:{member.member_id}"
                        await manager.send_to_user(key, typing_payload)

            elif msg_type == "read":
                room_id_str = data.get("room_id")
                if not room_id_str:
                    continue
                try:
                    room_id = uuid.UUID(room_id_str)
                except Exception:
                    continue
                read_at = await crud.mark_read(db, room_id, student_id, "student")
                # Broadcast read receipt so sender sees ✓✓
                read_payload = {
                    "type": "read_receipt",
                    "room_id": room_id_str,
                    "reader_id": str(student_id),
                    "read_at": read_at.isoformat() if read_at else None,
                }
                room = await crud.get_room_by_id(db, room_id)
                if room:
                    for member in room.members:
                        if member.member_id == student_id and member.member_type.value == "student":
                            continue
                        key = f"{member.member_type.value}:{member.member_id}"
                        await manager.send_to_user(key, read_payload)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect_user(websocket, user_key)
