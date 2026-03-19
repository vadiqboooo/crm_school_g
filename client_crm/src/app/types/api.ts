// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: "admin" | "teacher" | "manager";
  is_active: boolean;
  salary_rate?: number | null;
  salary_bonus_per_student?: number | null;
  salary_base_students?: number;
  created_at: string;
}

export interface EmployeeSalary {
  id: string;
  employee_id: string;
  employee_name?: string | null;
  lesson_id?: string | null;
  lessons_count?: number | null;
  rate?: number | null;
  total?: number | null;
  students_count?: number | null;
  status: "pending" | "paid";
  description?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  group_id?: string | null;
  amount: number;
  status: "paid" | "pending" | "overdue";
  due_date?: string | null;
  created_at: string;
  student_name?: string | null;
  group_name?: string | null;
  description?: string | null;
}

// Student types
export type StudentStatus = "active" | "inactive";
export type StudentSource = "Сайт" | "Социальные сети" | "Рекомендация" | "Реклама" | "Другое";
export type EducationType = "Школа" | "Гимназия" | "Лицей" | "СПО" | "Колледж" | "Университет" | "Другое";
export type ParentRelation = "мама" | "папа" | "бабушка" | "дедушка" | "тетя" | "дядя";
export type HistoryEventType = "added_to_db" | "added_to_group" | "removed_from_group" | "payment" | "status_change" | "parent_feedback_added" | "parent_feedback_deleted" | "student_info_updated" | "balance_replenishment" | "lesson_deduction";

export interface SubscriptionPlan {
  id: string;
  name: string;
  lessons_count: number;
  price_per_lesson: number;
  total_price: number;
  is_active: boolean;
  created_at: string;
}

export interface SubscriptionPlanCreate {
  name: string;
  lessons_count: number;
  price_per_lesson: number;
}

export interface SubscriptionPlanUpdate {
  name?: string;
  lessons_count?: number;
  price_per_lesson?: number;
  is_active?: boolean;
}

export interface ParentContact {
  id: string;
  student_id: string;
  name: string;
  relation: ParentRelation;
  phone: string;
  telegram_username?: string;
}

export interface StudentHistory {
  id: string;
  student_id: string;
  event_type: HistoryEventType;
  description?: string;
  created_at: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  school_location?: string;
}

export interface StudentComment {
  id: string;
  student_id: string;
  author_id: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  content: string;
  created_at: string;
}

export interface StudentCommentCreate {
  content: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  telegram_id?: string;
  telegram_username?: string;
  bot_linked?: boolean;
  contract_number?: string;
  source?: StudentSource;
  education_type?: EducationType;
  current_school?: string;
  class_number?: number;
  status: StudentStatus;
  balance?: number;
  subscription_plan?: SubscriptionPlan | null;
  lessons_remaining?: number | null;
  created_at: string;
  parent_contacts: ParentContact[];
  groups: GroupInfo[];
  history: StudentHistory[];
  comments: StudentComment[];
  portal_login?: string | null;
}

export interface StudentCreate {
  first_name: string;
  last_name: string;
  phone?: string;
  telegram_id?: string;
  telegram_username?: string;
  bot_linked?: boolean;
  contract_number?: string;
  source?: StudentSource;
  education_type?: EducationType;
  current_school?: string;
  class_number?: number;
  status?: StudentStatus;
  parent_contacts: Array<{
    name: string;
    relation: ParentRelation;
    phone: string;
    telegram_username?: string;
  }>;
}

export interface StudentUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  telegram_id?: string;
  telegram_username?: string;
  bot_linked?: boolean;
  contract_number?: string;
  source?: StudentSource;
  education_type?: EducationType;
  current_school?: string;
  class_number?: number;
  status?: StudentStatus;
  parent_contacts?: Array<{
    name: string;
    relation: ParentRelation;
    phone: string;
    telegram_username?: string;
  }>;
}

export interface StudentPerformanceRecord {
  lesson_id: string;
  lesson_date: string;
  lesson_time?: string;
  lesson_topic?: string;
  lesson_homework?: string;
  group_id: string;
  group_name: string;
  subject_name: string;
  attendance?: AttendanceStatus;
  late_minutes?: number;
  lesson_grade?: string;
  homework_grade?: string;
  comment?: string;
}

export interface StudentPerformanceResponse {
  student_id: string;
  student_name: string;
  performance_records: StudentPerformanceRecord[];
}

// Group types
export type ExamType = "ЕГЭ" | "ОГЭ";

export interface TaskConfig {
  label: string;
  maxScore: number;
}

