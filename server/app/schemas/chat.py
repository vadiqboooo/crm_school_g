import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ChatMemberSchema(BaseModel):
    member_id: str
    member_type: str  # "student" | "employee"
    name: str
    public_key: Optional[str] = None
    room_key_encrypted: Optional[str] = None  # room key encrypted for this member

    class Config:
        from_attributes = True


class ChatRoomSchema(BaseModel):
    id: str
    room_type: str  # "group" | "direct"
    group_id: Optional[str] = None
    name: Optional[str] = None
    created_at: datetime
    members: list[ChatMemberSchema] = []
    last_message: Optional[dict] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageSchema(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_type: str
    sender_name: str
    content_encrypted: str
    message_type: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to_id: Optional[str] = None
    is_deleted: bool
    edited_at: Optional[datetime] = None
    forwarded_from_sender_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EditMessageRequest(BaseModel):
    content_encrypted: str


class ForwardMessageRequest(BaseModel):
    message_ids: list[str]
    target_room_id: str


class SendMessageRequest(BaseModel):
    room_id: str
    content_encrypted: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to_id: Optional[str] = None


class UpdatePublicKeyRequest(BaseModel):
    public_key: str


class CreateDirectRoomRequest(BaseModel):
    other_member_id: str
    other_member_type: str  # "student" | "employee"


class RoomKeyUpdate(BaseModel):
    member_id: str
    member_type: str
    room_key_encrypted: str
