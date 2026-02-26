import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Plus, BookOpen, Users as UsersIcon, Edit, Trash2, MoreVertical, Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { api } from "../lib/api";
import type { Subject, User, Settings, SettingsUpdate, SchoolLocation, SchoolLocationCreate, Exam, ExamCreate } from "../types/api";
import { useAuth } from "../contexts/AuthContext";
import { SubjectEditDialog } from "../components/SubjectEditDialog";

export function SchoolPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locations, setLocations] = useState<SchoolLocation[]>([]);
  const [examTemplates, setExamTemplates] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects");

  // Subject dialog
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);

  // Subject edit dialog
  const [subjectEditDialogOpen, setSubjectEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreateSubject, setIsCreateSubject] = useState(false);

  // Employee dialog
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "teacher" as "admin" | "teacher" | "manager",
  });

  // Location dialog
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<SchoolLocationCreate>({
    name: "",
    address: "",
    phone: "",
    description: "",
    manager_id: undefined,
  });

  // Exam template dialog
  const [examTemplateDialogOpen, setExamTemplateDialogOpen] = useState(false);
  const [creatingExamTemplate, setCreatingExamTemplate] = useState(false);
  const [editingExamTemplate, setEditingExamTemplate] = useState<Exam | null>(null);
  const [examTemplateForm, setExamTemplateForm] = useState<ExamCreate>({
    title: "",
    subject: "",
    difficulty: "",
    threshold_score: undefined,
    comment: "",
  });

  // Transliteration function
  const transliterate = (text: string): string => {
    const map: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    return text.split('').map(char => map[char] || char).join('');
  };

  // Generate login from name
  const generateLogin = (firstName: string, lastName: string): string => {
    if (!firstName || !lastName) return "";
    const firstNameLatin = transliterate(firstName).toLowerCase();
    const lastNameLatin = transliterate(lastName).toLowerCase();
    return `${lastNameLatin}_${firstNameLatin.charAt(0)}`;
  };

  // Settings form
  const [settingsForm, setSettingsForm] = useState<SettingsUpdate>({
    school_name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    default_rate: undefined,
    student_fee: undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectsData, teachersData, settingsData, locationsData, templatesData] = await Promise.all([
        api.getSubjects(),
        api.getEmployees(),
        api.getSettings(),
        api.getSchoolLocations(),
        api.getExamTemplates(),
      ]);

      setSubjects(subjectsData);
      setTeachers(teachersData); // Show all employees
      setSettings(settingsData);
      setLocations(locationsData);
      setExamTemplates(templatesData);
      setSettingsForm({
        school_name: settingsData.school_name || "",
        description: settingsData.description || "",
        email: settingsData.email || "",
        phone: settingsData.phone || "",
        address: settingsData.address || "",
        default_rate: settingsData.default_rate || undefined,
        student_fee: settingsData.student_fee || undefined,
      });
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;

    try {
      setCreatingSubject(true);
      await api.request("/subjects", {
        method: "POST",
        body: JSON.stringify({ name: newSubjectName }),
      });
      await loadData();
      setSubjectDialogOpen(false);
      setNewSubjectName("");
    } catch (error) {
      console.error("Failed to create subject:", error);
      alert("Ошибка при создании предмета");
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleOpenCreateSubject = () => {
    setEditingSubject(null);
    setIsCreateSubject(true);
    setSubjectEditDialogOpen(true);
  };

  const handleOpenEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setIsCreateSubject(false);
    setSubjectEditDialogOpen(true);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить предмет?")) return;

    try {
      await api.request(`/subjects/${id}`, { method: "DELETE" });
      await loadData();
    } catch (error) {
      console.error("Failed to delete subject:", error);
      alert("Ошибка при удалении предмета");
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const updated = await api.updateSettings(settingsForm);
      setSettings(updated);
      alert("Настройки сохранены");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Ошибка при сохранении настроек");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditEmployee = (employee: User) => {
    setEditingEmployee(employee);
    setNewEmployee({
      password: "",
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone || "",
      role: employee.role,
    });
    setEmployeeDialogOpen(true);
  };

  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    setNewEmployee({
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "teacher",
    });
    setEmployeeDialogOpen(true);
  };

  const handleCreateEmployee = async () => {
    if (editingEmployee) {
      // Update existing employee
      if (!newEmployee.first_name || !newEmployee.last_name) {
        alert("Заполните обязательные поля");
        return;
      }

      try {
        setCreatingEmployee(true);
        await api.updateEmployee(editingEmployee.id, {
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          phone: newEmployee.phone || undefined,
          role: newEmployee.role,
        });
        await loadData();
        setEmployeeDialogOpen(false);
        setEditingEmployee(null);
        setNewEmployee({
          password: "",
          first_name: "",
          last_name: "",
          phone: "",
          role: "teacher",
        });
      } catch (error) {
        console.error("Failed to update employee:", error);
        alert("Ошибка при обновлении сотрудника");
      } finally {
        setCreatingEmployee(false);
      }
    } else {
      // Create new employee
      if (!newEmployee.password || !newEmployee.first_name || !newEmployee.last_name) {
        alert("Заполните обязательные поля");
        return;
      }

      try {
        setCreatingEmployee(true);
        // Generate login and email
        const login = generateLogin(newEmployee.first_name, newEmployee.last_name);
        const email = `${login}@crm-school.com`;

        await api.createEmployee({
          ...newEmployee,
          email,
        });
        await loadData();
        setEmployeeDialogOpen(false);
        setNewEmployee({
          password: "",
          first_name: "",
          last_name: "",
          phone: "",
          role: "teacher",
        });
      } catch (error) {
        console.error("Failed to create employee:", error);
        alert("Ошибка при создании сотрудника");
      } finally {
        setCreatingEmployee(false);
      }
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      // First check if employee can be deleted
      const check = await api.checkEmployeeDeletion(id);

      if (!check.can_delete) {
        const groupsList = check.groups.map(g => `  • ${g.name}`).join('\n');
        alert(
          `Невозможно удалить сотрудника.\n\n` +
          `Он является преподавателем в следующих группах (${check.groups_count}):\n\n` +
          `${groupsList}\n\n` +
          `Сначала измените преподавателя в этих группах.`
        );
        return;
      }

      // If can delete, ask for confirmation
      if (!confirm(
        "Вы уверены, что хотите удалить сотрудника?\n\n" +
        "Примечание: В экзаменах останется имя и фамилия проверяющего."
      )) return;

      await api.deleteEmployee(id);
      await loadData();
    } catch (error: any) {
      console.error("Failed to delete employee:", error);
      alert(error.message || "Ошибка при удалении сотрудника");
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) {
      alert("Заполните название филиала");
      return;
    }

    try {
      setCreatingLocation(true);
      await api.createSchoolLocation(newLocation);
      await loadData();
      setLocationDialogOpen(false);
      setNewLocation({
        name: "",
        address: "",
        phone: "",
        description: "",
        manager_id: undefined,
      });
    } catch (error) {
      console.error("Failed to create location:", error);
      alert("Ошибка при создании филиала");
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить филиал?")) return;

    try {
      await api.deleteSchoolLocation(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete location:", error);
      alert("Ошибка при удалении филиала");
    }
  };

  const handleUpdateLocationManager = async (locationId: string, managerId: string | undefined) => {
    try {
      // Use null to explicitly clear the manager, undefined would be ignored by JSON.stringify
      const updatedLocation = await api.updateSchoolLocation(locationId, { manager_id: managerId === undefined ? null : managerId } as any);

      // Update only the specific location in state instead of reloading all data
      setLocations(prev => prev.map(loc =>
        loc.id === locationId ? updatedLocation : loc
      ));
    } catch (error) {
      console.error("Failed to update location manager:", error);
      alert("Ошибка при назначении менеджера");
    }
  };

  const handleOpenCreateExamTemplate = () => {
    setEditingExamTemplate(null);
    setExamTemplateForm({
      title: "",
      subject: "",
      difficulty: "",
      threshold_score: undefined,
      comment: "",
    });
    setExamTemplateDialogOpen(true);
  };

  const handleOpenEditExamTemplate = (template: Exam) => {
    setEditingExamTemplate(template);
    setExamTemplateForm({
      title: template.title,
      subject: template.subject || "",
      subject_id: template.subject_id,
      difficulty: template.difficulty || "",
      threshold_score: template.threshold_score,
      comment: template.comment || "",
    });
    setExamTemplateDialogOpen(true);
  };

  const handleSaveExamTemplate = async () => {
    if (!examTemplateForm.title.trim()) {
      alert("Введите название экзамена");
      return;
    }

    try {
      setCreatingExamTemplate(true);
      if (editingExamTemplate) {
        await api.updateExamTemplate(editingExamTemplate.id, examTemplateForm);
      } else {
        await api.createExamTemplate(examTemplateForm);
      }
      await loadData();
      setExamTemplateDialogOpen(false);
    } catch (error) {
      console.error("Failed to save exam template:", error);
      alert("Ошибка при сохранении шаблона экзамена");
    } finally {
      setCreatingExamTemplate(false);
    }
  };

  const handleDeleteExamTemplate = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить шаблон экзамена?")) return;

    try {
      await api.deleteExamTemplate(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete exam template:", error);
      alert("Ошибка при удалении шаблона экзамена");
    }
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
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Школа</h1>
        <p className="text-slate-600 mt-1">
          Управление предметами, преподавателями и настройками
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects">Предметы</TabsTrigger>
          <TabsTrigger value="teachers">Сотрудники</TabsTrigger>
          <TabsTrigger value="locations">Филиалы</TabsTrigger>
          <TabsTrigger value="exams">Экзамены</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Предметы</h2>
            {isAdmin && (
              <Button
                className="gap-2"
                onClick={handleOpenCreateSubject}
              >
                <Plus className="w-4 h-4" />
                Добавить предмет
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Количество заданий</TableHead>
                    <TableHead>Первичный балл</TableHead>
                    <TableHead>Статус</TableHead>
                    {isAdmin && <TableHead className="w-[80px]">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-500">
                        Предметы не найдены
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{subject.name}</span>
                              {subject.exam_type && (
                                <Badge className={subject.exam_type === 'ЕГЭ' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}>
                                  {subject.exam_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {subject.tasks && subject.tasks.length > 0 ? (
                            <span className="text-slate-700">{subject.tasks.length}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subject.tasks && subject.tasks.length > 0 ? (
                            <Badge variant="outline" className="font-mono">
                              {subject.tasks.reduce((sum: number, task: any) => sum + (task.maxScore || 0), 0)}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subject.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Активен</Badge>
                          ) : (
                            <Badge variant="secondary">Неактивен</Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleOpenEditSubject(subject)}
                                >
                                  <Edit className="w-4 h-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-red-600"
                                  onClick={() => handleDeleteSubject(subject.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Сотрудники</h2>
            {isAdmin && (
              <Button
                className="gap-2"
                onClick={handleOpenCreateEmployee}
              >
                <Plus className="w-4 h-4" />
                Добавить сотрудника
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Роль</TableHead>
                    {isAdmin && <TableHead className="w-[80px]">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => {
                    const login = teacher.email.split('@')[0];
                    const roleNames = {
                      admin: "Администратор",
                      teacher: "Преподаватель",
                      manager: "Менеджер"
                    };

                    return (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {teacher.first_name.charAt(0)}
                              {teacher.last_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">
                                {teacher.first_name} {teacher.last_name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-slate-700">{login}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {teacher.phone || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{roleNames[teacher.role]}</span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleOpenEditEmployee(teacher)}
                                >
                                  <Edit className="w-4 h-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-red-600"
                                  onClick={() => handleDeleteEmployee(teacher.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {teachers.length === 0 && (
                <div className="py-8 text-center text-slate-500">
                  Сотрудники еще не добавлены
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Филиалы школы</h2>
            {isAdmin && (
              <Button
                className="gap-2"
                onClick={() => setLocationDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Добавить филиал
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((location) => {
              const managers = teachers.filter(t => t.role === "manager");
              return (
                <Card key={location.id} className="group">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      {location.address && (
                        <p className="text-sm text-slate-600 mt-1">{location.address}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                            className="gap-2 text-red-600"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor={`manager-${location.id}`}>Менеджер филиала</Label>
                        <Select
                          value={location.manager_id || "none"}
                          onValueChange={(value) =>
                            handleUpdateLocationManager(
                              location.id,
                              value === "none" ? undefined : value
                            )
                          }
                        >
                          <SelectTrigger id={`manager-${location.id}`}>
                            <SelectValue placeholder="Не назначен" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не назначен</SelectItem>
                            {managers.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.first_name} {manager.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {!isAdmin && location.manager && (
                      <p className="text-sm text-slate-600">
                        <strong>Менеджер:</strong> {location.manager.first_name} {location.manager.last_name}
                      </p>
                    )}
                    {location.phone && (
                      <p className="text-sm text-slate-600">
                        <strong>Телефон:</strong> {location.phone}
                      </p>
                    )}
                    {location.description && (
                      <p className="text-sm text-slate-600">
                        {location.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Шаблоны экзаменов</h2>
            <Button
              className="gap-2"
              onClick={handleOpenCreateExamTemplate}
            >
              <Plus className="w-4 h-4" />
              Добавить шаблон
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examTemplates.map((template) => (
              <Card key={template.id} className="group">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    {template.subject_rel ? (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-600">
                          Предмет: {template.subject_rel.name}
                        </p>
                        {template.subject_rel.exam_type && (
                          <Badge className={template.subject_rel.exam_type === 'ЕГЭ' ? 'bg-purple-100 text-purple-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                            {template.subject_rel.exam_type}
                          </Badge>
                        )}
                      </div>
                    ) : template.subject ? (
                      <p className="text-sm text-slate-600 mt-1">
                        Предмет: {template.subject}
                      </p>
                    ) : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
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
                        onClick={() => handleOpenEditExamTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 text-red-600"
                        onClick={() => handleDeleteExamTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {template.difficulty && (
                    <p className="text-sm text-slate-600 mb-1">
                      <strong>Сложность:</strong> {template.difficulty}
                    </p>
                  )}
                  {template.threshold_score && (
                    <p className="text-sm text-slate-600 mb-1">
                      <strong>Проходной балл:</strong> {template.threshold_score}
                    </p>
                  )}
                  {template.comment && (
                    <p className="text-sm text-slate-600 mt-2">
                      {template.comment}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {examTemplates.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-slate-500">
                Шаблоны экзаменов еще не добавлены
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки школы</CardTitle>
              <CardDescription>
                Общая информация и параметры работы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school_name">Название школы</Label>
                  <Input
                    id="school_name"
                    value={settingsForm.school_name}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        school_name: e.target.value,
                      })
                    }
                    placeholder="Школа программирования"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={settingsForm.description}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Описание школы..."
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settingsForm.email}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="info@school.com"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      value={settingsForm.phone}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+7 999 123-45-67"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Адрес</Label>
                  <Textarea
                    id="address"
                    value={settingsForm.address}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        address: e.target.value,
                      })
                    }
                    placeholder="Адрес школы..."
                    rows={2}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_rate">Ставка преподавателя (₽/час)</Label>
                    <Input
                      id="default_rate"
                      type="number"
                      value={settingsForm.default_rate || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          default_rate: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="1000"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student_fee">Стоимость для студента (₽/занятие)</Label>
                    <Input
                      id="student_fee"
                      type="number"
                      value={settingsForm.student_fee || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          student_fee: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="2000"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Сохранить настройки
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить новый предмет</DialogTitle>
            <DialogDescription>
              Введите название предмета
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="subject_name">Название предмета</Label>
              <Input
                id="subject_name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Математика, Физика, и т.д."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubjectDialogOpen(false)}
              disabled={creatingSubject}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateSubject}
              disabled={creatingSubject || !newSubjectName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingSubject ? (
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

      {/* Create/Edit Employee Dialog */}
      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Редактировать сотрудника" : "Добавить нового сотрудника"}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о сотруднике
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp_first_name">Имя *</Label>
                <Input
                  id="emp_first_name"
                  value={newEmployee.first_name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, first_name: e.target.value })
                  }
                  placeholder="Иван"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp_last_name">Фамилия *</Label>
                <Input
                  id="emp_last_name"
                  value={newEmployee.last_name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, last_name: e.target.value })
                  }
                  placeholder="Иванов"
                  required
                />
              </div>
            </div>

            {/* Display generated login for new employee */}
            {!editingEmployee && newEmployee.first_name && newEmployee.last_name && (
              <div className="space-y-2">
                <Label>Логин (генерируется автоматически)</Label>
                <Input
                  value={generateLogin(newEmployee.first_name, newEmployee.last_name)}
                  disabled
                  className="bg-slate-50"
                />
              </div>
            )}

            {/* Display existing login for editing employee */}
            {editingEmployee && (
              <div className="space-y-2">
                <Label>Логин</Label>
                <Input
                  value={editingEmployee.email.split('@')[0]}
                  disabled
                  className="bg-slate-50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="emp_phone">Телефон</Label>
              <Input
                id="emp_phone"
                value={newEmployee.phone}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, phone: e.target.value })
                }
                placeholder="+7 999 123-45-67"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!editingEmployee && (
                <div className="space-y-2">
                  <Label htmlFor="emp_password">Пароль *</Label>
                  <Input
                    id="emp_password"
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}
              <div className={`space-y-2 ${editingEmployee ? 'col-span-2' : ''}`}>
                <Label htmlFor="emp_role">Роль *</Label>
                <Select
                  value={newEmployee.role}
                  onValueChange={(value: "admin" | "teacher" | "manager") =>
                    setNewEmployee({ ...newEmployee, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Преподаватель</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmployeeDialogOpen(false);
                setEditingEmployee(null);
              }}
              disabled={creatingEmployee}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateEmployee}
              disabled={
                creatingEmployee ||
                (!editingEmployee && !newEmployee.password) ||
                !newEmployee.first_name ||
                !newEmployee.last_name
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingEmployee ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingEmployee ? "Сохранение..." : "Создание..."}
                </>
              ) : (
                editingEmployee ? "Сохранить" : "Создать"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить филиал</DialogTitle>
            <DialogDescription>
              Заполните информацию о филиале школы
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loc_name">Название *</Label>
              <Input
                id="loc_name"
                value={newLocation.name}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, name: e.target.value })
                }
                placeholder="Филиал Центральный"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc_manager">Менеджер филиала</Label>
              <Select
                value={newLocation.manager_id || "none"}
                onValueChange={(value) =>
                  setNewLocation({
                    ...newLocation,
                    manager_id: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger id="loc_manager">
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {teachers
                    .filter((t) => t.role === "manager")
                    .map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc_address">Адрес</Label>
              <Textarea
                id="loc_address"
                value={newLocation.address || ""}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, address: e.target.value })
                }
                placeholder="г. Москва, ул. Примерная, д. 1"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc_phone">Телефон</Label>
              <Input
                id="loc_phone"
                value={newLocation.phone || ""}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, phone: e.target.value })
                }
                placeholder="+7 999 123-45-67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc_description">Описание</Label>
              <Textarea
                id="loc_description"
                value={newLocation.description || ""}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, description: e.target.value })
                }
                placeholder="Дополнительная информация о филиале..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLocationDialogOpen(false)}
              disabled={creatingLocation}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateLocation}
              disabled={creatingLocation || !newLocation.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingLocation ? (
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

      {/* Subject Edit Dialog */}
      <SubjectEditDialog
        subject={editingSubject}
        open={subjectEditDialogOpen}
        onOpenChange={setSubjectEditDialogOpen}
        onSuccess={loadData}
        isCreate={isCreateSubject}
      />

      {/* Exam Template Dialog */}
      <Dialog open={examTemplateDialogOpen} onOpenChange={setExamTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingExamTemplate ? "Редактировать шаблон экзамена" : "Создать шаблон экзамена"}
            </DialogTitle>
            <DialogDescription>
              Этот шаблон можно будет использовать при создании экзаменов в группах
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exam_title">Название экзамена *</Label>
              <Input
                id="exam_title"
                value={examTemplateForm.title}
                onChange={(e) =>
                  setExamTemplateForm({ ...examTemplateForm, title: e.target.value })
                }
                placeholder="ЕГЭ по математике, ОГЭ по русскому..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_subject">Предмет</Label>
                <Select
                  value={examTemplateForm.subject_id || ""}
                  onValueChange={(value) => {
                    const selectedSubject = subjects.find(s => s.id === value);
                    setExamTemplateForm({
                      ...examTemplateForm,
                      subject_id: value,
                      subject: selectedSubject?.name
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите предмет" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}{subject.exam_type && ` (${subject.exam_type})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam_difficulty">Сложность</Label>
                <Input
                  id="exam_difficulty"
                  value={examTemplateForm.difficulty || ""}
                  onChange={(e) =>
                    setExamTemplateForm({ ...examTemplateForm, difficulty: e.target.value })
                  }
                  placeholder="Базовый, Профильный..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam_threshold">Проходной балл</Label>
              <Input
                id="exam_threshold"
                type="number"
                value={examTemplateForm.threshold_score || ""}
                onChange={(e) =>
                  setExamTemplateForm({
                    ...examTemplateForm,
                    threshold_score: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam_comment">Комментарий</Label>
              <Textarea
                id="exam_comment"
                value={examTemplateForm.comment || ""}
                onChange={(e) =>
                  setExamTemplateForm({ ...examTemplateForm, comment: e.target.value })
                }
                placeholder="Дополнительная информация об экзамене..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExamTemplateDialogOpen(false)}
              disabled={creatingExamTemplate}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveExamTemplate}
              disabled={creatingExamTemplate || !examTemplateForm.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingExamTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
