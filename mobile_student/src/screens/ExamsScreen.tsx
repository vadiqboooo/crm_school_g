import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Sun, GraduationCap, FileText, ChevronRight, Users, ArrowLeft } from "lucide-react-native";
import type { HomeStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "Exams">;

const banners = [
  {
    id: "summer",
    title: "Летний курс",
    subtitle: "Интенсивная подготовка к ЕГЭ/ОГЭ",
    tag: "☀️ ЛЕТО 2025",
    tagColor: "#facc15",
    tagTextColor: "#78350f",
    priceHint: "от 990 ₽",
    Icon: Sun,
    gradient: ["#ff9b3d", "#ff6b35", "#c9302c"] as const,
  },
  {
    id: "annual",
    title: "Годовая подготовка",
    subtitle: "Полная программа ЕГЭ на весь год",
    tag: "📚 2025–2026",
    tagColor: "#93c5fd",
    tagTextColor: "#1e3a8a",
    priceHint: "от 699 ₽/мес",
    Icon: GraduationCap,
    gradient: ["#1e3a8a", "#2563eb", "#1e40af"] as const,
  },
  {
    id: "trial",
    title: "Пробный экзамен",
    subtitle: "Проверь свой уровень в формате ЕГЭ",
    tag: "✓ БЕСПЛАТНО",
    tagColor: "#4ade80",
    tagTextColor: "#14532d",
    priceHint: "Ближайший: 26 апр",
    Icon: FileText,
    gradient: ["#6d28d9", "#7c3aed", "#4c1d95"] as const,
  },
];

export function ExamsScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-white">
        <View className="px-4 pt-2 pb-3 border-b border-gray-100 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} className="p-1">
            <ArrowLeft size={22} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-gray-900 text-lg font-bold">Экзамены</Text>
            <Text className="text-xs text-gray-500">Подготовка и запись</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("ExamRegister")}
            className="bg-brand-700 rounded-xl px-3 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">Записаться</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
        {banners.map((b) => (
          <Pressable
            key={b.id}
            className="rounded-3xl overflow-hidden shadow-md"
            style={{ height: 160 }}
            onPress={() => navigation.navigate("ExamRegister", { sessionId: b.id })}
          >
            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: b.gradient[1],
              }}
            />
            <View className="absolute inset-0 p-5 flex justify-between">
              <View className="flex-row items-center gap-2">
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: b.tagColor }}>
                  <Text className="text-xs font-bold" style={{ color: b.tagTextColor }}>
                    {b.tag}
                  </Text>
                </View>
                <View className="px-2.5 py-1 rounded-full bg-white/20">
                  <Text className="text-white text-xs">{b.priceHint}</Text>
                </View>
              </View>
              <View>
                <View className="flex-row items-center gap-2 mb-1">
                  <b.Icon size={18} color="#fff" />
                  <Text className="text-white text-lg font-extrabold">{b.title}</Text>
                </View>
                <Text className="text-white/80 text-sm">{b.subtitle}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        <View className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
            <Users size={18} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 text-sm font-semibold">Уже с нами 320+ учеников</Text>
            <Text className="text-gray-500 text-xs">Средний балл наших выпускников — 82</Text>
          </View>
          <ChevronRight size={16} color="#d1d5db" />
        </View>
      </ScrollView>
    </View>
  );
}
