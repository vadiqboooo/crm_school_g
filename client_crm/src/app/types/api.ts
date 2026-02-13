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
  created_at: string;
}

// Student types
export type StudentStatus = "active" | "inactive";
export type ParentRelation = "мама" | "папа" | "бабушка" | "дедушка" | "тетя" | "дядя";
export type HistoryEventType = "added_to_db" | "added_to_group" | "removed_from_group" | "payment" | "status_change";

export interface ParentContact {
  id: string;
  student_id: string;
  name: string;
  relation: ParentRelation;
  phone: string;
  telegram_id?: string;
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

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  telegram_id?: string;
  current_school?: string;
  status: StudentStatus;
  created_at: string;
  parent_contacts: ParentContact[];
  groups: GroupInfo[];
  history: StudentHistory[];
}

export interface StudentCreate {
  first_name: string;
  last_name: string;
  phone?: string;
  telegram_id?: string;
  current_school?: string;
  status?: StudentStatus;
  parent_contacts: Array<{
    name: string;
    relation: ParentRelation;
    phone: string;
    telegram_id?: string;
  }>;
}

export interface StudentUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  telegram_id?: string;
  current_school?: string;
  status?: StudentStatus;
}

// Group types
export interface Subject {
  id: string;
  name: string;
  description?: string;
}

export interface Group {
  id: string;
  name: string;
  subject: Subject;
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
  };
  level?: string;
  schedule_day?: string;
  schedule_time?: string;
  schedule_duration?: number;
  school_location?: string;
  description?: string;
  comment?: string;
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
  school_location?: string;
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
  school_location?: string;
  description?: string;
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
