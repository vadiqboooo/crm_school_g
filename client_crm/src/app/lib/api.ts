import type {
  LoginRequest,
  TokenResponse,
  User,
  Student,
  StudentCreate,
  StudentUpdate,
  Group,
  GroupCreate,
  GroupUpdate,
  Settings,
  SettingsUpdate,
  Subject,
  Lesson,
  LessonCreate,
  LessonUpdate,
  LessonAttendance,
  AttendanceCreate,
  AttendanceUpdate,
  SchoolLocation,
  SchoolLocationCreate,
  SchoolLocationUpdate,
  Exam,
  ExamCreate,
  ExamUpdate,
  ExamResult,
  ExamResultCreate,
  ExamResultUpdate,
  WeeklyReport,
  DailyReport,
  DailyReportCreate,
  DailyReportUpdate,
  Task,
  TaskCreate,
  TaskUpdate,
  TaskComment,
  TaskCommentCreate,
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadComment,
  LeadCommentCreate,
  SubscriptionPlan,
  SubscriptionPlanCreate,
  SubscriptionPlanUpdate,
  ExamRegistrationItem,
  PortalCredential,
  AppUser,
  AppUserCreate,
  AppUserUpdate,
} from "../types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem("access_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const retryHeaders = {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
            ...options.headers,
          };
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
          });
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          return await retryResponse.json();
        } else {
          // Refresh failed, logout
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          throw new Error("Authentication failed");
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("API Error Details:", JSON.stringify(error, null, 2));
        throw new Error(error.detail || JSON.stringify(error) || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);
    return response;
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  // Student endpoints
  async getStudents(): Promise<Student[]> {
    return this.request<Student[]>("/students");
  }

  async getAllStudents(): Promise<Student[]> {
    return this.request<Student[]>("/students?all=true");
  }

  async getStudent(id: string): Promise<Student> {
    return this.request<Student>(`/students/${id}`);
  }

  async createStudent(data: StudentCreate): Promise<Student> {
    return this.request<Student>("/students", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: StudentUpdate): Promise<Student> {
    return this.request<Student>(`/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: string): Promise<void> {
    return this.request<void>(`/students/${id}`, {
      method: "DELETE",
    });
  }

  async getStudentHistory(id: string): Promise<import("../types/api").StudentHistory[]> {
    return this.request<import("../types/api").StudentHistory[]>(`/students/${id}/history`);
  }

  async getStudentPerformance(
    studentId: string,
    filters?: {
      groupId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<import("../types/api").StudentPerformanceResponse> {
    const params = new URLSearchParams();
    if (filters?.groupId) params.append("group_id", filters.groupId);
    if (filters?.startDate) params.append("start_date", filters.startDate);
    if (filters?.endDate) params.append("end_date", filters.endDate);

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<import("../types/api").StudentPerformanceResponse>(
      `/students/${studentId}/performance${query}`
    );
  }

  async addParentContact(
    studentId: string,
    data: { name: string; relation: string; phone: string; telegram_id?: string }
  ): Promise<import("../types/api").ParentContact> {
    return this.request<import("../types/api").ParentContact>(`/students/${studentId}/contacts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteParentContact(studentId: string, contactId: string): Promise<void> {
    return this.request<void>(`/students/${studentId}/contacts/${contactId}`, {
      method: "DELETE",
    });
  }

  // Student Comments
  async createStudentComment(studentId: string, data: import("../types/api").StudentCommentCreate): Promise<import("../types/api").StudentComment> {
    return this.request<import("../types/api").StudentComment>(`/students/${studentId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getStudentComments(studentId: string): Promise<import("../types/api").StudentComment[]> {
    return this.request<import("../types/api").StudentComment[]>(`/students/${studentId}/comments`);
  }

  async deleteStudentComment(studentId: string, commentId: string): Promise<void> {
    return this.request<void>(`/students/${studentId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  async generateWeeklyReport(
    studentId: string,
    days: number = 7
  ): Promise<{
    report_id: string;
    report: string;
    period: { start: string; end: string };
    stats: {
      attendance_count: number;
      absent_count: number;
      late_count: number;
      homework_completed: number;
      homework_total: number;
    };
  }> {
    return this.request(`/students/${studentId}/generate-weekly-report`, {
      method: "POST",
      body: JSON.stringify({ days }),
    });
  }

  async getWeeklyReports(studentId: string): Promise<WeeklyReport[]> {
    return this.request(`/students/${studentId}/weekly-reports`);
  }

  async updateWeeklyReport(
    reportId: string,
    data: { ai_report: string }
  ): Promise<WeeklyReport> {
    return this.request(`/students/weekly-reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async approveWeeklyReport(reportId: string): Promise<WeeklyReport> {
    return this.request(`/students/weekly-reports/${reportId}/approve`, {
      method: "POST",
    });
  }

  async unapproveWeeklyReport(reportId: string): Promise<WeeklyReport> {
    return this.request(`/students/weekly-reports/${reportId}/unapprove`, {
      method: "POST",
    });
  }

  async getAllStudentsLatestReports(): Promise<Record<string, WeeklyReport>> {
    return this.request(`/students/weekly-reports/latest-all`);
  }

  async deleteWeeklyReport(reportId: string): Promise<void> {
    return this.request(`/students/weekly-reports/${reportId}`, {
      method: "DELETE",
    });
  }

  async updateWeeklyReportParentComment(
    reportId: string,
    data: { parent_feedback?: string; parent_reaction?: string }
  ): Promise<WeeklyReport> {
    return this.request(`/students/weekly-reports/${reportId}/parent-comment`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Parent Feedback endpoints
  async createParentFeedback(
    studentId: string,
    data: import("../types/api").ParentFeedbackCreate
  ): Promise<import("../types/api").ParentFeedback> {
    return this.request(`/students/${studentId}/parent-feedbacks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getParentFeedbacks(
    studentId: string
  ): Promise<import("../types/api").ParentFeedback[]> {
    return this.request(`/students/${studentId}/parent-feedbacks`);
  }

  async updateParentFeedback(
    feedbackId: string,
    data: import("../types/api").ParentFeedbackUpdate
  ): Promise<import("../types/api").ParentFeedback> {
    return this.request(`/students/parent-feedbacks/${feedbackId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteParentFeedback(feedbackId: string): Promise<void> {
    return this.request(`/students/parent-feedbacks/${feedbackId}`, {
      method: "DELETE",
    });
  }

  // Group endpoints
  async getGroups(): Promise<Group[]> {
    return this.request<Group[]>("/groups");
  }

  async getGroup(id: string): Promise<Group> {
    return this.request<Group>(`/groups/${id}`);
  }

  async createGroup(data: GroupCreate): Promise<Group> {
    return this.request<Group>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id: string, data: GroupUpdate): Promise<Group> {
    return this.request<Group>(`/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string): Promise<void> {
    return this.request<void>(`/groups/${id}`, {
      method: "DELETE",
    });
  }

  async archiveGroup(id: string): Promise<void> {
    return this.request<void>(`/groups/${id}/archive`, {
      method: "POST",
    });
  }

  async restoreGroup(id: string): Promise<void> {
    return this.request<void>(`/groups/${id}/restore`, {
      method: "POST",
    });
  }

  async addStudentToGroup(groupId: string, studentId: string): Promise<void> {
    return this.request<void>(`/groups/${groupId}/students`, {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    });
  }

  async removeStudentFromGroup(groupId: string, studentId: string): Promise<void> {
    return this.request<void>(`/groups/${groupId}/students/${studentId}`, {
      method: "DELETE",
    });
  }

  async getGroupStudents(groupId: string): Promise<import("../types/api").GroupStudent[]> {
    return this.request<import("../types/api").GroupStudent[]>(`/groups/${groupId}/students`);
  }

  async getArchivedStudents(groupId: string): Promise<import("../types/api").GroupStudent[]> {
    return this.request<import("../types/api").GroupStudent[]>(`/groups/${groupId}/students/archived`);
  }

  async restoreStudentToGroup(groupId: string, studentId: string): Promise<void> {
    return this.request<void>(`/groups/${groupId}/students/${studentId}/restore`, {
      method: "POST",
    });
  }

  async updateStudentJoinedDate(groupId: string, studentId: string, joinedDate: string): Promise<{ detail: string; old_date: string; new_date: string }> {
    return this.request<{ detail: string; old_date: string; new_date: string }>(
      `/groups/${groupId}/students/${studentId}/joined-date?joined_at=${joinedDate}`,
      { method: "PATCH" }
    );
  }

  // Schedule endpoints
  async getSchedules(groupId: string): Promise<import("../types/api").Schedule[]> {
    return this.request<import("../types/api").Schedule[]>(`/groups/${groupId}/schedules`);
  }

  async createSchedule(groupId: string, data: import("../types/api").ScheduleCreate): Promise<import("../types/api").Schedule> {
    return this.request<import("../types/api").Schedule>(`/groups/${groupId}/schedules`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteSchedule(groupId: string, scheduleId: string): Promise<void> {
    return this.request<void>(`/groups/${groupId}/schedules/${scheduleId}`, {
      method: "DELETE",
    });
  }

  async generateLessons(groupId: string, data: { end_date?: string; months?: number }): Promise<Lesson[]> {
    return this.request<Lesson[]>(`/groups/${groupId}/generate-lessons`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteGroupLessons(groupId: string, params?: { from_date?: string; only_future?: boolean }): Promise<{ detail: string; count: number; skipped: number }> {
    const queryParams = new URLSearchParams();
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.only_future !== undefined) queryParams.append("only_future", String(params.only_future));

    const queryString = queryParams.toString();
    return this.request<{ detail: string; count: number; skipped: number }>(
      `/groups/${groupId}/lessons${queryString ? `?${queryString}` : ""}`,
      { method: "DELETE" }
    );
  }

  async regenerateLessons(groupId: string, data: { end_date?: string; months?: number; delete_existing?: boolean }): Promise<{
    detail: string;
    deleted_count: number;
    skipped_count: number;
    created_count: number;
    lessons: Lesson[];
  }> {
    const queryParams = data.delete_existing !== undefined ? `?delete_existing=${data.delete_existing}` : "";
    return this.request<{
      detail: string;
      deleted_count: number;
      skipped_count: number;
      created_count: number;
      lessons: Lesson[];
    }>(`/groups/${groupId}/regenerate-lessons${queryParams}`, {
      method: "POST",
      body: JSON.stringify({ end_date: data.end_date, months: data.months }),
    });
  }

  // Subject endpoints
  async getSubjects(): Promise<Subject[]> {
    return this.request<Subject[]>("/subjects");
  }

  // Employee endpoints
  async getEmployees(roles?: string[]): Promise<import("../types/api").User[]> {
    const params = roles ? `?roles=${roles.join(',')}` : '';
    return this.request<import("../types/api").User[]>(`/employees${params}`);
  }

  async createEmployee(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: "admin" | "teacher" | "manager";
  }): Promise<import("../types/api").User> {
    return this.request<import("../types/api").User>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: "admin" | "teacher" | "manager";
    salary_rate?: number | null;
    salary_bonus_per_student?: number | null;
    salary_base_students?: number;
  }): Promise<import("../types/api").User> {
    return this.request<import("../types/api").User>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async checkEmployeeDeletion(id: string): Promise<{
    can_delete: boolean;
    groups: Array<{ id: string; name: string }>;
    groups_count: number;
  }> {
    return this.request(`/employees/${id}/deletion-check`);
  }

  async deleteEmployee(id: string): Promise<void> {
    return this.request<void>(`/employees/${id}`, {
      method: "DELETE",
    });
  }

  // Lesson endpoints
  async getLessons(groupId?: string): Promise<Lesson[]> {
    const query = groupId ? `?group_id=${groupId}` : "";
    return this.request<Lesson[]>(`/lessons${query}`);
  }

  async getLesson(id: string): Promise<Lesson> {
    return this.request<Lesson>(`/lessons/${id}`);
  }

  async createLesson(data: LessonCreate): Promise<Lesson> {
    return this.request<Lesson>("/lessons", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLesson(id: string, data: LessonUpdate): Promise<Lesson> {
    return this.request<Lesson>(`/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteLesson(id: string): Promise<void> {
    return this.request<void>(`/lessons/${id}`, {
      method: "DELETE",
    });
  }

  // Lesson Attendance endpoints
  async getLessonAttendance(lessonId: string): Promise<LessonAttendance[]> {
    return this.request<LessonAttendance[]>(`/lessons/${lessonId}/attendance`);
  }

  async createAttendance(lessonId: string, data: AttendanceCreate): Promise<LessonAttendance> {
    return this.request<LessonAttendance>(`/lessons/${lessonId}/attendance`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAttendance(lessonId: string, attendanceId: string, data: AttendanceUpdate): Promise<LessonAttendance> {
    return this.request<LessonAttendance>(`/lessons/${lessonId}/attendance/${attendanceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Settings endpoints
  async getSettings(): Promise<Settings> {
    return this.request<Settings>("/settings");
  }

  async updateSettings(data: SettingsUpdate): Promise<Settings> {
    return this.request<Settings>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // School Location endpoints
  async getSchoolLocations(): Promise<SchoolLocation[]> {
    return this.request<SchoolLocation[]>("/school-locations");
  }

  async getSchoolLocation(id: string): Promise<SchoolLocation> {
    return this.request<SchoolLocation>(`/school-locations/${id}`);
  }

  async createSchoolLocation(data: SchoolLocationCreate): Promise<SchoolLocation> {
    return this.request<SchoolLocation>("/school-locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSchoolLocation(id: string, data: SchoolLocationUpdate): Promise<SchoolLocation> {
    return this.request<SchoolLocation>(`/school-locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSchoolLocation(id: string): Promise<void> {
    return this.request<void>(`/school-locations/${id}`, {
      method: "DELETE",
    });
  }

  // Exam endpoints
  async getExams(groupId?: string): Promise<Exam[]> {
    const query = groupId ? `?group_id=${groupId}` : "";
    return this.request<Exam[]>(`/exams${query}`);
  }

  async getExam(id: string): Promise<Exam> {
    return this.request<Exam>(`/exams/${id}`);
  }

  async createExam(data: ExamCreate): Promise<Exam> {
    return this.request<Exam>("/exams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateExam(id: string, data: ExamUpdate): Promise<Exam> {
    return this.request<Exam>(`/exams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteExam(id: string): Promise<void> {
    return this.request<void>(`/exams/${id}`, {
      method: "DELETE",
    });
  }

  // Exam Result endpoints
  async getAllExamResults(): Promise<ExamResult[]> {
    return this.request<ExamResult[]>(`/exams/results/all`);
  }

  async getExamResults(examId: string): Promise<ExamResult[]> {
    return this.request<ExamResult[]>(`/exams/${examId}/results`);
  }

  async createExamResult(examId: string, data: ExamResultCreate): Promise<ExamResult> {
    return this.request<ExamResult>(`/exams/${examId}/results`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateExamResult(examId: string, resultId: string, data: ExamResultUpdate): Promise<ExamResult> {
    return this.request<ExamResult>(`/exams/${examId}/results/${resultId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteExamResult(examId: string, resultId: string): Promise<void> {
    return this.request<void>(`/exams/${examId}/results/${resultId}`, {
      method: "DELETE",
    });
  }

  // Exam Template endpoints
  async getExamTemplates(): Promise<Exam[]> {
    return this.request<Exam[]>("/exam-templates");
  }

  async getExamTemplate(id: string): Promise<Exam> {
    return this.request<Exam>(`/exam-templates/${id}`);
  }

  async createExamTemplate(data: ExamCreate): Promise<Exam> {
    return this.request<Exam>("/exam-templates", {
      method: "POST",
      body: JSON.stringify({ ...data, is_template: true }),
    });
  }

  async updateExamTemplate(id: string, data: ExamUpdate): Promise<Exam> {
    return this.request<Exam>(`/exam-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteExamTemplate(id: string): Promise<void> {
    return this.request<void>(`/exam-templates/${id}`, {
      method: "DELETE",
    });
  }

  async createExamFromTemplate(templateId: string, groupId: string): Promise<Exam> {
    return this.request<Exam>(`/exam-templates/${templateId}/use?group_id=${groupId}`, {
      method: "POST",
    });
  }

  // --- Daily Reports ---

  async getReports(): Promise<DailyReport[]> {
    return this.request<DailyReport[]>("/reports");
  }

  async getReport(id: string): Promise<DailyReport> {
    return this.request<DailyReport>(`/reports/${id}`);
  }

  async createReport(data: DailyReportCreate): Promise<DailyReport> {
    return this.request<DailyReport>("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateReport(id: string, data: DailyReportUpdate): Promise<DailyReport> {
    return this.request<DailyReport>(`/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteReport(id: string): Promise<void> {
    return this.request<void>(`/reports/${id}`, {
      method: "DELETE",
    });
  }

  // --- Tasks ---

  async getReportTasks(reportId: string): Promise<Task[]> {
    return this.request<Task[]>(`/reports/${reportId}/tasks`);
  }

  async getFilteredReportTasks(reportId: string): Promise<Task[]> {
    return this.request<Task[]>(`/reports/daily/${reportId}/filtered-tasks`);
  }

  async getAllTasks(): Promise<Task[]> {
    return this.request<Task[]>("/reports/tasks/all");
  }

  async createTask(data: TaskCreate): Promise<Task> {
    return this.request<Task>("/reports/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: TaskUpdate): Promise<Task> {
    return this.request<Task>(`/reports/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.request<void>(`/reports/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // Task Comments
  async createTaskComment(taskId: string, data: TaskCommentCreate): Promise<TaskComment> {
    return this.request<TaskComment>(`/reports/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    return this.request<TaskComment[]>(`/reports/tasks/${taskId}/comments`);
  }

  async deleteTaskComment(taskId: string, commentId: string): Promise<void> {
    return this.request<void>(`/reports/tasks/${taskId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  // Leads endpoints
  async getLeads(): Promise<Lead[]> {
    return this.request<Lead[]>("/leads");
  }

  async createLead(data: LeadCreate): Promise<Lead> {
    return this.request<Lead>("/leads", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLead(id: string, data: LeadUpdate): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async assignTrialGroup(leadId: string, groupId: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${leadId}/assign-trial`, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId }),
    });
  }

  async convertLeadToStudent(leadId: string, groupId?: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${leadId}/convert`, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId ?? null }),
    });
  }

  async removeLeadTrialGroup(leadId: string, groupId: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${leadId}/trial-groups/${groupId}`, { method: "DELETE" });
  }

  async deleteLead(id: string): Promise<void> {
    return this.request<void>(`/leads/${id}`, { method: "DELETE" });
  }

  async restoreLead(id: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}/restore`, { method: "POST" });
  }

  async restoreStudent(id: string): Promise<void> {
    return this.request<void>(`/students/${id}/restore`, { method: "POST" });
  }

  async permanentDeleteStudent(id: string): Promise<void> {
    return this.request<void>(`/students/${id}/permanent`, { method: "DELETE" });
  }

  async permanentDeleteLead(id: string): Promise<void> {
    return this.request<void>(`/leads/${id}/permanent`, { method: "DELETE" });
  }

  async addLeadComment(leadId: string, data: LeadCommentCreate): Promise<LeadComment> {
    return this.request<LeadComment>(`/leads/${leadId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.request<SubscriptionPlan[]>("/subscription-plans");
  }

  async createSubscriptionPlan(data: SubscriptionPlanCreate): Promise<SubscriptionPlan> {
    return this.request<SubscriptionPlan>("/subscription-plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSubscriptionPlan(id: string, data: SubscriptionPlanUpdate): Promise<SubscriptionPlan> {
    return this.request<SubscriptionPlan>(`/subscription-plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    return this.request<void>(`/subscription-plans/${id}`, { method: "DELETE" });
  }

  // Student balance / subscription
  async addStudentPayment(studentId: string, amount: number, description?: string): Promise<Student> {
    return this.request<Student>(`/students/${studentId}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount, description }),
    });
  }

  async retroactiveDeduction(studentId: string): Promise<Student> {
    return this.request<Student>(`/students/${studentId}/retroactive-deduction`, {
      method: "POST",
    });
  }

  async setStudentSubscription(studentId: string, planId: string | null): Promise<Student> {
    return this.request<Student>(`/students/${studentId}/subscription`, {
      method: "PATCH",
      body: JSON.stringify({ subscription_plan_id: planId }),
    });
  }

  async getPayments(studentId?: string): Promise<import("../types/api").Payment[]> {
    const q = studentId ? `?student_id=${studentId}` : "";
    return this.request<import("../types/api").Payment[]>(`/finances/payments${q}`);
  }

  async getSalaries(employeeId?: string): Promise<import("../types/api").EmployeeSalary[]> {
    const q = employeeId ? `?employee_id=${employeeId}` : "";
    return this.request<import("../types/api").EmployeeSalary[]>(`/finances/salaries${q}`);
  }

  async updateSalary(id: string, data: { status?: "paid" | "pending" }): Promise<import("../types/api").EmployeeSalary> {
    return this.request<import("../types/api").EmployeeSalary>(`/finances/salaries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ── Exam Portal Sessions ───────────────────────────────────────────────────
  async getExamPortalSessions(): Promise<import("../types/api").ExamPortalSession[]> {
    return this.request<import("../types/api").ExamPortalSession[]>("/exam-sessions/");
  }

  async createExamPortalSession(data: import("../types/api").ExamPortalSessionCreate): Promise<import("../types/api").ExamPortalSession> {
    return this.request<import("../types/api").ExamPortalSession>("/exam-sessions/", { method: "POST", body: JSON.stringify(data) });
  }

  async updateExamPortalSession(id: string, data: import("../types/api").ExamPortalSessionUpdate): Promise<import("../types/api").ExamPortalSession> {
    return this.request<import("../types/api").ExamPortalSession>(`/exam-sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteExamPortalSession(id: string): Promise<void> {
    return this.request<void>(`/exam-sessions/${id}`, { method: "DELETE" });
  }

  async addExamTimeSlot(sessionId: string, data: import("../types/api").ExamTimeSlotCreate): Promise<import("../types/api").ExamPortalSession> {
    return this.request<import("../types/api").ExamPortalSession>(`/exam-sessions/${sessionId}/slots`, { method: "POST", body: JSON.stringify(data) });
  }

  async deleteExamTimeSlot(sessionId: string, slotId: string): Promise<void> {
    return this.request<void>(`/exam-sessions/${sessionId}/slots/${slotId}`, { method: "DELETE" });
  }

  async generatePortalCredentials(studentId: string): Promise<{ student_id: string; portal_login: string; plain_password: string }> {
    return this.request(`/students/${studentId}/generate-portal-credentials`, { method: "POST" });
  }

  async getExamRegistrations(): Promise<ExamRegistrationItem[]> {
    return this.request<ExamRegistrationItem[]>("/exam-sessions/registrations");
  }

  async updateRegistrationMark(id: string, data: { attendance?: string | null; passed?: boolean | null }): Promise<void> {
    await this.request<void>(`/exam-sessions/registrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async generateGroupCredentials(groupId: string): Promise<PortalCredential[]> {
    return this.request<PortalCredential[]>(`/students/group/${groupId}/generate-portal-credentials`, { method: "POST" });
  }

  async generateAllCredentials(): Promise<PortalCredential[]> {
    return this.request<PortalCredential[]>("/students/generate-portal-credentials-bulk", { method: "POST" });
  }

  // App Users
  async getAppUsers(): Promise<AppUser[]> {
    return this.request<AppUser[]>("/app-users/");
  }

  async createAppUser(data: AppUserCreate): Promise<AppUser> {
    return this.request<AppUser>("/app-users/", { method: "POST", body: JSON.stringify(data) });
  }

  async updateAppUser(id: string, data: AppUserUpdate): Promise<AppUser> {
    return this.request<AppUser>(`/app-users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteAppUser(id: string): Promise<void> {
    await this.request<void>(`/app-users/${id}`, { method: "DELETE" });
  }

  async linkStudentToAppUser(userId: string, studentId: string): Promise<AppUser> {
    return this.request<AppUser>(`/app-users/${userId}/link-student`, {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    });
  }

  async unlinkStudentFromAppUser(userId: string): Promise<void> {
    await this.request<void>(`/app-users/${userId}/link-student`, { method: "DELETE" });
  }

  async resetAppUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.request<void>(`/app-users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    });
  }
}

export const api = new ApiClient(API_URL);
