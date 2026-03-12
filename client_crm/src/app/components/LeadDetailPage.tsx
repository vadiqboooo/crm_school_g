import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Phone, UserPlus, Pencil, Check, X as CloseIcon,
  Send, Loader2, Users, Calendar, User, UserCheck, Archive, GraduationCap, School, BookOpen, Building2,
} from "lucide-react";
import { api } from "../lib/api";
import type { Lead, LeadStatus, Group } from "../types/api";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "./ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { toast } from "sonner";

// ─── Status config ────────────────────────────────────────────────────────────
const LEAD_STATUS_CONFIG: Record<LeadStatus, {
  icon: typeof UserCheck;
  color: string;
  bg: string;
  label: string;
}> = {
  not_sorted:          { icon: User,      color: "text-orange-500", bg: "bg-orange-50",  label: "Не разобрано" },
  contact_established: { icon: UserCheck, color: "text-blue-500",   bg: "bg-blue-50",    label: "Установлен контакт" },
  trial_assigned:      { icon: UserCheck, color: "text-purple-500", bg: "bg-purple-50",  label: "Назначено пробное" },
  trial_conducted:     { icon: UserCheck, color: "text-green-500",  bg: "bg-green-50",   label: "Проведено пробное" },
  archived:            { icon: Archive,   color: "text-gray-400",   bg: "bg-gray-100",   label: "Архив" },
};

const EDUCATION_TYPES = ["Школа", "Гимназия", "Лицей", "СПО", "Колледж", "Университет", "Другое"];

const SOURCE_OPTIONS = ["Сайт", "Социальные сети", "Рекомендация", "Реклама", "Другое"];

