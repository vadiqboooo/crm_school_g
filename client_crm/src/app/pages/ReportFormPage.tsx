import { useState } from "react";
import { useNavigate } from "react-router";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "new" | "in-progress" | "urgent" | "completed";
}

interface ChurnStudent {
  id: string;
  name: string;
  reason: string;
}

interface NotifiedStudent {
  id: string;
  name: string;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Обзвон студентов",
    description: "Напомнить что завтра старт урока на 11:02",
    deadline: "Сегодня",
    status: "in-progress",
  },
  {
    id: "2",
    title: "Напоминание",
    description: "Позвонить напомнить про оплату",
    deadline: "Срочно",
    status: "urgent",
  },
];

export function ReportFormPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [churnStudents, setChurnStudents] = useState<ChurnStudent[]>([]);
  const [notifiedStudents, setNotifiedStudents] = useState<NotifiedStudent[]>([
    { id: "1", name: "Иванов Иван" },
    { id: "2", name: "Петрова Мария" },
  ]);
  const [startTime] = useState("12:48");
  const [currentDate] = useState("12.02.2026");
  
  const [isNotifiedDialogOpen, setIsNotifiedDialogOpen] = useState(false);
  const [isChurnDialogOpen, setIsChurnDialogOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [cancellations, setCancellations] = useState<string[]>([]);
  const [showCancellationsInput, setShowCancellationsInput] = useState(false);
  const [waterBalance, setWaterBalance] = useState(10);

  const handleAddNotifiedStudent = () => {
    setIsNotifiedDialogOpen(true);
  };

  const handleSaveNotifiedStudent = () => {
    if (newStudentName.trim()) {
      const newStudent: NotifiedStudent = {
        id: Date.now().toString(),
        name: newStudentName.trim(),
      };
      setNotifiedStudents([...notifiedStudents, newStudent]);
      setNewStudentName("");
      setIsNotifiedDialogOpen(false);
    }
  };

  const handleRemoveNotifiedStudent = (id: string) => {
    setNotifiedStudents(notifiedStudents.filter(s => s.id !== id));
  };

  const handleAddChurnStudent = () => {
    setIsChurnDialogOpen(true);
  };

  const handleSaveChurnStudent = () => {
    if (newStudentName.trim()) {
      const newStudent: ChurnStudent = {
        id: Date.now().toString(),
        name: newStudentName.trim(),
        reason: "",
      };
      setChurnStudents([...churnStudents, newStudent]);
      setNewStudentName("");
      setIsChurnDialogOpen(false);
    }
  };

  const handleRemoveChurnStudent = (id: string) => {
    setChurnStudents(churnStudents.filter(s => s.id !== id));
  };

  const handleUpdateChurnReason = (id: string, reason: string) => {
    setChurnStudents(churnStudents.map(s => 
      s.id === id ? { ...s, reason } : s
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
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
      case "in-progress":
        return "В работе";
      case "urgent":
        return "Срочно";
      case "completed":
        return "Выполнена";
      default:
        return status;
    }
  };

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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-md">
              <span className="text-sm font-medium text-blue-900">Начало:</span>
              <span className="text-base font-semibold text-blue-900">{startTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            defaultValue={currentDate.split(".").reverse().join("-")}
            className="w-auto"
          />
          <Button className="bg-slate-900 hover:bg-slate-800">
            Завершить рабочий день
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
                <Button variant="ghost" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить задачу
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                      Статус
                    </th>
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
                          <div className="text-sm text-slate-500 mt-1">
                            {task.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.deadline === "Срочно"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {task.deadline}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Select defaultValue={task.status}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Новая</SelectItem>
                            <SelectItem value="in-progress">В работе</SelectItem>
                            <SelectItem value="urgent">Срочно</SelectItem>
                            <SelectItem value="completed">Выполнена</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div>
          <Tabs defaultValue="operations" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="operations">Операции и клиенты</TabsTrigger>
              <TabsTrigger value="finances">Финансы и закупки</TabsTrigger>
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
                        defaultValue="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social">Соц.сети</Label>
                      <Input
                        id="social"
                        type="number"
                        defaultValue="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Сайт</Label>
                      <Input
                        id="website"
                        type="number"
                        defaultValue="0"
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
                        defaultValue="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attended">Пришло на пробные</Label>
                      <Input
                        id="attended"
                        type="number"
                        defaultValue="0"
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
                    <Button variant="ghost" size="sm" className="gap-2" onClick={handleAddNotifiedStudent}>
                      <Plus className="w-4 h-4" />
                      Добавить ученика
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {notifiedStudents.map(student => (
                      <span key={student.id} className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-800 text-sm">
                        {student.name}
                        <button className="ml-2 hover:text-blue-900" onClick={() => handleRemoveNotifiedStudent(student.id)}>×</button>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Переносы/отмены
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setShowCancellationsInput(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Добавить
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!showCancellationsInput ? (
                    <p className="text-sm text-slate-600">Нет</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Textarea
                          placeholder="Опишите переносы или отмены занятий..."
                          rows={4}
                          className="flex-1"
                        />
                        <button 
                          className="text-slate-400 hover:text-slate-600 mt-2"
                          onClick={() => setShowCancellationsInput(false)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Отток (кто и причины)
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={handleAddChurnStudent}>
                      <Plus className="w-4 h-4" />
                      Добаить ученика
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
                            <span className="font-medium text-slate-900">{student.name}</span>
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
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Сохранить
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
                        defaultValue="0"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashless">Безналичный</Label>
                      <Input
                        id="cashless"
                        type="number"
                        defaultValue="0"
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
                        onClick={() => setWaterBalance(Math.max(0, waterBalance - 1))}
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
                        onClick={() => setWaterBalance(waterBalance + 1)}
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
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Сохранить
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isNotifiedDialogOpen} onOpenChange={setIsNotifiedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ученика</DialogTitle>
            <DialogDescription>
              Введите имя ученика, которого вы оповестили о пробных занятиях.
            </DialogDescription>
          </DialogHeader>
          <Input
            id="name"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="Имя ученика"
            className="mt-2"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNotifiedDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleSaveNotifiedStudent}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChurnDialogOpen} onOpenChange={setIsChurnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ученика</DialogTitle>
            <DialogDescription>
              Введите имя ученика, который ушел.
            </DialogDescription>
          </DialogHeader>
          <Input
            id="name"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="Имя ученика"
            className="mt-2"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsChurnDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleSaveChurnStudent}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}