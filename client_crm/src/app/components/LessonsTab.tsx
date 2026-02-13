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
import { useState, useMemo } from "react";
import { LessonDetailsForm } from "./LessonDetailsForm";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Lesson {
  id: string;
  date: string;
  time: string;
  group: string;
  topic: string;
  duration: string;
  status: "Проведен" | "Не проведен";
  hasDetails?: boolean;
  isCancelled?: boolean;
}

const mockLessons: Lesson[] = [
  {
    id: "1",
    date: "12.02.2026",
    time: "16:30",
    group: "Информатика ЕГЭ Л_ЧТ",
    topic: "Алгебра логики. Решение 2 задания",
    duration: "180 мин",
    status: "Проведен",
    hasDetails: true,
  },
  {
    id: "2",
    date: "26.02.2026",
    time: "16:30",
    group: "Информатика ЕГЭ Л_ЧТ",
    topic: "—",
    duration: "180 мин",
    status: "Не проведен",
  },
  {
    id: "3",
    date: "05.03.2026",
    time: "16:30",
    group: "Информатика ЕГЭ Л_ЧТ",
    topic: "—",
    duration: "180 мин",
    status: "Не проведен",
  },
  {
    id: "4",
    date: "12.03.2026",
    time: "16:30",
    group: "Информатика ЕГЭ Л_ЧТ",
    topic: "—",
    duration: "180 мин",
    status: "Не проведен",
  },
  {
    id: "5",
    date: "19.03.2026",
    time: "16:30",
    group: "Информатика ЕГЭ Л_ЧТ",
    topic: "—",
    duration: "180 мин",
    status: "Не проведен",
  },
  {
    id: "6",
    date: "26.03.2026",
    time: "16:30",
    group: "Информатика ЕГЭ Л_ЧТ",
    topic: "—",
    duration: "180 мин",
    status: "Не проведен",
  },
];

interface LessonsTabProps {
  groupId: string;
  groupName: string;
}

export function LessonsTab({ groupId, groupName }: LessonsTabProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cancelledLessons, setCancelledLessons] = useState<Set<string>>(new Set());

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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
    return mockLessons.filter((lesson) => {
      const [day, month, year] = lesson.date.split(".");
      const lessonMonth = parseInt(month) - 1;
      const lessonYear = parseInt(year);
      return lessonMonth === currentMonth && lessonYear === currentYear;
    });
  }, [currentMonth, currentYear]);

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

  const handleCancelLesson = (lessonId: string) => {
    setCancelledLessons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  if (selectedLesson) {
    return (
      <LessonDetailsForm
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Мои уроки</h2>
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
                const isCancelled = cancelledLessons.has(lesson.id);
                return (
                  <TableRow key={lesson.id} className={isCancelled ? "opacity-60" : ""}>
                    <TableCell className={`font-medium ${isCancelled ? "line-through" : ""}`}>
                      {lesson.date}
                    </TableCell>
                    <TableCell className={isCancelled ? "line-through" : ""}>
                      {lesson.time}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${isCancelled ? "line-through" : ""}`}>
                        {lesson.group}
                        <Badge variant="secondary" className="text-xs">
                          Авто
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={`max-w-md ${isCancelled ? "line-through" : ""}`}>
                      {lesson.topic}
                    </TableCell>
                    <TableCell className={`text-blue-600 ${isCancelled ? "line-through" : ""}`}>
                      {lesson.duration}
                    </TableCell>
                    <TableCell>
                      {isCancelled ? (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                          Отменен
                        </Badge>
                      ) : lesson.status === "Проведен" ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 hover:bg-green-100"
                        >
                          {lesson.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{lesson.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {lesson.hasDetails ? (
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
                              onClick={() => handleCancelLesson(lesson.id)}
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