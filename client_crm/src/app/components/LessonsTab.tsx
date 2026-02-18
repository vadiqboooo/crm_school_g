import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card } from "./ui/card";
import { useState, useMemo, useEffect } from "react";
import { LessonDetailsForm } from "./LessonDetailsForm";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Lesson } from "../types/api";

interface LessonsTabProps {
  groupId: string;
  groupName: string;
}

export function LessonsTab({ groupId, groupName }: LessonsTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    loadLessons();
  }, [groupId]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

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
    if (lesson.is_cancelled) return { text: "Отменен", color: "bg-red-100 text-red-700" };
    if (lesson.status === "conducted") return { text: "Проведен", color: "bg-green-100 text-green-700" };
    return { text: "Не проведен", color: "" };
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

  const handleCreateLesson = async () => {
    try {
      const newLesson = {
        group_id: groupId,
        date: new Date().toISOString().split("T")[0],
        is_cancelled: false,
        work_type: "none" as const,
        had_previous_homework: false,
      };
      const created = await api.createLesson(newLesson);
      setSelectedLesson(created);
      await loadLessons();
    } catch (err) {
      console.error("Failed to create lesson:", err);
      alert("Ошибка при создании урока");
    }
  };

  if (selectedLesson) {
    return (
      <LessonDetailsForm
        lesson={selectedLesson}
        onClose={() => {
          setSelectedLesson(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Уроки группы</h2>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button onClick={handleCreateLesson} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Добавить урок
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>Группа</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLessons.length > 0 ? (
              filteredLessons.map((lesson) => {
                const status = getStatusText(lesson);
                const isCancelled = lesson.is_cancelled;
                const hasDetails = lesson.status === "conducted";
                return (
                  <TableRow key={lesson.id} className={isCancelled ? "opacity-60" : ""}>
                    <TableCell className={`font-medium ${isCancelled ? "line-through" : ""}`}>
                      {formatDate(lesson.date)}
                    </TableCell>
                    <TableCell className={isCancelled ? "line-through" : ""}>
                      {lesson.time || "—"}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${isCancelled ? "line-through" : ""}`}>
                        {groupName}
                      </div>
                    </TableCell>
                    <TableCell className={`max-w-md ${isCancelled ? "line-through" : ""}`}>
                      {lesson.topic || "—"}
                    </TableCell>
                    <TableCell className={`text-blue-600 ${isCancelled ? "line-through" : ""}`}>
                      {formatDuration(lesson.duration)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={status.color ? `${status.color} hover:${status.color}` : ""}
                      >
                        {status.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasDetails ? (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            Просмотр
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => setSelectedLesson(lesson)}
                              disabled={isCancelled}
                            >
                              Провести
                            </Button>
                            <Button
                              size="sm"
                              variant={isCancelled ? "default" : "outline"}
                              onClick={() => handleCancelLesson(lesson)}
                            >
                              {isCancelled ? "Восстановить" : "Отменить"}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  Нет уроков в этом месяце
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}