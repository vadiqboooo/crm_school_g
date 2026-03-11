import { useState, useEffect, useRef } from "react";
import { Plus, Phone, MessageCircle, X, Loader2, UserPlus, Send } from "lucide-react";
import { api } from "../lib/api";
import type { Lead, LeadStatus, Group } from "../types/api";
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
function CreateLeadDialog({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { contact_name: string; student_name: string; phone: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ contact_name: "", student_name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try { await onCreate(form); setForm({ contact_name: "", student_name: "", phone: "" }); }
    finally { setLoading(false); }
  };

  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-600/20";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { key: "contact_name", label: "Имя родителя / контакта", ph: "Иванова Мария" },
            { key: "student_name", label: "Имя ученика",             ph: "Иванов Кирилл" },
            { key: "phone",        label: "Телефон",                  ph: "+7 (___) ___-__-__" },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
              <input className={cls} placeholder={ph} value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handle}
            disabled={loading || (!form.contact_name && !form.student_name)}>
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
  const [groupId, setGroupId] = useState("");
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
                <SelectItem value="">Без группы</SelectItem>
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
              try { await onConvert(lead.id, groupId || undefined); onClose(); }
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

  const handleCreate = async (d: { contact_name: string; student_name: string; phone: string }) => {
    try {
      const lead = await api.createLead(d);
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
