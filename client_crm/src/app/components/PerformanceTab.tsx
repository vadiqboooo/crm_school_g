import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { getGradeColor, getAttendanceColor } from "../lib/gradeUtils";
import type { Lesson, LessonAttendance, AttendanceStatus } from "../types/api";

interface StudentPerformanceData {
  studentId: string;
  studentName: string;
  lessons: {
    lessonId: string;
    lessonDate: string;
    lessonTopic: string;
    homework: string;
    attendance?: AttendanceStatus;
    lateMinutes?: number;
    homeworkGrade?: string;
    lessonGrade?: string;
    isLessonConducted: boolean;
    isBeforeJoining: boolean;
  }[];
}

interface PerformanceTabProps {
  groupId: string;
  groupName: string;
}

export function PerformanceTab({ groupId }: PerformanceTabProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendanceData, setAttendanceData] = useState<Map<string, LessonAttendance[]>>(new Map());
  const [groupStudents, setGroupStudents] = useState<Array<{
    id: string;
    student_id: string;
    joined_at: string;
    is_archived: boolean;
    student?: { id: string; first_name: string; last_name: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [showAttendance, setShowAttendance] = useState(true);
  const [showHomework, setShowHomework] = useState(true);
  const [showLessonWork, setShowLessonWork] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const groupStudentsData = await api.getGroupStudents(groupId);
      setGroupStudents(groupStudentsData.filter(gs => !gs.is_archived));

      const lessonsData = await api.getLessons(groupId);
      setLessons(lessonsData);

      const attendanceMap = new Map<string, LessonAttendance[]>();
      await Promise.all(
        lessonsData.map(async (lesson) => {
          try {
            const attendance = await api.getLessonAttendance(lesson.id);
            attendanceMap.set(lesson.id, attendance);
          } catch (err) {
            console.error(`Failed to load attendance for lesson ${lesson.id}:`, err);
          }
        })
      );
      setAttendanceData(attendanceMap);

      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setSelectedMonth(currentMonthKey);
    } catch (err) {
      console.error("Failed to load performance data:", err);
      toast.error("Не удалось загрузить данные успеваемости");
    } finally {
      setLoading(false);
    }
  };

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    lessons.forEach((lesson) => {
      const date = new Date(lesson.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthKey);
    });
    return Array.from(months)
      .sort()
      .map((monthKey) => {
        const [year, month] = monthKey.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthName = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
        return { value: monthKey, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
      });
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    if (!selectedMonth) return [];
    return lessons
      .filter((lesson) => {
        const date = new Date(lesson.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === selectedMonth;
      })
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.time || "00:00").localeCompare(b.time || "00:00");
      });
  }, [lessons, selectedMonth]);

  const performanceData: StudentPerformanceData[] = useMemo(() => {
    return groupStudents.map((gs) => {
      const student = gs.student!;
      const joinedDate = new Date(gs.joined_at);
      joinedDate.setHours(0, 0, 0, 0);
      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        lessons: filteredLessons.map((lesson) => {
          const lessonDate = new Date(lesson.date);
          lessonDate.setHours(0, 0, 0, 0);
          const isBeforeJoining = lessonDate < joinedDate;
          const attendance = attendanceData.get(lesson.id)?.find((a) => a.student_id === student.id);
          const isLessonConducted = lesson.status === "conducted" && !lesson.is_cancelled;
          return {
            lessonId: lesson.id,
            lessonDate: lesson.date,
            lessonTopic: lesson.topic || "Тема не указана",
            homework: lesson.homework || "Не указано",
            attendance: attendance?.attendance,
            lateMinutes: attendance?.late_minutes,
            homeworkGrade: attendance?.homework_grade,
            lessonGrade: attendance?.lesson_grade,
            isLessonConducted,
            isBeforeJoining,
          };
        }),
      };
    });
  }, [groupStudents, filteredLessons, attendanceData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (filteredLessons.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold">Успеваемость группы</h2>
          {monthOptions.length > 0 && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Выберите месяц" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500">Нет проведённых уроков в выбранном месяце</p>
        </div>
      </div>
    );
  }

  const filterPill = (active: boolean, label: string, toggle: () => void) => (
    <button
      onClick={toggle}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-blue-50 border-blue-200 text-blue-700"
          : "bg-white border-slate-200 text-slate-400 line-through"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold">Успеваемость группы</h2>
        {monthOptions.length > 0 && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Выберите месяц" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Filters — pill toggles */}
      <div className="flex flex-wrap gap-2">
        {filterPill(showAttendance, "П — Посещение", () => setShowAttendance(!showAttendance))}
        {filterPill(showHomework, "ДЗ — Домашние задания", () => setShowHomework(!showHomework))}
        {filterPill(showLessonWork, "Р — Работа на уроке", () => setShowLessonWork(!showLessonWork))}
      </div>

      {/* Desktop-only legend */}
      <div className="hidden sm:flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-600">Посещение:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#d0db9d" }} /> Присутствовал</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#fad548" }} /> Опоздал</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#ed6c72" }} /> Отсутствовал</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-600">Оценки:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#d0db9d" }} /> 5</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#fad548" }} /> 4</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#f3c23c" }} /> 3</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: "#ed6c72" }} /> 2</span>
        </div>
      </div>

      {/* Performance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 border-r text-left px-3 py-2 text-sm font-semibold text-slate-700 min-w-[120px] max-w-[150px]">
                    Ученик
                  </th>
                  {filteredLessons.map((lesson) => (
                    <th key={lesson.id} className="border-r text-center px-0 py-2 text-xs font-semibold text-slate-700">
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer hover:text-blue-600 transition-colors px-1 whitespace-nowrap">
                            {formatDate(lesson.date)}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-72">
                          <div className="space-y-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-1">Тема урока:</h4>
                              <p className="text-sm text-slate-600">{lesson.topic || "Не указана"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-1">Домашнее задание:</h4>
                              <p className="text-sm text-slate-600">{lesson.homework || "Не указано"}</p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {performanceData.map((student) => (
                  <tr key={student.studentId} className="border-b hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-3 py-2 text-xs font-medium text-slate-900 min-w-[120px] max-w-[150px] leading-tight">
                      {student.studentName}
                    </td>
                    {student.lessons.map((lessonData) => (
                      <td key={lessonData.lessonId} className="border-r p-0">
                        <div className="flex h-full">
                          {/* Посещение */}
                          {showAttendance && (
                            <div className="flex-1 flex flex-col min-w-[24px]">
                              <span className="text-[8px] text-slate-400 text-center py-0.5 bg-slate-50 leading-none">П</span>
                              <div
                                className="h-9 flex items-center justify-center text-[11px] font-semibold"
                                style={{
                                  backgroundColor: lessonData.isBeforeJoining ? "#f1f5f9" : getAttendanceColor(lessonData.attendance, lessonData.isLessonConducted),
                                  color: lessonData.isBeforeJoining ? "#cbd5e1" : lessonData.isLessonConducted ? "white" : "#94a3b8",
                                }}
                              >
                                {lessonData.isBeforeJoining ? "·" : !lessonData.isLessonConducted ? "-" : lessonData.attendance === "absent" ? "Н" : lessonData.attendance === "late" ? "О" : lessonData.attendance === "trial" ? "П" : lessonData.attendance === "present" ? "✓" : "-"}
                              </div>
                            </div>
                          )}
                          {/* ДЗ */}
                          {showHomework && (
                            <div className="flex-1 flex flex-col border-l min-w-[24px]">
                              <span className="text-[8px] text-slate-400 text-center py-0.5 bg-slate-50 leading-none">ДЗ</span>
                              <div
                                className="h-9 flex items-center justify-center text-[11px] font-semibold"
                                style={{
                                  backgroundColor: lessonData.isBeforeJoining ? "#f1f5f9" : getGradeColor(lessonData.homeworkGrade, lessonData.isLessonConducted),
                                  color: lessonData.isBeforeJoining ? "#cbd5e1" : lessonData.isLessonConducted && lessonData.homeworkGrade ? "white" : "#94a3b8",
                                }}
                              >
                                {lessonData.isBeforeJoining ? "·" : lessonData.homeworkGrade || "-"}
                              </div>
                            </div>
                          )}
                          {/* Работа на уроке */}
                          {showLessonWork && (
                            <div className="flex-1 flex flex-col border-l min-w-[24px]">
                              <span className="text-[8px] text-slate-400 text-center py-0.5 bg-slate-50 leading-none">Р</span>
                              <div
                                className="h-9 flex items-center justify-center text-[11px] font-semibold"
                                style={{
                                  backgroundColor: lessonData.isBeforeJoining ? "#f1f5f9" : getGradeColor(lessonData.lessonGrade, lessonData.isLessonConducted),
                                  color: lessonData.isBeforeJoining ? "#cbd5e1" : lessonData.isLessonConducted && lessonData.lessonGrade ? "white" : "#94a3b8",
                                }}
                              >
                                {lessonData.isBeforeJoining ? "·" : lessonData.lessonGrade || "-"}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
