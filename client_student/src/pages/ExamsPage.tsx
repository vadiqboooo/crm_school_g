import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { api, ExamSession, MyRegistration, ExamResult, TimeSlot } from "../lib/api";

type Tab = "current" | "results";

export default function ExamsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("current");
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [s, r, res] = await Promise.all([api.getExamSessions(), api.getMyRegistrations(), api.getResults()]);
    setSessions(s);
    setRegistrations(r);
    setResults(res);
  };

  useEffect(() => {
    reload().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const featured = sessions[0];

  return (
    <div className="bg-cream min-h-screen pb-24">
      <div className="px-5 pt-12 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Экзамены</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="bg-white rounded-2xl p-1 flex shadow-sm">
          {(["current", "results"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? "bg-brand-700 text-white" : "text-gray-500"
              }`}
            >
              {t === "current" ? "Текущие" : "Результаты"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : tab === "current" ? (
        <div className="px-5 space-y-4">
          {/* Featured exam */}
          {featured && (
            <div className="bg-brand-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-2">
                <span>★</span> АКТУАЛЬНЫЙ ЭКЗАМЕН
              </div>
              <h2 className="text-lg font-bold leading-snug">{featured.exam_title}</h2>
              {featured.time_slots.length > 0 && (
                <div className="flex items-center gap-1.5 text-white/70 text-xs mt-2">
                  <CalendarIcon />
                  Период: {featured.time_slots[0].date} — {featured.time_slots[featured.time_slots.length - 1].date}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-white/70 text-xs mt-1">
                <PeopleIcon />
                {featured.time_slots.reduce((s, sl) => s + sl.available_seats, 0)} свободных мест
              </div>
              <button
                onClick={() => navigate("/exams/register")}
                className="mt-4 bg-white text-brand-700 text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
              >
                Записаться →
              </button>
            </div>
          )}

          {/* My registrations */}
          {registrations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Мои записи</h3>
                <span className="text-brand-700 text-sm font-semibold">{registrations.length}</span>
              </div>
              <div className="space-y-2">
                {registrations.map(reg => (
                  <RegistrationCard
                    key={reg.id}
                    reg={reg}
                    sessions={sessions}
                    onCancel={async () => {
                      await api.cancelRegistration(reg.id);
                      setRegistrations(prev => prev.filter(r => r.id !== reg.id));
                    }}
                    onRebook={async (newSlotId) => {
                      await api.cancelRegistration(reg.id);
                      await api.registerForExam(newSlotId, reg.subject_id ?? undefined);
                      await reload();
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm">
              Нет активных экзаменов
            </div>
          )}
        </div>
      ) : (
        <div className="px-5">
          {results.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm">
              Нет результатов
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => <ResultCard key={i} result={r} />)}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// ── Swipeable RegistrationCard ───────────────────────────────────────────────

const SWIPE_THRESHOLD = 72;
const ACTION_WIDTH = 80;

function RegistrationCard({
  reg, sessions, onCancel, onRebook,
}: {
  reg: MyRegistration;
  sessions: ExamSession[];
  onCancel: () => Promise<void>;
  onRebook: (newSlotId: string) => Promise<void>;
}) {
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  const daysColor = reg.days_until <= 7
    ? "bg-red-100 text-red-600"
    : reg.days_until <= 30
    ? "bg-amber-100 text-amber-600"
    : "bg-brand-100 text-brand-700";

  const matchingSession = sessions.find(s => s.id === reg.session_id);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
    setSettled(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffset(Math.max(-ACTION_WIDTH * 1.4, Math.min(ACTION_WIDTH * 1.4, dx)));
  };

  const onTouchEnd = () => {
    dragging.current = false;
    setSettled(true);

    if (offset < -SWIPE_THRESHOLD) {
      setOffset(0);
      setShowConfirmDelete(true);
    } else if (offset > SWIPE_THRESHOLD) {
      setOffset(0);
      setShowEdit(true);
    } else {
      setOffset(0);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl shadow-sm">
        {/* Edit zone — left */}
        <div className="absolute inset-y-0 left-0 w-[80px] bg-brand-700 flex flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="text-white text-[10px] font-semibold">Изменить</span>
        </div>

        {/* Delete zone — right */}
        <div className="absolute inset-y-0 right-0 w-[80px] bg-red-500 flex flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          <span className="text-white text-[10px] font-semibold">Удалить</span>
        </div>

        {/* Card */}
        <div
          style={{
            transform: `translateX(${offset}px)`,
            transition: settled ? "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="bg-white p-4 relative z-10"
        >
          {reg.exam_type && (
            <div className="mb-2">
              <span className="text-[11px] font-semibold bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full">
                {reg.exam_type}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${daysColor} flex flex-col items-center justify-center shrink-0`}>
              <span className="text-lg font-bold leading-none">{reg.days_until}</span>
              <span className="text-[10px] leading-none">дн.</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">{reg.exam_title}</div>
              {reg.subject_name && (
                <div className="text-xs text-brand-700 font-medium mt-0.5 truncate">{reg.subject_name}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                {reg.date} · {reg.start_time.slice(0, 5)} · {reg.school_location_name ?? ""}
              </div>
            </div>
          </div>
          {/* Swipe hint */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
            <span className="flex items-center gap-1 text-[10px] text-brand-400 font-medium">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6"/></svg>
              Изменить
            </span>
            <span className="text-[10px] text-gray-300">свайп</span>
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
              Удалить
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
            </span>
          </div>
        </div>
      </div>

      {/* Confirm delete sheet */}
      {showConfirmDelete && (
        <ConfirmDeleteSheet
          title={reg.exam_title}
          onConfirm={async () => { setShowConfirmDelete(false); await onCancel(); }}
          onClose={() => setShowConfirmDelete(false)}
        />
      )}

      {/* Edit sheet */}
      {showEdit && (
        <EditRegistrationSheet
          reg={reg}
          session={matchingSession ?? null}
          onRebook={async (slotId) => { setShowEdit(false); await onRebook(slotId); }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}

// ── ConfirmDeleteSheet ────────────────────────────────────────────────────────

function ConfirmDeleteSheet({
  title, onConfirm, onClose,
}: {
  title: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </div>

        <h3 className="text-center font-bold text-gray-900 text-lg mb-1">Отменить запись?</h3>
        <p className="text-center text-gray-400 text-sm mb-6 px-4">{title}</p>

        <button
          onClick={async () => { setLoading(true); await onConfirm(); }}
          disabled={loading}
          className="w-full bg-red-500 text-white rounded-2xl py-3.5 font-semibold text-sm mb-3 disabled:opacity-60"
        >
          {loading ? "Отменяем..." : "Да, отменить запись"}
        </button>
        <button onClick={onClose} className="w-full text-gray-500 text-sm font-semibold py-2">
          Оставить
        </button>
      </div>
    </div>
  );
}

// ── EditRegistrationSheet ─────────────────────────────────────────────────────

function EditRegistrationSheet({
  reg, session, onRebook, onClose,
}: {
  reg: MyRegistration;
  session: ExamSession | null;
  onRebook: (slotId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const availableSlots = session?.time_slots.filter(
    s => !s.is_registered && s.available_seats > 0 && s.date !== reg.date
  ) ?? [];

  const handleRebook = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);
    try {
      await onRebook(selectedSlot.id);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-10 animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <h3 className="font-bold text-gray-900 text-lg mb-1">Изменить запись</h3>
        <p className="text-sm text-gray-400 mb-1">{reg.exam_title}</p>
        <div className="text-xs text-brand-700 font-medium mb-4">
          Сейчас: {reg.date} · {reg.start_time.slice(0, 5)} · {reg.school_location_name}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Выберите новое время</p>

        {availableSlots.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-6">Нет доступных слотов для переноса</div>
        ) : (
          <div className="space-y-2 mb-5">
            {availableSlots.map(slot => (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
                  selectedSlot?.id === slot.id
                    ? "border-brand-700 bg-brand-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm text-gray-900">{slot.date}</div>
                  <div className="text-xs text-gray-400">{slot.start_time.slice(0, 5)}</div>
                </div>
                <div className="text-xs text-gray-400">{slot.available_seats} мест</div>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {availableSlots.length > 0 && (
          <button
            onClick={handleRebook}
            disabled={!selectedSlot || loading}
            className="w-full bg-brand-700 text-white rounded-2xl py-3.5 font-semibold text-sm disabled:opacity-40 mb-3"
          >
            {loading ? "Переносим..." : "Перенести запись"}
          </button>
        )}
        <button onClick={onClose} className="w-full text-gray-500 text-sm font-semibold py-2">
          Отмена
        </button>
      </div>
    </div>
  );
}

// ── ResultCard ────────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: ExamResult }) {
  const hasScore = result.primary_score > 0 || result.final_score > 0;
  const isPending = !hasScore;
  const isPassed = result.is_passed;

  const maxScore = result.threshold_score ? Math.round(result.threshold_score * 1.5) : 100;
  const percent = Math.min(100, (result.final_score / maxScore) * 100);

  const circleColor = isPassed === true ? "#22c55e" : isPassed === false ? "#ef4444" : hasScore ? "#6366f1" : "#9ca3af";
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = isPending ? 0 : (percent / 100) * circ;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
          <circle cx="22" cy="22" r={r} fill="none" stroke={circleColor} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPending ? (
            <span className="text-gray-400 text-xs">—</span>
          ) : (
            <span className="text-sm font-bold text-gray-900 leading-none">{Math.round(result.final_score)}</span>
          )}
          {!isPending && result.threshold_score && (
            <span className="text-[9px] text-gray-400">{result.primary_score}/{result.threshold_score}</span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900 truncate">{result.exam_title}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {result.subject_name} · {result.exam_date ?? ""}
        </div>
        <div className="mt-1.5">
          {isPending ? (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">На проверке</span>
          ) : isPassed === true ? (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Сдан</span>
          ) : isPassed === false ? (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Не сдан</span>
          ) : (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Результат получен</span>
          )}
        </div>
      </div>
    </div>
  );
}

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
