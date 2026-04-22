import { useEffect, useRef, useState } from "react";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft } from "lucide-react-native";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "VerifyCode">;
type Rt = RouteProp<AuthStackParamList, "VerifyCode">;

const LEN = 6;
const RESEND_SECONDS = 60;

export function VerifyCodeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { email } = route.params;
  const { signInFromStorage } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const setDigit = (idx: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < LEN - 1) inputs.current[idx + 1]?.focus();
    if (next.every((d) => d.length === 1)) {
      handleSubmit(next.join(""));
    }
  };

  const handleBackspace = (idx: number) => {
    if (digits[idx]) {
      const next = [...digits];
      next[idx] = "";
      setDigits(next);
    } else if (idx > 0) {
      inputs.current[idx - 1]?.focus();
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
    }
  };

  const handleSubmit = async (code: string) => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.verifyEmailCode(email, code);
      if (res.status === "authenticated") {
        await signInFromStorage();
      } else {
        navigation.replace("CompleteProfile", {
          registration_token: res.registration_token,
          email,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка проверки");
      setDigits(Array(LEN).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await api.sendEmailCode(email);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код");
    } finally {
      setResending(false);
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
            <Text className="text-2xl font-bold text-gray-900">Введите код</Text>
            <Text className="text-gray-500 text-sm mt-2">
              Мы отправили 6-значный код на {email}
            </Text>
          </View>

          <View className="flex-row justify-between mt-8 gap-2">
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputs.current[i] = r;
                }}
                value={d}
                onChangeText={(v) => setDigit(i, v)}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === "Backspace") handleBackspace(i);
                }}
                keyboardType="number-pad"
                maxLength={1}
                editable={!loading}
                className="flex-1 aspect-square text-center text-2xl font-bold bg-white rounded-xl border border-gray-200 text-gray-900"
              />
            ))}
          </View>

          {loading ? (
            <View className="mt-6 items-center">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : null}

          {error ? (
            <View className="bg-red-50 rounded-xl py-2 px-4 mt-4">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </View>
          ) : null}

          <View className="mt-8 items-center">
            {cooldown > 0 ? (
              <Text className="text-sm text-gray-500">
                Отправить ещё раз через {cooldown} сек
              </Text>
            ) : (
              <Pressable onPress={handleResend} disabled={resending}>
                <Text className="text-sm text-brand-700 font-medium">
                  {resending ? "Отправляем..." : "Отправить код ещё раз"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
