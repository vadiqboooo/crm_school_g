import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "./ui/checkbox";
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
  }[];
}

interface PerformanceTabProps {
  groupId: string;
  groupName: string;
}

export function PerformanceTab({ groupId }: PerformanceTabProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendanceData, setAttendanceData] = useState<Map<string, LessonAttendance[]>>(new Map());
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
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

      // Load group to get students
      const groupData = await api.getGroup(groupId);
      setStudents(groupData.students);

      // Load all lessons
      const lessonsData = await api.getLessons(groupId);
      setLessons(lessonsData);

      // Load attendance for all lessons
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

      // Set default month to current month
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

  // Get unique months from lessons
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    lessons.forEach((lesson) => {
      const date = new Date(lesson.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthKey);
    });

    return Array.from(months)
      .sort() // Sort from oldest to newest
      .map((monthKey) => {
        const [year, month] = monthKey.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthName = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
        return { value: monthKey, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
      });
  }, [lessons]);

  // Filter lessons by selected month
  const filteredLessons = useMemo(() => {
    if (!selectedMonth) return [];

    return lessons
      .filter((lesson) => {
        const date = new Date(lesson.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === selectedMonth;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        // First, sort by date
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        // If same date, sort by time
        const timeA = a.time || "00:00";
        const timeB = b.time || "00:00";
        return timeA.localeCompare(timeB);
      });
  }, [lessons, selectedMonth]);

  // Build student performance data
  const performanceData: StudentPerformanceData[] = useMemo(() => {
    return students.map((student) => ({
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`,
      lessons: filteredLessons.map((lesson) => {
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
        };
      }),
    }));
  }, [students, filteredLessons, attendanceData]);

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
      <div className="text-center py-8">
        <p className="text-slate-600">Нет проведенных уроков в выбранном месяце</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Успеваемость группы</h2>

        {/* Month Filter */}
        {monthOptions.length > 0 && (
          <div className="w-64">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите месяц" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-4 text-sm flex-1">
              <div>
                <h4 className="font-semibold mb-2 text-slate-700">Посещение:</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#d0db9d" }} />
                    <span className="text-slate-600">Присутствовал</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#fad548" }} />
                    <span className="text-slate-600">Опоздал</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ed6c72" }} />
                    <span className="text-slate-600">Отсутствовал</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-slate-700">Оценки:</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#d0db9d" }} />
                    <span className="text-slate-600">5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#fad548" }} />
                    <span className="text-slate-600">4</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f3c23c" }} />
                    <span className="text-slate-600">3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ed6c72" }} />
                    <span className="text-slate-600">2</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="ml-6 pl-6 border-l">
              <h4 className="font-semibold mb-2 text-slate-700">Фильтры:</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="attendance" checked={showAttendance} onCheckedChange={setShowAttendance} />
                  <label htmlFor="attendance" className="text-sm text-slate-600 cursor-pointer">
                    Посещение
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="homework" checked={showHomework} onCheckedChange={setShowHomework} />
                  <label htmlFor="homework" className="text-sm text-slate-600 cursor-pointer">
                    Домашние задания
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="lessonWork" checked={showLessonWork} onCheckedChange={setShowLessonWork} />
                  <label htmlFor="lessonWork" className="text-sm text-slate-600 cursor-pointer">
                    Работа на уроке
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 border-r text-left px-2 py-1.5 text-sm font-semibold text-slate-700 min-w-[150px]">
                    Ученик
                  </th>
                  {filteredLessons.map((lesson) => (
                    <th
                      key={lesson.id}
                      className="border-r text-center px-0 py-1.5 text-sm font-semibold text-slate-700"
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition-colors px-1">
                            {formatDate(lesson.date)}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
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
                    <td className="sticky left-0 z-10 bg-white border-r px-2 py-1.5 text-sm font-medium text-slate-900">
                      {student.studentName}
                    </td>
                    {student.lessons.map((lessonData) => (
                      <td key={lessonData.lessonId} className="border-r p-0">
                        <div className="flex h-full">
                          {/* Посещение */}
                          {showAttendance && (
                            <div className="flex-1 flex flex-col">
                              <span className="text-[9px] text-slate-500 text-center py-0.5 bg-slate-50">П</span>
                              <div
                                className="h-10 flex items-center justify-center text-xs font-semibold"
                                style={{
                                  backgroundColor: getAttendanceColor(lessonData.attendance, lessonData.isLessonConducted),
                                  color: lessonData.isLessonConducted ? "white" : "#94a3b8"
                                }}
                              >
                                {!lessonData.isLessonConducted
                                  ? "-"
                                  : lessonData.attendance === "absent"
                                  ? "Н"
                                  : lessonData.attendance === "late"
                                  ? "О"
                                  : lessonData.attendance === "trial"
                                  ? "П"
                                  : lessonData.attendance === "present"
                                  ? "✓"
                                  : "-"}
                              </div>
                            </div>
                          )}
                          {/* ДЗ */}
                          {showHomework && (
                            <div className="flex-1 flex flex-col border-l">
                              <span className="text-[9px] text-slate-500 text-center py-0.5 bg-slate-50">ДЗ</span>
                              <div
                                className="h-10 flex items-center justify-center text-xs font-semibold"
                                style={{
                                  backgroundColor: getGradeColor(lessonData.homeworkGrade, lessonData.isLessonConducted),
                                  color: lessonData.isLessonConducted && lessonData.homeworkGrade ? "white" : "#94a3b8"
                                }}
                              >
                                {lessonData.homeworkGrade || "-"}
                              </div>
                            </div>
                          )}
                          {/* Работа на уроке */}
                          {showLessonWork && (
                            <div className="flex-1 flex flex-col border-l">
                              <span className="text-[9px] text-slate-500 text-center py-0.5 bg-slate-50">Р</span>
                              <div
                                className="h-10 flex items-center justify-center text-xs font-semibold"
                                style={{
                                  backgroundColor: getGradeColor(lessonData.lessonGrade, lessonData.isLessonConducted),
                                  color: lessonData.isLessonConducted && lessonData.lessonGrade ? "white" : "#94a3b8"
                                }}
                              >
                                {lessonData.lessonGrade || "-"}
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
