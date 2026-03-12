import { useState, useEffect, useRef } from "react";
import { Plus, Phone, MessageCircle, X, Loader2, UserPlus, Send, GraduationCap } from "lucide-react";
import { api } from "../lib/api";
import type { Lead, LeadStatus, Group } from "../types/api";
import type { User } from "../types/api";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS: {
  status: LeadStatus;
  label: string;
  headerColor: string;
  countColor: string;
  borderColor: string;
}[] = [
  { status: "not_sorted",          label: "Не разобрано",       headerColor: "bg-orange-50 border-orange-200",   countColor: "text-orange-600", borderColor: "border-orange-200" },
  { status: "contact_established", label: "Установлен контакт", headerColor: "bg-blue-50 border-blue-200",       countColor: "text-blue-600",   borderColor: "border-blue-200" },
  { status: "trial_assigned",      label: "Назначено пробное",  headerColor: "bg-purple-50 border-purple-200",   countColor: "text-purple-600", borderColor: "border-purple-200" },
  { status: "trial_conducted",     label: "Проведено пробное",  headerColor: "bg-green-50 border-green-200",     countColor: "text-green-600",  borderColor: "border-green-200" },
];

const EDUCATION_TYPES = ["Школа", "Гимназия", "Лицей", "СПО", "Колледж", "Университет", "Другое"];
const SOURCE_OPTIONS = ["Сайт", "Социальные сети", "Рекомендация", "Реклама", "Другое"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Comment hover card ───────────────────────────────────────────────────────
function CommentsHover({
  lead,
  onAdd,
}: {
  lead: Lead;
  onAdd: (leadId: string, content: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const last = lead.comments[lead.comments.length - 1];

  const submit = async () => {
    if (!input.trim()) return;
    setAdding(true);
    try { await onAdd(lead.id, input.trim()); setInput(""); }
    finally { setAdding(false); }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          {last ? (
            <span className="truncate max-w-[160px]">{last.content}</span>
          ) : (
            <span className="italic opacity-60">Нет комментариев</span>
          )}
          {lead.comments.length > 1 && (
            <span className="opacity-50 shrink-0">+{lead.comments.length - 1}</span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" side="bottom" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2 border-b border-border text-sm font-semibold">Комментарии</div>
        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {lead.comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Нет комментариев</p>
          ) : (
            lead.comments.map((c) => (
              <div key={c.id} className="px-3 py-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-medium">{c.author.first_name} {c.author.last_name}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtDate(c.created_at)}</span>
                </div>
                <p className="text-xs text-foreground/80">{c.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t border-border flex gap-2">
          <input
            className="flex-1 text-xs px-2 py-1.5 border border-border rounded-md bg-background focus:outline-none"
            placeholder="Добавить..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); e.stopPropagation(); }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); submit(); }}
            disabled={adding || !input.trim()}
            className="px-2 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────────
function LeadCard({
  lead,
  onDelete,
  onAddComment,
  onConvert,
  onDragStart,
  onClick,
  onAddTrial,
}: {
  lead: Lead;
  onDelete: () => void;
  onAddComment: (id: string, content: string) => Promise<void>;
  onConvert: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onClick: () => void;
  onAddTrial: (lead: Lead) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing select-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{lead.contact_name || "Без имени"}</p>
          {lead.student_name && (
            <p className="text-xs text-muted-foreground truncate">{lead.student_name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">{fmtDate(lead.created_at)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded hover:bg-red-50 text-muted-foreground/40 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Phone */}
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3 shrink-0" />
          <span>{lead.phone}</span>
        </div>
      )}

      {/* Trial groups */}
      {lead.trial_groups && lead.trial_groups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.trial_groups.map((g) => {
            const isConducted = lead.conducted_groups?.some(cg => cg.id === g.id);
            return (
              <Badge
                key={g.id}
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${isConducted ? "text-green-700 border-green-300 bg-green-50" : "text-purple-700 border-purple-300 bg-purple-50"}`}
              >
                {isConducted ? "✓ " : ""}{g.name}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Assigned */}
      {lead.assigned_to && (
        <p className="text-[10px] text-muted-foreground/60">
          {lead.assigned_to.first_name} {lead.assigned_to.last_name}
        </p>
      )}

      {/* Comments */}
      <CommentsHover lead={lead} onAdd={onAddComment} />

      {/* Quick actions */}
      {(lead.status === "trial_assigned" || lead.status === "trial_conducted") && (
        <div className="pt-1 border-t border-border/60 flex items-center justify-between">
          {lead.status === "trial_assigned" && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddTrial(lead); }}
              className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              + Группа
            </button>
          )}
          {lead.status === "trial_conducted" && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvert(lead); }}
              className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              В студенты
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────
type CreateLeadForm = {
  contact_name: string;
  student_name: string;
  phone: string;
  class_number: string;
  education_type: string;
  current_school: string;
  source: string;
  assigned_to_id: string;
  telegram: string;
  comment: string;
};

const EMPTY_CREATE_FORM: CreateLeadForm = {
  contact_name: "", student_name: "", phone: "",
  class_number: "", education_type: "", current_school: "",
  source: "", assigned_to_id: "", telegram: "", comment: "",
};

function validatePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 12) return "Введите корректный номер телефона";
  return null;
}

function CreateLeadDialog({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: CreateLeadForm) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateLeadForm>(EMPTY_CREATE_FORM);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_CREATE_FORM);
      setPhoneError(null);
      api.getEmployees(["admin", "manager"]).then(setEmployees).catch(() => {});
    }
  }, [open]);

  const set = (key: keyof CreateLeadForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePhoneChange = (value: string) => {
    set("phone", value);
    if (value) setPhoneError(validatePhone(value));
    else setPhoneError(null);
  };

  const handle = async () => {
    const err = validatePhone(form.phone);
    if (err) { setPhoneError(err); return; }
    setLoading(true);
    try { await onCreate(form); }
    finally { setLoading(false); }
  };

  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-600/20";
  const isValid = !!(form.contact_name || form.student_name) && !phoneError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">

          {/* Основные данные */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Имя родителя / контакта</label>
              <input className={cls} placeholder="Иванова Мария" value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Имя ученика</label>
              <input className={cls} placeholder="Иванов Кирилл" value={form.student_name}
                onChange={(e) => set("student_name", e.target.value)} />
            </div>
          </div>

          {/* Телефон + Телеграм */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Телефон <span className="text-xs text-muted-foreground/60">(родителя / контакта)</span>
              </label>
              <input
                className={`${cls} ${phoneError ? "border-red-400 focus:ring-red-400/20" : ""}`}
                placeholder="+7 (___) ___-__-__"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                type="tel"
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Telegram <span className="text-xs text-muted-foreground/60">(родителя / контакта)</span>
              </label>
              <input className={cls} placeholder="@username" value={form.telegram}
                onChange={(e) => set("telegram", e.target.value)} />
            </div>
          </div>

          {/* Учёба */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Класс</label>
              <input className={cls} placeholder="9" type="number" min="1" max="11"
                value={form.class_number}
                onChange={(e) => set("class_number", e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Тип заведения</label>
              <select className={cls} value={form.education_type}
                onChange={(e) => set("education_type", e.target.value)}>
                <option value="">Не указан</option>
                {EDUCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Номер учебного заведения</label>
              <input className={cls} placeholder="№5" value={form.current_school}
                onChange={(e) => set("current_school", e.target.value)} />
            </div>
          </div>

          {/* Источник и ответственный */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Источник</label>
              <select className={cls} value={form.source}
                onChange={(e) => set("source", e.target.value)}>
                <option value="">Не указан</option>
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Ответственный</label>
              <select className={cls} value={form.assigned_to_id}
                onChange={(e) => set("assigned_to_id", e.target.value)}>
                <option value="">Не назначен</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Комментарий */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Комментарий</label>
            <textarea className={`${cls} resize-none`} rows={3}
              placeholder="Первичная информация о клиенте..."
              value={form.comment}
              onChange={(e) => set("comment", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handle} disabled={loading || !isValid}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommentOnMoveDialog({
  open, onClose, onConfirm, targetLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void>;
  targetLabel: string;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setComment(""); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);

  const handle = async () => {
    setLoading(true);
    try { await onConfirm(comment); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Перенос в «{targetLabel}»</DialogTitle></DialogHeader>
        <div className="py-2">
          <label className="text-sm text-muted-foreground mb-1.5 block">Комментарий (необязательно)</label>
          <input
            ref={inputRef}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            placeholder="Дозвонились, хотят в следующем..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handle(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handle} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Переместить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignTrialDialog({
  lead, groups, onClose, onAssign,
}: {
  lead: Lead | null;
  groups: Group[];
  onClose: () => void;
  onAssign: (leadId: string, groupId: string) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (lead) setGroupId(""); }, [lead]);

  const active = groups.filter((g) => !g.is_archived);
  const trialGroupIds = lead?.trial_groups.map(g => g.id) ?? [];

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
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
            onClick={async () => {
              if (!lead) return;
              setLoading(true);
              try { await onAssign(lead.id, groupId); onClose(); }
              finally { setLoading(false); }
            }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Назначить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({
  lead, groups, onClose, onConvert,
}: {
  lead: Lead | null;
  groups: Group[];
  onClose: () => void;
  onConvert: (leadId: string, groupId?: string) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState("none");
  const [loading, setLoading] = useState(false);
  const active = groups.filter((g) => !g.is_archived);

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
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
            onClick={async () => {
              if (!lead) return;
              setLoading(true);
              try { await onConvert(lead.id, groupId === "none" ? undefined : groupId); onClose(); }
              finally { setLoading(false); }
            }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Перевести
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────
export function LeadsBoard({
  onLeadSelect,
  externalCreateOpen,
  onExternalCreateClose,
}: {
  onLeadSelect: (lead: Lead) => void;
  externalCreateOpen?: boolean;
  onExternalCreateClose?: () => void;
}) {
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const dragLeadId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null);

  // Dialogs
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createOpen = externalCreateOpen ?? internalCreateOpen;
  const setCreateOpen = (v: boolean) => {
    setInternalCreateOpen(v);
    if (!v) onExternalCreateClose?.();
  };
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [trialLead, setTrialLead] = useState<Lead | null>(null);

  // "Comment on move" dialog
  const [commentMove, setCommentMove] = useState<{
    leadId: string;
    targetStatus: LeadStatus;
    targetLabel: string;
  } | null>(null);

  // "Assign trial on move" drag to trial_assigned
  const [trialMove, setTrialMove] = useState<{ leadId: string } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [ld, gd] = await Promise.all([api.getLeads(), api.getGroups()]);
      setLeads(ld.filter((l) => l.status !== "archived"));
      setGroups(gd);
    } catch { toast.error("Ошибка загрузки"); }
    finally { setLoading(false); }
  };

  const patchLead = (updated: Lead) =>
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));

  const handleCreate = async (d: CreateLeadForm) => {
    try {
      const lead = await api.createLead({
        contact_name: d.contact_name || undefined,
        student_name: d.student_name || undefined,
        phone: d.phone || undefined,
        class_number: d.class_number ? Number(d.class_number) : undefined,
        education_type: d.education_type || undefined,
        current_school: d.current_school || undefined,
        source: d.source || undefined,
        assigned_to_id: d.assigned_to_id || undefined,
        telegram: d.telegram || undefined,
      });
      if (d.comment.trim()) {
        const comment = await api.addLeadComment(lead.id, { content: d.comment.trim() });
        lead.comments = [comment];
      }
      setLeads((prev) => [lead, ...prev]);
      setCreateOpen(false);
      toast.success("Клиент добавлен");
    } catch { toast.error("Ошибка при создании"); }
  };

  const handleAddComment = async (leadId: string, content: string) => {
    try {
      const comment = await api.addLeadComment(leadId, { content });
      setLeads((prev) =>
        prev.map((l) => l.id === leadId ? { ...l, comments: [...l.comments, comment] } : l)
      );
    } catch { toast.error("Ошибка комментария"); }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Удалить «${lead.contact_name || lead.student_name}»?`)) return;
    try {
      await api.deleteLead(lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    } catch { toast.error("Ошибка удаления"); }
  };

  const handleAssignTrial = async (leadId: string, groupId: string) => {
    try {
      const updated = await api.assignTrialGroup(leadId, groupId);
      patchLead(updated);
      toast.success("Пробное назначено");
    } catch { toast.error("Ошибка назначения"); }
  };

  const handleConvert = async (leadId: string, groupId?: string) => {
    try {
      await api.convertLeadToStudent(leadId, groupId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast.success("Ученик добавлен в студенты");
    } catch { toast.error("Ошибка конвертации"); }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, leadId: string) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, col: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  };

  const onDragLeave = () => setDragOverCol(null);

  const onDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const leadId = dragLeadId.current;
    dragLeadId.current = null;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    if (targetStatus === "contact_established") {
      const col = COLUMNS.find((c) => c.status === targetStatus)!;
      setCommentMove({ leadId, targetStatus, targetLabel: col.label });
      return;
    }

    if (targetStatus === "trial_assigned") {
      setTrialMove({ leadId });
      return;
    }

    try {
      const updated = await api.updateLead(leadId, { status: targetStatus });
      patchLead(updated);
    } catch { toast.error("Ошибка перемещения"); }
  };

  const handleCommentMoveConfirm = async (comment: string) => {
    if (!commentMove) return;
    try {
      const updated = await api.updateLead(commentMove.leadId, { status: commentMove.targetStatus });
      patchLead(updated);
      if (comment.trim()) await handleAddComment(commentMove.leadId, comment.trim());
      setCommentMove(null);
    } catch { toast.error("Ошибка"); }
  };

  const handleTrialMoveAssign = async (leadId: string, groupId: string) => {
    await handleAssignTrial(leadId, groupId);
    setTrialMove(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold">Клиенты</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Управление лидами и студентами</p>
        </div>
      </div>

      {/* Kanban — full width, equal columns */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status);
          const isOver = dragOverCol === col.status;

          return (
            <div
              key={col.status}
              className="flex flex-col flex-1 min-w-[220px]"
              onDragOver={(e) => onDragOver(e, col.status)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.status)}
            >
              <div className={`rounded-t-xl border px-4 py-3 flex items-center justify-between ${col.headerColor}`}>
                <span className="text-sm font-semibold">{col.label}</span>
                <span className={`text-sm font-bold ${col.countColor}`}>{colLeads.length}</span>
              </div>

              <div
                className={`flex-1 rounded-b-xl border border-t-0 ${col.borderColor} overflow-y-auto p-3 space-y-3 transition-colors ${
                  isOver ? "bg-blue-50/60" : "bg-card/50"
                }`}
                style={{ minHeight: 200 }}
              >
                {colLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onDelete={() => handleDelete(lead)}
                    onAddComment={handleAddComment}
                    onConvert={(l) => setConvertLead(l)}
                    onDragStart={onDragStart}
                    onClick={() => onLeadSelect(lead)}
                    onAddTrial={(l) => setTrialLead(l)}
                  />
                ))}
                {colLeads.length === 0 && !isOver && (
                  <div className="flex items-center justify-center h-16 text-sm text-muted-foreground/40 select-none">
                    Перетащите сюда
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />

      <CommentOnMoveDialog
        open={!!commentMove}
        onClose={() => setCommentMove(null)}
        onConfirm={handleCommentMoveConfirm}
        targetLabel={commentMove?.targetLabel ?? ""}
      />

      <AssignTrialDialog
        lead={trialMove ? (leads.find((l) => l.id === trialMove.leadId) ?? null) : null}
        groups={groups}
        onClose={() => setTrialMove(null)}
        onAssign={handleTrialMoveAssign}
      />

      <AssignTrialDialog
        lead={trialLead}
        groups={groups}
        onClose={() => setTrialLead(null)}
        onAssign={handleAssignTrial}
      />

      <ConvertDialog
        lead={convertLead}
        groups={groups}
        onClose={() => setConvertLead(null)}
        onConvert={handleConvert}
      />
    </div>
  );
}
