import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { api, TodayLesson, Performance } from "../lib/api";

interface StoredStudent { id: string; first_name: string; last_name: string; }

export default function HomePage() {
  const navigate = useNavigate();
  const student: StoredStudent = JSON.parse(localStorage.getItem("s_student") ?? "{}");
  const [schedule, setSchedule] = useState<TodayLesson[]>([]);
  const [perf, setPerf] = useState<Performance | null>(null);

  useEffect(() => {
    api.getTodaySchedule().then(setSchedule).catch(() => {});
    api.getPerformance().then(setPerf).catch(() => {});
  }, []);

  const handleLogout = () => {
    api.clearTokens();
    navigate("/login");
  };

  return (
    <div className="bg-cream min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Привет, {student.first_name}! <span className="text-amber-400">✦</span>
          </h1>
          <p className="text-gray-500 text-sm">Школа Гарри</p>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Stats card */}
        {perf && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Успеваемость</h2>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                ↗ {perf.attendance_percent.toFixed(0)}% ср. балл
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={`${perf.attendance_percent.toFixed(0)}%`} label="Посещаемость" color="bg-red-100 text-red-600" />
              <StatCard value={String(perf.homework_done)} label="Д/З выполнено" color="bg-amber-100 text-amber-600" />
              <StatCard value={String(perf.subjects_count)} label="Предметов" color="bg-purple-100 text-purple-600" />
            </div>
          </div>
        )}

        {/* Today's schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Расписание на сегодня</h2>
            <button className="text-brand-700 text-sm font-medium">Все →</button>
          </div>
          <div className="space-y-2">
            {schedule.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 text-center text-gray-400 text-sm shadow-sm">
                Уроков на сегодня нет
              </div>
            ) : schedule.map((lesson, i) => (
              <LessonCard key={i} lesson={lesson} />
            ))}
          </div>
        </div>

        {/* Subject progress */}
        {perf && perf.subject_progress.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Прогресс по предметам</h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              {perf.subject_progress.map((sp, i) => (
                <SubjectProgress key={i} name={sp.name} percent={sp.percent} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={`${color} rounded-xl p-3 text-center`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

const LESSON_COLORS = ["#7b3f0f", "#e8ae6a", "#7c9e6a", "#6a7caf", "#af6a9e"];

function LessonCard({ lesson }: { lesson: TodayLesson }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
      <div className="text-right min-w-[44px]">
        <div className="text-sm font-semibold text-gray-900">{lesson.start_time}</div>
        <div className="text-xs text-gray-400">{lesson.end_time}</div>
      </div>
      <div className="w-0.5 rounded-full" style={{ backgroundColor: LESSON_COLORS[0] }} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm">{lesson.subject_name ?? lesson.group_name}</span>
          {lesson.is_now && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Сейчас</span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {[lesson.teacher_name, lesson.location_name].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}

function SubjectProgress({ name, percent }: { name: string; percent: number }) {
  const color = percent >= 80 ? "#22c55e" : percent >= 60 ? "#f59e0b" : "#7b3f0f";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{name}</span>
        <span className="font-semibold" style={{ color }}>{percent}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
