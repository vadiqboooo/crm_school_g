import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";
import { Users, GraduationCap, Book, Clock, Plus, LayoutGrid, Table as TableIcon, Loader2, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { api } from "../lib/api";
import type { Group, GroupCreate, Subject, User } from "../types/api";
import { useAuth } from "../contexts/AuthContext";

interface GroupWithDetails extends Group {
  studentsCount?: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [newGroup, setNewGroup] = useState<GroupCreate>({
    name: "",
    subject_id: "",
    teacher_id: "",
    level: "",
    schedule_day: "",
    schedule_time: "",
    schedule_duration: 90,
    school_location: "",
    description: "",
    comment: "",
  });

  const daysOfWeek = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, teachersData] = await Promise.all([
        api.getGroups(),
        api.getSubjects(),
        api.getEmployees(),
      ]);

      // Load students count for each group
      const groupsWithDetails = await Promise.all(
        groupsData.map(async (group) => {
          try {
            const students = await api.getGroup(group.id);
            return {
              ...group,
              studentsCount: students.students?.length || 0,
            };
          } catch {
            return { ...group, studentsCount: 0 };
          }
        })
      );

      setGroups(groupsWithDetails);
      setSubjects(subjectsData);
      setTeachers(teachersData.filter((t) => t.role === "teacher" || t.role === "admin"));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setCreating(true);
      await api.createGroup(newGroup);
      await loadData();
      setIsCreateDialogOpen(false);
      setNewGroup({
        name: "",
        subject_id: "",
        teacher_id: "",
        level: "",
        schedule_day: "",
        schedule_time: "",
        schedule_duration: 90,
        school_location: "",
        description: "",
        comment: "",
      });
    } catch (error) {
      console.error("Failed to create group:", error);
      alert("Ошибка при создании группы");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить группу?")) return;

    try {
      await api.deleteGroup(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert("Ошибка при удалении группы");
    }
  };

  const formatSchedule = (day?: string, time?: string) => {
    if (!day && !time) return "Не указан";
    const dayShort = day ? day.substring(0, 2) : "";
    return `${dayShort} ${time || ""}`.trim() || "Не указан";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Группы</h1>
          <p className="text-slate-600 mt-1">Управление учебными группами</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 ${
                viewMode === "grid"
                  ? "bg-white shadow-sm"
                  : "hover:bg-slate-200"
              }`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 ${
                viewMode === "table"
                  ? "bg-white shadow-sm"
                  : "hover:bg-slate-200"
              }`}
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>

          {isAdmin && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Создать группу
            </Button>
          )}
        </div>
      </div>

      {/* Groups Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(`/group/${group.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 group-hover:text-blue-600 transition-colors">
                      {group.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Book className="w-3 h-3" />
                      {group.subject.name}
                      {group.level && ` • ${group.level}`}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/group/${group.id}`);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <GraduationCap className="w-4 h-4" />
                  {group.teacher.first_name} {group.teacher.last_name}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  <span>{group.studentsCount || 0} студентов</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatSchedule(group.schedule_day || "", group.schedule_time || "")}</span>
                </div>

                {group.school_location && (
                  <Badge variant="outline" className="text-xs">
                    {group.school_location}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Преподаватель</TableHead>
                    <TableHead>Студентов</TableHead>
                    <TableHead>Расписание</TableHead>
                    <TableHead>Школа</TableHead>
                    {isAdmin && <TableHead>Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow
                      key={group.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/group/${group.id}`)}
                    >
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{group.subject.name}</span>
                          {group.level && (
                            <span className="text-xs text-slate-500">{group.level}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.teacher.first_name} {group.teacher.last_name}
                      </TableCell>
                      <TableCell>{group.studentsCount || 0}</TableCell>
                      <TableCell>{formatSchedule(group.schedule_day || "", group.schedule_time || "")}</TableCell>
                      <TableCell>
                        {group.school_location || (
                          <span className="text-slate-400">Не указана</span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/group/${group.id}`);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(group.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать новую группу</DialogTitle>
            <DialogDescription>
              Заполните информацию о группе
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название группы *</Label>
              <Input
                id="name"
                value={newGroup.name}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, name: e.target.value })
                }
                placeholder="Информатика ЕГЭ"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject_id">Предмет *</Label>
                <Select
                  value={newGroup.subject_id}
                  onValueChange={(value) =>
                    setNewGroup({ ...newGroup, subject_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите предмет" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher_id">Преподаватель *</Label>
                <Select
                  value={newGroup.teacher_id}
                  onValueChange={(value) =>
                    setNewGroup({ ...newGroup, teacher_id: value })
                  }
                >
                  <SelectTrigger>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Уровень</Label>
                <Input
                  id="level"
                  value={newGroup.level}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, level: e.target.value })
                  }
                  placeholder="ЕГЭ, ОГЭ, 10 класс и т.д."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_location">Школа</Label>
                <Input
                  id="school_location"
                  value={newGroup.school_location}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, school_location: e.target.value })
                  }
                  placeholder="Лермонтова, Байкальская и т.д."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule_day">День недели</Label>
                <Select
                  value={newGroup.schedule_day}
                  onValueChange={(value) =>
                    setNewGroup({ ...newGroup, schedule_day: value })
                  }
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="schedule_time">Время</Label>
                <Input
                  id="schedule_time"
                  type="time"
                  value={newGroup.schedule_time}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, schedule_time: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule_duration">Длительность (мин)</Label>
                <Input
                  id="schedule_duration"
                  type="number"
                  value={newGroup.schedule_duration}
                  onChange={(e) =>
                    setNewGroup({
                      ...newGroup,
                      schedule_duration: parseInt(e.target.value) || 90,
                    })
                  }
                  placeholder="90"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={newGroup.description}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, description: e.target.value })
                }
                placeholder="Описание группы..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий</Label>
              <Textarea
                id="comment"
                value={newGroup.comment}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, comment: e.target.value })
                }
                placeholder="Дополнительные заметки..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={creating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={
                creating ||
                !newGroup.name ||
                !newGroup.subject_id ||
                !newGroup.teacher_id
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
