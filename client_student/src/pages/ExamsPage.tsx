import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { api, ExamSession, MyRegistration, ExamResult } from "../lib/api";

type Tab = "current" | "results";

export default function ExamsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("current");
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getExamSessions(), api.getMyRegistrations(), api.getResults()])
      .then(([s, r, res]) => {
        setSessions(s);
        setRegistrations(r);
        setResults(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = sessions[0];

  return (
    <div className="bg-cream min-h-screen pb-24">
      <div className="px-5 pt-12 pb-2">
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
                {featured.time_slots.reduce((s, sl) => s + sl.total_seats, 0)} мест
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
                  <RegistrationCard key={reg.id} reg={reg} />
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

function RegistrationCard({ reg }: { reg: MyRegistration }) {
  const daysColor = reg.days_until <= 7 ? "bg-red-100 text-red-600" : reg.days_until <= 30 ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600";
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
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
          {reg.date} · {reg.start_time} · {reg.school_location_name ?? ""}
        </div>
      </div>
      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={3}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  );
}

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
