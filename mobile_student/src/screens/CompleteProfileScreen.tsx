import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { User } from "lucide-react-native";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { AuthStackParamList } from "../navigation/types";

type Rt = RouteProp<AuthStackParamList, "CompleteProfile">;

export function CompleteProfileScreen() {
  const route = useRoute<Rt>();
  const { registration_token } = route.params;
  const { signInFromStorage } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await api.completeEmailRegistration(
        registration_token,
        firstName.trim(),
        lastName.trim(),
      );
      await signInFromStorage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось завершить");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-4 justify-between">
          <View>
            <View className="mt-10 items-center">
              <View className="w-16 h-16 rounded-full bg-brand-700/10 items-center justify-center mb-4">
                <User size={28} color="#4f46e5" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">Давайте познакомимся</Text>
              <Text className="text-gray-500 text-sm mt-2 text-center">
                Укажите имя и фамилию, чтобы начать
              </Text>
            </View>

            <View className="mt-8 gap-3">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Имя</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Иван"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  className="w-full px-4 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Фамилия</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Иванов"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  className="w-full px-4 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm text-gray-900"
                />
              </View>

              {error ? (
                <View className="bg-red-50 rounded-xl py-2 px-4">
                  <Text className="text-red-600 text-sm text-center">{error}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-2xl items-center mb-2 ${
              !canSubmit ? "bg-brand-700/60" : "bg-brand-700"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Начать пользоваться</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
