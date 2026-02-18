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
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type {
  Lesson,
  LessonAttendance,
  AttendanceStatus,
  WorkType,
  GradingSystem,
  HomeworkGrading
} from "../types/api";

interface StudentAttendance {
  id: string;
  attendanceId?: string;
  name: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  lessonGrade?: string;
  homeworkGrade?: string;
  comment: string;
}

interface LessonDetailsFormProps {
  lesson: Lesson;
  onClose: () => void;
}

export function LessonDetailsForm({ lesson, onClose }: LessonDetailsFormProps) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lessonWorkType, setLessonWorkType] = useState<WorkType>(lesson.work_type || "none");
  const [lessonGradingSystem, setLessonGradingSystem] = useState<GradingSystem>(lesson.grading_system || "5point");
  const [lessonTasksCount, setLessonTasksCount] = useState<string>(String(lesson.tasks_count || 10));
  const [homeworkGradingSystem, setHomeworkGradingSystem] = useState<HomeworkGrading>(lesson.homework_grading || "5point");
  const [homeworkTasksCount, setHomeworkTasksCount] = useState<string>(String(lesson.homework_tasks_count || 5));
  const [hadPreviousHomework, setHadPreviousHomework] = useState<boolean>(lesson.had_previous_homework);
  const [lessonTopic, setLessonTopic] = useState<string>(lesson.topic || "");
  const [homework, setHomework] = useState<string>(lesson.homework || "");

  useEffect(() => {
    loadData();
  }, [lesson.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupData, attendanceData] = await Promise.all([
        api.getGroup(lesson.group_id),
        api.getLessonAttendance(lesson.id),
      ]);

      const studentAttendance: StudentAttendance[] = groupData.students.map((student) => {
        const attendance = attendanceData.find((a) => a.student_id === student.id);
        return {
          id: student.id,
          attendanceId: attendance?.id,
          name: `${student.first_name} ${student.last_name}`,
          status: attendance?.attendance || "present",
          lateMinutes: attendance?.late_minutes,
          lessonGrade: attendance?.lesson_grade || "",
          homeworkGrade: attendance?.homework_grade || "",
          comment: attendance?.comment || "",
        };
      });

      setStudents(studentAttendance);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Ошибка при загрузке данных");
    } finally {
      setLoading(false);
    }
  };

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

  const handleGradeChange = (studentId: string, field: "lessonGrade" | "homeworkGrade", value: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update lesson details
      await api.updateLesson(lesson.id, {
        topic: lessonTopic,
        homework,
        work_type: lessonWorkType,
        grading_system: lessonGradingSystem,
        tasks_count: lessonWorkType === "control" && lessonGradingSystem === "tasks" ? parseInt(lessonTasksCount) : undefined,
        homework_grading: hadPreviousHomework ? homeworkGradingSystem : undefined,
        homework_tasks_count: hadPreviousHomework && homeworkGradingSystem === "tasks" ? parseInt(homeworkTasksCount) : undefined,
        had_previous_homework: hadPreviousHomework,
        status: "conducted",
      });

      // Create or update attendance records
      for (const student of students) {
        const attendanceData = {
          attendance: student.status,
          late_minutes: student.status === "late" ? student.lateMinutes : undefined,
          lesson_grade: student.lessonGrade || undefined,
          homework_grade: student.homeworkGrade || undefined,
          comment: student.comment || undefined,
        };

        if (student.attendanceId) {
          await api.updateAttendance(lesson.id, student.attendanceId, attendanceData);
        } else {
          await api.createAttendance(lesson.id, {
            student_id: student.id,
            ...attendanceData,
          });
        }
      }

      toast.success("Урок успешно сохранен");
      onClose();
    } catch (err) {
      console.error("Failed to save lesson:", err);
      toast.error("Ошибка при сохранении урока");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
            Проведение урока — {formatDate(lesson.date)} {lesson.time ? `в ${lesson.time}` : ""}
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
                              value={student.lessonGrade}
                              onChange={(e) => handleGradeChange(student.id, "lessonGrade", e.target.value)}
                              className="text-center"
                            />
                          ) : lessonWorkType === "test" ? (
                            <Select
                              value={student.lessonGrade}
                              onValueChange={(value) => handleGradeChange(student.id, "lessonGrade", value)}
                            >
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
                              value={student.lessonGrade}
                              onChange={(e) => handleGradeChange(student.id, "lessonGrade", e.target.value)}
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
                            <Select
                              value={student.homeworkGrade}
                              onValueChange={(value) => handleGradeChange(student.id, "homeworkGrade", value)}
                            >
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
                              value={student.homeworkGrade}
                              onChange={(e) => handleGradeChange(student.id, "homeworkGrade", e.target.value)}
                              className="text-center"
                            />
                          ) : (
                            <Input
                              placeholder="1-5"
                              value={student.homeworkGrade}
                              onChange={(e) => handleGradeChange(student.id, "homeworkGrade", e.target.value)}
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
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            "Сохранить посещаемость"
          )}
        </Button>
      </div>
    </div>
  );
}