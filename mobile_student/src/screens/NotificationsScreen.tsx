import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft, Bell, CheckCheck } from "lucide-react-native";
import { api, NotificationItem } from "../lib/api";

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (sameDay) return `Сегодня, ${hh}:${mm}`;
  if (d.toDateString() === yesterday.toDateString()) return `Вчера, ${hh}:${mm}`;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}, ${hh}:${mm}`;
}

export function NotificationsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setItems(data);
      const hasUnread = data.some((n) => !n.is_read);
      if (hasUnread) {
        api.markAllNotificationsRead().catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handlePress = async (n: NotificationItem) => {
    if (!n.is_read) {
      try {
        await api.markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch {
        // ignore
      }
    }
    if (n.action_url) {
      Linking.openURL(n.action_url).catch(() => {});
    }
  };

  return (
    <View className="flex-1 bg-[#f5f5fa]">
      <SafeAreaView edges={["top"]} className="bg-white border-b border-gray-100">
        <View className="flex-row items-center px-3 py-2">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
            hitSlop={8}
          >
            <ChevronLeft size={24} color="#111827" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900">Уведомления</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Bell size={32} color="#9ca3af" />
          </View>
          <Text className="text-gray-900 font-semibold text-base text-center">Пока нет уведомлений</Text>
          <Text className="text-gray-500 text-sm text-center mt-1">
            Здесь будут появляться новости и объявления школы
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              className="bg-white rounded-2xl p-4 flex-row gap-3"
            >
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: (item.color ?? "#4f46e5") + "22" }}
              >
                {item.icon ? (
                  <Text className="text-xl">{item.icon}</Text>
                ) : (
                  <Bell size={20} color={item.color ?? "#4f46e5"} />
                )}
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-start gap-2">
                  <Text className="flex-1 text-[15px] font-bold text-gray-900" numberOfLines={2}>
                    {item.title}
                  </Text>
                  {!item.is_read && <View className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />}
                </View>
                <Text className="text-[14px] text-gray-600 mt-1" numberOfLines={3}>
                  {item.body}
                </Text>
                <View className="flex-row items-center gap-1 mt-2">
                  <CheckCheck size={12} color="#9ca3af" />
                  <Text className="text-[11px] text-gray-400">{formatTime(item.created_at)}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
