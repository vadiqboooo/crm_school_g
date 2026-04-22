import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ImageBackground,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, Flame, FileText, X, Bell } from "lucide-react-native";
import {
  api,
  StudentProfile,
  MyRegistration,
  ExamSession,
  HomeBanner,
  HomeInfoCard,
  SubscriptionPlanItem,
} from "../lib/api";
import type { HomeStackParamList } from "../navigation/types";

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

type Nav = NativeStackNavigationProp<HomeStackParamList, "Home">;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [availableSessions, setAvailableSessions] = useState<ExamSession[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signupBanner, setSignupBanner] = useState<HomeBanner | null>(null);
  const [signupValues, setSignupValues] = useState<Record<string, string>>({});
  const [submittingSignup, setSubmittingSignup] = useState(false);
  const [infoCard, setInfoCard] = useState<HomeInfoCard | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [tariffsOpen, setTariffsOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialForm, setTrialForm] = useState({ student_name: "", phone: "", parent_name: "", class_number: "" });
  const [submittingTrial, setSubmittingTrial] = useState(false);

  const loadAll = useCallback(async () => {
    await Promise.all([
      api.getMe().then(setProfile).catch(() => {}),
      api
        .getMyRegistrations()
        .then((regs) => {
          const upcoming = regs.filter((r) => r.days_until >= 0).sort((a, b) => a.days_until - b.days_until);
          setRegistrations(upcoming);
        })
        .catch(() => {}),
      api.getExamSessions().then(setAvailableSessions).catch(() => {}),
      api.getHomeBanners().then(setBanners).catch(() => {}),
      api.getNotificationsUnreadCount().then((r) => setUnreadNotifs(r.count)).catch(() => {}),
      api.getHomeInfoCard().then(setInfoCard).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      api.getHomeBanners().then(setBanners).catch(() => {});
      api.getNotificationsUnreadCount().then((r) => setUnreadNotifs(r.count)).catch(() => {});
      api.getHomeInfoCard().then(setInfoCard).catch(() => {});
    }, []),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const handleOpenTariffs = async () => {
    setTariffsOpen(true);
    try {
      const list = await api.getSubscriptionPlans();
      setPlans(list);
    } catch {}
  };

  const handleOpenTrial = () => {
    setTrialForm({
      student_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "",
      phone: profile?.phone ?? "",
      parent_name: "",
      class_number: "",
    });
    setTrialOpen(true);
  };

  const handleSubmitTrial = async () => {
    if (!trialForm.student_name.trim()) {
      Alert.alert("Заполните поля", "Укажите имя ученика");
      return;
    }
    if (!trialForm.phone.trim()) {
      Alert.alert("Заполните поля", "Укажите телефон");
      return;
    }
    try {
      setSubmittingTrial(true);
      await api.submitTrialSignup({
        student_name: trialForm.student_name.trim(),
        phone: trialForm.phone.trim(),
        parent_name: trialForm.parent_name.trim() || null,
        class_number: trialForm.class_number ? parseInt(trialForm.class_number, 10) : null,
      });
      setTrialOpen(false);
      Alert.alert("Спасибо!", "Заявка отправлена, мы свяжемся с вами");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось отправить заявку");
    } finally {
      setSubmittingTrial(false);
    }
  };

  const handleBannerPress = (banner: HomeBanner) => {
    if (banner.signup_enabled) {
      const initial: Record<string, string> = {};
      (banner.form_fields ?? []).forEach((f) => {
        initial[f.key] = "";
      });
      setSignupValues(initial);
      setSignupBanner(banner);
      return;
    }
    if (!banner.action_url) return;
    Linking.openURL(banner.action_url).catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть ссылку");
    });
  };

  const handleSubmitSignup = async () => {
    if (!signupBanner) return;
    const fields = signupBanner.form_fields ?? [];
    for (const f of fields) {
      if (f.required && !(signupValues[f.key] ?? "").trim()) {
        Alert.alert("Заполните поля", `Поле «${f.label}» обязательно`);
        return;
      }
    }
    try {
      setSubmittingSignup(true);
      await api.submitBannerSignup(signupBanner.id, signupValues);
      setSignupBanner(null);
      Alert.alert("Спасибо!", "Заявка отправлена, мы свяжемся с вами");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось отправить заявку");
    } finally {
      setSubmittingSignup(false);
    }
  };

  const showBanners = banners.length > 0;
  const screenWidth = Dimensions.get("window").width;
  const bannerWidth = screenWidth - 40; // ScrollView horizontal padding 20 each side
  const handleBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
    if (idx !== bannerIndex) setBannerIndex(idx);
  };

  const nearest = registrations[0] ?? null;

  return (
    <View className="flex-1 bg-[#f5f5fa]">
      <SafeAreaView edges={["top"]} className="bg-[#f5f5fa]">
        <View className="px-5 pt-3 pb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Школа Гарри 🧙</Text>
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
      >
        {loading && (
          <View className="py-8 items-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        )}

        {nearest ? (
          <Pressable
            onPress={() => navigation.navigate("Exams")}
            className="rounded-2xl p-5 bg-brand-700"
          >
            <View className="flex-row items-center gap-1.5 mb-3">
              <Flame size={14} color="#fdba74" />
              <Text className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Ближайший экзамен
              </Text>
            </View>
            <Text className="text-xl font-bold text-white mb-1">{nearest.exam_title}</Text>
            <Text className="text-sm text-white/80 mb-4">
              {fmtDate(nearest.date)} · через {nearest.days_until}{" "}
              {nearest.days_until === 1 ? "день" : nearest.days_until < 5 ? "дня" : "дней"}
            </Text>
            <View className="self-start bg-white/20 rounded-xl px-4 py-2">
              <Text className="text-white text-sm font-semibold">Подробнее →</Text>
            </View>
          </Pressable>
        ) : availableSessions.length > 0 ? (
          <Pressable
            onPress={() => navigation.navigate("ExamRegister")}
            className="rounded-2xl p-5 bg-brand-700"
          >
            <View className="flex-row items-center gap-1.5 mb-3">
              <FileText size={14} color="#fdba74" />
              <Text className="text-xs font-semibold text-white/80 uppercase tracking-wider">Запись открыта</Text>
            </View>
            <Text className="text-xl font-bold text-white mb-1">{availableSessions[0].exam_title}</Text>
            <Text className="text-sm text-white/80 mb-4">
              Доступно {availableSessions[0].time_slots.reduce((s, sl) => s + sl.available_seats, 0)} мест
            </Text>
            <View className="self-start bg-white/20 rounded-xl px-4 py-2">
              <Text className="text-white text-sm font-semibold">Записаться →</Text>
            </View>
          </Pressable>
        ) : null}

        {registrations.length > 0 && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-bold text-gray-900 text-base">Мои экзамены</Text>
              <Pressable onPress={() => navigation.navigate("Exams")}>
                <Text className="text-sm text-brand-700 font-medium">Все →</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {registrations.slice(0, 4).map((reg) => (
                  <View key={reg.id} className="bg-violet-100 rounded-2xl p-4" style={{ minWidth: 140 }}>
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="w-9 h-9 rounded-xl bg-violet-500 items-center justify-center">
                        <FileText size={16} color="#fff" />
                      </View>
                      <View className="bg-violet-200 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-violet-800">{reg.days_until} дн</Text>
                      </View>
                    </View>
                    <Text className="text-xs font-semibold text-violet-700 mb-0.5">
                      {reg.exam_type ?? "Экзамен"}
                    </Text>
                    <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
                      {reg.subject_name ?? reg.exam_title}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">{fmtDate(reg.date)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {showBanners && (
          <View style={{ marginHorizontal: -20 }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={bannerWidth}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20 }}
              onMomentumScrollEnd={handleBannerScroll}
            >
              {banners.map((b) => {
              const hasImage = !!b.background_image_url;
              const content = (
                <>
                  {!hasImage && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        right: -40,
                        top: -40,
                        width: 220,
                        height: 220,
                        borderRadius: 110,
                        backgroundColor: b.gradient_to,
                        opacity: 0.55,
                      }}
                    />
                  )}
                  {hasImage && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.4)",
                      }}
                    />
                  )}
                  <View className="flex-row items-center gap-2 mb-3 flex-wrap">
                    {b.badge_text && (
                      <View
                        className="px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: b.badge_color ?? "#f59e0b" }}
                      >
                        <Text className="text-[11px] font-bold text-white">{b.badge_text}</Text>
                      </View>
                    )}
                    {b.price_text && (
                      <View className="px-2.5 py-1 rounded-full bg-white/25">
                        <Text className="text-[11px] font-bold text-white">{b.price_text}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xl font-bold text-white mb-1">
                    {b.icon ? `${b.icon} ` : ""}{b.title}
                  </Text>
                  {b.subtitle && (
                    <Text className="text-sm text-white/90 mb-3">{b.subtitle}</Text>
                  )}
                  {b.footer_tags && (
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-white/80">{b.footer_tags}</Text>
                      {!b.signup_enabled && b.action_url ? <ChevronRight size={16} color="#fff" /> : null}
                    </View>
                  )}
                  {b.signup_enabled && (
                    <View className="mt-3 bg-white/95 rounded-xl py-2.5 items-center">
                      <Text className="text-sm font-bold" style={{ color: hasImage ? "#1f2937" : b.gradient_from }}>
                        {b.signup_button_text || "Записаться"}
                      </Text>
                    </View>
                  )}
                </>
              );

              return (
                <Pressable
                  key={b.id}
                  onPress={() => handleBannerPress(b)}
                  disabled={!b.action_url && !b.signup_enabled}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: b.gradient_from,
                    width: bannerWidth,
                  }}
                >
                  {hasImage ? (
                    <ImageBackground
                      source={{ uri: b.background_image_url as string }}
                      resizeMode="cover"
                      style={{ padding: 20, minHeight: 180 }}
                    >
                      {content}
                    </ImageBackground>
                  ) : (
                    <View style={{ padding: 20, minHeight: 180 }}>{content}</View>
                  )}
                </Pressable>
              );
            })}
            </ScrollView>
            {banners.length > 1 && (
              <View className="flex-row items-center justify-center gap-1.5 mt-3">
                {banners.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === bannerIndex ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === bannerIndex ? "#4f46e5" : "#d1d5db",
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {infoCard && infoCard.is_visible && (
          <View
            className="rounded-3xl p-5 overflow-hidden"
            style={{ backgroundColor: infoCard.gradient_from }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: -60,
                top: -60,
                width: 260,
                height: 260,
                borderRadius: 130,
                backgroundColor: infoCard.gradient_to,
                opacity: 0.55,
              }}
            />
            <View className="flex-row items-center gap-3 mb-4">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: infoCard.logo_bg_color }}
              >
                <Text style={{ fontSize: 22 }}>{infoCard.logo_emoji}</Text>
              </View>
              <View>
                <Text className="text-white font-bold text-base">{infoCard.center_name}</Text>
                <Text className="text-white/80 text-xs">{infoCard.center_subtitle}</Text>
              </View>
            </View>

            <Text className="text-white text-xl font-bold mb-1">
              {infoCard.heading_line1}
              {infoCard.heading_line2 ? (
                <>
                  {"\n"}
                  <Text style={{ color: infoCard.heading_accent_color }}>{infoCard.heading_line2}</Text>
                </>
              ) : null}
            </Text>
            {infoCard.subheading && (
              <Text className="text-white/90 text-sm mb-4">{infoCard.subheading}</Text>
            )}

            {infoCard.stats.length > 0 && (
              <View className="flex-row gap-2 mb-3">
                {infoCard.stats.map((s, i) => (
                  <View key={i} className="flex-1 bg-white/10 rounded-2xl py-3 px-2 items-center">
                    <Text className="text-white font-bold text-base">{s.value}</Text>
                    <Text className="text-white/70 text-[10px] text-center mt-1" numberOfLines={2}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {infoCard.tags.length > 0 && (
              <View className="gap-2 mb-3">
                {infoCard.tags.map((t, i) => (
                  <View key={i} className="flex-row items-center bg-white/15 rounded-full px-3 py-2">
                    {t.icon ? <Text style={{ marginRight: 8 }}>{t.icon}</Text> : null}
                    <Text className="text-white text-xs font-medium flex-1">{t.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {infoCard.formats.length > 0 && (
              <View className="flex-row gap-2 mb-4">
                {infoCard.formats.map((f, i) => (
                  <View
                    key={i}
                    className="flex-1 rounded-2xl p-3"
                    style={{ backgroundColor: f.bg_color ?? "rgba(255,255,255,0.15)" }}
                  >
                    <Text className="text-white font-bold text-sm">
                      {f.icon ? `${f.icon} ` : ""}{f.title}
                    </Text>
                    {f.subtitle && (
                      <Text className="text-white/90 text-xs mt-0.5">{f.subtitle}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View className="gap-2">
              {infoCard.trial_button_enabled && (
                <Pressable
                  onPress={handleOpenTrial}
                  className="bg-white rounded-xl py-3 items-center"
                >
                  <Text className="font-bold text-sm" style={{ color: infoCard.gradient_from }}>
                    {infoCard.trial_button_text}
                  </Text>
                </Pressable>
              )}
              {infoCard.tariffs_button_enabled && (
                <Pressable
                  onPress={handleOpenTariffs}
                  className="bg-white/20 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-bold text-sm">{infoCard.tariffs_button_text}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

      </ScrollView>

      <Modal
        visible={!!signupBanner}
        animationType="slide"
        transparent
        onRequestClose={() => setSignupBanner(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
              <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={2}>
                {signupBanner?.title}
              </Text>
              <Pressable onPress={() => setSignupBanner(null)} hitSlop={12}>
                <X size={22} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
              {signupBanner?.subtitle && (
                <Text className="text-sm text-gray-500 mb-4">{signupBanner.subtitle}</Text>
              )}

              <View className="bg-blue-50 rounded-xl p-3 mb-4">
                <Text className="text-xs text-blue-900">
                  Ваши данные ({profile?.first_name} {profile?.last_name}
                  {profile?.phone ? ` · ${profile.phone}` : ""}) будут отправлены автоматически
                </Text>
              </View>

              {(signupBanner?.form_fields ?? []).map((f) => (
                <View key={f.id} className="mb-4">
                  <Text className="text-sm font-medium text-gray-900 mb-1.5">
                    {f.label}
                    {f.required ? <Text className="text-red-500"> *</Text> : null}
                  </Text>
                  {f.field_type === "select" ? (
                    <View className="flex-row flex-wrap gap-2">
                      {(f.options ?? []).map((opt) => {
                        const selected = signupValues[f.key] === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => setSignupValues((prev) => ({ ...prev, [f.key]: opt }))}
                            className={`px-3 py-2 rounded-full border ${
                              selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                            }`}
                          >
                            <Text className={`text-sm ${selected ? "text-white font-semibold" : "text-gray-700"}`}>
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      value={signupValues[f.key] ?? ""}
                      onChangeText={(v) => setSignupValues((prev) => ({ ...prev, [f.key]: v }))}
                      placeholder={f.placeholder ?? ""}
                      placeholderTextColor="#9ca3af"
                      multiline={f.field_type === "textarea"}
                      keyboardType={
                        f.field_type === "phone"
                          ? "phone-pad"
                          : f.field_type === "email"
                          ? "email-address"
                          : f.field_type === "number"
                          ? "numeric"
                          : "default"
                      }
                      autoCapitalize={f.field_type === "email" ? "none" : "sentences"}
                      className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                      style={f.field_type === "textarea" ? { minHeight: 80, textAlignVertical: "top" } : undefined}
                    />
                  )}
                </View>
              ))}
            </ScrollView>

            <View className="px-5 pt-2 pb-6">
              <Pressable
                onPress={handleSubmitSignup}
                disabled={submittingSignup}
                className="rounded-xl py-3.5 items-center"
                style={{ backgroundColor: signupBanner?.gradient_from ?? "#2563eb", opacity: submittingSignup ? 0.6 : 1 }}
              >
                {submittingSignup ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-[16px]">
                    {signupBanner?.signup_button_text || "Отправить заявку"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tariffs modal */}
      <Modal
        visible={tariffsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTariffsOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text className="text-lg font-bold text-gray-900">Тарифы</Text>
              <Pressable onPress={() => setTariffsOpen(false)} hitSlop={12}>
                <X size={22} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView className="px-5 pb-6">
              {plans.length === 0 ? (
                <Text className="text-sm text-gray-500 text-center py-10">Пока нет тарифов</Text>
              ) : (
                <View className="gap-3">
                  {plans.map((p) => (
                    <View key={p.id} className="bg-gray-50 rounded-2xl p-4">
                      <Text className="text-gray-900 font-bold text-base mb-1">{p.name}</Text>
                      <Text className="text-gray-500 text-sm mb-2">{p.lessons_count} уроков</Text>
                      <View className="flex-row items-baseline gap-2">
                        <Text className="text-gray-900 font-bold text-xl">{p.price.toLocaleString("ru-RU")} ₽</Text>
                        <Text className="text-gray-400 text-xs">
                          {Math.round(p.price / p.lessons_count).toLocaleString("ru-RU")} ₽/урок
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Trial signup modal */}
      <Modal
        visible={trialOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTrialOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
              <Text className="text-lg font-bold text-gray-900">Записаться на пробный</Text>
              <Pressable onPress={() => setTrialOpen(false)} hitSlop={12}>
                <X size={22} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
              <Text className="text-sm text-gray-500 mb-4">
                Мы свяжемся с вами, чтобы подобрать группу и время
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">
                  Имя ученика <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={trialForm.student_name}
                  onChangeText={(v) => setTrialForm((p) => ({ ...p, student_name: v }))}
                  placeholder="Иван Иванов"
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">
                  Телефон <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={trialForm.phone}
                  onChangeText={(v) => setTrialForm((p) => ({ ...p, phone: v }))}
                  placeholder="+7 ___ ___ __ __"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">Имя родителя</Text>
                <TextInput
                  value={trialForm.parent_name}
                  onChangeText={(v) => setTrialForm((p) => ({ ...p, parent_name: v }))}
                  placeholder="Необязательно"
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-1.5">Класс</Text>
                <TextInput
                  value={trialForm.class_number}
                  onChangeText={(v) => setTrialForm((p) => ({ ...p, class_number: v.replace(/[^0-9]/g, "") }))}
                  placeholder="9"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  className="border border-gray-200 rounded-xl px-3 py-3 text-[16px] text-gray-900 bg-white"
                />
              </View>
            </ScrollView>

            <View className="px-5 pt-2 pb-6">
              <Pressable
                onPress={handleSubmitTrial}
                disabled={submittingTrial}
                className="rounded-xl py-3.5 items-center bg-brand-700"
                style={{ opacity: submittingTrial ? 0.6 : 1 }}
              >
                {submittingTrial ? (
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
