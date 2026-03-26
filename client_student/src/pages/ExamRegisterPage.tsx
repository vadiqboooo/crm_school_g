import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ExamSession, StudentProfile, PortalSubject, TimeSlot, MyRegistration } from "../lib/api";

interface Location { id: string | null; name: string; }

export default function ExamRegisterPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [allSubjects, setAllSubjects] = useState<PortalSubject[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<PortalSubject | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [locationOpen, setLocationOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    Promise.all([api.getExamSessions(), api.getMe(), api.getSubjects(), api.getMyRegistrations()])
      .then(([s, p, subj, regs]) => { setSessions(s); setProfile(p); setAllSubjects(subj); setMyRegistrations(regs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Student's exam types from their groups
  const studentExamTypes = new Set(
    (profile?.groups ?? []).map(g => g.exam_type).filter(Boolean) as string[]
  );

  // Unique locations from active sessions
  const locations: Location[] = [];
  const seenLoc = new Set<string>();
  for (const s of sessions) {
    const key = s.school_location_id ?? "__all__";
    if (!seenLoc.has(key)) {
      seenLoc.add(key);
      locations.push({ id: s.school_location_id, name: s.school_location_name ?? "Все локации" });
    }
  }

  // Subject IDs already registered at the selected school
  const registeredSubjectIds = new Set(
    myRegistrations
      .filter(r => r.school_location_id === selectedLocation?.id && r.subject_id)
      .map(r => r.subject_id as string)
  );

  // Subjects from school settings, filtered by student's exam type and not already registered
  const filteredSubjects = allSubjects.filter(subj =>
    (studentExamTypes.size === 0 || !subj.exam_type || studentExamTypes.has(subj.exam_type)) &&
    !registeredSubjectIds.has(subj.id)
  );

  // Session for selected school (first active session at that location)
  const matchedSession = sessions.find(s => s.school_location_id === selectedLocation?.id) ?? null;

  const allDates = matchedSession
    ? [...new Set(matchedSession.time_slots.map(s => s.date))].sort()
    : [];
  const slotsForDate = matchedSession
    ? matchedSession.time_slots.filter(s => s.date === selectedDate)
    : [];

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setSelectedSubject(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setLocationOpen(false);
    setSubjectOpen(true);
  };

  const handleSelectSubject = (subj: PortalSubject) => {
    setSelectedSubject(subj);
    setSubjectOpen(false);
    // Pre-select first date
    const sess = sessions.find(s => s.school_location_id === selectedLocation?.id);
    if (sess) {
      const dates = [...new Set(sess.time_slots.map(t => t.date))].sort();
      if (dates.length > 0) setSelectedDate(dates[0]);
    }
  };

  const handleRegister = async () => {
    if (!selectedSlot) return;
    setRegistering(true);
    try {
      await api.registerForExam(selectedSlot.id, selectedSubject?.id);
      setRegistered(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-cream dark:bg-gray-900 min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Загрузка...
      </div>
    );
  }

  if (registered) {
    return (
      <div className="bg-cream dark:bg-gray-900 min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">Вы записаны!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
          {selectedSubject?.name} · {selectedDate} в {selectedSlot?.start_time}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs text-center">{selectedLocation?.name}</p>
        <button onClick={() => navigate("/exams")} className="mt-4 w-full py-4 bg-brand-700 text-white rounded-2xl font-semibold">
          К экзаменам
        </button>
      </div>
    );
  }

  return (
    <div className="bg-cream dark:bg-gray-900 min-h-screen pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Запись на экзамен</h1>
        {studentExamTypes.size > 0 && (
          <div className="ml-auto flex gap-1 shrink-0">
            {[...studentExamTypes].map(type => (
              <span key={type} className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                type === "ЕГЭ" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-0">
          {[
            { num: 1, label: "Школа", done: !!selectedLocation },
            { num: 2, label: "Предмет", done: !!selectedSubject },
            { num: 3, label: "Дата и время", done: false },
          ].map((step, i) => {
            const currentStep = !selectedLocation ? 1 : !selectedSubject ? 2 : 3;
            const isActive = step.num === currentStep;
            const isDone = step.num < currentStep;
            return (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone ? "bg-brand-700 text-white" :
                    isActive ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 border-2 border-brand-700" :
                    "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  }`}>
                    {isDone ? (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : step.num}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-brand-700" : isDone ? "text-brand-700" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`h-0.5 flex-1 mb-4 mx-1 transition-colors ${isDone ? "bg-brand-700" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 space-y-5">

        {/* School selector */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Школа</label>
          <button
            onClick={() => setLocationOpen(v => !v)}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between text-sm active:scale-[0.98] transition-transform"
          >
            <span className={selectedLocation ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400 dark:text-gray-500"}>
              {selectedLocation?.name ?? "Выберите школу"}
            </span>
            <ChevronIcon open={locationOpen} />
          </button>
          {locationOpen && (
            <div className="mt-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
              {locations.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Нет доступных школ</div>
              ) : locations.map(loc => (
                <button
                  key={loc.id ?? "__all__"}
                  onClick={() => handleSelectLocation(loc)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                    selectedLocation?.id === loc.id ? "bg-brand-700/10 text-brand-700 font-semibold" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject selector */}
        {selectedLocation && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Предмет</label>
            <button
              onClick={() => setSubjectOpen(v => !v)}
              className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between text-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2">
                <span className={selectedSubject ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400 dark:text-gray-500"}>
                  {selectedSubject?.name ?? "Выберите предмет"}
                </span>
                {selectedSubject?.exam_type && (
                  <span className="text-xs bg-brand-700/10 text-brand-700 px-2 py-0.5 rounded-full">
                    {selectedSubject.exam_type}
                  </span>
                )}
              </div>
              <ChevronIcon open={subjectOpen} />
            </button>
            {subjectOpen && (
              <div className="mt-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {filteredSubjects.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Нет доступных предметов</div>
                ) : filteredSubjects.map(subj => (
                  <button
                    key={subj.id}
                    onClick={() => handleSelectSubject(subj)}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-colors ${
                      selectedSubject?.id === subj.id ? "bg-brand-700/10 text-brand-700 font-semibold" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {subj.exam_type && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        subj.exam_type === "ЕГЭ" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {subj.exam_type}
                      </span>
                    )}
                    <span>{subj.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dates + Time — shown after subject selected */}
        {selectedSubject && matchedSession && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Дата проведения</label>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
                {allDates.map(d => {
                  const date = new Date(d);
                  const day = date.getDate();
                  const month = date.toLocaleDateString("ru", { month: "short" });
                  const active = selectedDate === d;
                  return (
                    <button
                      key={d}
                      onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                      className={`shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        active ? "bg-brand-700 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm"
                      }`}
                    >
                      <span className={`text-xl font-bold leading-none ${active ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>{day}</span>
                      <span className={`text-xs mt-0.5 ${active ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}>{month}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Время проведения</label>
              <div className="flex gap-2 flex-wrap">
                {slotsForDate.map(slot => {
                  const active = selectedSlot?.id === slot.id;
                  const full = slot.available_seats === 0;
                  const alreadyRegistered = slot.is_registered;
                  const disabled = full || alreadyRegistered;
                  const low = slot.available_seats > 0 && slot.available_seats <= 5;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => !disabled && setSelectedSlot(slot)}
                      disabled={disabled}
                      className={`rounded-2xl px-4 py-3 flex flex-col items-center min-w-[80px] transition-all ${
                        alreadyRegistered ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 cursor-not-allowed" :
                        full ? "bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed" :
                        active ? "bg-brand-700 text-white" : "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <span className={`text-base font-bold ${active ? "text-white" : alreadyRegistered ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{slot.start_time}</span>
                      {alreadyRegistered ? (
                        <span className="text-[11px] mt-0.5 text-emerald-600 dark:text-emerald-400">Записан</span>
                      ) : slot.available_seats > 0 ? (
                        <span className={`text-[11px] mt-0.5 ${active ? "text-white/80" : low ? "text-red-500" : "text-emerald-600"}`}>
                          {slot.available_seats} {low ? "места" : "мест"}
                        </span>
                      ) : (
                        <span className="text-[11px] mt-0.5 text-gray-400 dark:text-gray-500">Занято</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {matchedSession.notes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-2xl p-3.5 flex gap-2.5 text-sm text-amber-800 dark:text-amber-300">
                <span className="shrink-0">ⓘ</span>
                <span>{matchedSession.notes}</span>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={!selectedSlot || registering}
              className="w-full py-4 bg-brand-700 text-white rounded-2xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {registering ? "Записываем..." : "Записаться на экзамен"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" strokeWidth={2}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
