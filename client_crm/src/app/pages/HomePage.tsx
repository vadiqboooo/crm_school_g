import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";
import { Users, GraduationCap, Book, Clock, Plus, LayoutGrid, Table as TableIcon, Loader2, Trash2, Edit, X, Filter, ChevronDown } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import { MoreVertical } from "lucide-react";
import { api } from "../lib/api";
import type { Group, GroupCreate, Subject, User, SchoolLocation } from "../types/api";
import { useAuth } from "../contexts/AuthContext";

interface GroupWithDetails extends Group {
  studentsCount?: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const canUseTableView = user?.role === "admin" || user?.role === "manager";

  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [locations, setLocations] = useState<SchoolLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uncompletedLessonsByGroup, setUncompletedLessonsByGroup] = useState<Map<string, number>>(new Map());

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    // Try to get saved preference from localStorage
    const savedViewMode = localStorage.getItem('groupsViewMode') as "grid" | "table" | null;
    // If saved, use it; otherwise use default based on role
    return savedViewMode || (isAdmin ? "table" : "grid");
  });

  // Filters
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);

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

  const [newSchedules, setNewSchedules] = useState<Array<{
    day_of_week: string;
    start_time: string;
    duration_minutes: number;
  }>>([]);

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

  // Save viewMode preference to localStorage
  useEffect(() => {
    localStorage.setItem('groupsViewMode', viewMode);
  }, [viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, teachersData, locationsData] = await Promise.all([
        api.getGroups(),
        api.getSubjects(),
        api.getEmployees(),
        api.getSchoolLocations(),
      ]);

      // Groups now include students count from API
      const groupsWithDetails = groupsData.map((group) => ({
        ...group,
        studentsCount: group.students?.length || 0,
      }));

      setGroups(groupsWithDetails);
      setSubjects(subjectsData);
      setTeachers(teachersData.filter((t) => t.role === "teacher"));
      setLocations(locationsData);

      // Load uncompleted lessons count for teachers
      if (isTeacher) {
        const lessons = await api.getLessons();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const uncompletedByGroup = new Map<string, number>();

        lessons.forEach((lesson) => {
          const lessonDate = new Date(lesson.date);
          lessonDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor((today.getTime() - lessonDate.getTime()) / (1000 * 60 * 60 * 24));

          // Count lessons that are more than 1 day old and not conducted
          if (daysDiff > 1 && lesson.status !== "conducted") {
            const count = uncompletedByGroup.get(lesson.group_id) || 0;
            uncompletedByGroup.set(lesson.group_id, count + 1);
          }
        });

        setUncompletedLessonsByGroup(uncompletedByGroup);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setCreating(true);
      const group = await api.createGroup(newGroup);

      // Create schedules for the new group
      for (const schedule of newSchedules) {
        await api.createSchedule(group.id, schedule);
      }

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
      setNewSchedules([]);
    } catch (error) {
      console.error("Failed to create group:", error);
      alert("Ошибка при создании группы");
    } finally {
      setCreating(false);
    }
  };

  const handleAddSchedule = () => {
    setNewSchedules([
      ...newSchedules,
      { day_of_week: "", start_time: "", duration_minutes: 90 },
    ]);
  };

  const handleRemoveSchedule = (index: number) => {
    setNewSchedules(newSchedules.filter((_, i) => i !== index));
  };

  const handleUpdateSchedule = (
    index: number,
    field: "day_of_week" | "start_time" | "duration_minutes",
    value: string | number
  ) => {
    const updated = [...newSchedules];
    updated[index] = { ...updated[index], [field]: value };
    setNewSchedules(updated);
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

  const getDayAbbreviation = (day: string) => {
    const abbreviations: { [key: string]: string } = {
      "Понедельник": "Пн",
      "Вторник": "Вт",
      "Среда": "Ср",
      "Четверг": "Чт",
      "Пятница": "Пт",
      "Суббота": "Сб",
      "Воскресенье": "Вс",
    };
    return abbreviations[day] || day.substring(0, 2);
  };

  const formatSubjectName = (subject: Subject) => {
    if (subject.exam_type) {
      return `${subject.name} (${subject.exam_type})`;
    }
    return subject.name;
  };

  const formatTime = (time: string) => {
    // Extract only hours and minutes (HH:MM)
    return time.substring(0, 5);
  };

  const formatSchedules = (schedules?: Array<{ day_of_week: string; start_time: string }>) => {
    if (!schedules || schedules.length === 0) return "Не указан";
    return schedules
      .map((s) => `${getDayAbbreviation(s.day_of_week)} ${formatTime(s.start_time)}`)
      .join(", ");
  };

  // Filter groups based on selected filters
  const filteredGroups = groups.filter((group) => {
    if (selectedSubjects.length > 0 && !selectedSubjects.includes(group.subject?.id)) {
      return false;
    }
    if (selectedTeachers.length > 0 && !selectedTeachers.includes(group.teacher?.id)) {
      return false;
    }
    if (selectedLocations.length > 0) {
      if (!group.school_location || !selectedLocations.includes(group.school_location)) {
        return false;
      }
    }
    if (selectedExamTypes.length > 0) {
      if (!group.level || !selectedExamTypes.includes(group.level)) {
        return false;
      }
    }
    return true;
  });

  // Get unique locations from groups
  const uniqueLocations = Array.from(
    new Set(groups.map((g) => g.school_location).filter((l): l is string => !!l))
  ).sort();

  const hasActiveFilters = selectedSubjects.length > 0 || selectedTeachers.length > 0 || selectedLocations.length > 0 || selectedExamTypes.length > 0;

  const clearAllFilters = () => {
    setSelectedSubjects([]);
    setSelectedTeachers([]);
    setSelectedLocations([]);
    setSelectedExamTypes([]);
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
    <>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 min-h-[88px]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Группы</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-600">Управление учебными группами</p>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="gap-1">
                    <Filter className="w-3 h-3" />
                    Фильтры: {selectedSubjects.length + selectedTeachers.length + selectedLocations.length + selectedExamTypes.length}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Exam Type Filter - только для админов */}
              {isAdmin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={selectedExamTypes.length > 0 ? 'border-blue-600 text-blue-600' : ''}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Тип подготовки
                      {selectedExamTypes.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {selectedExamTypes.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Фильтр по типу подготовки</h4>
                        {selectedExamTypes.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setSelectedExamTypes([])}
                          >
                            Сбросить
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {['ОГЭ', 'ЕГЭ'].map((examType) => (
                          <div key={examType} className="flex items-center space-x-2">
                            <Checkbox
                              id={`exam-type-filter-${examType}`}
                              checked={selectedExamTypes.includes(examType)}
                              onCheckedChange={(checked) => {
                                setSelectedExamTypes(
                                  checked
                                    ? [...selectedExamTypes, examType]
                                    : selectedExamTypes.filter((t) => t !== examType)
                                );
                              }}
                            />
                            <label
                              htmlFor={`exam-type-filter-${examType}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {examType}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* View mode toggle - only for admin and manager */}
              {canUseTableView && (
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
              )}

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
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Clear filters button */}
        {hasActiveFilters && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={clearAllFilters}
            >
              <X className="w-4 h-4" />
              Сбросить все фильтры
            </Button>
          </div>
        )}

      {/* Groups Display */}
      {viewMode === "grid" || !canUseTableView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет групп, соответствующих выбранным фильтрам</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const uncompletedCount = uncompletedLessonsByGroup.get(group.id) || 0;
              const hasWarning = uncompletedCount > 0;

              return (
            <Card
              key={group.id}
              className={`hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden ${
                hasWarning ? 'border-2 border-red-500 bg-red-50' : ''
              }`}
              onClick={() => navigate(`/group/${group.id}`)}
            >
              {/* Top section */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex-1">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    {hasWarning && isTeacher && (
                      <Badge
                        variant="destructive"
                        className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center mr-2"
                      >
                        {uncompletedCount}
                      </Badge>
                    )}
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-base font-medium text-slate-700">
                      {group.studentsCount || 0}
                    </span>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
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
                </div>
                {group.school_location && (
                  <p className="text-sm text-slate-600">
                    Школа: {group.school_location}
                  </p>
                )}
              </div>

              {/* Blue divider */}
              <div className="h-1 bg-blue-400" />

              {/* Bottom section */}
              <div className="p-4 pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Book className="w-3.5 h-3.5 text-slate-500" />
                    <span>{group.subject.name}</span>
                    {group.subject.exam_type && (
                      <Badge className={group.subject.exam_type === 'ЕГЭ' ? 'bg-purple-100 text-purple-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                        {group.subject.exam_type}
                      </Badge>
                    )}
                  </div>
                  {group.schedules && group.schedules.length > 0 && (
                    <div className="flex flex-col items-end gap-0.5 text-sm text-slate-700">
                      {group.schedules.map((schedule, idx) => (
                        <span key={idx}>
                          {getDayAbbreviation(schedule.day_of_week)} {formatTime(schedule.start_time)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
            })
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>

                    {/* Subject filter */}
                    <TableHead>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent font-medium">
                            <span>Предмет</span>
                            <ChevronDown className={`ml-1 h-3 w-3 transition-colors ${selectedSubjects.length > 0 ? 'text-blue-600' : ''}`} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">Фильтр по предмету</h4>
                              {selectedSubjects.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedSubjects([])}
                                >
                                  Сбросить
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {subjects.map((subject) => (
                                <div key={subject.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`subject-${subject.id}`}
                                    checked={selectedSubjects.includes(subject.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedSubjects(
                                        checked
                                          ? [...selectedSubjects, subject.id]
                                          : selectedSubjects.filter((id) => id !== subject.id)
                                      );
                                    }}
                                  />
                                  <label
                                    htmlFor={`subject-${subject.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {formatSubjectName(subject)}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableHead>

                    {/* Teacher filter */}
                    <TableHead>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent font-medium">
                            <span>Преподаватель</span>
                            <ChevronDown className={`ml-1 h-3 w-3 transition-colors ${selectedTeachers.length > 0 ? 'text-blue-600' : ''}`} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">Фильтр по преподавателю</h4>
                              {selectedTeachers.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedTeachers([])}
                                >
                                  Сбросить
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {teachers.map((teacher) => (
                                <div key={teacher.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`teacher-${teacher.id}`}
                                    checked={selectedTeachers.includes(teacher.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedTeachers(
                                        checked
                                          ? [...selectedTeachers, teacher.id]
                                          : selectedTeachers.filter((id) => id !== teacher.id)
                                      );
                                    }}
                                  />
                                  <label
                                    htmlFor={`teacher-${teacher.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {teacher.first_name} {teacher.last_name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableHead>

                    <TableHead>Студентов</TableHead>
                    <TableHead>Расписание</TableHead>

                    {/* Location filter */}
                    <TableHead>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent font-medium">
                            <span>Школа</span>
                            <ChevronDown className={`ml-1 h-3 w-3 transition-colors ${selectedLocations.length > 0 ? 'text-blue-600' : ''}`} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">Фильтр по школе</h4>
                              {selectedLocations.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedLocations([])}
                                >
                                  Сбросить
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {uniqueLocations.map((location) => (
                                <div key={location} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`location-${location}`}
                                    checked={selectedLocations.includes(location)}
                                    onCheckedChange={(checked) => {
                                      setSelectedLocations(
                                        checked
                                          ? [...selectedLocations, location]
                                          : selectedLocations.filter((l) => l !== location)
                                      );
                                    }}
                                  />
                                  <label
                                    htmlFor={`location-${location}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {location}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableHead>

                    {isAdmin && <TableHead>Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                        <div className="flex flex-col items-center text-slate-500">
                          <Filter className="w-12 h-12 mb-3 opacity-50" />
                          <p>Нет групп, соответствующих выбранным фильтрам</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group) => (
                      <TableRow
                        key={group.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/group/${group.id}`)}
                      >
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{group.subject.name}</span>
                          {group.subject.exam_type && (
                            <Badge className={group.subject.exam_type === 'ЕГЭ' ? 'bg-purple-100 text-purple-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                              {group.subject.exam_type}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.teacher.first_name} {group.teacher.last_name}
                      </TableCell>
                      <TableCell>{group.studentsCount || 0}</TableCell>
                      <TableCell>{formatSchedules(group.schedules)}</TableCell>
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
                  ))
                  )}
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
                        {formatSubjectName(subject)}
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
                <Label htmlFor="level">Тип подготовки *</Label>
                <Select
                  value={newGroup.level}
                  onValueChange={(value) =>
                    setNewGroup({ ...newGroup, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ОГЭ">ОГЭ</SelectItem>
                    <SelectItem value="ЕГЭ">ЕГЭ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_location">Филиал</Label>
                <Select
                  value={newGroup.school_location}
                  onValueChange={(value) =>
                    setNewGroup({ ...newGroup, school_location: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.name}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Расписание занятий</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSchedule}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить время
                </Button>
              </div>

              {newSchedules.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Нажмите "Добавить время" чтобы указать расписание
                </p>
              ) : (
                <div className="space-y-3">
                  {newSchedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end p-3 border rounded-lg"
                    >
                      <Select
                        value={schedule.day_of_week}
                        onValueChange={(value) =>
                          handleUpdateSchedule(index, "day_of_week", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="День" />
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
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) =>
                          handleUpdateSchedule(index, "start_time", e.target.value)
                        }
                        className="w-32"
                      />

                      <Input
                        type="number"
                        value={schedule.duration_minutes}
                        onChange={(e) =>
                          handleUpdateSchedule(
                            index,
                            "duration_minutes",
                            parseInt(e.target.value) || 90
                          )
                        }
                        placeholder="90"
                        className="w-20"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSchedule(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                !newGroup.teacher_id ||
                !newGroup.level
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
      </main>
    </>
  );
}
