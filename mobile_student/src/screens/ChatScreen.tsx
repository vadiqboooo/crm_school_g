import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, X, UserPlus, Users } from "lucide-react-native";
import { api, ChatRoom, ChatSearchResult } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import type { ChatStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<ChatStackParamList, "ChatList">;

const avatarColors = [
  ["#ff885e", "#ff516a"],
  ["#ffcd6a", "#ffa85c"],
  ["#82b1ff", "#665fff"],
  ["#a0de7e", "#54cb68"],
  ["#53edd6", "#28c9b7"],
  ["#72d5fd", "#2a9ef1"],
  ["#e0a2f3", "#d669ed"],
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function pickColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function roomTitle(room: ChatRoom, myId: string | null): string {
  if (room.name) return room.name;
  const other = room.members.find((m) => m.member_id !== myId);
  return other?.name ?? "Чат";
}

function roomLastMessagePreview(room: ChatRoom): string {
  if (!room.last_message) return "Нет сообщений";
  return room.last_message.content_encrypted?.trim() || "📎 Файл";
}

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return WEEKDAYS[d.getDay()];
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) {
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}

export function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userResults, setUserResults] = useState<ChatSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getChatRooms();
      setRooms(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useChatWebSocket({
    enabled: true,
    onReconnect: load,
    onMessage: useCallback((msg) => {
      if (msg.type === "new_message") {
        const m = msg.message;
        setRooms((prev) => {
          const idx = prev.findIndex((r) => r.id === m.room_id);
          if (idx < 0) {
            load();
            return prev;
          }
          const next = [...prev];
          const room = { ...next[idx] };
          room.last_message = {
            content_encrypted: m.content_encrypted,
            created_at: m.created_at,
            sender_type: m.sender_type,
          };
          const mine = m.sender_id === myId && m.sender_type === (user?.role === "app_user" ? "app_user" : "student");
          if (!mine) room.unread_count = (room.unread_count ?? 0) + 1;
          next[idx] = room;
          return next;
        });
      } else if (msg.type === "message_deleted" || msg.type === "message_edited" || msg.type === "read_receipt") {
        load();
      }
    }, [load, myId, user?.role]),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...rooms];
    copy.sort((a, b) => {
      const at = a.last_message?.created_at ?? a.created_at;
      const bt = b.last_message?.created_at ?? b.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
    return copy;
  }, [rooms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => roomTitle(r, myId).toLowerCase().includes(q));
  }, [sorted, search, myId]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = search.trim();
    if (q.length < 2) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }
    setUserSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await api.searchUsers(q);
        const filteredRes = res.filter((r) => !(r.id === myId));
        setUserResults(filteredRes);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [search, myId]);

  const handleOpenNewChat = useCallback(
    async (target: ChatSearchResult) => {
      if (openingId) return;
      setOpeningId(target.id);
      try {
        const room = await api.getOrCreateDirectRoom(target.id, target.member_type);
        setSearch("");
        setSearchOpen(false);
        setUserResults([]);
        navigation.navigate("ChatRoom", { roomId: room.id, title: target.name });
      } catch (e) {
        console.warn("direct room error", e);
      } finally {
        setOpeningId(null);
      }
    },
    [navigation, openingId],
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={["top"]} className="bg-white">
        <View className="px-4 pt-2 pb-2 flex-row items-center justify-between">
          <Text className="text-gray-900 text-[22px] font-bold tracking-tight">Сообщения</Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              className="p-2 rounded-full"
              hitSlop={8}
              onPress={() => navigation.navigate("CreateGroup")}
            >
              <Users size={22} color="#6b7280" />
            </Pressable>
            <Pressable
              className="p-2 rounded-full"
              hitSlop={8}
              onPress={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setSearch("");
              }}
            >
              {searchOpen ? <X size={22} color="#6b7280" /> : <Search size={22} color="#6b7280" />}
            </Pressable>
          </View>
        </View>

        {searchOpen && (
          <View className="px-4 pb-2">
            <View className="bg-gray-100 rounded-full flex-row items-center px-3 h-10">
              <Search size={16} color="#9ca3af" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск чатов"
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 ml-2 text-gray-900"
                style={{ fontSize: 15, paddingVertical: 0 }}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <X size={16} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
          ListHeaderComponent={
            filtered.length > 0 && search.trim().length >= 2 ? (
              <Text className="text-gray-400 text-[11px] font-semibold px-4 pt-2 pb-1 uppercase tracking-wider">
                Чаты
              </Text>
            ) : null
          }
          ListEmptyComponent={
            !search ? (
              <View className="items-center justify-center px-8 pt-24">
                <Text className="text-gray-400 text-center text-[15px]">У вас пока нет чатов</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            search.trim().length >= 2 ? (
              <View className="pt-2 pb-6">
                <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
                  <Text className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                    Новые контакты
                  </Text>
                  {userSearchLoading && <ActivityIndicator size="small" color="#9ca3af" />}
                </View>
                {userResults.length === 0 && !userSearchLoading ? (
                  <View className="px-4 py-6">
                    <Text className="text-gray-400 text-center text-[14px]">
                      {filtered.length === 0 ? "Ничего не найдено" : "Больше никого не найдено"}
                    </Text>
                  </View>
                ) : (
                  userResults.map((u) => {
                    const colors = pickColor(u.id);
                    const isOpening = openingId === u.id;
                    const typeLabel =
                      u.member_type === "student"
                        ? "Ученик"
                        : u.member_type === "employee"
                          ? "Сотрудник"
                          : "Пользователь";
                    return (
                      <Pressable
                        key={`${u.member_type}:${u.id}`}
                        onPress={() => handleOpenNewChat(u)}
                        disabled={isOpening}
                        android_ripple={{ color: "rgba(0,0,0,0.04)" }}
                        className="flex-row items-center px-4 py-2.5 active:bg-gray-50"
                      >
                        <View
                          className="w-[54px] h-[54px] rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: colors[1] }}
                        >
                          <Text className="text-white text-[17px] font-semibold">{initials(u.name)}</Text>
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-gray-900 text-[16px] font-semibold" numberOfLines={1}>
                            {u.name}
                          </Text>
                          <Text className="text-gray-400 text-[13px] mt-0.5">{typeLabel}</Text>
                        </View>
                        {isOpening ? (
                          <ActivityIndicator size="small" color="#4f46e5" />
                        ) : (
                          <UserPlus size={20} color="#4f46e5" />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const title = roomTitle(item, myId);
            const colors = pickColor(item.id);
            const preview = roomLastMessagePreview(item);
            const ts = item.last_message?.created_at ?? item.created_at;
            const unread = item.unread_count > 0;

            const handleLongPress = () => {
              const isGroup = item.room_type === "group";
              const leaveLabel = isGroup ? "Выйти из группы" : "Удалить чат";
              Alert.alert(title, undefined, [
                {
                  text: leaveLabel,
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await api.leaveRoom(item.id);
                      setRooms((prev) => prev.filter((r) => r.id !== item.id));
                    } catch (e: unknown) {
                      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось");
                    }
                  },
                },
                { text: "Отмена", style: "cancel" },
              ]);
            };

            return (
              <Pressable
                onPress={() => navigation.navigate("ChatRoom", { roomId: item.id, title })}
                onLongPress={handleLongPress}
                delayLongPress={400}
                android_ripple={{ color: "rgba(0,0,0,0.04)" }}
                className="flex-row items-center px-4 py-2.5 active:bg-gray-50"
              >
                <View
                  className="w-[54px] h-[54px] rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: colors[1] }}
                >
                  <Text className="text-white text-[17px] font-semibold">{initials(title)}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text
                      className="text-gray-900 text-[16px] font-semibold flex-1 mr-2"
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    <Text
                      className={`text-[12px] ${unread ? "text-brand-600 font-medium" : "text-gray-400"}`}
                    >
                      {formatChatTime(ts)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-[14px] flex-1 pr-2 ${unread ? "text-gray-600" : "text-gray-400"}`}
                      numberOfLines={1}
                    >
                      {preview}
                    </Text>
                    {unread && (
                      <View
                        className="bg-brand-600 rounded-full px-1.5 items-center justify-center"
                        style={{ minWidth: 22, height: 22 }}
                      >
                        <Text className="text-white text-[12px] font-bold">
                          {item.unread_count > 99 ? "99+" : item.unread_count}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
