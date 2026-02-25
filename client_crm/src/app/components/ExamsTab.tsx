import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "./ui/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { FileText, ArrowLeft, MessageSquare, Loader2, User, Check, Trash2, Edit2, ChevronUp } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { api } from "../lib/api";
import { toast } from "sonner";
import type { Exam, ExamCreate, ExamResult, ExamResultCreate, ExamResultUpdate, Subject } from "../types/api";

interface ExamsTabProps {
  groupId: string;
  groupName: string;
  groupSubject: string;
}

interface StudentWithResult {
  id: string;
  first_name: string;
  last_name: string;
  result?: ExamResult;
}

export function ExamsTab({ groupId, groupName, groupSubject }: ExamsTabProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [students, setStudents] = useState<StudentWithResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [taskTopicsFromSubject, setTaskTopicsFromSubject] = useState<{ [taskNumber: number]: string[] }>({});
  const [schoolSubjects, setSchoolSubjects] = useState<Subject[]>([]);

  // Add exam dialog
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [examTemplates, setExamTemplates] = useState<Exam[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [taskTopics, setTaskTopics] = useState<{ [taskNumber: number]: string[] }>({});
  const [examTitle, setExamTitle] = useState<string>("");
  const [examComment, setExamComment] = useState<string>("");
  const [examDifficulty, setExamDifficulty] = useState<string>("");
  const [creatingExam, setCreatingExam] = useState(false);

  // Edit exam dialog
  const [isEditExamOpen, setIsEditExamOpen] = useState(false);
  const [updatingExam, setUpdatingExam] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingExamSubjectId, setEditingExamSubjectId] = useState<string>("");

  // Scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY || document.documentElement.scrollTop;
      setShowScrollTop(scrolled > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Result editing
  const [editingResults, setEditingResults] = useState<{[studentId: string]: ExamResultUpdate}>({});
  const [savingResults, setSavingResults] = useState<{[studentId: string]: boolean}>({});
  const saveTimeouts = useRef<{[studentId: string]: NodeJS.Timeout}>({});

  useEffect(() => {
    loadExams();
    loadSubjectTopics();
    loadExamTemplates();
    loadSchoolSubjects();
  }, [groupId]);

  useEffect(() => {
    if (selectedExam) {
      loadExamDetails();
    }
  }, [selectedExam]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await api.getExams(groupId);
      setExams(data);
    } catch (error) {
      console.error("Failed to load exams:", error);
      toast.error("Ошибка при загрузке экзаменов");
    } finally {
      setLoading(false);
    }
  };

  const loadExamTemplates = async () => {
    try {
      const data = await api.getExamTemplates();
      setExamTemplates(data);
    } catch (error) {
      console.error("Failed to load exam templates:", error);
    }
  };

  const loadSchoolSubjects = async () => {
    try {
      // Load all subjects (they are global, not school-specific)
      const subjects = await api.getSubjects();
      setSchoolSubjects(subjects);
    } catch (error) {
      console.error("Failed to load school subjects:", error);
    }
  };

  const loadSubjectTopics = async () => {
    try {
      // Load group to get subject_id
      const group = await api.getGroup(groupId);
      if (!group.subject?.id) return;

      // Load subject details
      const subjectData = await api.request<Subject>(`/subjects/${group.subject.id}`, {});
      setSubject(subjectData);

      // Parse topics into taskNumber -> topics mapping
      if (subjectData.topics && Array.isArray(subjectData.topics)) {
        const topicsMap: { [taskNumber: number]: string[] } = {};

        subjectData.topics.forEach((topicConfig) => {
          if (topicConfig.taskNumbers && Array.isArray(topicConfig.taskNumbers)) {
            topicConfig.taskNumbers.forEach((taskNum: number) => {
              if (!topicsMap[taskNum]) {
                topicsMap[taskNum] = [];
              }
              topicsMap[taskNum].push(topicConfig.topic);
            });
          }
        });

        setTaskTopicsFromSubject(topicsMap);
      }
    } catch (error) {
      console.error("Failed to load subject topics:", error);
      // Don't show error to user, topics are optional
    }
  };

  const loadExamDetails = async () => {
    if (!selectedExam) return;

    try {
      setLoadingResults(true);
      const [groupData, results] = await Promise.all([
        api.getGroup(groupId),
        api.getExamResults(selectedExam.id),
      ]);

      // Merge students with their results
      const studentsWithResults: StudentWithResult[] = groupData.students.map((student) => {
        const result = results.find((r) => r.student_id === student.id);
        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          result,
        };
      });

      setStudents(studentsWithResults);
      setExamResults(results);
    } catch (error) {
      console.error("Failed to load exam details:", error);
      toast.error("Ошибка при загрузке деталей экзамена");
    } finally {
      setLoadingResults(false);
    }
  };

  const handleTaskToggle = (taskNumber: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskNumber)
        ? prev.filter((t) => t !== taskNumber)
        : [...prev, taskNumber]
    );
  };

  const handleTopicChange = (taskNumber: number, topic: string) => {
    setTaskTopics((prev) => {
      const topics = taskTopicsFromSubject[taskNumber] || [];
      if (topics.length === 1) {
        return { ...prev, [taskNumber]: [topics[0]] };
      }
      const currentTopics = prev[taskNumber] || [];
      const isSelected = currentTopics.includes(topic);

      if (isSelected) {
        return { ...prev, [taskNumber]: currentTopics.filter(t => t !== topic) };
      } else {
        return { ...prev, [taskNumber]: [...currentTopics, topic] };
      }
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "custom") {
      // Reset form if "Создать с нуля" selected
      setExamTitle("");
      setExamDifficulty("");
      setExamComment("");
      setSelectedTasks([]);
      setTaskTopics({});
      return;
    }

    const template = examTemplates.find((t) => t.id === templateId);
    if (template) {
      setExamTitle(template.title);
      setExamDifficulty(template.difficulty || "");
      setExamComment(template.comment || "");
      setSelectedTasks(template.selected_tasks || []);
      setTaskTopics(template.task_topics || {});
    }
  };

  const handleCreateExam = async () => {
    if (!examTitle.trim()) {
      toast.error("Введите название экзамена");
      return;
    }

    try {
      setCreatingExam(true);

      // If a template is selected, use the API endpoint to create from template
      if (selectedTemplate && selectedTemplate !== "custom") {
        await api.createExamFromTemplate(selectedTemplate, groupId);
        toast.success("Экзамен создан из шаблона");
      } else {
        const examData: ExamCreate = {
          group_id: groupId,
          title: examTitle,
          subject: groupSubject,
          difficulty: examDifficulty || undefined,
          selected_tasks: selectedTasks.length > 0 ? selectedTasks : undefined,
          task_topics: Object.keys(taskTopics).length > 0 ? taskTopics : undefined,
          comment: examComment || undefined,
        };

        await api.createExam(examData);
        toast.success("Экзамен успешно создан");
      }

      // Reset form
      setIsAddExamOpen(false);
      setSelectedTemplate("custom");
      setExamTitle("");
      setExamDifficulty("");
      setExamComment("");
      setSelectedTasks([]);
      setTaskTopics({});

      // Reload exams
      await loadExams();
    } catch (error) {
      console.error("Failed to create exam:", error);
      toast.error("Ошибка при создании экзамена");
    } finally {
      setCreatingExam(false);
    }
  };

  const handleOpenEditExam = (exam?: Exam) => {
    const examToEdit = exam || selectedExam;
    if (!examToEdit) return;

    // Set editing exam
    setEditingExam(examToEdit);

    // Fill form with current exam data
    setExamTitle(examToEdit.title);
    setExamDifficulty(examToEdit.difficulty || "");
    setExamComment(examToEdit.comment || "");
    setSelectedTasks(examToEdit.selected_tasks || []);
    setTaskTopics(examToEdit.task_topics || {});
    setEditingExamSubjectId(examToEdit.subject_rel?.id || examToEdit.subject_id || "");
    setIsEditExamOpen(true);
  };

  const handleUpdateExam = async () => {
    if (!editingExam || !examTitle.trim()) {
      toast.error("Введите название экзамена");
      return;
    }

    try {
      setUpdatingExam(true);

      const examData = {
        title: examTitle,
        difficulty: examDifficulty || undefined,
        selected_tasks: selectedTasks.length > 0 ? selectedTasks : undefined,
        task_topics: Object.keys(taskTopics).length > 0 ? taskTopics : undefined,
        comment: examComment || undefined,
        subject_id: editingExamSubjectId || undefined,
      };

      await api.updateExam(editingExam.id, examData);
      toast.success("Экзамен успешно обновлен");

      // Update selectedExam if it's the same exam
      if (selectedExam?.id === editingExam.id) {
        setSelectedExam({ ...editingExam, ...examData });
      }

      // Reset form
      setIsEditExamOpen(false);
      setEditingExam(null);
      setExamTitle("");
      setExamDifficulty("");
      setExamComment("");
      setSelectedTasks([]);
      setTaskTopics({});
      setEditingExamSubjectId("");

      // Reload exams
      await loadExams();
    } catch (error) {
      console.error("Failed to update exam:", error);
      toast.error("Ошибка при обновлении экзамена");
    } finally {
      setUpdatingExam(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam || !confirm("Вы уверены, что хотите удалить этот экзамен? Все результаты студентов также будут удалены.")) {
      return;
    }

    try {
      await api.deleteExam(selectedExam.id);
      toast.success("Экзамен удален");
      setSelectedExam(null);
      await loadExams();
    } catch (error) {
      console.error("Failed to delete exam:", error);
      toast.error("Ошибка при удалении экзамена");
    }
  };

  const handleAddStudentResult = async (studentId: string) => {
    if (!selectedExam) return;

    try {
      const taskCount = subject?.tasks?.length || 27;
      const resultData: ExamResultCreate = {
        student_id: studentId,
        primary_score: 0,
        final_score: 0,
        answers: Array(taskCount).fill(null),
        task_comments: {},
        student_comment: "",
      };

      await api.createExamResult(selectedExam.id, resultData);
      toast.success("Результат добавлен");
      await loadExamDetails();
    } catch (error) {
      console.error("Failed to add result:", error);
      toast.error("Ошибка при добавлении результата");
    }
  };

  const handleUpdateResult = async (studentId: string, resultId: string, updates: ExamResultUpdate) => {
    if (!selectedExam) return;

    try {
      setSavingResults((prev) => ({ ...prev, [studentId]: true }));
      await api.updateExamResult(selectedExam.id, resultId, updates);

      // Update local state without reloading
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === studentId && s.result) {
            return {
              ...s,
              result: {
                ...s.result,
                ...updates,
              },
            };
          }
          return s;
        })
      );

      // Update editing state to match saved values instead of clearing
      setEditingResults((prev) => ({
        ...prev,
        [studentId]: updates,
      }));

      // Hide success indicator after delay
      setTimeout(() => {
        setSavingResults((prev) => ({ ...prev, [studentId]: false }));
      }, 1000);
    } catch (error) {
      console.error("Failed to update result:", error);
      toast.error("Ошибка при сохранении");
      setSavingResults((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const autoSaveResult = useCallback((studentId: string, resultId: string, updates: ExamResultUpdate) => {
    // Clear existing timeout
    if (saveTimeouts.current[studentId]) {
      clearTimeout(saveTimeouts.current[studentId]);
    }

    // Set new timeout for auto-save (500ms delay)
    saveTimeouts.current[studentId] = setTimeout(() => {
      handleUpdateResult(studentId, resultId, updates);
    }, 500);
  }, [selectedExam]);

  const handleDeleteResult = async (resultId: string) => {
    if (!selectedExam || !confirm("Удалить результат экзамена?")) return;

    try {
      await api.deleteExamResult(selectedExam.id, resultId);
      toast.success("Результат удален");
      await loadExamDetails();
    } catch (error) {
      console.error("Failed to delete result:", error);
      toast.error("Ошибка при удалении результата");
    }
  };

  const calculateScores = (answers: (number | null)[]) => {
    const primaryScore = answers.reduce((sum, answer) => sum + (answer || 0), 0);

    let finalScore = 0;

    // Use scale from subject if available
    if (subject) {
      // For ЕГЭ: use primary_to_secondary_scale
      if (subject.exam_type === 'ЕГЭ' && subject.primary_to_secondary_scale && Array.isArray(subject.primary_to_secondary_scale)) {
        const scale = subject.primary_to_secondary_scale;
        // Get final score from scale array (index = primary score, value = final score)
        if (primaryScore >= 0 && primaryScore < scale.length) {
          finalScore = scale[primaryScore];
        } else {
          // If primary score is out of range, use last value
          finalScore = scale[scale.length - 1] || 0;
        }
        console.log('Using ЕГЭ scale:', { primaryScore, finalScore });
      }
      // For ОГЭ: use grade_scale to get grade (2-5)
      else if (subject.exam_type === 'ОГЭ' && subject.grade_scale && Array.isArray(subject.grade_scale)) {
        // Find which grade range the primary score falls into
        for (const gradeRange of subject.grade_scale) {
          if (primaryScore >= gradeRange.min && primaryScore <= gradeRange.max) {
            finalScore = gradeRange.grade;
            break;
          }
        }
        console.log('Using ОГЭ grade scale:', { primaryScore, grade: finalScore });
      } else {
        // Fallback
        finalScore = Math.min(100, Math.round(primaryScore * 3.7));
        console.log('Using fallback calculation:', { primaryScore, finalScore });
      }
    } else {
      // Fallback: use simple conversion if subject not configured
      finalScore = Math.min(100, Math.round(primaryScore * 3.7));
      console.log('Using fallback calculation (no subject):', { primaryScore, finalScore });
    }

    return { primaryScore, finalScore };
  };

  const updateEditingResult = (studentId: string, resultId: string, field: keyof ExamResultUpdate, value: any) => {
    const student = students.find((s) => s.id === studentId);
    if (!student?.result) return;

    let updates: ExamResultUpdate = {
      ...(editingResults[studentId] || {}),
      [field]: value,
    };

    // If answers changed, recalculate scores
    if (field === "answers") {
      const { primaryScore, finalScore } = calculateScores(value);
      updates.primary_score = primaryScore;
      updates.final_score = finalScore;
    }

    setEditingResults((prev) => ({
      ...prev,
      [studentId]: updates,
    }));

    // Trigger auto-save
    autoSaveResult(studentId, resultId, updates);
  };

  const calculateStats = () => {
    if (examResults.length === 0) {
      return {
        averagePrimaryScore: 0,
        averageFinalScore: 0,
        passedThreshold: 0,
        topErrorTasks: [],
      };
    }

    const totalPrimary = examResults.reduce((sum, r) => sum + r.primary_score, 0);
    const totalFinal = examResults.reduce((sum, r) => sum + r.final_score, 0);
    const averagePrimaryScore = totalPrimary / examResults.length;
    const averageFinalScore = totalFinal / examResults.length;

    // Calculate threshold pass rate (assuming threshold is 40 for final score)
    const passedCount = examResults.filter((r) => r.final_score >= 40).length;
    const passedThreshold = (passedCount / examResults.length) * 100;

    return {
      averagePrimaryScore: Math.round(averagePrimaryScore * 10) / 10,
      averageFinalScore: Math.round(averageFinalScore * 10) / 10,
      passedThreshold: Math.round(passedThreshold),
      topErrorTasks: [],
    };
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU");
  };

  // Show exam details
  if (selectedExam) {
    const stats = calculateStats();

    return (
      <div className="space-y-3">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedExam(null)}
            className="h-8"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          <div className="text-center flex-1">
            <h2 className="font-semibold text-lg">{selectedExam.title}</h2>
            <p className="text-sm text-slate-600">{selectedExam.subject}</p>
            {selectedExam.created_at && (
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <User className="w-3 h-3" />
                Создан: {formatDateTime(selectedExam.created_at)}
              </p>
            )}
          </div>
          <div className="w-20"></div>
        </div>

        {/* Compact Statistics */}
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600">
                  {stats.averageFinalScore}
                </p>
                <p className="text-xs text-slate-600">
                  {subject?.exam_type === 'ОГЭ' ? 'Средняя оценка' : 'Средний балл'}
                </p>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-green-600">
                  {stats.passedThreshold}%
                </p>
                <p className="text-xs text-slate-600">Прошли порог</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-slate-700">
                  {examResults.length}/{students.length}
                </p>
                <p className="text-xs text-slate-600">Результатов</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-purple-600">
                  {stats.averagePrimaryScore}
                </p>
                <p className="text-xs text-slate-600">
                  {subject?.exam_type === 'ОГЭ' ? 'Средний первичный' : 'Первичный балл'}
                </p>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-slate-700">
                  {selectedExam.selected_tasks?.length || 0}/{subject?.tasks?.length || 27}
                </p>
                <p className="text-xs text-slate-600">Заданий</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingResults ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">
              Результаты студентов
            </h3>
            {students.map((student) => {
              const fullName = `${student.first_name} ${student.last_name}`;
              const result = student.result;
              const hasResult = !!result;

              // Calculate current scores based on current answers (either from editing or saved result)
              const currentAnswers = editingResults[student.id]?.answers || result?.answers || Array(27).fill(null);
              const { primaryScore, finalScore } = hasResult ? calculateScores(currentAnswers) : { primaryScore: 0, finalScore: 0 };

              console.log(`Student ${fullName}:`, {
                hasResult,
                primaryScore,
                finalScore,
                answersLength: currentAnswers?.length,
                hasEditingAnswers: !!editingResults[student.id]?.answers,
                hasResultAnswers: !!result?.answers
              });

              return (
                <Card key={student.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{fullName}</h4>
                      <div className="flex items-center gap-2">
                        {hasResult ? (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              {subject?.exam_type === 'ОГЭ' ? 'Первичный:' : 'Первичный:'} {primaryScore}
                            </Badge>
                            <Badge className={subject?.exam_type === 'ОГЭ' ? 'bg-green-600 text-xs' : 'bg-blue-600 text-xs'}>
                              {subject?.exam_type === 'ОГЭ' ? 'Оценка:' : 'Итоговый:'} {finalScore}
                            </Badge>
                            {savingResults[student.id] && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Сохранение...
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteResult(result.id)}
                            >
                              Удалить
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddStudentResult(student.id)}
                            className="h-7 text-xs"
                          >
                            + Добавить результат
                          </Button>
                        )}
                      </div>
                    </div>

                    {hasResult && (
                      <>
                        {/* Task Score Grid */}
                        <div className="mb-3">
                          <Label className="text-xs mb-2 block">Баллы по заданиям</Label>
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(50px,1fr))] gap-1">
                            {(() => {
                              const taskCount = subject?.tasks?.length || 27;
                              const currentAnswers = result.answers || Array(taskCount).fill(null);
                              return currentAnswers.map((answer: number | null, index: number) => {
                                const task = subject?.tasks?.[index];
                                const taskLabel = task?.label || (index + 1).toString();
                                const taskMaxScore = task?.maxScore || 1;

                                return (
                                  <div key={index} className="flex flex-col">
                                    <div className="bg-slate-100 border border-slate-300 text-xs font-medium text-slate-700 px-2 py-1 text-center">
                                      {taskLabel}
                                    </div>
                                    <input
                                      type="text"
                                      value={
                                        editingResults[student.id]?.answers?.[index] !== undefined
                                          ? editingResults[student.id].answers![index] ?? ""
                                          : answer ?? ""
                                      }
                                      onChange={(e) => {
                                        const currentAnswersForEdit = editingResults[student.id]?.answers || result.answers || Array(taskCount).fill(null);
                                        const newAnswers = [...currentAnswersForEdit];
                                        const value = e.target.value;
                                        const numValue = value === "" ? null : parseInt(value);
                                        // Validate max score
                                        if (numValue !== null && numValue > taskMaxScore) {
                                          newAnswers[index] = taskMaxScore;
                                        } else {
                                          newAnswers[index] = numValue;
                                        }
                                        updateEditingResult(student.id, result.id, "answers", newAnswers);
                                      }}
                                      placeholder="—"
                                      title={`Максимум: ${taskMaxScore}`}
                                      className="w-full h-9 text-center text-sm border border-slate-300 border-t-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white"
                                    />
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Student Comment */}
                        <div className="space-y-1">
                          <Label className="text-xs">Комментарий по результатам</Label>
                          <Textarea
                            value={editingResults[student.id]?.student_comment ?? (result.student_comment || "")}
                            onChange={(e) =>
                              updateEditingResult(student.id, result.id, "student_comment", e.target.value)
                            }
                            placeholder="Добавить комментарий..."
                            className="min-h-[60px] text-sm resize-none"
                          />
                        </div>

                        {result.added_at && (
                          <p className="text-xs text-slate-500 mt-2">
                            Добавлен: {formatDateTime(result.added_at)}
                            {result.updated_at && ` • Обновлен: ${formatDateTime(result.updated_at)}`}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Show exam list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Экзамены</h2>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsAddExamOpen(true)}>
          + Добавить экзамен
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Экзамены пока не добавлены</p>
            <Button onClick={() => setIsAddExamOpen(true)} className="bg-green-600 hover:bg-green-700">
              Добавить первый экзамен
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group relative"
              onClick={() => setSelectedExam(exam)}
            >
              <CardHeader className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex-1">{exam.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenEditExam(exam);
                      }}
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("Вы уверены, что хотите удалить этот экзамен? Все результаты студентов также будут удалены.")) {
                          api.deleteExam(exam.id).then(() => {
                            toast.success("Экзамен удален");
                            loadExams();
                          }).catch((error) => {
                            console.error("Failed to delete exam:", error);
                            toast.error("Ошибка при удалении экзамена");
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Задания</span>
                    <span className="text-sm font-medium">{exam.selected_tasks?.length || 0}/{subject?.tasks?.length || 27}</span>
                  </div>
                  {exam.difficulty && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Сложность</span>
                      <Badge variant="secondary" className="text-xs">{exam.difficulty}</Badge>
                    </div>
                  )}
                </div>

                {exam.comment && (
                  <p className="text-xs text-slate-500 line-clamp-2">{exam.comment}</p>
                )}

                {exam.created_at && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {formatDateTime(exam.created_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Exam Dialog */}
      <Dialog open={isEditExamOpen} onOpenChange={setIsEditExamOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать экзамен</DialogTitle>
            <DialogDescription>
              Измените данные экзамена и выбранные задания
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Название экзамена */}
            <div className="space-y-2">
              <Label htmlFor="editExamTitle" className="text-sm font-medium">
                Название экзамена <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="editExamTitle"
                  placeholder="Введите название экзамена"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="flex-1"
                />
                {examTemplates.length > 0 && (
                  <Select
                    value=""
                    onValueChange={(templateId) => {
                      const template = examTemplates.find(t => t.id === templateId);
                      if (template) {
                        setExamTitle(template.title);
                        setExamDifficulty(template.difficulty || "");
                        setExamComment(template.comment || "");
                        setSelectedTasks(template.selected_tasks || []);
                        setTaskTopics(template.task_topics || {});
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Из школы" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Предмет */}
            <div className="space-y-2">
              <Label htmlFor="editExamSubject" className="text-sm font-medium">
                Предмет
              </Label>
              <Select value={editingExamSubjectId} onValueChange={setEditingExamSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {schoolSubjects.map((subj) => (
                    <SelectItem key={subj.id} value={subj.id}>
                      {subj.name}
                      {subj.exam_type && ` [${subj.exam_type}]`}
                      {subj.code && ` (${subj.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Уровень сложности */}
            <div className="space-y-2">
              <Label htmlFor="editExamDifficulty" className="text-sm font-medium">
                Уровень сложности
              </Label>
              <Select value={examDifficulty} onValueChange={setExamDifficulty}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите уровень сложности" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Уровень ЕГЭ 2026">Уровень ЕГЭ 2026</SelectItem>
                  <SelectItem value="Сложность выше уровня ЕГЭ">Сложность выше уровня ЕГЭ</SelectItem>
                  <SelectItem value="Гробовой вариант">Гробовой вариант</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Комментарий */}
            <div className="space-y-2">
              <Label htmlFor="editExamComment" className="text-sm font-medium">
                Комментарий по экзамену
              </Label>
              <Textarea
                id="editExamComment"
                placeholder="Добавьте комментарий или примечание к экзамену..."
                value={examComment}
                onChange={(e) => setExamComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Выбор заданий */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Выбор пройденных заданий
              </Label>
              {Object.keys(taskTopicsFromSubject).length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  ℹ️ Темы для заданий не настроены в предмете. Перейдите в "Школа" → "Предметы" → "Редактировать" для настройки тем.
                </p>
              )}
              <div className="border rounded-lg p-4 bg-slate-50 max-h-[300px] overflow-y-auto">
                <div className="space-y-3">
                  {(subject?.tasks || Array.from({ length: 27 }, (_, i) => ({ label: String(i + 1), maxScore: 1 }))).map((task, index) => {
                    const taskNumber = index + 1;
                    const isSelected = selectedTasks.includes(taskNumber);
                    const topics = taskTopicsFromSubject[taskNumber] || [];
                    const selectedTopics = taskTopics[taskNumber] || [];

                    return (
                      <div key={taskNumber} className="flex items-start gap-3">
                        <div
                          onClick={() => handleTaskToggle(taskNumber)}
                          className={cn(
                            "flex items-center justify-center min-w-[50px] h-9 rounded-md cursor-pointer transition-all border-2",
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                          )}
                        >
                          <span className="text-sm font-medium">{task.label}</span>
                        </div>

                        <div className="flex-1 flex flex-wrap gap-2 items-center min-h-[36px]">
                          {topics.map((topic) => {
                            const isTopicSelected = selectedTopics.includes(topic);
                            return (
                              <Badge
                                key={topic}
                                variant={isTopicSelected ? "default" : "secondary"}
                                className={cn(
                                  "cursor-pointer transition-all",
                                  isTopicSelected
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "hover:bg-slate-300"
                                )}
                                onClick={() => handleTopicChange(taskNumber, topic)}
                              >
                                {topic}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Выбрано заданий: {selectedTasks.length} из 27
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditExamOpen(false);
                setSelectedTasks([]);
                setTaskTopics({});
                setExamTitle("");
                setExamDifficulty("");
                setExamComment("");
                setEditingExamSubjectId("");
              }}
              disabled={updatingExam}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateExam}
              disabled={updatingExam || !examTitle.trim()}
            >
              {updatingExam ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exam Dialog */}
      <Dialog open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить экзамен</DialogTitle>
            <DialogDescription>
              Заполните данные нового экзамена и выберите задания
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Выбор шаблона */}
            <div className="space-y-2">
              <Label htmlFor="examTemplate" className="text-sm font-medium">
                Выбрать шаблон экзамена
              </Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Создать экзамен с нуля" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Создать с нуля</SelectItem>
                  {examTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                      {template.subject && ` (${template.subject})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && selectedTemplate !== "custom" && (
                <p className="text-xs text-blue-600">
                  Поля заполнены из шаблона. Вы можете их редактировать.
                </p>
              )}
            </div>

            {/* Название экзамена */}
            <div className="space-y-2">
              <Label htmlFor="examTitle" className="text-sm font-medium">
                Название экзамена <span className="text-red-500">*</span>
              </Label>
              <Input
                id="examTitle"
                placeholder="Введите название экзамена"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Предмет */}
            <div className="space-y-2">
              <Label htmlFor="examSubject" className="text-sm font-medium">
                Предмет
              </Label>
              <Input
                id="examSubject"
                value={subject ? `${subject.name}${subject.code ? ` (${subject.code})` : ''}` : groupSubject}
                className="w-full bg-slate-100"
                readOnly
                disabled
              />
            </div>

            {/* Уровень сложности */}
            <div className="space-y-2">
              <Label htmlFor="examDifficulty" className="text-sm font-medium">
                Уровень сложности
              </Label>
              <Select value={examDifficulty} onValueChange={setExamDifficulty}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите уровень сложности" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Уровень ЕГЭ 2026">Уровень ЕГЭ 2026</SelectItem>
                  <SelectItem value="Сложность выше уровня ЕГЭ">Сложность выше уровня ЕГЭ</SelectItem>
                  <SelectItem value="Гробовой вариант">Гробовой вариант</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Комментарий */}
            <div className="space-y-2">
              <Label htmlFor="examComment" className="text-sm font-medium">
                Комментарий по экзамену
              </Label>
              <Textarea
                id="examComment"
                placeholder="Добавьте комментарий или примечание к экзамену..."
                value={examComment}
                onChange={(e) => setExamComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Выбор заданий */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Выбор пройденных заданий
              </Label>
              {Object.keys(taskTopicsFromSubject).length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  ℹ️ Темы для заданий не настроены в предмете. Перейдите в "Школа" → "Предметы" → "Редактировать" для настройки тем.
                </p>
              )}
              <div className="border rounded-lg p-4 bg-slate-50 max-h-[300px] overflow-y-auto">
                <div className="space-y-3">
                  {(subject?.tasks || Array.from({ length: 27 }, (_, i) => ({ label: String(i + 1), maxScore: 1 }))).map((task, index) => {
                    const taskNumber = index + 1;
                    const isSelected = selectedTasks.includes(taskNumber);
                    const topics = taskTopicsFromSubject[taskNumber] || [];
                    const selectedTopics = taskTopics[taskNumber] || [];

                    return (
                      <div key={taskNumber} className="flex items-start gap-3">
                        <div
                          onClick={() => handleTaskToggle(taskNumber)}
                          className={cn(
                            "flex items-center justify-center min-w-[50px] h-9 rounded-md cursor-pointer transition-all border-2",
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                          )}
                        >
                          <span className="text-sm font-medium">{task.label}</span>
                        </div>

                        <div className="flex-1 flex flex-wrap gap-2 items-center min-h-[36px]">
                          {topics.map((topic) => {
                            const isTopicSelected = selectedTopics.includes(topic);
                            return (
                              <Badge
                                key={topic}
                                variant={isTopicSelected ? "default" : "secondary"}
                                className={cn(
                                  "cursor-pointer transition-all",
                                  isTopicSelected
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "hover:bg-slate-300"
                                )}
                                onClick={() => handleTopicChange(taskNumber, topic)}
                              >
                                {topic}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Выбрано заданий: {selectedTasks.length} из 27
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddExamOpen(false);
                setSelectedTemplate("custom");
                setSelectedTasks([]);
                setTaskTopics({});
                setExamTitle("");
                setExamDifficulty("");
                setExamComment("");
              }}
              disabled={creatingExam}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateExam}
              disabled={creatingExam || !examTitle.trim()}
            >
              {creatingExam ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать экзамен"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scroll to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </div>
  );
}
