import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Search, X, Check, Users } from "lucide-react-native";
import { api, ChatSearchResult } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { ChatStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<ChatStackParamList>;

const avatarColors = [
  "#ff516a", "#ffa85c", "#665fff", "#54cb68", "#28c9b7", "#2a9ef1", "#d669ed",
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

function typeLabel(t: string) {
  if (t === "student") return "Ученик";
  if (t === "employee") return "Сотрудник";
  return "Пользователь";
}

export function CreateGroupScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ChatSearchResult[]>([]);
  const [creating, setCreating] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await api.searchUsers(q);
        // Exclude self
        setResults(res.filter((r) => r.id !== user?.id));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, user?.id]);

  const toggle = useCallback((u: ChatSearchResult) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.id === u.id);
      return exists ? prev.filter((s) => s.id !== u.id) : [...prev, u];
    });
  }, []);

  const isSelected = (u: ChatSearchResult) => selected.some((s) => s.id === u.id);

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) return;
    if (selected.length === 0) return;

    setCreating(true);
    try {
      const members = selected.map((s) => ({ id: s.id, type: s.member_type }));
      const room = await api.createCustomGroupRoom(name, members);
      navigation.replace("ChatRoom", { roomId: room.id, title: name });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось создать чат";
      // simple inline error — Alert avoided for smoother UX
      console.warn("createGroup error", msg);
    } finally {
      setCreating(false);
    }
  };

  const canCreate = groupName.trim().length > 0 && selected.length > 0 && !creating;

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-white">
        <View className="px-4 pt-2 pb-3 flex-row items-center gap-3 border-b border-gray-100">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            className="p-1"
          >
            <ChevronLeft size={22} color="#374151" />
          </Pressable>
          <Text className="flex-1 text-gray-900 text-[17px] font-semibold">Новая группа</Text>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            className={`px-4 py-1.5 rounded-full ${canCreate ? "bg-brand-600" : "bg-gray-200"}`}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className={`text-sm font-semibold ${canCreate ? "text-white" : "text-gray-400"}`}>
                Создать
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Group name input */}
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-brand-100 rounded-full items-center justify-center">
              <Users size={18} color="#6366f1" />
            </View>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Название группы"
              placeholderTextColor="#9ca3af"
              className="flex-1 text-gray-900 text-[16px]"
              style={{ paddingVertical: 4 }}
              maxLength={100}
              returnKeyType="done"
            />
            {groupName.length > 0 && (
              <Pressable onPress={() => setGroupName("")} hitSlop={8}>
                <X size={16} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Selected members chips */}
        {selected.length > 0 && (
          <View className="bg-white border-b border-gray-100 px-3 py-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {selected.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => toggle(s)}
                    className="flex-row items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5"
                  >
                    <Text className="text-brand-700 text-[13px] font-medium" numberOfLines={1}>
                      {s.name.split(" ")[0]}
                    </Text>
                    <X size={12} color="#6366f1" />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Search input */}
        <View className="bg-white px-4 py-2 border-b border-gray-100">
          <View className="bg-gray-100 rounded-full flex-row items-center px-3 h-9">
            <Search size={15} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Добавить участников..."
              placeholderTextColor="#9ca3af"
              className="flex-1 ml-2 text-gray-900"
              style={{ fontSize: 14, paddingVertical: 0 }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Results */}
        {search.trim().length >= 2 ? (
          searching ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#6366f1" />
            </View>
          ) : results.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400 text-[14px]">Никого не найдено</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(r) => `${r.member_type}:${r.id}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const sel = isSelected(item);
                const color = pickColor(item.id);
                return (
                  <Pressable
                    onPress={() => toggle(item)}
                    android_ripple={{ color: "rgba(0,0,0,0.04)" }}
                    className="flex-row items-center px-4 py-3 bg-white border-b border-gray-50 active:bg-gray-50"
                  >
                    <View
                      className="w-11 h-11 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: color }}
                    >
                      <Text className="text-white text-[16px] font-semibold">{initials(item.name)}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-gray-900 text-[15px] font-medium" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-gray-400 text-[12px] mt-0.5">
                        {typeLabel(item.member_type)}
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center ${
                        sel ? "bg-brand-600" : "border-2 border-gray-300"
                      }`}
                    >
                      {sel && <Check size={13} color="#fff" />}
                    </View>
                  </Pressable>
                );
              }}
            />
          )
        ) : (
          /* Empty state when no search */
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 bg-brand-50 rounded-full items-center justify-center mb-4">
              <Users size={28} color="#6366f1" />
            </View>
            <Text className="text-gray-700 text-[16px] font-semibold text-center mb-1">
              Добавьте участников
            </Text>
            <Text className="text-gray-400 text-[14px] text-center">
              Введите имя в строку поиска, чтобы найти учеников и сотрудников
            </Text>
            {selected.length > 0 && (
              <Text className="text-brand-600 text-[13px] font-medium mt-3">
                Выбрано: {selected.length}
              </Text>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
