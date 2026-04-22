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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Mail, ChevronLeft } from "lucide-react-native";
import { api } from "../lib/api";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "RegisterEmail">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterEmailScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = EMAIL_RE.test(email.trim());

  const handleSend = async () => {
    if (!isValid || loading) return;
    setError("");
    setLoading(true);
    try {
      await api.sendEmailCode(email.trim().toLowerCase());
      navigation.navigate("VerifyCode", { email: email.trim().toLowerCase() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
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
        <View className="flex-1 px-6 py-4">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center -ml-2"
            hitSlop={10}
          >
            <ChevronLeft size={24} color="#374151" />
          </Pressable>

          <View className="mt-6">
            <Text className="text-2xl font-bold text-gray-900">Вход по email</Text>
            <Text className="text-gray-500 text-sm mt-2">
              Мы отправим 6-значный код на вашу почту
            </Text>
          </View>

          <View className="mt-8">
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <View className="relative">
              <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                <Mail size={16} color="#9ca3af" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm text-gray-900"
              />
            </View>
          </View>

          {error ? (
            <View className="bg-red-50 rounded-xl py-2 px-4 mt-4">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSend}
            disabled={!isValid || loading}
            className={`w-full py-4 rounded-2xl items-center mt-6 ${
              !isValid || loading ? "bg-brand-700/60" : "bg-brand-700"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Получить код</Text>
            )}
          </Pressable>

          <Text className="text-xs text-gray-400 text-center mt-4">
            Если аккаунт уже есть — вы войдёте. Если нет — продолжим регистрацию.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
