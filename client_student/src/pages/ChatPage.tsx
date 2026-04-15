import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "../components/BottomNav";
import { api, ChatRoom, ChatMessage, ChatSearchResult } from "../lib/api";
import { useChatWebSocket } from "../hooks/useChatWebSocket";

const ACCEPT_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,application/vnd.oasis.opendocument.text,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.oasis.opendocument.spreadsheet";

interface DecryptedMessage extends ChatMessage {
  text: string | null;
}

interface TypingState {
  [roomId: string]: { name: string; at: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-indigo-500", "bg-emerald-500",
  "bg-rose-500", "bg-amber-500", "bg-sky-500",
];
const AVATAR_TEXT_COLORS = [
  "text-violet-500", "text-indigo-500", "text-emerald-500",
  "text-rose-500", "text-amber-500", "text-sky-500",
];

function nameHash(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return h;
}
function avatarColor(name: string) {
  return AVATAR_COLORS[nameHash(name) % AVATAR_COLORS.length];
}
function avatarTextColor(name: string) {
  return AVATAR_TEXT_COLORS[nameHash(name) % AVATAR_TEXT_COLORS.length];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatLastSeen(member: { is_online: boolean; last_seen_at: string | null }): string {
  if (member.is_online) return "онлайн";
  if (!member.last_seen_at) return "";
  const diff = Date.now() - new Date(member.last_seen_at).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return "Недавно";
  if (hours < 24) return `${hours} ч назад`;
  return `${days} дн назад`;
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long" });
}

function getStoredStudent() {
  try {
    return JSON.parse(localStorage.getItem("s_student") ?? "{}") as {
      id: string; first_name: string; last_name: string;
    };
  } catch { return { id: "", first_name: "", last_name: "" }; }
}

// ── Message text helper ─────────────────────────────────────────────────────

function decryptMsg(msg: ChatMessage): string {
  if (msg.is_deleted) return "Сообщение удалено";
  return msg.content_encrypted;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function getFileUrl(fileKey: string): string {
  if (fileKey.startsWith("http")) return fileKey;
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const token = localStorage.getItem("s_access_token") || "";
  return `${base}/chat/files/${fileKey}?token=${encodeURIComponent(token)}`;
}

function isImageMessage(msg: ChatMessage): boolean {
  return !!(msg.file_url && (msg.message_type === "image" || isImageUrl(msg.file_url)));
}
function isFileOnlyMessage(msg: ChatMessage): boolean {
  return !!(msg.file_url && (!msg.content_encrypted || msg.content_encrypted === msg.file_name));
}

function FileAttachment({ msg, isMe, onImageClick }: { msg: ChatMessage; isMe: boolean; onImageClick?: (url: string) => void }) {
  if (!msg.file_url) return null;
  const url = getFileUrl(msg.file_url);

  if (msg.message_type === "image" || isImageUrl(msg.file_url)) {
    return (
      <button onClick={() => onImageClick?.(url)} className="block cursor-zoom-in">
        <img
          src={url}
          alt={msg.file_name || "Изображение"}
          className="max-w-full rounded-2xl object-cover"
          style={{ maxHeight: 220 }}
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
        isMe
          ? "bg-white/15 hover:bg-white/25"
          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
      }`}
    >
      <svg viewBox="0 0 24 24" className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium break-all line-clamp-2">{msg.file_name || "Файл"}</div>
        {msg.file_size && (
          <div className={`text-xs ${isMe ? "opacity-70" : "text-gray-400 dark:text-gray-500"}`}>
            {formatFileSize(msg.file_size)}
          </div>
        )}
      </div>
      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ChatPage() {
  const student = getStoredStudent();
  const myId = student.id;
  const myMemberType = (localStorage.getItem("s_role") ?? "student") === "app_user" ? "app_user" : "student";


  // WS is enabled only after the first REST call succeeds — this guarantees
  // the access token is fresh (auto-refreshed on 401) before WS tries to connect.
  const [wsEnabled, setWsEnabled] = useState(false);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // id → true means this message is currently being sent (spinner)
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  // room_id → last_read_at of the other member (for ✓✓)
  const [peerReadAt, setPeerReadAt] = useState<Record<string, string | null>>({});

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [typing, setTyping] = useState<TypingState>({});
  const [ctxMsgId, setCtxMsgId] = useState<string | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [swipedRoomId, setSwipedRoomId] = useState<string | null>(null);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  const swipeTouchRef = useRef<{ roomId: string; startX: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showMembers, setShowMembers] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<ChatMessage | null>(null);
  const [forwardModal, setForwardModal] = useState<{ ids: string[] } | null>(null);
  const [deleteMsgConfirm, setDeleteMsgConfirm] = useState<string[] | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Search ──────────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(value.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleOpenDirectChat = async (result: ChatSearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    try {
      const room = await api.getOrCreateDirectRoom(result.id, result.member_type);
      // Refresh rooms list and open the room
      const updated = await api.getChatRooms();
      setRooms(updated);
      setSelectedRoom(room);
    } catch {
      // ignore
    }
  };

  // ── Load rooms ──────────────────────────────────────────────────────────

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await api.getChatRooms();
      setRooms(data);
      // Also update selectedRoom if it's in the new data (to pick up new room_key_encrypted)
      setSelectedRoom(prev => {
        if (!prev) return null;
        return data.find(r => r.id === prev.id) ?? prev;
      });
      // Init peerReadAt from loaded room member data
      const readMap: Record<string, string | null> = {};
      data.forEach((room) => {
        const other = room.members.find((m) => !(m.member_id === myId && m.member_type === myMemberType));
        if (other) readMap[room.id] = other.last_read_at ?? null;
      });
      setPeerReadAt(readMap);
      // Token is now guaranteed fresh (auto-refreshed on 401) — safe to open WS
      setWsEnabled(true);
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  }, [myId, myMemberType]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ── Load messages ────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (room: ChatRoom) => {
    setLoadingMessages(true);
    setMessages([]);
    setHasMore(true);
    try {
      const data = await api.getChatMessages(room.id);
      const loaded = data.map((m) => ({ ...m, text: decryptMsg(m) }));
      const loadedIds = new Set(loaded.map((m) => m.id));
      setMessages((prev) => {
        const newArrivals = prev.filter((m) => !loadedIds.has(m.id));
        return [...loaded, ...newArrivals];
      });
      setHasMore(data.length === 50);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadMoreMessages = async () => {
    if (!selectedRoom || !hasMore || messages.length === 0) return;
    const oldest = messages[0].created_at;
    const data = await api.getChatMessages(selectedRoom.id, oldest);
    if (data.length === 0) { setHasMore(false); return; }
    setMessages((prev) => [...data.map((m) => ({ ...m, text: decryptMsg(m) })), ...prev]);
    setHasMore(data.length === 50);
  };

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
    }
  }, [selectedRoom, loadMessages]);

  // Persist unread count to localStorage so BottomNav can show it on any page
  useEffect(() => {
    const total = rooms.reduce((sum, r) => sum + (r.unread_count ?? 0), 0);
    localStorage.setItem("s_chat_unread", String(total));
    window.dispatchEvent(new Event("storage"));
  }, [rooms]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── WebSocket ────────────────────────────────────────────────────────────

  // When WS reconnects after a drop, reload messages to catch anything missed offline
  const selectedRoomRef = useRef(selectedRoom);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);
  const sendReadRef = useRef<(roomId: string) => void>(() => {});

  const handleReconnect = useCallback(() => {
    const room = selectedRoomRef.current;
    if (room) loadMessages(room);
  }, [loadMessages]);

  const { sendTyping, sendRead, wsConnected } = useChatWebSocket({
    enabled: wsEnabled,
    onReconnect: handleReconnect,
    onMessage: useCallback(
      (msg) => {
        if (msg.type === "new_message") {
          const incoming = msg.message;
          const activeRoom = selectedRoomRef.current;
          setRooms((prev) => prev.map((r) => {
            if (r.id !== incoming.room_id) return r;
            return {
              ...r,
              last_message: {
                content_encrypted: incoming.content_encrypted,
                created_at: incoming.created_at,
                sender_type: incoming.sender_type,
              },
              unread_count: activeRoom?.id === r.id ? 0 : (r.unread_count ?? 0) + 1,
            };
          }));
          if (activeRoom?.id === incoming.room_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, { ...incoming, text: decryptMsg(incoming) }];
            });
            sendReadRef.current(incoming.room_id);
          }
        }
        if (msg.type === "message_deleted") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.message_id
                ? { ...m, is_deleted: true, text: "Сообщение удалено", content_encrypted: "" }
                : m
            )
          );
        }
        if (msg.type === "message_edited") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.message.id ? { ...msg.message, text: decryptMsg(msg.message) } : m
            )
          );
        }
        if (msg.type === "read_receipt") {
          // Ignore our own read receipts — we're the sender, not the peer
          if (msg.reader_id !== myId) {
            setPeerReadAt((prev) => ({ ...prev, [msg.room_id]: msg.read_at }));
          }
        }
        if (msg.type === "typing") {
          setTyping((prev) => ({ ...prev, [msg.room_id]: { name: msg.sender_name, at: Date.now() } }));
          setTimeout(() => {
            setTyping((prev) => {
              const next = { ...prev };
              if (next[msg.room_id]?.at && Date.now() - next[msg.room_id].at > 2900) delete next[msg.room_id];
              return next;
            });
          }, 3000);
        }
      },
      [myId]
    ),
  });

  sendReadRef.current = sendRead;

  // Mark room as read when opening it — via WS so sender gets read_receipt broadcast
  useEffect(() => {
    if (selectedRoom && wsConnected) {
      sendRead(selectedRoom.id);
    }
  }, [selectedRoom, wsConnected, sendRead]);

  // ── Send message (via REST — надёжно, WS только для получения) ──────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSendError("Файл слишком большой (макс. 10 МБ)");
      return;
    }
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setPendingFilePreview(URL.createObjectURL(file));
    } else {
      setPendingFilePreview(null);
    }
    e.target.value = "";
  };

  const clearPendingFile = () => {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    setPendingFile(null);
    setPendingFilePreview(null);
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !pendingFile) || !selectedRoom || sending || uploading) return;
    const text = inputText.trim() || (pendingFile ? pendingFile.name : "");
    if (editingId) {
      const id = editingId;
      setEditingId(null);
      setInputText("");
      setSending(true);
      try {
        const updated = await api.editMessage(id, text);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...updated, text: decryptMsg(updated) } : m))
        );
      } catch (e: any) {
        setSendError(e?.message ?? "Не удалось изменить сообщение");
        setInputText(text);
        setEditingId(id);
      } finally {
        setSending(false);
      }
      return;
    }
    const fileToSend = pendingFile;
    const tempId = `sending-${Date.now()}`;
    setSendError(null);
    setInputText("");
    clearPendingFile();
    setSending(true);
    setSendingIds((s) => new Set(s).add(tempId));
    try {
      let msgType = "text";
      let fileOpts: { file_url?: string; file_name?: string; file_size?: number } | undefined;
      if (fileToSend) {
        setUploading(true);
        const uploaded = await api.uploadChatFile(fileToSend);
        setUploading(false);
        msgType = uploaded.message_type;
        fileOpts = {
          file_url: uploaded.file_url,
          file_name: uploaded.file_name,
          file_size: uploaded.file_size,
        };
      }
      const sent = await api.sendMessage(selectedRoom.id, text, msgType, undefined, fileOpts);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, { ...sent, text: decryptMsg(sent) }];
      });
    } catch (e: any) {
      setSendError(e?.message ?? "Не удалось отправить сообщение");
      if (!fileToSend) setInputText(text);
    } finally {
      setSending(false);
      setUploading(false);
      setSendingIds((s) => { const n = new Set(s); n.delete(tempId); return n; });
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    setCtxMsgId(null);
    setDeleteMsgConfirm([msgId]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const confirmDeleteSelected = () => {
    setDeleteMsgConfirm(Array.from(selectedIds));
  };
  const performDelete = async () => {
    if (!deleteMsgConfirm) return;
    const ids = deleteMsgConfirm;
    setDeleteMsgConfirm(null);
    clearSelection();
    for (const id of ids) {
      try {
        await api.deleteMessage(id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, is_deleted: true, text: "Сообщение удалено", content_encrypted: "" }
              : m
          )
        );
      } catch { /* ignore */ }
    }
  };
  const startEditing = (msg: ChatMessage) => {
    if (msg.sender_id !== myId || msg.sender_type !== myMemberType || msg.is_deleted || msg.file_url) return;
    setEditingId(msg.id);
    setInputText(msg.content_encrypted);
    clearPendingFile();
  };
  const cancelEditing = () => {
    setEditingId(null);
    setInputText("");
  };
  const doForward = async (targetRoomId: string) => {
    if (!forwardModal) return;
    const ids = forwardModal.ids;
    setForwardModal(null);
    clearSelection();
    try {
      await api.forwardMessages(ids, targetRoomId);
    } catch {
      setSendError("Ошибка пересылки");
    }
  };

  const handleMsgPointerDown = (msg: ChatMessage) => {
    if (msg.is_deleted) return;
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setActionSheet(msg);
    }, 450);
  };
  const handleMsgPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    setDeletingRoom(true);
    setConfirmDeleteRoomId(null);
    setSwipedRoomId(null);
    try {
      await api.leaveRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (selectedRoom?.id === roomId) setSelectedRoom(null);
    } catch { /* ignore */ } finally {
      setDeletingRoom(false);
    }
  };

  const handleSwipeTouchStart = (e: React.TouchEvent, roomId: string) => {
    swipeTouchRef.current = { roomId, startX: e.touches[0].clientX };
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent, roomId: string) => {
    if (!swipeTouchRef.current || swipeTouchRef.current.roomId !== roomId) return;
    const deltaX = e.changedTouches[0].clientX - swipeTouchRef.current.startX;
    swipeTouchRef.current = null;
    if (deltaX < -50) {
      setSwipedRoomId(roomId);
    } else if (deltaX > 20) {
      setSwipedRoomId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (selectedRoom) {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      sendTyping(selectedRoom.id);
      typingTimer.current = setTimeout(() => {}, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Room display name ────────────────────────────────────────────────────

  function isMe(m: { member_id: string; member_type: string }): boolean {
    if (m.member_id === myId && m.member_type === myMemberType) return true;
    // app_user with linked student: room might have been created under student identity
    const stored = getStoredStudent() as { id: string; student_id?: string | null };
    if (stored.student_id && m.member_id === stored.student_id && m.member_type === "student") return true;
    return false;
  }

  function getRoomDisplayName(room: ChatRoom): string {
    if (room.name) return room.name;
    if (room.room_type === "direct") {
      const other = room.members.find((m) => !isMe(m));
      return other?.name ?? "Личный чат";
    }
    return "Групповой чат";
  }

  function getRoomAvatar(room: ChatRoom): string {
    return getRoomDisplayName(room);
  }

  // ── Group messages by date ───────────────────────────────────────────────

  function groupByDate(msgs: DecryptedMessage[]) {
    const groups: { date: string; messages: DecryptedMessage[] }[] = [];
    let currentDate = "";
    for (const m of msgs) {
      const day = formatDay(m.created_at);
      if (day !== currentDate) {
        currentDate = day;
        groups.push({ date: day, messages: [] });
      }
      groups[groups.length - 1].messages.push(m);
    }
    return groups;
  }

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count ?? 0), 0);

  // ── Room list ────────────────────────────────────────────────────────────

  if (!selectedRoom) {
    return (
      <div className="bg-cream dark:bg-gray-900 min-h-screen pb-24 flex flex-col max-w-[430px] mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 px-4 pt-12 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Чаты</h1>
          {/* Search bar */}
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по логину или телефону..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 border border-gray-100 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white dark:focus:bg-gray-700 transition"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {searchQuery.trim().length >= 2 && (
          <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            {searching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                Поиск...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">Никого не найдено</div>
            ) : (
              <ul>
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => handleOpenDirectChat(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                    >
                      <div className={`w-9 h-9 rounded-full ${avatarColor(r.name)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-xs">{getInitials(r.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{r.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {r.portal_login && <span>@{r.portal_login}</span>}
                          {r.portal_login && r.phone && <span className="mx-1">·</span>}
                          {r.phone && <span>{r.phone}</span>}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loadingRooms ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Чатов пока нет.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">Преподаватель добавит вас в групповой чат.</p>
          </div>
        ) : (
          <>
          <ul className="flex-1 bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
            {rooms.map((room) => {
              const name = getRoomDisplayName(room);
              const lastTime = room.last_message
                ? formatTime(room.last_message.created_at)
                : "";
              const otherMember = room.room_type === "direct"
                ? room.members.find((m) => !isMe(m))
                : null;
              const isSwiped = swipedRoomId === room.id;
              return (
                <li
                  key={room.id}
                  className="relative overflow-hidden"
                  onTouchStart={(e) => handleSwipeTouchStart(e, room.id)}
                  onTouchEnd={(e) => handleSwipeTouchEnd(e, room.id)}
                >
                  {/* Delete button revealed on swipe */}
                  <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
                    <button
                      onClick={() => setConfirmDeleteRoomId(room.id)}
                      className="flex flex-col items-center gap-1 text-white"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                      <span className="text-[10px] font-medium">Удалить</span>
                    </button>
                  </div>
                  {/* Sliding content */}
                  <div
                    style={{
                      transform: `translateX(${isSwiped ? -80 : 0}px)`,
                      transition: "transform 0.2s ease",
                    }}
                    onClick={() => {
                      if (isSwiped) { setSwipedRoomId(null); return; }
                      setSelectedRoom(room);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full ${avatarColor(name)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{getInitials(name)}</span>
                      </div>
                      {otherMember && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${otherMember.is_online ? "bg-green-400" : "bg-gray-300"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{lastTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {otherMember
                            ? formatLastSeen(otherMember)
                            : room.last_message ? "•••" : "Нет сообщений"}
                        </span>
                        {room.unread_count > 0 && (
                          <span className="bg-brand-700 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Confirm delete dialog */}
          {confirmDeleteRoomId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">Удалить чат?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Чат будет удалён из вашего списка. Это действие нельзя отменить.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmDeleteRoomId(null); setSwipedRoomId(null); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(confirmDeleteRoomId)}
                    disabled={deletingRoom}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deletingRoom ? "Удаление..." : "Удалить"}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
        <BottomNav chatUnread={totalUnread} />
      </div>
    );
  }

  // ── Message view ─────────────────────────────────────────────────────────

  const groups = groupByDate(messages.filter((m) => !m.is_deleted));
  const roomName = getRoomDisplayName(selectedRoom);
  const typingInfo = typing[selectedRoom.id];

  return (
    <div className="bg-cream dark:bg-gray-900 min-h-screen flex flex-col max-w-[430px] mx-auto">
      {/* Top bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-30">
        <div className="flex items-center gap-3 px-4 pt-10 pb-3">
          <button
            onClick={() => { setSelectedRoom(null); loadRooms(); }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
          <div className={`w-9 h-9 rounded-full ${avatarColor(roomName)} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-xs">{getInitials(roomName)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{roomName}</div>
            {typingInfo ? (
              <div className="text-xs text-brand-600 animate-pulse">{typingInfo.name} печатает...</div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                {!wsConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-300 animate-pulse" />
                    Подключение...
                  </>
                ) : selectedRoom.room_type === "direct" ? (() => {
                  const other = selectedRoom.members.find((m) => !isMe(m));
                  return other ? (
                    <>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${other.is_online ? "bg-green-400" : "bg-gray-300"}`} />
                      {formatLastSeen(other)}
                    </>
                  ) : null;
                })() : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-400" />
                    {`${selectedRoom.members.length} участников`}
                  </>
                )}
              </div>
            )}
          </div>
          </button>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/30 border-t border-brand-100 dark:border-brand-900/40">
            <button onClick={clearSelection} className="p-1.5 rounded-full hover:bg-brand-100 dark:hover:bg-brand-900/50">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">Выбрано: {selectedIds.size}</span>
            <button
              onClick={() => setForwardModal({ ids: Array.from(selectedIds) })}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200"
            >
              Переслать
            </button>
            <button
              onClick={confirmDeleteSelected}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-600"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      {/* Members bottom sheet */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMembers(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white dark:bg-gray-800 rounded-t-2xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Участники · {selectedRoom.members.length}</h3>
              <button onClick={() => setShowMembers(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto">
              {selectedRoom.members.map((m) => (
                <div key={`${m.member_type}-${m.member_id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-full ${avatarColor(m.name ?? "")} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-xs">{getInitials(m.name ?? "?")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {m.name ?? "Неизвестно"}
                      {isMe(m) && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(вы)</span>}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{m.member_type === "employee" ? "Преподаватель" : "Ученик"}</div>
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.is_online ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600"}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-[88px] pb-[80px] flex flex-col"
        onClick={() => setCtxMsgId(null)}
      >
        <div className="mt-auto">
        {/* Load more */}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadMoreMessages}
              className="text-xs text-brand-600 font-medium px-4 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 transition"
            >
              Загрузить ранее
            </button>
          </div>
        )}

        {loadingMessages ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">Нет сообщений</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs">Напишите первым!</p>
          </div>
        ) : (
          groups.map(({ date, messages: dayMsgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex justify-center my-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 font-medium shadow-sm">{date}</span>
              </div>

              {dayMsgs.map((msg, idx) => {
                const isMe = msg.sender_id === myId && msg.sender_type === myMemberType;
                const isCtx = ctxMsgId === msg.id;
                const prev = dayMsgs[idx - 1];
                const next = dayMsgs[idx + 1];
                const sameSenderPrev = prev && prev.sender_id === msg.sender_id && prev.sender_type === msg.sender_type;
                const sameSenderNext = next && next.sender_id === msg.sender_id && next.sender_type === msg.sender_type;
                const isFirst = !sameSenderPrev;
                const isLast = !sameSenderNext;
                const imgOnly = !msg.is_deleted && isImageMessage(msg) && isFileOnlyMessage(msg);
                const isSelected = selectedIds.has(msg.id);
                const inSelectionMode = selectedIds.size > 0;

                const timeBlock = (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] ml-2 whitespace-nowrap align-bottom ${
                    imgOnly ? "text-white/80" : isMe ? "text-brand-300" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {msg.edited_at && <span className="italic mr-0.5">изменено</span>}
                    {formatTime(msg.created_at)}
                    {isMe && !msg.is_deleted && (() => {
                      const isSending = sendingIds.has(msg.id);
                      const peerRead = peerReadAt[msg.room_id];
                      const isRead = peerRead != null && new Date(msg.created_at) <= new Date(peerRead);
                      if (isSending) return (
                        <span className="ml-0.5 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                      );
                      if (isRead) return (
                        <svg viewBox="0 0 16 16" className="ml-0.5 w-3.5 h-3.5 inline-block text-brand-300" fill="currentColor">
                          <path d="m7.734666666666667 9.173266666666667 0.9413333333333332 0.9413333333333332 5.643666666666666 -5.6437333333333335 0.9428666666666665 0.9428066666666666 -6.586533333333333 6.586526666666666 -4.242666666666667 -4.242666666666667 0.9428066666666666 -0.9427999999999999 1.4165266666666665 1.4165333333333332 0.9423333333333332 0.9416666666666667 -0.0003333333333333333 0.0003333333333333333Zm0.0011333333333333332 -1.8851333333333333 3.3017333333333334 -3.3018066666666663 0.9402 0.9401866666666666 -3.3017333333333334 3.301753333333333 -0.9402 -0.9401333333333333Zm-1.88448 3.7700666666666667 -0.9420133333333333 0.942L0.6666666666666666 7.757533333333333l0.9428066666666666 -0.9427999999999999 0.9420133333333333 0.9420666666666666 -0.0007933333333333334 0.0007333333333333333 3.3006266666666666 3.3006666666666664Z" />
                        </svg>
                      );
                      return (
                        <svg viewBox="0 0 16 16" className="ml-0.5 w-3.5 h-3.5 inline-block" fill="currentColor">
                          <path d="m6.6664666666666665 10.113933333333332 6.128266666666666 -6.128253333333333 0.9427999999999999 0.9428066666666666L6.6664666666666665 11.999533333333334l-4.24264 -4.2425999999999995 0.9428133333333333 -0.9427999999999999 3.2998266666666667 3.2998Z" />
                        </svg>
                      );
                    })()}
                  </span>
                );

                return (
                  <div
                    key={msg.id}
                    className={`flex items-center ${isMe ? "justify-end" : "justify-start"} ${isFirst && idx > 0 ? "mt-3" : "mt-0.5"} ${
                      isSelected ? "bg-brand-100/50 dark:bg-brand-900/20 -mx-4 px-4" : ""
                    }`}
                  >
                    {inSelectionMode && !msg.is_deleted && (
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2 ${
                        isSelected ? "bg-brand-700 border-brand-700" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      }`}>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    )}
                    {/* Avatar spacer / avatar */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 flex items-end justify-center">
                        {isLast && (
                          <div className={`w-7 h-7 rounded-full ${avatarColor(msg.sender_name)} flex items-center justify-center`}>
                            <span className="text-white font-bold text-[10px]">
                              {getInitials(msg.sender_name)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className="relative max-w-[75%]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
                        if (inSelectionMode) {
                          if (!msg.is_deleted) toggleSelect(msg.id);
                          return;
                        }
                        if (isMe && !msg.is_deleted) setCtxMsgId(isCtx ? null : msg.id);
                        else setCtxMsgId(null);
                      }}
                      onTouchStart={() => handleMsgPointerDown(msg)}
                      onTouchEnd={handleMsgPointerUp}
                      onTouchMove={handleMsgPointerUp}
                      onMouseDown={() => handleMsgPointerDown(msg)}
                      onMouseUp={handleMsgPointerUp}
                      onMouseLeave={handleMsgPointerUp}
                      onContextMenu={(e) => {
                        if (msg.is_deleted) return;
                        e.preventDefault();
                        setActionSheet(msg);
                      }}
                    >
                      <div className={`relative text-sm leading-relaxed select-none ${
                        imgOnly ? "overflow-hidden rounded-2xl" : "px-3 py-1.5"
                      } ${
                        imgOnly ? "" :
                        isMe
                          ? `rounded-2xl ${isLast ? "rounded-br-sm" : ""}`
                          : `rounded-2xl ${isLast ? "rounded-bl-sm" : ""}`
                      } ${
                        msg.is_deleted
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 italic"
                          : isMe
                          ? "bg-brand-700 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                      }`}>
                        {/* Sender name inside bubble */}
                        {!isMe && isFirst && !msg.is_deleted && (
                          <div className={`text-xs font-semibold mb-0.5 ${avatarTextColor(msg.sender_name)}`}>
                            {msg.sender_name}
                          </div>
                        )}

                        {/* Forwarded chip */}
                        {!msg.is_deleted && msg.forwarded_from_sender_name && (
                          <div className={`flex items-center gap-1 text-[11px] mb-0.5 italic ${
                            isMe ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                          }`}>
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                              <polyline points="15 14 20 9 15 4" />
                              <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                            </svg>
                            <span>Переслано от {msg.forwarded_from_sender_name}</span>
                          </div>
                        )}

                        {!msg.is_deleted && msg.file_url && (
                          <FileAttachment msg={msg} isMe={isMe} onImageClick={setLightboxUrl} />
                        )}

                        {msg.is_deleted ? (
                          <span className="text-xs">Сообщение удалено {timeBlock}</span>
                        ) : imgOnly ? (
                          <div className="absolute bottom-2 right-2 bg-black/50 rounded-full px-2 py-0.5">{timeBlock}</div>
                        ) : (
                          <span>
                            {msg.content_encrypted && (!msg.file_url || msg.content_encrypted !== msg.file_name) ? msg.content_encrypted : null}
                            {timeBlock}
                          </span>
                        )}
                      </div>

                      {/* Delete button for own messages */}
                      {isCtx && isMe && !msg.is_deleted && !inSelectionMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                          className="absolute -top-1 -left-2 text-xs text-red-500 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-1 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition z-10"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-3 py-3 z-30">
        {editingId && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/30 rounded-xl border border-brand-100 dark:border-brand-900/40">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-brand-700 dark:text-brand-300">Редактирование</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {messages.find((m) => m.id === editingId)?.content_encrypted ?? ""}
              </div>
            </div>
            <button onClick={cancelEditing} className="p-1 rounded-full hover:bg-brand-100 dark:hover:bg-brand-900/50">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {sendError && (
          <div className="flex items-start gap-2 mb-2 px-1 py-2 bg-red-50 dark:bg-red-900/30 rounded-xl text-xs text-red-600 dark:text-red-400">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="flex-1">{sendError}</span>
            <button onClick={() => setSendError(null)} className="text-red-400">✕</button>
          </div>
        )}
        {/* Pending file preview */}
        {pendingFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {pendingFilePreview ? (
              <img src={pendingFilePreview} alt="" className="w-10 h-10 rounded object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-700 dark:text-gray-200 truncate">{pendingFile.name}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{formatFileSize(pendingFile.size)}</div>
            </div>
            <button onClick={clearPendingFile} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95"
            title="Прикрепить файл"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            rows={1}
            placeholder="Сообщение..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white dark:focus:bg-gray-700 transition max-h-28"
            style={{ lineHeight: "1.4" }}
          />
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !pendingFile) || sending || uploading}
            className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition active:scale-95"
          >
            {sending || uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Action sheet (long-press) */}
      {actionSheet && (() => {
        const m = actionSheet;
        const mine = m.sender_id === myId && m.sender_type === myMemberType;
        const canEdit = mine && !m.is_deleted && !m.file_url;
        const canDelete = mine && !m.is_deleted;
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setActionSheet(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white dark:bg-gray-800 rounded-t-2xl pb-4 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center py-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <button
                onClick={() => { toggleSelect(m.id); setActionSheet(null); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Выбрать</span>
              </button>
              <button
                onClick={() => { setForwardModal({ ids: [m.id] }); setActionSheet(null); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="15 14 20 9 15 4" />
                  <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                </svg>
                <span>Переслать</span>
              </button>
              {canEdit && (
                <button
                  onClick={() => { startEditing(m); setActionSheet(null); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  <span>Изменить</span>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => { handleDeleteMessage(m.id); setActionSheet(null); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                  <span>Удалить</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Forward modal */}
      {forwardModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setForwardModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Переслать</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Сообщений: {forwardModal.ids.length}</p>
              </div>
              <button onClick={() => setForwardModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto">
              {rooms.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Нет доступных чатов</p>
              ) : (
                rooms.map((room) => {
                  const name = getRoomDisplayName(room);
                  return (
                    <button
                      key={room.id}
                      onClick={() => doForward(room.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                    >
                      <div className={`w-10 h-10 rounded-full ${avatarColor(name)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-xs">{getInitials(name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {room.room_type === "group" ? `${room.members.length} участников` : "Личный чат"}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete messages confirm */}
      {deleteMsgConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
              {deleteMsgConfirm.length > 1 ? `Удалить сообщения (${deleteMsgConfirm.length})?` : "Удалить сообщение?"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteMsgConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Отмена
              </button>
              <button
                onClick={performDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
