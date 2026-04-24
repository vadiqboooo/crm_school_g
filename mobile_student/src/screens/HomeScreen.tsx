import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Bell, X } from "lucide-react-native";
import { api, StudentProfile } from "../lib/api";
import type { TabParamList } from "../navigation/types";

type Nav = BottomTabNavigationProp<TabParamList, "HomeTab">;

type ExamType = "ЕГЭ" | "ОГЭ";
type SubjectKey = "cs" | "ru" | "ma" | "other";

const OTHER_SUBJECTS_EGE = [
  "Базовая математика",
  "Физика",
  "Обществознание",
  "История",
  "Английский",
  "География",
  "Биология",
  "Химия",
];
const OTHER_SUBJECTS_OGE = [
  "Физика",
  "Обществознание",
  "История",
  "Английский",
  "География",
  "Биология",
  "Химия",
];

const C = {
  purple: "#7B52F4",
  yellow: "#F5C300",
  sub: "#888899",
  text: "#1A1A1A",
};

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [exam, setExam] = useState<ExamType>("ЕГЭ");
  const [subj, setSubj] = useState<SubjectKey>("cs");
  const [otherSubj, setOtherSubj] = useState<string>("");

  const [signupOpen, setSignupOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    await Promise.all([
      api.getMe().then(setProfile).catch(() => {}),
      api.getNotificationsUnreadCount().then((r) => setUnreadNotifs(r.count)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const maLabel = exam === "ЕГЭ" ? "Проф. математика" : "Математика";
  const subjectLabel =
    subj === "cs"
      ? "Информатика"
      : subj === "ru"
        ? "Русский"
        : subj === "ma"
          ? maLabel
          : otherSubj || "Другой предмет";

  const extraList = exam === "ЕГЭ" ? OTHER_SUBJECTS_EGE : OTHER_SUBJECTS_OGE;

  const openSignup = () => {
    if (subj === "other" && !otherSubj) {
      Alert.alert("Выберите предмет", "Укажите предмет из списка");
      return;
    }
    setForm({
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      phone: profile?.phone ?? "",
    });
    setSignupOpen(true);
  };

  const handleSubmit = async () => {
    const first = form.first_name.trim();
    const last = form.last_name.trim();
    if (!first) {
      Alert.alert("Заполните поля", "Укажите имя");
      return;
    }
    if (!last) {
      Alert.alert("Заполните поля", "Укажите фамилию");
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert("Заполните поля", "Укажите телефон или email для связи");
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.submitTrialSignup({
        student_name: `${first} ${last}`,
        phone: form.phone.trim(),
        exam_type: exam,
        subject_name: subjectLabel,
      });
      setSignupOpen(false);

      if (res.room_id) {
        navigation.dispatch(
          CommonActions.navigate({
            name: "ChatTab",
            params: {
              screen: "ChatRoom",
              params: {
                roomId: res.room_id,
                title: res.admin_name ?? "Администратор",
              },
              initial: false,
            },
          }),
        );
      } else {
        Alert.alert(
          "Спасибо!",
          "Заявка принята. Мы свяжемся с вами в ближайшее время.",
        );
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f5f5fa]">
      <SafeAreaView edges={["top"]} className="bg-[#f5f5fa]">
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Гарри 🧙</Text>
          <Pressable
            onPress={() =>
              navigation.navigate("HomeTab", { screen: "Notifications" })
            }
            hitSlop={8}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
          >
            <Bell size={20} color="#111827" />
            {unreadNotifs > 0 && (
              <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center border-2 border-[#f5f5fa]">
                <Text className="text-[10px] font-bold text-white">
                  {unreadNotifs > 99 ? "99+" : unreadNotifs}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.purple} />}
      >
        {loading && (
          <View className="py-8 items-center">
            <ActivityIndicator color={C.purple} />
          </View>
        )}

        {/* ── Главный баннер летнего курса ── */}
        <View
          style={{
            borderRadius: 22,
            backgroundColor: "#1A0A3D",
            padding: 18,
            paddingBottom: 16,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -24,
              top: -24,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: "rgba(255,130,0,0.13)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: 30,
              bottom: -18,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(255,130,0,0.08)",
            }}
          />
          <Image
            source={require("../../assets/icon.png")}
            resizeMode="contain"
            style={{
              position: "absolute",
              bottom: -20,
              right: -18,
              height: 170,
              width: 170,
              opacity: 0.6,
            }}
          />

          <View style={{ position: "relative", zIndex: 1 }}>
            <View style={{ flexDirection: "row", gap: 7, marginBottom: 11, alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: C.yellow,
                  borderRadius: 20,
                  paddingHorizontal: 11,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#1A1A1A", fontSize: 12, fontWeight: "700" }}>
                  ☀️ ЛЕТО 2025
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  borderRadius: 20,
                  paddingHorizontal: 11,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>8–11 класс</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#fff", lineHeight: 28 }}>
                Летний курс
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(245,195,0,0.25)",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: C.yellow, fontSize: 14, fontWeight: "900" }}>~60 баллов</Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 }}>
              ЕГЭ и ОГЭ · интенсив
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 13 }}>
              {["▶ Видео 15мин", "✍️ Задания + ДЗ", "📝 Контрольные", "🎯 2–3 варианта"].map((f) => (
                <View
                  key={f}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.13)",
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "500" }}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Тип экзамена + выбор предмета ── */}
        <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.sub, marginBottom: 8, letterSpacing: 0.2 }}>
            ТИП ЭКЗАМЕНА
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {(["ЕГЭ", "ОГЭ"] as ExamType[]).map((e) => {
              const active = exam === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => setExam(e)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: active ? C.purple : "#F0EEF8",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: active ? "#fff" : C.text, fontWeight: "700", fontSize: 15 }}>
                    {e}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontSize: 13, fontWeight: "700", color: C.sub, marginBottom: 8, letterSpacing: 0.2 }}>
            ПРЕДМЕТ
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {([
              { id: "cs" as const, emoji: "💻", label: "Информатика" },
              { id: "ru" as const, emoji: "📖", label: "Русский" },
            ]).map((s) => {
              const active = subj === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSubj(s.id)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: active ? C.purple : "#F0EEF8",
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                  <Text style={{ color: active ? "#fff" : C.text, fontWeight: "600", fontSize: 14 }}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {[
            { id: "ma" as const, emoji: "📊", label: maLabel },
            { id: "other" as const, emoji: "➕", label: "Другой предмет" },
          ].map((s) => {
            const active = subj === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSubj(s.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: active ? C.purple : "#F0EEF8",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                <Text style={{ color: active ? "#fff" : C.text, fontWeight: "600", fontSize: 14 }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Инфо-плашка с ценой ── */}
        <View style={{ backgroundColor: C.purple, borderRadius: 18, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Выбран предмет</Text>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff", marginTop: 2 }} numberOfLines={2}>
                {subjectLabel}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Стоимость</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: C.yellow, marginTop: 2 }}>
                990 ₽
              </Text>
            </View>
          </View>

          {subj === "other" && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginBottom: 6 }}>
                Выберите предмет из списка:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {extraList.map((s) => {
                  const active = otherSubj === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setOtherSubj(s)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: active ? C.yellow : "rgba(255,255,255,0.18)",
                      }}
                    >
                      <Text style={{ color: active ? "#1A1A1A" : "#fff", fontWeight: "600", fontSize: 12 }}>
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ── CTA ── */}
        <Pressable
          onPress={openSignup}
          style={{
            backgroundColor: C.purple,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Оставить заявку →</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={signupOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSignupOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="bg-white rounded-t-3xl">
            <View style={{ width: 36, height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 }} />
            <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
              <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
                Заявка на летний курс
              </Text>
              <Pressable onPress={() => setSignupOpen(false)} hitSlop={12}>
                <X size={22} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
              <Text className="text-sm text-gray-500 mb-4">
                {subjectLabel} · {exam} · 990 ₽
              </Text>

              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">
                  Имя <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={form.first_name}
                  onChangeText={(v) => setForm((p) => ({ ...p, first_name: v }))}
                  placeholder="Иван"
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>

              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">
                  Фамилия <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={form.last_name}
                  onChangeText={(v) => setForm((p) => ({ ...p, last_name: v }))}
                  placeholder="Иванов"
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">
                  Телефон или email <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={form.phone}
                  onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
                  placeholder="+7 ___ ___ __ __"
                  placeholderTextColor="#9ca3af"
                  keyboardType="default"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>
            </ScrollView>

            <View className="px-5 pt-2 pb-6">
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: C.purple,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-[16px]">Отправить заявку</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
