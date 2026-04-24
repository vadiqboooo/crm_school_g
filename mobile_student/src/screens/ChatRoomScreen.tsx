import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Alert,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import {
  ArrowLeft,
  Send,
  Paperclip,
  FileText,
  X,
  Download,
  Pencil,
  Reply,
  Trash2,
  Copy,
  Forward,
  Check,
  Info,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { api, ChatMessage, ChatRoom } from "../lib/api";
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import { useAuth } from "../contexts/AuthContext";
import { refreshChatBadge } from "../lib/chatBadge";
import type { ChatStackParamList } from "../navigation/types";

type Nav = import("@react-navigation/native-stack").NativeStackNavigationProp<ChatStackParamList>;

type Route = RouteProp<ChatStackParamList, "ChatRoom">;

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return "Сегодня";
  if (isSameDay(d, yesterday)) return "Вчера";
  const day = d.getDate();
  const month = MONTHS_GEN[d.getMonth()];
  if (d.getFullYear() === now.getFullYear()) return `${day} ${month}`;
  return `${day} ${month} ${d.getFullYear()}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
};

function guessMime(name: string, fallback?: string | null): string {
  if (fallback && fallback !== "application/octet-stream") return fallback;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? fallback ?? "application/octet-stream";
}

function isImageMessage(msg: ChatMessage): boolean {
  if (!msg.file_url) return false;
  if (msg.message_type === "image") return true;
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(msg.file_url);
}

type PendingAttachment = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  isImage: boolean;
};

export function ChatRoomScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const myMemberType: "student" | "app_user" = user?.role === "app_user" ? "app_user" : "student";
  const roomId = params.roomId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [actionSheet, setActionSheet] = useState<ChatMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardRooms, setForwardRooms] = useState<ChatRoom[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const selectionMode = selectedIds.size > 0;

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const didInitialScroll = useRef(false);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const bottomPad = keyboardVisible ? 0 : insets.bottom;

  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.is_deleted),
    [messages]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    didInitialScroll.current = false;
    try {
      const data = await api.getChatMessages(roomId);
      setMessages(data);
      setHasMore(data.length === 50);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0].created_at;
      const data = await api.getChatMessages(roomId, oldest);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...data, ...prev]);
        setHasMore(data.length === 50);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReconnect = useCallback(() => {
    loadInitial();
  }, [loadInitial]);

  const { sendRead, wsConnected } = useChatWebSocket({
    enabled: true,
    onReconnect: handleReconnect,
    onMessage: useCallback(
      (msg) => {
        if (msg.type === "new_message" && msg.message.room_id === roomId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.message.id)) return prev;
            return [...prev, msg.message];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
          api.markRoomRead(roomId).catch(() => {});
          refreshChatBadge();
        }
        if (msg.type === "message_deleted") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.message_id
                ? { ...m, is_deleted: true, content_encrypted: "" }
                : m
            )
          );
        }
        if (msg.type === "message_edited") {
          setMessages((prev) => prev.map((m) => (m.id === msg.message.id ? msg.message : m)));
        }
      },
      [roomId]
    ),
  });

  // mark as read on open and whenever ws reconnects
  useEffect(() => {
    if (wsConnected) {
      sendRead(roomId);
      refreshChatBadge();
    }
  }, [wsConnected, roomId, sendRead]);

  // fallback: mark-as-read via REST once on mount
  useEffect(() => {
    api.markRoomRead(roomId).then(() => refreshChatBadge()).catch(() => {});
  }, [roomId]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Нет доступа", "Разрешите доступ к фото в настройках");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    const name = a.fileName ?? `photo-${Date.now()}.jpg`;
    setPending({
      uri: a.uri,
      name,
      type: guessMime(name, a.mimeType),
      size: a.fileSize,
      isImage: true,
    });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Нет доступа", "Разрешите доступ к камере в настройках");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    const name = a.fileName ?? `photo-${Date.now()}.jpg`;
    setPending({
      uri: a.uri,
      name,
      type: guessMime(name, a.mimeType),
      size: a.fileSize,
      isImage: true,
    });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setPending({
      uri: a.uri,
      name: a.name,
      type: guessMime(a.name, a.mimeType),
      size: a.size,
      isImage: false,
    });
  };

  const showAttachSheet = () => {
    Alert.alert("Прикрепить", undefined, [
      { text: "Галерея", onPress: pickImage },
      { text: "Камера", onPress: takePhoto },
      { text: "Документ", onPress: pickDocument },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !pending) return;
    if (sending || uploading) return;

    if (editingId) {
      const id = editingId;
      setEditingId(null);
      setInput("");
      setSending(true);
      try {
        const updated = await api.editMessage(id, text);
        setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
      } catch (e: unknown) {
        Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось изменить сообщение");
        setInput(text);
        setEditingId(id);
      } finally {
        setSending(false);
      }
      return;
    }

    const attachment = pending;
    const replyId = replyTo?.id;
    setInput("");
    setPending(null);
    setReplyTo(null);
    setSending(true);

    try {
      let msgType = "text";
      let fileOpts: { file_url?: string; file_name?: string; file_size?: number } | undefined;
      const body = text || (attachment ? attachment.name : "");

      if (attachment) {
        setUploading(true);
        const uploaded = await api.uploadChatFile({
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.type,
        });
        setUploading(false);
        msgType = uploaded.message_type;
        fileOpts = {
          file_url: uploaded.file_url,
          file_name: uploaded.file_name,
          file_size: uploaded.file_size,
        };
      }

      const sent = await api.sendMessage(roomId, body, msgType, replyId, fileOpts);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось отправить");
      if (!attachment) setInput(text);
      if (replyId) setReplyTo(replyTo);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const isMine = useCallback(
    (m: ChatMessage) => m.sender_id === myId && m.sender_type === myMemberType,
    [myId, myMemberType]
  );

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onLongPressMessage = (msg: ChatMessage) => {
    if (msg.is_deleted) return;
    if (selectionMode) {
      toggleSelect(msg.id);
    } else {
      setActionSheet(msg);
    }
  };

  const onPressMessage = (msg: ChatMessage) => {
    if (selectionMode) {
      if (!msg.is_deleted) toggleSelect(msg.id);
      return;
    }
    if (isImageMessage(msg) && msg.file_url) {
      setImagePreview(api.getFileUrl(msg.file_url));
    }
  };

  const doDelete = async (msg: ChatMessage) => {
    setActionSheet(null);
    try {
      await api.deleteMessage(msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_deleted: true, content_encrypted: "" } : m))
      );
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const openFile = (msg: ChatMessage) => {
    if (!msg.file_url) return;
    const url = api.getFileUrl(msg.file_url);
    Linking.openURL(url).catch(() => Alert.alert("Ошибка", "Не удалось открыть файл"));
  };

  const selectedMessages = useMemo(
    () => messages.filter((m) => selectedIds.has(m.id) && !m.is_deleted),
    [messages, selectedIds]
  );

  const handleCopySelection = async () => {
    const text = selectedMessages
      .map((m) => m.content_encrypted || m.file_name || "")
      .filter(Boolean)
      .join("\n");
    if (text) {
      try {
        await Clipboard.setStringAsync(text);
      } catch {
        /* ignore */
      }
    }
    clearSelection();
  };

  const handleDeleteSelection = () => {
    const ownIds = selectedMessages.filter((m) => isMine(m)).map((m) => m.id);
    if (ownIds.length === 0) {
      Alert.alert("Нельзя удалить", "Можно удалять только свои сообщения");
      clearSelection();
      return;
    }
    Alert.alert(`Удалить ${ownIds.length} сообщ.?`, undefined, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await Promise.all(ownIds.map((id) => api.deleteMessage(id)));
            setMessages((prev) =>
              prev.map((m) =>
                ownIds.includes(m.id) ? { ...m, is_deleted: true, content_encrypted: "" } : m
              )
            );
          } catch (e: unknown) {
            Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось удалить");
          } finally {
            clearSelection();
          }
        },
      },
    ]);
  };

  const openForward = async () => {
    try {
      const rooms = await api.getChatRooms();
      setForwardRooms(rooms.filter((r) => r.id !== roomId));
      setForwardOpen(true);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось загрузить чаты");
    }
  };

  const doForward = async (targetRoomId: string) => {
    const ids = selectedMessages.map((m) => m.id);
    if (ids.length === 0) {
      setForwardOpen(false);
      clearSelection();
      return;
    }
    setForwarding(true);
    try {
      await api.forwardMessages(ids, targetRoomId);
      setForwardOpen(false);
      clearSelection();
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось переслать");
    } finally {
      setForwarding(false);
    }
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = isMine(item);
    const image = isImageMessage(item);
    const imageUrl = item.file_url ? api.getFileUrl(item.file_url) : null;
    const isSelected = selectedIds.has(item.id);

    const older = visibleMessages[index - 1];
    const showDateSeparator =
      !older || !isSameDay(new Date(older.created_at), new Date(item.created_at));

    return (
      <>
        {showDateSeparator && (
          <View className="items-center py-2">
            <View className="bg-gray-200/80 rounded-full px-3 py-1">
              <Text className="text-[12px] text-gray-700 font-medium">
                {formatDateSeparator(item.created_at)}
              </Text>
            </View>
          </View>
        )}
      <Pressable
        onPress={() => onPressMessage(item)}
        onLongPress={() => onLongPressMessage(item)}
        delayLongPress={350}
        style={{
          backgroundColor: isSelected ? "rgba(79, 70, 229, 0.12)" : "transparent",
        }}
        className={`px-4 py-1 ${mine ? "items-end" : "items-start"}`}
      >
        {item.reply_to_id && (
          <View
            className={`mb-1 px-3 py-1 rounded-lg border-l-2 ${
              mine ? "bg-brand-50 border-brand-400" : "bg-gray-100 border-gray-400"
            }`}
          >
            <Text className="text-[13px] text-gray-500">Ответ на сообщение</Text>
          </View>
        )}

        {item.forwarded_from_sender_name && !item.is_deleted ? (
          <View
            className={`mb-0.5 px-3 py-0.5 ${mine ? "items-end" : "items-start"}`}
            style={{ maxWidth: "80%" }}
          >
            <Text className="text-[13px] italic text-gray-500">
              Переслано от {item.forwarded_from_sender_name}
            </Text>
          </View>
        ) : null}

        <View
          className={`rounded-2xl px-3 py-2 ${mine ? "bg-brand-700" : "bg-gray-100"}`}
          style={{ maxWidth: "80%" }}
        >
          {!mine && (
            <Text className="text-[14px] font-semibold text-brand-700 mb-0.5">{item.sender_name}</Text>
          )}

          {item.is_deleted ? (
            <View className="flex-row items-end" style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontStyle: "italic",
                  color: mine ? "rgba(255,255,255,0.75)" : "#9ca3af",
                  flexShrink: 1,
                }}
              >
                Сообщение удалено
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  marginLeft: "auto",
                  color: mine ? "rgba(255,255,255,0.6)" : "#9ca3af",
                }}
              >
                {formatTime(item.created_at)}
              </Text>
            </View>
          ) : (
            <>
              {image && imageUrl ? (
                <Pressable
                  onPress={() => {
                    if (selectionMode) onPressMessage(item);
                    else setImagePreview(imageUrl);
                  }}
                  onLongPress={() => onLongPressMessage(item)}
                  delayLongPress={350}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: 220, height: 220, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : item.file_url ? (
                <Pressable
                  onPress={() => openFile(item)}
                  className={`flex-row items-center gap-2 px-2 py-2 rounded-xl ${
                    mine ? "bg-white/15" : "bg-white"
                  }`}
                  style={{ minWidth: 180 }}
                >
                  <FileText size={24} color={mine ? "#fff" : "#4f46e5"} />
                  <View className="flex-1 min-w-0">
                    <Text
                      className={`text-[16px] font-medium ${mine ? "text-white" : "text-gray-900"}`}
                      numberOfLines={2}
                    >
                      {item.file_name ?? "Файл"}
                    </Text>
                    {item.file_size ? (
                      <Text className={`text-[13px] ${mine ? "text-white/70" : "text-gray-500"}`}>
                        {formatFileSize(item.file_size)}
                      </Text>
                    ) : null}
                  </View>
                  <Download size={16} color={mine ? "#fff" : "#6b7280"} />
                </Pressable>
              ) : null}

              <View
                className={`flex-row items-end flex-wrap ${
                  image || item.file_url ? "mt-1" : ""
                }`}
              >
                {item.content_encrypted &&
                !(item.file_url && item.content_encrypted === item.file_name) ? (
                  <Text
                    className={`text-[16px] ${mine ? "text-white" : "text-gray-900"}`}
                    style={{ flexShrink: 1 }}
                  >
                    {item.content_encrypted}
                  </Text>
                ) : null}
                <View className="flex-row items-center gap-1 ml-auto pl-2">
                  {item.edited_at ? (
                    <Text className={`text-[12px] ${mine ? "text-white/60" : "text-gray-400"}`}>
                      изм.
                    </Text>
                  ) : null}
                  <Text className={`text-[12px] ${mine ? "text-white/70" : "text-gray-400"}`}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Pressable>
      </>
    );
  };

  const keyExtractor = (m: ChatMessage) => m.id;

  const canEditAction = useMemo(
    () => actionSheet && isMine(actionSheet) && !actionSheet.is_deleted && !actionSheet.file_url,
    [actionSheet, isMine]
  );
  const canDeleteAction = useMemo(
    () => actionSheet && isMine(actionSheet) && !actionSheet.is_deleted,
    [actionSheet, isMine]
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={["top"]} className="bg-white">
        {selectionMode ? (
          <View className="px-2 pt-2 pb-3 border-b border-gray-100 flex-row items-center gap-2">
            <Pressable onPress={clearSelection} hitSlop={10} className="p-2">
              <X size={22} color="#111827" />
            </Pressable>
            <Text className="text-gray-900 text-base font-bold flex-1">
              Выбрано: {selectedIds.size}
            </Text>
            <Pressable onPress={handleCopySelection} hitSlop={8} className="p-2">
              <Copy size={22} color="#4f46e5" />
            </Pressable>
            <Pressable onPress={openForward} hitSlop={8} className="p-2">
              <Forward size={22} color="#4f46e5" />
            </Pressable>
            <Pressable onPress={handleDeleteSelection} hitSlop={8} className="p-2">
              <Trash2 size={22} color="#dc2626" />
            </Pressable>
          </View>
        ) : (
          <View className="px-4 pt-2 pb-3 border-b border-gray-100 flex-row items-center gap-3">
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} className="p-1">
              <ArrowLeft size={22} color="#111827" />
            </Pressable>
            <Pressable
              className="flex-1"
              onPress={() => navigation.navigate("ChatInfo", { roomId })}
              hitSlop={4}
            >
              <Text className="text-gray-900 text-base font-bold" numberOfLines={1}>
                {params?.title ?? "Чат"}
              </Text>
              {!wsConnected && (
                <Text className="text-[11px] text-gray-400">подключение…</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("ChatInfo", { roomId })}
              hitSlop={8}
              className="p-1"
            >
              <Info size={20} color="#6b7280" />
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={visibleMessages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onStartReached={loadMore}
            onStartReachedThreshold={0.3}
            maintainVisibleContentPosition={{ minIndexForVisible: 1, autoscrollToTopThreshold: 100 }}
            onContentSizeChange={() => {
              if (!didInitialScroll.current && visibleMessages.length > 0) {
                didInitialScroll.current = true;
                listRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListHeaderComponent={
              loadingMore ? (
                <View className="py-3 items-center">
                  <ActivityIndicator size="small" color="#9ca3af" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-400 text-sm">Нет сообщений. Напишите первым!</Text>
              </View>
            }
            contentContainerStyle={{ paddingVertical: 8, flexGrow: 1, justifyContent: "flex-end" }}
          />
        )}

        {/* Reply banner */}
        {replyTo && (
          <View className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-row items-center gap-2">
            <View className="w-1 h-8 bg-brand-500 rounded-full" />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-brand-700">Ответ {replyTo.sender_name}</Text>
              <Text className="text-xs text-gray-600" numberOfLines={1}>
                {replyTo.content_encrypted || replyTo.file_name || "Сообщение"}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <X size={16} color="#6b7280" />
            </Pressable>
          </View>
        )}

        {/* Edit banner */}
        {editingId && (
          <View className="px-4 py-2 border-t border-amber-200 bg-amber-50 flex-row items-center gap-2">
            <Pencil size={14} color="#b45309" />
            <Text className="flex-1 text-xs font-semibold text-amber-700">Редактирование</Text>
            <Pressable
              onPress={() => {
                setEditingId(null);
                setInput("");
              }}
              hitSlop={8}
            >
              <X size={16} color="#b45309" />
            </Pressable>
          </View>
        )}

        {/* Pending attachment */}
        {pending && (
          <View className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-row items-center gap-2">
            {pending.isImage ? (
              <Image
                source={{ uri: pending.uri }}
                style={{ width: 40, height: 40, borderRadius: 6 }}
              />
            ) : (
              <View className="w-10 h-10 rounded-md bg-brand-100 items-center justify-center">
                <FileText size={18} color="#4f46e5" />
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                {pending.name}
              </Text>
              {pending.size ? (
                <Text className="text-xs text-gray-500">{formatFileSize(pending.size)}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => setPending(null)} hitSlop={8}>
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View
          className="bg-white border-t border-gray-100"
          style={{ paddingBottom: bottomPad }}
        >
          <View className="px-2 py-2 flex-row items-end gap-1.5">
            <View className="flex-1 bg-gray-100 rounded-3xl flex-row items-end pl-2 pr-2">
              <Pressable
                onPress={showAttachSheet}
                disabled={!!editingId}
                hitSlop={8}
                className="w-10 h-11 items-center justify-center"
              >
                <Paperclip size={22} color={editingId ? "#d1d5db" : "#6b7280"} />
              </Pressable>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={editingId ? "Изменить сообщение…" : "Сообщение"}
                placeholderTextColor="#9ca3af"
                multiline
                style={{
                  flex: 1,
                  minHeight: 44,
                  maxHeight: 140,
                  fontSize: 16,
                  color: "#111827",
                  paddingVertical: 10,
                  paddingHorizontal: 4,
                  textAlignVertical: "center",
                }}
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={sending || uploading || (!input.trim() && !pending)}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                sending || uploading || (!input.trim() && !pending) ? "bg-brand-300" : "bg-brand-700"
              }`}
            >
              {sending || uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Action sheet for long-press */}
      <Modal
        visible={!!actionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheet(null)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setActionSheet(null)}>
          <View className="bg-white rounded-t-3xl py-2">
            <Pressable
              onPress={() => {
                if (actionSheet) setReplyTo(actionSheet);
                setActionSheet(null);
              }}
              className="flex-row items-center gap-3 px-5 py-4"
            >
              <Reply size={20} color="#4f46e5" />
              <Text className="text-gray-900 text-base">Ответить</Text>
            </Pressable>
            {actionSheet && actionSheet.content_encrypted ? (
              <Pressable
                onPress={async () => {
                  const text = actionSheet.content_encrypted;
                  setActionSheet(null);
                  try {
                    await Clipboard.setStringAsync(text);
                  } catch {
                    /* ignore */
                  }
                }}
                className="flex-row items-center gap-3 px-5 py-4"
              >
                <Copy size={20} color="#4f46e5" />
                <Text className="text-gray-900 text-base">Копировать</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                if (actionSheet) setSelectedIds(new Set([actionSheet.id]));
                setActionSheet(null);
              }}
              className="flex-row items-center gap-3 px-5 py-4"
            >
              <Check size={20} color="#4f46e5" />
              <Text className="text-gray-900 text-base">Выбрать</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (actionSheet) setSelectedIds(new Set([actionSheet.id]));
                setActionSheet(null);
                setTimeout(() => openForward(), 50);
              }}
              className="flex-row items-center gap-3 px-5 py-4"
            >
              <Forward size={20} color="#4f46e5" />
              <Text className="text-gray-900 text-base">Переслать</Text>
            </Pressable>
            {canEditAction && actionSheet ? (
              <Pressable
                onPress={() => {
                  if (actionSheet) {
                    setEditingId(actionSheet.id);
                    setInput(actionSheet.content_encrypted);
                    setPending(null);
                  }
                  setActionSheet(null);
                }}
                className="flex-row items-center gap-3 px-5 py-4"
              >
                <Pencil size={20} color="#b45309" />
                <Text className="text-gray-900 text-base">Редактировать</Text>
              </Pressable>
            ) : null}
            {canDeleteAction && actionSheet ? (
              <Pressable
                onPress={() => {
                  const m = actionSheet;
                  Alert.alert("Удалить сообщение?", undefined, [
                    { text: "Отмена", style: "cancel", onPress: () => setActionSheet(null) },
                    { text: "Удалить", style: "destructive", onPress: () => m && doDelete(m) },
                  ]);
                }}
                className="flex-row items-center gap-3 px-5 py-4"
              >
                <Trash2 size={20} color="#dc2626" />
                <Text className="text-red-600 text-base">Удалить</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setActionSheet(null)}
              className="flex-row items-center justify-center px-5 py-4 border-t border-gray-100 mt-1"
            >
              <Text className="text-gray-500 text-base">Отмена</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Full-screen image preview */}
      <Modal
        visible={!!imagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreview(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}
          onPress={() => setImagePreview(null)}
        >
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <View className="flex-row justify-end px-4 pt-2">
              <Pressable onPress={() => setImagePreview(null)} hitSlop={12} className="p-2">
                <X size={28} color="#fff" />
              </Pressable>
            </View>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              {imagePreview ? (
                <Image
                  source={{ uri: imagePreview }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {/* Forward modal — pick target room */}
      <Modal
        visible={forwardOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setForwardOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => !forwarding && setForwardOpen(false)}
        >
          <Pressable className="bg-white rounded-t-3xl pt-2" style={{ maxHeight: "75%" }}>
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
              <Text className="text-gray-900 text-base font-bold">
                Переслать ({selectedIds.size})
              </Text>
              <Pressable onPress={() => !forwarding && setForwardOpen(false)} hitSlop={8}>
                <X size={22} color="#6b7280" />
              </Pressable>
            </View>
            {forwarding ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#4f46e5" />
              </View>
            ) : forwardRooms.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-400">Нет других чатов</Text>
              </View>
            ) : (
              <FlatList
                data={forwardRooms}
                keyExtractor={(r) => r.id}
                renderItem={({ item: r }) => {
                  const title =
                    r.name ||
                    r.members.find((m) => !(m.member_id === myId && m.member_type === myMemberType))
                      ?.name ||
                    "Чат";
                  return (
                    <Pressable
                      onPress={() => doForward(r.id)}
                      className="px-5 py-3 border-b border-gray-50"
                    >
                      <Text className="text-gray-900 text-base" numberOfLines={1}>
                        {title}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
