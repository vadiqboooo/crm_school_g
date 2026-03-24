import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import String, Text, ForeignKey, Boolean, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RoomType(str, enum.Enum):
    group = "group"
    direct = "direct"


class MemberType(str, enum.Enum):
    student = "student"
    employee = "employee"


class MessageType(str, enum.Enum):
    text = "text"
    image = "image"
    sticker = "sticker"
    system = "system"


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_type: Mapped[RoomType] = mapped_column(SAEnum(RoomType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    members = relationship("ChatRoomMember", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")


class ChatRoomMember(Base):
    __tablename__ = "chat_room_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    member_type: Mapped[MemberType] = mapped_column(SAEnum(MemberType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    # For group rooms: room symmetric key encrypted with this member's public key (base64)
    # For direct rooms: null (shared secret derived via ECDH on client)
    room_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_read_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    room = relationship("ChatRoom", back_populates="members")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    sender_type: Mapped[MemberType] = mapped_column(SAEnum(MemberType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    # Encrypted content (base64) — server never decrypts this
    content_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(SAEnum(MessageType, values_callable=lambda x: [e.value for e in x]), default=MessageType.text)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    reply_to_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    room = relationship("ChatRoom", back_populates="messages")
    reply_to = relationship("ChatMessage", remote_side="ChatMessage.id")
