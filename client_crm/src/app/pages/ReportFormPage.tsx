import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ArrowLeft, Plus, Loader2, Check, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { DailyReport, Task, TaskCreate, TaskUpdate, DailyReportUpdate, User, Student } from "../types/api";
import { toast } from "sonner";
import { useTasksWebSocket } from "../hooks/useTasksWebSocket";
import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

interface ChurnStudentForm {
  id: string;
  student_id?: string;
  student_name: string;
  reason: string;
}

interface NotifiedStudentForm {
  id: string;
  student_id?: string;
  student_name: string;
}

export function ReportFormPage() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Tab saved states
  const [operationsTabSaved, setOperationsTabSaved] = useState(false);
  const [financesTabSaved, setFinancesTabSaved] = useState(false);

  // Operations tab form
  const [leadCalls, setLeadCalls] = useState(0);
  const [leadSocial, setLeadSocial] = useState(0);
  const [leadWebsite, setLeadWebsite] = useState(0);
  const [trialScheduled, setTrialScheduled] = useState(0);
  const [trialAttended, setTrialAttended] = useState(0);
  const [cancellations, setCancellations] = useState("");
  const [churnStudents, setChurnStudents] = useState<ChurnStudentForm[]>([]);
  const [notifiedStudents, setNotifiedStudents] = useState<NotifiedStudentForm[]>([]);

  // Finances tab form
  const [cashIncome, setCashIncome] = useState(0);
  const [cashlessIncome, setCashlessIncome] = useState(0);
  const [waterBalance, setWaterBalance] = useState(0);
  const [shoppingList, setShoppingList] = useState("");
  const [dayComment, setDayComment] = useState("");

  // Dialogs
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNotifiedDialogOpen, setIsNotifiedDialogOpen] = useState(false);
  const [isChurnDialogOpen, setIsChurnDialogOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newChurnReason, setNewChurnReason] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string>("");

  const [savingOperations, setSavingOperations] = useState(false);
  const [savingFinances, setSavingFinances] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
    loadEmployees();
    loadStudents();
  }, [reportId]);

  const handleTaskWebSocketUpdate = useCallback((message: any) => {
    if (message.action === "create") {
      setTasks((prevTasks) => {
        // Check if task already exists
        if (prevTasks.some(t => t.id === message.task.id)) {
          return prevTasks;
        }

        // Note: Notification is shown by Layout globally, not here

        // Filter tasks: only add if they should be visible in this report
        // (following the same logic as filtered tasks endpoint)
        if (!report) return [...prevTasks, message.task];

        const reportCreatedAt = new Date(report.created_at);
        const taskCreatedAt = new Date(message.task.created_at);

        // Show task only if:
        // 1. Created after current report was created
        // 2. OR not completed
        if (taskCreatedAt > reportCreatedAt || message.task.status !== "completed") {
          return [...prevTasks, message.task];
        }

        // Don't add old completed tasks
        return prevTasks;
      });
    } else if (message.action === "update") {
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map(t => t.id === message.task.id ? message.task : t);

        // Remove completed tasks that were created before current report was created
        // (following the same logic as filtered tasks endpoint)
        // This handles multiple reports per day correctly
        if (!report) return updatedTasks;

        const reportCreatedAt = new Date(report.created_at);

        return updatedTasks.filter(task => {
          // Keep all non-completed tasks
          if (task.status !== "completed") return true;

          // For completed tasks, only keep if created after current report was created
          const taskCreatedAt = new Date(task.created_at);

          return taskCreatedAt > reportCreatedAt;
        });
      });
    } else if (message.action === "delete") {
      setTasks((prevTasks) =>
        prevTasks.filter(t => t.id !== message.task_id)
      );
    }
  }, [report]);

  useTasksWebSocket(handleTaskWebSocketUpdate);

  const loadEmployees = async () => {
    try {
      // Load only managers and admins for task assignment
      const data = await api.getEmployees(['admin', 'manager']);
      setEmployees(data);
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await api.getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const loadReport = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      const data = await api.getReport(reportId);
      setReport(data);

      // Load filtered tasks for this report (excluding completed tasks from previous reports)
      const tasksData = await api.getFilteredReportTasks(reportId);
      setTasks(tasksData);

      // Populate form fields
      setLeadCalls(data.lead_calls);
      setLeadSocial(data.lead_social);
      setLeadWebsite(data.lead_website);
      setTrialScheduled(data.trial_scheduled);
      setTrialAttended(data.trial_attended);
      setCancellations(data.cancellations || "");
      setCashIncome(data.cash_income);
      setCashlessIncome(data.cashless_income);
      setWaterBalance(data.water_balance || 0);
      setShoppingList(data.shopping_list || "");
      setDayComment(data.day_comment || "");

      // Convert DB churn students to form state
      const churnData: ChurnStudentForm[] = data.churn_students.map(cs => ({
        id: cs.id,
        student_name: cs.student_name || "",
        reason: cs.reason || "",
      }));
      setChurnStudents(churnData);

      // Convert DB notified students to form state
      const notifiedData: NotifiedStudentForm[] = data.notified_students.map(ns => ({
        id: ns.id,
        student_name: ns.student_name || "",
      }));
      setNotifiedStudents(notifiedData);

    } catch (error) {
      console.error("Failed to load report:", error);
      toast.error("Ошибка при загрузке отчета");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOperations = async () => {
    if (!reportId) return;

    try {
      setSavingOperations(true);

      const updateData: DailyReportUpdate = {
        lead_calls: leadCalls,
        lead_social: leadSocial,
        lead_website: leadWebsite,
        trial_scheduled: trialScheduled,
        trial_attended: trialAttended,
        cancellations: cancellations || undefined,
      };

      await api.updateReport(reportId, updateData);
      setOperationsTabSaved(true);
      toast.success("Операции и клиенты сохранены");
    } catch (error) {
      console.error("Failed to save operations:", error);
      toast.error("Ошибка при сохранении");
    } finally {
      setSavingOperations(false);
    }
  };

  const handleSaveFinances = async () => {
    if (!reportId) return;

    try {
      setSavingFinances(true);

      const updateData: DailyReportUpdate = {
        cash_income: cashIncome,
        cashless_income: cashlessIncome,
        water_balance: waterBalance,
        shopping_list: shoppingList || undefined,
        day_comment: dayComment || undefined,
      };

      await api.updateReport(reportId, updateData);
      setFinancesTabSaved(true);
      toast.success("Финансы и закупки сохранены");
    } catch (error) {
      console.error("Failed to save finances:", error);
      toast.error("Ошибка при сохранении");
    } finally {
      setSavingFinances(false);
    }
  };

  const handleCompleteWorkday = async () => {
    if (!operationsTabSaved || !financesTabSaved) {
      toast.error("Сохраните все вкладки перед завершением рабочего дня");
      return;
    }

    if (!reportId) return;

    try {
      setCompleting(true);

      // Save end time
      const now = new Date();
      const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      await api.updateReport(reportId, {
        status: "completed",
        end_time: endTime
      });
      toast.success("Рабочий день завершен");
      navigate("/reports");
    } catch (error) {
      console.error("Failed to complete workday:", error);
      toast.error("Ошибка при завершении рабочего дня");
    } finally {
      setCompleting(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !reportId) return;

    try {
      const taskData: TaskCreate = {
        report_id: reportId,
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        deadline: newTaskDeadline || undefined,
        status: "new",
        assigned_to: (newTaskAssignedTo && newTaskAssignedTo !== "none") ? newTaskAssignedTo : undefined,
      };

      const newTask = await api.createTask(taskData);
      setTasks([...tasks, newTask]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDeadline("");
      setNewTaskAssignedTo("");
      setIsTaskDialogOpen(false);
      toast.success("Задача добавлена");
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Ошибка при создании задачи");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updateData: TaskUpdate = { status: status as any };
      const updatedTask = await api.updateTask(taskId, updateData);
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Ошибка при обновлении задачи");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Задача удалена");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Ошибка при удалении задачи");
    }
  };

  const handleAddNotifiedStudent = () => {
    if (!newStudentId) return;

    const selectedStudent = students.find(s => s.id === newStudentId);
    if (!selectedStudent) return;

    // Check if student already added
    if (notifiedStudents.some(s => s.student_id === newStudentId)) {
      toast.error("Этот ученик уже добавлен");
      return;
    }

    const newStudent: NotifiedStudentForm = {
      id: Date.now().toString(),
      student_id: selectedStudent.id,
      student_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
    };
    setNotifiedStudents([...notifiedStudents, newStudent]);
    setNewStudentId("");
    setNewStudentName("");
    setIsNotifiedDialogOpen(false);
    setOperationsTabSaved(false);
  };

  const handleRemoveNotifiedStudent = (id: string) => {
    setNotifiedStudents(notifiedStudents.filter(s => s.id !== id));
    setOperationsTabSaved(false);
  };

  const handleAddChurnStudent = () => {
    if (!newStudentId) {
      toast.error("Выберите ученика");
      return;
    }

    if (!newChurnReason.trim()) {
      toast.error("Укажите причину ухода");
      return;
    }

    const selectedStudent = students.find(s => s.id === newStudentId);
    if (!selectedStudent) return;

    // Check if student already added
    if (churnStudents.some(s => s.student_id === newStudentId)) {
      toast.error("Этот ученик уже добавлен");
      return;
    }

    const newStudent: ChurnStudentForm = {
      id: Date.now().toString(),
      student_id: selectedStudent.id,
      student_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
      reason: newChurnReason.trim(),
    };
    setChurnStudents([...churnStudents, newStudent]);
    setNewStudentId("");
    setNewStudentName("");
    setNewChurnReason("");
    setIsChurnDialogOpen(false);
    setOperationsTabSaved(false);
  };

  const handleRemoveChurnStudent = (id: string) => {
    setChurnStudents(churnStudents.filter(s => s.id !== id));
    setOperationsTabSaved(false);
  };

  const handleUpdateChurnReason = (id: string, reason: string) => {
    setChurnStudents(churnStudents.map(s =>
      s.id === id ? { ...s, reason } : s
    ));
    setOperationsTabSaved(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Новая";
      case "in_progress":
        return "В работе";
      case "urgent":
        return "Срочно";
      case "completed":
        return "Выполнена";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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

  if (!report) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <p className="text-slate-600">Отчет не найден</p>
          <Button onClick={() => navigate("/reports")} className="mt-4">
            Вернуться к отчетам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/reports")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold text-slate-900">
              Ежедневный отчет
            </h1>
            {report.start_time && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-md">
                <span className="text-sm font-medium text-blue-900">Начало:</span>
                <span className="text-base font-semibold text-blue-900">
                  {report.start_time}
                </span>
              </div>
            )}
            {report.status === "draft" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Онлайн
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            {formatDate(report.date)}
          </div>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            onClick={handleCompleteWorkday}
            disabled={!operationsTabSaved || !financesTabSaved || completing || report.status === "completed"}
          >
            {completing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Завершение...
              </>
            ) : (
              report.status === "completed" ? "Рабочий день завершен" : "Завершить рабочий день"
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left Column - Tasks */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Задачи</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsTaskDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Добавить задачу
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  Задач пока нет
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                        Задача
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                        Дедлайн
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                        Назначена
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                        Статус
                      </th>
                      {isAdmin && (
                        <th className="w-12 px-6 py-3"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-slate-500 mt-1">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {task.deadline ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {task.deadline}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {task.assignee ? (
                            `${task.assignee.first_name} ${task.assignee.last_name}`
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleUpdateTaskStatus(task.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Новая</SelectItem>
                              <SelectItem value="in_progress">В работе</SelectItem>
                              <SelectItem value="urgent">Срочно</SelectItem>
                              <SelectItem value="completed">Выполнена</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTask(task.id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div>
          <Tabs defaultValue="operations" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="operations"
                className={operationsTabSaved ? "bg-green-100 text-green-800 data-[state=active]:bg-green-200" : ""}
              >
                <div className="flex items-center gap-2">
                  Операции и клиенты
                  {operationsTabSaved && <Check className="w-4 h-4" />}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="finances"
                className={financesTabSaved ? "bg-green-100 text-green-800 data-[state=active]:bg-green-200" : ""}
              >
                <div className="flex items-center gap-2">
                  Финансы и закупки
                  {financesTabSaved && <Check className="w-4 h-4" />}
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="operations" className="space-y-4">
              {/* Leads */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Лиды (внести в CRM)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calls">Звонки</Label>
                      <Input
                        id="calls"
                        type="number"
                        value={leadCalls}
                        onChange={(e) => {
                          setLeadCalls(Number(e.target.value));
                          setOperationsTabSaved(false);
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social">Соц.сети</Label>
                      <Input
                        id="social"
                        type="number"
                        value={leadSocial}
                        onChange={(e) => {
                          setLeadSocial(Number(e.target.value));
                          setOperationsTabSaved(false);
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Сайт</Label>
                      <Input
                        id="website"
                        type="number"
                        value={leadWebsite}
                        onChange={(e) => {
                          setLeadWebsite(Number(e.target.value));
                          setOperationsTabSaved(false);
                        }}
                        min="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trial Lessons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled">Записано на пробные</Label>
                      <Input
                        id="scheduled"
                        type="number"
                        value={trialScheduled}
                        onChange={(e) => {
                          setTrialScheduled(Number(e.target.value));
                          setOperationsTabSaved(false);
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attended">Пришло на пробные</Label>
                      <Input
                        id="attended"
                        type="number"
                        value={trialAttended}
                        onChange={(e) => {
                          setTrialAttended(Number(e.target.value));
                          setOperationsTabSaved(false);
                        }}
                        min="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Оповестили о пробных занятиях</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => setIsNotifiedDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Добавить ученика
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {notifiedStudents.length === 0 ? (
                    <p className="text-sm text-slate-600">Нет</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {notifiedStudents.map(student => (
                        <span
                          key={student.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-800 text-sm"
                        >
                          {student.student_name}
                          <button
                            className="ml-2 hover:text-blue-900"
                            onClick={() => handleRemoveNotifiedStudent(student.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Переносы/отмены
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Опишите переносы или отмены занятий..."
                    rows={3}
                    value={cancellations}
                    onChange={(e) => {
                      setCancellations(e.target.value);
                      setOperationsTabSaved(false);
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Отток (кто и причины)
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => setIsChurnDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Добавить ученика
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {churnStudents.length === 0 ? (
                    <p className="text-sm text-slate-600">Нет</p>
                  ) : (
                    <div className="space-y-3">
                      {churnStudents.map((student) => (
                        <div key={student.id} className="space-y-2 p-3 bg-slate-50 rounded-md">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{student.student_name}</span>
                            <button
                              className="text-slate-400 hover:text-slate-600"
                              onClick={() => handleRemoveChurnStudent(student.id)}
                            >
                              ×
                            </button>
                          </div>
                          <Input
                            placeholder="Причина ухода"
                            value={student.reason}
                            onChange={(e) => handleUpdateChurnReason(student.id, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveOperations}
                disabled={savingOperations}
              >
                {savingOperations ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </TabsContent>

            <TabsContent value="finances" className="space-y-4">
              {/* Поступление денег */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Поступление денег</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cash">Наличные</Label>
                      <Input
                        id="cash"
                        type="number"
                        value={cashIncome}
                        onChange={(e) => {
                          setCashIncome(Number(e.target.value));
                          setFinancesTabSaved(false);
                        }}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashless">Безналичный</Label>
                      <Input
                        id="cashless"
                        type="number"
                        value={cashlessIncome}
                        onChange={(e) => {
                          setCashlessIncome(Number(e.target.value));
                          setFinancesTabSaved(false);
                        }}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Остаток по воде */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-900">Остаток по воде</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setWaterBalance(Math.max(0, waterBalance - 1));
                          setFinancesTabSaved(false);
                        }}
                      >
                        <span className="text-lg">−</span>
                      </Button>
                      <div className="min-w-[100px] text-center">
                        <span className="text-2xl font-semibold text-slate-900">
                          {waterBalance}
                        </span>
                        <span className="text-sm text-slate-500 ml-2">бутылей</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setWaterBalance(waterBalance + 1);
                          setFinancesTabSaved(false);
                        }}
                      >
                        <span className="text-lg">+</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Список покупок */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Список покупок</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Укажите что нужно купить..."
                    rows={4}
                    value={shoppingList}
                    onChange={(e) => {
                      setShoppingList(e.target.value);
                      setFinancesTabSaved(false);
                    }}
                  />
                </CardContent>
              </Card>

              {/* Комментарий по рабочему дню */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Комментарий по рабочему дню</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Добавьте комментарий о рабочем дне..."
                    rows={4}
                    value={dayComment}
                    onChange={(e) => {
                      setDayComment(e.target.value);
                      setFinancesTabSaved(false);
                    }}
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveFinances}
                disabled={savingFinances}
              >
                {savingFinances ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить задачу</DialogTitle>
            <DialogDescription>
              Создайте новую задачу для отслеживания.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Название задачи</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Например: Обзвон студентов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Описание</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Дополнительные детали..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deadline">Дедлайн</Label>
              <Input
                id="task-deadline"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                placeholder="Например: Сегодня, Срочно"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Назначить</Label>
              <Select value={newTaskAssignedTo} onValueChange={setNewTaskAssignedTo}>
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначено</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTaskDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleAddTask}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notified Student Dialog */}
      <Dialog open={isNotifiedDialogOpen} onOpenChange={(open) => {
        setIsNotifiedDialogOpen(open);
        if (!open) {
          setNewStudentId("");
          setNewStudentName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ученика</DialogTitle>
            <DialogDescription>
              Начните вводить имя ученика для поиска.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>Ученик</Label>
            <Command className="border rounded-md">
              <CommandInput
                placeholder="Поиск ученика..."
                value={newStudentName}
                onValueChange={setNewStudentName}
              />
              <CommandList>
                <CommandEmpty>Ученик не найден</CommandEmpty>
                <CommandGroup>
                  {students
                    .filter(student => {
                      if (!newStudentName) return true;
                      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
                      return fullName.includes(newStudentName.toLowerCase());
                    })
                    .map((student) => (
                      <CommandItem
                        key={student.id}
                        value={`${student.first_name} ${student.last_name}`}
                        onSelect={() => {
                          setNewStudentId(student.id);
                          setNewStudentName(`${student.first_name} ${student.last_name}`);
                        }}
                      >
                        {student.first_name} {student.last_name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsNotifiedDialogOpen(false);
                setNewStudentId("");
                setNewStudentName("");
              }}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleAddNotifiedStudent}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Churn Student Dialog */}
      <Dialog open={isChurnDialogOpen} onOpenChange={(open) => {
        setIsChurnDialogOpen(open);
        if (!open) {
          setNewStudentId("");
          setNewStudentName("");
          setNewChurnReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ученика в отток</DialogTitle>
            <DialogDescription>
              Начните вводить имя ученика для поиска и укажите причину ухода.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Ученик *</Label>
              <Command className="border rounded-md">
                <CommandInput
                  placeholder="Поиск ученика..."
                  value={newStudentName}
                  onValueChange={setNewStudentName}
                />
                <CommandList>
                  <CommandEmpty>Ученик не найден</CommandEmpty>
                  <CommandGroup>
                    {students
                      .filter(student => {
                        if (!newStudentName) return true;
                        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
                        return fullName.includes(newStudentName.toLowerCase());
                      })
                      .map((student) => (
                        <CommandItem
                          key={student.id}
                          value={`${student.first_name} ${student.last_name}`}
                          onSelect={() => {
                            setNewStudentId(student.id);
                            setNewStudentName(`${student.first_name} ${student.last_name}`);
                          }}
                        >
                          {student.first_name} {student.last_name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <div className="space-y-2">
              <Label htmlFor="churn-reason">Причина ухода *</Label>
              <Textarea
                id="churn-reason"
                value={newChurnReason}
                onChange={(e) => setNewChurnReason(e.target.value)}
                placeholder="Укажите причину ухода..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChurnDialogOpen(false);
                setNewStudentId("");
                setNewStudentName("");
                setNewChurnReason("");
              }}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleAddChurnStudent}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
