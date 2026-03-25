import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "../components/BottomNav";
import { api, ChatRoom, ChatMessage, ChatSearchResult } from "../lib/api";
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import {
  initCryptoKeys,
  encryptDirect,
  decryptDirect,
  encryptGroup,
  decryptGroup,
  KeyPair,
} from "../lib/crypto";

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

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
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

// ── Decrypt helper ─────────────────────────────────────────────────────────

function decryptMsg(msg: ChatMessage, room: ChatRoom, keyPair: KeyPair, myId: string, myMemberType: string): string | null {
  if (msg.is_deleted) return "Сообщение удалено";
  if (room.room_type === "direct") {
    const other = room.members.find((m) => !(m.member_id === myId && m.member_type === myMemberType));
    if (!other?.public_key) return null;
    return decryptDirect(msg.content_encrypted, other.public_key, keyPair.privateKey);
  }
  if (room.room_type === "group") {
    const myMember = room.members.find((m) => m.member_id === myId && m.member_type === myMemberType);
    if (!myMember?.room_key_encrypted) return null;
    const creator = room.members.find((m) => m.member_type === "employee");
    if (!creator?.public_key) return null;
    const roomKey = decryptDirect(myMember.room_key_encrypted, creator.public_key, keyPair.privateKey);
    if (!roomKey) return null;
    return decryptGroup(msg.content_encrypted, roomKey);
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ChatPage() {
  const student = getStoredStudent();
  const myId = student.id;
  const myMemberType = (localStorage.getItem("s_role") ?? "student") === "app_user" ? "app_user" : "student";

  const [keyPair, setKeyPair] = useState<KeyPair | null>(() => {
    const priv = sessionStorage.getItem("s_chat_priv");
    const pub = sessionStorage.getItem("s_chat_pub");
    if (priv && pub) return { privateKey: priv, publicKey: pub };
    return null;
  });
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [keyError, setKeyError] = useState(false);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Unlock (fallback if sessionStorage cleared) ─────────────────────────

  const handleUnlock = async () => {
    if (!password.trim()) return;
    setUnlocking(true);
    setKeyError(false);
    try {
      const kp = await initCryptoKeys(password.trim(), myId);
      await api.updatePublicKey(kp.publicKey);
      sessionStorage.setItem("s_chat_priv", kp.privateKey);
      sessionStorage.setItem("s_chat_pub", kp.publicKey);
      setKeyPair(kp);
    } catch {
      setKeyError(true);
    } finally {
      setUnlocking(false);
    }
  };

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
  }, []);

  useEffect(() => {
    if (keyPair) {
      setWsEnabled(false);
      loadRooms();
    }
  }, [keyPair, loadRooms]);

  // ── Load messages ────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (room: ChatRoom, kp: KeyPair) => {
    setLoadingMessages(true);
    setMessages([]);
    setHasMore(true);
    try {
      const data = await api.getChatMessages(room.id);
      const loaded = data.map((m) => ({ ...m, text: decryptMsg(m, room, kp, myId, myMemberType) }));
      const loadedIds = new Set(loaded.map((m) => m.id));
      // Merge: preserve any messages that arrived (via WS or send) while we were loading
      setMessages((prev) => {
        const newArrivals = prev.filter((m) => !loadedIds.has(m.id));
        return [...loaded, ...newArrivals];
      });
      setHasMore(data.length === 50);
    } finally {
      setLoadingMessages(false);
    }
  }, [myId]);

  const loadMoreMessages = async () => {
    if (!selectedRoom || !keyPair || !hasMore || messages.length === 0) return;
    const oldest = messages[0].created_at;
    const data = await api.getChatMessages(selectedRoom.id, oldest);
    if (data.length === 0) { setHasMore(false); return; }
    setMessages((prev) => [...data.map((m) => ({ ...m, text: decryptMsg(m, selectedRoom, keyPair, myId, myMemberType) })), ...prev]);
    setHasMore(data.length === 50);
  };

  useEffect(() => {
    if (selectedRoom && keyPair) {
      loadMessages(selectedRoom, keyPair);
    }
  }, [selectedRoom, keyPair, loadMessages]);

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
  const keyPairRef = useRef(keyPair);
  useEffect(() => { keyPairRef.current = keyPair; }, [keyPair]);
  // Always-current rooms ref — used to get fresh public keys in WS handler
  const roomsRef = useRef(rooms);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);

  const handleReconnect = useCallback(() => {
    const room = selectedRoomRef.current;
    const kp = keyPairRef.current;
    if (room && kp) loadMessages(room, kp);
  }, [loadMessages]);

  const { sendTyping, sendRead, wsConnected } = useChatWebSocket({
    enabled: wsEnabled,
    onReconnect: handleReconnect,
    onMessage: useCallback(
      (msg) => {
        if (msg.type === "new_message") {
          const incoming = msg.message;
          // Use refs for selectedRoom/keyPair — avoids stale closure on newly opened rooms
          const activeRoom = selectedRoomRef.current;
          const activeKeyPair = keyPairRef.current;
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
          if (activeRoom?.id === incoming.room_id && activeKeyPair) {
            // Use latest rooms data from ref (may have fresher public keys than closure)
            const currentRoom = roomsRef.current.find((r) => r.id === incoming.room_id) ?? activeRoom;
            const text = decryptMsg(incoming, currentRoom, activeKeyPair, myId, myMemberType);
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, { ...incoming, text }];
            });
            if (text === null && !incoming.is_deleted) {
              // Decryption failed — likely stale public key; reload rooms and retry
              api.getChatRooms().then((fresh) => {
                setRooms(fresh);
                const freshRoom = fresh.find((r) => r.id === incoming.room_id);
                if (freshRoom) {
                  const freshText = decryptMsg(incoming, freshRoom, activeKeyPair, myId, myMemberType);
                  setMessages((prev) =>
                    prev.map((m) => m.id === incoming.id ? { ...m, text: freshText } : m)
                  );
                }
              }).catch(() => {});
            }
            sendRead(incoming.room_id);
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
        if (msg.type === "read_receipt") {
          setPeerReadAt((prev) => ({ ...prev, [msg.room_id]: msg.read_at }));
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

  // Mark room as read when opening it — via WS so sender gets read_receipt broadcast
  useEffect(() => {
    if (selectedRoom && wsConnected) {
      sendRead(selectedRoom.id);
    }
  }, [selectedRoom, wsConnected, sendRead]);

  // ── Send message (via REST — надёжно, WS только для получения) ──────────

  const handleSend = async () => {
    if (!inputText.trim() || !selectedRoom || !keyPair || sending) return;
    const text = inputText.trim();
    const tempId = `sending-${Date.now()}`;
    setSendError(null);
    setInputText("");
    setSending(true);
    setSendingIds((s) => new Set(s).add(tempId));
    try {
      let encrypted: string;
      if (selectedRoom.room_type === "direct") {
        const other = selectedRoom.members.find((m) => !(m.member_id === myId && m.member_type === myMemberType));
        if (!other?.public_key) {
          setSendError("Собеседник ещё не открыл чат. Попросите его зайти в раздел Чат.");
          setInputText(text);
          return;
        }
        encrypted = encryptDirect(text, other.public_key, keyPair.privateKey);
      } else {
        const myMember = selectedRoom.members.find((m) => m.member_id === myId && m.member_type === myMemberType);
        if (!myMember?.room_key_encrypted) {
          setSendError("Ключ комнаты не найден. Обратитесь к преподавателю.");
          setInputText(text);
          return;
        }
        const creator = selectedRoom.members.find((m) => m.member_type === "employee");
        if (!creator?.public_key) {
          setSendError("Публичный ключ преподавателя не найден.");
          setInputText(text);
          return;
        }
        const roomKey = decryptDirect(myMember.room_key_encrypted, creator.public_key, keyPair.privateKey);
        if (!roomKey) {
          setSendError("Не удалось расшифровать ключ комнаты.");
          setInputText(text);
          return;
        }
        encrypted = encryptGroup(text, roomKey);
      }
      const sent = await api.sendMessage(selectedRoom.id, encrypted);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, { ...sent, text }];
      });
    } catch (e: any) {
      setSendError(e?.message ?? "Не удалось отправить сообщение");
      setInputText(text);
    } finally {
      setSending(false);
      setSendingIds((s) => { const n = new Set(s); n.delete(tempId); return n; });
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setCtxMsgId(null);
    try {
      await api.deleteMessage(msgId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, is_deleted: true, text: "Сообщение удалено", content_encrypted: "" }
            : m
        )
      );
    } catch { /* ignore */ }
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

  function getRoomDisplayName(room: ChatRoom): string {
    if (room.name) return room.name;
    if (room.room_type === "direct") {
      const other = room.members.find(
        (m) => !(m.member_id === myId && m.member_type === myMemberType)
      );
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

  // ── Fallback: sessionStorage cleared (browser closed between sessions) ───

  if (!keyPair) {
    return (
      <div className="bg-cream min-h-screen flex flex-col items-center justify-center px-6 gap-6 text-center pb-24">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-brand-700" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Введите пароль</h2>
          <p className="text-gray-500 text-sm max-w-xs">Введите пароль от аккаунта для доступа к чату</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setKeyError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-brand-300 transition ${keyError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
          />
          {keyError && <p className="text-red-500 text-xs">Неверный пароль</p>}
          <button
            onClick={handleUnlock}
            disabled={unlocking || !password.trim()}
            className="w-full bg-brand-700 text-white py-3 rounded-2xl text-sm font-semibold disabled:opacity-50 transition"
          >
            {unlocking ? "Загрузка..." : "Открыть чат"}
          </button>
        </div>
        <BottomNav chatUnread={totalUnread} />
      </div>
    );
  }

  // ── Room list ────────────────────────────────────────────────────────────

  if (!selectedRoom) {
    return (
      <div className="bg-cream min-h-screen pb-24 flex flex-col max-w-[430px] mx-auto">
        {/* Header */}
        <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Чаты</h1>
          {/* Search bar */}
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по логину или телефону..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white transition"
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
          <div className="bg-white border-b border-gray-100">
            {searching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                Поиск...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400">Никого не найдено</div>
            ) : (
              <ul>
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => handleOpenDirectChat(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                    >
                      <div className={`w-9 h-9 rounded-full ${avatarColor(r.name)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-xs">{getInitials(r.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{r.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {r.portal_login && <span>@{r.portal_login}</span>}
                          {r.portal_login && r.phone && <span className="mx-1">·</span>}
                          {r.phone && <span>{r.phone}</span>}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
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
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">Чатов пока нет.</p>
            <p className="text-gray-400 text-xs">Преподаватель добавит вас в групповой чат.</p>
          </div>
        ) : (
          <>
          <ul className="flex-1 bg-white divide-y divide-gray-50">
            {rooms.map((room) => {
              const name = getRoomDisplayName(room);
              const lastTime = room.last_message
                ? formatTime(room.last_message.created_at)
                : "";
              const otherMember = room.room_type === "direct"
                ? room.members.find((m) => !(m.member_id === myId && m.member_type === myMemberType))
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
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-white cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full ${avatarColor(name)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{getInitials(name)}</span>
                      </div>
                      {otherMember && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${otherMember.is_online ? "bg-green-400" : "bg-gray-300"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm truncate">{name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{lastTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 truncate">
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
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="font-bold text-gray-900 text-base mb-2">Удалить чат?</h3>
                <p className="text-sm text-gray-500 mb-6">Чат будет удалён из вашего списка. Это действие нельзя отменить.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmDeleteRoomId(null); setSwipedRoomId(null); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
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

  const groups = groupByDate(messages);
  const roomName = getRoomDisplayName(selectedRoom);
  const typingInfo = typing[selectedRoom.id];

  return (
    <div className="bg-cream min-h-screen flex flex-col max-w-[430px] mx-auto">
      {/* Top bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-b border-gray-100 z-30">
        <div className="flex items-center gap-3 px-4 pt-10 pb-3">
          <button
            onClick={() => { setSelectedRoom(null); loadRooms(); }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className={`w-9 h-9 rounded-full ${avatarColor(roomName)} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-xs">{getInitials(roomName)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{roomName}</div>
            {typingInfo ? (
              <div className="text-xs text-brand-600 animate-pulse">{typingInfo.name} печатает...</div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {!wsConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-300 animate-pulse" />
                    Подключение...
                  </>
                ) : selectedRoom.room_type === "direct" ? (() => {
                  const other = selectedRoom.members.find(
                    (m) => !(m.member_id === myId && m.member_type === myMemberType)
                  );
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
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-[88px] pb-[80px]"
        onClick={() => setCtxMsgId(null)}
      >
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
            <p className="text-gray-400 text-sm">Нет сообщений</p>
            <p className="text-gray-300 text-xs">Напишите первым!</p>
          </div>
        ) : (
          groups.map(({ date, messages: dayMsgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium px-2">{date}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {dayMsgs.map((msg) => {
                const isMe = msg.sender_id === myId && msg.sender_type === myMemberType;
                const isCtx = ctxMsgId === msg.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 mb-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar (others only) */}
                    {!isMe && (
                      <div className={`w-7 h-7 rounded-full ${avatarColor(msg.sender_name)} flex items-center justify-center flex-shrink-0 self-end`}>
                        <span className="text-white font-bold text-[10px]">
                          {getInitials(msg.sender_name)}
                        </span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[72%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && (
                        <span className="text-[10px] text-gray-400 font-medium px-1 mb-0.5">
                          {msg.sender_name}
                        </span>
                      )}
                      <div
                        onClick={() => {
                          if (isMe && !msg.is_deleted) setCtxMsgId(isCtx ? null : msg.id);
                          else setCtxMsgId(null);
                        }}
                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed cursor-pointer select-none ${
                          isMe
                            ? "bg-brand-700 text-white rounded-br-sm"
                            : "bg-white text-gray-900 shadow-sm rounded-bl-sm"
                        }`}
                      >
                        {msg.is_deleted
                          ? <span className="italic opacity-60 text-xs">Сообщение удалено</span>
                          : msg.text === null
                            ? <span className="italic opacity-60 text-xs">🔒 Не удалось расшифровать</span>
                            : msg.text}
                      </div>
                      {/* Delete button for own messages */}
                      {isCtx && isMe && !msg.is_deleted && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="mt-1 text-xs text-red-500 bg-white border border-red-100 rounded-xl px-3 py-1 shadow-sm hover:bg-red-50 transition"
                        >
                          Удалить
                        </button>
                      )}
                      <span className={`text-[10px] mt-0.5 px-1 flex items-center gap-0.5 ${isMe ? "text-gray-400" : "text-gray-300"}`}>
                        {formatTime(msg.created_at)}
                        {isMe && !msg.is_deleted && (() => {
                          const isSending = sendingIds.has(msg.id);
                          const peerRead = peerReadAt[msg.room_id];
                          const isRead = peerRead != null && new Date(msg.created_at) <= new Date(peerRead);
                          if (isSending) return (
                            <span className="ml-1 w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                          );
                          if (isRead) return <span className="ml-1 text-brand-400">✓✓</span>;
                          return <span className="ml-1">✓</span>;
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-3 py-3 z-30">
        {sendError && (
          <div className="flex items-start gap-2 mb-2 px-1 py-2 bg-red-50 rounded-xl text-xs text-red-600">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="flex-1">{sendError}</span>
            <button onClick={() => setSendError(null)} className="text-red-400">✕</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            placeholder="Сообщение..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white transition max-h-28"
            style={{ lineHeight: "1.4" }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
