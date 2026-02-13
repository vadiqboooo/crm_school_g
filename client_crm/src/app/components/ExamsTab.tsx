import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { FileText, Users, TrendingUp, ArrowLeft, MessageSquare, X } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

// Все доступные темы для каждого задания
const TASK_TOPICS: { [taskNumber: number]: string[] } = {
  1: ["Системы счисления"],
  2: ["Таблицы истинности", "Логические выражения"],
  3: ["Базы данных, SQL"],
  4: ["Кодирование и декодирование информации"],
  5: ["Анализ программ с циклами"],
  6: ["Анализ программ с циклами и условиями"],
  7: ["Электронные таблицы"],
  8: ["Комбинаторика", "Системы счисления"],
  9: ["Поиск информации в файлах"],
  10: ["Кодирование символов", "Комбинаторика"],
  11: ["Рекурсивные алгоритмы"],
  12: ["Сети, IP-адреса", "Маски подсети"],
  13: ["Измерение информации"],
  14: ["Исполнители алгоритмов"],
  15: ["Графы", "Поиск путей"],
  16: ["Системы счисления", "Арифметические операции"],
  17: ["Обработка числовых последовательностей"],
  18: ["Анализ программ с циклами"],
  19: ["Теория игр", "Выигрышные стратегии"],
  20: ["Теория игр", "Анализ дерева игры"],
  21: ["Теория игр", "Построение дерева игры"],
  22: ["Динамическое программирование", "Перебор вариантов"],
  23: ["Логические уравнения", "Системы логических уравнений"],
  24: ["Исправление ошибок в программе"],
  25: ["Обработка массивов", "Поиск подпоследовательностей"],
  26: ["Теория игр на программирование"],
  27: ["Динамическое программирование", "Обработка последовательностей"],
};

interface Student {
  id: string;
  name: string;
  primaryScore: number;
  finalScore: number; // 100-балльная система
  answers: (number | null)[];
  comments?: { [taskNumber: number]: string };
  studentComment?: string; // Комментарий по результатам студента
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  date: string;
  studentsTotal: number;
  studentsCompleted: number;
  studentsNotCompleted: number;
  averageScore: number; // Средний балл (первичный)
  averageFinalScore: number; // Средний итоговый балл (100-балльная система)
  passedThreshold: number; // Процент перешедших порог
  thresholdScore: number; // Пороговый балл
  topErrorTasks: { taskNumber: number; errorCount: number }[]; // Топ 3 задания с ошибками
  completion: number;
  students: Student[];
}

const mockExams: Exam[] = [
  {
    id: "1",
    title: "Осенний пробник",
    subject: "Информатика",
    date: "2023-10-01",
    studentsTotal: 4,
    studentsCompleted: 4,
    studentsNotCompleted: 0,
    averageScore: 9.0,
    averageFinalScore: 85.0,
    passedThreshold: 100,
    thresholdScore: 25,
    topErrorTasks: [
      { taskNumber: 5, errorCount: 1 },
      { taskNumber: 10, errorCount: 1 },
      { taskNumber: 15, errorCount: 1 },
    ],
    completion: 100,
    students: [
      {
        id: "1",
        name: "Алиев Андрей",
        primaryScore: 28,
        finalScore: 85,
        answers: Array(27).fill(null),
      },
      {
        id: "2",
        name: "Иванов Петр",
        primaryScore: 25,
        finalScore: 80,
        answers: Array(27).fill(null),
      },
      {
        id: "3",
        name: "Сидоров Иван",
        primaryScore: 22,
        finalScore: 75,
        answers: Array(27).fill(null),
      },
      {
        id: "4",
        name: "Петров Алексей",
        primaryScore: 27,
        finalScore: 90,
        answers: Array(27).fill(null),
      },
    ],
  },
  {
    id: "2",
    title: "Зимний пробник",
    subject: "Информатика",
    date: "2023-12-01",
    studentsTotal: 4,
    studentsCompleted: 3,
    studentsNotCompleted: 1,
    averageScore: 8.5,
    averageFinalScore: 82.5,
    passedThreshold: 75,
    thresholdScore: 25,
    topErrorTasks: [
      { taskNumber: 5, errorCount: 1 },
      { taskNumber: 10, errorCount: 1 },
      { taskNumber: 15, errorCount: 1 },
    ],
    completion: 75,
    students: [
      {
        id: "1",
        name: "Алиев Андрей",
        primaryScore: 26,
        finalScore: 83,
        answers: Array(27).fill(null),
      },
      {
        id: "2",
        name: "Иванов Петр",
        primaryScore: 24,
        finalScore: 80,
        answers: Array(27).fill(null),
      },
      {
        id: "3",
        name: "Сидоров Иван",
        primaryScore: 23,
        finalScore: 77,
        answers: Array(27).fill(null),
      },
    ],
  },
  {
    id: "3",
    title: "Весенний пробник",
    subject: "Информатика",
    date: "2024-03-01",
    studentsTotal: 4,
    studentsCompleted: 0,
    studentsNotCompleted: 4,
    averageScore: 0,
    averageFinalScore: 0,
    passedThreshold: 0,
    thresholdScore: 25,
    topErrorTasks: [],
    completion: 0,
    students: [],
  },
];

