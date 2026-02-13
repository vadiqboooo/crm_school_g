import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState } from "react";
import { Checkbox } from "./ui/checkbox";

interface LessonPerformance {
  lessonNumber: number;
  lessonDate: string;
  lessonTopic?: string; // Тема урока
  homeworkTask?: string; // Домашнее задание
  attendance: "present" | "late" | "absent";
  homeworkPercent?: number; // 0-100
  lessonWorkPercent?: number; // 0-100 (если была работа на уроке)
}

interface StudentPerformance {
  id: string;
  name: string;
  lessons: LessonPerformance[];
}

// Mock данные
const mockPerformance: StudentPerformance[] = [
  {
    id: "1",
    name: "Алиев Андрей",
    lessons: [
      { lessonNumber: 1, lessonDate: "01.09.2025", lessonTopic: "Введение в алгебру", homeworkTask: "Решить задачи №1-5 из учебника", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 2, lessonDate: "05.09.2025", lessonTopic: "Линейные уравнения", homeworkTask: "Задачи №10-15, стр. 23", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 3, lessonDate: "08.09.2025", lessonTopic: "Квадратные уравнения", homeworkTask: "Примеры №20-25, подготовиться к тесту", attendance: "present", homeworkPercent: 0, lessonWorkPercent: 90 },
      { lessonNumber: 4, lessonDate: "12.09.2025", lessonTopic: "Системы уравнений", homeworkTask: "Решить системы уравнений №30-35", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 5, lessonDate: "15.09.2025", lessonTopic: "Неравенства", homeworkTask: "Задачи на неравенства №40-45", attendance: "late", homeworkPercent: 100 },
      { lessonNumber: 6, lessonDate: "19.09.2025", lessonTopic: "Функции и графики", homeworkTask: "Построить графики функций №50-52", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 75 },
      { lessonNumber: 7, lessonDate: "22.09.2025", lessonTopic: "Степени и корни", homeworkTask: "Упростить выражения №60-65", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 8, lessonDate: "26.09.2025", lessonTopic: "Тригонометрия", homeworkTask: "Задачи на тригонометрию №70-75", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 9, lessonDate: "29.09.2025", lessonTopic: "Логарифмы", homeworkTask: "Решить логарифмические уравнения №80-85", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 10, lessonDate: "03.10.2025", lessonTopic: "Производные", homeworkTask: "Найти производные функций №90-95", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 11, lessonDate: "06.10.2025", lessonTopic: "Интегралы", homeworkTask: "Вычислить интегралы №100-105", attendance: "present", homeworkPercent: 0 },
      { lessonNumber: 12, lessonDate: "10.10.2025", lessonTopic: "Комбинаторика", homeworkTask: "Задачи на комбинаторику №110-115", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 85 },
      { lessonNumber: 13, lessonDate: "13.10.2025", lessonTopic: "Вероятность", homeworkTask: "Решить задачи на вероятность №120-125", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 14, lessonDate: "17.10.2025", lessonTopic: "Статистика", homeworkTask: "Проанализировать данные, задачи №130-135", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 15, lessonDate: "20.10.2025", lessonTopic: "Последовательности", homeworkTask: "Найти n-й член поледовательности №140-145", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 16, lessonDate: "24.10.2025", lessonTopic: "Прогрессии", homeworkTask: "Решить задачи на прогрессии №150-155", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 17, lessonDate: "27.10.2025", lessonTopic: "Матрицы", homeworkTask: "Выполнить операции с матрицами №160-165", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 18, lessonDate: "31.10.2025", lessonTopic: "Итоговое повторение", homeworkTask: "Повторить все темы, подготовиться к контрольной", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 95 },
    ],
  },
  {
    id: "2",
    name: "Иванов Петр",
    lessons: [
      { lessonNumber: 1, lessonDate: "01.09.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 2, lessonDate: "05.09.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 3, lessonDate: "08.09.2025", attendance: "present", homeworkPercent: 60, lessonWorkPercent: 70 },
      { lessonNumber: 4, lessonDate: "12.09.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 5, lessonDate: "15.09.2025", attendance: "late", homeworkPercent: 0 },
      { lessonNumber: 6, lessonDate: "19.09.2025", attendance: "present", homeworkPercent: 60, lessonWorkPercent: 55 },
      { lessonNumber: 7, lessonDate: "22.09.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 8, lessonDate: "26.09.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 9, lessonDate: "29.09.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 10, lessonDate: "03.10.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 11, lessonDate: "06.10.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 12, lessonDate: "10.10.2025", attendance: "present", homeworkPercent: 0, lessonWorkPercent: 60 },
      { lessonNumber: 13, lessonDate: "13.10.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 14, lessonDate: "17.10.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 15, lessonDate: "20.10.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 16, lessonDate: "24.10.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 17, lessonDate: "27.10.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 18, lessonDate: "31.10.2025", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 70 },
    ],
  },
  {
    id: "3",
    name: "Сидоров Иван",
    lessons: [
      { lessonNumber: 1, lessonDate: "01.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 2, lessonDate: "05.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 3, lessonDate: "08.09.2025", attendance: "present", homeworkPercent: 100, lessonWorkPercent: 100 },
      { lessonNumber: 4, lessonDate: "12.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 5, lessonDate: "15.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 6, lessonDate: "19.09.2025", attendance: "present", homeworkPercent: 100, lessonWorkPercent: 95 },
      { lessonNumber: 7, lessonDate: "22.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 8, lessonDate: "26.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 9, lessonDate: "29.09.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 10, lessonDate: "03.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 11, lessonDate: "06.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 12, lessonDate: "10.10.2025", attendance: "present", homeworkPercent: 100, lessonWorkPercent: 100 },
      { lessonNumber: 13, lessonDate: "13.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 14, lessonDate: "17.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 15, lessonDate: "20.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 16, lessonDate: "24.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 17, lessonDate: "27.10.2025", attendance: "present", homeworkPercent: 100 },
      { lessonNumber: 18, lessonDate: "31.10.2025", attendance: "present", homeworkPercent: 100, lessonWorkPercent: 100 },
    ],
  },
  {
    id: "4",
    name: "Петров Алексей",
    lessons: [
      { lessonNumber: 1, lessonDate: "01.09.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 2, lessonDate: "05.09.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 3, lessonDate: "08.09.2025", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 45 },
      { lessonNumber: 4, lessonDate: "12.09.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 5, lessonDate: "15.09.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 6, lessonDate: "19.09.2025", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 15 },
      { lessonNumber: 7, lessonDate: "22.09.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 8, lessonDate: "26.09.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 9, lessonDate: "29.09.2025", attendance: "late", homeworkPercent: 80 },
      { lessonNumber: 10, lessonDate: "03.10.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 11, lessonDate: "06.10.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 12, lessonDate: "10.10.2025", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 75 },
      { lessonNumber: 13, lessonDate: "13.10.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 14, lessonDate: "17.10.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 15, lessonDate: "20.10.2025", attendance: "present", homeworkPercent: 80 },
      { lessonNumber: 16, lessonDate: "24.10.2025", attendance: "absent", homeworkPercent: 0 },
      { lessonNumber: 17, lessonDate: "27.10.2025", attendance: "present", homeworkPercent: 60 },
      { lessonNumber: 18, lessonDate: "31.10.2025", attendance: "present", homeworkPercent: 80, lessonWorkPercent: 55 },
    ],
  },
];

// Функция для определения цвета фона ДЗ - более приглушенные цвета
const getHomeworkColor = (percent?: number) => {
  if (percent === undefined) return "bg-slate-100";
  if (percent > 80) return "#d0db9d"; // Зеленоватый
  if (percent > 50) return "#fad548"; // Яркий желтый
  if (percent > 0) return "#f3c23c"; // Желтый/оранжевый
  return "#ed6c72"; // Красный
};

// Функция для определения цвета фона работы на уроке - более приглушенные цвета
const getLessonWorkColor = (percent?: number) => {
  if (percent === undefined) return "bg-slate-100";
  if (percent > 80) return "#d0db9d"; // Зеленоватый
  if (percent >= 50) return "#fad548"; // Яркий желтый
  if (percent >= 20) return "#f3c23c"; // Желтый/оранжевый
  return "#ed6c72"; // Красный
};

// Функция для определения цвета посещения - более приглушенные цвета
const getAttendanceColor = (attendance: "present" | "late" | "absent") => {
  if (attendance === "present") return "#d0db9d"; // Зеленоватый
  if (attendance === "late") return "#fad548"; // Яркий желтый
  return "#ed6c72"; // Красный
};

interface PerformanceTabProps {
  groupId: string;
  groupName: string;
}

export function PerformanceTab({ groupId, groupName }: PerformanceTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("september");
  const [showAttendance, setShowAttendance] = useState(true);
  const [showHomework, setShowHomework] = useState(true);
  const [showLessonWork, setShowLessonWork] = useState(true);
  
  // Группировка уроков по месяцам
  const lessonsByMonth = {
    september: mockPerformance[0]?.lessons.filter((l) => l.lessonDate.includes(".09.")) || [],
    october: mockPerformance[0]?.lessons.filter((l) => l.lessonDate.includes(".10.")) || [],
  };

  const monthOptions = [
    { value: "september", label: "Сентябрь 2025" },
    { value: "october", label: "Октябрь 2025" },
  ];

  // Группировка уроков по дате (может быть несколько уроков в день)
  const groupLessonsByDate = (lessons: LessonPerformance[]) => {
    const grouped = new Map<string, LessonPerformance[]>();
    lessons.forEach(lesson => {
      const existing = grouped.get(lesson.lessonDate) || [];
      grouped.set(lesson.lessonDate, [...existing, lesson]);
    });
    return Array.from(grouped.entries()).map(([date, lessonsInDay]) => ({
      date,
      lessons: lessonsInDay,
    }));
  };

  const currentLessons = lessonsByMonth[selectedMonth as keyof typeof lessonsByMonth];
  const groupedByDate = groupLessonsByDate(currentLessons);

  // Функция для расчета процента качества студента
  const calculateQualityPercent = (student: StudentPerformance) => {
    const studentLessons = student.lessons.filter(l => 
      lessonsByMonth[selectedMonth as keyof typeof lessonsByMonth].some(cl => cl.lessonDate === l.lessonDate)
    );
    
    if (studentLessons.length === 0) return 0;
    
    // Процент посещаемости (present = 100%, late = 50%, absent = 0%)
    const attendancePercents = studentLessons.map(l => {
      if (l.attendance === "present") return 100;
      if (l.attendance === "late") return 50;
      return 0;
    });
    const avgAttendance = attendancePercents.reduce((a, b) => a + b, 0) / attendancePercents.length;
    
    // Средний процент выполнения ДЗ
    const hwPercents = studentLessons
      .map(l => l.homeworkPercent)
      .filter(p => p !== undefined) as number[];
    const avgHomework = hwPercents.length > 0 
      ? hwPercents.reduce((a, b) => a + b, 0) / hwPercents.length 
      : 0;
    
    // Общий процент качества (50% посещаемость + 50% ДЗ)
    return Math.round((avgAttendance + avgHomework) / 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Успеваемость группы</h2>
        
        {/* Month Filter */}
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d0db9d' }} />
                    <span className="text-slate-600">Присутствовал</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fad548' }} />
                    <span className="text-slate-600">Опоздал</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ed6c72' }} />
                    <span className="text-slate-600">Отсутствовал</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-slate-700">ДЗ / Работа на уроке:</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d0db9d' }} />
                    <span className="text-slate-600">&gt;80%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fad548' }} />
                    <span className="text-slate-600">50-80%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f3c23c' }} />
                    <span className="text-slate-600">&lt;50%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ed6c72' }} />
                    <span className="text-slate-600">0%</span>
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
                  {groupedByDate.map((dayData) => {
                    // Получить тему урока и домашнее задание для этого дня
                    const lessonTopic = dayData.lessons[0]?.lessonTopic || "Тема не указана";
                    const homeworkTask = dayData.lessons[0]?.homeworkTask || "Домашнее задание не указано";
                    
                    return (
                      <th
                        key={dayData.date}
                        className="border-r text-center px-0 py-1.5 text-sm font-semibold text-slate-700"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition-colors px-1">
                              {dayData.date}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Тема урока:</h4>
                                <p className="text-sm text-slate-600">{lessonTopic}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Домашнее задание:</h4>
                                <p className="text-sm text-slate-600">{homeworkTask}</p>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {mockPerformance.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-2 py-1.5 text-sm font-medium text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <span>{student.name}</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {calculateQualityPercent(student)}%
                        </span>
                      </div>
                    </td>
                    {groupedByDate.map((dayData) => {
                      // Найти все уроки студента в этот день
                      const studentLessonsInDay = student.lessons.filter(
                        l => l.lessonDate === dayData.date
                      );
                      
                      if (studentLessonsInDay.length === 0) {
                        return (
                          <td key={dayData.date} className="border-r p-0">
                            <div className="flex h-full">
                              <div className="flex-1 bg-gray-100" />
                            </div>
                          </td>
                        );
                      }

                      // Если есть уроки в этот день, показать статистику
                      // Посещение: если хотя бы на одном был - зеленая, если опоздал - желтая, если отсутствовал на всех - красная
                      const hasPresent = studentLessonsInDay.some(l => l.attendance === "present");
                      const hasLate = studentLessonsInDay.some(l => l.attendance === "late");
                      const allAbsent = studentLessonsInDay.every(l => l.attendance === "absent");
                      
                      const attendanceColor = getAttendanceColor(
                        allAbsent ? "absent" : hasLate && !hasPresent ? "late" : hasLate ? "late" : "present"
                      );

                      // ДЗ: среднее по всем урокам дня
                      const hwPercentages = studentLessonsInDay
                        .map(l => l.homeworkPercent)
                        .filter(p => p !== undefined) as number[];
                      const avgHwPercent = hwPercentages.length > 0
                        ? hwPercentages.reduce((a, b) => a + b, 0) / hwPercentages.length
                        : undefined;

                      // Работа на уроке: среднее если есть
                      const lwPercentages = studentLessonsInDay
                        .map(l => l.lessonWorkPercent)
                        .filter(p => p !== undefined) as number[];
                      const avgLwPercent = lwPercentages.length > 0
                        ? lwPercentages.reduce((a, b) => a + b, 0) / lwPercentages.length
                        : undefined;

                      return (
                        <td key={dayData.date} className="border-r p-0">
                          <div className="flex h-full">
                            {/* Посещение */}
                            {showAttendance && (
                              <div className="flex-1 flex flex-col">
                                <span className="text-[9px] text-slate-500 text-center py-0.5 bg-slate-50">П</span>
                                <div 
                                  className={`h-10 flex items-center justify-center text-white text-xs font-semibold`}
                                  style={{ backgroundColor: typeof attendanceColor === 'string' && attendanceColor.startsWith('#') ? attendanceColor : undefined }}
                                  {...(typeof attendanceColor === 'string' && !attendanceColor.startsWith('#') && { className: `h-10 ${attendanceColor} flex items-center justify-center text-white text-xs font-semibold` })}
                                >
                                  {allAbsent ? "Н" : hasLate ? "О" : "✓"}
                                </div>
                              </div>
                            )}
                            {/* ДЗ */}
                            {showHomework && (
                              <div className="flex-1 flex flex-col border-l">
                                <span className="text-[9px] text-slate-500 text-center py-0.5 bg-slate-50">ДЗ</span>
                                <div 
                                  className="h-10 flex items-center justify-center text-white text-xs font-semibold"
                                  style={{ 
                                    backgroundColor: typeof getHomeworkColor(avgHwPercent) === 'string' && getHomeworkColor(avgHwPercent).startsWith('#') 
                                      ? getHomeworkColor(avgHwPercent) 
                                      : undefined 
                                  }}
                                  {...(typeof getHomeworkColor(avgHwPercent) === 'string' && !getHomeworkColor(avgHwPercent).startsWith('#') && { 
                                    className: `h-10 ${getHomeworkColor(avgHwPercent)} flex items-center justify-center text-white text-xs font-semibold` 
                                  })}
                                >
                                  {avgHwPercent !== undefined ? `${Math.round(avgHwPercent)}` : "-"}
                                </div>
                              </div>
                            )}
                            {/* Работа на уроке (если была) */}
                            {showLessonWork && avgLwPercent !== undefined && (
                              <div className="flex-1 flex flex-col border-l">
                                <span className="text-[9px] text-slate-500 text-center py-0.5 bg-slate-50">Р</span>
                                <div 
                                  className="h-10 flex items-center justify-center text-white text-xs font-semibold"
                                  style={{ 
                                    backgroundColor: typeof getLessonWorkColor(avgLwPercent) === 'string' && getLessonWorkColor(avgLwPercent).startsWith('#') 
                                      ? getLessonWorkColor(avgLwPercent) 
                                      : undefined 
                                  }}
                                  {...(typeof getLessonWorkColor(avgLwPercent) === 'string' && !getLessonWorkColor(avgLwPercent).startsWith('#') && { 
                                    className: `h-10 ${getLessonWorkColor(avgLwPercent)} flex items-center justify-center text-white text-xs font-semibold` 
                                  })}
                                >
                                  {Math.round(avgLwPercent)}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
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