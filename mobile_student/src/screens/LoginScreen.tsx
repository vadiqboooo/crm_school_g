import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { User, Lock, Eye, EyeOff, Mail } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import { initCryptoKeys } from "../lib/crypto";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation<Nav>();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!login || !password || loading) return;
    setError("");
    setLoading(true);
    try {
      await signIn(login.trim(), password);
      // Derive e2e crypto keys from password + userId
      const raw = await storage.getItem("s_student");
      const stored = raw ? JSON.parse(raw) : null;
      const cryptoId = stored?.id;
      if (cryptoId) {
        const kp = await initCryptoKeys(password, cryptoId);
        await storage.setItem("s_chat_priv", kp.privateKey);
        await storage.setItem("s_chat_pub", kp.publicKey);
        api.updatePublicKey(kp.publicKey).catch(() => {});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !login || !password;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-6 justify-between">
          <View />

          <View className="w-full items-center gap-4">
            <View className="w-20 h-20 rounded-full bg-brand-700 items-center justify-center shadow-md">
              <Text className="text-3xl font-bold text-amber-400">Г</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900">Школа Гарри</Text>
              <Text className="text-gray-500 text-sm mt-1">Войдите в свой аккаунт</Text>
            </View>

            <View className="w-full mt-4 gap-3">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Логин</Text>
                <View className="relative">
                  <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                    <User size={16} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={login}
                    onChangeText={setLogin}
                    placeholder="Введите логин"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm text-gray-900"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Пароль</Text>
                <View className="relative">
                  <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                    <Lock size={16} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Введите пароль"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="w-full pl-10 pr-10 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm text-gray-900"
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                    hitSlop={10}
                  >
                    {showPassword ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                  </Pressable>
                </View>
              </View>

              <View className="items-end">
                <Pressable>
                  <Text className="text-sm text-brand-700 font-medium">Забыли пароль?</Text>
                </Pressable>
              </View>

              {error ? (
                <View className="bg-red-50 rounded-xl py-2 px-4">
                  <Text className="text-red-600 text-sm text-center">{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={disabled}
                className={`w-full py-4 rounded-2xl items-center mt-2 ${disabled ? "bg-brand-700/60" : "bg-brand-700"}`}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Войти</Text>
                )}
              </Pressable>
            </View>

            <View className="flex-row items-center gap-3 w-full my-1">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-xs text-gray-400">или</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            <Pressable
              onPress={() => navigation.navigate("RegisterEmail")}
              className="w-full py-3.5 border border-gray-200 bg-white rounded-2xl flex-row items-center justify-center gap-2"
            >
              <Mail size={16} color="#374151" />
              <Text className="text-sm font-medium text-gray-700">Войти / зарегистрироваться по email</Text>
            </Pressable>
          </View>

          <Text className="text-xs text-gray-400 text-center">© 2026 Школа Гарри</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
