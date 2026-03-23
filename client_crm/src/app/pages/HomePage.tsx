import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";
import { Users, GraduationCap, Plus, LayoutGrid, LayoutList, Loader2, Trash2, Edit, X, Filter, Archive, ArchiveRestore, ChevronUp } from "lucide-react";
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
import { Checkbox } from "../components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../components/ui/drawer";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Group, GroupCreate, Subject, User, SchoolLocation } from "../types/api";
import { useAuth } from "../contexts/AuthContext";
import { useHeaderActions } from "../contexts/HeaderActionsContext";

interface GroupWithDetails extends Group {
  studentsCount?: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
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
  const [showArchived, setShowArchived] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { setHeaderActions } = useHeaderActions();

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [newGroup, setNewGroup] = useState<GroupCreate>({
    name: "",
    subject_id: "",
    teacher_id: "",
    level: "",
    school_location_id: undefined,
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

  // Inject Archive button into the mobile top bar
  useEffect(() => {
    if (!(isAdmin || isManager)) return;
    setHeaderActions(
      <Button
        variant="ghost"
        size="sm"
        className={`rounded-full gap-1.5 text-sm ${showArchived ? "text-violet-600" : "text-slate-600"}`}
        onClick={() => setShowArchived(!showArchived)}
      >
        <Archive className="w-4 h-4" />
        Архив
      </Button>
    );
    return () => setHeaderActions(null);
  }, [showArchived, isAdmin, isManager]);

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
      const managerLocation = isManager ? locations.find(loc => loc.manager_id === user?.id) : undefined;
      setNewGroup({
        name: "",
        subject_id: "",
        teacher_id: "",
        level: "",
        school_location_id: managerLocation?.id,
        description: "",
        comment: "",
      });
      setNewSchedules([]);
      toast.success(`Группа "${group.name}" успешно создана`);
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Ошибка при создании группы");
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
      toast.success("Группа успешно удалена");
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error("Ошибка при удалении группы");
    }
  };

  const handleArchiveGroup = async (id: string) => {
    if (!confirm("Вы уверены, что хотите переместить группу в архив?")) return;

    try {
      await api.archiveGroup(id);
      await loadData();
      toast.success("Группа перемещена в архив");
    } catch (error) {
      console.error("Failed to archive group:", error);
      toast.error("Ошибка при архивации группы");
    }
  };

