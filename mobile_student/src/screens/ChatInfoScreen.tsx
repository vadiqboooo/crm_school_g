import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, LogOut, Trash2, UserMinus } from "lucide-react-native";
import { api, ChatRoom, ChatMember } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { ChatStackParamList } from "../navigation/types";

type Route = RouteProp<ChatStackParamList, "ChatInfo">;
type Nav = NativeStackNavigationProp<ChatStackParamList>;

const avatarColors = [
  "#ff516a", "#ffa85c", "#665fff", "#54cb68", "#28c9b7", "#2a9ef1", "#d669ed",
];

function pickColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function memberTypeLabel(t: string) {
  if (t === "student") return "Ученик";
  if (t === "employee") return "Сотрудник";
  return "Пользователь";
}

export function ChatInfoScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const myMemberType = user?.role === "app_user" ? "app_user" : "student";

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.getRoom(params.roomId);
      setRoom(r);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [params.roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const isCustomGroup = room?.room_type === "group" && !room.group_id;
  const isDirect = room?.room_type === "direct";

  const handleLeave = () => {
    const title = isDirect ? "Удалить чат?" : "Выйти из группы?";
    const message = isDirect
      ? "Переписка будет удалена для вас."
      : "Вы покинете группу и не будете видеть новые сообщения.";

    Alert.alert(title, message, [
      { text: "Отмена", style: "cancel" },
      {
        text: isDirect ? "Удалить" : "Выйти",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);
          try {
            await api.leaveRoom(params.roomId);
            // Go back to ChatList
            navigation.popToTop();
          } catch (e: unknown) {
            Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось выйти");
            setLeaving(false);
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (member: ChatMember) => {
    Alert.alert(
      `Удалить ${member.name}?`,
      "Участник будет удалён из группы.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await api.removeMemberFromRoom(
                params.roomId,
                member.member_id,
                member.member_type,
              );
              setRoom((prev) =>
                prev
                  ? {
                      ...prev,
                      members: prev.members.filter((m) => m.member_id !== member.member_id),
                    }
                  : prev,
              );
            } catch (e: unknown) {
              Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось удалить участника");
            }
          },
        },
      ],
    );
  };

  const roomTitle = room?.name
    ?? room?.members.find((m) => m.member_id !== myId)?.name
    ?? "Чат";

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-white">
        <View className="px-4 pt-2 pb-3 flex-row items-center gap-3 border-b border-gray-100">
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ChevronLeft size={22} color="#374151" />
          </Pressable>
          <Text className="flex-1 text-gray-900 text-[17px] font-semibold" numberOfLines={1}>
            {loading ? "Загрузка…" : roomTitle}
          </Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={room?.members ?? []}
          keyExtractor={(m) => `${m.member_type}:${m.member_id}`}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <>
              {/* Room header card */}
              <View className="bg-white px-4 py-5 items-center mb-3">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: pickColor(params.roomId) }}
                >
                  <Text className="text-white text-[22px] font-bold">
                    {initials(roomTitle)}
                  </Text>
                </View>
                <Text className="text-gray-900 text-[18px] font-bold text-center">{roomTitle}</Text>
                <Text className="text-gray-400 text-[13px] mt-0.5">
                  {isDirect
                    ? "Личный чат"
                    : room?.group_id
                    ? "Чат учебной группы"
                    : "Групповой чат"}
                </Text>
              </View>

              {/* Members section header */}
              <View className="px-4 pb-2 pt-1">
                <Text className="text-gray-500 text-[11px] font-semibold uppercase tracking-wide">
                  Участники · {room?.members.length ?? 0}
                </Text>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const isMe = item.member_id === myId && item.member_type === myMemberType;
            const color = pickColor(item.member_id);
            const canRemove = isCustomGroup && !isMe;
            return (
              <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-50">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: color }}
                >
                  <Text className="text-white text-[14px] font-semibold">
                    {initials(item.name)}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-gray-900 text-[15px] font-medium" numberOfLines={1}>
                    {item.name}
                    {isMe ? " (вы)" : ""}
                  </Text>
                  <Text className="text-gray-400 text-[12px]">
                    {memberTypeLabel(item.member_type)}
                  </Text>
                </View>
                {canRemove && (
                  <Pressable
                    onPress={() => handleRemoveMember(item)}
                    hitSlop={8}
                    className="p-2"
                  >
                    <UserMinus size={18} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            <View className="px-4 pt-4">
              <Pressable
                onPress={handleLeave}
                disabled={leaving}
                className="flex-row items-center gap-3 bg-white rounded-2xl px-4 py-4 shadow-sm"
              >
                <View className="w-9 h-9 rounded-xl items-center justify-center bg-red-50">
                  {leaving ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : isDirect ? (
                    <Trash2 size={18} color="#ef4444" />
                  ) : (
                    <LogOut size={18} color="#ef4444" />
                  )}
                </View>
                <Text className="text-red-500 text-sm font-medium">
                  {isDirect ? "Удалить чат" : "Выйти из группы"}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}
