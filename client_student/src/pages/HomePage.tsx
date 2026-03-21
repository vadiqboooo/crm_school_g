import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { api, TodayLesson, Performance, StudentProfile } from "../lib/api";

interface StoredStudent { id: string; first_name: string; last_name: string; }

const DAY_JS_TO_RU: Record<number, string> = {
  0: "Воскресенье", 1: "Понедельник", 2: "Вторник", 3: "Среда",
  4: "Четверг", 5: "Пятница", 6: "Суббота",
};
const DAY_SHORT: Record<number, string> = {
  0: "Вс", 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб",
};
const MONTH_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const BAR_COLORS = ["#7c3aed","#f59e0b","#22c55e","#3b82f6","#ec4899","#14b8a6","#f97316"];

function getWeekDays(): Date[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtTime(t: string): string {
  return t.slice(0, 5);
}

function calcEndTime(start: string, duration: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface WeekLesson {
  key: string;
  subject_name: string | null;
  group_name: string;
  start_time: string;
  end_time: string;
  teacher_name?: string | null;
  location_name?: string | null;
  is_now: boolean;
  is_today: boolean;
  date: Date;
  color: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const student: StoredStudent = JSON.parse(localStorage.getItem("s_student") ?? "{}");
  const [todayLessons, setTodayLessons] = useState<TodayLesson[]>([]);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.getTodaySchedule().then(setTodayLessons).catch(() => {});
    api.getPerformance().then(setPerf).catch(() => {});
    api.getMe().then(setProfile).catch(() => {});
  }, []);

  const weekDays = getWeekDays();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const weekLessons: WeekLesson[] = [];
  const groupColorMap: Record<string, number> = {};
  let colorIdx = 0;

  weekDays.forEach(date => {
    const isToday = date.toDateString() === todayDate.toDateString();
    const dayName = DAY_JS_TO_RU[date.getDay()];

    if (isToday) {
      todayLessons.forEach(l => {
        if (!(l.group_id in groupColorMap)) groupColorMap[l.group_id] = colorIdx++ % BAR_COLORS.length;
        weekLessons.push({
          key: `today-${l.group_id}-${l.start_time}`,
          subject_name: l.subject_name,
          group_name: l.group_name,
          start_time: l.start_time,
          end_time: l.end_time,
          teacher_name: l.teacher_name,
          location_name: l.location_name,
          is_now: l.is_now,
          is_today: true,
          date,
          color: BAR_COLORS[groupColorMap[l.group_id]],
        });
      });
    } else if (profile) {
      profile.groups.forEach(g => {
        g.schedules.forEach(sch => {
          if (sch.day === dayName) {
            if (!(g.id in groupColorMap)) groupColorMap[g.id] = colorIdx++ % BAR_COLORS.length;
            weekLessons.push({
              key: `${date.toDateString()}-${g.id}-${sch.start_time}`,
              subject_name: g.subject,
              group_name: g.name,
              start_time: sch.start_time,
              end_time: calcEndTime(sch.start_time, sch.duration),
              is_now: false,
              is_today: false,
              date,
              color: BAR_COLORS[groupColorMap[g.id]],
            });
          }
        });
      });
    }
  });

  weekLessons.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    return dateDiff !== 0 ? dateDiff : a.start_time.localeCompare(b.start_time);
  });

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} — ${weekEnd.getDate()} ${MONTH_SHORT[weekEnd.getMonth()]}`
    : `${weekStart.getDate()} ${MONTH_SHORT[weekStart.getMonth()]} — ${weekEnd.getDate()} ${MONTH_SHORT[weekEnd.getMonth()]}`;

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
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm"
        >
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
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                ↗ {perf.attendance_percent.toFixed(0)}% посещ.
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={`${perf.attendance_percent.toFixed(0)}%`} label="Посещаемость" color="bg-brand-100 text-brand-700" />
              <StatCard value={String(perf.homework_done)} label="Д/З выполнено" color="bg-amber-100 text-amber-600" />
              <StatCard value={String(perf.subjects_count)} label="Предметов" color="bg-violet-100 text-violet-600" />
            </div>
          </div>
        )}

        {/* Weekly schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Расписание на неделю</h2>
            <span className="text-sm text-brand-700 font-medium">{weekLabel}</span>
          </div>

          <div className="space-y-2">
            {weekLessons.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 text-center text-gray-400 text-sm shadow-sm">
                Уроков на этой неделе нет
              </div>
            ) : weekLessons.map(lesson => (
              <WeekLessonCard key={lesson.key} lesson={lesson} />
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

      {/* Settings modal */}
      {showSettings && profile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onUpdated={p => setProfile(p)}
          onLogout={() => { api.clearTokens(); navigate("/login"); }}
        />
      )}
    </div>
  );
}

// ── ProfileModal ──────────────────────────────────────────────────────────────

function ProfileModal({
  profile,
  onClose,
  onUpdated,
  onLogout,
}: {
  profile: StudentProfile;
  onClose: () => void;
  onUpdated: (p: StudentProfile) => void;
  onLogout: () => void;
}) {
  const [login, setLogin] = useState(profile.portal_login ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [oldPasswordVerified, setOldPasswordVerified] = useState(false);
  const [oldPasswordError, setOldPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [chatName, setChatName] = useState(profile.chat_display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleVerifyOldPassword = async () => {
    if (!oldPassword) return;
    setVerifying(true);
    setOldPasswordError(null);
    try {
      const { valid } = await api.verifyPassword(oldPassword);
      if (valid) {
        setOldPasswordVerified(true);
      } else {
        setOldPasswordError("Неверный пароль");
      }
    } catch {
      setOldPasswordError("Ошибка проверки");
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (oldPasswordVerified) {
      if (!newPassword) { setError("Введите новый пароль"); return; }
      if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return; }
    }

    setSaving(true);
    try {
      await api.updateSettings({
        portal_login: login || undefined,
        old_password: oldPasswordVerified ? oldPassword : undefined,
        new_password: oldPasswordVerified ? newPassword : undefined,
        phone,
        email,
        chat_display_name: chatName,
      });
      const updated = await api.getMe();
      onUpdated(updated);
      setSuccess(true);
      setOldPassword("");
      setOldPasswordVerified(false);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-10 animate-slide-up">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Name (read-only) */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-700 font-bold text-lg">
              {profile.first_name[0]}{profile.last_name[0]}
            </span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{profile.first_name} {profile.last_name}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Аккаунт</div>

          <SettingsField label="Логин" value={login} onChange={setLogin} placeholder="Введите логин" />

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">Смена пароля</div>

          {!oldPasswordVerified ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Старый пароль</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => { setOldPassword(e.target.value); setOldPasswordError(null); }}
                  placeholder="Введите текущий пароль"
                  className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                    oldPasswordError ? "border-red-300 bg-gray-50" : "border-gray-200 bg-gray-50 focus:border-brand-400"
                  }`}
                  onKeyDown={e => { if (e.key === "Enter") handleVerifyOldPassword(); }}
                />
                <button
                  type="button"
                  onClick={handleVerifyOldPassword}
                  disabled={!oldPassword || verifying}
                  className="px-4 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 shrink-0"
                >
                  {verifying ? "..." : "Далее"}
                </button>
              </div>
              {oldPasswordError && <p className="text-red-500 text-xs mt-1">{oldPasswordError}</p>}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Старый пароль подтверждён
                <button type="button" onClick={() => { setOldPasswordVerified(false); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="ml-auto text-xs text-gray-400 underline">Отмена</button>
              </div>
              <SettingsField label="Новый пароль" value={newPassword} onChange={setNewPassword} placeholder="Новый пароль" type="password" />
              <SettingsField label="Подтверждение" value={confirmPassword} onChange={setConfirmPassword} placeholder="Повторите новый пароль" type="password" error={confirmPassword.length > 0 && newPassword !== confirmPassword ? "Пароли не совпадают" : undefined} />
            </>
          )}

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">Контакты</div>

          <SettingsField label="Телефон" value={phone} onChange={setPhone} placeholder="+7..." type="tel" />
          <SettingsField label="Email" value={email} onChange={setEmail} placeholder="example@mail.ru" type="email" />

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">Чат</div>

          <SettingsField label="Имя в чате" value={chatName} onChange={setChatName} placeholder="Как вас называть в чате" disabled />
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        {success && <p className="text-emerald-600 text-sm mt-3">Сохранено!</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full bg-brand-700 text-white rounded-2xl py-3.5 font-semibold text-sm disabled:opacity-60"
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>

        <button
          onClick={onLogout}
          className="mt-3 w-full text-red-500 text-sm font-semibold py-2"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

function SettingsField({
  label, value, onChange, placeholder, type = "text", disabled = false, error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
          disabled
            ? "bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed"
            : error
            ? "bg-gray-50 border-red-300 text-gray-900 focus:border-red-400"
            : "bg-gray-50 border-gray-200 text-gray-900 focus:border-brand-400"
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={`${color} rounded-xl p-3 text-center`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

function WeekLessonCard({ lesson }: { lesson: WeekLesson }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm flex gap-3 ${
      lesson.is_today ? "border-2 border-brand-700/30" : ""
    }`}>
      {/* Left: day + date + time */}
      <div className="text-center min-w-[32px] shrink-0">
        <div className="text-[11px] text-gray-400 font-medium">{DAY_SHORT[lesson.date.getDay()]}</div>
        <div className="text-lg font-bold text-gray-900 leading-tight">{lesson.date.getDate()}</div>
        <div className="text-xs text-gray-400 mt-0.5">{fmtTime(lesson.start_time)}</div>
      </div>

      {/* Colored bar */}
      <div className="w-1 rounded self-stretch shrink-0" style={{ backgroundColor: lesson.color }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-gray-900 text-sm leading-snug">
            {lesson.subject_name ?? lesson.group_name}
          </span>
          <div className="flex gap-1 shrink-0">
            {lesson.is_now && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Сейчас</span>
            )}
            {lesson.is_today && !lesson.is_now && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Сегодня</span>
            )}
          </div>
        </div>
        {(lesson.teacher_name || lesson.location_name) && (
          <div className="text-xs text-gray-400 mt-0.5">
            {[lesson.teacher_name, lesson.location_name].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

function SubjectProgress({ name, percent }: { name: string; percent: number }) {
  const color = percent >= 80 ? "#22c55e" : percent >= 60 ? "#f59e0b" : "#7c3aed";
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
