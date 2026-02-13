import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ArrowLeft, Settings } from "lucide-react";
import { useState } from "react";

interface Student {
  id: string;
  name: string;
  status: string;
  lateMinutes?: number;
  lessonGrade?: string;
  homeworkGrade?: string;
  comment: string;
}

interface LessonDetailsFormProps {
  lesson: {
    id: string;
    date: string;
    time: string;
    group: string;
    topic: string;
  };
  onClose: () => void;
}

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Антипин Саша",
    status: "present",
    lessonGrade: "",
    homeworkGrade: "",
    comment: "",
  },
  {
    id: "2",
    name: "Бяков Матвей",
    status: "present",
    lessonGrade: "",
    homeworkGrade: "",
    comment: "",
  },
  {
    id: "3",
    name: "Килин Егор",
    status: "present",
    lessonGrade: "",
    homeworkGrade: "",
    comment: "",
  },
  {
    id: "4",
    name: "Алиев Андрей",
    status: "present",
    lessonGrade: "",
    homeworkGrade: "",
    comment: "",
  },
];

export function LessonDetailsForm({ lesson, onClose }: LessonDetailsFormProps) {
  const [students, setStudents] = useState(mockStudents);
  const [lessonWorkType, setLessonWorkType] = useState<string>("none"); // none, control, test
  const [lessonGradingSystem, setLessonGradingSystem] = useState<string>("5point"); // 5point, tasks
  const [lessonTasksCount, setLessonTasksCount] = useState<string>("10");
  const [homeworkGradingSystem, setHomeworkGradingSystem] = useState<string>("5point"); // 5point, tasks, passfall
  const [homeworkTasksCount, setHomeworkTasksCount] = useState<string>("5");
  const [hadPreviousHomework, setHadPreviousHomework] = useState<boolean>(true);
  const [lessonTopic, setLessonTopic] = useState<string>(lesson.topic !== "—" ? lesson.topic : "");
  const [homework, setHomework] = useState<string>("");

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, status, lateMinutes: status === "late" ? 0 : undefined } : s
      )
    );
  };

  const handleLateMinutesChange = (studentId: string, minutes: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, lateMinutes: parseInt(minutes) || 0 } : s
      )
    );
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, comment } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к урокам
          </Button>
          <h2 className="text-2xl font-semibold">
            Проведение урока — {lesson.date} в {lesson.time}
          </h2>
        </div>
      </div>

      {/* Topic and Homework Section */}
      <Card className="bg-slate-50">
        <CardContent className="py-3 px-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-900 shrink-0">
                Тема урока:
              </label>
              <Input
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                placeholder="Например: Квадратные уравнения"
                className={`h-8 text-sm transition-colors bg-transparent ${
                  lessonTopic.trim() ? 'border-green-500' : 'border-yellow-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-900 shrink-0">
                Домашнее задание:
              </label>
              <Input
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Например: Решить задачи №5-10"
                className={`h-8 text-sm transition-colors bg-transparent ${
                  homework.trim() ? 'border-green-500' : 'border-yellow-400'
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance and Grades Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Посещаемость и оценки
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                      Студент
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 w-[200px]">
                      Статус
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700 w-[120px]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer hover:text-blue-600 transition-colors">
                            Оценка за урок
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Настройки оценки за урок</h4>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 block">
                                Тип работы
                              </label>
                              <Select value={lessonWorkType} onValueChange={setLessonWorkType}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Без оценки</SelectItem>
                                  <SelectItem value="control">Контрольная</SelectItem>
                                  <SelectItem value="test">Зачет</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {lessonWorkType === "control" && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-700 block">
                                    Система оценивания
                                  </label>
                                  <Select value={lessonGradingSystem} onValueChange={setLessonGradingSystem}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="5point">5-бальная</SelectItem>
                                      <SelectItem value="tasks">По коичеству заан��</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {lessonGradingSystem === "tasks" && (
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700 block">
                                      Количество задний
                                    </label>
                                    <Input
                                      type="number"
                                      value={lessonTasksCount}
                                      onChange={(e) => setLessonTasksCount(e.target.value)}
                                      placeholder="10"
                                      className="bg-white"
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700 w-[120px]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer hover:text-blue-600 transition-colors">
                            Оценка за ДЗ
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Настройк оценки за ДЗ</h4>
                            
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 block">
                                Было ДЗ на прошлом роке?
                              </label>
                              <Select 
                                value={hadPreviousHomework ? "yes" : "no"} 
                                onValueChange={(value) => setHadPreviousHomework(value === "yes")}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Да</SelectItem>
                                  <SelectItem value="no">Нет</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {hadPreviousHomework && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-700 block">
                                    Систма оценивания
                                  </label>
                                  <Select value={homeworkGradingSystem} onValueChange={setHomeworkGradingSystem}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="5point">5-бальная</SelectItem>
                                      <SelectItem value="passfall">Зачет/Незачет</SelectItem>
                                      <SelectItem value="tasks">По количеству заданий</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {homeworkGradingSystem === "tasks" && (
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700 block">
                                      Количество заданий
                                    </label>
                                    <Input
                                      type="number"
                                      value={homeworkTasksCount}
                                      onChange={(e) => setHomeworkTasksCount(e.target.value)}
                                      placeholder="5"
                                      className="bg-white"
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 min-w-[200px]">
                      Комментарий
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-green-500 rounded" />
                          <span className="text-sm font-medium text-slate-900">
                            {student.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Select 
                            value={student.status}
                            onValueChange={(value) => handleStatusChange(student.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">
                                Присутствовал
                              </SelectItem>
                              <SelectItem value="absent">
                                Отсутствовал
                              </SelectItem>
                              <SelectItem value="late">Опоздал</SelectItem>
                              <SelectItem value="trial">Пробный урок</SelectItem>
                            </SelectContent>
                          </Select>
                          {student.status === "late" && (
                            <Input
                              type="number"
                              placeholder="Мин"
                              value={student.lateMinutes || ""}
                              onChange={(e) => handleLateMinutesChange(student.id, e.target.value)}
                              className="text-center text-xs w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lessonWorkType !== "none" ? (
                          lessonWorkType === "control" && lessonGradingSystem === "tasks" ? (
                            <Input
                              placeholder={`0-${lessonTasksCount}`}
                              className="text-center"
                            />
                          ) : lessonWorkType === "test" ? (
                            <Select>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pass">Зачет</SelectItem>
                                <SelectItem value="fail">Незачет</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="1-5"
                              className="text-center"
                            />
                          )
                        ) : (
                          <span className="text-slate-400 text-sm"></span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hadPreviousHomework ? (
                          homeworkGradingSystem === "passfall" ? (
                            <Select>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pass">Зачет</SelectItem>
                                <SelectItem value="fail">Незачет</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : homeworkGradingSystem === "tasks" ? (
                            <Input
                              placeholder={`0-${homeworkTasksCount}`}
                              className="text-center"
                            />
                          ) : (
                            <Input
                              placeholder="1-5"
                              className="text-center"
                            />
                          )
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Textarea
                          value={student.comment}
                          onChange={(e) => handleCommentChange(student.id, e.target.value)}
                          placeholder="Комментарий..."
                          className={`resize-none min-h-[40px] py-2 transition-colors bg-transparent ${
                            student.comment.trim() ? 'border-green-500' : 'border-yellow-400'
                          }`}
                          rows={1}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = target.scrollHeight + "px";
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Сохранить посещаемость
        </Button>
      </div>
    </div>
  );
}