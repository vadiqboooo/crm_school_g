import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Calendar, Clock, GraduationCap, Users, BookOpen, Edit2, Plus, Trash2, ArchiveRestore } from "lucide-react";
import { useState } from "react";

interface GroupInfo {
  name: string;
  teacher: string;
  subject: string;
  level: string;
}

interface GroupInfoTabProps {
  group: GroupInfo;
  isAdmin?: boolean;
}

interface Student {
  id: string;
  name: string;
  isArchived?: boolean;
}

const mockTeachers = [
  "Бочко В.Д.",
  "Байкальская",
  "Иванов А.С.",
  "Петрова М.В.",
];

export function GroupInfoTab({ group, isAdmin = true }: GroupInfoTabProps) {
  const [comment, setComment] = useState("Студенты активные и мотивированные. Необходимо уделить больше внимания практическим заданиям по программированию.");
  const [isEditMode, setIsEditMode] = useState(false);
  const [description, setDescription] = useState("Группа для подготовки к ЕГЭ по информатике. Программа включает изучение всех разделов кодификатора, решение типовых заданий и разбор сложных тем.");
  const [scheduleDay, setScheduleDay] = useState("Четверг");
  const [scheduleTime, setScheduleTime] = useState("16:30");
  const [scheduleDuration, setScheduleDuration] = useState("90");
  const [selectedTeacher, setSelectedTeacher] = useState(group.teacher);
  const [students, setStudents] = useState<Student[]>([
    { id: "1", name: "Алиев Андрей" },
    { id: "2", name: "Иванов Петр" },
    { id: "3", name: "Сидоров Иван" },
    { id: "4", name: "Петров Алексей" },
  ]);
  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const daysOfWeek = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];

  const formatSchedule = () => {
    const hours = Math.floor(parseInt(scheduleDuration) / 60);
    const minutes = parseInt(scheduleDuration) % 60;
    let durationText = "";
    if (hours > 0) {
      durationText += `${hours} ч`;
    }
    if (minutes > 0) {
      if (hours > 0) durationText += " ";
      durationText += `${minutes} мин`;
    }
    return `${scheduleDay}, ${scheduleTime} (${durationText})`;
  };

  const handleSaveChanges = () => {
    setIsEditMode(false);
    // Here you would save changes to the backend
  };

  const handleAddStudent = () => {
    if (newStudentName.trim()) {
      const newStudent: Student = {
        id: Date.now().toString(),
        name: newStudentName.trim(),
      };
      setStudents([...students, newStudent]);
      setNewStudentName("");
      setIsAddStudentDialogOpen(false);
    }
  };

  const handleArchiveStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setStudents(students.filter(s => s.id !== studentId));
      setArchivedStudents([...archivedStudents, { ...student, isArchived: true }]);
    }
  };

  const handleRestoreStudent = (studentId: string) => {
    const student = archivedStudents.find(s => s.id === studentId);
    if (student) {
      setArchivedStudents(archivedStudents.filter(s => s.id !== studentId));
      setStudents([...students, { ...student, isArchived: false }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Информация о группе</h2>
        {isAdmin && (
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSaveChanges}>
                  Сохранить изменения
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Редактировать
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info and Schedule Combined */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Предмет / Уровень подготовки
                  </label>
                  <p className="mt-1 text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {group.subject}
                    {group.level && (
                      <Badge className="bg-blue-600 ml-1">{group.level}</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">
                    Расписание
                  </label>
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <Select value={scheduleDay} onValueChange={setScheduleDay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        placeholder="16:30"
                        className="w-20"
                      />
                      <Input
                        value={scheduleDuration}
                        onChange={(e) => setScheduleDuration(e.target.value)}
                        placeholder="90"
                        className="w-20"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatSchedule()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">
                  Описание
                </label>
                {isEditMode ? (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание группы..."
                    rows={4}
                  />
                ) : (
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Комментарий
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder="Добавьте комментарий о группе..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Students */}
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Teacher */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">Преподаватель</h3>
              </div>
              {isEditMode ? (
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTeachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-sm">{selectedTeacher}</p>
                </div>
              )}
            </div>

            {/* Students List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-700" />
                  <h3 className="text-base font-semibold text-slate-900">Студенты ({students.length})</h3>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddStudentDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                        {student.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <p className="font-medium text-sm">{student.name}</p>
                    </div>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleArchiveStudent(student.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Archived Students */}
            {isAdmin && archivedStudents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <ArchiveRestore className="w-5 h-5 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-900">Архив ({archivedStudents.length})</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowArchive(!showArchive)}
                  >
                    {showArchive ? "Скрыть" : "Показать"}
                  </Button>
                </div>
                {showArchive && (
                  <div className="space-y-3">
                    {archivedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-3 p-3 border border-dashed rounded-lg bg-slate-50"
                      >
                        <div className="flex items-center gap-3 opacity-60">
                          <div className="w-10 h-10 rounded-full bg-slate-400 text-white flex items-center justify-center font-semibold text-sm">
                            {student.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <p className="font-medium text-sm">{student.name}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleRestoreStudent(student.id)}
                        >
                          <ArchiveRestore className="w-4 h-4 text-blue-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить студента</DialogTitle>
            <DialogDescription>
              Введите имя нового студента.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Имя студента</Label>
              <Input
                id="name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Иван Иванов"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddStudentDialogOpen(false);
                setNewStudentName("");
              }}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleAddStudent}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}