  const handleRestoreGroup = async (id: string) => {
    try {
      await api.restoreGroup(id);
      await loadData();
      toast.success("Группа восстановлена из архива");
    } catch (error) {
      console.error("Failed to restore group:", error);
      toast.error("Ошибка при восстановлении группы");
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
      if (!group.location?.id || !selectedLocations.includes(group.location.id)) {
        return false;
      }
    }
    if (selectedExamTypes.length > 0) {
      if (!group.level || !selectedExamTypes.includes(group.level)) {
        return false;
      }
    }
    // Filter by archive status
    if (group.is_archived !== showArchived) {
      return false;
    }
    return true;
  });

  // Get unique locations from groups
  const uniqueLocations = locations.filter(loc =>
    groups.some(g => g.location?.id === loc.id)
  );

  const hasActiveFilters = selectedSubjects.length > 0 || selectedTeachers.length > 0 || selectedLocations.length > 0 || selectedExamTypes.length > 0;

  const clearAllFilters = () => {
    setSelectedSubjects([]);
    setSelectedTeachers([]);
    setSelectedLocations([]);
    setSelectedExamTypes([]);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 lg:top-0 bg-white border-b z-20">
        <div className="container mx-auto px-4 sm:px-6 pt-3 pb-3 space-y-3">
          {/* Title (desktop only) */}
          <h1 className="hidden sm:block text-xl sm:text-2xl font-semibold text-slate-900">Группы</h1>

          {/* Actions row */}
          <div className="flex items-center gap-2">
            {/* Filters button */}
            <Button
              variant="outline"
              size="sm"
              className={`rounded-full gap-1.5 ${hasActiveFilters ? "border-violet-600 text-violet-600" : ""}`}
              onClick={() => setFilterDrawerOpen(true)}
            >
              <Filter className="w-3.5 h-3.5" />
              Фильтры
              {hasActiveFilters && (
                <span className="bg-violet-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center leading-none">
                  {selectedSubjects.length + selectedTeachers.length + selectedExamTypes.length}
                </span>
              )}
            </Button>

            <div className="flex-1" />

            {/* View toggle (desktop only) */}
            {canUseTableView && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-slate-200"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${viewMode === "table" ? "bg-white shadow-sm" : "hover:bg-slate-200"}`}
                  onClick={() => setViewMode("table")}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Archive button (desktop only — mobile uses top bar) */}
            {(isAdmin || isManager) && (
              <Button
                variant="outline"
                size="sm"
                className={`hidden sm:flex rounded-full gap-1.5 ${showArchived ? "border-violet-600 text-violet-600" : ""}`}
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-3.5 h-3.5" />
                Архив
              </Button>
            )}

            {/* Create group button */}
            {(isAdmin || isManager) && (
              <Button
                className="bg-violet-600 hover:bg-violet-700 gap-2"
                onClick={() => {
                  if (isManager) {
                    const managerLocation = locations.find(loc => loc.manager_id === user?.id);
                    if (managerLocation) setNewGroup(prev => ({ ...prev, school_location_id: managerLocation.id }));
                  }
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Создать группу
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen} direction="bottom">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Фильтры</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-5 overflow-y-auto">
            {/* Exam type */}
            {isAdmin && (
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Тип подготовки</h4>
                <div className="flex flex-wrap gap-2">
                  {["ОГЭ", "ЕГЭ"].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setSelectedExamTypes(
                          selectedExamTypes.includes(type)
                            ? selectedExamTypes.filter((t) => t !== type)
                            : [...selectedExamTypes, type]
                        )
                      }
                      className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedExamTypes.includes(type)
                          ? "bg-violet-50 border-violet-300 text-violet-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Предмет</h4>
              <Select
                value={selectedSubjects[0] || "all"}
                onValueChange={(v) => setSelectedSubjects(v === "all" ? [] : [v])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все предметы</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <span className="flex items-center gap-2">
                        {subject.name}
                        {subject.exam_type && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${subject.exam_type === "ЕГЭ" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                            {subject.exam_type}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher */}
            {(isAdmin || isManager) && teachers.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Преподаватель</h4>
                <Select
                  value={selectedTeachers[0] || "all"}
                  onValueChange={(v) => setSelectedTeachers(v === "all" ? [] : [v])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все преподаватели</SelectItem>
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
          <DrawerFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { clearAllFilters(); setFilterDrawerOpen(false); }}
              >
                Сбросить
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                onClick={() => setFilterDrawerOpen(false)}
              >
                Применить
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-4">
      {/* Groups Display */}

      {/* Cards: mobile always / desktop when grid or teacher */}
      <div className={canUseTableView && viewMode === "table" ? "lg:hidden" : ""}>
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Нет групп, соответствующих выбранным фильтрам</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredGroups.map((group) => {
              const uncompletedCount = uncompletedLessonsByGroup.get(group.id) || 0;
              const hasWarning = uncompletedCount > 0;
              const examType = group.subject?.exam_type;
              const borderColor = examType === "ЕГЭ"
                ? "bg-blue-500"
                : examType === "ОГЭ"
                ? "bg-orange-400"
                : "bg-slate-300";
              const examBadgeClass = examType === "ЕГЭ"
                ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                : "bg-orange-100 text-orange-700 hover:bg-orange-100";

              return (
                <div
                  key={group.id}
                  className={`bg-white rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group ${
                    hasWarning ? "border-red-300" : "border-slate-100"
                  }`}
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <div className="flex">
                    {/* Colored left border */}
                    <div className={`w-1 shrink-0 ${hasWarning ? "bg-red-400" : borderColor}`} />

                    <div className="flex-1 p-4 min-w-0">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-slate-900 leading-snug">
                              {group.name}
                            </h3>
                            {group.is_archived && (
                              <Badge variant="secondary" className="text-xs shrink-0">Архив</Badge>
                            )}
                          </div>
                          {group.location && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              Филиал: {group.location.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasWarning && isTeacher && (
                            <Badge variant="destructive" className="text-xs px-1.5 h-5">
                              {uncompletedCount}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-slate-500">
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{group.studentsCount || 0}</span>
                          </div>
                          {(isAdmin || isManager) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={(e) => { e.stopPropagation(); navigate(`/group/${group.id}`); }}>
                                  <Edit className="w-4 h-4" />Редактировать
                                </DropdownMenuItem>
                                {!group.is_archived ? (
                                  <DropdownMenuItem className="gap-2 text-orange-600" onClick={(e) => { e.stopPropagation(); handleArchiveGroup(group.id); }}>
                                    <Archive className="w-4 h-4" />В архив
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem className="gap-2 text-green-600" onClick={(e) => { e.stopPropagation(); handleRestoreGroup(group.id); }}>
                                    <ArchiveRestore className="w-4 h-4" />Восстановить
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="gap-2 text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}>
                                  <Trash2 className="w-4 h-4" />Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-100 my-3" />

                      {/* Bottom row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{group.subject?.name}</span>
                          {examType && (
                            <Badge className={`${examBadgeClass} text-xs shrink-0`}>{examType}</Badge>
                          )}
                        </div>
                        {group.schedules && group.schedules.length > 0 && (
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {group.schedules.map((s, idx) => (
                              <span key={idx} className="text-xs text-slate-500">
                                {getDayAbbreviation(s.day_of_week)} {formatTime(s.start_time)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table: desktop only, admin/manager in table mode */}
      {canUseTableView && viewMode === "table" && (
        <div className="hidden lg:block bg-card border border-border rounded-xl">
          {/* Fixed table header */}
          <div className="shrink-0">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                {(isAdmin || isManager) && <col style={{ width: '12%' }} />}
              </colgroup>
              <thead className="bg-card border-b-2 border-border">
                <tr>
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
                                <div key={location.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`location-${location.id}`}
                                    checked={selectedLocations.includes(location.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedLocations(
                                        checked
                                          ? [...selectedLocations, location.id]
                                          : selectedLocations.filter((l) => l !== location.id)
                                      );
                                    }}
                                  />
                                  <label
                                    htmlFor={`location-${location.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {location.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableHead>

                    {(isAdmin || isManager) && <TableHead>Действия</TableHead>}
                  </tr>
                </thead>
              </table>
            </div>
          {/* Table body */}
          <div>
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                {(isAdmin || isManager) && <col style={{ width: '12%' }} />}
              </colgroup>
              <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(isAdmin || isManager) ? 7 : 6} className="text-center py-12">
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {group.name}
                          {group.is_archived && (
                            <Badge variant="secondary" className="text-xs">
                              Архив
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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
                        {group.teacher
                          ? `${group.teacher.first_name} ${group.teacher.last_name}`
                          : <span className="text-slate-400">Не назначен</span>
                        }
                      </TableCell>
                      <TableCell>{group.studentsCount || 0}</TableCell>
                      <TableCell>{formatSchedules(group.schedules)}</TableCell>
                      <TableCell>
                        {group.location?.name || (
                          <span className="text-slate-400">Не указан</span>
                        )}
                      </TableCell>
                      {(isAdmin || isManager) && (
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
                              {!group.is_archived ? (
                                <DropdownMenuItem
                                  className="gap-2 text-orange-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveGroup(group.id);
                                  }}
                                >
                                  <Archive className="w-4 h-4" />
                                  В архив
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="gap-2 text-green-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreGroup(group.id);
                                  }}
                                >
                                  <ArchiveRestore className="w-4 h-4" />
                                  Восстановить
                                </DropdownMenuItem>
                              )}
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
              </table>
            </div>
          </div>
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
                  value={newGroup.school_location_id || "none"}
                  onValueChange={(value) =>
                    setNewGroup({ ...newGroup, school_location_id: value === "none" ? undefined : value })
                  }
                  disabled={isManager}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isManager && <SelectItem value="none">Не указан</SelectItem>}
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
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

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
          aria-label="Наверх"
        >
          <ChevronUp className="w-5 h-5 text-slate-600" />
        </button>
      )}
    </div>
  );
}
