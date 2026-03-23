import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "./ui/table";
import { useState, useMemo, useEffect, useRef } from "react";
import { LessonDetailsForm } from "./LessonDetailsForm";
import { ChevronLeft, ChevronRight, Loader2, Eye, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Lesson } from "../types/api";

interface LessonsTabProps {
  groupId: string;
  groupName: string;
  initialLessonId?: string | null;
  onDetailOpen?: (open: boolean) => void;
}

export function LessonsTab({ groupId, groupName: _groupName, initialLessonId, onDetailOpen }: LessonsTabProps) {
  const { user: _user } = useAuth();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const autoOpenedRef = useRef(false);

  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    onDetailOpen?.(true);
  };

  const closeLesson = () => {
    setSelectedLesson(null);
    onDetailOpen?.(false);
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    loadLessons();
  }, [groupId]);

  // Auto-open lesson when returning from a student card (only once)
  useEffect(() => {
    if (initialLessonId && lessons.length > 0 && !autoOpenedRef.current) {
      const lesson = lessons.find((l) => l.id === initialLessonId);
      if (lesson) {
        autoOpenedRef.current = true;
        openLesson(lesson);
      }
    }
  }, [initialLessonId, lessons]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLessons(groupId);
      setLessons(data);
    } catch (err) {
      console.error("Failed to load lessons:", err);
      setError("Не удалось загрузить уроки");
      toast.error("Не удалось загрузить уроки");
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  const filteredLessons = useMemo(() => {
    const filtered = lessons.filter((lesson) => {
      const lessonDate = new Date(lesson.date);
      const lessonMonth = lessonDate.getMonth();
      const lessonYear = lessonDate.getFullYear();
      return lessonMonth === currentMonth && lessonYear === currentYear;
    });

    // Sort by date ascending (oldest first), then by time
    return filtered.sort((a, b) => {
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
  }, [lessons, currentMonth, currentYear]);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let result = "";
    if (hours > 0) result += `${hours} ч`;
    if (mins > 0) {
      if (hours > 0) result += " ";
      result += `${mins} мин`;
    }
    return result || "—";
  };

  const getStatusText = (lesson: Lesson) => {
    if (lesson.is_cancelled) return { text: "Отменён", mobileCls: "bg-red-100 text-red-700", tableCls: "bg-red-100 text-red-700" };
    if (lesson.status === "conducted") return { text: "Проведён", mobileCls: "bg-green-100 text-green-700", tableCls: "bg-green-100 text-green-700" };
    return { text: "Не проведён", mobileCls: "bg-amber-100 text-amber-700", tableCls: "" };
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleCancelLesson = async (lesson: Lesson) => {
    try {
      await api.updateLesson(lesson.id, { is_cancelled: !lesson.is_cancelled });
      await loadLessons();
    } catch (err) {
      console.error("Failed to update lesson:", err);
      alert("Ошибка при обновлении урока");
    }
  };

  if (selectedLesson) {
    return (
      <LessonDetailsForm
        lesson={selectedLesson}
        onClose={() => {
          closeLesson();
          loadLessons();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadLessons}>Попробовать снова</Button>
      </div>
    );
  }

  const shortMonthNames = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  const getLessonMeta = (lesson: Lesson) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lessonDate = new Date(lesson.date);
    lessonDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lessonDate.getTime()) / (1000 * 60 * 60 * 24));
    const isUncompleted = daysDiff > 1 && lesson.status !== "conducted" && !lesson.is_cancelled;
    return { isUncompleted };
  };

  const getEndTime = (time?: string, duration?: number) => {
    if (!time || !duration) return null;
    const [h, m] = time.split(":").map(Number);
    const totalMin = h * 60 + m + duration;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-semibold">Уроки группы</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredLessons.length === 0 ? (
          <div className="text-center text-slate-400 py-10">Нет уроков в этом месяце</div>
        ) : (
          filteredLessons.map((lesson) => {
            const status = getStatusText(lesson);
            const isCancelled = lesson.is_cancelled;
            const hasDetails = lesson.status === "conducted";
            const { isUncompleted } = getLessonMeta(lesson);
            const lessonDate = new Date(lesson.date);
            const day = lessonDate.getDate();
            const mon = shortMonthNames[lessonDate.getMonth()];
            const endTime = getEndTime(lesson.time, lesson.duration);
            const badgeClass = isUncompleted
              ? "bg-red-100 text-red-700"
              : status.mobileCls || "bg-slate-100 text-slate-600";

            const accentColor = isCancelled
              ? "bg-slate-300"
              : hasDetails
              ? "bg-indigo-500"
              : isUncompleted
              ? "bg-red-400"
              : "bg-amber-400";

            return (
              <div
                key={lesson.id}
                className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${isCancelled ? "opacity-60" : ""}`}
              >
                <div className="flex">
                  {/* Left accent */}
                  <div className={`w-1 shrink-0 ${accentColor}`} />

                  <div className="flex-1 p-4">
                    <div className="flex gap-3">
                      {/* Date box */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                        <span className="text-lg font-bold leading-none">{day}</span>
                        <span className="text-[10px] font-medium leading-none mt-0.5">{mon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold text-slate-900 ${isCancelled ? "line-through" : ""}`}>
                            {lesson.time
                              ? `${lesson.time}${endTime ? ` – ${endTime}` : ""}`
                              : "Время не указано"}
                          </span>
                          <Badge variant="secondary" className={`${badgeClass} shrink-0 text-xs font-medium`}>
                            {status.text}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 overflow-hidden">
                          {lesson.duration && (
                            <span className="shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatDuration(lesson.duration)}
                            </span>
                          )}
                          {lesson.duration && <span className="shrink-0">·</span>}
                          <span className={`truncate ${isCancelled ? "line-through" : ""}`}>
                            {lesson.topic || "Тема не указана"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {hasDetails ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                          onClick={() => openLesson(lesson)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Просмотр
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                            onClick={() => openLesson(lesson)}
                            disabled={isCancelled}
                          >
                            ✓ Провести
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCancelLesson(lesson)}
                          >
                            {isCancelled ? "Восстановить" : "Отменить"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Нет уроков в этом месяце
                </TableCell>
              </TableRow>
            ) : (
              filteredLessons.map((lesson) => {
                const status = getStatusText(lesson);
                const isCancelled = lesson.is_cancelled;
                const hasDetails = lesson.status === "conducted";
                const { isUncompleted } = getLessonMeta(lesson);
                const lessonDate = new Date(lesson.date);
                const formatted = lessonDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

                return (
                  <TableRow key={lesson.id} className={isCancelled ? "opacity-60" : ""}>
                    <TableCell className={`font-medium ${isCancelled ? "line-through" : ""}`}>
                      {formatted}
                    </TableCell>
                    <TableCell className={isCancelled ? "line-through" : ""}>
                      {lesson.time || "—"}
                    </TableCell>
                    <TableCell className={`max-w-xs ${isCancelled ? "line-through" : ""}`}>
                      {lesson.topic || "—"}
                    </TableCell>
                    <TableCell className={isCancelled ? "line-through" : ""}>
                      {formatDuration(lesson.duration)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={isUncompleted ? "bg-red-100 text-red-700" : (status.tableCls || "")}
                      >
                        {status.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasDetails ? (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openLesson(lesson)}>
                            Просмотр
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openLesson(lesson)} disabled={isCancelled}>
                              Провести
                            </Button>
                            <Button size="sm" variant={isCancelled ? "default" : "outline"} onClick={() => handleCancelLesson(lesson)}>
                              {isCancelled ? "Восстановить" : "Отменить"}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}