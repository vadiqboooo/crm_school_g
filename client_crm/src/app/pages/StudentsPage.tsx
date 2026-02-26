import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
  Check,
  Loader2,
  ArrowUp,
  FileText,
  X as CloseIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card";
import { useParams, useNavigate } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { StudentPerformanceTab } from "../components/StudentPerformanceTab";
import { StudentReportsPanel } from "../components/StudentReportsPanel";
import type { Student, StudentCreate, StudentHistory, ParentRelation, WeeklyReport } from "../types/api";

const parentRelations: { value: ParentRelation; label: string }[] = [
  { value: "мама", label: "Мама" },
  { value: "папа", label: "Папа" },
  { value: "бабушка", label: "Бабушка" },
  { value: "дедушка", label: "Дедушка" },
  { value: "тетя", label: "Тетя" },
  { value: "дядя", label: "Дядя" },
];

export function StudentsPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("info"); // Student detail tabs
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentHistory[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showReportsView, setShowReportsView] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [studentLatestReports, setStudentLatestReports] = useState<Map<string, WeeklyReport>>(new Map());

  // Create student dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState<StudentCreate>({
    first_name: "",
    last_name: "",
    phone: "",
    telegram_id: "",
    current_school: "",
    class_number: undefined,
    status: "active",
    parent_contacts: [],
  });

  // Edit mode in student card - separate for each section
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingParentContacts, setIsEditingParentContacts] = useState(false);
  const [editFormData, setEditFormData] = useState<Student | null>(null);
  const [updating, setUpdating] = useState(false);

  // Scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Load students
  useEffect(() => {
    loadStudents();
  }, []);

  // Load latest reports when entering reports view
  useEffect(() => {
    if (showReportsView) {
      loadLatestReports();
    }
  }, [showReportsView]);

  // Track scroll position for "scroll to top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load student from URL parameter
  useEffect(() => {
    if (studentId && students.length > 0) {
      const student = students.find((s) => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        loadStudentHistory(studentId);
      }
    } else if (!studentId) {
      setSelectedStudent(null);
      setStudentHistory([]);
    }
  }, [studentId, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentHistory = async (id: string) => {
    try {
      const history = await api.getStudentHistory(id);
      setStudentHistory(history);
    } catch (error) {
      console.error("Failed to load student history:", error);
    }
  };

  const loadLatestReports = async () => {
    try {
      const reportsDict = await api.getAllStudentsLatestReports();
      const reportsMap = new Map<string, WeeklyReport>();

      Object.entries(reportsDict).forEach(([studentId, report]) => {
        reportsMap.set(studentId, report);
      });

      setStudentLatestReports(reportsMap);
    } catch (error) {
      console.error("Failed to load latest reports:", error);
    }
  };

  const handleCreateStudent = async () => {
    try {
      setCreating(true);
      await api.createStudent(newStudent);
      await loadStudents();
      setCreateDialogOpen(false);
      setNewStudent({
        first_name: "",
        last_name: "",
        phone: "",
        telegram_id: "",
        current_school: "",
        class_number: undefined,
        status: "active",
        parent_contacts: [],
      });
    } catch (error) {
      console.error("Failed to create student:", error);
      alert("Ошибка при создании студента");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить студента?")) return;

    try {
      await api.deleteStudent(id);
      await loadStudents();
      if (selectedStudent?.id === id) {
        navigate("/students");
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert("Ошибка при удалении студента");
    }
  };

  const handleStartEditBasicInfo = () => {
    if (selectedStudent) {
      setEditFormData({ ...selectedStudent });
      setIsEditingBasicInfo(true);
    }
  };

  const handleStartEditParentContacts = () => {
    if (selectedStudent) {
      setEditFormData({ ...selectedStudent });
      setIsEditingParentContacts(true);
    }
  };

  const handleCancelEditBasicInfo = () => {
    setIsEditingBasicInfo(false);
    setEditFormData(null);
  };

  const handleCancelEditParentContacts = () => {
    setIsEditingParentContacts(false);
    setEditFormData(null);
  };

  const handleSaveBasicInfo = async () => {
    if (!editFormData) return;

    try {
      setUpdating(true);
      await api.updateStudent(editFormData.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone: editFormData.phone,
        telegram_id: editFormData.telegram_id,
        current_school: editFormData.current_school,
        class_number: editFormData.class_number,
        status: editFormData.status,
        parent_contacts: editFormData.parent_contacts.map((contact) => ({
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          telegram_id: contact.telegram_id,
        })),
      });
      await loadStudents();
      setIsEditingBasicInfo(false);
      setEditFormData(null);
    } catch (error) {
      console.error("Failed to update student:", error);
      alert("Ошибка при обновлении студента");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveParentContacts = async () => {
    if (!editFormData) return;

    try {
      setUpdating(true);
      await api.updateStudent(editFormData.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone: editFormData.phone,
        telegram_id: editFormData.telegram_id,
        current_school: editFormData.current_school,
        class_number: editFormData.class_number,
        status: editFormData.status,
        parent_contacts: editFormData.parent_contacts.map((contact) => ({
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          telegram_id: contact.telegram_id,
        })),
      });
      await loadStudents();
      setIsEditingParentContacts(false);
      setEditFormData(null);
    } catch (error) {
      console.error("Failed to update student:", error);
      alert("Ошибка при обновлении студента");
    } finally {
      setUpdating(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (student: Student) => {
    navigate(`/students/${student.id}`);
  };

  const handleClosePanel = () => {
    navigate("/students");
  };

  const handleShareLink = () => {
    if (selectedStudent) {
      const link = `${window.location.origin}/students/${selectedStudent.id}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case "added_to_db":
      case "added_to_group":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "removed_from_group":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "payment":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "status_change":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "parent_feedback_added":
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case "parent_feedback_deleted":
        return <MessageCircle className="w-4 h-4 text-red-600" />;
      case "student_info_updated":
        return <Edit className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
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
      {/* Sticky Header & Filters */}
      {!selectedStudent && (
        <div className="sticky top-0 z-20 bg-white pb-6 mb-6 -mx-6 px-6 pt-8 -mt-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Студенты</h1>
              <p className="text-slate-600 mt-1">
                Управление студентами и их данными
              </p>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Добавить студента
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="inactive">Неактивные</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={showReportsView ? "default" : "outline"}
                  className={showReportsView ? "bg-blue-600 hover:bg-blue-700 gap-2" : "gap-2"}
                  onClick={() => setShowReportsView(!showReportsView)}
                >
                  {showReportsView ? (
                    <>
                      <CloseIcon className="w-4 h-4" />
                      Закрыть отчеты
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Отчеты
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedStudent ? (
        // Student Detail View
        <div className="animate-in slide-in-from-right duration-300">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleClosePanel}>
                  ← Назад к списку
                </Button>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedStudent.last_name} {selectedStudent.first_name}
                  </h2>
                  <Badge
                    className={
                      selectedStudent.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-800"
                    }
                  >
                    {selectedStudent.status === "active"
                      ? "Активен"
                      : "Неактивен"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border mb-6">
              <TabsTrigger value="info">Информация</TabsTrigger>
              {(isAdmin || isManager) && <TabsTrigger value="performance">Успеваемость</TabsTrigger>}
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info">
              <div className="grid gap-6">
                {/* Two column layout */}
                <div className="grid grid-cols-2 gap-6">
              {/* Basic Info - Left */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Основная информация
                    </h3>
                    {isEditingBasicInfo ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEditBasicInfo}
                          disabled={updating}
                        >
                          Отмена
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveBasicInfo}
                          disabled={updating}
                          className="bg-blue-600 hover:bg-blue-700 gap-2"
                        >
                          {updating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Сохранение...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Сохранить
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleShareLink}
                        >
                          {linkCopied ? (
                            <>
                              <Check className="w-4 h-4" />
                              Скопирована
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              Поделиться
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleStartEditBasicInfo}
                        >
                          <Edit className="w-4 h-4" />
                          Редактировать
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">Фамилия</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Input
                          value={editFormData.last_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, last_name: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Фамилия"
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {selectedStudent.last_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Имя</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Input
                          value={editFormData.first_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, first_name: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Имя"
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {selectedStudent.first_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Класс</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Input
                          type="number"
                          min="1"
                          max="11"
                          value={editFormData.class_number || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              class_number: e.target.value ? parseInt(e.target.value) : undefined
                            })
                          }
                          className="mt-1"
                          placeholder="9, 10, 11..."
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {selectedStudent.class_number ? `${selectedStudent.class_number} класс` : "Не указан"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Школа обучения</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Input
                          value={editFormData.current_school || ""}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, current_school: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Гимназия №1"
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {selectedStudent.current_school || "Не указана"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Телефон</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Input
                          value={editFormData.phone || ""}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, phone: e.target.value })
                          }
                          className="mt-1"
                          placeholder="+7 999 123-45-67"
                        />
                      ) : (
                        <p className="mt-1 font-medium flex items-center gap-2">
                          {selectedStudent.phone ? (
                            <>
                              <Phone className="w-4 h-4" />
                              {selectedStudent.phone}
                            </>
                          ) : (
                            <span className="text-slate-400">Не указан</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Telegram ID</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Input
                          value={editFormData.telegram_id || ""}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, telegram_id: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Telegram ID"
                        />
                      ) : (
                        <p className="mt-1 font-medium flex items-center gap-2">
                          {selectedStudent.telegram_id ? (
                            <>
                              <MessageCircle className="w-4 h-4 text-green-600" />
                              {selectedStudent.telegram_id}
                            </>
                          ) : (
                            <span className="text-slate-400">Не привязан</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-600">Группы</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedStudent.groups && selectedStudent.groups.length > 0 ? (
                          selectedStudent.groups.map((group) => (
                            <Badge key={group.id} className="bg-blue-600">
                              {group.name}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-slate-400 text-sm">
                            Студент не добавлен ни в одну группу
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-600">Статус</Label>
                      {isEditingBasicInfo && editFormData ? (
                        <Select
                          value={editFormData.status}
                          onValueChange={(value: "active" | "inactive") =>
                            setEditFormData({ ...editFormData, status: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Активный</SelectItem>
                            <SelectItem value="inactive">Неактивный</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1">
                          <Badge
                            className={
                              selectedStudent.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-800"
                            }
                          >
                            {selectedStudent.status === "active"
                              ? "Активен"
                              : "Неактивен"}
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parent Contacts - Right */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Контакты родителей
                    </h3>
                    {isEditingParentContacts ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEditParentContacts}
                          disabled={updating}
                        >
                          Отмена
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveParentContacts}
                          disabled={updating}
                          className="bg-blue-600 hover:bg-blue-700 gap-2"
                        >
                          {updating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Сохранение...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Сохранить
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleStartEditParentContacts}
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </Button>
                    )}
                  </div>
                  {isEditingParentContacts && editFormData && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 mb-4"
                      onClick={() => {
                          setEditFormData({
                            ...editFormData,
                            parent_contacts: [
                              ...editFormData.parent_contacts,
                              {
                                id: `new-${Date.now()}`,
                                student_id: editFormData.id,
                                name: "",
                                relation: "мама" as ParentRelation,
                                phone: "",
                                telegram_id: "",
                              },
                            ],
                          });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Добавить контакт
                      </Button>
                  )}
                  {isEditingParentContacts && editFormData ? (
                    <div className="space-y-4">
                      {editFormData.parent_contacts.length > 0 ? (
                        editFormData.parent_contacts.map((parent, index) => (
                          <div
                            key={parent.id}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Label className="font-medium">Контакт {index + 1}</Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setEditFormData({
                                    ...editFormData,
                                    parent_contacts: editFormData.parent_contacts.filter(
                                      (_, i) => i !== index
                                    ),
                                  });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-slate-600">Имя *</Label>
                                <Input
                                  value={parent.name}
                                  onChange={(e) => {
                                    const updated = [...editFormData.parent_contacts];
                                    updated[index] = { ...parent, name: e.target.value };
                                    setEditFormData({ ...editFormData, parent_contacts: updated });
                                  }}
                                  placeholder="Иванова Мария"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Родство *</Label>
                                <Select
                                  value={parent.relation}
                                  onValueChange={(value: ParentRelation) => {
                                    const updated = [...editFormData.parent_contacts];
                                    updated[index] = { ...parent, relation: value };
                                    setEditFormData({ ...editFormData, parent_contacts: updated });
                                  }}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parentRelations.map((rel) => (
                                      <SelectItem key={rel.value} value={rel.value}>
                                        {rel.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Телефон *</Label>
                                <Input
                                  value={parent.phone}
                                  onChange={(e) => {
                                    const updated = [...editFormData.parent_contacts];
                                    updated[index] = { ...parent, phone: e.target.value };
                                    setEditFormData({ ...editFormData, parent_contacts: updated });
                                  }}
                                  placeholder="+7 999 123-45-67"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Telegram ID</Label>
                                <Input
                                  value={parent.telegram_id || ""}
                                  onChange={(e) => {
                                    const updated = [...editFormData.parent_contacts];
                                    updated[index] = { ...parent, telegram_id: e.target.value };
                                    setEditFormData({ ...editFormData, parent_contacts: updated });
                                  }}
                                  placeholder="Telegram ID"
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-4">
                          Контакты не добавлены. Нажмите "Добавить контакт" для добавления.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {selectedStudent.parent_contacts.length > 0 ? (
                        <div className="space-y-2">
                          {selectedStudent.parent_contacts.map((parent) => (
                            <div
                              key={parent.id}
                              className="flex items-center gap-4 text-sm"
                            >
                              <span className="font-medium text-slate-900 min-w-[150px]">
                                {parent.name}
                              </span>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {parent.phone}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {parent.relation}
                              </Badge>
                              {parent.telegram_id && (
                                <div className="flex items-center gap-1 text-slate-600">
                                  <MessageCircle className="w-3 h-3 text-green-600" />
                                  <span className="text-xs">{parent.telegram_id}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">
                          Контакты не добавлены
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            {(isAdmin || isManager) && (
              <TabsContent value="performance">
                <StudentPerformanceTab
                  studentId={selectedStudent.id}
                  studentGroups={selectedStudent.groups}
                  studentName={`${selectedStudent.last_name} ${selectedStudent.first_name}`}
                />
              </TabsContent>
            )}

            {/* History Tab */}
            <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">История действий</h3>
                <div className="space-y-3">
                  {studentHistory.length > 0 ? (
                    studentHistory.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="mt-0.5">
                          {getHistoryIcon(event.event_type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {event.description}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(event.created_at).toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm">История пуста</p>
                  )}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // Main Page
        <>
          <div className={`grid gap-6 transition-all duration-500 ease-out ${showReportsView ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Students Table */}
            <div className="transition-all duration-500 ease-out">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ФИО</TableHead>
                          {!showReportsView && (
                            <>
                              <TableHead>Класс</TableHead>
                              <TableHead>Школа</TableHead>
                              <TableHead>Группы</TableHead>
                              <TableHead>Телефон студента</TableHead>
                              <TableHead>Телефоны родителей</TableHead>
                              <TableHead>Telegram</TableHead>
                              <TableHead>Статус</TableHead>
                            </>
                          )}
                          {showReportsView && (
                            <TableHead className="w-32 text-center">Отчет</TableHead>
                          )}
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow
                            key={student.id}
                            className={`cursor-pointer transition-colors ${
                              showReportsView && selectedStudentForReport?.id === student.id
                                ? "bg-blue-50 hover:bg-blue-100"
                                : "hover:bg-slate-50"
                            }`}
                            onClick={() => showReportsView ? setSelectedStudentForReport(student) : handleViewDetails(student)}
                          >
                            <TableCell className="py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                  {student.last_name.charAt(0)}
                                  {student.first_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {student.last_name} {student.first_name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            {!showReportsView && (
                              <>
                                <TableCell>
                                  {student.class_number ? (
                                    <span className="font-medium">{student.class_number}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {student.current_school || (
                                    <span className="text-slate-400">Не указана</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {student.groups && student.groups.length > 0 ? (
                                    <HoverCard>
                                      <HoverCardTrigger asChild>
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm cursor-pointer hover:bg-blue-200 transition-colors">
                                          {student.groups.length}
                                        </div>
                                      </HoverCardTrigger>
                                      <HoverCardContent className="w-64" align="start">
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-sm text-slate-900">
                                            Группы студента
                                          </h4>
                                          <div className="flex flex-col gap-2">
                                            {student.groups.map((group) => (
                                              <div
                                                key={group.id}
                                                className="flex items-center gap-2 text-sm"
                                              >
                                                <Badge className="bg-blue-600">
                                                  {group.name}
                                                </Badge>
                                                {group.school_location && (
                                                  <span className="text-xs text-slate-500">
                                                    {group.school_location}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </HoverCardContent>
                                    </HoverCard>
                                  ) : (
                                    <span className="text-sm text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {student.phone ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-900">
                                      <Phone className="w-4 h-4 text-slate-400" />
                                      {student.phone}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-400">Нет</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {student.parent_contacts.length > 0 ? (
                                      student.parent_contacts.map((parent) => (
                                        <div
                                          key={parent.id}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <Phone className="w-3 h-3 text-slate-400" />
                                          <span className="text-slate-600">
                                            {parent.phone}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            ({parent.relation})
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-sm text-slate-400">
                                        Нет контактов
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {student.telegram_id ? (
                                      <Badge className="bg-green-100 text-green-700 gap-1">
                                        <MessageCircle className="w-3 h-3" />
                                        Привязан
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-slate-500 gap-1"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        Нет
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      student.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-slate-100 text-slate-800"
                                    }
                                  >
                                    {student.status === "active"
                                      ? "Активен"
                                      : "Неактивен"}
                                  </Badge>
                                </TableCell>
                              </>
                            )}
                            {showReportsView && (
                              <TableCell className="py-2 text-center">
                                {(() => {
                                  const latestReport = studentLatestReports.get(student.id);
                                  if (latestReport) {
                                    return latestReport.is_approved ? (
                                      <Check className="w-5 h-5 text-green-600 inline-block" />
                                    ) : (
                                      <CloseIcon className="w-5 h-5 text-slate-400 inline-block" />
                                    );
                                  }
                                  return <span className="text-xs text-slate-400">Нет</span>;
                                })()}
                              </TableCell>
                            )}
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
                                    className="gap-2 text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStudent(student.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Panel - Slides in from right */}
            {showReportsView && (
              <div className="col-span-1 animate-in slide-in-from-right duration-500 ease-out">
                <StudentReportsPanel selectedStudent={selectedStudentForReport} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Student Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить нового студента</DialogTitle>
            <DialogDescription>
              Заполните информацию о студенте
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Имя *</Label>
                <Input
                  id="first_name"
                  value={newStudent.first_name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Фамилия *</Label>
                <Input
                  id="last_name"
                  value={newStudent.last_name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, last_name: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={newStudent.phone}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, phone: e.target.value })
                  }
                  placeholder="+7 999 123-45-67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram_id">Telegram ID</Label>
                <Input
                  id="telegram_id"
                  value={newStudent.telegram_id}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, telegram_id: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class_number">Класс</Label>
                <Input
                  id="class_number"
                  type="number"
                  min="1"
                  max="11"
                  value={newStudent.class_number || ""}
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      class_number: e.target.value ? parseInt(e.target.value) : undefined
                    })
                  }
                  placeholder="9, 10, 11..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_school">Школа обучения</Label>
                <Input
                  id="current_school"
                  value={newStudent.current_school}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, current_school: e.target.value })
                  }
                  placeholder="Гимназия №1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateStudent}
              disabled={creating || !newStudent.first_name || !newStudent.last_name}
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

      {/* Scroll to top button */}
      {showScrollTop && !selectedStudent && (
        <Button
          className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50 transition-all duration-300"
          onClick={scrollToTop}
          title="Наверх"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
