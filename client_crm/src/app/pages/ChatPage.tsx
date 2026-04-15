import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Plus, ChevronLeft, Users, Trash2, Loader2, AlertTriangle, Paperclip, FileText, Download, X, Search, Edit2, Forward, CornerUpRight, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useHeaderActions } from "../contexts/HeaderActionsContext";
import type { ChatRoom, ChatMessage, ChatGroupStudent, ChatSearchResult } from "../types/api";
import { useChatWebSocket, type ChatWsEvent } from "../hooks/useChatWebSocket";

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  "text-violet-600", "text-indigo-600", "text-emerald-600",
  "text-rose-600", "text-amber-600", "text-sky-600",
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

function formatLastMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  const diffDays = Math.floor((+now - +d) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return d.toLocaleDateString("ru", { weekday: "short" });
  return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
}

function lastMsgPreview(lm: { content_encrypted: string; sender_type: string }, isMe: boolean): string {
  const prefix = isMe ? "Вы: " : "";
  const text = lm.content_encrypted || "";
  return prefix + text;
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

function decryptMsg(msg: ChatMessage): string {
  if (msg.is_deleted) return "Сообщение удалено";
  return msg.content_encrypted;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const ACCEPT_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,application/vnd.oasis.opendocument.text,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.oasis.opendocument.spreadsheet";

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function getFileUrl(fileKey: string): string {
  // If already a full URL (legacy), return as-is; otherwise build backend proxy URL
  if (fileKey.startsWith("http")) return fileKey;
  const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("access_token") || "";
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
      <button
        onClick={() => onImageClick?.(url)}
        className="block cursor-zoom-in"
      >
        <img
          src={url}
          alt={msg.file_name || "Изображение"}
          className="max-w-full rounded-2xl object-cover"
          style={{ maxHeight: 240 }}
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
          ? "bg-blue-400/20 hover:bg-blue-400/30"
          : "bg-slate-100 hover:bg-slate-200"
      }`}
    >
      <FileText className="w-8 h-8 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium break-all line-clamp-2">{msg.file_name || "Файл"}</div>
        {msg.file_size && (
          <div className={`text-xs ${isMe ? "text-blue-200" : "text-slate-400"}`}>
            {formatFileSize(msg.file_size)}
          </div>
        )}
      </div>
      <Download className="w-5 h-5 flex-shrink-0 opacity-60" />
    </a>
  );
}

// ── CreateRoomModal ──────────────────────────────────────────────────────────

interface Group {
  id: string;
  name: string;
}

function CreateRoomModal({
  onCreated,
  onClose,
}: {
  onCreated: (room: ChatRoom) => void;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<ChatGroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.getGroups().then((gs) => {
      const active = gs.filter((g) => !g.is_archived);
      setGroups(active);
    }).catch(() => {});
  }, []);

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    setLoading(true);
    setStudents([]);
    try {
      const stds = await api.getGroupStudentsForChat(group.id);
      setStudents(stds);
    } catch {
      // group might not exist in chat yet — that's fine
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!selectedGroup) return;
    setCreating(true);
    try {
      const memberKeys = students.map((s) => ({
        member_id: s.id,
        member_type: s.member_type,
        room_key_encrypted: null,
      }));
      const room = await api.createOrGetGroupChatRoom(selectedGroup.id, memberKeys);
      onCreated(room);
    } catch (e: any) {
      alert(e?.message || "Ошибка создания чата");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Создать чат группы</h2>
          <p className="text-sm text-slate-500 mt-0.5">Выберите группу для создания общего чата</p>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto space-y-1">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => selectGroup(g)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selectedGroup?.id === g.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              {g.name}
            </button>
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Нет активных групп</p>
          )}
        </div>

        {selectedGroup && (
          <div className="px-4 pb-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка учеников...
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-1">
                  <span className="font-medium">{students.length}</span> учеников в группе
                </p>
              </>
            )}
          </div>
        )}

        <div className="p-4 pt-2 flex gap-2 justify-end border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
          <Button
            size="sm"
            onClick={createRoom}
            disabled={!selectedGroup || loading || creating}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Создать чат
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPage ────────────────────────────────────────────────────────────

export function ChatPage() {
  const { user } = useAuth();
  const myId = user?.id ?? "";

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [peerReadAt, setPeerReadAt] = useState<Record<string, string | null>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typingInfo, setTypingInfo] = useState<{ name: string; at: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: ChatMessage; x: number; y: number } | null>(null);
  const [forwardModal, setForwardModal] = useState<{ ids: string[] } | null>(null);
  const [deleteMsgConfirm, setDeleteMsgConfirm] = useState<string[] | null>(null);
  const { setHeaderActions, setMobileHeaderHidden } = useHeaderActions();

  useEffect(() => {
    setHeaderActions(
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        title="Новый чат группы"
      >
        <Plus className="w-4 h-4 text-slate-600" />
      </button>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  useEffect(() => {
    setMobileHeaderHidden(!!activeRoom);
    return () => setMobileHeaderHidden(false);
  }, [activeRoom, setMobileHeaderHidden]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRoomRef = useRef<ChatRoom | null>(null);
  activeRoomRef.current = activeRoom;

  // Load rooms on mount
  const loadRooms = useCallback(async () => {
    try {
      const data = await api.getChatRooms();
      setRooms(data);
      // Init peerReadAt from room member data
      const readMap: Record<string, string | null> = {};
      data.forEach((room) => {
        const other = room.members.find((m) => !(m.member_id === myId && m.member_type === "employee"));
        if (other) readMap[room.id] = other.last_read_at ?? null;
      });
      setPeerReadAt(readMap);
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  }, [myId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ── Search ──────────────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await api.searchChatUsers(value.trim());
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
      const updated = await api.getChatRooms();
      setRooms(updated);
      const freshRoom = updated.find((r) => r.id === room.id) ?? room;
      openRoom(freshRoom);
    } catch {
      // ignore
    }
  };

  // Load messages when room changes
  useEffect(() => {
    if (!activeRoom) return;
    setMessages([]);
    setLoadingMessages(true);
    api.getChatMessages(activeRoom.id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
    api.markChatRoomRead(activeRoom.id).catch(() => {});
  }, [activeRoom?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear typing indicator after 3s
  useEffect(() => {
    if (!typingInfo) return;
    const t = setTimeout(() => setTypingInfo(null), 3000);
    return () => clearTimeout(t);
  }, [typingInfo]);

  // WebSocket events
  const handleWsEvent = useCallback((event: ChatWsEvent) => {
    if (event.type === "new_message") {
      const msg = event.message;
      // Update room list unread count
      setRooms((prev) =>
        prev.map((r) =>
          r.id === msg.room_id
            ? { ...r, unread_count: r.id === activeRoomRef.current?.id ? 0 : r.unread_count + 1 }
            : r
        )
      );
      if (msg.room_id === activeRoomRef.current?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        api.markChatRoomRead(msg.room_id).catch(() => {});
      }
    } else if (event.type === "typing") {
      if (
        event.room_id === activeRoomRef.current?.id &&
        event.sender_id !== myId
      ) {
        setTypingInfo({ name: event.sender_name, at: Date.now() });
      }
    } else if (event.type === "read_receipt") {
      // Ignore our own read receipts — we're the sender, not the peer
      if (event.reader_id !== myId) {
        setPeerReadAt((prev) => ({ ...prev, [event.room_id]: event.read_at }));
      }
    } else if (event.type === "message_deleted") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.message_id ? { ...m, is_deleted: true, content_encrypted: "" } : m
        )
      );
    } else if (event.type === "message_edited") {
      setMessages((prev) =>
        prev.map((m) => (m.id === event.message.id ? event.message : m))
      );
    }
  }, [myId]);

  const wsUrl = api.getChatWsUrl();
  const { sendTyping } = useChatWebSocket({
    wsUrl,
    onEvent: handleWsEvent,
    enabled: true,
  });

  const openRoom = (room: ChatRoom) => {
    setActiveRoom(room);
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, unread_count: 0 } : r)));
  };

  const handleRoomCreated = (room: ChatRoom) => {
    setShowCreateModal(false);
    setRooms((prev) => {
      const exists = prev.find((r) => r.id === room.id);
      if (exists) return prev.map((r) => (r.id === room.id ? room : r));
      return [room, ...prev];
    });
    openRoom(room);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 10 МБ)");
      return;
    }
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setPendingFilePreview(URL.createObjectURL(file));
    } else {
      setPendingFilePreview(null);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const clearPendingFile = () => {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    setPendingFile(null);
    setPendingFilePreview(null);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingFile) || !activeRoom || sending || uploading) return;
    const text = input.trim() || (pendingFile ? pendingFile.name : "");
    if (editingId) {
      const id = editingId;
      setEditingId(null);
      setInput("");
      setSending(true);
      try {
        const updated = await api.editChatMessage(id, text);
        setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
      } catch {
        setInput(text);
        setEditingId(id);
      } finally {
        setSending(false);
      }
      inputRef.current?.focus();
      return;
    }
    const fileToSend = pendingFile;
    setInput("");
    clearPendingFile();
    setSending(true);
    try {
      let opts: { message_type?: string; file_url?: string; file_name?: string; file_size?: number } | undefined;
      if (fileToSend) {
        setUploading(true);
        const uploaded = await api.uploadChatFile(fileToSend);
        setUploading(false);
        opts = {
          message_type: uploaded.message_type,
          file_url: uploaded.file_url,
          file_name: uploaded.file_name,
          file_size: uploaded.file_size,
        };
      }
      const sent = await api.sendChatMessage(activeRoom.id, text, opts);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    } catch {
      if (!fileToSend) setInput(text);
    } finally {
      setSending(false);
      setUploading(false);
    }
    inputRef.current?.focus();
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
        await api.deleteChatMessage(id);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_deleted: true } : m))
        );
      } catch { /* ignore */ }
    }
  };

  const startEditing = (msg: ChatMessage) => {
    if (msg.sender_id !== myId || msg.sender_type !== "employee" || msg.is_deleted || msg.file_url) return;
    setEditingId(msg.id);
    setInput(msg.content_encrypted);
    clearPendingFile();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setInput("");
  };

  const doForward = async (targetRoomId: string) => {
    if (!forwardModal) return;
    const ids = forwardModal.ids;
    setForwardModal(null);
    clearSelection();
    try {
      await api.forwardChatMessages(ids, targetRoomId);
    } catch {
      alert("Ошибка пересылки");
    }
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) cancelEditing();
        else if (selectedIds.size > 0) clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedIds.size]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (activeRoom) sendTyping(activeRoom.id);
  };

  const deleteRoom = async () => {
    if (!activeRoom) return;
    try {
      await api.deleteChatRoom(activeRoom.id);
      setRooms((prev) => prev.filter((r) => r.id !== activeRoom.id));
      setActiveRoom(null);
      setMessages([]);
    } catch (e: any) {
      alert(e?.message || "Ошибка удаления чата");
    } finally {
      setDeleteConfirm(false);
    }
  };

  // Group messages by day (hide deleted)
  const groupedMessages = messages.filter((m) => !m.is_deleted).reduce<{ day: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const day = formatDay(msg.created_at);
    const last = acc[acc.length - 1];
    if (last?.day === day) {
      last.msgs.push(msg);
    } else {
      acc.push({ day, msgs: [msg] });
    }
    return acc;
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className={`flex bg-slate-50 overflow-hidden ${activeRoom ? "h-screen" : "h-[calc(100vh-3.5rem)] lg:h-screen"}`}>
      {/* ── Room list ─────────────────────────────────────────── */}
      <div
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-200
          ${activeRoom && isMobile ? "hidden" : "w-full md:w-80 flex-shrink-0"}
        `}
      >
        {/* Header */}
        <div className="px-5 pt-3 md:pt-5 pb-3">
          <div className="hidden md:flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Чат</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Новый чат группы"
            >
              <Plus className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterTab === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Все чаты
            </button>
            <button
              onClick={() => setFilterTab("unread")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterTab === "unread"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Непрочитанные
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div className="mt-1 max-h-64 overflow-y-auto">
              {searching ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Поиск...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-2 py-3 text-sm text-slate-400">Никого не найдено</div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={`${r.member_type}-${r.id}`}
                    onClick={() => handleOpenDirectChat(r)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor(r.name)}`}>
                      {getInitials(r.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{r.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {r.member_type === "employee" ? "Сотрудник" : r.member_type === "app_user" ? "Родитель" : "Ученик"}
                        {r.portal_login && <span className="ml-1">· {r.portal_login}</span>}
                      </div>
                    </div>
                    <MessageCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rooms */}
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageCircle className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Нет чатов</p>
              <p className="text-xs text-slate-400 mt-1">Создайте чат для группы</p>
            </div>
          ) : (
            rooms
              .filter((r) => filterTab === "all" || r.unread_count > 0)
              .map((room) => {
                const isActive = activeRoom?.id === room.id;
                const otherMembers = room.members.filter(
                  (m) => !(m.member_id === myId && m.member_type === "employee")
                );
                const displayName = room.name ?? otherMembers.map((m) => m.name).join(", ");
                const initials = getInitials(displayName);
                const color = avatarColor(displayName);
                const lm = room.last_message;
                const lmIsMe = !!lm && lm.sender_type === "employee";
                const fallbackLabel = room.room_type === "direct"
                  ? otherMembers[0]?.member_type === "employee" ? "Сотрудник" : otherMembers[0]?.member_type === "app_user" ? "Родитель" : "Ученик"
                  : `${room.members.length} участников`;
                const isOnline = room.room_type === "direct" && !!otherMembers[0]?.is_online;

                return (
                  <button
                    key={room.id}
                    onClick={() => openRoom(room)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                        isActive ? "bg-white/20 ring-2 ring-white/40" : color
                      }`}>
                        {room.room_type === "group" ? <Users className="w-5 h-5" /> : initials}
                      </div>
                      {isOnline && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 ${
                          isActive ? "border-blue-500" : "border-white"
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                          {displayName}
                        </span>
                        {lm && (
                          <span className={`text-[11px] flex-shrink-0 ${
                            isActive
                              ? "text-white/80"
                              : room.unread_count > 0
                              ? "text-blue-600 font-medium"
                              : "text-slate-400"
                          }`}>
                            {formatLastMsgTime(lm.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${
                          isActive
                            ? "text-white/85"
                            : room.unread_count > 0
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}>
                          {lm ? lastMsgPreview(lm, lmIsMe) : fallbackLabel}
                        </p>
                        {room.unread_count > 0 && (
                          <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-medium min-w-[20px] text-center flex-shrink-0 ${
                            isActive ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                          }`}>
                            {room.unread_count > 99 ? "99+" : room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
          )}
        </div>
      </div>

      {/* ── Chat pane ─────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeRoom && "hidden md:flex"}`}>
        {!activeRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Выберите чат</p>
            <p className="text-sm text-slate-400 mt-1">или создайте новый для группы</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
              <button
                className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setActiveRoom(null)}
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              {(() => {
                const otherMember = activeRoom.room_type === "direct"
                  ? activeRoom.members.find((m) => !(m.member_id === myId && m.member_type === "employee"))
                  : null;
                const headerName = activeRoom.room_type === "direct"
                  ? otherMember?.name ?? "Личный чат"
                  : activeRoom.name ?? "Групповой чат";
                return (
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-slate-50 -mx-1 px-1 py-1 rounded-lg transition-colors"
                    onClick={() => setShowMembers((v) => !v)}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColor(headerName)}`}>
                      {activeRoom.room_type === "group" ? <Users className="w-4 h-4" /> : getInitials(headerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-slate-900 text-sm">{headerName}</h2>
                      <p className="text-xs text-slate-400">
                        {activeRoom.room_type === "direct"
                          ? (otherMember?.is_online ? "онлайн" : "оффлайн")
                          : `${activeRoom.members.length} участников`}
                      </p>
                    </div>
                  </button>
                );
              })()}
              <button
                onClick={() => setDeleteConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Удалить чат"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Members panel */}
            {showMembers && (
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Участники</span>
                  <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {activeRoom.members.map((m) => (
                    <div key={`${m.member_type}-${m.member_id}`} className="flex items-center gap-2 py-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor(m.name ?? "")}`}>
                        {getInitials(m.name ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-800 truncate block">
                          {m.name ?? "Неизвестно"}
                          {m.member_id === myId && m.member_type === "employee" && <span className="text-xs text-slate-400 ml-1">(вы)</span>}
                        </span>
                        <span className="text-xs text-slate-400">{m.member_type === "employee" ? "Преподаватель" : "Ученик"}</span>
                      </div>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.is_online ? "bg-green-400" : "bg-slate-300"}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selection action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-600 transition-colors"
                  title="Отмена"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-700 flex-1">
                  Выбрано: {selectedIds.size}
                </span>
                <button
                  onClick={() => setForwardModal({ ids: Array.from(selectedIds) })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                  title="Переслать"
                >
                  <Forward className="w-4 h-4" />
                  <span className="hidden sm:inline">Переслать</span>
                </button>
                <button
                  onClick={confirmDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-sm text-red-600 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Удалить</span>
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col bg-[#dfe6ed]">
              <div className="mt-auto space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-slate-400">Нет сообщений</p>
                  <p className="text-xs text-slate-300 mt-1">Напишите первым!</p>
                </div>
              ) : (
                groupedMessages.map(({ day, msgs }) => (
                  <div key={day}>
                    {/* Day separator */}
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-white bg-[#8fa4b8] rounded-full px-3 py-1 font-medium shadow-sm">{day}</span>
                    </div>

                    <div>
                      {msgs.map((msg, idx) => {
                        const isMe = msg.sender_id === myId && msg.sender_type === "employee";
                        const text = decryptMsg(msg);
                        const prev = msgs[idx - 1];
                        const next = msgs[idx + 1];
                        const sameSenderPrev = prev && prev.sender_id === msg.sender_id && prev.sender_type === msg.sender_type;
                        const sameSenderNext = next && next.sender_id === msg.sender_id && next.sender_type === msg.sender_type;
                        const isFirst = !sameSenderPrev;
                        const isLast = !sameSenderNext;
                        const imgOnly = !msg.is_deleted && isImageMessage(msg) && isFileOnlyMessage(msg);

                        const isSelected = selectedIds.has(msg.id);
                        const inSelectionMode = selectedIds.size > 0;

                        const timeBlock = (
                          <span className={`inline-flex items-center gap-0.5 text-[11px] ml-2 whitespace-nowrap align-bottom ${
                            imgOnly ? "text-white/80" : isMe ? "text-blue-200" : "text-slate-400"
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
                                <svg viewBox="0 0 16 16" className="ml-0.5 w-3.5 h-3.5 inline-block" fill="currentColor">
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

                        const handleMsgClick = (e: React.MouseEvent) => {
                          if (inSelectionMode) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!msg.is_deleted) toggleSelect(msg.id);
                          }
                        };
                        const handleMsgContextMenu = (e: React.MouseEvent) => {
                          if (msg.is_deleted) return;
                          e.preventDefault();
                          setContextMenu({ msg, x: e.clientX, y: e.clientY });
                        };

                        return (
                          <div
                            key={msg.id}
                            onClick={handleMsgClick}
                            onContextMenu={handleMsgContextMenu}
                            className={`flex items-center ${isMe ? "justify-end" : "justify-start"} ${isFirst && idx > 0 ? "mt-3" : "mt-0.5"} ${
                              isSelected ? "bg-blue-200/40 -mx-4 px-4" : ""
                            } ${inSelectionMode && !msg.is_deleted ? "cursor-pointer" : ""}`}
                          >
                            {inSelectionMode && !msg.is_deleted && (
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2 ${
                                isSelected ? "bg-blue-600 border-blue-600" : "bg-white/80 border-slate-300"
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                            )}
                            {/* Avatar spacer / avatar */}
                            {!isMe && (
                              <div className="w-8 flex-shrink-0 flex items-end justify-center">
                                {isLast && (
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${avatarColor(msg.sender_name)}`}>
                                    {getInitials(msg.sender_name)}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className={`group relative max-w-[70%]`}>
                              <div className={`relative text-sm leading-relaxed ${
                                imgOnly ? "overflow-hidden rounded-2xl" : "px-3 py-1.5"
                              } ${
                                imgOnly ? "" :
                                isMe
                                  ? `rounded-2xl ${isLast ? "rounded-br-sm" : ""}`
                                  : `rounded-2xl ${isLast ? "rounded-bl-sm" : ""}`
                              } ${
                                msg.is_deleted
                                  ? "bg-slate-200 text-slate-400 italic"
                                  : isMe
                                  ? "bg-[#3b82c4] text-white"
                                  : "bg-white text-slate-900"
                              }`}>
                                {/* Sender name (group chats, first message in group) */}
                                {!isMe && isFirst && !msg.is_deleted && (
                                  <div className={`text-xs font-semibold mb-0.5 ${avatarTextColor(msg.sender_name)}`}>
                                    {msg.sender_name}
                                  </div>
                                )}

                                {/* Forwarded-from chip */}
                                {!msg.is_deleted && msg.forwarded_from_sender_name && (
                                  <div className={`flex items-center gap-1 text-xs mb-0.5 italic ${
                                    isMe ? "text-blue-100" : "text-slate-500"
                                  }`}>
                                    <CornerUpRight className="w-3 h-3" />
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
                                    {text && (!msg.file_url || text !== msg.file_name) ? text : null}
                                    {timeBlock}
                                  </span>
                                )}

                                {/* Delete button */}
                                {isMe && !msg.is_deleted && !inSelectionMode && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteMsgConfirm([msg.id]); }}
                                    className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {typingInfo && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 px-3 py-2 bg-white rounded-2xl shadow-sm">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-slate-400">{typingInfo.name} печатает...</span>
                </div>
              )}

              <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              {/* Editing banner */}
              {editingId && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <Edit2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-blue-700">Редактирование</div>
                    <div className="text-xs text-slate-500 truncate">
                      {messages.find((m) => m.id === editingId)?.content_encrypted ?? ""}
                    </div>
                  </div>
                  <button onClick={cancelEditing} className="p-1 rounded hover:bg-blue-100 transition-colors">
                    <X className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              )}
              {/* Pending file preview */}
              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  {pendingFilePreview ? (
                    <img src={pendingFilePreview} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 truncate">{pendingFile.name}</div>
                    <div className="text-xs text-slate-400">{formatFileSize(pendingFile.size)}</div>
                  </div>
                  <button onClick={clearPendingFile} className="p-1 rounded hover:bg-slate-200 transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
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
                  className="h-[42px] w-[42px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex-shrink-0"
                  title="Прикрепить файл"
                >
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 overflow-y-auto"
                  style={{ minHeight: "42px" }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !pendingFile) || sending || uploading}
                  size="sm"
                  className="h-[42px] w-[42px] p-0 rounded-xl flex-shrink-0"
                >
                  {sending || uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && activeRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Удалить чат?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Чат «{activeRoom.name}» и все сообщения будут удалены безвозвратно.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>Отмена</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={deleteRoom}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create room modal */}
      {showCreateModal && (
        <CreateRoomModal
          onCreated={handleRoomCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Context menu */}
      {contextMenu && (() => {
        const m = contextMenu.msg;
        const canEdit = m.sender_id === myId && m.sender_type === "employee" && !m.is_deleted && !m.file_url;
        const canDelete = m.sender_id === myId && m.sender_type === "employee" && !m.is_deleted;
        const maxX = typeof window !== "undefined" ? window.innerWidth - 200 : contextMenu.x;
        const maxY = typeof window !== "undefined" ? window.innerHeight - 160 : contextMenu.y;
        const x = Math.min(contextMenu.x, maxX);
        const y = Math.min(contextMenu.y, maxY);
        return (
          <div
            className="fixed z-50 min-w-[180px] bg-white rounded-lg shadow-xl border border-slate-200 py-1"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { toggleSelect(m.id); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Check className="w-4 h-4" />
              Выбрать
            </button>
            <button
              onClick={() => { setForwardModal({ ids: [m.id] }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Forward className="w-4 h-4" />
              Переслать
            </button>
            {canEdit && (
              <button
                onClick={() => { startEditing(m); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Edit2 className="w-4 h-4" />
                Изменить
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { setDeleteMsgConfirm([m.id]); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            )}
          </div>
        );
      })()}

      {/* Forward modal */}
      {forwardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setForwardModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Переслать</h2>
                <p className="text-xs text-slate-500">Сообщений: {forwardModal.ids.length}</p>
              </div>
              <button onClick={() => setForwardModal(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {rooms.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">Нет доступных чатов</p>
              ) : (
                rooms.map((room) => {
                  const otherMembers = room.members.filter(
                    (mm) => !(mm.member_id === myId && mm.member_type === "employee")
                  );
                  const displayName = room.name ?? otherMembers.map((mm) => mm.name).join(", ");
                  const color = avatarColor(displayName);
                  return (
                    <button
                      key={room.id}
                      onClick={() => doForward(room.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${color}`}>
                        {room.room_type === "group" ? <Users className="w-4 h-4" /> : getInitials(displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{displayName}</div>
                        <div className="text-xs text-slate-400">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {deleteMsgConfirm.length > 1 ? `Удалить сообщения (${deleteMsgConfirm.length})?` : "Удалить сообщение?"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Это действие нельзя отменить.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteMsgConfirm(null)}>Отмена</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={performDelete}
              >
                Удалить
              </Button>
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
            <X className="w-6 h-6" />
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
