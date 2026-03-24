const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

class StudentApiClient {
  private accessToken: string | null = localStorage.getItem("s_access_token");
  private refreshToken: string | null = localStorage.getItem("s_refresh_token");

  private setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem("s_access_token", access);
    localStorage.setItem("s_refresh_token", refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("s_access_token");
    localStorage.removeItem("s_refresh_token");
    localStorage.removeItem("s_student");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
      const refreshRes = await fetch(`${API_URL}/student-auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        this.setTokens(data.access_token, data.refresh_token);
        res = await doFetch(this.accessToken);
      } else {
        this.clearTokens();
        window.location.href = "/login";
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

  // Auth
  async login(login: string, password: string) {
    const data = await this.request<{
      access_token: string; refresh_token: string;
      student_id: string; first_name: string; last_name: string;
    }>("/student-auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem("s_student", JSON.stringify({
      id: data.student_id,
      first_name: data.first_name,
      last_name: data.last_name,
    }));
    return data;
  }

  // Profile
  async getMe() {
    return this.request<StudentProfile>("/student-portal/me");
  }

  // Schedule
  async getTodaySchedule() {
    return this.request<TodayLesson[]>("/student-portal/schedule/today");
  }

  // Performance
  async getPerformance() {
    return this.request<Performance>("/student-portal/performance");
  }

  // Exam sessions
  async getExamSessions() {
    return this.request<ExamSession[]>("/student-portal/exam-sessions");
  }

  async getSubjects() {
    return this.request<PortalSubject[]>("/student-portal/subjects");
  }

  async registerForExam(slotId: string, subjectId?: string | null) {
    return this.request<{ message: string; registration_id: string }>(
      `/student-portal/exam-sessions/${slotId}/register`,
      { method: "POST", body: JSON.stringify({ subject_id: subjectId ?? null }) }
    );
  }

  async cancelRegistration(regId: string) {
    return this.request<void>(`/student-portal/registrations/${regId}`, { method: "DELETE" });
  }

  async getMyRegistrations() {
    return this.request<MyRegistration[]>("/student-portal/my-registrations");
  }

  async getResults() {
    return this.request<ExamResult[]>("/student-portal/results");
  }

  async verifyPassword(password: string) {
    return this.request<{ valid: boolean }>("/student-portal/verify-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  async updateSettings(data: {
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

  // ── Chat ──────────────────────────────────────────────────────────────────

  async updatePublicKey(publicKey: string) {
    return this.request<{ ok: boolean }>("/chat/public-key", {
      method: "PATCH",
      body: JSON.stringify({ public_key: publicKey }),
    });
  }

  async getChatRooms() {
    return this.request<ChatRoom[]>("/chat/rooms");
  }

  async getChatMessages(roomId: string, before?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return this.request<ChatMessage[]>(`/chat/rooms/${roomId}/messages?${params}`);
  }

  async markRoomRead(roomId: string) {
    return this.request<{ ok: boolean }>(`/chat/rooms/${roomId}/read`, { method: "POST" });
  }

  async getMemberPublicKey(memberId: string, memberType = "student") {
    return this.request<{ public_key: string }>(
      `/chat/members/${memberId}/public-key?member_type=${memberType}`
    );
  }

  async sendMessage(roomId: string, contentEncrypted: string, messageType = "text", replyToId?: string) {
    return this.request<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content_encrypted: contentEncrypted,
        message_type: messageType,
        ...(replyToId ? { reply_to_id: replyToId } : {}),
      }),
    });
  }

  async searchUsers(query: string) {
    const params = new URLSearchParams({ q: query });
    return this.request<ChatSearchResult[]>(`/chat/search?${params}`);
  }

  async getOrCreateDirectRoom(otherId: string, otherType = "student") {
    return this.request<ChatRoom>("/chat/rooms/direct", {
      method: "POST",
      body: JSON.stringify({ other_id: otherId, other_type: otherType }),
    });
  }

  async updateRoomKey(roomId: string, memberId: string, memberType: string, roomKeyEncrypted: string) {
    return this.request<{ ok: boolean }>(`/chat/rooms/${roomId}/room-key`, {
      method: "PATCH",
      body: JSON.stringify({ member_id: memberId, member_type: memberType, room_key_encrypted: roomKeyEncrypted }),
    });
  }

  getWsUrl(): string {
    const base = (import.meta.env.VITE_API_URL ?? "http://localhost:8000")
      .replace(/^http/, "ws");
    return `${base}/chat/ws?token=${this.accessToken ?? ""}`;
  }
}

export const api = new StudentApiClient();

// ── Types ──────────────────────────────────────────────────────────────────────

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
  groups: Array<{
    id: string; name: string; subject: string | null; exam_type: string | null;
    schedules: Array<{ day: string; start_time: string; duration: number }>;
  }>;
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

// ── Chat types ────────────────────────────────────────────────────────────

export interface ChatMember {
  member_id: string;
  member_type: string;
  name: string;
  public_key: string | null;
  room_key_encrypted: string | null; // only returned for current user
  is_online: boolean;
  last_seen_at: string | null; // ISO datetime
  last_read_at: string | null; // ISO datetime
}

export interface ChatRoom {
  id: string;
  room_type: "group" | "direct";
  group_id: string | null;
  name: string | null;
  created_at: string;
  members: ChatMember[];
  last_message: { content_encrypted: string; created_at: string; sender_type: string } | null;
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
  reply_to_id: string | null;
  is_deleted: boolean;
  created_at: string;
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
