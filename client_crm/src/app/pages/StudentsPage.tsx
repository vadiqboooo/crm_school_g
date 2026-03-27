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
  TrendingUp,
  TrendingDown,
  CreditCard,
  KeyRound,
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
import { useParams, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { StudentPerformanceTab } from "../components/StudentPerformanceTab";
import { StudentReportsPanel } from "../components/StudentReportsPanel";
import type { Student, StudentCreate, StudentHistory, ParentRelation, WeeklyReport, GroupInfo, Schedule, Lead, SubscriptionPlan, Lesson, AppUser, AppUserCreate } from "../types/api";

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
  backLabel = "Назад к списку",
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
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
  studentHistory,
  isEditing,
  editFormData,
  updating,
  linkCopied,
  onStartEdit,
  onCancelEdit,
  onSave,
  onShare,
  onFormChange,
  onOpenPayment,
  onOpenSubscription,
  onRetroactiveDeduction,
  retroactiveLoading,
  onGenerateCredentials,
  generatingCreds,
}: {
  student: Student;
  studentHistory: StudentHistory[];
  isEditing: boolean;
  editFormData: Student | null;
  updating: boolean;
  linkCopied: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onShare: () => void;
  onFormChange: (data: Student) => void;
  onOpenPayment: () => void;
  onOpenSubscription: () => void;
  onRetroactiveDeduction: () => void;
  retroactiveLoading?: boolean;
  onGenerateCredentials: () => void;
  generatingCreds?: boolean;
}) {
  const navigate = useNavigate();
  const hasPhone = student.phone && student.phone.length > 0;
  const hasTelegram = student.telegram_username && student.telegram_username.length > 0;

  const [groupSchedules, setGroupSchedules] = useState<Array<{ id: string; name: string; color?: string; schedules: Schedule[] }>>([]);
  const [groupLessonsMap, setGroupLessonsMap] = useState<Record<string, Lesson[]>>({});

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

  useEffect(() => {
    if (!student.groups || student.groups.length === 0) return;
    Promise.all(student.groups.map((g) => api.getLessons(g.id).then((lessons) => ({ groupId: g.id, lessons }))))
      .then((results) => {
        const map: Record<string, Lesson[]> = {};
        results.forEach((r) => { map[r.groupId] = r.lessons; });
        setGroupLessonsMap(map);
      })
      .catch(console.error);
  }, [student.groups]);

  const getDayAbbr = (day: string) => {
    const map: Record<string, string> = {
      "Понедельник": "Пн", "Вторник": "Вт", "Среда": "Ср",
      "Четверг": "Чт", "Пятница": "Пт", "Суббота": "Сб", "Воскресенье": "Вс",
    };
    return map[day] || day.slice(0, 2);
  };

  const getMonthAbbr = (m: number) => ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][m];

  const computeAllGroupTiles = (): Array<{ lesson: Lesson; groupId: string; groupColor?: string; color: "green" | "red" | "blue" | "gray" }> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const nextMonth = (today.getMonth() + 1) % 12;
    const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();

    // Merge all groups' lessons
    const allLessons: Array<{ lesson: Lesson; groupId: string; groupColor?: string }> = [];
    groupSchedules.forEach((gs) => {
      (groupLessonsMap[gs.id] ?? []).forEach((l) => {
        allLessons.push({ lesson: l, groupId: gs.id, groupColor: gs.color });
      });
    });

    const sorted = allLessons
      .filter(({ lesson }) => {
        const d = new Date(lesson.date);
        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
        const nextMonthEnd = new Date(nextMonthYear, nextMonth + 1, 0);
        return d >= lastMonthStart && d <= nextMonthEnd;
      })
      .sort((a, b) => a.lesson.date.localeCompare(b.lesson.date));

    const lastMonthItems = sorted.filter(({ lesson }) => {
      const d = new Date(lesson.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).slice(-5);
    const currentMonthItems = sorted.filter(({ lesson }) => {
      const d = new Date(lesson.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const nextMonthItems = sorted.filter(({ lesson }) => {
      const d = new Date(lesson.date); return d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
    }).slice(0, 5);

    const visible = [...lastMonthItems, ...currentMonthItems, ...nextMonthItems];

    const deductedDates = new Set(
      studentHistory
        .filter((h) => h.event_type === "lesson_deduction")
        .map((h) => { const m = h.description.match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; })
        .filter(Boolean) as string[]
    );

    const hasSubscription = !!student.subscription_plan;

    return visible.map(({ lesson, groupId, groupColor }) => {
      const lessonDate = new Date(lesson.date);
      lessonDate.setHours(0, 0, 0, 0);
      let color: "green" | "red" | "blue" | "gray";

      if (lesson.status === "conducted") {
        color = deductedDates.has(lesson.date) ? "green" : "red";
      } else if (lessonDate >= today) {
        // Blue if student has a subscription (deduction will happen regardless of balance)
        color = hasSubscription ? "blue" : "gray";
      } else {
        color = "gray";
      }
      return { lesson, groupId, groupColor, color };
    });
  };

  const tileColorClass = (color: "green" | "red" | "blue" | "gray") => {
    switch (color) {
      case "green": return "bg-emerald-500 text-white shadow-sm";
      case "red":   return "bg-red-400 text-white shadow-sm";
      case "blue":  return "bg-blue-500 text-white shadow-sm";
      case "gray":  return "bg-slate-200 text-slate-500 shadow-sm";
    }
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
            {/* Header */}
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
                  title="Скопировать ссылку"
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onStartEdit}
                  className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  title="Редактировать"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenSubscription}
                  className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  title="Назначить абонемент"
                >
                  <CreditCard className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Two-column: left = contacts+education, right = source+balance */}
            <div className="flex gap-4 mb-4">
              {/* Left */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className={`w-4 h-4 ${hasPhone ? "text-foreground" : "text-muted-foreground/40"}`} />
                    <span className={hasPhone ? "text-foreground text-sm" : "text-muted-foreground text-sm"}>
                      {hasPhone ? student.phone : "Не указан"}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-2">
                    <Send className={`w-4 h-4 ${hasTelegram ? "text-sky-500" : "text-muted-foreground/40"}`} />
                    <span className={hasTelegram ? "text-foreground text-sm" : "text-muted-foreground text-sm"}>
                      {hasTelegram ? `@${student.telegram_username}` : "Не указан"}
                    </span>
                    {hasTelegram && <CopyButtonHelper text={`@${student.telegram_username}`} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
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
              </div>

              {/* Right: source + balance */}
              <div className="flex flex-col items-end gap-2 min-w-[120px]">
                {student.source && (
                  <Badge variant="outline" className="text-xs">
                    {student.source}
                  </Badge>
                )}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Баланс</p>
                  <p className={`text-2xl font-bold tracking-tight leading-tight ${(student.balance ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {(student.balance ?? 0).toLocaleString("ru-RU")} ₽
                  </p>
                  {student.subscription_plan ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs font-semibold text-slate-700">{student.subscription_plan.name}</p>
                      {(student.subscription_plan.valid_from || student.subscription_plan.valid_until) && (
                        <p className="text-xs text-slate-500">
                          {student.subscription_plan.valid_from
                            ? new Date(student.subscription_plan.valid_from).toLocaleDateString("ru-RU")
                            : "∞"}
                          {" — "}
                          {student.subscription_plan.valid_until
                            ? new Date(student.subscription_plan.valid_until).toLocaleDateString("ru-RU")
                            : "∞"}
                        </p>
                      )}
                      {student.lessons_remaining !== null && student.lessons_remaining !== undefined && (
                        student.lessons_remaining > 0 ? (
                          <p className="text-xs text-emerald-600 font-medium">{student.lessons_remaining} ур. оплачено</p>
                        ) : student.lessons_remaining === 0 ? (
                          <p className="text-xs text-orange-500 font-medium">Пополните баланс</p>
                        ) : (
                          <p className="text-xs text-red-500 font-medium">Долг: {Math.abs(student.lessons_remaining)} ур.</p>
                        )
                      )}
                    </div>
                  ) : (student.groups && student.groups.length > 0) ? (
                    <p className="text-xs text-orange-500 font-semibold mt-1">⚠ Нет абонемента</p>
                  ) : null}
                  {/* Active discount badge */}
                  {(() => {
                    if (!student.discount_type || !student.discount_value) return null;
                    const today = new Date().toISOString().slice(0, 10);
                    const from = student.discount_valid_from;
                    const until = student.discount_valid_until;
                    const active = (!from || today >= from) && (!until || today <= until);
                    if (!active) return null;
                    return (
                      <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs font-semibold">
                        🏷 {student.discount_type === "percent"
                          ? `−${student.discount_value}%`
                          : `−${(student.discount_value ?? 0).toLocaleString("ru-RU")} ₽`}
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={onOpenPayment}
                  className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Wallet className="w-3 h-3" />
                  Оплата
                </button>
              </div>
            </div>

            {/* Groups + Schedule */}
            {student.groups && student.groups.length > 0 && (
              <>
                <div className="border-t border-border my-3" />
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
                            onClick={() => navigate(`/group/${gs.id}`, { state: { from: "student", studentId: student.id } })}
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
                    {groupSchedules.length === 0 && student.groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-border border-l-[3px] border-l-blue-600 overflow-hidden"
                      >
                        <div className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/group/${group.id}`, { state: { from: "student", studentId: student.id } })}
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

            {/* Unified lesson tiles across all groups */}
            {(() => {
              const allTiles = computeAllGroupTiles();
              if (allTiles.length === 0) return null;
              const redCount = allTiles.filter((t) => t.color === "red").length;
              const canRetroactive = redCount > 0 && !!student.subscription_plan;
              return (
                <div className="mt-3 space-y-2">
                  {canRetroactive && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                      <span className="text-xs text-red-600 flex-1">
                        {redCount} {redCount === 1 ? "урок проведён" : redCount < 5 ? "урока проведено" : "уроков проведено"} без списания
                      </span>
                      <button
                        onClick={onRetroactiveDeduction}
                        disabled={retroactiveLoading}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                      >
                        {retroactiveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Списать долг
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {allTiles.map((tile) => {
                      const d = new Date(tile.lesson.date);
                      return (
                        <button
                          key={tile.lesson.id}
                          type="button"
                          onClick={() => navigate(`/group/${tile.groupId}`, { state: { from: "student", studentId: student.id } })}
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${tileColorClass(tile.color)}`}
                          title={`${tile.lesson.date} — ${tile.color === "green" ? "Проведён, оплачен" : tile.color === "red" ? "Проведён, не оплачен" : tile.color === "blue" ? "Баланс покроет" : "Баланса не хватит"}`}
                        >
                          <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                          <span className="text-[10px] leading-none opacity-70 mt-0.5">{getMonthAbbr(d.getMonth())}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Portal credentials */}
            <div className="border-t border-border mt-3 pt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">Портал:</span>
                {student.portal_login ? (
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate">{student.portal_login}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">нет доступа</span>
                )}
              </div>
              <button
                onClick={onGenerateCredentials}
                disabled={generatingCreds}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {generatingCreds ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                {student.portal_login ? "Сбросить пароль" : "Создать доступ"}
              </button>
            </div>
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

              {/* Discount */}
              <div className="border-t border-border pt-4 space-y-3">
                <label className="text-sm font-medium block">Скидка</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Тип</label>
                    <select
                      className={selectCls}
                      value={editFormData?.discount_type || ""}
                      onChange={(e) => onFormChange({ ...editFormData!, discount_type: e.target.value as any || null })}
                    >
                      <option value="">Нет скидки</option>
                      <option value="fixed">Фиксированная (₽)</option>
                      <option value="percent">Процентная (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      {editFormData?.discount_type === "percent" ? "Процент (%)" : "Сумма (₽)"}
                    </label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      max={editFormData?.discount_type === "percent" ? 100 : undefined}
                      disabled={!editFormData?.discount_type}
                      value={editFormData?.discount_value ?? ""}
                      onChange={(e) => onFormChange({ ...editFormData!, discount_value: parseFloat(e.target.value) || null })}
                      placeholder={editFormData?.discount_type === "percent" ? "10" : "500"}
                    />
                  </div>
                </div>
                {editFormData?.discount_type && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Действует с</label>
                      <input
                        className={inputCls}
                        type="date"
                        value={editFormData?.discount_valid_from || ""}
                        onChange={(e) => onFormChange({ ...editFormData!, discount_valid_from: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Действует до</label>
                      <input
                        className={inputCls}
                        type="date"
                        value={editFormData?.discount_valid_until || ""}
                        onChange={(e) => onFormChange({ ...editFormData!, discount_valid_until: e.target.value || null })}
                      />
                    </div>
                  </div>
                )}
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
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const [mainTab, setMainTab] = useState<"leads" | "students" | "archive" | "app_users">("leads");

  // App Users state
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [appUserSearch, setAppUserSearch] = useState("");
  const [appUserGroupFilter, setAppUserGroupFilter] = useState<string>("all");
  const [createAppUserOpen, setCreateAppUserOpen] = useState(false);
  const [newAppUser, setNewAppUser] = useState<AppUserCreate>({ display_name: "", login: "", password: "" });
  const [creatingAppUser, setCreatingAppUser] = useState(false);
  const [linkStudentDialogOpen, setLinkStudentDialogOpen] = useState(false);
  const [linkingAppUserId, setLinkingAppUserId] = useState<string | null>(null);
  const [linkStudentSearch, setLinkStudentSearch] = useState("");
  const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false);
  const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState("");
  const [resettingPwd, setResettingPwd] = useState(false);

  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");
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

  // Create dialogs
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
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

  // Payment & subscription dialogs
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "card">("cash");
  const [savingPayment, setSavingPayment] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("none");
  const [savingSubscription, setSavingSubscription] = useState(false);

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

  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);

  const loadArchivedLeads = async () => {
    try {
      setArchiveLoading(true);
      const [leadsData, studentsData] = await Promise.all([
        api.getLeads(),
        api.getStudents(),
      ]);
      setArchivedLeads(leadsData.filter((l) => l.status === "archived"));
      setArchivedStudents(studentsData.filter((s) => s.status === "inactive"));
    } catch (error) {
      console.error("Failed to load archive:", error);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === "archive") loadArchivedLeads();
    if (mainTab === "app_users") {
      setAppUserGroupFilter("all");
      setAppUsersLoading(true);
      api.getAppUsers().then(setAppUsers).catch(console.error).finally(() => setAppUsersLoading(false));
    }
  }, [mainTab]);

  const handleRestoreStudent = async (id: string) => {
    try {
      await api.restoreStudent(id);
      setArchivedStudents((prev) => prev.filter((s) => s.id !== id));
      // Reload fresh data so groups/comments are up to date
      api.getStudents().then(setStudents).catch(console.error);
      toast.success("Студент восстановлен");
    } catch {
      toast.error("Ошибка при восстановлении");
    }
  };

  const handleRestoreLead = async (id: string) => {
    try {
      await api.restoreLead(id);
      setArchivedLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success("Лид восстановлен");
    } catch {
      toast.error("Ошибка при восстановлении");
    }
  };

  const handlePermanentDeleteStudent = async (id: string) => {
    if (!confirm("Удалить студента навсегда? Это действие нельзя отменить.")) return;
    try {
      await api.permanentDeleteStudent(id);
      setArchivedStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Студент удалён");
    } catch {
      toast.error("Ошибка при удалении");
    }
  };

  const handlePermanentDeleteLead = async (id: string) => {
    if (!confirm("Удалить лид навсегда? Это действие нельзя отменить.")) return;
    try {
      await api.permanentDeleteLead(id);
      setArchivedLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success("Лид удалён");
    } catch {
      toast.error("Ошибка при удалении");
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

  const handleOpenPaymentDialog = () => {
    setPaymentAmount("");
    setPaymentDescription("");
    setPaymentType("cash");
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedStudent || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      setSavingPayment(true);
      const typeLabel = paymentType === "cash" ? "наличные" : "безналичный";
      const descParts = [typeLabel, paymentDescription].filter(Boolean).join(", ");
      const updated = await api.addStudentPayment(selectedStudent.id, amount, descParts || undefined);
      setSelectedStudent(updated);
      setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      await loadStudentHistory(selectedStudent.id);
      setPaymentDialogOpen(false);
      toast.success("Оплата добавлена");
    } catch {
      toast.error("Ошибка при добавлении оплаты");
    } finally {
      setSavingPayment(false);
    }
  };

  const [retroactiveLoading, setRetroactiveLoading] = useState(false);
  const handleRetroactiveDeduction = async () => {
    if (!selectedStudent) return;
    try {
      setRetroactiveLoading(true);
      const updated = await api.retroactiveDeduction(selectedStudent.id);
      setSelectedStudent(updated);
      setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      // Refresh history
      const hist = await api.getStudentHistory(selectedStudent.id);
      setStudentHistory(hist);
      toast.success("Долг за прошлые уроки списан");
    } catch {
      toast.error("Ошибка при списании");
    } finally {
      setRetroactiveLoading(false);
    }
  };

  const [credsDialogOpen, setCredsDialogOpen] = useState(false);
  const [credsResult, setCredsResult] = useState<{ login: string; password: string } | null>(null);
  const [generatingCreds, setGeneratingCreds] = useState(false);

  const handleGenerateCredentials = async () => {
    if (!selectedStudent) return;
    try {
      setGeneratingCreds(true);
      const result = await api.generatePortalCredentials(selectedStudent.id);
      setCredsResult({ login: result.portal_login, password: result.plain_password });
      // Update student in state so portal_login shows immediately
      const updated = { ...selectedStudent, portal_login: result.portal_login };
      setSelectedStudent(updated as typeof selectedStudent);
      setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setCredsDialogOpen(true);
    } catch {
      toast.error("Ошибка при создании учётных данных");
    } finally {
      setGeneratingCreds(false);
    }
  };

  const handleOpenSubscriptionDialog = async () => {
    try {
      const plans = await api.getSubscriptionPlans();
      setSubscriptionPlans(plans);
      setSelectedPlanId(selectedStudent?.subscription_plan?.id ?? "none");
      setSubscriptionDialogOpen(true);
    } catch {
      toast.error("Ошибка при загрузке абонементов");
    }
  };

  const handleSaveSubscription = async () => {
    if (!selectedStudent) return;
    try {
      setSavingSubscription(true);
      const planId = selectedPlanId === "none" ? null : selectedPlanId;
      const updated = await api.setStudentSubscription(selectedStudent.id, planId);
      setSelectedStudent(updated);
      setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setSubscriptionDialogOpen(false);
      toast.success("Абонемент обновлён");
    } catch {
      toast.error("Ошибка при обновлении абонемента");
    } finally {
      setSavingSubscription(false);
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
    if (!confirm("Вы уверены, что хотите архивировать студента?")) return;

    try {
      await api.deleteStudent(id);
      const student = students.find((s) => s.id === id);
      if (student) {
        const archived = { ...student, status: "inactive" as const };
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setArchivedStudents((prev) => [...prev, archived]);
      }
      if (selectedStudent?.id === id) {
        navigate("/students");
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
      toast.error("Ошибка при архивировании студента");
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
        discount_type: editFormData.discount_type || null,
        discount_value: editFormData.discount_value ?? null,
        discount_valid_from: editFormData.discount_valid_from || null,
        discount_valid_until: editFormData.discount_valid_until || null,
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
    const state = location.state as { from?: string; groupId?: string; lessonId?: string } | null;
    if (state?.from === "lesson" && state.groupId) {
      // Came from a lesson — go back to group and reopen that lesson
      navigate(`/group/${state.groupId}`, { state: { openLessonId: state.lessonId } });
    } else if (state?.from === "group" && state.groupId) {
      // Came from group info tab
      navigate(`/group/${state.groupId}`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/students");
    }
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
      case "balance_replenishment":
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case "lesson_deduction":
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
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
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const tabLabels: Record<string, string> = { leads: "Лиды", students: "Студенты", archive: "Архив", app_users: "Пользователи приложения" };

  const tabStrip = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["leads", "students", "archive", "app_users"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm transition-all ${
              mainTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      {mainTab !== "archive" && (
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => {
            if (mainTab === "leads") setCreateLeadOpen(true);
            else if (mainTab === "app_users") setCreateAppUserOpen(true);
            else setCreateDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {mainTab === "app_users" ? "Добавить пользователя" : "Добавить клиента"}
        </Button>
      )}
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
      ) : !selectedStudent && mainTab === "app_users" ? (
        <div className="h-screen flex flex-col bg-background">
          <div className="shrink-0 px-6 pt-6">
            {tabStrip}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или логину..."
                  value={appUserSearch}
                  onChange={(e) => setAppUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={appUserGroupFilter} onValueChange={setAppUserGroupFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Все группы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все группы</SelectItem>
                  {Array.from(
                    new Map(
                      students.flatMap((s) => s.groups.map((g) => [g.id, g.name]))
                    ).entries()
                  )
                    .sort((a, b) => a[1].localeCompare(b[1], "ru"))
                    .map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
            {appUsersLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Студент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appUsers
                    .filter((u) => {
                      if (appUserSearch && !u.display_name.toLowerCase().includes(appUserSearch.toLowerCase()) && !u.login.toLowerCase().includes(appUserSearch.toLowerCase())) return false;
                      if (appUserGroupFilter !== "all") {
                        const student = u.student_id ? students.find((s) => s.id === u.student_id) : null;
                        if (!student?.groups.some((g) => g.id === appUserGroupFilter)) return false;
                      }
                      return true;
                    })
                    .map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.display_name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{u.login}</TableCell>
                        <TableCell>
                          {u.student_name ? (
                            <span className="text-sm text-blue-600">{u.student_name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Не привязан</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "default" : "secondary"}>
                            {u.is_active ? "Активен" : "Неактивен"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setLinkingAppUserId(u.id);
                                setLinkStudentDialogOpen(true);
                              }}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                {u.student_id ? "Изменить студента" : "Привязать студента"}
                              </DropdownMenuItem>
                              {u.student_id && (
                                <DropdownMenuItem onClick={async () => {
                                  await api.unlinkStudentFromAppUser(u.id);
                                  setAppUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, student_id: null, student_name: null } : x));
                                  toast.success("Студент отвязан");
                                }}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Отвязать студента
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={async () => {
                                await api.updateAppUser(u.id, { is_active: !u.is_active });
                                setAppUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
                                toast.success(u.is_active ? "Аккаунт деактивирован" : "Аккаунт активирован");
                              }}>
                                {u.is_active ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                {u.is_active ? "Деактивировать" : "Активировать"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setResetPwdUserId(u.id);
                                setResetPwdValue("");
                                setResetPwdDialogOpen(true);
                              }}>
                                <KeyRound className="w-4 h-4 mr-2" />
                                Сбросить пароль
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={async () => {
                                  if (!confirm(`Удалить пользователя ${u.display_name}?`)) return;
                                  await api.deleteAppUser(u.id);
                                  setAppUsers((prev) => prev.filter((x) => x.id !== u.id));
                                  toast.success("Пользователь удалён");
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  {appUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        Пользователей ещё нет
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Create App User Dialog */}
          <Dialog open={createAppUserOpen} onOpenChange={setCreateAppUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый пользователь приложения</DialogTitle>
                <DialogDescription>Создайте аккаунт для доступа к мессенджеру</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Отображаемое имя *</Label>
                  <Input
                    value={newAppUser.display_name}
                    onChange={(e) => setNewAppUser((p) => ({ ...p, display_name: e.target.value }))}
                    placeholder="Имя Фамилия"
                  />
                </div>
                <div>
                  <Label>Логин *</Label>
                  <Input
                    value={newAppUser.login}
                    onChange={(e) => setNewAppUser((p) => ({ ...p, login: e.target.value }))}
                    placeholder="login123"
                  />
                </div>
                <div>
                  <Label>Пароль *</Label>
                  <Input
                    value={newAppUser.password}
                    onChange={(e) => setNewAppUser((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Минимум 6 символов"
                  />
                </div>
                <div>
                  <Label>Заметки</Label>
                  <Input
                    value={newAppUser.notes ?? ""}
                    onChange={(e) => setNewAppUser((p) => ({ ...p, notes: e.target.value || null }))}
                    placeholder="Необязательно"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateAppUserOpen(false)}>Отмена</Button>
                <Button
                  disabled={creatingAppUser || !newAppUser.display_name || !newAppUser.login || !newAppUser.password}
                  onClick={async () => {
                    setCreatingAppUser(true);
                    try {
                      const created = await api.createAppUser(newAppUser);
                      setAppUsers((prev) => [created, ...prev]);
                      setCreateAppUserOpen(false);
                      setNewAppUser({ display_name: "", login: "", password: "" });
                      toast.success("Пользователь создан");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Ошибка");
                    } finally {
                      setCreatingAppUser(false);
                    }
                  }}
                >
                  {creatingAppUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Создать"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Link Student Dialog */}
          <Dialog open={linkStudentDialogOpen} onOpenChange={setLinkStudentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Привязать студента</DialogTitle>
                <DialogDescription>Выберите студента для привязки к этому аккаунту</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input
                  placeholder="Поиск по имени..."
                  value={linkStudentSearch}
                  onChange={(e) => setLinkStudentSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {students
                    .filter((s) => s.status === "active" && (
                      !linkStudentSearch ||
                      `${s.first_name} ${s.last_name}`.toLowerCase().includes(linkStudentSearch.toLowerCase())
                    ))
                    .map((s) => (
                      <button
                        key={s.id}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm"
                        onClick={async () => {
                          if (!linkingAppUserId) return;
                          try {
                            const updated = await api.linkStudentToAppUser(linkingAppUserId, s.id);
                            setAppUsers((prev) => prev.map((u) => u.id === linkingAppUserId ? updated : u));
                            setLinkStudentDialogOpen(false);
                            setLinkStudentSearch("");
                            toast.success(`Студент ${s.first_name} ${s.last_name} привязан`);
                          } catch (e: unknown) {
                            toast.error(e instanceof Error ? e.message : "Ошибка");
                          }
                        }}
                      >
                        {s.first_name} {s.last_name}
                        {s.portal_login && <span className="text-muted-foreground ml-2">({s.portal_login})</span>}
                      </button>
                    ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLinkStudentDialogOpen(false)}>Отмена</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={resetPwdDialogOpen} onOpenChange={(o) => { setResetPwdDialogOpen(o); if (!o) setResetPwdValue(""); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Сбросить пароль</DialogTitle>
                <DialogDescription>Введите новый пароль для пользователя</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label>Новый пароль</Label>
                <Input
                  type="text"
                  placeholder="Введите новый пароль"
                  value={resetPwdValue}
                  onChange={(e) => setResetPwdValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && resetPwdValue.trim() && !resettingPwd && document.getElementById("confirm-reset-pwd-btn")?.click()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetPwdDialogOpen(false)}>Отмена</Button>
                <Button
                  id="confirm-reset-pwd-btn"
                  disabled={!resetPwdValue.trim() || resettingPwd}
                  onClick={async () => {
                    if (!resetPwdUserId) return;
                    setResettingPwd(true);
                    try {
                      await api.resetAppUserPassword(resetPwdUserId, resetPwdValue.trim());
                      toast.success("Пароль обновлён");
                      setResetPwdDialogOpen(false);
                      setResetPwdValue("");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Ошибка");
                    } finally {
                      setResettingPwd(false);
                    }
                  }}
                >
                  {resettingPwd ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Сохранение...</> : "Сохранить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : !selectedStudent && mainTab === "archive" ? (
        <div className="h-screen flex flex-col bg-background">
          <div className="shrink-0 px-6 pt-6">
            {tabStrip}
            <div className="relative max-w-sm mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по архиву..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
            {archiveLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const q = archiveSearch.toLowerCase();
              const filtStudents = archivedStudents.filter((s) =>
                !q || `${s.last_name} ${s.first_name}`.toLowerCase().includes(q) || s.phone?.includes(q)
              );
              const filtLeads = archivedLeads.filter((l) =>
                !q || l.student_name?.toLowerCase().includes(q) || l.contact_name?.toLowerCase().includes(q) || l.phone?.includes(q)
              );
              const isEmpty = filtStudents.length === 0 && filtLeads.length === 0;
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тип</TableHead>
                      <TableHead>Ученик / Контакт</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Группы</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtStudents.map((student) => (
                      <TableRow key={`s-${student.id}`} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">Студент</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{student.last_name} {student.first_name}</TableCell>
                        <TableCell>{student.phone || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.groups && student.groups.length > 0
                            ? student.groups.map((g) => g.name).join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">—</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleRestoreStudent(student.id)}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Восстановить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handlePermanentDeleteStudent(student.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtLeads.map((lead) => (
                      <TableRow key={`l-${lead.id}`} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">Лид</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.student_name || "—"}</div>
                          {lead.contact_name && <div className="text-xs text-muted-foreground">{lead.contact_name}</div>}
                        </TableCell>
                        <TableCell>{lead.phone || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.conducted_groups.length > 0
                            ? lead.conducted_groups.map((g) => g.name).join(", ")
                            : lead.trial_groups.length > 0
                            ? lead.trial_groups.map((g) => g.name).join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(lead.created_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleRestoreLead(lead.id)}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Восстановить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handlePermanentDeleteLead(lead.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {isEmpty && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          Архив пуст
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              );
            })()}
          </div>
        </div>
      ) : !selectedStudent ? (
        <div className="h-screen flex flex-col bg-background">
          {/* 1. FIXED PAGE HEADER (Title + Filters) */}
          <div className="shrink-0">
            <div className="max-w-full px-6 pt-6">
            {tabStrip}
            {/* Title Block */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
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
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
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
              backLabel={
                (location.state as { from?: string } | null)?.from === "lesson" ? "Назад к уроку" :
                (location.state as { from?: string } | null)?.from === "group" ? "Назад к группе" :
                "Назад к списку"
              }
            />
          </div>

          {/* Tab Content */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              {/* Left column: Info + Parents */}
              <div className="space-y-6">
                <InfoCardComponent
                  student={selectedStudent}
                  studentHistory={studentHistory ?? []}
                  isEditing={isEditingBasicInfo}
                  editFormData={editFormData}
                  updating={updating}
                  linkCopied={linkCopied}
                  onStartEdit={handleStartEditBasicInfo}
                  onCancelEdit={handleCancelEditBasicInfo}
                  onSave={handleSaveBasicInfo}
                  onShare={handleShareLink}
                  onFormChange={setEditFormData}
                  onOpenPayment={handleOpenPaymentDialog}
                  onOpenSubscription={handleOpenSubscriptionDialog}
                  onRetroactiveDeduction={handleRetroactiveDeduction}
                  retroactiveLoading={retroactiveLoading}
                  onGenerateCredentials={handleGenerateCredentials}
                  generatingCreds={generatingCreds}
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
                        <div key={entry.id} className="flex items-start gap-3 border-l-2 border-blue-500 pl-4 py-2">
                          <div className="mt-0.5 shrink-0">{getHistoryIcon(entry.event_type)}</div>
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

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить оплату</DialogTitle>
            <DialogDescription>Пополнение баланса студента</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Discount hint */}
            {(() => {
              if (!selectedStudent?.discount_type || !selectedStudent.discount_value) return null;
              const today = new Date().toISOString().slice(0, 10);
              const from = selectedStudent.discount_valid_from;
              const until = selectedStudent.discount_valid_until;
              const active = (!from || today >= from) && (!until || today <= until);
              if (!active) return null;
              const plan = selectedStudent.subscription_plan;
              const basePrice = plan?.price ?? null;
              const discountedPrice = basePrice
                ? selectedStudent.discount_type === "percent"
                  ? Math.round(basePrice * (1 - selectedStudent.discount_value / 100))
                  : Math.max(0, basePrice - selectedStudent.discount_value)
                : null;
              return (
                <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-violet-700 font-medium">🏷 Скидка активна</span>
                    <span className="text-sm font-bold text-violet-800">
                      {selectedStudent.discount_type === "percent"
                        ? `−${selectedStudent.discount_value}%`
                        : `−${selectedStudent.discount_value.toLocaleString("ru-RU")} ₽`}
                    </span>
                  </div>
                  {plan && discountedPrice !== null && (
                    <div className="flex items-center justify-between text-xs text-violet-600">
                      <span>{plan.name}: {basePrice!.toLocaleString("ru-RU")} ₽</span>
                      <button
                        type="button"
                        className="underline font-semibold"
                        onClick={() => setPaymentAmount(String(discountedPrice))}
                      >
                        Подставить {discountedPrice.toLocaleString("ru-RU")} ₽
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label htmlFor="payment_amount">Сумма (₽) *</Label>
              <Input
                id="payment_amount"
                type="number"
                min={1}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="5000"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Тип оплаты</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("cash")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${paymentType === "cash" ? "bg-emerald-600 text-white border-emerald-600" : "border-border hover:bg-accent"}`}
                >
                  Наличные
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("card")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${paymentType === "card" ? "bg-blue-600 text-white border-blue-600" : "border-border hover:bg-accent"}`}
                >
                  Безналичный
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_desc">Примечание</Label>
              <Input
                id="payment_desc"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="Необязательно"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={savingPayment}>Отмена</Button>
            <Button
              onClick={handleAddPayment}
              disabled={savingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingPayment ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Добавить оплату"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить абонемент</DialogTitle>
            <DialogDescription>Выберите абонемент для студента</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите абонемент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без абонемента</SelectItem>
                {subscriptionPlans.filter((p) => p.is_active).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} — {plan.lessons_count} ур. · {(plan.price ?? plan.price_per_lesson ?? 0).toLocaleString("ru-RU")} ₽
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlanId !== "none" && (() => {
              const plan = subscriptionPlans.find((p) => p.id === selectedPlanId);
              return plan ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  Стоимость: <span className="font-bold">{(plan.price ?? 0).toLocaleString("ru-RU")} ₽</span>{plan.price_per_lesson ? <span className="text-blue-600 ml-1">· {plan.price_per_lesson.toLocaleString("ru-RU")} ₽/ур.</span> : null}
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)} disabled={savingSubscription}>Отмена</Button>
            <Button
              onClick={handleSaveSubscription}
              disabled={savingSubscription}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingSubscription ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portal Credentials Dialog */}
      <Dialog open={credsDialogOpen} onOpenChange={setCredsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Учётные данные для портала</DialogTitle>
            <DialogDescription>
              Сохраните или передайте ученику. Пароль показывается один раз.
            </DialogDescription>
          </DialogHeader>
          {credsResult && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Логин</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono">{credsResult.login}</code>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(credsResult.login)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Пароль</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono">{credsResult.password}</code>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(credsResult.password)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Домен для входа: <strong>web.garryschool.ru</strong>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredsDialogOpen(false)}>Закрыть</Button>
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