export interface ScaleMarker {
  id: string;
  primaryScore: number;
  secondaryScore: number;
  label: string;
  type: "passing" | "average" | "part1" | "custom";
  color: string;
}

export interface GradeScaleItem {
  grade: number;
  min: number;
  max: number;
}

export interface TopicConfig {
  topic: string;
  taskNumbers: number[];
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  code?: string;
  is_active: boolean;
  exam_type?: ExamType;
  tasks?: TaskConfig[];
  primary_to_secondary_scale?: number[];
  scale_markers?: ScaleMarker[];
  grade_scale?: GradeScaleItem[];
  topics?: TopicConfig[];
}

export interface SubjectCreate {
  name: string;
  description?: string;
  color?: string;
  code?: string;
  is_active?: boolean;
  exam_type?: ExamType;
  tasks?: TaskConfig[];
  primary_to_secondary_scale?: number[];
  scale_markers?: ScaleMarker[];
  grade_scale?: GradeScaleItem[];
  topics?: TopicConfig[];
}

export interface SubjectUpdate {
  name?: string;
  description?: string;
  color?: string;
  code?: string;
  is_active?: boolean;
  exam_type?: ExamType;
  tasks?: TaskConfig[];
  primary_to_secondary_scale?: number[];
  scale_markers?: ScaleMarker[];
  grade_scale?: GradeScaleItem[];
  topics?: TopicConfig[];
}

export interface Schedule {
  id: string;
  group_id: string;
  day_of_week: string;
  start_time: string;
  duration_minutes: number;
}

export interface ScheduleCreate {
  day_of_week: string;
  start_time: string;
  duration_minutes: number;
}

export interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  is_archived: boolean;
  is_trial: boolean;
  joined_at: string;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface Group {
  id: string;
  name: string;
  subject: Subject;
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  level?: string;
  schedule_day?: string; // Deprecated
  schedule_time?: string; // Deprecated
  schedule_duration?: number; // Deprecated
  schedules: Schedule[]; // New field
  start_date?: string; // ISO date string
  school_location_id?: string;
  location?: {
    id: string;
    name: string;
    address?: string;
  };
  description?: string;
  comment?: string;
  is_archived: boolean;
  created_at: string;
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export interface GroupCreate {
  name: string;
  subject_id: string;
  teacher_id: string;
  level?: string;
  schedule_day?: string;
  schedule_time?: string;
  schedule_duration?: number;
  start_date?: string;
  school_location_id?: string;
  description?: string;
  comment?: string;
}

export interface GroupUpdate {
  name?: string;
  subject_id?: string;
  teacher_id?: string;
  level?: string;
  schedule_day?: string;
  schedule_time?: string;
  schedule_duration?: number;
  start_date?: string;
  school_location_id?: string;
  description?: string;
  comment?: string;
}

// Lesson types
export type LessonStatus = "conducted" | "not_conducted";
export type WorkType = "none" | "control" | "test";
export type GradingSystem = "5point" | "tasks";
export type HomeworkGrading = "5point" | "tasks" | "passfall";
export type AttendanceStatus = "present" | "absent" | "late" | "trial";

export interface Lesson {
  id: string;
  group_id: string;
  date: string; // ISO date string
  time?: string; // HH:MM format
  duration?: number;
  topic?: string;
  status?: LessonStatus;
  is_cancelled: boolean;
  work_type: WorkType;
  grading_system?: GradingSystem;
  tasks_count?: number;
  homework?: string;
  homework_grading?: HomeworkGrading;
  homework_tasks_count?: number;
  had_previous_homework: boolean;
}

export interface LessonCreate {
  group_id: string;
  date: string;
  time?: string;
  duration?: number;
  topic?: string;
  status?: LessonStatus;
  is_cancelled?: boolean;
  work_type?: WorkType;
  grading_system?: GradingSystem;
  tasks_count?: number;
  homework?: string;
  homework_grading?: HomeworkGrading;
  homework_tasks_count?: number;
  had_previous_homework?: boolean;
}

export interface LessonUpdate {
  date?: string;
  time?: string;
  duration?: number;
  topic?: string;
  status?: LessonStatus;
  is_cancelled?: boolean;
  work_type?: WorkType;
  grading_system?: GradingSystem;
  tasks_count?: number;
  homework?: string;
  homework_grading?: HomeworkGrading;
  homework_tasks_count?: number;
  had_previous_homework?: boolean;
}

export interface LessonAttendance {
  id: string;
  lesson_id: string;
  student_id: string;
  attendance?: AttendanceStatus;
  late_minutes?: number;
  lesson_grade?: string;
  homework_grade?: string;
  comment?: string;
}

export interface AttendanceCreate {
  student_id: string;
  attendance?: AttendanceStatus;
  late_minutes?: number;
  lesson_grade?: string;
  homework_grade?: string;
  comment?: string;
}

export interface AttendanceUpdate {
  attendance?: AttendanceStatus;
  late_minutes?: number;
  lesson_grade?: string;
  homework_grade?: string;
  comment?: string;
}

// Settings types
export interface Settings {
  id: string;
  school_name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  default_rate?: number;
  student_fee?: number;
}

export interface SettingsUpdate {
  school_name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  default_rate?: number;
  student_fee?: number;
}

// School Location types
export interface SchoolLocation {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  description?: string;
  manager_id?: string;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
}

export interface SchoolLocationCreate {
  name: string;
  address?: string;
  phone?: string;
  description?: string;
  manager_id?: string;
}

export interface SchoolLocationUpdate {
  name?: string;
  address?: string;
  phone?: string;
  description?: string;
  manager_id?: string;
}

// Exam types
export interface Exam {
  id: string;
  group_id?: string;
  title: string;
  subject?: string;  // Keep for backward compatibility
  subject_id?: string;
  date?: string;
  difficulty?: string;
  threshold_score?: number;
  selected_tasks?: number[];
  task_topics?: { [key: string]: string[] };
  comment?: string;
  is_template: boolean;
  is_registration_open: boolean;
  created_by?: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  created_at: string;
  group?: {
    id: string;
    name: string;
  };
  subject_rel?: Subject;
  created_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ExamCreate {
  group_id?: string;
  title: string;
  subject?: string;  // Keep for backward compatibility
  subject_id?: string;
  date?: string;
  difficulty?: string;
  threshold_score?: number;
  selected_tasks?: number[];
  task_topics?: { [key: string]: string[] };
  comment?: string;
  is_template?: boolean;
  is_registration_open?: boolean;
}

export interface ExamUpdate {
  title?: string;
  subject?: string;
  date?: string;
  difficulty?: string;
  threshold_score?: number;
  selected_tasks?: number[];
  task_topics?: { [key: string]: string[] };
  comment?: string;
  is_registration_open?: boolean;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  primary_score: number;
  final_score: number;
  answers?: (number | null)[];
  task_comments?: { [key: string]: string };
  student_comment?: string;
  added_by?: string;
  added_by_first_name?: string;
  added_by_last_name?: string;
  added_at: string;
  updated_at?: string;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  added_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ExamResultCreate {
  student_id: string;
  primary_score?: number;
  final_score?: number;
  answers?: (number | null)[];
  task_comments?: { [key: string]: string };
  student_comment?: string;
}

export interface ExamResultUpdate {
  primary_score?: number;
  final_score?: number;
  answers?: (number | null)[];
  task_comments?: { [key: string]: string };
  student_comment?: string;
  added_by?: string;
}

export interface WeeklyReport {
  id: string;
  student_id: string;
  created_by: string;
  period_start: string;
  period_end: string;
  attendance_count: number;
  absent_count: number;
  late_count: number;
  homework_completed: number;
  homework_total: number;
  ai_report: string;
  is_approved: boolean;
  parent_feedback?: string | null;
  parent_reaction?: string | null;
  created_at: string;
}

// Daily Report types
export type ReportStatus = "draft" | "completed";
export type TaskStatus = "new" | "in_progress" | "urgent" | "completed";

export interface ReportChurnStudent {
  id: string;
  student_name?: string;
  reason?: string;
}

export interface ReportChurnStudentCreate {
  student_name?: string;
  reason?: string;
}

export interface ReportNotifiedStudent {
  id: string;
  student_name?: string;
}

export interface ReportNotifiedStudentCreate {
  student_name?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  content: string;
  created_at: string;
}

export interface TaskCommentCreate {
  content: string;
}

export interface Task {
  id: string;
  report_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  status: TaskStatus;
  assigned_to?: string;
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: "admin" | "teacher" | "manager";
  };
  created_at: string;
  updated_at: string;
  comments: TaskComment[];
  report?: {
    id: string;
    date: string;
    employee?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

export interface TaskCreate {
  report_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  status?: TaskStatus;
  assigned_to?: string;
}

export interface TaskUpdate {
  report_id?: string;
  title?: string;
  description?: string;
  deadline?: string;
  status?: TaskStatus;
  assigned_to?: string;
}

export interface DailyReport {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  date: string;
  start_time?: string;
  end_time?: string;
  lead_calls: number;
  lead_social: number;
  lead_website: number;
  trial_scheduled: number;
  trial_attended: number;
  cancellations?: string;
  cash_income: number;
  cashless_income: number;
  water_balance?: number;
  shopping_list?: string;
  day_comment?: string;
  status: ReportStatus;
  created_at: string;
  churn_students: ReportChurnStudent[];
  notified_students: ReportNotifiedStudent[];
  tasks: Task[];
}

export interface DailyReportCreate {
  date: string;
  start_time?: string;
  lead_calls?: number;
  lead_social?: number;
  lead_website?: number;
  trial_scheduled?: number;
  trial_attended?: number;
  cancellations?: string;
  cash_income?: number;
  cashless_income?: number;
  water_balance?: number;
  shopping_list?: string;
  day_comment?: string;
  status?: ReportStatus;
  churn_students?: ReportChurnStudentCreate[];
  notified_students?: ReportNotifiedStudentCreate[];
}

export interface DailyReportUpdate {
  start_time?: string;
  end_time?: string;
  lead_calls?: number;
  lead_social?: number;
  lead_website?: number;
  trial_scheduled?: number;
  trial_attended?: number;
  cancellations?: string;
  cash_income?: number;
  cashless_income?: number;
  water_balance?: number;
  shopping_list?: string;
  day_comment?: string;
  status?: ReportStatus;
}

// Parent Feedback types
export type ContactType = "call" | "telegram" | "in_person";
export type ParentReaction = "positive" | "neutral" | "negative";

export interface ParentFeedback {
  id: string;
  student_id: string;
  created_by: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  contact_type: ContactType;
  feedback_to_parent: string;
  feedback_from_parent?: string | null;
  parent_reaction?: ParentReaction | null;
  created_at: string;
  created_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ParentFeedbackCreate {
  contact_type: ContactType;
  feedback_to_parent: string;
  feedback_from_parent?: string;
  parent_reaction?: ParentReaction;
}

export interface ParentFeedbackUpdate {
  contact_type?: ContactType;
  feedback_to_parent?: string;
  feedback_from_parent?: string;
  parent_reaction?: ParentReaction;
}

// Lead types
export type LeadStatus = "not_sorted" | "contact_established" | "trial_assigned" | "trial_conducted" | "archived";

export interface LeadCommentAuthor {
  id: string;
  first_name: string;
  last_name: string;
}

export interface LeadComment {
  id: string;
  lead_id: string;
  author_id: string;
  author: LeadCommentAuthor;
  content: string;
  created_at: string;
}

export interface Lead {
  id: string;
  contact_name: string | null;
  student_name: string | null;
  phone: string | null;
  telegram: string | null;
  class_number: number | null;
  education_type: string | null;
  current_school: string | null;
  source: string | null;
  status: LeadStatus;
  assigned_to_id: string | null;
  assigned_to: { id: string; first_name: string; last_name: string } | null;
  school_location_id: string | null;
  student_id: string | null;
  trial_group_id: string | null;
  trial_group: { id: string; name: string } | null;
  trial_groups: { id: string; name: string }[];
  trial_conducted_group_id: string | null;
  trial_conducted_group: { id: string; name: string } | null;
  conducted_groups: { id: string; name: string }[];
  created_at: string;
  comments: LeadComment[];
}

export interface LeadCreate {
  contact_name?: string;
  student_name?: string;
  phone?: string;
  telegram?: string;
  class_number?: number;
  education_type?: string;
  current_school?: string;
  source?: string;
  assigned_to_id?: string;
  school_location_id?: string;
}

export interface LeadUpdate {
  contact_name?: string;
  student_name?: string;
  phone?: string;
  telegram?: string;
  class_number?: number;
  education_type?: string;
  current_school?: string;
  source?: string;
  status?: LeadStatus;
  assigned_to_id?: string;
  school_location_id?: string;
}

export interface LeadCommentCreate {
  content: string;
}

// Exam Portal Sessions (управление из CRM, запись через клиентский портал)
export interface ExamTimeSlotData {
  id: string;
  date: string;
  start_time: string;
  total_seats: number;
  registered_count: number;
  available_seats: number;
}

export interface ExamPortalSession {
  id: string;
  exam_id: string;
  exam_title: string;
  school_location_id: string | null;
  school_location_name: string | null;
  is_active: boolean;
  notes: string | null;
  slots: ExamTimeSlotData[];
}

export interface ExamPortalSessionCreate {
  exam_id: string;
  school_location_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface ExamPortalSessionUpdate {
  is_active?: boolean;
  notes?: string | null;
}

export interface ExamTimeSlotCreate {
  date: string;
  start_time: string;
  total_seats: number;
}
