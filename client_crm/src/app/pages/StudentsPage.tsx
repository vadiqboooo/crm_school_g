import { useState, useEffect, useRef } from "react";
import { LeadsBoard } from "../components/LeadsBoard";
import { LeadDetailPage } from "../components/LeadDetailPage";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
  Check,
  Loader2,
  ArrowUp,
  FileText,
  X as CloseIcon,
  UserPlus,
  UserCheck,
  Archive,
  ArrowLeft,
  Send,
  Pencil,
  Copy,
  GraduationCap,
  Wallet,
  School,
  Building2,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { StudentPerformanceTab } from "../components/StudentPerformanceTab";
import { StudentReportsPanel } from "../components/StudentReportsPanel";
import type { Student, StudentCreate, StudentHistory, ParentRelation, WeeklyReport, GroupInfo, Schedule, Lead } from "../types/api";

const parentRelations: { value: ParentRelation; label: string }[] = [
  { value: "мама", label: "Мама" },
  { value: "папа", label: "Папа" },
  { value: "бабушка", label: "Бабушка" },
  { value: "дедушка", label: "Дедушка" },
  { value: "тетя", label: "Тетя" },
  { value: "дядя", label: "Дядя" },
];

const educationTypeConfig: Record<string, { icon: typeof School; color: string; bg: string; abbr: string }> = {
  "Школа": { icon: School, color: "text-blue-600", bg: "bg-blue-50", abbr: "Ш" },
  "Гимназия": { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50", abbr: "Г" },
  "Лицей": { icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50", abbr: "Л" },
  "СПО": { icon: Building2, color: "text-teal-600", bg: "bg-teal-50", abbr: "С" },
  "Колледж": { icon: Building2, color: "text-teal-600", bg: "bg-teal-50", abbr: "К" },
  "Университет": { icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50", abbr: "У" },
  "Другое": { icon: GraduationCap, color: "text-gray-600", bg: "bg-gray-50", abbr: "Д" },
};

// ===== NEW DESIGN COMPONENTS =====

/* Student Header Component */
function StudentHeaderComponent({
  lastName,
  firstName,
  status,
}: {
  lastName: string;
  firstName: string;
  status: string;
}) {
  const statusConfig: Record<string, { icon: typeof UserCheck; color: string; bg: string; label: string }> = {
    active: { icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50", label: "Активен" },
    inactive: { icon: Archive, color: "text-gray-400", bg: "bg-gray-100", label: "Архив" },
  };

  const cfg = statusConfig[status] || statusConfig.inactive;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
      </div>
      <h1 className="text-2xl font-bold">
        {lastName} {firstName}
      </h1>
    </div>
  );
}

/* Tab Navigation Component */
function TabNavComponent({
  tabs,
  activeTab,
  onTabChange,
  onBack,
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к списку
        </button>
      )}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Copy Button Helper */
function CopyButtonHelper({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* Info Card Component */
function InfoCardComponent({
  student,
  isEditing,
  editFormData,
  updating,
  linkCopied,
  onStartEdit,
  onCancelEdit,
  onSave,
  onShare,
  onFormChange,
}: {
  student: Student;
  isEditing: boolean;
  editFormData: Student | null;
  updating: boolean;
  linkCopied: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onShare: () => void;
  onFormChange: (data: Student) => void;
}) {
  const navigate = useNavigate();
  const hasPhone = student.phone && student.phone.length > 0;
  const hasTelegram = student.telegram_username && student.telegram_username.length > 0;

  const [groupSchedules, setGroupSchedules] = useState<Array<{ id: string; name: string; color?: string; schedules: Schedule[] }>>([]);
  useEffect(() => {
    if (!student.groups || student.groups.length === 0) return;
    Promise.all(student.groups.map((g) => api.getGroup(g.id)))
      .then((data) => setGroupSchedules(data.map((g) => ({
        id: g.id,
        name: g.name,
        color: g.subject?.color,
        schedules: g.schedules || [],
      }))))
      .catch(console.error);
  }, [student.groups]);

  const getDayAbbr = (day: string) => {
    const map: Record<string, string> = {
      "Понедельник": "Пн", "Вторник": "Вт", "Среда": "Ср",
      "Четверг": "Чт", "Пятница": "Пт", "Суббота": "Сб", "Воскресенье": "Вс",
    };
    return map[day] || day.slice(0, 2);
  };

  const calcEndTime = (start: string, minutes: number) => {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const inputCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";
  const selectCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";

  return (
    <Card className="group/card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="pt-6">
        {!isEditing ? (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Основная информация</h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{student.contract_number || "Не указан"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <button
                  onClick={onShare}
                  className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onStartEdit}
                  className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Phone + Telegram + Source */}
            <div className="flex items-center gap-5 mb-4">
              <div className="flex items-center gap-2">
                <Phone className={`w-4 h-4 ${hasPhone ? "text-foreground" : "text-muted-foreground/40"}`} />
                <span className={hasPhone ? "text-foreground" : "text-muted-foreground"}>
                  {hasPhone ? student.phone : "Не указан"}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Send className={`w-4 h-4 ${hasTelegram ? "text-sky-500" : "text-muted-foreground/40"}`} />
                <span className={hasTelegram ? "text-foreground" : "text-muted-foreground"}>
                  {hasTelegram ? `@${student.telegram_username}` : "Не указан"}
                </span>
                {hasTelegram && <CopyButtonHelper text={`@${student.telegram_username}`} />}
              </div>
              {student.source && (
                <div className="ml-auto">
                  <Badge variant="outline" className="text-xs">
                    {student.source}
                  </Badge>
                </div>
              )}
            </div>

            {/* Education */}
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <span className={student.class_number ? "" : "text-muted-foreground"}>
                {student.class_number ? `${student.class_number} класс` : "Класс не указан"}
              </span>
              {student.education_type && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span>{student.education_type}</span>
                </>
              )}
              {student.current_school && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span>{student.current_school}</span>
                </>
              )}
            </div>

            {/* Groups + Schedule */}
            {student.groups && student.groups.length > 0 && (
              <>
                <div className="border-t border-border my-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Группы и расписание</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {groupSchedules.map((gs) => (
                      <div
                        key={gs.id}
                        className="rounded-lg border border-border overflow-hidden"
                        style={{ borderLeftColor: gs.color || "#2563eb", borderLeftWidth: 3 }}
                      >
                        <div className="px-3 py-2 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/group/${gs.id}`)}
                            className="text-sm font-semibold hover:underline transition-colors text-left leading-tight"
                            style={{ color: gs.color || "#2563eb" }}
                          >
                            {gs.name}
                          </button>
                          {gs.schedules.length > 0 ? (
                            <div className="space-y-1">
                              {gs.schedules.map((s) => (
                                <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span className="font-medium text-foreground">{getDayAbbr(s.day_of_week)}</span>
                                  <span>{s.start_time.slice(0, 5)}–{calcEndTime(s.start_time, s.duration_minutes)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Нет расписания</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Placeholder cards while loading */}
                    {groupSchedules.length === 0 && student.groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-border border-l-[3px] border-l-blue-600 overflow-hidden"
                      >
                        <div className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/group/${group.id}`)}
                            className="text-sm font-semibold text-blue-600 hover:underline text-left"
                          >
                            {group.name}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Редактирование</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancelEdit}
                  className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                  disabled={updating}
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                  Отмена
                </button>
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Сохранить
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Фамилия *</label>
                  <input
                    className={inputCls}
                    value={editFormData?.last_name || ""}
                    onChange={(e) => onFormChange({ ...editFormData!, last_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Имя *</label>
                  <input
                    className={inputCls}
                    value={editFormData?.first_name || ""}
                    onChange={(e) => onFormChange({ ...editFormData!, first_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Телефон</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      className={`${inputCls} pl-9`}
                      value={editFormData?.phone || ""}
                      onChange={(e) => onFormChange({ ...editFormData!, phone: e.target.value })}
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Telegram</label>
                  <div className="relative">
                    <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      className={`${inputCls} pl-9`}
                      value={editFormData?.telegram_username || ""}
                      onChange={(e) => onFormChange({ ...editFormData!, telegram_username: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[100px_1fr_1fr] gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Класс</label>
                  <input
                    type="number"
                    min={1}
                    max={11}
                    className={inputCls}
                    value={editFormData?.class_number || ""}
                    onChange={(e) => onFormChange({ ...editFormData!, class_number: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="9"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Тип</label>
                  <select
                    className={selectCls}
                    value={editFormData?.education_type || ""}
                    onChange={(e) => onFormChange({ ...editFormData!, education_type: e.target.value as any })}
                  >
                    <option value="">Не указан</option>
                    <option value="Школа">Школа</option>
                    <option value="Гимназия">Гимназия</option>
                    <option value="Лицей">Лицей</option>
                    <option value="СПО">СПО</option>
                    <option value="Другое">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    {editFormData?.education_type === "Другое" ? "Укажите тип" : "Номер / название"}
                  </label>
                  <input
                    className={inputCls}
                    value={editFormData?.current_school || ""}
                    onChange={(e) => onFormChange({ ...editFormData!, current_school: e.target.value })}
                    placeholder={editFormData?.education_type === "Другое" ? "Введите тип учебного заведения" : "№ школы"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Статус *</label>
                  <select
                    className={selectCls}
                    value={editFormData?.status || "active"}
                    onChange={(e) => onFormChange({ ...editFormData!, status: e.target.value as any })}
                  >
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Откуда пришёл</label>
                  <select
                    className={selectCls}
                    value={editFormData?.source || ""}
                    onChange={(e) => onFormChange({ ...editFormData!, source: e.target.value as any })}
                  >
                    <option value="">Не указан</option>
                    <option value="Сайт">Сайт</option>
                    <option value="Социальные сети">Социальные сети</option>
                    <option value="Рекомендация">Рекомендация</option>
                    <option value="Реклама">Реклама</option>
                    <option value="Другое">Другое</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Номер договора</label>
                <input
                  className={inputCls}
                  value={editFormData?.contract_number || ""}
                  onChange={(e) => onFormChange({ ...editFormData!, contract_number: e.target.value })}
                  placeholder="Номер договора"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* Parent Contacts Component */
function ParentContactsComponent({
  student,
  isEditing,
  editFormData,
  updating,
  onStartEdit,
  onCancelEdit,
  onSave,
  onFormChange,
}: {
  student: Student;
  isEditing: boolean;
  editFormData: Student | null;
  updating: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onFormChange: (data: Student) => void;
}) {
  const inputCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";
  const selectCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";

  const addContact = () => {
    if (editFormData) {
      const newContact = {
        id: `temp-${Date.now()}`,
        student_id: editFormData.id,
        name: "",
        relation: "мама" as ParentRelation,
        phone: "",
        telegram_username: "",
      };
      onFormChange({
        ...editFormData,
        parent_contacts: [...editFormData.parent_contacts, newContact],
      });
    }
  };

  const removeContact = (id: string) => {
    if (editFormData) {
      onFormChange({
        ...editFormData,
        parent_contacts: editFormData.parent_contacts.filter((c) => c.id !== id),
      });
    }
  };

  const updateContact = (id: string, field: string, value: string) => {
    if (editFormData) {
      onFormChange({
        ...editFormData,
        parent_contacts: editFormData.parent_contacts.map((c) =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      });
    }
  };

  return (
    <Card className="group/card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Контакты родителей</h3>
          {!isEditing ? (
            <div className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
              <button
                onClick={onStartEdit}
                className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onCancelEdit}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                disabled={updating}
              >
                <CloseIcon className="w-3.5 h-3.5" />
                Отмена
              </button>
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                disabled={updating}
              >
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Сохранить
              </button>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="space-y-3">
            {student.parent_contacts && student.parent_contacts.length > 0 ? (
              student.parent_contacts.map((contact) => {
                const hasPhone = contact.phone && contact.phone.length > 0;
                const hasTelegram = contact.telegram_username && contact.telegram_username.length > 0;
                return (
                  <div key={contact.id} className="border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-sm text-muted-foreground">{contact.relation}</p>
                      <p>{contact.name || "Не указано"}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2">
                        <Phone className={`w-4 h-4 ${hasPhone ? "text-foreground" : "text-muted-foreground/40"}`} />
                        <span className={hasPhone ? "text-foreground" : "text-muted-foreground"}>
                          {hasPhone ? contact.phone : "Не указан"}
                        </span>
                      </div>
                      {hasTelegram && (
                        <>
                          <div className="w-px h-4 bg-border" />
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-sky-500" />
                            <span>@{contact.telegram_username}</span>
                            <CopyButtonHelper text={`@${contact.telegram_username}`} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Контакты не добавлены</p>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={addContact}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:bg-accent transition-colors text-sm mb-5"
            >
              <Plus className="w-4 h-4" />
              Добавить контакт
            </button>

            <div className="space-y-4">
              {editFormData?.parent_contacts.map((contact, index) => (
                <div key={contact.id} className="border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm">Контакт {index + 1}</p>
                    <button
                      onClick={() => removeContact(contact.id)}
                      className="p-2 text-destructive hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">ФИО *</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                        className={inputCls}
                        placeholder="Фамилия Имя Отчество"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Кто *</label>
                      <select
                        value={contact.relation}
                        onChange={(e) => updateContact(contact.id, "relation", e.target.value)}
                        className={selectCls}
                      >
                        {parentRelations.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Телефон *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                          className={`${inputCls} pl-9`}
                          placeholder="+7 (___) ___-__-__"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Telegram</label>
                      <div className="relative">
                        <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={contact.telegram_username || ""}
                          onChange={(e) => updateContact(contact.id, "telegram_username", e.target.value)}
                          className={`${inputCls} pl-9`}
                          placeholder="@username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {editFormData?.parent_contacts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет контактов. Добавьте первый контакт.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* Comments Component */
function CommentsComponent({ studentId }: { studentId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
  }, [studentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentComments(studentId);
      setComments(data);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.createStudentComment(studentId, { content: newComment.trim() });
      await loadComments();
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-semibold">Комментарии</h3>
        <span className="w-7 h-7 flex items-center justify-center bg-muted rounded-full text-sm text-muted-foreground">
          {comments.length}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-muted/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {comment.author.first_name} {comment.author.last_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground/80">{comment.content}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Комментариев пока нет</p>
        )}
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            placeholder="Написать комментарий..."
            className="flex-1 px-4 py-2.5 bg-input-background border border-border rounded-lg text-sm"
          />
          <button
            onClick={handleAddComment}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* Student Schedule Card */
function StudentScheduleCard({ groups }: { groups: GroupInfo[] }) {
  const navigate = useNavigate();
  const [groupSchedules, setGroupSchedules] = useState<Array<{ id: string; name: string; schedules: Schedule[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groups.length === 0) {
      setLoading(false);
      return;
    }
    loadSchedules();
  }, [groups]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const groupData = await Promise.all(groups.map((g) => api.getGroup(g.id)));
      setGroupSchedules(groupData.map((g) => ({ id: g.id, name: g.name, schedules: g.schedules || [] })));
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  if (groups.length === 0) return null;

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Расписание занятий</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {groupSchedules.map(({ id, name, schedules }) => (
              <div key={id} className="border border-border rounded-xl p-3">
                <button
                  onClick={() => navigate(`/group/${id}`)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors mb-2 block"
                >
                  {name}
                </button>
                {schedules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Расписание не указано</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {schedules.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">{s.day_of_week}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-sm text-slate-600">{s.start_time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== END NEW DESIGN COMPONENTS =====

export function StudentsPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const [mainTab, setMainTab] = useState<"leads" | "students">("leads");
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("info"); // Student detail tabs
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentHistory[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showReportsView, setShowReportsView] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [studentLatestReports, setStudentLatestReports] = useState<Map<string, WeeklyReport>>(new Map());

  // Create student dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState<StudentCreate>({
    first_name: "",
    last_name: "",
    phone: "",
    telegram_id: "",
    current_school: "",
    class_number: undefined,
    status: "active",
    parent_contacts: [],
  });

  // Edit mode in student card - separate for each section
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingParentContacts, setIsEditingParentContacts] = useState(false);
  const [editFormData, setEditFormData] = useState<Student | null>(null);
  const [updating, setUpdating] = useState(false);

  // Scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tableAreaRef = useRef<HTMLDivElement>(null);

  // Load students
  useEffect(() => {
    loadStudents();
  }, []);

  // Load latest reports when entering reports view
  useEffect(() => {
    if (showReportsView) {
      loadLatestReports();
    }
  }, [showReportsView]);

  // Track scroll position for "scroll to top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load student from URL parameter
  useEffect(() => {
    // Reset edit modes when switching students
    setIsEditingBasicInfo(false);
    setIsEditingParentContacts(false);
    setEditFormData(null);
    setActiveTab("info");

    if (studentId && students.length > 0) {
      const student = students.find((s) => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        loadStudentHistory(studentId);
      }
    } else if (!studentId) {
      setSelectedStudent(null);
      setStudentHistory([]);
    }
  }, [studentId, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentHistory = async (id: string) => {
    try {
      const history = await api.getStudentHistory(id);
      setStudentHistory(history);
    } catch (error) {
      console.error("Failed to load student history:", error);
    }
  };

  const loadLatestReports = async () => {
    try {
      const reportsDict = await api.getAllStudentsLatestReports();
      const reportsMap = new Map<string, WeeklyReport>();

      Object.entries(reportsDict).forEach(([studentId, report]) => {
        reportsMap.set(studentId, report);
      });

      setStudentLatestReports(reportsMap);
    } catch (error) {
      console.error("Failed to load latest reports:", error);
    }
  };

  const handleCreateStudent = async () => {
    try {
      setCreating(true);
      await api.createStudent(newStudent);
      await loadStudents();
      setCreateDialogOpen(false);
      setNewStudent({
        first_name: "",
        last_name: "",
        phone: "",
        telegram_id: "",
        current_school: "",
        class_number: undefined,
        status: "active",
        parent_contacts: [],
      });
    } catch (error) {
      console.error("Failed to create student:", error);
      toast.error("Ошибка при создании студента");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить студента?")) return;

    try {
      await api.deleteStudent(id);
      await loadStudents();
      if (selectedStudent?.id === id) {
        navigate("/students");
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
      toast.error("Ошибка при удалении студента");
    }
  };

  const handleStartEditBasicInfo = () => {
    if (selectedStudent) {
      setEditFormData({ ...selectedStudent });
      setIsEditingBasicInfo(true);
    }
  };

  const handleStartEditParentContacts = () => {
    if (selectedStudent) {
      setEditFormData({ ...selectedStudent });
      setIsEditingParentContacts(true);
    }
  };

  const handleCancelEditBasicInfo = () => {
    setIsEditingBasicInfo(false);
    setEditFormData(null);
  };

  const handleCancelEditParentContacts = () => {
    setIsEditingParentContacts(false);
    setEditFormData(null);
  };

  const handleSaveBasicInfo = async () => {
    if (!editFormData) return;

    try {
      setUpdating(true);
      const updatedStudent = await api.updateStudent(editFormData.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone: editFormData.phone || undefined,
        telegram_username: editFormData.telegram_username || undefined,
        current_school: editFormData.current_school || undefined,
        class_number: editFormData.class_number || undefined,
        status: editFormData.status,
        source: editFormData.source || undefined,
        education_type: editFormData.education_type || undefined,
        contract_number: editFormData.contract_number || undefined,
        parent_contacts: editFormData.parent_contacts.map((contact) => ({
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          telegram_username: contact.telegram_username || undefined,
        })),
      });

      // Update students list without reloading
      setStudents((prev) =>
        prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );

      // Update selected student
      setSelectedStudent(updatedStudent);

      // Reload history to show the new entry
      if (updatedStudent.history) {
        setStudentHistory(updatedStudent.history);
      }

      setIsEditingBasicInfo(false);
      setEditFormData(null);
      toast.success("Изменения сохранены");
    } catch (error) {
      console.error("Failed to update student:", error);
      toast.error("Ошибка при обновлении студента");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveParentContacts = async () => {
    if (!editFormData) return;

    try {
      setUpdating(true);
      const updatedStudent = await api.updateStudent(editFormData.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone: editFormData.phone || undefined,
        telegram_username: editFormData.telegram_username || undefined,
        current_school: editFormData.current_school || undefined,
        class_number: editFormData.class_number || undefined,
        status: editFormData.status,
        source: editFormData.source || undefined,
        education_type: editFormData.education_type || undefined,
        contract_number: editFormData.contract_number || undefined,
        parent_contacts: editFormData.parent_contacts.map((contact) => ({
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          telegram_username: contact.telegram_username || undefined,
        })),
      });

      // Update students list without reloading
      setStudents((prev) =>
        prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );

      // Update selected student
      setSelectedStudent(updatedStudent);

      // Reload history to show the new entry
      if (updatedStudent.history) {
        setStudentHistory(updatedStudent.history);
      }

      setIsEditingParentContacts(false);
      setEditFormData(null);
      toast.success("Контакты родителей сохранены");
    } catch (error) {
      console.error("Failed to update student:", error);
      toast.error("Ошибка при обновлении контактов");
    } finally {
      setUpdating(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (student: Student) => {
    navigate(`/students/${student.id}`);
  };

  const handleClosePanel = () => {
    navigate("/students");
  };

  const handleShareLink = () => {
    if (selectedStudent) {
      const link = `${window.location.origin}/students/${selectedStudent.id}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const scrollToTop = () => {
    if (tableAreaRef.current) {
      tableAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case "added_to_db":
      case "added_to_group":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "removed_from_group":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "payment":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "status_change":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "parent_feedback_added":
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case "parent_feedback_deleted":
        return <MessageCircle className="w-4 h-4 text-red-600" />;
      case "student_info_updated":
        return <Edit className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const tabStrip = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["leads", "students"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm transition-all ${
              mainTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "leads" ? "Лиды" : "Студенты"}
          </button>
        ))}
      </div>
      <Button
        className="bg-blue-600 hover:bg-blue-700 gap-2"
        onClick={() => {
          if (mainTab === "leads") setCreateLeadOpen(true);
          else setCreateDialogOpen(true);
        }}
      >
        <Plus className="w-4 h-4" />
        Добавить клиента
      </Button>
    </div>
  );

  return (
    <>
      {!selectedStudent && mainTab === "leads" && selectedLeadForDetail ? (
        <LeadDetailPage
          lead={selectedLeadForDetail}
          onBack={() => setSelectedLeadForDetail(null)}
          onConverted={() => { setSelectedLeadForDetail(null); }}
        />
      ) : !selectedStudent && mainTab === "leads" ? (
        <div className="h-screen flex flex-col bg-background">
          <div className="shrink-0 px-6 pt-6">
            {tabStrip}
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
            <LeadsBoard
              onLeadSelect={(lead) => setSelectedLeadForDetail(lead)}
              externalCreateOpen={createLeadOpen}
              onExternalCreateClose={() => setCreateLeadOpen(false)}
            />
          </div>
        </div>
      ) : !selectedStudent ? (
        <div className="h-screen flex flex-col bg-background">
          {/* 1. FIXED PAGE HEADER (Title + Filters) */}
          <div className="shrink-0">
            <div className="max-w-full px-6 pt-6">
            {tabStrip}
            {/* Title Block */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Студенты</h1>
                <p className="text-slate-600 mt-1">
                  Управление студентами и их данными
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showReportsView ? "default" : "outline"}
                  className={showReportsView ? "bg-blue-600 hover:bg-blue-700 gap-2" : "gap-2"}
                  onClick={() => setShowReportsView(!showReportsView)}
                >
                  {showReportsView ? (
                    <>
                      <CloseIcon className="w-4 h-4" />
                      Закрыть отчеты
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Отчеты
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filter Block */}
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Поиск по имени..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="active">Активные</SelectItem>
                      <SelectItem value="inactive">Неактивные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* 2. TABLE AREA (Scrollable container with sticky header) */}
          <div ref={tableAreaRef} className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-full px-6 pb-4">
              <div className={`transition-all duration-500 ease-out ${showReportsView ? 'grid grid-cols-2 gap-0' : ''}`}>
                {/* Students Table with sticky header */}
                <div className={`bg-card border border-border rounded-xl ${showReportsView ? '' : ''}`}>
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      {!showReportsView && (
                        <>
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '8%' }} />
                        </>
                      )}
                      {showReportsView && (
                        <col style={{ width: '12%' }} />
                      )}
                      <col style={{ width: '6%' }} />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-card border-b-2 border-border">
                      <tr>
                        <th className="text-left px-5 py-3 text-sm text-muted-foreground font-semibold">ФИО</th>
                        {!showReportsView && (
                          <>
                            <th className="text-left px-3 py-3 text-sm text-muted-foreground font-semibold">Уч. заведение</th>
                            <th className="text-center px-3 py-3 text-sm text-muted-foreground font-semibold">Группы</th>
                            <th className="text-left px-3 py-3 text-sm text-muted-foreground font-semibold">Телефон</th>
                            <th className="text-left px-3 py-3 text-sm text-muted-foreground font-semibold">Родители</th>
                            <th className="text-left px-3 py-3 text-sm text-muted-foreground font-semibold">Telegram</th>
                            <th className="text-left px-3 py-3 text-sm text-muted-foreground font-semibold">Статус</th>
                          </>
                        )}
                        {showReportsView && (
                          <th className="text-center px-3 py-3 text-sm text-muted-foreground font-semibold">Отчет</th>
                        )}
                        <th className="text-center px-3 py-3 text-sm text-muted-foreground font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            className={`border-b border-border last:border-b-0 transition-colors cursor-pointer ${
                              showReportsView && selectedStudentForReport?.id === student.id
                                ? "bg-blue-50 hover:bg-blue-100"
                                : "hover:bg-accent/40"
                            }`}
                            onClick={() => showReportsView ? setSelectedStudentForReport(student) : handleViewDetails(student)}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                  {student.last_name.charAt(0)}
                                  {student.first_name.charAt(0)}
                                </div>
                                <div className="font-medium text-slate-900 truncate">
                                  {student.last_name} {student.first_name}
                                </div>
                              </div>
                            </td>
                            {!showReportsView && (
                              <>
                                <td className="px-3 py-3 text-sm">
                                  {student.education_type || student.current_school || student.class_number ? (
                                    <div className="flex items-center gap-1.5">
                                      {(() => {
                                        const cfg = student.education_type ? educationTypeConfig[student.education_type] : null;
                                        const EduIcon = cfg?.icon || School;
                                        return (
                                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${cfg?.bg || "bg-gray-50"}`}>
                                            <EduIcon className={`w-3.5 h-3.5 ${cfg?.color || "text-gray-400"}`} />
                                          </div>
                                        );
                                      })()}
                                      <span className="truncate">
                                        {student.current_school ? `${student.current_school}` : student.education_type || ""}
                                        {student.class_number ? `, ${student.class_number} кл` : ""}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  {student.groups && student.groups.length > 0 ? (
                                    <HoverCard>
                                      <HoverCardTrigger asChild>
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs cursor-pointer hover:bg-blue-200 transition-colors">
                                          {student.groups.length}
                                        </div>
                                      </HoverCardTrigger>
                                      <HoverCardContent className="w-64" align="start">
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-sm text-slate-900">
                                            Группы студента
                                          </h4>
                                          <div className="flex flex-col gap-2">
                                            {student.groups.map((group) => (
                                              <div
                                                key={group.id}
                                                className="flex items-center gap-2 text-sm"
                                              >
                                                <Badge className="bg-blue-600">
                                                  {group.name}
                                                </Badge>
                                                {group.school_location && (
                                                  <span className="text-xs text-slate-500">
                                                    {group.school_location}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </HoverCardContent>
                                    </HoverCard>
                                  ) : (
                                    <span className="text-sm text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  {student.phone ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-900">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {student.phone}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-400">Нет</span>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="space-y-1">
                                    {student.parent_contacts.length > 0 ? (
                                      student.parent_contacts.slice(0, 1).map((parent) => (
                                        <div
                                          key={parent.id}
                                          className="flex items-center gap-2 text-sm truncate"
                                        >
                                          <Phone className="w-3 h-3 text-slate-400" />
                                          <span className="text-slate-600 text-xs">
                                            {parent.phone}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            ({parent.relation})
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        Нет контактов
                                      </span>
                                    )}
                                    {student.parent_contacts.length > 1 && (
                                      <div className="text-[10px] text-blue-600">
                                        + еще {student.parent_contacts.length - 1}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    {student.telegram_id ? (
                                      <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-[10px] gap-1 px-1 py-0">
                                        <MessageCircle className="w-3 h-3" />
                                        Привязан
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-slate-400">Нет</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge
                                    className={`text-[10px] px-1 py-0 ${
                                      student.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-slate-100 text-slate-800"
                                    }`}
                                  >
                                    {student.status === "active"
                                      ? "Активен"
                                      : "Неактивен"}
                                  </Badge>
                                </td>
                              </>
                            )}
                            {showReportsView && (
                              <td className="py-2 text-center w-32">
                                {(() => {
                                  const latestReport = studentLatestReports.get(student.id);
                                  if (latestReport) {
                                    return latestReport.is_approved ? (
                                      <Check className="w-5 h-5 text-green-600 inline-block" />
                                    ) : (
                                      <CloseIcon className="w-5 h-5 text-slate-400 inline-block" />
                                    );
                                  }
                                  return <span className="text-xs text-slate-400">Нет</span>;
                                })()}
                              </td>
                            )}
                            <td className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="gap-2 text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStudent(student.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                {/* Reports Panel - Slides in from right */}
                {showReportsView && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <StudentReportsPanel selectedStudent={selectedStudentForReport} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Student Detail View - New Design */
        <div className="container mx-auto px-6 py-8">
        <div className="animate-in slide-in-from-right duration-300 max-w-[1120px] mx-auto">
          {/* Header with Status Icon */}
          <StudentHeaderComponent
            lastName={selectedStudent.last_name}
            firstName={selectedStudent.first_name}
            status={selectedStudent.status}
          />

          {/* Tab Navigation */}
          <div className="mt-5 mb-6">
            <TabNavComponent
              tabs={[
                { id: "info", label: "Информация" },
                ...(isAdmin || isManager ? [{ id: "performance", label: "Успеваемость" }] : []),
                { id: "history", label: "История" }
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onBack={handleClosePanel}
            />
          </div>

          {/* Tab Content */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              {/* Left column: Info + Parents */}
              <div className="space-y-6">
                <InfoCardComponent
                  student={selectedStudent}
                  isEditing={isEditingBasicInfo}
                  editFormData={editFormData}
                  updating={updating}
                  linkCopied={linkCopied}
                  onStartEdit={handleStartEditBasicInfo}
                  onCancelEdit={handleCancelEditBasicInfo}
                  onSave={handleSaveBasicInfo}
                  onShare={handleShareLink}
                  onFormChange={setEditFormData}
                />
                <ParentContactsComponent
                  student={selectedStudent}
                  isEditing={isEditingParentContacts}
                  editFormData={editFormData}
                  updating={updating}
                  onStartEdit={handleStartEditParentContacts}
                  onCancelEdit={handleCancelEditParentContacts}
                  onSave={handleSaveParentContacts}
                  onFormChange={setEditFormData}
                />
              </div>

              {/* Right column: Comments chat */}
              <div className="lg:h-[calc(100vh-220px)] lg:sticky lg:top-6">
                <CommentsComponent studentId={selectedStudent.id} />
              </div>
            </div>
          )}

          {activeTab === "performance" && (isAdmin || isManager) && (
            <StudentPerformanceTab
              studentId={selectedStudent.id}
              studentGroups={selectedStudent.groups}
              studentName={`${selectedStudent.last_name} ${selectedStudent.first_name}`}
            />
          )}

          {activeTab === "history" && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">История</h3>
                <div className="space-y-3">
                  {studentHistory && studentHistory.length > 0 ? (
                    studentHistory
                      .slice()
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((entry) => (
                        <div key={entry.id} className="border-l-2 border-blue-500 pl-4 py-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{entry.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(entry.created_at).toLocaleString('ru-RU', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 text-sm">История пуста</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      )}

      {/* Create Student Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить нового студента</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Имя *</Label><Input value={newStudent.first_name} onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})}/></div>
              <div className="space-y-2"><Label>Фамилия *</Label><Input value={newStudent.last_name} onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Телефон</Label><Input value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}/></div>
              <div className="space-y-2"><Label>Telegram ID</Label><Input value={newStudent.telegram_id} onChange={(e) => setNewStudent({...newStudent, telegram_id: e.target.value})}/></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateStudent} disabled={creating} className="bg-blue-600 hover:bg-blue-700">Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scroll to top button */}
      {!selectedStudent && mainTab === "students" && (
        <Button className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50 transition-all duration-300" onClick={scrollToTop} title="Наверх"><ArrowUp className="w-5 h-5" /></Button>
      )}
    </>
  );
}
