import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { api, TodayLesson, StudentProfile, MyRegistration, ExamSession } from "../lib/api";

const MONTH_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const DAY_JS_TO_RU: Record<number, string> = {
  0: "Воскресенье", 1: "Понедельник", 2: "Вторник", 3: "Среда",
  4: "Четверг", 5: "Пятница", 6: "Суббота",
};
const DAY_SHORT: Record<number, string> = { 0:"Вс",1:"Пн",2:"Вт",3:"Ср",4:"Чт",5:"Пт",6:"Сб" };

interface WeekLesson {
  key: string;
  groupName: string;
  subjectName: string | null;
  teacherName?: string | null;
  locationName?: string | null;
  startTime: string;
  endTime: string;
  isNow: boolean;
  isToday: boolean;
  date: Date;
  dayLabel: string;
}

function calcEndTime(start: string, duration: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

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

function buildWeekLessons(todayLessons: TodayLesson[], profile: StudentProfile | null): WeekLesson[] {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays();
  const lessons: WeekLesson[] = [];

  weekDays.forEach(date => {
    const isToday = date.toDateString() === todayDate.toDateString();
    const dayName = DAY_JS_TO_RU[date.getDay()];
    const dayLabel = isToday
      ? `Сегодня, ${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
      : `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;

    if (isToday) {
      todayLessons.forEach(l => {
        lessons.push({
          key: `today-${l.group_id}-${l.start_time}`,
          groupName: l.group_name,
          subjectName: l.subject_name,
          teacherName: l.teacher_name,
          locationName: l.location_name,
          startTime: l.start_time,
          endTime: l.end_time,
          isNow: l.is_now,
          isToday: true,
          date,
          dayLabel,
        });
      });
    } else if (profile) {
      profile.groups.forEach(g => {
        g.schedules.forEach(sch => {
          if (sch.day === dayName) {
            lessons.push({
              key: `${date.toDateString()}-${g.id}-${sch.start_time}`,
              groupName: g.name,
              subjectName: g.subject,
              startTime: sch.start_time,
              endTime: calcEndTime(sch.start_time, sch.duration),
              isNow: false,
              isToday: false,
              date,
              dayLabel,
            });
          }
        });
      });
    }
  });

  return lessons.sort((a, b) => {
    const dd = a.date.getTime() - b.date.getTime();
    return dd !== 0 ? dd : a.startTime.localeCompare(b.startTime);
  });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function fmtTime(t: string) { return t.slice(0, 5); }

const EXAM_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700", badge: "bg-violet-200 text-violet-800", icon: "bg-violet-500" },
  { bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-200 text-amber-800", icon: "bg-amber-400" },
  { bg: "bg-sky-50", text: "text-sky-700", badge: "bg-sky-200 text-sky-800", icon: "bg-sky-500" },
  { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-200 text-emerald-800", icon: "bg-emerald-500" },
];

// ── Student Home ──────────────────────────────────────────────────────────────

function StudentHome() {
  const navigate = useNavigate();
  const stored = JSON.parse(localStorage.getItem("s_student") ?? "{}");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [todayLessons, setTodayLessons] = useState<TodayLesson[]>([]);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [availableSessions, setAvailableSessions] = useState<ExamSession[]>([]);

  useEffect(() => {
    api.getMe().then(setProfile).catch(() => {});
    api.getTodaySchedule().then(setTodayLessons).catch(() => {});
    api.getMyRegistrations().then(regs => {
      const upcoming = regs
        .filter(r => r.days_until >= 0)
        .sort((a, b) => a.days_until - b.days_until);
      setRegistrations(upcoming);
    }).catch(() => {});
    api.getExamSessions().then(setAvailableSessions).catch(() => {});
  }, []);

  const firstName = profile?.first_name ?? stored?.first_name ?? "";
  const firstGroup = profile?.groups?.[0];
  const nearest = registrations[0] ?? null;
  const weekLessons = buildWeekLessons(todayLessons, profile);

  // Group lessons by day for display
  const lessonsByDay: { dayLabel: string; lessons: WeekLesson[] }[] = [];
  weekLessons.forEach(l => {
    const last = lessonsByDay[lessonsByDay.length - 1];
    if (last && last.dayLabel === l.dayLabel) {
      last.lessons.push(l);
    } else {
      lessonsByDay.push({ dayLabel: l.dayLabel, lessons: [l] });
    }
  });

  return (
    <div className="bg-[#f5f5fa] dark:bg-gray-900 min-h-screen pb-28 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Привет, {firstName}
            <span>👋</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {firstGroup ? `Группа «${firstGroup.name}»` : "Школа Гарри"}
          </p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Nearest exam card or CTA to register */}
        {nearest ? (
          <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-purple-500 p-5 text-white">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-orange-300 text-sm">🔥</span>
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Ближайший экзамен</span>
            </div>
            <div className="text-xl font-bold mb-1">{nearest.exam_title}</div>
            <div className="text-sm text-white/80 mb-4">
              {fmtDate(nearest.date)} · через {nearest.days_until} {nearest.days_until === 1 ? "день" : nearest.days_until < 5 ? "дня" : "дней"}
            </div>
            <button
              onClick={() => navigate("/exams")}
              className="bg-white/20 border border-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/30 transition"
            >
              Подробнее →
            </button>
          </div>
        ) : availableSessions.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-purple-500 p-5 text-white">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-orange-300 text-sm">📝</span>
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Запись открыта</span>
            </div>
            <div className="text-xl font-bold mb-1">{availableSessions[0].exam_title}</div>
            <div className="text-sm text-white/80 mb-4">
              Доступно {availableSessions[0].time_slots.reduce((s, sl) => s + sl.available_seats, 0)} мест
            </div>
            <button
              onClick={() => navigate("/exams/register")}
              className="bg-white/20 border border-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/30 transition"
            >
              Записаться →
            </button>
          </div>
        )}

        {/* My exams */}
        {registrations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Мои экзамены</h2>
              <button onClick={() => navigate("/exams")} className="text-sm text-brand-700 font-medium">Все →</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {registrations.slice(0, 4).map((reg, i) => {
                const c = EXAM_COLORS[i % EXAM_COLORS.length];
                return (
                  <div key={reg.id} className={`${c.bg} dark:bg-gray-800 rounded-2xl p-4 min-w-[140px] flex-shrink-0`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                          <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" />
                        </svg>
                      </div>
                      <span className={`text-xs font-bold ${c.badge} px-2 py-0.5 rounded-full`}>
                        {reg.days_until} дн
                      </span>
                    </div>
                    <div className={`text-xs font-semibold ${c.text} mb-0.5`}>
                      {reg.exam_type ?? "Экзамен"}
                    </div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{reg.subject_name ?? reg.exam_title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fmtDate(reg.date)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule */}
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Расписание</h2>

          {weekLessons.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Занятий на этой неделе нет</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessonsByDay.map(({ dayLabel, lessons }) => (
                <div key={dayLabel}>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 px-1">{dayLabel}</div>
                  <div className="space-y-2">
                    {lessons.map(l => (
                      <div key={l.key} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-4">
                        <div className="text-right flex-shrink-0 w-14">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtTime(l.startTime)}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{fmtTime(l.endTime)}</div>
                        </div>
                        <div className="w-px h-10 bg-brand-200 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{l.groupName}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {[l.teacherName, l.locationName].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {l.isNow && (
                          <span className="text-[11px] font-bold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
                            Скоро
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// ── Guest Home (app_user without student) ─────────────────────────────────────

function GuestHome() {
  const navigate = useNavigate();

  const courses = [
    { tag: "ЕГЭ", tagColor: "bg-violet-100 text-violet-700", name: "Информатика", price: "от 4 800 ₽/мес" },
    { tag: "ОГЭ", tagColor: "bg-amber-100 text-amber-700", name: "Математика", price: "от 3 900 ₽/мес" },
    { tag: "ЕГЭ", tagColor: "bg-violet-100 text-violet-700", name: "Русский язык", price: "от 3 500 ₽/мес" },
    { tag: "ОГЭ", tagColor: "bg-amber-100 text-amber-700", name: "Физика", price: "от 4 200 ₽/мес" },
  ];

  return (
    <div className="bg-[#f5f5fa] dark:bg-gray-900 min-h-screen pb-28 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Школа Гарри
            <span className="text-amber-400">✦</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Подготовка к экзаменам</p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </div>

      <div className="px-5 space-y-6">
        {/* Promo banner */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-purple-400 p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold bg-white/20 border border-white/30 px-2.5 py-1 rounded-full tracking-wider">
              ⭐ БЕСПЛАТНО
            </span>
          </div>
          <div className="text-xl font-bold leading-snug mb-2">
            Пробный урок<br />по любому предмету
          </div>
          <p className="text-sm text-white/80 mb-4">
            Познакомьтесь с преподавателем и оцените формат обучения
          </p>
          <button
            onClick={() => navigate("/chat")}
            className="bg-white text-brand-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/90 transition"
          >
            Записаться →
          </button>
        </div>

        {/* Courses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Курсы подготовки</h2>
            <button className="text-sm text-brand-700 font-medium">Все →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {courses.map((c, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 min-w-[150px] flex-shrink-0 shadow-sm">
                <span className={`text-[11px] font-bold ${c.tagColor} px-2 py-0.5 rounded-full`}>{c.tag}</span>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2 mb-1">{c.name}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">{c.price}</div>
                <button className="w-full bg-brand-700 text-white text-xs font-bold py-2 rounded-xl">
                  Подробнее
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Career guidance */}
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Профориентация</h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-2xl p-4 flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Найди свою профессию</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Тестирование и консультация с экспертом. Помогаем определиться с направлением.</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/chat")}
            className="w-full flex items-center justify-center gap-2 border-2 border-brand-200 text-brand-700 rounded-2xl py-3 text-sm font-semibold hover:bg-brand-50 transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Записаться на консультацию
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/chat")}
          className="w-full flex items-center justify-center gap-2 bg-brand-700 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-brand-200 hover:bg-brand-800 transition"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Записаться на пробный урок
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const role = localStorage.getItem("s_role") ?? "student";
  const stored = JSON.parse(localStorage.getItem("s_student") ?? "{}");
  const hasStudentAccess = role === "student" || (role === "app_user" && stored?.student_id);

  return hasStudentAccess ? <StudentHome /> : <GuestHome />;
}