const EDU_CONFIG: Record<string, { icon: typeof School; color: string; bg: string }> = {
  "Школа":       { icon: School,       color: "text-blue-600",   bg: "bg-blue-50" },
  "Гимназия":    { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
  "Лицей":       { icon: BookOpen,     color: "text-orange-600", bg: "bg-orange-50" },
  "СПО":         { icon: Building2,    color: "text-teal-600",   bg: "bg-teal-50" },
  "Колледж":     { icon: Building2,    color: "text-teal-600",   bg: "bg-teal-50" },
  "Университет": { icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50" },
  "Другое":      { icon: GraduationCap, color: "text-gray-600",   bg: "bg-gray-50" },
};

const RELATION_OPTIONS = [
  { value: "мама",    label: "Мама" },
  { value: "папа",    label: "Папа" },
  { value: "бабушка", label: "Бабушка" },
  { value: "дедушка", label: "Дедушка" },
  { value: "тетя",    label: "Тетя" },
  { value: "дядя",    label: "Дядя" },
  { value: "другое",  label: "Другое" },
];

function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── AssignTrialDialog ────────────────────────────────────────────────────────
function AssignTrialDialog({
  open, groups, trialGroupIds, onClose, onAssign,
}: {
  open: boolean;
  groups: Group[];
  trialGroupIds: string[];
  onClose: () => void;
  onAssign: (groupId: string) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) setGroupId(""); }, [open]);
  const active = groups.filter((g) => !g.is_archived);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Добавить пробную группу</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          {trialGroupIds.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Уже назначено:</p>
              <div className="flex flex-wrap gap-1.5">
                {groups.filter(g => trialGroupIds.includes(g.id)).map(g => (
                  <span key={g.id} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{g.name}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Новая группа</label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Выберите группу..." /></SelectTrigger>
              <SelectContent>
                {active.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className={trialGroupIds.includes(g.id) ? "text-muted-foreground" : ""}>{g.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={loading || !groupId}
            onClick={async () => { setLoading(true); try { await onAssign(groupId); onClose(); } finally { setLoading(false); } }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Назначить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ConvertDialog ────────────────────────────────────────────────────────────
function ConvertDialog({
  open, lead, groups, onClose, onConvert,
}: {
  open: boolean; lead: Lead | null; groups: Group[];
  onClose: () => void; onConvert: (groupId?: string) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState("none");
  const [loading, setLoading] = useState(false);
  const active = groups.filter((g) => !g.is_archived);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Перевести в студенты</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Ученик <strong>{lead?.student_name || lead?.contact_name}</strong> будет добавлен в список студентов.
          </p>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Группа (необязательно)</label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Выбрать группу..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без группы</SelectItem>
                {active.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}
            onClick={async () => { setLoading(true); try { await onConvert(groupId === "none" ? undefined : groupId); onClose(); } finally { setLoading(false); } }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Перевести
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lead Info Card — mirrors InfoCardComponent ───────────────────────────────
function LeadInfoCard({
  lead, onLeadUpdate,
}: {
  lead: Lead; onLeadUpdate: (updated: Lead) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    student_name: "", phone: "", telegram: "",
    class_number: "", education_type: "", current_school: "", source: "",
  });
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";
  const selectCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";

  const startEdit = () => {
    setForm({
      student_name: lead.student_name ?? "",
      phone: lead.phone ?? "",
      telegram: lead.telegram ?? "",
      class_number: lead.class_number?.toString() ?? "",
      education_type: lead.education_type ?? "",
      current_school: lead.current_school ?? "",
      source: lead.source ?? "",
    });
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateLead(lead.id, {
        student_name: form.student_name || undefined,
        phone: form.phone || undefined,
        telegram: form.telegram || undefined,
        class_number: form.class_number ? Number(form.class_number) : undefined,
        education_type: form.education_type || undefined,
        current_school: form.current_school || undefined,
        source: form.source || undefined,
      });
      onLeadUpdate(updated); setEditing(false); toast.success("Изменения сохранены");
    } catch { toast.error("Ошибка сохранения"); } finally { setSaving(false); }
  };

  const eduCfg = lead.education_type ? EDU_CONFIG[lead.education_type] : null;
  const EduIcon = eduCfg?.icon || GraduationCap;
  const hasPhone = !!(lead.phone);
  const hasTelegram = !!(lead.telegram);

  return (
    <Card className="group/card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="pt-6">
        {!editing ? (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Основная информация</h3>
              </div>
              <div className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <button onClick={startEdit} className="p-2 border border-border rounded-lg hover:bg-accent transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Phone + Telegram + Source — same row as InfoCardComponent */}
            <div className="flex items-center gap-5 mb-4">
              <div className="flex items-center gap-2">
                <Phone className={`w-4 h-4 ${hasPhone ? "text-foreground" : "text-muted-foreground/40"}`} />
                <span className={hasPhone ? "text-foreground" : "text-muted-foreground"}>
                  {hasPhone ? lead.phone : "Не указан"}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Send className={`w-4 h-4 ${hasTelegram ? "text-sky-500" : "text-muted-foreground/40"}`} />
                <span className={hasTelegram ? "text-foreground" : "text-muted-foreground"}>
                  {hasTelegram ? `@${lead.telegram}` : "Не указан"}
                </span>
              </div>
              {lead.source && (
                <div className="ml-auto">
                  <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                </div>
              )}
            </div>

            {/* Student name */}
            <div className="flex items-center gap-2 mb-4">
              <User className={`w-4 h-4 ${lead.student_name ? "text-foreground" : "text-muted-foreground/40"}`} />
              <span className={lead.student_name ? "text-foreground" : "text-muted-foreground"}>
                {lead.student_name || "Имя ученика не указано"}
              </span>
            </div>

            {/* Education */}
            <div className="flex items-center gap-2 mb-4">
              {eduCfg ? (
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${eduCfg.bg}`}>
                  <EduIcon className={`w-3.5 h-3.5 ${eduCfg.color}`} />
                </div>
              ) : (
                <GraduationCap className="w-4 h-4 text-muted-foreground/40" />
              )}
              <span className={lead.class_number || lead.education_type || lead.current_school ? "text-foreground" : "text-muted-foreground"}>
                {lead.class_number ? `${lead.class_number} класс` : "Класс не указан"}
                {lead.education_type && ` · ${lead.education_type}`}
                {lead.current_school && ` · ${lead.current_school}`}
              </span>
            </div>

            {/* Trial groups */}
            {lead.trial_groups && lead.trial_groups.length > 0 && (
              <div className="flex items-start gap-2 mb-4">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-muted-foreground text-sm mr-0.5">Пробные группы ·</span>
                  {lead.trial_groups.map((g) => {
                    const isConducted = lead.conducted_groups?.some(cg => cg.id === g.id);
                    return (
                      <span key={g.id}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                          isConducted
                            ? "text-green-700 border-green-300 bg-green-50"
                            : "text-purple-700 border-purple-300 bg-purple-50"
                        }`}>
                        {isConducted ? "✓ " : ""}{g.name}
                        <button
                          onClick={async () => {
                            try {
                              const updated = await api.removeLeadTrialGroup(lead.id, g.id);
                              onLeadUpdate(updated);
                              toast.success("Группа удалена");
                            } catch { toast.error("Ошибка"); }
                          }}
                          className="ml-0.5 hover:text-red-500 transition-colors"
                          title="Удалить группу"
                        >
                          <CloseIcon className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assigned to */}
            {lead.assigned_to && (
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ответственный · </span>
                <span>{lead.assigned_to.first_name} {lead.assigned_to.last_name}</span>
              </div>
            )}

            {/* Created */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Добавлен {fmtDateFull(lead.created_at)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Редактирование</h3>
              <div className="flex items-center gap-2">
                <button onClick={cancelEdit} disabled={saving}
                  className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors text-sm">
                  <CloseIcon className="w-3.5 h-3.5" /> Отмена
                </button>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Сохранить
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Имя ученика</label>
                  <input className={inputCls} value={form.student_name}
                    onChange={(e) => setForm((f) => ({ ...f, student_name: e.target.value }))}
                    placeholder="Иванов Кирилл" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Источник</label>
                  <select className={selectCls} value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
                    <option value="">Не указан</option>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Телефон</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className={`${inputCls} pl-9`} value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+7 (___) ___-__-__" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Telegram</label>
                  <div className="relative">
                    <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className={`${inputCls} pl-9`} value={form.telegram}
                      onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
                      placeholder="@username" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr_1fr] gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Класс</label>
                  <input type="number" min={1} max={11} className={inputCls} value={form.class_number}
                    onChange={(e) => setForm((f) => ({ ...f, class_number: e.target.value }))}
                    placeholder="9" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Тип учебного заведения</label>
                  <select className={selectCls} value={form.education_type}
                    onChange={(e) => setForm((f) => ({ ...f, education_type: e.target.value }))}>
                    <option value="">Не указан</option>
                    {EDUCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Номер / название</label>
                  <input className={inputCls} value={form.current_school}
                    onChange={(e) => setForm((f) => ({ ...f, current_school: e.target.value }))}
                    placeholder="№ школы" />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Lead Contacts Card — mirrors ParentContactsComponent ────────────────────
function LeadContactsCard({
  lead, onLeadUpdate,
}: {
  lead: Lead; onLeadUpdate: (updated: Lead) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ contact_name: "", phone: "", relation: "мама", telegram: "" });
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";
  const selectCls = "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/40 transition-colors";

  const hasContact = !!(lead.contact_name || lead.phone);

  const startEdit = () => {
    setForm({
      contact_name: lead.contact_name ?? "",
      phone: lead.phone ?? "",
      relation: "мама",
      telegram: "",
    });
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateLead(lead.id, {
        contact_name: form.contact_name || undefined,
        phone: form.phone || undefined,
      });
      onLeadUpdate(updated); setEditing(false); toast.success("Контакт сохранён");
    } catch { toast.error("Ошибка сохранения"); } finally { setSaving(false); }
  };

  return (
    <Card className="group/card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Контакты родителей</h3>
          {!editing ? (
            <div className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
              <button onClick={startEdit} className="p-2 border border-border rounded-lg hover:bg-accent transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancelEdit} disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors text-sm">
                <CloseIcon className="w-3.5 h-3.5" /> Отмена
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Сохранить
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3">
            {hasContact ? (
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm text-muted-foreground">контакт</p>
                  <p>{lead.contact_name || "Не указано"}</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <Phone className={`w-4 h-4 ${lead.phone ? "text-foreground" : "text-muted-foreground/40"}`} />
                    <span className={lead.phone ? "text-foreground" : "text-muted-foreground"}>
                      {lead.phone || "Не указан"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Контакты не добавлены</p>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">ФИО *</label>
                <input className={inputCls} value={form.contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                  placeholder="Фамилия Имя Отчество" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Кто *</label>
                <select className={selectCls} value={form.relation}
                  onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}>
                  {RELATION_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Телефон *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="tel" className={`${inputCls} pl-9`} value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+7 (___) ___-__-__" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Telegram</label>
                <div className="relative">
                  <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input className={`${inputCls} pl-9`} value={form.telegram}
                    onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
                    placeholder="@username" />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Lead Comments — mirrors CommentsComponent ────────────────────────────────
function LeadComments({ lead, onCommentAdded }: { lead: Lead; onCommentAdded: (updated: Lead) => void }) {
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lead.comments.length]);

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const comment = await api.addLeadComment(lead.id, { content: newComment.trim() });
      onCommentAdded({ ...lead, comments: [...lead.comments, comment] });
      setNewComment("");
    } catch { toast.error("Ошибка добавления комментария"); }
    finally { setLoading(false); }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-semibold">Комментарии</h3>
        <span className="w-7 h-7 flex items-center justify-center bg-muted rounded-full text-sm text-muted-foreground">
          {lead.comments.length}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {lead.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Комментариев пока нет</p>
        ) : (
          lead.comments.map((c) => (
            <div key={c.id} className="bg-muted/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{c.author.first_name} {c.author.last_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("ru-RU", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground/80">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-3">
          <input type="text" value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Написать комментарий..."
            className="flex-1 px-4 py-2.5 bg-input-background border border-border rounded-lg text-sm"
          />
          <button onClick={handleAdd} disabled={loading || !newComment.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function LeadDetailPage({
  lead: initialLead, onBack, onConverted,
}: {
  lead: Lead; onBack: () => void; onConverted: () => void;
}) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trialOpen, setTrialOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => { api.getGroups().then(setGroups).catch(console.error); }, []);

  const handleAssignTrial = async (groupId: string) => {
    try {
      const updated = await api.assignTrialGroup(lead.id, groupId);
      setLead(updated); toast.success("Пробное назначено");
    } catch { toast.error("Ошибка назначения"); }
  };

  const handleConvert = async (groupId?: string) => {
    try {
      await api.convertLeadToStudent(lead.id, groupId);
      toast.success("Ученик переведён в студенты"); onConverted();
    } catch { toast.error("Ошибка конвертации"); }
  };

  const statusCfg = LEAD_STATUS_CONFIG[lead.status];
  const StatusIcon = statusCfg.icon;
  const displayName = lead.contact_name || lead.student_name || "Без имени";

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="animate-in slide-in-from-right duration-300 max-w-[1120px] mx-auto">

        {/* Header — same as StudentHeaderComponent */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${statusCfg.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-5 h-5 ${statusCfg.color}`} />
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <Select
            value={lead.status}
            onValueChange={async (val) => {
              try {
                const updated = await api.updateLead(lead.id, { status: val as LeadStatus });
                setLead(updated);
                toast.success("Статус обновлён");
              } catch { toast.error("Ошибка обновления статуса"); }
            }}
          >
            <SelectTrigger className={`h-7 w-auto gap-1.5 border-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color} hover:opacity-80`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(LEAD_STATUS_CONFIG) as [LeadStatus, typeof statusCfg][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span>{cfg.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Tab nav — same as TabNavComponent */}
        <div className="mt-5 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Назад к лидам
            </button>
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
              <button className="px-5 py-2 rounded-lg text-sm bg-blue-600 text-white shadow-sm">
                Информация
              </button>
              {(lead.status === "trial_assigned" || lead.status === "trial_conducted") && (
                <button
                  onClick={() => lead.status === "trial_conducted" ? setConvertOpen(true) : setTrialOpen(true)}
                  className="px-5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                >
                  {lead.status === "trial_conducted" ? "В студенты" : "Назначить пробное"}
                </button>
              )}
            </div>
            {/* Action buttons in header area */}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTrialOpen(true)}>
                <UserPlus className="w-3.5 h-3.5" />
                {lead.trial_groups.length > 0 ? "Добавить группу" : "Пробное занятие"}
              </Button>
              {lead.status === "trial_conducted" && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setConvertOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5" />
                  В студенты
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main content — same grid as student info tab */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Left column: info + contacts */}
          <div className="space-y-6">
            <LeadInfoCard lead={lead} onLeadUpdate={setLead} />
            <LeadContactsCard lead={lead} onLeadUpdate={setLead} />
          </div>

          {/* Right column: comments — sticky like student */}
          <div className="lg:h-[calc(100vh-220px)] lg:sticky lg:top-6">
            <LeadComments lead={lead} onCommentAdded={setLead} />
          </div>
        </div>
      </div>

      <AssignTrialDialog
        open={trialOpen} groups={groups} trialGroupIds={lead.trial_groups.map(g => g.id)}
        onClose={() => setTrialOpen(false)} onAssign={handleAssignTrial}
      />
      <ConvertDialog
        open={convertOpen} lead={lead} groups={groups}
        onClose={() => setConvertOpen(false)} onConvert={handleConvert}
      />
    </div>
  );
}
