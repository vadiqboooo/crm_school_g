import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Plus, BookOpen, Users as UsersIcon, Edit, Trash2, MoreVertical, Loader2, Save, CreditCard, ToggleLeft, ToggleRight, KeyRound } from "lucide-react";
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
import type { Subject, User, Settings, SettingsUpdate, SchoolLocation, SchoolLocationCreate, Exam, ExamCreate, SubscriptionPlan, SubscriptionPlanCreate, ExamPortalSession, ExamTimeSlotCreate, PortalCredential } from "../types/api";
import { useAuth } from "../contexts/AuthContext";
import { SubjectEditDialog } from "../components/SubjectEditDialog";
import { PrintCredentialsModal } from "../components/PrintCredentialsModal";

export function SchoolPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locations, setLocations] = useState<SchoolLocation[]>([]);
  const [examTemplates, setExamTemplates] = useState<Exam[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [examSessions, setExamSessions] = useState<ExamPortalSession[]>([]);
  const [examDialogTab, setExamDialogTab] = useState<"settings" | "sessions">("settings");
  const [savingSession, setSavingSession] = useState(false);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotSessionId, setSlotSessionId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState<ExamTimeSlotCreate>({ date: "", start_time: "09:00", total_seats: 10 });
  const [savingSlot, setSavingSlot] = useState(false);
  const [addSessionLocationId, setAddSessionLocationId] = useState("none");
  const [addSessionNotes, setAddSessionNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects");

  // Subscription dialog
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionPlanCreate>({
    name: "",
    lessons_count: 8,
    price: 0,
  });

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
    salary_rate: "" as string,
    salary_bonus_per_student: "" as string,
    salary_base_students: "8" as string,
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

  // Credentials
  const [generatingAllCreds, setGeneratingAllCreds] = useState(false);
  const [printAllCredentials, setPrintAllCredentials] = useState<PortalCredential[] | null>(null);

  // Exam template dialog
  const [examTemplateDialogOpen, setExamTemplateDialogOpen] = useState(false);
  const [creatingExamTemplate, setCreatingExamTemplate] = useState(false);
  const [editingExamTemplate, setEditingExamTemplate] = useState<Exam | null>(null);
  const [examTemplateForm, setExamTemplateForm] = useState<ExamCreate>({
    title: "",
    is_registration_open: false,
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
      const [subjectsData, teachersData, settingsData, locationsData, templatesData, plansData, sessionsData] = await Promise.all([
        api.getSubjects(),
        api.getEmployees(),
        api.getSettings(),
        api.getSchoolLocations(),
        api.getExamTemplates(),
        api.getSubscriptionPlans(),
        api.getExamPortalSessions(),
      ]);

      setSubjects(subjectsData);
      setTeachers(teachersData); // Show all employees
      setSettings(settingsData);
      setLocations(locationsData);
      setExamTemplates(templatesData);
      setSubscriptionPlans(plansData);
      setExamSessions(sessionsData);
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

  const handleOpenSubscriptionDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setSubscriptionForm({
        name: plan.name,
        lessons_count: plan.lessons_count,
        price: plan.price,
        valid_from: plan.valid_from ?? null,
        valid_until: plan.valid_until ?? null,
      });
    } else {
      setEditingPlan(null);
      setSubscriptionForm({ name: "", lessons_count: 8, price: 0, valid_from: null, valid_until: null });
    }
    setSubscriptionDialogOpen(true);
  };

  const handleSaveSubscriptionPlan = async () => {
    if (!subscriptionForm.name.trim() || !subscriptionForm.lessons_count || !subscriptionForm.price) return;
    try {
      setSavingPlan(true);
      if (editingPlan) {
        await api.updateSubscriptionPlan(editingPlan.id, subscriptionForm);
      } else {
        await api.createSubscriptionPlan(subscriptionForm);
      }
      await loadData();
      setSubscriptionDialogOpen(false);
    } catch (error) {
      console.error("Failed to save subscription plan:", error);
      alert("Ошибка при сохранении абонемента");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeleteSubscriptionPlan = async (id: string) => {
    if (!confirm("Удалить абонемент? Студенты с этим абонементом потеряют привязку.")) return;
    try {
      await api.deleteSubscriptionPlan(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete subscription plan:", error);
      alert("Ошибка при удалении абонемента");
    }
  };

  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    try {
      await api.updateSubscriptionPlan(plan.id, { is_active: !plan.is_active });
      await loadData();
    } catch (error) {
      console.error("Failed to toggle plan:", error);
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
      salary_rate: employee.salary_rate != null ? String(employee.salary_rate) : "",
      salary_bonus_per_student: employee.salary_bonus_per_student != null ? String(employee.salary_bonus_per_student) : "",
      salary_base_students: String(employee.salary_base_students ?? 8),
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
          salary_rate: newEmployee.salary_rate ? parseFloat(newEmployee.salary_rate) : null,
          salary_bonus_per_student: newEmployee.salary_bonus_per_student ? parseFloat(newEmployee.salary_bonus_per_student) : null,
          salary_base_students: newEmployee.salary_base_students ? parseInt(newEmployee.salary_base_students) : 8,
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
          salary_rate: "",
          salary_bonus_per_student: "",
          salary_base_students: "8",
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
          salary_rate: "",
          salary_bonus_per_student: "",
          salary_base_students: "8",
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
    setExamDialogTab("settings");
    setExamTemplateForm({ title: "", is_registration_open: false });
    setExamTemplateDialogOpen(true);
  };

  const handleOpenEditExamTemplate = (template: Exam, tab: "settings" | "sessions" = "settings") => {
    setEditingExamTemplate(template);
    setExamDialogTab(tab);
    setAddSessionLocationId("none");
    setAddSessionNotes("");
    setExamTemplateForm({
      title: template.title,
      is_registration_open: template.is_registration_open ?? false,
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

  // ── Exam Portal Session handlers ─────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!editingExamTemplate) return;
    setSavingSession(true);
    try {
      await api.createExamPortalSession({
        exam_id: editingExamTemplate.id,
        school_location_id: addSessionLocationId === "none" ? null : addSessionLocationId,
        notes: addSessionNotes || null,
        is_active: false,
      });
      setAddSessionLocationId("none");
      setAddSessionNotes("");
      const updated = await api.getExamPortalSessions();
      setExamSessions(updated);
    } catch { alert("Ошибка при создании сессии"); }
    finally { setSavingSession(false); }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Удалить сессию записи? Все записи учеников будут удалены.")) return;
    try {
      await api.deleteExamPortalSession(id);
      setExamSessions(prev => prev.filter(s => s.id !== id));
    } catch { alert("Ошибка при удалении"); }
  };

  const handleOpenAddSlot = (sessionId: string) => {
    setSlotSessionId(sessionId);
    setSlotForm({ date: "", start_time: "09:00", total_seats: 10 });
    setSlotDialogOpen(true);
  };

  const handleAddSlot = async () => {
    if (!slotSessionId || !slotForm.date) return alert("Укажите дату");
    setSavingSlot(true);
    try {
      const updated = await api.addExamTimeSlot(slotSessionId, slotForm);
      setExamSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSlotDialogOpen(false);
    } catch { alert("Ошибка при добавлении слота"); }
    finally { setSavingSlot(false); }
  };

  const handleDeleteSlot = async (sessionId: string, slotId: string) => {
    try {
      await api.deleteExamTimeSlot(sessionId, slotId);
      const updated = await api.getExamPortalSessions();
      setExamSessions(updated);
    } catch { alert("Ошибка при удалении слота"); }
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
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {printAllCredentials && (
        <PrintCredentialsModal
          title="Все ученики"
          credentials={printAllCredentials}
          onClose={() => setPrintAllCredentials(null)}
        />
      )}
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
          <TabsTrigger value="subscriptions">Абонементы</TabsTrigger>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                disabled={generatingAllCreds}
                onClick={async () => {
                  setGeneratingAllCreds(true);
                  try {
                    const creds = await api.generateAllCredentials();
                    setPrintAllCredentials(creds);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setGeneratingAllCreds(false);
                  }
                }}
              >
                {generatingAllCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span className="hidden sm:inline">Выдать доступы всем</span>
              </Button>
              {isAdmin && (
                <Button
                  className="gap-2"
                  onClick={handleOpenCreateEmployee}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Добавить сотрудника</span>
                </Button>
              )}
            </div>
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
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{roleNames[teacher.role]}</span>
                            {teacher.role === "teacher" && teacher.salary_rate && (
                              <span className="text-xs text-muted-foreground">{teacher.salary_rate} ₽/урок</span>
                            )}
                          </div>
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
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                    template.is_registration_open
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {template.is_registration_open ? (
                      <><ToggleRight className="w-3.5 h-3.5" /> Запись открыта</>
                    ) : (
                      <><ToggleLeft className="w-3.5 h-3.5" /> Запись закрыта</>
                    )}
                  </span>
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

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Абонементы</h2>
            {isAdmin && (
              <Button
                onClick={() => handleOpenSubscriptionDialog()}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить абонемент
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead className="text-center">Кол-во уроков</TableHead>
                    <TableHead className="text-center">Стоимость</TableHead>
                    <TableHead className="text-center">За урок</TableHead>
                    <TableHead className="text-center">Срок действия</TableHead>
                    <TableHead className="text-center">Статус</TableHead>
                    {isAdmin && <TableHead className="text-right">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-slate-500">
                        Абонементы не созданы
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptionPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="text-center">{plan.lessons_count}</TableCell>
                        <TableCell className="text-center font-semibold">{plan.price.toLocaleString("ru-RU")} ₽</TableCell>
                        <TableCell className="text-center text-slate-500">{(plan.price_per_lesson ?? 0).toLocaleString("ru-RU")} ₽</TableCell>
                        <TableCell className="text-center text-sm text-slate-600">
                          {plan.valid_from || plan.valid_until ? (
                            <span>
                              {plan.valid_from ? new Date(plan.valid_from).toLocaleDateString("ru-RU") : "∞"}
                              {" — "}
                              {plan.valid_until ? new Date(plan.valid_until).toLocaleDateString("ru-RU") : "∞"}
                            </span>
                          ) : (
                            <span className="text-slate-400">Бессрочно</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={plan.is_active ? "default" : "secondary"}>
                            {plan.is_active ? "Активен" : "Неактивен"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenSubscriptionDialog(plan)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTogglePlanActive(plan)}>
                                  {plan.is_active ? (
                                    <><ToggleLeft className="w-4 h-4 mr-2" />Деактивировать</>
                                  ) : (
                                    <><ToggleRight className="w-4 h-4 mr-2" />Активировать</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteSubscriptionPlan(plan.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
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
      </Tabs>

      {/* Subscription Plan Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Редактировать абонемент" : "Новый абонемент"}</DialogTitle>
            <DialogDescription>
              Укажите стоимость абонемента. Цена за урок вычисляется автоматически.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan_name">Название</Label>
              <Input
                id="plan_name"
                value={subscriptionForm.name}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, name: e.target.value })}
                placeholder="Стандарт, Расширенный..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan_lessons">Кол-во уроков</Label>
                <Input
                  id="plan_lessons"
                  type="number"
                  min={1}
                  value={subscriptionForm.lessons_count}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, lessons_count: e.target.value === "" ? "" as any : parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_price">Стоимость абонемента (₽)</Label>
                <Input
                  id="plan_price"
                  type="number"
                  min={0}
                  value={subscriptionForm.price}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, price: e.target.value === "" ? "" as any : parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan_valid_from">Действует с</Label>
                <Input
                  id="plan_valid_from"
                  type="date"
                  value={subscriptionForm.valid_from ?? ""}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, valid_from: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_valid_until">Действует до</Label>
                <Input
                  id="plan_valid_until"
                  type="date"
                  value={subscriptionForm.valid_until ?? ""}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, valid_until: e.target.value || null })}
                />
              </div>
            </div>
            {subscriptionForm.lessons_count > 0 && subscriptionForm.price > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center justify-between">
                <span className="text-sm text-blue-700">Цена за 1 урок</span>
                <span className="font-bold text-blue-900">
                  {(subscriptionForm.price / subscriptionForm.lessons_count).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)} disabled={savingPlan}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveSubscriptionPlan}
              disabled={savingPlan || !subscriptionForm.name.trim() || !subscriptionForm.lessons_count || !subscriptionForm.price}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingPlan ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            {/* Salary rate section — only for teachers */}
            {newEmployee.role === "teacher" && (
              <div className="border-t pt-4 mt-2 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Ставка за урок</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="salary_base">База студентов</Label>
                    <Input
                      id="salary_base"
                      type="number"
                      min={1}
                      value={newEmployee.salary_base_students}
                      onChange={(e) => setNewEmployee({ ...newEmployee, salary_base_students: e.target.value })}
                      placeholder="8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salary_rate">Базовая ставка (₽)</Label>
                    <Input
                      id="salary_rate"
                      type="number"
                      min={0}
                      value={newEmployee.salary_rate}
                      onChange={(e) => setNewEmployee({ ...newEmployee, salary_rate: e.target.value })}
                      placeholder="1250"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salary_bonus">Надбавка/студент (₽)</Label>
                    <Input
                      id="salary_bonus"
                      type="number"
                      min={0}
                      value={newEmployee.salary_bonus_per_student}
                      onChange={(e) => setNewEmployee({ ...newEmployee, salary_bonus_per_student: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>
                {newEmployee.salary_rate && (
                  <p className="text-xs text-muted-foreground">
                    При ≤{newEmployee.salary_base_students || 8} студентах: {parseFloat(newEmployee.salary_rate).toLocaleString("ru-RU")} ₽.
                    {newEmployee.salary_bonus_per_student && ` За каждого сверх: +${parseFloat(newEmployee.salary_bonus_per_student).toLocaleString("ru-RU")} ₽.`}
                  </p>
                )}
              </div>
            )}
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

      {/* ── Add Time Slot Dialog ──────────────────────────────────────── */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить слот</DialogTitle>
            <DialogDescription>Дата, время и количество мест для одного слота</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Дата проведения</Label>
              <Input
                type="date"
                value={slotForm.date}
                onChange={e => setSlotForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Время начала</Label>
                <Input
                  type="time"
                  value={slotForm.start_time}
                  onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Количество мест</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={slotForm.total_seats}
                  onChange={e => setSlotForm(f => ({ ...f, total_seats: e.target.value === "" ? "" as any : parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAddSlot} disabled={savingSlot || !slotForm.date}>
              {savingSlot && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exam Template Dialog */}
      <Dialog open={examTemplateDialogOpen} onOpenChange={setExamTemplateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingExamTemplate ? "Редактировать шаблон экзамена" : "Создать шаблон экзамена"}
            </DialogTitle>
            <DialogDescription>
              Этот шаблон можно будет использовать при создании экзаменов в группах
            </DialogDescription>
          </DialogHeader>
          <Tabs value={examDialogTab} onValueChange={(v) => setExamDialogTab(v as "settings" | "sessions")} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="settings">Настройки</TabsTrigger>
              {editingExamTemplate && <TabsTrigger value="sessions">Запись на экзамен</TabsTrigger>}
            </TabsList>

            <TabsContent value="settings" className="flex-1 overflow-y-auto mt-0">
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

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Открыта запись</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ученики смогут записаться через портал</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExamTemplateForm({ ...examTemplateForm, is_registration_open: !examTemplateForm.is_registration_open })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      examTemplateForm.is_registration_open
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {examTemplateForm.is_registration_open ? (
                      <><ToggleRight className="w-4 h-4" /> Открыта</>
                    ) : (
                      <><ToggleLeft className="w-4 h-4" /> Закрыта</>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 pb-1">
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
              </div>
            </TabsContent>

            {editingExamTemplate && (
              <TabsContent value="sessions" className="flex-1 overflow-y-auto mt-0 space-y-4 py-4">
                {/* Add session form */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <p className="text-sm font-semibold">Добавить сессию записи</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Локация</Label>
                      <Select value={addSessionLocationId} onValueChange={setAddSessionLocationId}>
                        <SelectTrigger><SelectValue placeholder="Все локации" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Все локации</SelectItem>
                          {locations.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Примечание</Label>
                      <Input
                        value={addSessionNotes}
                        onChange={e => setAddSessionNotes(e.target.value)}
                        placeholder="Не забудьте паспорт"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleCreateSession} disabled={savingSession} className="gap-1.5">
                    {savingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Добавить сессию
                  </Button>
                </div>

                {/* Sessions list for this exam */}
                {(() => {
                  const thisSessions = examSessions.filter(s => s.exam_id === editingExamTemplate.id);
                  if (thisSessions.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Сессий записи нет. Добавьте сессию выше.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {thisSessions.map(session => (
                        <Card key={session.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {session.school_location_name ? (
                                  <Badge variant="outline" className="text-xs">{session.school_location_name}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Все локации</span>
                                )}
                                {session.notes && (
                                  <span className="text-xs text-muted-foreground">{session.notes}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2" onClick={() => handleOpenAddSlot(session.id)}>
                                  <Plus className="w-3 h-3" /> Слот
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                  onClick={() => handleDeleteSession(session.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {session.slots.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Нет слотов — нажмите «Слот» чтобы добавить</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {session.slots.map(slot => (
                                  <div key={slot.id} className="group/slot flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm">
                                    <span className="font-medium">{new Date(slot.date).toLocaleDateString("ru", { day: "numeric", month: "short" })}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <span>{slot.start_time}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <span className={slot.available_seats === 0 ? "text-red-500" : slot.available_seats <= 3 ? "text-amber-600" : "text-emerald-600"}>
                                      {slot.available_seats}/{slot.total_seats} мест
                                    </span>
                                    {slot.registered_count > 0 && (
                                      <span className="text-xs text-muted-foreground">({slot.registered_count} зап.)</span>
                                    )}
                                    <button
                                      onClick={() => handleDeleteSlot(session.id, slot.id)}
                                      className="opacity-0 group-hover/slot:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
