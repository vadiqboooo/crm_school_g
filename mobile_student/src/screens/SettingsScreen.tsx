import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Camera, User, Lock, Save, Eye, EyeOff } from "lucide-react-native";
import { api, StudentProfile } from "../lib/api";

export function SettingsScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [login, setLogin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Avatar
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Saving states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api.getMe();
      setProfile(p);
      setDisplayName(p.chat_display_name ?? `${p.first_name} ${p.last_name}`.trim());
      setLogin(p.portal_login ?? "");
      setPhone(p.phone ?? "");
      setEmail(p.email ?? "");
      setAvatarUri(p.avatar_url ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Доступ запрещён", "Разрешите доступ к галерее в настройках телефона");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const mimeType = asset.mimeType ?? `image/${ext}`;
      const { avatar_url } = await api.uploadAvatar({
        uri: asset.uri,
        name: `avatar.${ext}`,
        type: mimeType,
      });
      setAvatarUri(avatar_url);
      Alert.alert("Готово", "Фото профиля обновлено");
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.updateSettings({
        chat_display_name: displayName.trim() || undefined,
        portal_login: login.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      Alert.alert("Сохранено", "Данные профиля обновлены");
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!oldPassword) {
      Alert.alert("Ошибка", "Введите текущий пароль");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Ошибка", "Новый пароль должен быть не менее 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Ошибка", "Пароли не совпадают");
      return;
    }
    setSavingPassword(true);
    try {
      await api.updateSettings({ old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Готово", "Пароль изменён");
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось изменить пароль");
    } finally {
      setSavingPassword(false);
    }
  };

  const displayNameLabel =
    profile
      ? (profile.chat_display_name ?? `${profile.first_name} ${profile.last_name}`.trim())
      : "Ученик";

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <SafeAreaView edges={["top"]} className="bg-brand-700">
        <View className="px-4 pt-2 pb-4 bg-brand-700 flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
          >
            <ChevronLeft size={18} color="#fff" />
          </Pressable>
          <Text className="text-white text-lg font-bold flex-1">Настройки профиля</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar section */}
            <View className="items-center pt-6 pb-4">
              <Pressable onPress={pickAvatar} disabled={avatarUploading} className="relative">
                <View className="w-24 h-24 rounded-full bg-indigo-100 items-center justify-center overflow-hidden shadow-md">
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} className="w-24 h-24" resizeMode="cover" />
                  ) : (
                    <User size={40} color="#6366f1" />
                  )}
                </View>
                <View className="absolute bottom-0 right-0 w-8 h-8 bg-brand-700 rounded-full items-center justify-center shadow-sm">
                  {avatarUploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Camera size={14} color="#fff" />
                  )}
                </View>
              </Pressable>
              <Text className="text-gray-500 text-xs mt-2">Нажмите чтобы изменить фото</Text>
              <Text className="text-gray-800 text-base font-semibold mt-1">{displayNameLabel}</Text>
            </View>

            {/* Personal info section */}
            <View className="px-4 mb-5">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-6 h-6 bg-indigo-100 rounded-lg items-center justify-center">
                  <User size={13} color="#6366f1" />
                </View>
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                  Личные данные
                </Text>
              </View>

              <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <FieldRow
                  label="Отображаемое имя"
                  placeholder="Иван Иванов"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
                <FieldRow
                  label="Логин"
                  placeholder="ivan.ivanov"
                  value={login}
                  onChangeText={setLogin}
                  autoCapitalize="none"
                />
                <FieldRow
                  label="Телефон"
                  placeholder="+7 900 000 00 00"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <FieldRow
                  label="Email"
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  isLast
                />
              </View>

              <Pressable
                onPress={saveProfile}
                disabled={savingProfile}
                className="mt-3 bg-brand-700 rounded-xl py-3.5 flex-row items-center justify-center gap-2"
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" />
                    <Text className="text-white text-sm font-semibold">Сохранить данные</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Change password section */}
            <View className="px-4">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-6 h-6 bg-orange-100 rounded-lg items-center justify-center">
                  <Lock size={13} color="#f97316" />
                </View>
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                  Изменить пароль
                </Text>
              </View>

              <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <PasswordRow
                  label="Текущий пароль"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  show={showOld}
                  onToggle={() => setShowOld((v) => !v)}
                />
                <PasswordRow
                  label="Новый пароль"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                />
                <PasswordRow
                  label="Повторите пароль"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  isLast
                />
              </View>

              <Pressable
                onPress={savePassword}
                disabled={savingPassword}
                className="mt-3 bg-orange-500 rounded-xl py-3.5 flex-row items-center justify-center gap-2"
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Lock size={16} color="#fff" />
                    <Text className="text-white text-sm font-semibold">Изменить пароль</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  isLast?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "phone-pad" | "email-address";
}

function FieldRow({
  label,
  placeholder,
  value,
  onChangeText,
  isLast,
  autoCapitalize = "sentences",
  keyboardType = "default",
}: FieldRowProps) {
  return (
    <View className={`px-4 py-3 ${!isLast ? "border-b border-gray-50" : ""}`}>
      <Text className="text-gray-400 text-[11px] mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#d1d5db"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        className="text-gray-800 text-sm"
        style={{ padding: 0 }}
      />
    </View>
  );
}

interface PasswordRowProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  isLast?: boolean;
}

function PasswordRow({ label, value, onChangeText, show, onToggle, isLast }: PasswordRowProps) {
  return (
    <View className={`px-4 py-3 flex-row items-center ${!isLast ? "border-b border-gray-50" : ""}`}>
      <View className="flex-1">
        <Text className="text-gray-400 text-[11px] mb-1">{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          placeholder="••••••"
          placeholderTextColor="#d1d5db"
          className="text-gray-800 text-sm"
          style={{ padding: 0 }}
        />
      </View>
      <Pressable onPress={onToggle} className="pl-3">
        {show ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
      </Pressable>
    </View>
  );
}
