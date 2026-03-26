import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ExamResult } from "../lib/api";

type Season = "spring" | "winter" | "autumn";
const SEASON_LABELS: Record<Season, string> = { spring: "Весенний", winter: "Зимний", autumn: "Осенний" };

function getSeason(dateStr: string | null): Season {
  if (!dateStr) return "spring";
  const m = new Date(dateStr).getMonth();
  if (m >= 2 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "autumn";
  return "winter";
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [season, setSeason] = useState<Season>("spring");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getResults().then(r => {
      setResults(r);
      if (r.length > 0) setSeason(getSeason(r[0].exam_date));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = results.filter(r => getSeason(r.exam_date) === season);

  return (
    <div className="bg-cream dark:bg-gray-900 min-h-screen pb-8">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Результаты</h1>
      </div>

      <div className="px-5">
        {/* Type badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Пробник</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Актуальный
          </span>
        </div>

        {/* Season tabs */}
        <div className="flex gap-2 mb-4">
          {(["spring", "winter", "autumn"] as Season[]).map(s => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-colors ${
                season === s ? "bg-brand-700 text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm"
              }`}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center text-gray-400 dark:text-gray-500 text-sm shadow-sm">
            Нет результатов за этот период
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, i) => <ResultCard key={i} result={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ExamResult }) {
  const maxScore = result.threshold_score ? Math.round(result.threshold_score * 1.5) : 100;
  const percent = Math.min(100, (result.final_score / maxScore) * 100);
  const isPassed = result.is_passed;
  const isPending = isPassed === null;

  const circleColor = isPassed ? "#22c55e" : isPending ? "#9ca3af" : "#ef4444";
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = isPending ? 0 : (percent / 100) * circ;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
      {/* Circle score */}
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" stroke="#374151" strokeWidth="4" />
          <circle cx="22" cy="22" r={r} fill="none" stroke={circleColor} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPending ? (
            <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
          ) : (
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{Math.round(result.final_score)}</span>
          )}
          {!isPending && result.threshold_score && (
            <span className="text-[9px] text-gray-400 dark:text-gray-500">{result.primary_score}/{result.threshold_score}</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{result.exam_title}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {result.subject_name} · {result.exam_date ?? ""}
        </div>
        <div className="mt-1.5">
          {isPending ? (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">На проверке</span>
          ) : !result.exam_date ? (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Не проведён</span>
          ) : isPassed ? (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Сдан</span>
          ) : (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Не сдан</span>
          )}
        </div>
      </div>
    </div>
  );
}
