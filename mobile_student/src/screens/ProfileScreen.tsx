import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  LogOut,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  BookOpen,
  Star,
  Award,
  User,
} from "lucide-react-native";
import { api, StudentProfile } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { ProfileStackParamList } from "../navigation/types";

type ProfileNav = NativeStackNavigationProp<ProfileStackParamList>;

const menuSections = [
  {
    section: "ПОДДЕРЖКА",
    items: [{ icon: HelpCircle, label: "Помощь и FAQ", color: "#f97316", bg: "#fff7ed" }],
  },
];

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<ProfileNav>();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayName =
    profile?.chat_display_name ??
    `${profile?.first_name ?? user?.first_name ?? ""} ${profile?.last_name ?? user?.last_name ?? ""}`.trim();

  const stats = [
    { icon: BookOpen, color: "#3b82f6", bg: "#eff6ff", value: String(profile?.groups.length ?? 0), label: "Групп" },
    { icon: Star, color: "#eab308", bg: "#fefce8", value: String(profile?.balance ?? 0), label: "Баланс" },
    { icon: Award, color: "#a855f7", bg: "#faf5ff", value: profile?.class_number ? `${profile.class_number}` : "—", label: "Класс" },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-brand-700">
        <View className="px-4 pt-2 pb-8 bg-brand-700">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-white text-xl font-bold">Профиль</Text>
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
            >
              <Settings size={16} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-4">
            {/* Avatar */}
            <Pressable onPress={() => navigation.navigate("Settings")}>
              <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-lg overflow-hidden">
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: 80, height: 80 }}
                    resizeMode="cover"
                  />
                ) : (
                  <User size={32} color="#6366f1" />
                )}
              </View>
            </Pressable>

            <View className="flex-1">
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="text-white text-lg font-bold">{displayName || "Ученик"}</Text>
                  <Text className="text-white/70 text-sm mt-0.5">
                    {user?.role === "student"
                      ? "Ученик"
                      : user?.student_id
                        ? "Родитель"
                        : "Пользователь"}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-1">
                    <View className="w-2 h-2 bg-green-400 rounded-full" />
                    <Text className="text-green-300 text-xs">Онлайн</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 -mt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Stats */}
        <View className="px-4 mb-5">
          <View className="bg-white rounded-2xl shadow-sm p-4 flex-row gap-3">
            {stats.map((stat) => (
              <View key={stat.label} className="flex-1 items-center gap-1.5">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon size={18} color={stat.color} />
                </View>
                <Text className="text-gray-900 text-sm font-bold">{stat.value}</Text>
                <Text className="text-gray-500 text-[10px] text-center">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings shortcut */}
        <View className="px-4 mb-4">
          <Text className="text-gray-500 text-xs font-semibold mb-2 px-1">АККАУНТ</Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              className="flex-row items-center gap-3 px-4 py-4"
            >
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-indigo-50">
                <Settings size={18} color="#6366f1" />
              </View>
              <Text className="flex-1 text-gray-800 text-sm font-medium">Редактировать профиль</Text>
              <ChevronRight size={16} color="#d1d5db" />
            </Pressable>
            <Pressable className="flex-row items-center gap-3 px-4 py-4 border-t border-gray-50">
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-blue-50">
                <Bell size={18} color="#3b82f6" />
              </View>
              <Text className="flex-1 text-gray-800 text-sm font-medium">Уведомления</Text>
              <ChevronRight size={16} color="#d1d5db" />
            </Pressable>
            <Pressable className="flex-row items-center gap-3 px-4 py-4 border-t border-gray-50">
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-green-50">
                <Shield size={18} color="#10b981" />
              </View>
              <Text className="flex-1 text-gray-800 text-sm font-medium">Конфиденциальность</Text>
              <ChevronRight size={16} color="#d1d5db" />
            </Pressable>
          </View>
        </View>

        {menuSections.map((section) => (
          <View key={section.section} className="px-4 mb-4">
            <Text className="text-gray-500 text-xs font-semibold mb-2 px-1">{section.section}</Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  className={`flex-row items-center gap-3 px-4 py-4 ${i > 0 ? "border-t border-gray-50" : ""}`}
                >
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: item.bg }}>
                    <item.icon size={18} color={item.color} />
                  </View>
                  <Text className="flex-1 text-gray-800 text-sm font-medium">{item.label}</Text>
                  <ChevronRight size={16} color="#d1d5db" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View className="px-4">
          <Pressable
            onPress={signOut}
            className="bg-white rounded-2xl flex-row items-center gap-3 px-4 py-4 shadow-sm"
          >
            <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center">
              <LogOut size={18} color="#ef4444" />
            </View>
            <Text className="flex-1 text-red-500 text-sm font-medium">Выйти из аккаунта</Text>
          </Pressable>
          <Text className="text-center text-gray-300 text-xs pt-3">Версия 0.1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
