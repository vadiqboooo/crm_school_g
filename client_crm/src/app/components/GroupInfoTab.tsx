import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
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
import { Calendar, Clock, GraduationCap, Users, BookOpen, Plus, Trash2, Sparkles, UserPlus, Edit, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Group, ScheduleCreate, Student, Subject, User, SchoolLocation } from "../types/api";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface GroupInfoTabProps {
  group: Group;
  onUpdate?: () => void;
}

export function GroupInfoTab({ group, onUpdate }: GroupInfoTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [comment, setComment] = useState(group.comment || "");
  const [startDate, setStartDate] = useState(group.start_date || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [isGenerateLessonsOpen, setIsGenerateLessonsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isArchivedStudentsOpen, setIsArchivedStudentsOpen] = useState(false);
  const [archivedStudents, setArchivedStudents] = useState<import("../types/api").GroupStudent[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [generateMonths, setGenerateMonths] = useState("3");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [newSchedule, setNewSchedule] = useState<ScheduleCreate>({
    day_of_week: "",
    start_time: "",
    duration_minutes: 90,
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: group.name,
    subject_id: group.subject.id,
    teacher_id: group.teacher.id,
    level: group.level || "",
    description: group.description || "",
    school_location: group.school_location || "",
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [schoolLocations, setSchoolLocations] = useState<SchoolLocation[]>([]);

  useEffect(() => {
    if (isAddStudentOpen) {
      loadAllStudents();
    }
  }, [isAddStudentOpen]);

  useEffect(() => {
    if (isEditMode) {
      loadEditModeData();
    }
  }, [isEditMode]);

  const loadAllStudents = async () => {
    try {
      const students = await api.getStudents();
      // Filter out students already in the group
      const availableStudents = students.filter(
        (student) => !group.students.some((gs) => gs.id === student.id)
      );
      setAllStudents(availableStudents);
    } catch (error) {
      console.error("Failed to load students:", error);
      toast.error("Ошибка при загрузке студентов");
    }
  };

  const loadEditModeData = async () => {
    try {
      const [subjectsData, teachersData, locationsData] = await Promise.all([
        api.getSubjects(),
        api.getEmployees(),
        api.getSchoolLocations(),
      ]);
      setSubjects(subjectsData);
      setTeachers(teachersData.filter(t => t.role === "teacher" || t.role === "admin"));
      setSchoolLocations(locationsData);
    } catch (error) {
      console.error("Failed to load edit mode data:", error);
      toast.error("Ошибка при загрузке данных");
    }
  };

  const formatSubjectName = (subject: Subject) => {
    if (subject.exam_type) {
      return `${subject.name} (${subject.exam_type})`;
    }
    return subject.name;
  };

  const handleEnterEditMode = () => {
    setEditFormData({
      name: group.name,
      subject_id: group.subject.id,
      teacher_id: group.teacher.id,
      level: group.level || "",
      description: group.description || "",
      school_location: group.school_location || "",
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      await api.updateGroup(group.id, editFormData);
      setIsEditMode(false);
      if (onUpdate) onUpdate();
      toast.success("Информация о группе обновлена");
    } catch (error) {
      console.error("Failed to update group:", error);
      toast.error("Ошибка при обновлении группы");
    } finally {
      setIsSaving(false);
    }
  };

  const daysOfWeek = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];

  const formatScheduleTime = (time: string, duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    let durationText = "";
    if (hours > 0) durationText += `${hours} ч`;
    if (minutes > 0) {
      if (hours > 0) durationText += " ";
      durationText += `${minutes} мин`;
    }
    return `${time} (${durationText})`;
  };

  const handleSaveComment = async () => {
    try {
      setIsSaving(true);
      await api.updateGroup(group.id, { comment });
      if (onUpdate) onUpdate();
      toast.success("Комментарий сохранен");
    } catch (error) {
      console.error("Failed to save comment:", error);
      toast.error("Ошибка при сохранении комментария");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStartDate = async () => {
    try {
      setIsSaving(true);
      await api.updateGroup(group.id, { start_date: startDate });
      if (onUpdate) onUpdate();
      toast.success("Дата начала сохранена");
    } catch (error) {
      console.error("Failed to save start date:", error);
      toast.error("Ошибка при сохранении даты начала");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateLessons = async () => {
    try {
      setIsGenerating(true);
      const months = parseInt(generateMonths);
      await api.generateLessons(group.id, { months });
      setIsGenerateLessonsOpen(false);
      toast.success("Уроки успешно сгенерированы!");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to generate lessons:", error);
      toast.error("Ошибка при генерации уроков");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudentId) return;
    try {
      await api.addStudentToGroup(group.id, selectedStudentId);
      setIsAddStudentOpen(false);
      setSelectedStudentId("");
      setStudentSearchQuery("");
      if (onUpdate) onUpdate();
      toast.success("Студент добавлен в группу");
    } catch (error) {
      console.error("Failed to add student:", error);
      toast.error("Ошибка при добавлении студента");
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Удалить студента из группы?")) return;
    try {
      await api.removeStudentFromGroup(group.id, studentId);
      if (onUpdate) onUpdate();
      toast.success("Студент архивирован");
    } catch (error) {
      console.error("Failed to remove student:", error);
      toast.error("Ошибка при удалении студента");
    }
  };

  const loadArchivedStudents = async () => {
    try {
      setLoadingArchived(true);
      const archived = await api.getArchivedStudents(group.id);
      setArchivedStudents(archived);
    } catch (error) {
      console.error("Failed to load archived students:", error);
      toast.error("Ошибка при загрузке архива");
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleRestoreStudent = async (studentId: string) => {
    if (!confirm("Восстановить студента в группе?")) return;
    try {
      await api.restoreStudentToGroup(group.id, studentId);
      if (onUpdate) onUpdate();
      await loadArchivedStudents();
      toast.success("Студент восстановлен");
    } catch (error) {
      console.error("Failed to restore student:", error);
      toast.error("Ошибка при восстановлении студента");
    }
  };

  const handleOpenArchive = async () => {
    setIsArchivedStudentsOpen(true);
    await loadArchivedStudents();
  };

  const handleAddSchedule = async () => {
    try {
      await api.createSchedule(group.id, newSchedule);
      setIsAddScheduleOpen(false);
      setNewSchedule({
        day_of_week: "",
        start_time: "",
        duration_minutes: 90,
      });
      if (onUpdate) onUpdate();
      toast.success("Расписание добавлено");
    } catch (error) {
      console.error("Failed to add schedule:", error);
      toast.error("Ошибка при добавлении расписания");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Удалить это расписание?")) return;
    try {
      await api.deleteSchedule(group.id, scheduleId);
      if (onUpdate) onUpdate();
      toast.success("Расписание удалено");
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error("Ошибка при удалении расписания");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Информация о группе</h2>
        {isAdmin && !isEditMode && (
          <Button onClick={handleEnterEditMode} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
        )}
        {isAdmin && isEditMode && (
          <div className="flex gap-2">
            <Button onClick={handleCancelEdit} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                isSaving ||
                !editFormData.name ||
                !editFormData.subject_id ||
                !editFormData.teacher_id ||
                (isAdmin && !editFormData.level)
              }
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Название группы в режиме редактирования */}
            {isEditMode && (
              <div>
                <Label htmlFor="name">Название группы</Label>
                <Input
                  id="name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
            )}

            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Левая колонка - Предмет с уровнем и Школа */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Предмет
                  </label>
                  {isEditMode ? (
                    <Select
                      value={editFormData.subject_id}
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, subject_id: value })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Выберите предмет" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {formatSubjectName(subject)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-slate-900 flex items-center gap-2 mt-1">
                      <BookOpen className="w-4 h-4" />
                      {formatSubjectName(group.subject)}
                    </p>
                  )}
                </div>

                {/* Тип подготовки - только для админов */}
                {isAdmin && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Тип подготовки
                    </label>
                    {isEditMode ? (
                      <Select
                        value={editFormData.level}
                        onValueChange={(value) =>
                          setEditFormData({ ...editFormData, level: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ОГЭ">ОГЭ</SelectItem>
                          <SelectItem value="ЕГЭ">ЕГЭ</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        {group.level ? (
                          <Badge className={group.level === 'ЕГЭ' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}>
                            {group.level}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">Не указан</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Школа
                  </label>
                  {isEditMode ? (
                    <Select
                      value={editFormData.school_location || "_none_"}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          school_location: value === "_none_" ? "" : value
                        })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Выберите школу" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">Не указана</SelectItem>
                        {schoolLocations.map((location) => (
                          <SelectItem key={location.id} value={location.name}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-slate-900">
                      {group.school_location || (
                        <span className="text-slate-500">Не указана</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Преподаватель в режиме редактирования */}
                {isEditMode && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Преподаватель
                    </label>
                    <Select
                      value={editFormData.teacher_id}
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, teacher_id: value })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Правая колонка - Расписание, Дата начала */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-600">
                      Расписание
                    </label>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsAddScheduleOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {group.schedules && group.schedules.length > 0 ? (
                    <div className="space-y-2">
                      {group.schedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{schedule.day_of_week}</span>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{formatScheduleTime(schedule.start_time, schedule.duration_minutes)}</span>
                          </div>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Расписание не указано</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">
                    Дата начала занятий
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                    {isAdmin && startDate !== (group.start_date || "") && (
                      <Button
                        onClick={handleSaveStartDate}
                        disabled={isSaving}
                        size="sm"
                      >
                        Сохранить
                      </Button>
                    )}
                  </div>
                  {isAdmin && group.start_date && group.schedules.length > 0 && (
                    <Button
                      onClick={() => setIsGenerateLessonsOpen(true)}
                      className="mt-2 bg-green-600 hover:bg-green-700 w-full"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Сгенерировать уроки
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Описание снизу */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Описание
              </label>
              {isEditMode ? (
                <Textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="min-h-[120px] resize-y"
                  placeholder="Добавьте описание группы..."
                />
              ) : (
                <p className="text-slate-700 leading-relaxed">
                  {group.description || (
                    <span className="text-slate-500">Описание не указано</span>
                  )}
                </p>
              )}
            </div>

            {/* Комментарий - доступно для преподавателей и админов */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Комментарий
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px] resize-y"
                placeholder="Добавьте комментарий о группе..."
              />
              <div className="mt-2 flex justify-end">
                <Button
                  onClick={handleSaveComment}
                  disabled={isSaving || comment === (group.comment || "")}
                  size="sm"
                >
                  {isSaving ? "Сохранение..." : "Сохранить комментарий"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher and Students */}
        <Card>
          <CardContent className="space-y-4 pt-4">
            {/* Teacher */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">Преподаватель</h3>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                  {group.teacher.first_name[0]}{group.teacher.last_name[0]}
                </div>
                <p className="font-medium text-sm">
                  {group.teacher.first_name} {group.teacher.last_name}
                </p>
              </div>
            </div>

            {/* Students List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Студенты ({group.students?.length || 0})
                  </h3>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenArchive}
                      className="h-7 px-2 text-xs"
                    >
                      Архив
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddStudentOpen(true)}
                      className="h-7 w-7 p-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {group.students && group.students.length > 0 ? (
                  group.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">
                          {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <p className="font-medium text-sm">
                          {student.first_name} {student.last_name}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-3">
                    Нет студентов в группе
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить расписание</DialogTitle>
            <DialogDescription>
              Укажите день недели и время занятий
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="day">День недели</Label>
              <Select
                value={newSchedule.day_of_week}
                onValueChange={(value) =>
                  setNewSchedule({ ...newSchedule, day_of_week: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Выберите день" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="time">Время начала</Label>
              <Input
                id="time"
                type="time"
                value={newSchedule.start_time}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, start_time: e.target.value })
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="duration">Длительность (минуты)</Label>
              <Input
                id="duration"
                type="number"
                value={newSchedule.duration_minutes}
                onChange={(e) =>
                  setNewSchedule({
                    ...newSchedule,
                    duration_minutes: parseInt(e.target.value) || 90,
                  })
                }
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddScheduleOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddSchedule}
              disabled={!newSchedule.day_of_week || !newSchedule.start_time}
            >
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Lessons Dialog */}
      <Dialog open={isGenerateLessonsOpen} onOpenChange={setIsGenerateLessonsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сгенерировать уроки</DialogTitle>
            <DialogDescription>
              Автоматически создать уроки по расписанию группы
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="months">На сколько месяцев вперёд</Label>
              <Input
                id="months"
                type="number"
                min="1"
                max="12"
                value={generateMonths}
                onChange={(e) => setGenerateMonths(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-slate-700">
              <p>
                Будут созданы уроки с <strong>{group.start_date}</strong> на <strong>{generateMonths}</strong> месяцев вперёд
                по расписанию группы ({group.schedules.length} {group.schedules.length === 1 ? "занятие" : "занятия"} в неделю).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateLessonsOpen(false)}
              disabled={isGenerating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleGenerateLessons}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? "Генерация..." : "Сгенерировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={(open) => {
        setIsAddStudentOpen(open);
        if (!open) {
          setSelectedStudentId("");
          setStudentSearchQuery("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить студента в группу</DialogTitle>
            <DialogDescription>
              Найдите и выберите студента
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search Input */}
            <div>
              <Label>Поиск студента</Label>
              <Input
                placeholder="Введите имя или фамилию..."
                value={studentSearchQuery}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  setSelectedStudentId("");
                }}
                className="mt-2"
                autoFocus
              />
            </div>

            {/* Students List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {allStudents.length > 0 ? (
                (() => {
                  const filteredStudents = allStudents.filter((student) => {
                    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
                    return fullName.includes(studentSearchQuery.toLowerCase());
                  });

                  return filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`
                          flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0
                          ${selectedStudentId === student.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {student.first_name} {student.last_name}
                            </div>
                            {student.phone && (
                              <div className="text-sm text-slate-500">
                                {student.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedStudentId === student.id && (
                          <div className="text-blue-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Студенты не найдены
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Нет доступных студентов
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddStudentOpen(false);
                setSelectedStudentId("");
                setStudentSearchQuery("");
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={!selectedStudentId}
            >
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archived Students Dialog */}
      <Dialog open={isArchivedStudentsOpen} onOpenChange={setIsArchivedStudentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Архив студентов</DialogTitle>
            <DialogDescription>
              Студенты, удалённые из группы. Вы можете восстановить их.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingArchived ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : archivedStudents.length > 0 ? (
              archivedStudents.map((gs) => (
                <div
                  key={gs.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center font-semibold text-xs">
                      {gs.student?.first_name[0]}{gs.student?.last_name[0]}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {gs.student?.first_name} {gs.student?.last_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Был в группе с {new Date(gs.joined_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreStudent(gs.student_id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Восстановить
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                Архив пуст
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArchivedStudentsOpen(false)}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