interface ExamsTabProps {
  groupId: string;
  groupName: string;
  groupSubject: string;
}

export function ExamsTab({ groupId, groupName, groupSubject }: ExamsTabProps) {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [taskComments, setTaskComments] = useState<{ [key: string]: string }>({});
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [taskTopics, setTaskTopics] = useState<{ [taskNumber: number]: string[] }>({});
  const [examTitle, setExamTitle] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [examComment, setExamComment] = useState<string>("");
  const [examDifficulty, setExamDifficulty] = useState<string>("");

  const handleCommentChange = (
    studentId: string,
    taskNumber: number,
    comment: string
  ) => {
    setTaskComments((prev) => ({
      ...prev,
      [`${studentId}-${taskNumber}`]: comment,
    }));
  };

  const handleTaskToggle = (taskNumber: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskNumber)
        ? prev.filter((t) => t !== taskNumber)
        : [...prev, taskNumber]
    );
  };

  const handleTopicChange = (taskNumber: number, topic: string) => {
    setTaskTopics((prev) => {
      const topics = TASK_TOPICS[taskNumber] || [];
      // Если только одна тема - сохраняем ее
      if (topics.length === 1) {
        return { ...prev, [taskNumber]: [topics[0]] };
      }
      // Если несколько тем - переключаем выбранную тему
      const currentTopics = prev[taskNumber] || [];
      const isSelected = currentTopics.includes(topic);
      
      if (isSelected) {
        return { ...prev, [taskNumber]: currentTopics.filter(t => t !== topic) };
      } else {
        return { ...prev, [taskNumber]: [...currentTopics, topic] };
      }
    });
  };

  // If exam is selected, show exam details instead of exam list
  if (selectedExam) {
    return (
      <div className="space-y-3">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedExam(null)}
            className="h-8"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          <div className="text-center flex-1">
            <h2 className="font-semibold text-lg">{selectedExam.title}</h2>
            <p className="text-sm text-slate-600">{selectedExam.subject}</p>
          </div>
          <div className="w-20"></div> {/* Spacer для баланса */}
        </div>

        {/* Compact Statistics */}
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-5 gap-4">
              {/* Средний итоговый балл */}
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600">
                  {selectedExam.averageFinalScore}
                </p>
                <p className="text-xs text-slate-600">Средний балл</p>
              </div>
              
              {/* Процент перешедших порог */}
              <div className="text-center">
                <p className="text-lg font-semibold text-green-600">
                  {selectedExam.passedThreshold}%
                </p>
                <p className="text-xs text-slate-600">Прошли порог</p>
              </div>
              
              {/* Топ 3 задания с ошибками */}
              <div className="col-span-3 text-center">
                <p className="text-xs text-slate-600 mb-1">
                  Задания с ошибками
                </p>
                <div className="flex items-center justify-center gap-2">
                  {selectedExam.topErrorTasks && selectedExam.topErrorTasks.length > 0 ? (
                    selectedExam.topErrorTasks.map((task, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        №{task.taskNumber} ({task.errorCount})
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Нет данных</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Results */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">
            {selectedExam.subject} (27 заданий)
          </h3>
          {selectedExam.students && selectedExam.students.length > 0 ? (
            selectedExam.students.map((student) => (
              <Card key={student.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">{student.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Первичный балл: {student.primaryScore}
                      </Badge>
                      <Badge className="bg-blue-600 text-xs">
                        Итоговый балл: {student.finalScore}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                        Удалить
                      </Button>
                    </div>
                  </div>
                  {/* Task Score Table */}
                  <div className="mb-3">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(50px,1fr))] gap-1">
                      {student.answers && student.answers.map((answer, index) => (
                        <div key={index} className="flex flex-col">
                          {/* Task number header */}
                          <div className="bg-slate-100 border border-slate-300 text-xs font-medium text-slate-700">
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <div className="px-2 py-1 cursor-pointer hover:bg-slate-200 transition-colors text-center">
                                  {index + 1}
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-sm font-semibold">
                                      Задание {index + 1}
                                    </h4>
                                  </div>
                                  <Textarea
                                    placeholder="Добавить комментарий к заданию..."
                                    value={
                                      taskComments[
                                        `${student.id}-${index + 1}`
                                      ] || ""
                                    }
                                    onChange={(e) =>
                                      handleCommentChange(
                                        student.id,
                                        index + 1,
                                        e.target.value
                                      )
                                    }
                                    className="min-h-[80px] text-sm resize-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <p className="text-xs text-slate-500">
                                    Сохраняется автоматически
                                  </p>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                          
                          {/* Input field for score */}
                          <input
                            type="text"
                            defaultValue={answer !== null ? answer : ""}
                            placeholder="—"
                            className="w-full h-9 text-center text-sm border border-slate-300 border-t-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Student Comment */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Комментарий по результатам
                    </label>
                    <Textarea
                      placeholder="Добавить комментарий по результатам студента..."
                      defaultValue={student.studentComment || ""}
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-3 text-center text-sm text-slate-600">
                Нет результатов экзамена
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show exam list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Экзамены</h2>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsAddExamOpen(true)}>
          + Добавить экзамен
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockExams.map((exam) => (
          <Card
            key={exam.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedExam(exam)}
          >
            <CardHeader className="border-b pb-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Средний итоговый балл */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Средний итоговый балл</span>
                  <span className="text-2xl font-bold text-blue-600">{exam.averageFinalScore}</span>
                </div>
                <Progress value={exam.averageFinalScore} className="h-2" />
              </div>

              {/* Статистика по порогу */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">Перешли порог</p>
                  <p className="text-lg font-semibold text-green-600">
                    {Math.round((exam.studentsTotal * exam.passedThreshold) / 100)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">Не набрали порог</p>
                  <p className="text-lg font-semibold text-red-600">
                    {exam.studentsTotal - Math.round((exam.studentsTotal * exam.passedThreshold) / 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Exam Dialog */}
      <Dialog open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить экзамен</DialogTitle>
            <DialogDescription>
              Заполните данные нового экзамена и выберите задания
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Название экзамена */}
            <div className="space-y-2">
              <Label htmlFor="examTitle" className="text-sm font-medium">
                Название экзамена
              </Label>
              <Select value={examTitle} onValueChange={setExamTitle}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите название экзамена" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Осенний пробник 25/26">Осенний пробник 25/26</SelectItem>
                  <SelectItem value="Зимний пробник 25/26">Зимний пробник 25/26</SelectItem>
                  <SelectItem value="Весенний пробник 25/26">Весенний пробник 25/26</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Предмет */}
            <div className="space-y-2">
              <Label htmlFor="examSubject" className="text-sm font-medium">
                Предмет
              </Label>
              <Input
                id="examSubject"
                value={groupSubject}
                className="w-full bg-slate-100"
                readOnly
                disabled
              />
            </div>

            {/* Уровень сложности */}
            <div className="space-y-2">
              <Label htmlFor="examDifficulty" className="text-sm font-medium">
                Уровень сложности
              </Label>
              <Select value={examDifficulty} onValueChange={setExamDifficulty}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите уровень сложности" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Уровень ЕГЭ 2026">Уровень ЕГЭ 2026</SelectItem>
                  <SelectItem value="Сложность выше уровня ЕГЭ">Сложность выше уровня ЕГЭ</SelectItem>
                  <SelectItem value="Гробовой вариант">Гробовой вариант</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Комментарий по экзамену */}
            <div className="space-y-2">
              <Label htmlFor="examComment" className="text-sm font-medium">
                Комментарий по экзамену
              </Label>
              <Textarea
                id="examComment"
                placeholder="Добавьте комментарий или примечание к экзамену..."
                value={examComment}
                onChange={(e) => setExamComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Выбор заданий */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Выбор пройденных заданий
              </Label>
              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="space-y-3">
                  {Array.from({ length: 27 }, (_, index) => {
                    const taskNumber = index + 1;
                    const isSelected = selectedTasks.includes(taskNumber);
                    const topics = TASK_TOPICS[taskNumber] || [];
                    const selectedTopics = taskTopics[taskNumber] || [];
                    
                    return (
                      <div key={taskNumber} className="flex items-start gap-3">
                        {/* Номер задания */}
                        <div
                          onClick={() => handleTaskToggle(taskNumber)}
                          className={cn(
                            "flex items-center justify-center min-w-[40px] h-9 rounded-md cursor-pointer transition-all border-2",
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                          )}
                        >
                          <span className="text-sm font-medium">{taskNumber}</span>
                        </div>
                        
                        {/* Темы */}
                        <div className="flex-1 flex flex-wrap gap-2 items-center min-h-[36px]">
                          {topics.map((topic) => {
                            const isTopicSelected = selectedTopics.includes(topic);
                            return (
                              <Badge
                                key={topic}
                                variant={isTopicSelected ? "default" : "secondary"}
                                className={cn(
                                  "cursor-pointer transition-all",
                                  isTopicSelected 
                                    ? "bg-blue-600 hover:bg-blue-700" 
                                    : "hover:bg-slate-300"
                                )}
                                onClick={() => handleTopicChange(taskNumber, topic)}
                              >
                                {topic}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Выбрано заданий: {selectedTasks.length} из 27
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsAddExamOpen(false);
                setSelectedTasks([]);
                setTaskTopics({});
              }}
            >
              Отмена
            </Button>
            <Button type="submit">Создать экзамен</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}