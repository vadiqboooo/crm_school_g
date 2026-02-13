import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
import type { Student, StudentCreate, StudentHistory, ParentRelation } from "../types/api";

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

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentHistory[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Create student dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState<StudentCreate>({
    first_name: "",
    last_name: "",
    phone: "",
    telegram_id: "",
    current_school: "",
    status: "active",
    parent_contacts: [],
  });

  // Load students
  useEffect(() => {
    loadStudents();
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Студенты</h1>
          <p className="text-slate-600 mt-1">
            Управление студентами и их данными
          </p>
        </div>
        {!selectedStudent && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Добавить студента
          </Button>
        )}
      </div>

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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleShareLink}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Ссылка скопирована
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Поделиться ссылкой
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Two column layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Basic Info - Left */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Основная информация
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">ФИО</Label>
                      <p className="mt-1 font-medium">
                        {selectedStudent.last_name} {selectedStudent.first_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Школа обучения</Label>
                      <p className="mt-1 font-medium">
                        {selectedStudent.current_school || "Не указана"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Телефон</Label>
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
                    </div>
                    <div>
                      <Label className="text-slate-600">Telegram</Label>
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
                  </div>
                </CardContent>
              </Card>

              {/* Parent Contacts - Right */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Контакты родителей
                  </h3>
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
                </CardContent>
              </Card>
            </div>

            {/* History */}
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
          </div>
        </div>
      ) : (
        // Students Table
        <>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Школа</TableHead>
                      <TableHead>Телефон студента</TableHead>
                      <TableHead>Телефоны родителей</TableHead>
                      <TableHead>Telegram</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer"
                        onClick={() => handleViewDetails(student)}
                      >
                        <TableCell>
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
                        <TableCell>
                          {student.current_school || (
                            <span className="text-slate-400">Не указана</span>
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
                                  handleViewDetails(student);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                                Просмотр
                              </DropdownMenuItem>
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
    </div>
  );
}
