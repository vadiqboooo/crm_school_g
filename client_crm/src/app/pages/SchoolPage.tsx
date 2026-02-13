import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Plus, BookOpen, Users as UsersIcon, Edit, Trash2, MoreVertical, Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import type { Subject, User, Settings, SettingsUpdate } from "../types/api";
import { useAuth } from "../contexts/AuthContext";

export function SchoolPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Subject dialog
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);

  // Employee dialog
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "teacher" as "admin" | "teacher" | "manager",
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
      const [subjectsData, teachersData, settingsData] = await Promise.all([
        api.getSubjects(),
        api.getEmployees(),
        api.getSettings(),
      ]);

      setSubjects(subjectsData);
      setTeachers(teachersData); // Show all employees
      setSettings(settingsData);
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

  const handleCreateEmployee = async () => {
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
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить сотрудника?")) return;

    try {
      await api.deleteEmployee(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert("Ошибка при удалении сотрудника");
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

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects">Предметы</TabsTrigger>
          <TabsTrigger value="teachers">Сотрудники</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Предметы</h2>
            {isAdmin && (
              <Button
                className="gap-2"
                onClick={() => setSubjectDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Добавить предмет
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <Card key={subject.id} className="group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                    </div>
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
                          onClick={() => handleDeleteSubject(subject.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    {subject.description || "Описание отсутствует"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Сотрудники</h2>
            {isAdmin && (
              <Button
                className="gap-2"
                onClick={() => setEmployeeDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Добавить сотрудника
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {teachers.map((teacher) => {
              // Extract login from email (before @)
              const login = teacher.email.split('@')[0];
              const roleNames = {
                admin: "Администратор",
                teacher: "Преподаватель",
                manager: "Менеджер"
              };

              return (
                <Card key={teacher.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {teacher.first_name.charAt(0)}
                        {teacher.last_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {teacher.first_name} {teacher.last_name}
                        </h3>
                        <div className="flex gap-4 text-sm text-slate-600 mt-1">
                          <span>Логин: <span className="font-mono text-slate-700">{login}</span></span>
                          {teacher.phone && <span>{teacher.phone}</span>}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">{roleNames[teacher.role]}</span>
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
                            onClick={() => handleDeleteEmployee(teacher.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

      {/* Create Employee Dialog */}
      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить нового сотрудника</DialogTitle>
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

            {/* Display generated login */}
            {newEmployee.first_name && newEmployee.last_name && (
              <div className="space-y-2">
                <Label>Логин (генерируется автоматически)</Label>
                <Input
                  value={generateLogin(newEmployee.first_name, newEmployee.last_name)}
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
              <div className="space-y-2">
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
              onClick={() => setEmployeeDialogOpen(false)}
              disabled={creatingEmployee}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateEmployee}
              disabled={
                creatingEmployee ||
                !newEmployee.password ||
                !newEmployee.first_name ||
                !newEmployee.last_name
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingEmployee ? (
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
