import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Task, TaskCreate, TaskUpdate, User } from "../types/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useTasksWebSocket } from "../hooks/useTasksWebSocket";
import { useCallback } from "react";

export function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string>("");

  useEffect(() => {
    loadTasks();
    loadEmployees();
  }, []);

  const handleTaskWebSocketUpdate = useCallback((message: any) => {
    if (message.action === "create") {
      setTasks((prevTasks) => {
        // Check if task already exists (to avoid duplicates)
        if (prevTasks.some(t => t.id === message.task.id)) {
          return prevTasks;
        }
        // For managers, only show tasks assigned to them
        if (!isAdmin && message.task.assigned_to !== user?.id) {
          return prevTasks;
        }

        // Note: Notification is shown by Layout globally, not here

        return [message.task, ...prevTasks];
      });
    } else if (message.action === "update") {
      setTasks((prevTasks) =>
        prevTasks.map(t => t.id === message.task.id ? message.task : t)
      );
    } else if (message.action === "delete") {
      setTasks((prevTasks) =>
        prevTasks.filter(t => t.id !== message.task_id)
      );
    }
  }, [isAdmin, user?.id]);

  useTasksWebSocket(handleTaskWebSocketUpdate);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getAllTasks();
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast.error("Ошибка при загрузке задач");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      // Load only managers and admins for task assignment
      const data = await api.getEmployees(['admin', 'manager']);
      setEmployees(data);
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const taskData: TaskCreate = {
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        deadline: newTaskDeadline || undefined,
        status: "new",
        assigned_to: (newTaskAssignedTo && newTaskAssignedTo !== "none") ? newTaskAssignedTo : undefined,
      };

      const newTask = await api.createTask(taskData);
      setTasks([newTask, ...tasks]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDeadline("");
      setNewTaskAssignedTo("");
      setIsTaskDialogOpen(false);
      toast.success("Задача создана");
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
      toast.success("Статус обновлен");
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
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

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Задачи</h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Все задачи системы" : "Задачи назначенные вам"}
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            onClick={() => setIsTaskDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать задачу
          </Button>
        )}
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Список задач ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              Задач пока нет. Создайте первую задачу.
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                      Создана
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
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(task.created_at)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать задачу</DialogTitle>
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
                placeholder="Например: Сегодня, Срочно, 25 февраля"
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
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
