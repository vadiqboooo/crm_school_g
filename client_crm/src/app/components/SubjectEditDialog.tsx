import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Subject, SubjectUpdate, TaskConfig, ScaleMarker, GradeScaleItem, TopicConfig, ExamType } from "../types/api";

interface SubjectEditDialogProps {
  subject?: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isCreate?: boolean;
}

export function SubjectEditDialog({
  subject,
  open,
  onOpenChange,
  onSuccess,
  isCreate = false,
}: SubjectEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Basic info
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [examType, setExamType] = useState<ExamType | "">("");

  // Tasks
  const [tasks, setTasks] = useState<TaskConfig[]>([]);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskLabel, setTaskLabel] = useState("");
  const [taskScore, setTaskScore] = useState("1");

  // Scale for ЕГЭ
  const [showScaleEditor, setShowScaleEditor] = useState(false);
  const [scaleInput, setScaleInput] = useState("");
  const [scaleMarkers, setScaleMarkers] = useState<ScaleMarker[]>([]);
  const [newMarker, setNewMarker] = useState({
    primaryScore: "",
    label: "",
    type: "passing" as ScaleMarker["type"],
  });

  // Grade scale for ОГЭ
  const [gradeScale, setGradeScale] = useState<GradeScaleItem[]>([]);

  // Topics
  const [showTopicsEditor, setShowTopicsEditor] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [topics, setTopics] = useState<TopicConfig[]>([]);
  const [newTopicByTask, setNewTopicByTask] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (subject && open) {
      setCode(subject.code || "");
      setName(subject.name);
      setDescription(subject.description || "");
      setIsActive(subject.is_active);
      setExamType((subject.exam_type as ExamType) || "");
      setTasks(subject.tasks || []);
      setScaleInput((subject.primary_to_secondary_scale || []).join(", "));
      setScaleMarkers(subject.scale_markers || []);
      setGradeScale(subject.grade_scale || []);
      setTopics(subject.topics || []);
    } else if (!subject && open) {
      // Reset for create mode
      setCode("");
      setName("");
      setDescription("");
      setIsActive(true);
      setExamType("");
      setTasks([]);
      setScaleInput("");
      setScaleMarkers([]);
      setGradeScale([]);
      setTopics([]);
    }
  }, [subject, open]);

  const getTotalPrimaryScore = () => {
    return tasks.reduce((sum, task) => sum + task.maxScore, 0);
  };

  const handleAddTask = () => {
    const newTask: TaskConfig = {
      label: String(tasks.length + 1),
      maxScore: 1,
    };
    setTasks([...tasks, newTask]);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleEditTask = (index: number) => {
    setEditingTaskIndex(index);
    setTaskLabel(tasks[index].label);
    setTaskScore(String(tasks[index].maxScore));
  };

  const handleSaveTask = () => {
    if (editingTaskIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = {
        label: taskLabel,
        maxScore: parseInt(taskScore) || 1,
      };
      setTasks(updatedTasks);
      setEditingTaskIndex(null);
      setTaskLabel("");
      setTaskScore("1");
    }
  };

  const handleScaleInputChange = (value: string) => {
    setScaleInput(value);
  };

  const parseScaleInput = (): number[] => {
    if (!scaleInput.trim()) return [];
    return scaleInput
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
  };

  const handleAddMarker = () => {
    const primaryScore = parseInt(newMarker.primaryScore);
    const scale = parseScaleInput();

    if (isNaN(primaryScore) || !newMarker.label || scale.length === 0) {
      toast.error("Заполните все поля и таблицу перевода");
      return;
    }

    if (primaryScore < 0 || primaryScore >= scale.length) {
      toast.error("Первичный балл вне диапазона шкалы");
      return;
    }

    const secondaryScore = scale[primaryScore];
    const colors = {
      passing: "#10b981",
      average: "#3b82f6",
      part1: "#8b5cf6",
      custom: "#f59e0b",
    };

    const marker: ScaleMarker = {
      id: String(Date.now()),
      primaryScore,
      secondaryScore,
      label: newMarker.label,
      type: newMarker.type,
      color: colors[newMarker.type],
    };

    setScaleMarkers([...scaleMarkers, marker]);
    setNewMarker({ primaryScore: "", label: "", type: "passing" });
  };

  const handleRemoveMarker = (id: string) => {
    setScaleMarkers(scaleMarkers.filter((m) => m.id !== id));
  };

  const handleInitializeDefaultGradeScale = () => {
    setGradeScale([
      { grade: 2, min: 0, max: 10 },
      { grade: 3, min: 11, max: 15 },
      { grade: 4, min: 16, max: 20 },
      { grade: 5, min: 21, max: getTotalPrimaryScore() },
    ]);
  };

  const handleAddGrade = () => {
    setGradeScale([...gradeScale, { grade: 3, min: 0, max: 10 }]);
  };

  const handleRemoveGrade = (index: number) => {
    setGradeScale(gradeScale.filter((_, i) => i !== index));
  };

  const handleGradeScaleChange = (index: number, field: keyof GradeScaleItem, value: string) => {
    const updated = [...gradeScale];
    updated[index] = {
      ...updated[index],
      [field]: parseInt(value) || 0,
    };
    setGradeScale(updated);
  };

  const toggleTaskExpanded = (index: number) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedTasks(newSet);
  };

  const getTopicsForTask = (taskNumber: number): TopicConfig[] => {
    return topics.filter((t) => t.taskNumbers.includes(taskNumber));
  };

  const handleAddTopicToTask = (taskIndex: number) => {
    const topicText = newTopicByTask[taskIndex]?.trim();
    if (!topicText) return;

    const taskNumber = taskIndex + 1;
    const existingTopic = topics.find((t) => t.topic === topicText);

    if (existingTopic) {
      // Add task number to existing topic
      if (!existingTopic.taskNumbers.includes(taskNumber)) {
        existingTopic.taskNumbers.push(taskNumber);
        setTopics([...topics]);
      }
    } else {
      // Create new topic
      setTopics([...topics, { topic: topicText, taskNumbers: [taskNumber] }]);
    }

    setNewTopicByTask({ ...newTopicByTask, [taskIndex]: "" });
  };

  const handleRemoveTopicFromTask = (topicIndex: number, taskNumber: number) => {
    const updated = [...topics];
    const topic = updated[topicIndex];
    topic.taskNumbers = topic.taskNumbers.filter((n) => n !== taskNumber);

    if (topic.taskNumbers.length === 0) {
      // Remove topic if no tasks left
      updated.splice(topicIndex, 1);
    }

    setTopics(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Укажите название предмета");
      return;
    }

    if (isCreate && !code?.trim()) {
      toast.error("Укажите код предмета");
      return;
    }

    try {
      setLoading(true);

      const data: SubjectUpdate = {
        name,
        description: description || undefined,
        code: code || undefined,
        is_active: isActive,
        exam_type: examType || undefined,
        tasks: tasks.length > 0 ? tasks : undefined,
        primary_to_secondary_scale: examType === "ЕГЭ" && scaleInput ? parseScaleInput() : undefined,
        scale_markers: examType === "ЕГЭ" && scaleMarkers.length > 0 ? scaleMarkers : undefined,
        grade_scale: examType === "ОГЭ" && gradeScale.length > 0 ? gradeScale : undefined,
        topics: topics.length > 0 ? topics : undefined,
      };

      if (isCreate) {
        await api.request("/subjects", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast.success("Предмет успешно создан");
      } else if (subject) {
        await api.request(`/subjects/${subject.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast.success("Предмет успешно обновлен");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save subject:", error);
      toast.error("Ошибка при сохранении предмета");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Создать предмет" : "Редактировать предмет"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Заполните информацию о новом предмете"
              : "Измените информацию о предмете"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Основное</TabsTrigger>
            <TabsTrigger value="tasks">Задания</TabsTrigger>
            <TabsTrigger value="scales">Шкалы баллов</TabsTrigger>
            <TabsTrigger value="topics">Темы</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Код предмета {isCreate && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="rus, math_profile, infa_9"
                  disabled={!isCreate}
                />
                <p className="text-xs text-slate-500">
                  Уникальный код для идентификации предмета
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Статус</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <span className={`text-sm font-medium ${isActive ? "text-green-600" : "text-slate-400"}`}>
                    {isActive ? "Активен" : "Неактивен"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Название <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Русский язык"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание предмета..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam_type">Тип экзамена</Label>
              <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип экзамена" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ЕГЭ">ЕГЭ</SelectItem>
                  <SelectItem value="ОГЭ">ОГЭ</SelectItem>
                </SelectContent>
              </Select>
              {examType === "ЕГЭ" && (
                <p className="text-xs text-slate-500 flex items-start gap-1">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  Для ЕГЭ требуется таблица перевода первичных баллов в тестовые (100-балльная шкала)
                </p>
              )}
              {examType === "ОГЭ" && (
                <p className="text-xs text-slate-500 flex items-start gap-1">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  Для ОГЭ используется только первичный балл, таблица перевода не требуется
                </p>
              )}
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Конфигурация заданий</CardTitle>
                    <CardDescription>
                      Настройте количество и баллы за каждое задание
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => tasks.length > 0 && handleRemoveTask(tasks.length - 1)}
                      disabled={tasks.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {tasks.length}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddTask}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Первичный балл:
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {getTotalPrimaryScore()}
                  </span>
                </div>

                {tasks.length > 0 ? (
                  <div className="grid grid-cols-8 gap-2">
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        onClick={() => handleEditTask(index)}
                        className="flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-600">
                          {task.label}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {task.maxScore}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>Нет заданий. Нажмите + чтобы добавить.</p>
                  </div>
                )}

                {/* Edit Task Dialog */}
                {editingTaskIndex !== null && (
                  <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                    <h4 className="text-sm font-semibold mb-3">
                      Редактировать задание {editingTaskIndex + 1}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Номер/Название</Label>
                        <Input
                          value={taskLabel}
                          onChange={(e) => setTaskLabel(e.target.value)}
                          placeholder="1, 13.1, ГК1..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Макс. балл</Label>
                        <Input
                          type="number"
                          value={taskScore}
                          onChange={(e) => setTaskScore(e.target.value)}
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveTask}
                      >
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTaskIndex(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scales Tab */}
          <TabsContent value="scales" className="space-y-4">
            {examType === "ЕГЭ" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Таблица перевода баллов (ЕГЭ)</CardTitle>
                      <CardDescription>
                        Первичные баллы → Тестовые баллы (0-100)
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScaleEditor(!showScaleEditor)}
                    >
                      {showScaleEditor ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {showScaleEditor ? "Скрыть" : "Показать"}
                    </Button>
                  </div>
                </CardHeader>
                {showScaleEditor && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="scale_input">Шкала перевода</Label>
                      <Textarea
                        id="scale_input"
                        value={scaleInput}
                        onChange={(e) => handleScaleInputChange(e.target.value)}
                        placeholder="0, 3, 5, 8, 10, 12, 14, 17, 20, ..."
                        rows={3}
                      />
                      <p className="text-xs text-slate-500">
                        Введите тестовые баллы через запятую. Индекс = первичный балл.
                      </p>
                    </div>

                    {/* Timeline visualization */}
                    {parseScaleInput().length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Метки на шкале</h4>
                        <div className="relative h-20 bg-slate-100 rounded-lg p-4">
                          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-300 -translate-y-1/2"></div>
                          {scaleMarkers.map((marker) => {
                            const position = marker.secondaryScore;
                            return (
                              <div
                                key={marker.id}
                                className="absolute top-1/2 -translate-y-1/2"
                                style={{ left: `${position}%` }}
                              >
                                <div
                                  className="w-3 h-3 rounded-full border-2 border-white"
                                  style={{ backgroundColor: marker.color }}
                                ></div>
                                <div className="absolute top-full mt-1 -translate-x-1/2 left-1/2 whitespace-nowrap">
                                  <div
                                    className="text-xs px-2 py-1 rounded shadow-sm"
                                    style={{ backgroundColor: marker.color, color: "white" }}
                                  >
                                    {marker.label}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMarker(marker.id)}
                                      className="ml-1 text-white hover:text-slate-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>0</span>
                          <span>25</span>
                          <span>50</span>
                          <span>75</span>
                          <span>100</span>
                        </div>

                        {/* Add marker form */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Первичный балл</Label>
                            <Input
                              type="number"
                              value={newMarker.primaryScore}
                              onChange={(e) =>
                                setNewMarker({ ...newMarker, primaryScore: e.target.value })
                              }
                              placeholder="0"
                              min="0"
                              max={getTotalPrimaryScore()}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Название</Label>
                            <Input
                              value={newMarker.label}
                              onChange={(e) =>
                                setNewMarker({ ...newMarker, label: e.target.value })
                              }
                              placeholder="Название метки"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Тип</Label>
                            <Select
                              value={newMarker.type}
                              onValueChange={(v) =>
                                setNewMarker({ ...newMarker, type: v as ScaleMarker["type"] })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="passing">Проходной</SelectItem>
                                <SelectItem value="average">Средний</SelectItem>
                                <SelectItem value="part1">За 1 часть</SelectItem>
                                <SelectItem value="custom">Кастом</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddMarker}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить метку
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {examType === "ОГЭ" && (
              <Card>
                <CardHeader>
                  <CardTitle>Таблица перевода в оценку (ОГЭ)</CardTitle>
                  <CardDescription>
                    Первичные баллы → Оценка (2-5)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInitializeDefaultGradeScale}
                      variant="outline"
                    >
                      Заполнить типовыми значениями
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddGrade}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить диапазон
                    </Button>
                  </div>

                  {gradeScale.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                              Оценка
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                              Мин. балл
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                              Макс. балл
                            </th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-slate-700">
                              Действия
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeScale
                            .sort((a, b) => a.grade - b.grade)
                            .map((item, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    min="2"
                                    max="5"
                                    value={item.grade}
                                    onChange={(e) =>
                                      handleGradeScaleChange(index, "grade", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.min}
                                    onChange={(e) =>
                                      handleGradeScaleChange(index, "min", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.max}
                                    onChange={(e) =>
                                      handleGradeScaleChange(index, "max", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleRemoveGrade(index)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Таблица оценок не настроена.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!examType && (
              <div className="text-center py-12 text-slate-500">
                <p>Выберите тип экзамена на вкладке "Основное"</p>
              </div>
            )}
          </TabsContent>

          {/* Topics Tab */}
          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Темы по заданиям</CardTitle>
                    <CardDescription>
                      Привяжите темы к конкретным заданиям (опционально)
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTopicsEditor(!showTopicsEditor)}
                  >
                    {showTopicsEditor ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {showTopicsEditor ? "Скрыть" : "Показать"}
                  </Button>
                </div>
              </CardHeader>
              {showTopicsEditor && (
                <CardContent>
                  {tasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.map((task, taskIndex) => {
                        const taskNumber = taskIndex + 1;
                        const taskTopics = topics.filter((t) =>
                          t.taskNumbers.includes(taskNumber)
                        );
                        const isExpanded = expandedTasks.has(taskIndex);

                        return (
                          <div key={taskIndex} className="border rounded-lg">
                            <div
                              onClick={() => toggleTaskExpanded(taskIndex)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="font-medium">Задание {task.label}</span>
                                <Badge variant="secondary">
                                  {taskTopics.length} {taskTopics.length === 1 ? "тема" : "тем"}
                                </Badge>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-3 border-t space-y-3">
                                {taskTopics.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {taskTopics.map((topic, topicIndex) => (
                                      <Badge
                                        key={topicIndex}
                                        variant="outline"
                                        className="gap-1"
                                      >
                                        {topic.topic}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const originalIndex = topics.findIndex(
                                              (t) => t === topic
                                            );
                                            handleRemoveTopicFromTask(originalIndex, taskNumber);
                                          }}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Input
                                    value={newTopicByTask[taskIndex] || ""}
                                    onChange={(e) =>
                                      setNewTopicByTask({
                                        ...newTopicByTask,
                                        [taskIndex]: e.target.value,
                                      })
                                    }
                                    placeholder="Введите название темы"
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddTopicToTask(taskIndex);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddTopicToTask(taskIndex)}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Сначала добавьте задания на вкладке "Задания"</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : isCreate ? (
              "Создать"
            ) : (
              "Сохранить"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
