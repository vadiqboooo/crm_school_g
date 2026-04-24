import Constants from "expo-constants";
import { secureGet, secureSet, secureDelete, storage } from "./storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "http://localhost:8000";

const T_ACCESS = "s_access_token";
const T_REFRESH = "s_refresh_token";
const T_ROLE = "s_role";
const T_STUDENT = "s_student";

class StudentApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  /** Call once at app start before first request. */
  async load(): Promise<void> {
    if (this.loaded) return;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        this.accessToken = await secureGet(T_ACCESS);
        this.refreshToken = await secureGet(T_REFRESH);
        this.loaded = true;
      })();
    }
    await this.loadPromise;
  }

  private async setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    await secureSet(T_ACCESS, access);
    await secureSet(T_REFRESH, refresh);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await secureDelete(T_ACCESS);
    await secureDelete(T_REFRESH);
    await storage.removeItem(T_ROLE);
    await storage.removeItem(T_STUDENT);
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.loaded) await this.load();

    const doFetch = async (token: string | null) => {
      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    };

    let res = await doFetch(this.accessToken);

    if (res.status === 401 && this.refreshToken) {
      const role = (await storage.getItem(T_ROLE)) ?? "student";
      const refreshEndpoint = role === "app_user" ? "/app-auth/refresh" : "/student-auth/refresh";
      const refreshRes = await fetch(`${API_URL}${refreshEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        await this.setTokens(data.access_token, data.refresh_token);
        res = await doFetch(this.accessToken);
      } else {
        await this.clearTokens();
        throw new Error("Unauthorized");
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Ошибка сети" }));
      throw new Error(err.detail ?? "Ошибка");
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  async login(login: string, password: string): Promise<{
    access_token: string;
    refresh_token: string;
    student_id: string;
    first_name: string;
    last_name: string;
    role: "student" | "app_user";
    linked_student_id: string | null;
  }> {
    const studentRes = await fetch(`${API_URL}/student-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    if (studentRes.ok) {
      const data = await studentRes.json();
      await this.setTokens(data.access_token, data.refresh_token);
      await storage.setItem(T_ROLE, "student");
      await storage.setItem(
        T_STUDENT,
        JSON.stringify({
          id: data.student_id,
          first_name: data.first_name,
          last_name: data.last_name,
          role: "student",
        })
      );
      return { ...data, role: "student", linked_student_id: null };
    }

    const appRes = await fetch(`${API_URL}/app-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    if (appRes.ok) {
      const data = await appRes.json();
      await this.setTokens(data.access_token, data.refresh_token);
      await storage.setItem(T_ROLE, "app_user");
      await storage.setItem(
        T_STUDENT,
        JSON.stringify({
          id: data.user_id,
          first_name: data.display_name,
          last_name: "",
          role: "app_user",
          student_id: data.student_id ?? null,
        })
      );
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        student_id: data.student_id ?? data.user_id,
        first_name: data.display_name,
        last_name: "",
        role: "app_user",
        linked_student_id: data.student_id ?? null,
      };
    }

    const err = await studentRes.json().catch(() => ({ detail: "Неверный логин или пароль" }));
    throw new Error(err.detail ?? "Неверный логин или пароль");
  }

  // ── Email register/login (passwordless) ────────────────────────────────
  async sendEmailCode(email: string) {
    const res = await fetch(`${API_URL}/app-auth/email/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Не удалось отправить код" }));
      throw new Error(err.detail ?? "Не удалось отправить код");
    }
    return res.json() as Promise<{ message: string; expires_in: number }>;
  }

  async verifyEmailCode(email: string, code: string): Promise<EmailVerifyResult> {
    const res = await fetch(`${API_URL}/app-auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Неверный код" }));
      throw new Error(err.detail ?? "Неверный код");
    }
    const data = await res.json();
    if (data.status === "authenticated") {
      await this.setTokens(data.access_token, data.refresh_token);
      await storage.setItem(T_ROLE, "app_user");
      await storage.setItem(
        T_STUDENT,
        JSON.stringify({
          id: data.user_id,
          first_name: data.display_name,
          last_name: "",
          role: "app_user",
          student_id: data.student_id ?? null,
        })
      );
    }
    return data;
  }

  async completeEmailRegistration(registration_token: string, first_name: string, last_name: string) {
    const res = await fetch(`${API_URL}/app-auth/email/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_token, first_name, last_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Не удалось завершить регистрацию" }));
      throw new Error(err.detail ?? "Не удалось завершить регистрацию");
    }
    const data = await res.json();
    await this.setTokens(data.access_token, data.refresh_token);
    await storage.setItem(T_ROLE, "app_user");
    await storage.setItem(
      T_STUDENT,
      JSON.stringify({
        id: data.user_id,
        first_name: data.display_name,
        last_name: "",
        role: "app_user",
        student_id: data.student_id ?? null,
      })
    );
    return data as {
      access_token: string;
      refresh_token: string;
      user_id: string;
      display_name: string;
      student_id: string | null;
    };
  }

  // ── Profile ─────────────────────────────────────────────────────────────
  getMe() {
    return this.request<StudentProfile>("/student-portal/me");
  }

  // ── Home Banners ────────────────────────────────────────────────────────
  getHomeBanners() {
    return this.request<HomeBanner[]>("/student-portal/banners");
  }

  submitBannerSignup(bannerId: string, formData: Record<string, any>) {
    return this.request<{ message: string; signup_id: string }>(
      `/student-portal/banners/${bannerId}/signup`,
      {
        method: "POST",
        body: JSON.stringify({ form_data: formData }),
      },
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────
  getNotifications() {
    return this.request<NotificationItem[]>("/student-portal/notifications");
  }

  getNotificationsUnreadCount() {
    return this.request<{ count: number }>("/student-portal/notifications/unread-count");
  }

  markNotificationRead(id: string) {
    return this.request<void>(`/student-portal/notifications/${id}/read`, {
      method: "POST",
    });
  }

  markAllNotificationsRead() {
    return this.request<void>("/student-portal/notifications/read-all", {
      method: "POST",
    });
  }

  // ── Home info card ──────────────────────────────────────────────────────
  getHomeInfoCard() {
    return this.request<HomeInfoCard | null>("/student-portal/home-info");
  }

  getSubscriptionPlans() {
    return this.request<SubscriptionPlanItem[]>("/student-portal/subscription-plans");
  }

  submitTrialSignup(body: TrialSignupBody) {
    return this.request<TrialSignupResponse>("/student-portal/trial-signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ── Schedule ────────────────────────────────────────────────────────────
  getTodaySchedule() {
    return this.request<TodayLesson[]>("/student-portal/schedule/today");
  }

  // ── Performance ────────────────────────────────────────────────────────
  getPerformance() {
    return this.request<Performance>("/student-portal/performance");
  }

  // ── Exams ──────────────────────────────────────────────────────────────
  getExamSessions() {
    return this.request<ExamSession[]>("/student-portal/exam-sessions");
  }

  getSubjects() {
    return this.request<PortalSubject[]>("/student-portal/subjects");
  }

  registerForExam(slotId: string, subjectId?: string | null) {
    return this.request<{ message: string; registration_id: string }>(
      `/student-portal/exam-sessions/${slotId}/register`,
      { method: "POST", body: JSON.stringify({ subject_id: subjectId ?? null }) }
    );
  }

  cancelRegistration(regId: string) {
    return this.request<void>(`/student-portal/registrations/${regId}`, { method: "DELETE" });
  }

  getMyRegistrations() {
    return this.request<MyRegistration[]>("/student-portal/my-registrations");
  }

  getResults() {
    return this.request<ExamResult[]>("/student-portal/results");
  }

  verifyPassword(password: string) {
    return this.request<{ valid: boolean }>("/student-portal/verify-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  updateSettings(data: {
    portal_login?: string;
    old_password?: string;
    new_password?: string;
    phone?: string;
    email?: string;
    chat_display_name?: string;
  }) {
    return this.request<{ message: string }>("/student-portal/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: { uri: string; name: string; type: string }): Promise<{ avatar_url: string }> {
    if (!this.loaded) await this.load();
    const formData = new FormData();
    formData.append("file", file as unknown as Blob);
    const url = `${API_URL}/student-portal/upload-avatar`;

    const doUpload = async (token: string | null) =>
      fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

    let res = await doUpload(this.accessToken);

    if (res.status === 401 && this.refreshToken) {
      const role = (await storage.getItem(T_ROLE)) ?? "student";
      const refreshEndpoint = role === "app_user" ? "/app-auth/refresh" : "/student-auth/refresh";
      const refreshRes = await fetch(`${API_URL}${refreshEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        await this.setTokens(data.access_token, data.refresh_token);
        res = await doUpload(this.accessToken);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Ошибка загрузки" }));
      throw new Error(err.detail ?? "Ошибка загрузки");
    }
    return res.json();
  }

  // ── Chat ───────────────────────────────────────────────────────────────

  updatePublicKey(publicKey: string) {
    return this.request<{ ok: boolean }>("/chat/public-key", {
      method: "PATCH",
      body: JSON.stringify({ public_key: publicKey }),
    });
  }

  getChatRooms() {
    return this.request<ChatRoom[]>("/chat/rooms");
  }

  getChatMessages(roomId: string, before?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return this.request<ChatMessage[]>(`/chat/rooms/${roomId}/messages?${params}`);
  }

  markRoomRead(roomId: string) {
    return this.request<{ ok: boolean }>(`/chat/rooms/${roomId}/read`, { method: "POST" });
  }

  getMemberPublicKey(memberId: string, memberType = "student") {
    return this.request<{ public_key: string }>(
      `/chat/members/${memberId}/public-key?member_type=${memberType}`
    );
  }

  sendMessage(
    roomId: string,
    contentEncrypted: string,
    messageType = "text",
    replyToId?: string,
    fileOpts?: { file_url?: string; file_name?: string; file_size?: number }
  ) {
    return this.request<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content_encrypted: contentEncrypted,
        message_type: messageType,
        ...(replyToId ? { reply_to_id: replyToId } : {}),
        ...fileOpts,
      }),
    });
  }

  async uploadChatFile(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ChatFileUploadResult> {
    if (!this.loaded) await this.load();
    const formData = new FormData();
    // RN FormData accepts { uri, name, type }
    formData.append("file", file as unknown as Blob);
    const url = `${API_URL}/chat/upload`;

    const doUpload = async (token: string | null) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      try {
        return await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    };

    let res: Response;
    try {
      res = await doUpload(this.accessToken);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[uploadChatFile] fetch failed", msg, { url, file });
      throw new Error(
        msg.includes("abort")
          ? "Превышено время ожидания загрузки (60с)"
          : `Сеть недоступна: ${msg}`
      );
    }
    if (res.status === 401 && this.refreshToken) {
      const role = (await storage.getItem(T_ROLE)) ?? "student";
      const refreshEndpoint = role === "app_user" ? "/app-auth/refresh" : "/student-auth/refresh";
      const refreshRes = await fetch(`${API_URL}${refreshEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        await this.setTokens(data.access_token, data.refresh_token);
        res = await doUpload(this.accessToken);
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = err.detail || `Upload failed: ${res.status}`;
      console.warn("[uploadChatFile] server error", res.status, detail);
      throw new Error(detail);
    }
    return res.json();
  }

  searchUsers(query: string) {
    const params = new URLSearchParams({ q: query });
    return this.request<ChatSearchResult[]>(`/chat/search?${params}`);
  }

  getOrCreateDirectRoom(otherId: string, otherType = "student") {
    return this.request<ChatRoom>("/chat/rooms/direct", {
      method: "POST",
      body: JSON.stringify({ other_id: otherId, other_type: otherType }),
    });
  }

  updateRoomKey(roomId: string, memberId: string, memberType: string, roomKeyEncrypted: string) {
    return this.request<{ ok: boolean }>(`/chat/rooms/${roomId}/room-key`, {
      method: "PATCH",
      body: JSON.stringify({
        member_id: memberId,
        member_type: memberType,
        room_key_encrypted: roomKeyEncrypted,
      }),
    });
  }

  deleteMessage(messageId: string) {
    return this.request<{ ok: boolean }>(`/chat/messages/${messageId}`, { method: "DELETE" });
  }

  editMessage(messageId: string, contentEncrypted: string) {
    return this.request<ChatMessage>(`/chat/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content_encrypted: contentEncrypted }),
    });
  }

  forwardMessages(messageIds: string[], targetRoomId: string) {
    return this.request<ChatMessage[]>(`/chat/messages/forward`, {
      method: "POST",
      body: JSON.stringify({ message_ids: messageIds, target_room_id: targetRoomId }),
    });
  }

  leaveRoom(roomId: string) {
    return this.request<{ ok: boolean }>(`/chat/rooms/${roomId}`, { method: "DELETE" });
  }

  getRoom(roomId: string) {
    return this.request<ChatRoom>(`/chat/rooms/${roomId}`);
  }

  createCustomGroupRoom(name: string, members: Array<{ id: string; type: string }>) {
    return this.request<ChatRoom>("/chat/rooms/custom-group", {
      method: "POST",
      body: JSON.stringify({ name, members }),
    });
  }

  addMemberToRoom(roomId: string, memberId: string, memberType: string) {
    return this.request<{ added: boolean }>(`/chat/rooms/${roomId}/add-member`, {
      method: "POST",
      body: JSON.stringify({ member_id: memberId, member_type: memberType }),
    });
  }

  removeMemberFromRoom(roomId: string, memberId: string, memberType: string) {
    return this.request<{ removed: boolean }>(
      `/chat/rooms/${roomId}/members/${memberId}?member_type=${memberType}`,
      { method: "DELETE" }
    );
  }

  renameRoom(roomId: string, name: string) {
    return this.request<{ name: string }>(`/chat/rooms/${roomId}/name`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  getWsUrl(): string {
    const base = API_URL.replace(/^http/, "ws");
    return `${base}/chat/ws?token=${this.accessToken ?? ""}`;
  }

  getFileUrl(fileKey: string): string {
    if (fileKey.startsWith("http")) return fileKey;
    return `${API_URL}/chat/files/${fileKey}?token=${encodeURIComponent(this.accessToken ?? "")}`;
  }
}

export const api = new StudentApiClient();

// ── Types (mirrored from client_student) ────────────────────────────────────

export interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  portal_login: string | null;
  class_number: number | null;
  balance: number;
  phone: string | null;
  email: string | null;
  chat_display_name: string | null;
  avatar_url: string | null;
  groups: Array<{
    id: string;
    name: string;
    subject: string | null;
    exam_type: string | null;
    schedules: Array<{ day: string; start_time: string; duration: number }>;
  }>;
}

export type EmailVerifyResult =
  | {
      status: "authenticated";
      access_token: string;
      refresh_token: string;
      token_type: string;
      user_id: string;
      display_name: string;
      student_id: string | null;
    }
  | {
      status: "registration_required";
      registration_token: string;
    };

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  icon: string | null;
  color: string | null;
  action_url: string | null;
  created_at: string;
  is_read: boolean;
}

export interface HomeBannerFormField {
  id: string;
  field_type: "text" | "phone" | "email" | "textarea" | "select" | "number";
  key: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  sort_order: number;
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  badge_color: string | null;
  price_text: string | null;
  footer_tags: string | null;
  icon: string | null;
  gradient_from: string;
  gradient_to: string;
  background_image_url: string | null;
  action_url: string | null;
  signup_enabled: boolean;
  signup_button_text: string | null;
  form_fields: HomeBannerFormField[];
}

export interface HomeInfoStat {
  value: string;
  label: string;
}

export interface HomeInfoTag {
  icon: string | null;
  text: string;
}

export interface HomeInfoFormat {
  icon: string | null;
  title: string;
  subtitle: string | null;
  bg_color: string | null;
}

export interface HomeInfoCard {
  center_name: string;
  center_subtitle: string;
  logo_emoji: string;
  logo_bg_color: string;
  heading_line1: string;
  heading_line2: string | null;
  heading_accent_color: string;
  subheading: string | null;
  gradient_from: string;
  gradient_to: string;
  stats: HomeInfoStat[];
  tags: HomeInfoTag[];
  formats: HomeInfoFormat[];
  trial_button_enabled: boolean;
  trial_button_text: string;
  tariffs_button_enabled: boolean;
  tariffs_button_text: string;
  is_visible: boolean;
}

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  lessons_count: number;
  price: number;
}

export interface TrialSignupBody {
  student_name: string;
  phone: string;
  parent_name?: string | null;
  class_number?: number | null;
  exam_type?: string | null;
  subject_name?: string | null;
}

export interface TrialSignupResponse {
  message: string;
  lead_id: string;
  room_id: string | null;
  admin_name: string | null;
}

export interface TodayLesson {
  group_id: string;
  group_name: string;
  subject_name: string | null;
  teacher_name: string | null;
  location_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  is_now: boolean;
}

export interface Performance {
  attendance_percent: number;
  homework_done: number;
  subjects_count: number;
  subject_progress: Array<{ name: string; percent: number }>;
}

export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  total_seats: number;
  available_seats: number;
  is_registered: boolean;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  exam_title: string;
  subject_name: string | null;
  subject_id: string | null;
  exam_type: string | null;
  school_location_id: string | null;
  school_location_name: string | null;
  is_active: boolean;
  notes: string | null;
  time_slots: TimeSlot[];
}

export interface MyRegistration {
  id: string;
  session_id: string;
  exam_title: string;
  subject_name: string | null;
  subject_id: string | null;
  exam_type: string | null;
  school_location_id: string | null;
  school_location_name: string | null;
  date: string;
  start_time: string;
  registered_at: string;
  days_until: number;
}

export interface PortalSubject {
  id: string;
  name: string;
  exam_type: string | null;
}

export interface ChatMember {
  member_id: string;
  member_type: string;
  name: string;
  public_key: string | null;
  room_key_encrypted: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  last_read_at: string | null;
}

export interface ChatRoom {
  id: string;
  room_type: "group" | "direct";
  group_id: string | null;
  name: string | null;
  created_at: string;
  members: ChatMember[];
  last_message: {
    content_encrypted: string;
    created_at: string;
    sender_type: string;
  } | null;
  unread_count: number;
}

export interface ChatSearchResult {
  id: string;
  member_type: string;
  name: string;
  portal_login: string | null;
  phone: string | null;
  public_key: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_type: string;
  sender_name: string;
  content_encrypted: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to_id: string | null;
  is_deleted: boolean;
  edited_at?: string | null;
  forwarded_from_sender_name?: string | null;
  created_at: string;
}

export interface ChatFileUploadResult {
  file_url: string;
  file_name: string;
  file_size: number;
  message_type: "image" | "file";
}

export interface ExamResult {
  exam_id: string;
  exam_title: string;
  subject_name: string | null;
  exam_date: string | null;
  primary_score: number;
  final_score: number;
  threshold_score: number | null;
  is_passed: boolean | null;
  added_at: string;
}
