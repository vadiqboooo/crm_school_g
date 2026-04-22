import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Trophy, XCircle, CheckCircle2 } from "lucide-react-native";
import { api, ExamResult } from "../lib/api";

const MONTH = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

export function ResultsScreen() {
  const navigation = useNavigation();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getResults();
      setResults(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-white">
        <View className="px-4 pt-2 pb-3 border-b border-gray-100 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} className="p-1">
            <ArrowLeft size={22} color="#111827" />
          </Pressable>
          <Text className="text-gray-900 text-lg font-bold">Результаты экзаменов</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Trophy size={40} color="#d1d5db" />
          <Text className="text-gray-500 text-center mt-3">Пока нет результатов</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {results.map((r) => {
            const passed = r.is_passed === true;
            const failed = r.is_passed === false;
            return (
              <View key={`${r.exam_id}-${r.added_at}`} className="bg-white rounded-2xl p-4 gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-gray-900" numberOfLines={2}>
                      {r.exam_title}
                    </Text>
                    {r.subject_name ? (
                      <Text className="text-sm text-gray-500 mt-0.5">{r.subject_name}</Text>
                    ) : null}
                  </View>
                  {passed ? (
                    <View className="bg-emerald-100 p-2 rounded-full">
                      <CheckCircle2 size={18} color="#059669" />
                    </View>
                  ) : failed ? (
                    <View className="bg-rose-100 p-2 rounded-full">
                      <XCircle size={18} color="#e11d48" />
                    </View>
                  ) : null}
                </View>

                <Text className="text-xs text-gray-400">{fmtDate(r.exam_date)}</Text>

                <View className="flex-row items-center gap-3 mt-1">
                  <View className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <Text className="text-xs text-gray-500">Первичный</Text>
                    <Text className="text-base font-bold text-gray-900">{r.primary_score}</Text>
                  </View>
                  <View className="flex-1 bg-brand-50 rounded-xl px-3 py-2">
                    <Text className="text-xs text-brand-700">Итоговый</Text>
                    <Text className="text-base font-bold text-brand-700">{r.final_score}</Text>
                  </View>
                  {r.threshold_score != null && (
                    <View className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <Text className="text-xs text-gray-500">Порог</Text>
                      <Text className="text-base font-bold text-gray-900">{r.threshold_score}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
