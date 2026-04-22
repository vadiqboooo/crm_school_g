import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Plus, BookOpen, Users as UsersIcon, Edit, Trash2, MoreVertical, Loader2, Save, CreditCard, ToggleLeft, ToggleRight, KeyRound, ChevronUp, ChevronDown } from "lucide-react";
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
import type { Subject, User, Settings, SettingsUpdate, SchoolLocation, SchoolLocationCreate, Exam, ExamCreate, SubscriptionPlan, SubscriptionPlanCreate, ExamPortalSession, ExamTimeSlotCreate, PortalCredential, HomeBanner, HomeBannerCreate, HomeBannerFormFieldCreate, HomeBannerSignup, SchoolNotification, SchoolNotificationCreate, HomeInfoCard } from "../types/api";
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

  // Home banners
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const defaultBannerForm: HomeBannerCreate = {
    title: "",
    subtitle: "",
    badge_text: "",
    badge_color: "#f59e0b",
    price_text: "",
    footer_tags: "",
    icon: "",
    gradient_from: "#4f46e5",
    gradient_to: "#7c3aed",
    background_image_url: "",
    action_url: "",
    signup_enabled: false,
    signup_button_text: "",
    sort_order: 0,
    is_active: true,
    form_fields: [],
  };
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [bannerForm, setBannerForm] = useState<HomeBannerCreate>(defaultBannerForm);
  const [signupsDialogOpen, setSignupsDialogOpen] = useState(false);
  const [signupsBanner, setSignupsBanner] = useState<HomeBanner | null>(null);
  const [signups, setSignups] = useState<HomeBannerSignup[]>([]);
  const [loadingSignups, setLoadingSignups] = useState(false);

  // School notifications
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);

  // Home info card
  const [infoCard, setInfoCard] = useState<HomeInfoCard | null>(null);
  const [savingInfoCard, setSavingInfoCard] = useState(false);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<SchoolNotification | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const defaultNotifForm: SchoolNotificationCreate = {
    title: "",
    body: "",
    icon: "",
    color: "#4f46e5",
    action_url: "",
    is_published: true,
  };
  const [notifForm, setNotifForm] = useState<SchoolNotificationCreate>(defaultNotifForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectsData, teachersData, settingsData, locationsData, templatesData, plansData, sessionsData, bannersData, notificationsData, infoCardData] = await Promise.all([
        api.getSubjects(),
        api.getEmployees(),
        api.getSettings(),
        api.getSchoolLocations(),
        api.getExamTemplates(),
        api.getSubscriptionPlans(),
        api.getExamPortalSessions(),
        api.getHomeBanners(),
        api.getSchoolNotifications().catch(() => [] as SchoolNotification[]),
        api.getHomeInfoCard().catch(() => null),
      ]);

      setSubjects(subjectsData);
      setTeachers(teachersData); // Show all employees
      setSettings(settingsData);
      setLocations(locationsData);
      setExamTemplates(templatesData);
      setSubscriptionPlans(plansData);
      setExamSessions(sessionsData);
      setBanners(bannersData);
      setNotifications(notificationsData);
      setInfoCard(infoCardData);
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

  const handleOpenBannerDialog = (banner?: HomeBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({
        title: banner.title,
        subtitle: banner.subtitle ?? "",
        badge_text: banner.badge_text ?? "",
        badge_color: banner.badge_color ?? "#f59e0b",
        price_text: banner.price_text ?? "",
        footer_tags: banner.footer_tags ?? "",
        icon: banner.icon ?? "",
        gradient_from: banner.gradient_from,
        gradient_to: banner.gradient_to,
        background_image_url: banner.background_image_url ?? "",
        action_url: banner.action_url ?? "",
        signup_enabled: banner.signup_enabled,
        signup_button_text: banner.signup_button_text ?? "",
        sort_order: banner.sort_order,
        is_active: banner.is_active,
        form_fields: (banner.form_fields ?? []).map((f) => ({
          field_type: f.field_type,
          key: f.key,
          label: f.label,
          placeholder: f.placeholder ?? "",
          required: f.required,
          options: f.options ?? null,
          sort_order: f.sort_order,
        })),
      });
    } else {
      setEditingBanner(null);
      setBannerForm({ ...defaultBannerForm, sort_order: banners.length, form_fields: [] });
    }
    setBannerDialogOpen(true);
  };

  const addFormField = () => {
    const fields = bannerForm.form_fields ?? [];
    setBannerForm({
      ...bannerForm,
      form_fields: [
        ...fields,
        {
          field_type: "text",
          key: `field_${fields.length + 1}`,
          label: "Поле",
          placeholder: "",
          required: false,
          options: null,
          sort_order: fields.length,
        },
      ],
    });
  };

  const updateFormField = (idx: number, patch: Partial<HomeBannerFormFieldCreate>) => {
    const fields = [...(bannerForm.form_fields ?? [])];
    fields[idx] = { ...fields[idx], ...patch };
    setBannerForm({ ...bannerForm, form_fields: fields });
  };

  const removeFormField = (idx: number) => {
    const fields = [...(bannerForm.form_fields ?? [])];
    fields.splice(idx, 1);
    setBannerForm({ ...bannerForm, form_fields: fields.map((f, i) => ({ ...f, sort_order: i })) });
  };

  const moveFormField = (idx: number, dir: -1 | 1) => {
    const fields = [...(bannerForm.form_fields ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    setBannerForm({ ...bannerForm, form_fields: fields.map((f, i) => ({ ...f, sort_order: i })) });
  };

  const handleOpenSignups = async (banner: HomeBanner) => {
    setSignupsBanner(banner);
    setSignupsDialogOpen(true);
    setLoadingSignups(true);
    try {
      const list = await api.getBannerSignups(banner.id);
      setSignups(list);
    } catch (e) {
      console.error("Failed to load signups:", e);
    } finally {
      setLoadingSignups(false);
    }
  };

  const handleUpdateSignupStatus = async (id: string, status: string) => {
    try {
      const updated = await api.updateBannerSignup(id, { status });
      setSignups((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      console.error("Failed to update signup:", e);
    }
  };

  const handleDeleteSignup = async (id: string) => {
    if (!confirm("Удалить заявку?")) return;
    try {
      await api.deleteBannerSignup(id);
      setSignups((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to delete signup:", e);
    }
  };

  const handleOpenNotifDialog = (notif?: SchoolNotification) => {
    if (notif) {
      setEditingNotif(notif);
      setNotifForm({
        title: notif.title,
        body: notif.body,
        icon: notif.icon ?? "",
        color: notif.color ?? "#4f46e5",
        action_url: notif.action_url ?? "",
        is_published: notif.is_published,
      });
    } else {
      setEditingNotif(null);
      setNotifForm(defaultNotifForm);
    }
    setNotifDialogOpen(true);
  };

  const handleSaveNotif = async () => {
    if (!notifForm.title.trim() || !notifForm.body.trim()) return;
    try {
      setSavingNotif(true);
      if (editingNotif) {
        const updated = await api.updateSchoolNotification(editingNotif.id, notifForm);
        setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const created = await api.createSchoolNotification(notifForm);
        setNotifications((prev) => [created, ...prev]);
      }
      setNotifDialogOpen(false);
      setEditingNotif(null);
    } catch (e) {
      console.error("Failed to save notification:", e);
    } finally {
      setSavingNotif(false);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    if (!confirm("Удалить уведомление?")) return;
    try {
      await api.deleteSchoolNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const handleToggleNotifPublished = async (notif: SchoolNotification) => {
    try {
      const updated = await api.updateSchoolNotification(notif.id, { is_published: !notif.is_published });
      setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (e) {
      console.error("Failed to toggle notification:", e);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.title.trim()) {
      alert("Укажите заголовок");
      return;
    }
    try {
      setSavingBanner(true);
      if (editingBanner) {
        const updated = await api.updateHomeBanner(editingBanner.id, bannerForm);
        setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const created = await api.createHomeBanner(bannerForm);
        setBanners((prev) => [...prev, created]);
      }
      setBannerDialogOpen(false);
      setEditingBanner(null);
    } catch (error) {
      console.error("Failed to save banner:", error);
      alert("Ошибка при сохранении баннера");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Удалить баннер?")) return;
    try {
      await api.deleteHomeBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete banner:", error);
      alert("Ошибка при удалении");
    }
  };

  const handleUploadBannerImage = async (file: File) => {
    try {
      setUploadingBannerImage(true);
      const { url } = await api.uploadBannerImage(file);
      setBannerForm((prev) => ({ ...prev, background_image_url: url }));
    } catch (e) {
      console.error("Failed to upload image:", e);
      alert((e as Error).message || "Не удалось загрузить изображение");
    } finally {
      setUploadingBannerImage(false);
    }
  };

  const handleToggleBannerActive = async (banner: HomeBanner) => {
    try {
      const updated = await api.updateHomeBanner(banner.id, { is_active: !banner.is_active });
      setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (error) {
      console.error("Failed to toggle banner:", error);
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
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="home-info">Инфо на главной</TabsTrigger>
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

          <Card className="mt-6">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Баннеры на главной</CardTitle>
                <CardDescription>
                  Показываются в мобильном приложении ученикам без активных групп
                </CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => handleOpenBannerDialog()} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить баннер
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {banners.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Баннеры не добавлены</div>
              ) : (
                <div className="divide-y">
                  {[...banners].sort((a, b) => a.sort_order - b.sort_order).map((banner) => (
                    <div key={banner.id} className="flex items-center gap-4 p-4">
                      <div
                        className="w-32 h-16 rounded-xl flex items-center px-3 flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})`,
                        }}
                      >
                        <span className="text-white font-bold text-sm truncate">
                          {banner.icon ? `${banner.icon} ` : ""}{banner.title}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{banner.title}</span>
                          {banner.badge_text && (
                            <Badge style={{ backgroundColor: banner.badge_color ?? "#f59e0b", color: "#fff" }}>
                              {banner.badge_text}
                            </Badge>
                          )}
                          {!banner.is_active && (
                            <Badge variant="secondary">Выключен</Badge>
                          )}
                        </div>
                        {banner.subtitle && (
                          <div className="text-sm text-slate-500 mt-0.5 truncate">{banner.subtitle}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">
                          Порядок: {banner.sort_order}
                          {banner.action_url ? ` · ${banner.action_url}` : ""}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {banner.signup_enabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSignups(banner)}
                            >
                              Заявки
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title={banner.is_active ? "Выключить" : "Включить"}
                            onClick={() => handleToggleBannerActive(banner)}
                          >
                            {banner.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenBannerDialog(banner)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBanner(banner.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Школьные уведомления</h2>
            {isAdmin && (
              <Button onClick={() => handleOpenNotifDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Новое уведомление
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Пока нет уведомлений</div>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-center gap-4 p-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: (n.color ?? "#4f46e5") + "22" }}
                      >
                        {n.icon || "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{n.title}</span>
                          {!n.is_published && (
                            <Badge variant="secondary">Черновик</Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleString("ru-RU")}
                          {n.action_url ? ` · ${n.action_url}` : ""}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={n.is_published ? "Снять с публикации" : "Опубликовать"}
                            onClick={() => handleToggleNotifPublished(n)}
                          >
                            {n.is_published ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenNotifDialog(n)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteNotif(n.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Home Info Card Tab */}
        <TabsContent value="home-info">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Инфо-карточка на главной (мобильное приложение)</h2>
            {isAdmin && infoCard && (
              <Button
                className="gap-2"
                disabled={savingInfoCard}
                onClick={async () => {
                  try {
                    setSavingInfoCard(true);
                    const updated = await api.updateHomeInfoCard(infoCard);
                    setInfoCard(updated);
                    alert("Сохранено");
                  } catch (e) {
                    alert("Ошибка сохранения: " + (e as Error).message);
                  } finally {
                    setSavingInfoCard(false);
                  }
                }}
              >
                {savingInfoCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </Button>
            )}
          </div>

          {!infoCard ? (
            <div className="p-8 text-center text-sm text-slate-500">Загрузка...</div>
          ) : (
            <div className="grid gap-4">
              {/* Preview */}
              <div
                className="rounded-2xl p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${infoCard.gradient_from}, ${infoCard.gradient_to})` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: infoCard.logo_bg_color }}
                  >
                    {infoCard.logo_emoji}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{infoCard.center_name}</div>
                    <div className="text-xs opacity-80">{infoCard.center_subtitle}</div>
                  </div>
                </div>
                <div className="text-lg font-bold mb-1">
                  {infoCard.heading_line1}{" "}
                  {infoCard.heading_line2 && (
                    <span style={{ color: infoCard.heading_accent_color }}>{infoCard.heading_line2}</span>
                  )}
                </div>
                {infoCard.subheading && <div className="text-sm opacity-90 mb-3">{infoCard.subheading}</div>}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {infoCard.stats.map((s, i) => (
                    <div key={i} className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="font-bold">{s.value}</div>
                      <div className="text-[10px] opacity-80">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {infoCard.tags.map((t, i) => (
                    <span key={i} className="bg-white/20 px-2 py-1 rounded-full text-xs">
                      {t.icon} {t.text}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {infoCard.formats.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: f.bg_color ?? "rgba(255,255,255,0.15)" }}
                    >
                      <div className="font-bold text-sm">
                        {f.icon} {f.title}
                      </div>
                      {f.subtitle && <div className="text-xs opacity-90">{f.subtitle}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Название центра</Label>
                      <Input value={infoCard.center_name} onChange={(e) => setInfoCard({ ...infoCard, center_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Подпись под названием</Label>
                      <Input value={infoCard.center_subtitle} onChange={(e) => setInfoCard({ ...infoCard, center_subtitle: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Логотип (emoji)</Label>
                      <Input value={infoCard.logo_emoji} onChange={(e) => setInfoCard({ ...infoCard, logo_emoji: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Фон логотипа</Label>
                      <Input type="color" value={infoCard.logo_bg_color} onChange={(e) => setInfoCard({ ...infoCard, logo_bg_color: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Цвет акцента в заголовке</Label>
                      <Input type="color" value={infoCard.heading_accent_color} onChange={(e) => setInfoCard({ ...infoCard, heading_accent_color: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Градиент (от)</Label>
                      <Input type="color" value={infoCard.gradient_from} onChange={(e) => setInfoCard({ ...infoCard, gradient_from: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Градиент (до)</Label>
                      <Input type="color" value={infoCard.gradient_to} onChange={(e) => setInfoCard({ ...infoCard, gradient_to: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Заголовок (первая строка)</Label>
                    <Input value={infoCard.heading_line1} onChange={(e) => setInfoCard({ ...infoCard, heading_line1: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Акцент (вторая строка, выделенная цветом)</Label>
                    <Input value={infoCard.heading_line2 ?? ""} onChange={(e) => setInfoCard({ ...infoCard, heading_line2: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Подпись под заголовком</Label>
                    <Input value={infoCard.subheading ?? ""} onChange={(e) => setInfoCard({ ...infoCard, subheading: e.target.value })} />
                  </div>

                  {/* Stats editor */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label>Статистика (цифры)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setInfoCard({ ...infoCard, stats: [...infoCard.stats, { value: "", label: "" }] })}>
                        <Plus className="w-3 h-3 mr-1" />Добавить
                      </Button>
                    </div>
                    {infoCard.stats.map((s, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
                        <Input placeholder="100" value={s.value} onChange={(e) => {
                          const next = [...infoCard.stats];
                          next[idx] = { ...s, value: e.target.value };
                          setInfoCard({ ...infoCard, stats: next });
                        }} />
                        <Input placeholder="баллы каждый год" value={s.label} onChange={(e) => {
                          const next = [...infoCard.stats];
                          next[idx] = { ...s, label: e.target.value };
                          setInfoCard({ ...infoCard, stats: next });
                        }} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setInfoCard({ ...infoCard, stats: infoCard.stats.filter((_, i) => i !== idx) })}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Tags editor */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label>Теги (преимущества)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setInfoCard({ ...infoCard, tags: [...infoCard.tags, { icon: "✅", text: "" }] })}>
                        <Plus className="w-3 h-3 mr-1" />Добавить
                      </Button>
                    </div>
                    {infoCard.tags.map((t, idx) => (
                      <div key={idx} className="grid grid-cols-[80px_1fr_auto] gap-2 items-end">
                        <Input placeholder="✅" value={t.icon ?? ""} onChange={(e) => {
                          const next = [...infoCard.tags];
                          next[idx] = { ...t, icon: e.target.value };
                          setInfoCard({ ...infoCard, tags: next });
                        }} />
                        <Input placeholder="Преподаватели 100 баллов" value={t.text} onChange={(e) => {
                          const next = [...infoCard.tags];
                          next[idx] = { ...t, text: e.target.value };
                          setInfoCard({ ...infoCard, tags: next });
                        }} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setInfoCard({ ...infoCard, tags: infoCard.tags.filter((_, i) => i !== idx) })}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Formats editor */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label>Форматы обучения</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setInfoCard({ ...infoCard, formats: [...infoCard.formats, { icon: "🏠", title: "", subtitle: "", bg_color: "#fb923c" }] })}>
                        <Plus className="w-3 h-3 mr-1" />Добавить
                      </Button>
                    </div>
                    {infoCard.formats.map((f, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-[60px_1fr_60px_auto] gap-2 items-end">
                          <Input placeholder="🏠" value={f.icon ?? ""} onChange={(e) => {
                            const next = [...infoCard.formats];
                            next[idx] = { ...f, icon: e.target.value };
                            setInfoCard({ ...infoCard, formats: next });
                          }} />
                          <Input placeholder="Офлайн" value={f.title} onChange={(e) => {
                            const next = [...infoCard.formats];
                            next[idx] = { ...f, title: e.target.value };
                            setInfoCard({ ...infoCard, formats: next });
                          }} />
                          <Input type="color" value={f.bg_color ?? "#fb923c"} onChange={(e) => {
                            const next = [...infoCard.formats];
                            next[idx] = { ...f, bg_color: e.target.value };
                            setInfoCard({ ...infoCard, formats: next });
                          }} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => setInfoCard({ ...infoCard, formats: infoCard.formats.filter((_, i) => i !== idx) })}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <Input placeholder="до 10 человек" value={f.subtitle ?? ""} onChange={(e) => {
                          const next = [...infoCard.formats];
                          next[idx] = { ...f, subtitle: e.target.value };
                          setInfoCard({ ...infoCard, formats: next });
                        }} />
                      </div>
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="space-y-3 border-t pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={infoCard.trial_button_enabled} onChange={(e) => setInfoCard({ ...infoCard, trial_button_enabled: e.target.checked })} />
                      <span className="text-sm font-medium">Показывать кнопку «Пробный урок»</span>
                    </label>
                    {infoCard.trial_button_enabled && (
                      <Input placeholder="Текст кнопки" value={infoCard.trial_button_text} onChange={(e) => setInfoCard({ ...infoCard, trial_button_text: e.target.value })} />
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={infoCard.tariffs_button_enabled} onChange={(e) => setInfoCard({ ...infoCard, tariffs_button_enabled: e.target.checked })} />
                      <span className="text-sm font-medium">Показывать кнопку «Тарифы»</span>
                    </label>
                    {infoCard.tariffs_button_enabled && (
                      <Input placeholder="Текст кнопки" value={infoCard.tariffs_button_text} onChange={(e) => setInfoCard({ ...infoCard, tariffs_button_text: e.target.value })} />
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer border-t pt-4">
                    <input type="checkbox" checked={infoCard.is_visible} onChange={(e) => setInfoCard({ ...infoCard, is_visible: e.target.checked })} />
                    <span className="text-sm">Показывать карточку на главной</span>
                  </label>
                </CardContent>
              </Card>
            </div>
          )}
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

      {/* Home Banner Dialog */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Редактировать баннер" : "Новый баннер"}</DialogTitle>
            <DialogDescription>
              Баннер показывается в мобильном приложении на главной ученикам без групп
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-2xl p-5 text-white relative overflow-hidden"
              style={{
                background: bannerForm.background_image_url
                  ? `linear-gradient(135deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${bannerForm.background_image_url}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${bannerForm.gradient_from}, ${bannerForm.gradient_to})`,
              }}>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {bannerForm.badge_text && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: bannerForm.badge_color ?? "#f59e0b" }}>
                    {bannerForm.badge_text}
                  </span>
                )}
                {bannerForm.price_text && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                    {bannerForm.price_text}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold mb-1">
                {bannerForm.icon ? `${bannerForm.icon} ` : ""}{bannerForm.title || "Заголовок"}
              </div>
              {bannerForm.subtitle && <div className="text-sm opacity-90 mb-2">{bannerForm.subtitle}</div>}
              {bannerForm.footer_tags && <div className="text-xs opacity-75">{bannerForm.footer_tags}</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Летний курс"
                />
              </div>
              <div className="space-y-2">
                <Label>Иконка (emoji)</Label>
                <Input
                  value={bannerForm.icon ?? ""}
                  onChange={(e) => setBannerForm({ ...bannerForm, icon: e.target.value })}
                  placeholder="☀️"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={bannerForm.subtitle ?? ""}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                placeholder="Интенсивная подготовка к ЕГЭ/ОГЭ"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge (верхний бейдж)</Label>
                <Input
                  value={bannerForm.badge_text ?? ""}
                  onChange={(e) => setBannerForm({ ...bannerForm, badge_text: e.target.value })}
                  placeholder="ЛЕТО 2025"
                />
              </div>
              <div className="space-y-2">
                <Label>Цена / правый бейдж</Label>
                <Input
                  value={bannerForm.price_text ?? ""}
                  onChange={(e) => setBannerForm({ ...bannerForm, price_text: e.target.value })}
                  placeholder="от 990 ₽"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Теги внизу (через · или запятую)</Label>
              <Input
                value={bannerForm.footer_tags ?? ""}
                onChange={(e) => setBannerForm({ ...bannerForm, footer_tags: e.target.value })}
                placeholder="Видео · Задачи · ДЗ"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Цвет градиента (от)</Label>
                <Input
                  type="color"
                  value={bannerForm.gradient_from ?? "#4f46e5"}
                  onChange={(e) => setBannerForm({ ...bannerForm, gradient_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цвет градиента (до)</Label>
                <Input
                  type="color"
                  value={bannerForm.gradient_to ?? "#7c3aed"}
                  onChange={(e) => setBannerForm({ ...bannerForm, gradient_to: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цвет badge</Label>
                <Input
                  type="color"
                  value={bannerForm.badge_color ?? "#f59e0b"}
                  onChange={(e) => setBannerForm({ ...bannerForm, badge_color: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>Фоновое изображение (заменяет градиент)</Label>
              <div className="flex items-start gap-3">
                {bannerForm.background_image_url ? (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden border shrink-0">
                    <img
                      src={bannerForm.background_image_url}
                      alt="background"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-20 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground shrink-0">
                    Нет фото
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBannerImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadBannerImage(file);
                      e.target.value = "";
                    }}
                  />
                  <Input
                    placeholder="или вставьте URL"
                    value={bannerForm.background_image_url ?? ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, background_image_url: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    {uploadingBannerImage && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Загрузка...
                      </span>
                    )}
                    {bannerForm.background_image_url && !uploadingBannerImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBannerForm({ ...bannerForm, background_image_url: "" })}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Удалить фото
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ссылка при нажатии</Label>
                <Input
                  value={bannerForm.action_url ?? ""}
                  onChange={(e) => setBannerForm({ ...bannerForm, action_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input
                  type="number"
                  value={bannerForm.sort_order ?? 0}
                  onChange={(e) => setBannerForm({ ...bannerForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bannerForm.is_active ?? true}
                onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })}
              />
              <span className="text-sm">Показывать в приложении</span>
            </label>

            <div className="border-t pt-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={bannerForm.signup_enabled ?? false}
                  onChange={(e) => setBannerForm({ ...bannerForm, signup_enabled: e.target.checked })}
                />
                <span className="text-sm font-medium">Включить форму записи</span>
              </label>

              {bannerForm.signup_enabled && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label>Текст кнопки</Label>
                    <Input
                      value={bannerForm.signup_button_text ?? ""}
                      onChange={(e) => setBannerForm({ ...bannerForm, signup_button_text: e.target.value })}
                      placeholder="Записаться"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Поля формы</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addFormField} className="gap-1">
                        <Plus className="w-3 h-3" />
                        Добавить поле
                      </Button>
                    </div>

                    {(bannerForm.form_fields ?? []).length === 0 && (
                      <div className="text-xs text-slate-500 py-2">
                        Нет полей. Имя, телефон и email ученика отправляются автоматически — добавьте дополнительные поля, если нужно.
                      </div>
                    )}

                    {(bannerForm.form_fields ?? []).map((f, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">#{idx + 1}</span>
                          <div className="flex-1" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => moveFormField(idx, -1)} disabled={idx === 0}>
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => moveFormField(idx, 1)} disabled={idx === (bannerForm.form_fields?.length ?? 0) - 1}>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeFormField(idx)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Тип</Label>
                            <select
                              className="w-full h-9 px-3 rounded-md border border-input bg-white text-sm"
                              value={f.field_type}
                              onChange={(e) => updateFormField(idx, { field_type: e.target.value as any })}
                            >
                              <option value="text">Текст</option>
                              <option value="textarea">Многострочный</option>
                              <option value="phone">Телефон</option>
                              <option value="email">Email</option>
                              <option value="number">Число</option>
                              <option value="select">Выпадающий список</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Ключ (латиница)</Label>
                            <Input
                              value={f.key}
                              onChange={(e) => updateFormField(idx, { key: e.target.value })}
                              placeholder="class_number"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Подпись</Label>
                          <Input
                            value={f.label}
                            onChange={(e) => updateFormField(idx, { label: e.target.value })}
                            placeholder="Класс"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={f.placeholder ?? ""}
                            onChange={(e) => updateFormField(idx, { placeholder: e.target.value })}
                            placeholder="Введите значение..."
                          />
                        </div>
                        {f.field_type === "select" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Варианты (через запятую)</Label>
                            <Input
                              value={(f.options ?? []).join(", ")}
                              onChange={(e) =>
                                updateFormField(idx, {
                                  options: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="9, 10, 11"
                            />
                          </div>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={f.required ?? false}
                            onChange={(e) => updateFormField(idx, { required: e.target.checked })}
                          />
                          <span>Обязательное</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialogOpen(false)} disabled={savingBanner}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveBanner}
              disabled={savingBanner || !bannerForm.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingBanner ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Signups Dialog */}
      <Dialog open={signupsDialogOpen} onOpenChange={setSignupsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Заявки: {signupsBanner?.title}</DialogTitle>
            <DialogDescription>
              Список учеников, подавших заявку через этот баннер
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingSignups ? (
              <div className="text-center py-8 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Загрузка...
              </div>
            ) : signups.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">Заявок пока нет</div>
            ) : (
              <div className="space-y-2">
                {signups.map((s) => (
                  <div key={s.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{s.student_name || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {s.student_phone || "—"} · {s.student_email || "—"}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(s.created_at).toLocaleString("ru-RU")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          className="h-8 px-2 rounded-md border border-input bg-white text-xs"
                          value={s.status}
                          onChange={(e) => handleUpdateSignupStatus(s.id, e.target.value)}
                        >
                          <option value="new">Новая</option>
                          <option value="contacted">Связались</option>
                          <option value="converted">Зачислен</option>
                          <option value="rejected">Отклонена</option>
                        </select>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSignup(s.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    {Object.keys(s.form_data ?? {}).length > 0 && (
                      <div className="border-t pt-2 text-xs space-y-0.5">
                        {Object.entries(s.form_data).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-slate-500">{k}:</span>{" "}
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignupsDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNotif ? "Редактировать уведомление" : "Новое уведомление"}</DialogTitle>
            <DialogDescription>
              Будет показано в мобильном приложении всем ученикам
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-xl p-4 flex items-start gap-3 bg-slate-50 border">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: (notifForm.color ?? "#4f46e5") + "22" }}
              >
                {notifForm.icon || "🔔"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900">{notifForm.title || "Заголовок"}</div>
                <div className="text-xs text-slate-600 mt-0.5">{notifForm.body || "Текст уведомления"}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input
                value={notifForm.title}
                onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                placeholder="Летние каникулы"
              />
            </div>

            <div className="space-y-2">
              <Label>Текст</Label>
              <Textarea
                value={notifForm.body}
                onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })}
                placeholder="С 1 июля по 15 августа занятия не проводятся..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Иконка (emoji)</Label>
                <Input
                  value={notifForm.icon ?? ""}
                  onChange={(e) => setNotifForm({ ...notifForm, icon: e.target.value })}
                  placeholder="📢"
                />
              </div>
              <div className="space-y-2">
                <Label>Акцентный цвет</Label>
                <Input
                  type="color"
                  value={notifForm.color ?? "#4f46e5"}
                  onChange={(e) => setNotifForm({ ...notifForm, color: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ссылка (необязательно)</Label>
              <Input
                value={notifForm.action_url ?? ""}
                onChange={(e) => setNotifForm({ ...notifForm, action_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifForm.is_published ?? true}
                onChange={(e) => setNotifForm({ ...notifForm, is_published: e.target.checked })}
              />
              <span className="text-sm">Опубликовать сразу</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)} disabled={savingNotif}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveNotif}
              disabled={savingNotif || !notifForm.title.trim() || !notifForm.body.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingNotif ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
