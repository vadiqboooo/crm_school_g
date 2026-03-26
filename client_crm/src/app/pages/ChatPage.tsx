import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Plus, ChevronLeft, Users, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { ChatRoom, ChatMessage, ChatGroupStudent } from "../types/api";
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

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typingInfo, setTypingInfo] = useState<{ name: string; at: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeRoomRef = useRef<ChatRoom | null>(null);
  activeRoomRef.current = activeRoom;

  // Load rooms on mount
  const loadRooms = useCallback(async () => {
    try {
      const data = await api.getChatRooms();
      setRooms(data);
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

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
        setMessages((prev) => [...prev, msg]);
        api.markChatRoomRead(msg.room_id).catch(() => {});
      }
    } else if (event.type === "typing") {
      if (
        event.room_id === activeRoomRef.current?.id &&
        event.sender_id !== myId
      ) {
        setTypingInfo({ name: event.sender_name, at: Date.now() });
      }
    } else if (event.type === "message_deleted") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.message_id ? { ...m, is_deleted: true, content_encrypted: "" } : m
        )
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

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await api.sendChatMessage(activeRoom.id, text);
      // Message will arrive via WebSocket
    } catch {
      setInput(text); // restore on error
    } finally {
      setSending(false);
    }
    inputRef.current?.focus();
  };

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

  const deleteMessage = async (msgId: string) => {
    try {
      await api.deleteChatMessage(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m))
      );
    } catch {
      // ignore
    }
  };

  // Group messages by day
  const groupedMessages = messages.reduce<{ day: string; msgs: ChatMessage[] }[]>((acc, msg) => {
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Room list ─────────────────────────────────────────── */}
      <div
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-200
          ${activeRoom && isMobile ? "hidden" : "w-full md:w-80 flex-shrink-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h1 className="font-semibold text-slate-900">Мессенджер</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Чат группы
          </Button>
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
            rooms.map((room) => {
              const isActive = activeRoom?.id === room.id;
              const otherMembers = room.members.filter(
                (m) => !(m.member_id === myId && m.member_type === "employee")
              );
              const displayName = room.name ?? otherMembers.map((m) => m.name).join(", ");
              const initials = getInitials(displayName);
              const color = avatarColor(displayName);

              return (
                <button
                  key={room.id}
                  onClick={() => openRoom(room)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-slate-100 last:border-0 ${
                    isActive ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${color}`}>
                    {room.room_type === "group" ? <Users className="w-5 h-5" /> : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-slate-900"}`}>
                        {displayName}
                      </span>
                      {room.unread_count > 0 && (
                        <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium min-w-[20px] text-center flex-shrink-0">
                          {room.unread_count > 99 ? "99+" : room.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {room.members.length} участников
                    </p>
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
              <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-slate-50 -mx-1 px-1 py-1 rounded-lg transition-colors"
                onClick={() => setShowMembers((v) => !v)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColor(activeRoom.name ?? "G")}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 text-sm">{activeRoom.name}</h2>
                  <p className="text-xs text-slate-400">{activeRoom.members.length} участников</p>
                </div>
              </button>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400 whitespace-nowrap">{day}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="space-y-1">
                      {msgs.map((msg) => {
                        const isMe = msg.sender_id === myId && msg.sender_type === "employee";
                        const text = decryptMsg(msg);

                        return (
                          <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {!isMe && (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 self-end ${avatarColor(msg.sender_name)}`}>
                                {getInitials(msg.sender_name)}
                              </div>
                            )}
                            <div className={`group max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                              {!isMe && (
                                <span className="text-xs text-slate-400 mb-0.5 ml-0.5">{msg.sender_name}</span>
                              )}
                              <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                msg.is_deleted
                                  ? "bg-slate-100 text-slate-400 italic"
                                  : isMe
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-900"
                              }`}>
                                {text}
                                {isMe && !msg.is_deleted && (
                                  <button
                                    onClick={() => deleteMessage(msg.id)}
                                    className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 mt-0.5 mx-1">{formatTime(msg.created_at)}</span>
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
                  <div className="flex gap-1 px-3 py-2 bg-white border border-slate-200 rounded-2xl">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-slate-400">{typingInfo.name} печатает...</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Написать сообщение... (Enter — отправить)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 overflow-y-auto"
                  style={{ minHeight: "42px" }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  size="sm"
                  className="h-[42px] w-[42px] p-0 rounded-xl flex-shrink-0"
                >
                  {sending ? (
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
    </div>
  );
}
