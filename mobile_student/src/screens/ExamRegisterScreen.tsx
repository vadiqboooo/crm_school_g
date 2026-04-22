import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Calendar, Clock, Users } from "lucide-react-native";
import { api, ExamSession, TimeSlot } from "../lib/api";

const MONTH = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
}
function fmtTime(t: string) {
  return t.slice(0, 5);
}

export function ExamRegisterScreen() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .getExamSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onRegister = (session: ExamSession, slot: TimeSlot) => {
    Alert.alert(
      "Записаться на экзамен",
      `${session.exam_title}\n${fmtDate(slot.date)} в ${fmtTime(slot.start_time)}`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Записаться",
          onPress: async () => {
            setRegistering(slot.id);
            try {
              await api.registerForExam(slot.id, session.subject_id);
              Alert.alert("Готово", "Вы записаны на экзамен");
              load();
            } catch (err: unknown) {
              Alert.alert("Ошибка", err instanceof Error ? err.message : "Не удалось записаться");
            } finally {
              setRegistering(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-white">
        <View className="px-4 pt-2 pb-3 border-b border-gray-100 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} className="p-1">
            <ArrowLeft size={22} color="#111827" />
          </Pressable>
          <Text className="text-gray-900 text-lg font-bold">Запись на экзамен</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-gray-500 text-center">Нет открытых записей на экзамены</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {sessions.map((s) => (
            <View key={s.id} className="bg-white rounded-2xl p-4 gap-3">
              <View>
                <Text className="text-base font-bold text-gray-900">{s.exam_title}</Text>
                {s.subject_name ? (
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {s.subject_name}
                    {s.exam_type ? ` · ${s.exam_type}` : ""}
                  </Text>
                ) : null}
                {s.school_location_name ? (
                  <Text className="text-xs text-gray-400 mt-0.5">{s.school_location_name}</Text>
                ) : null}
              </View>

              <View className="gap-2">
                {s.time_slots.map((slot) => {
                  const full = slot.available_seats <= 0;
                  const mine = slot.is_registered;
                  return (
                    <Pressable
                      key={slot.id}
                      disabled={full || mine || registering === slot.id}
                      onPress={() => onRegister(s, slot)}
                      className={`rounded-xl border px-3 py-3 flex-row items-center gap-3 ${
                        mine ? "bg-emerald-50 border-emerald-200" : full ? "bg-gray-50 border-gray-200" : "bg-white border-brand-200"
                      }`}
                    >
                      <View className="w-9 h-9 rounded-lg bg-brand-50 items-center justify-center">
                        <Calendar size={16} color="#4f46e5" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-semibold text-gray-900">{fmtDate(slot.date)}</Text>
                          <Clock size={12} color="#9ca3af" />
                          <Text className="text-sm text-gray-700">{fmtTime(slot.start_time)}</Text>
                        </View>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Users size={12} color="#9ca3af" />
                          <Text className="text-xs text-gray-500">
                            Свободно {slot.available_seats} из {slot.total_seats}
                          </Text>
                        </View>
                      </View>
                      {registering === slot.id ? (
                        <ActivityIndicator size="small" color="#4f46e5" />
                      ) : mine ? (
                        <Text className="text-xs font-bold text-emerald-700">Записан</Text>
                      ) : full ? (
                        <Text className="text-xs font-bold text-gray-400">Мест нет</Text>
                      ) : (
                        <Text className="text-xs font-bold text-brand-700">Выбрать</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
