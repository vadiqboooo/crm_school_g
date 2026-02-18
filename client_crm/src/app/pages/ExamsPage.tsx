import { useState, useEffect, Fragment } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Search,
  FileText,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Exam, ExamResult, Student, Subject, User } from "../types/api";

interface StudentWithResults {
  student: Student;
  results: Array<ExamResult & { exam: Exam }>;
}

export function ExamsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [examTemplates, setExamTemplates] = useState<Exam[]>([]);
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<{
    comment: string;
    studentName: string;
    examTitle: string;
  } | null>(null);
  const [isAddResultDialogOpen, setIsAddResultDialogOpen] = useState(false);
  const [isEditResultDialogOpen, setIsEditResultDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ExamResult | null>(null);
  const [editResultSubjectId, setEditResultSubjectId] = useState<string>("");
  const [editResultTeacherId, setEditResultTeacherId] = useState<string>("");

  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [answers, setAnswers] = useState<(number | null)[]>(Array(27).fill(null));
  const [studentComment, setStudentComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsData, studentsData, subjectsData, templatesData, allResultsData, teachersData] = await Promise.all([
        api.getExams(),
        api.getStudents(),
        api.getSubjects(),
        api.getExamTemplates(),
        api.getAllExamResults(), // Один запрос вместо N запросов
        api.getEmployees(),
      ]);

      // Фильтруем только не-шаблоны для отображения
      const nonTemplates = examsData.filter(exam => !exam.is_template);
      setExams(nonTemplates);
      setExamTemplates(templatesData);
      setStudents(studentsData);
      setSubjects(subjectsData.filter(s => s.is_active));
      setTeachers(teachersData.filter(t => t.role === "teacher"));

      // Прикрепляем информацию об экзамене к каждому результату
      const resultsWithExam = allResultsData.map(result => {
        const exam = examsData.find(e => e.id === result.exam_id);
        return {
          ...result,
          exam: exam || null,
        };
      });

      setAllResults(resultsWithExam as any);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Группируем результаты по студентам
  const studentsWithResults: StudentWithResults[] = students.map(student => {
    const studentResults = allResults.filter(r => r.student_id === student.id);
    return {
      student,
      results: studentResults as Array<ExamResult & { exam: Exam }>,
    };
  }).filter(item => item.results.length > 0); // Показываем только студентов с результатами

  const filteredStudents = studentsWithResults
    .map((item) => {
      // Filter results by active filters
      let filteredResults = item.results;

      // Filter by subject
      if (filterSubject !== "all") {
        filteredResults = filteredResults.filter(r => {
          const exam = exams.find(e => e.id === r.exam_id) || r.exam;
          return exam?.subject_id === filterSubject;
        });
      }

      // Filter by teacher (only for admins)
      if (isAdmin && filterTeacher !== "all") {
        if (filterTeacher === "none") {
          // Show results without teacher
          filteredResults = filteredResults.filter(r => !r.added_by_employee);
        } else {
          // Show results by specific teacher
          filteredResults = filteredResults.filter(r => r.added_by_employee?.id === filterTeacher);
        }
      }

      return {
        ...item,
        results: filteredResults,
      };
    })
    .filter((item) => {
      // Filter by search query
      const fullName = `${item.student.last_name} ${item.student.first_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());

      // Only show students that have at least one result matching filters
      return matchesSearch && item.results.length > 0;
    });

  // Подсчитываем количество работ из отфильтрованных результатов
  const filteredResultsFlat = filteredStudents.flatMap(item => item.results);
  const worksCount = filteredResultsFlat.length;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handle subject selection - initialize answers array based on subject's task count
  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects.find(s => s.id === subjectId);
    const taskCount = subject?.tasks?.length || 27;
    setAnswers(Array(taskCount).fill(null));
  };

  // Filter students by search query
  const filteredStudentsForSearch = students.filter(student => {
    const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
    return fullName.includes(studentSearchQuery.toLowerCase());
  });

  // Get templates for selected subject
  const templatesForSubject = selectedSubjectId
    ? examTemplates.filter(t => {
        // If template has no subject, show it for all subjects
        if (!t.subject_id) return true;
        // Otherwise match by subject id
        return t.subject_id === selectedSubjectId;
      })
    : [];

  // Helper function to calculate scores
  const calculateScores = (answersArray: (number | null)[], subject?: Subject) => {
    const primary = answersArray.reduce((sum, score) => sum + (score || 0), 0);

    if (!subject) {
      console.log('No subject provided, using primary as final:', { primary });
      return { primary, final: primary };
    }

    // Convert primary score to final score using subject's conversion scale or grade scale
    let final = primary;

    // For ЕГЭ: use primary_to_secondary_scale
    if (subject.exam_type === 'ЕГЭ' && subject.primary_to_secondary_scale && Array.isArray(subject.primary_to_secondary_scale)) {
      const convertedScore = subject.primary_to_secondary_scale[primary];
      if (convertedScore !== undefined && convertedScore !== null) {
        final = convertedScore;
      }
      console.log('Using ЕГЭ scale:', { subjectName: subject.name, primary, final });
    }
    // For ОГЭ: use grade_scale to get grade (2-5)
    else if (subject.exam_type === 'ОГЭ' && subject.grade_scale && Array.isArray(subject.grade_scale)) {
      // Find which grade range the primary score falls into
      for (const gradeRange of subject.grade_scale) {
        if (primary >= gradeRange.min && primary <= gradeRange.max) {
          final = gradeRange.grade;
          break;
        }
      }
      console.log('Using ОГЭ grade scale:', { subjectName: subject.name, primary, grade: final });
    } else {
      console.log('No scale found for subject:', { subjectName: subject.name, hasScale: !!(subject.primary_to_secondary_scale || subject.grade_scale) });
    }

    return { primary, final };
  };

  const handleEditResult = (result: ExamResult & { exam: Exam }) => {
    setEditingResult(result);

    // Get exam to find subject_id
    const exam = exams.find(e => e.id === result.exam_id) || (result as any).exam;
    const subjectId = exam?.subject_id || exam?.subject_rel?.id || "";
    setEditResultSubjectId(subjectId);

    // Get subject from subjects list (this has the current configuration)
    const currentSubject = subjects.find(s => s.id === subjectId);
    const taskCount = currentSubject?.tasks?.length || 27;

    // Resize answers array to match current subject configuration
    const existingAnswers = result.answers || [];
    const resizedAnswers = Array(taskCount).fill(null).map((_, index) =>
      existingAnswers[index] !== undefined ? existingAnswers[index] : null
    );
    setAnswers(resizedAnswers);

    setStudentComment(result.student_comment || "");

    // Get current teacher who checked the work
    setEditResultTeacherId(result.added_by_employee?.id || "");

    setIsEditResultDialogOpen(true);
  };

  const handleUpdateResult = async () => {
    if (!editingResult) return;

    try {
      setIsSubmitting(true);

      const currentExam = exams.find(e => e.id === editingResult.exam_id) || (editingResult as any).exam;
      let examIdToUse = editingResult.exam_id;
      let newExamCreated: Exam | null = null;

      // Save current expanded student to restore after reload
      const currentExpandedStudent = expandedStudentId;

      // If subject changed, create a new exam instead of updating the existing one
      // This prevents affecting other students' results for the same exam
      if (editResultSubjectId && currentExam?.subject_id !== editResultSubjectId) {
        const selectedSubject = subjects.find(s => s.id === editResultSubjectId);

        // Create new exam with the new subject
        newExamCreated = await api.createExam({
          title: currentExam?.title || "Экзамен",
          subject: selectedSubject?.name,
          subject_id: editResultSubjectId,
          date: currentExam?.date,
          is_template: false,
          difficulty: currentExam?.difficulty,
          threshold_score: currentExam?.threshold_score,
          selected_tasks: currentExam?.selected_tasks,
          task_topics: currentExam?.task_topics,
        });

        examIdToUse = newExamCreated.id;

        // Delete the old result from the old exam
        await api.deleteExamResult(editingResult.exam_id, editingResult.id);
      }

      // Get subject for score calculation
      const examSubject = subjects.find(s => s.id === editResultSubjectId) || (editingResult as any).exam?.subject_rel;

      // Calculate scores from answers
      const { primary: calculatedPrimaryScore, final: calculatedFinalScore } = calculateScores(answers, examSubject);

      let updatedOrCreatedResult: ExamResult;

      // If subject changed, create new result; otherwise update existing
      if (examIdToUse !== editingResult.exam_id) {
        // Create new result (added_by will be set automatically to current user)
        updatedOrCreatedResult = await api.createExamResult(examIdToUse, {
          student_id: editingResult.student_id,
          primary_score: calculatedPrimaryScore,
          final_score: calculatedFinalScore,
          answers: answers,
          student_comment: studentComment || undefined,
        });

        // Admin can update added_by to any teacher or remove it (set to null)
        // Teachers can't change added_by when creating new results
        if (isAdmin) {
          updatedOrCreatedResult = await api.updateExamResult(examIdToUse, updatedOrCreatedResult.id, {
            added_by: editResultTeacherId || null,
          } as any);
        }
      } else {
        // Update the existing result
        // Admin can change added_by, teachers can only update if it's already theirs
        const updateData: any = {
          primary_score: calculatedPrimaryScore,
          final_score: calculatedFinalScore,
          answers: answers,
          student_comment: studentComment || undefined,
        };

        // Only update added_by if user is admin
        if (isAdmin) {
          updateData.added_by = editResultTeacherId || null;
        }

        updatedOrCreatedResult = await api.updateExamResult(editingResult.exam_id, editingResult.id, updateData);
      }

      // Update state locally instead of full reload for better UX
      if (newExamCreated) {
        // Add new exam to state
        setExams(prev => [...prev, newExamCreated!]);
      }

      // Update results in state
      setAllResults(prev => {
        // Remove old result if it was replaced
        const filtered = examIdToUse !== editingResult.exam_id
          ? prev.filter(r => r.id !== editingResult.id)
          : prev.filter(r => r.id !== editingResult.id);

        // Add/update the result
        const examForResult = newExamCreated || currentExam;
        return [
          ...filtered,
          { ...updatedOrCreatedResult, exam: examForResult } as any
        ];
      });

      // Restore expanded state
      setExpandedStudentId(currentExpandedStudent);

      // Reset form
      setIsEditResultDialogOpen(false);
      setEditingResult(null);
      setAnswers(Array(27).fill(null));
      setStudentComment("");
      setEditResultSubjectId("");
      setEditResultTeacherId("");
    } catch (error) {
      console.error("Failed to update result:", error);
      alert("Ошибка при обновлении результата");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResult = async (examId: string, resultId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот результат?")) {
      return;
    }

    try {
      await api.deleteExamResult(examId, resultId);

      // Remove only the specific result from state
      setAllResults(prevResults => prevResults.filter(r => r.id !== resultId));
    } catch (error) {
      console.error("Failed to delete result:", error);
      alert("Ошибка при удалении результата");
    }
  };

  const handleAddResult = async () => {
    if (!selectedSubjectId || !selectedTemplateId || !examDate || !selectedStudentId) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Get template
      const template = examTemplates.find(t => t.id === selectedTemplateId);
      if (!template) {
        alert("Шаблон экзамена не найден");
        return;
      }

      // Get selected subject
      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

      // Create exam from template
      const examData: any = {
        title: template.title,
        subject: selectedSubject?.name,
        subject_id: selectedSubject?.id,
        date: examDate,
        is_template: false,
        difficulty: template.difficulty,
        threshold_score: template.threshold_score,
        selected_tasks: template.selected_tasks,
        task_topics: template.task_topics,
      };

      const createdExam = await api.createExam(examData);

      // Calculate scores from answers using selected subject
      const { primary: calculatedPrimaryScore, final: calculatedFinalScore } = calculateScores(answers, selectedSubject);

      // Create the result
      const createdResult = await api.createExamResult(createdExam.id, {
        student_id: selectedStudentId,
        primary_score: calculatedPrimaryScore,
        final_score: calculatedFinalScore,
        answers: answers,
        student_comment: studentComment || undefined,
      });

      // Add the new result to state (only if it should be visible to the current user)
      const shouldAddToState = !isTeacher || createdResult.added_by_employee?.id === user?.id;
      if (shouldAddToState) {
        setAllResults(prevResults => [
          ...prevResults,
          { ...createdResult, exam: createdExam } as any
        ]);
      }

      // Add the new exam to the exams list if not already there
      setExams(prevExams => {
        const exists = prevExams.some(e => e.id === createdExam.id);
        if (!exists) {
          return [...prevExams, createdExam];
        }
        return prevExams;
      });

      // Reset form
      setIsAddResultDialogOpen(false);
      setSelectedSubjectId("");
      setSelectedTemplateId("");
      setExamDate("");
      setStudentSearchQuery("");
      setSelectedStudentId("");
      setAnswers(Array(27).fill(null));
      setStudentComment("");
    } catch (error) {
      console.error("Failed to add result:", error);
      alert("Ошибка при добавлении результата");
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-2xl font-semibold text-slate-900">Экзамены и пробники</h1>
          <p className="text-slate-600 mt-1">
            {isTeacher
              ? "Просмотр результатов работ, которые вы проверили"
              : "Просмотр результатов всех студентов"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-5 h-5" />
            <span>Работ: {worksCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <GraduationCap className="w-5 h-5" />
            <span>Студентов: {filteredStudents.length}</span>
          </div>
          <Button
            onClick={() => setIsAddResultDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить результат
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className={`grid grid-cols-1 gap-4 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            <div className={`relative ${isAdmin ? "md:col-span-2" : "md:col-span-2"}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Поиск по имени студента..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Все предметы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все предметы</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.exam_type && ` [${subject.exam_type}]`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Все преподаватели" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все преподаватели</SelectItem>
                  <SelectItem value="none">Без преподавателя</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.last_name} {teacher.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Студенты с результатами не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Студент</TableHead>
                    <TableHead>Класс</TableHead>
                    <TableHead>Количество работ</TableHead>
                    <TableHead>Последний экзамен</TableHead>
                    <TableHead>Средний результат</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(({ student, results }) => {
                    const isExpanded = expandedStudentId === student.id;
                    const avgScore = results.length > 0
                      ? (results.reduce((sum, r) => sum + r.final_score, 0) / results.length).toFixed(1)
                      : "0";
                    const lastExam = results.sort((a, b) => {
                      const dateA = a.exam?.date ? new Date(a.exam.date).getTime() : 0;
                      const dateB = b.exam?.date ? new Date(b.exam.date).getTime() : 0;
                      return dateB - dateA;
                    })[0];

                    return (
                      <Fragment key={student.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleStudentExpand(student.id)}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStudentExpand(student.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                {student.last_name.charAt(0)}
                                {student.first_name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-900">
                                {student.last_name} {student.first_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.class_number ? (
                              <span className="text-slate-600">{student.class_number} класс</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {results.length} {results.length === 1 ? "работа" : results.length < 5 ? "работы" : "работ"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lastExam?.exam ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">{lastExam.exam.title}</span>
                                <span className="text-xs text-slate-500">
                                  {formatDate(lastExam.exam.date)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 font-mono">
                              {avgScore}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row - Student's Exams */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50 p-0">
                              <div className="p-6">
                                <h4 className="font-semibold mb-4 text-slate-900">
                                  Работы студента
                                </h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-white">
                                      <TableHead>№</TableHead>
                                      <TableHead>Экзамен</TableHead>
                                      <TableHead>Предмет</TableHead>
                                      <TableHead>Дата</TableHead>
                                      <TableHead>Первичный балл</TableHead>
                                      <TableHead>Результат</TableHead>
                                      <TableHead>Проверил</TableHead>
                                      <TableHead>Комментарий</TableHead>
                                      <TableHead>Действия</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {results.map((result, index) => {
                                      // Find the exam for this result from loaded exams
                                      const resultExam = exams.find(e => e.id === result.exam_id) || (result as any).exam;

                                      // Calculate scores dynamically from answers
                                      const resultAnswers = result.answers || Array(27).fill(null);

                                      console.log('Result data:', {
                                        hasExam: !!resultExam,
                                        examSubject: resultExam?.subject_rel,
                                        examTitle: resultExam?.title,
                                        examId: result.exam_id
                                      });

                                      const { primary: calculatedPrimary, final: calculatedFinal } = calculateScores(resultAnswers, resultExam?.subject_rel);

                                      return (
                                        <TableRow key={result.id} className="bg-white">
                                          <TableCell className="font-medium">
                                            {index + 1}
                                          </TableCell>
                                          <TableCell>
                                            <span className="font-medium text-slate-900">
                                              {result.exam?.title || "Неизвестно"}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            {resultExam?.subject_rel ? (
                                              <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-100 text-blue-800">
                                                  {resultExam.subject_rel.name}
                                                </Badge>
                                                {resultExam.subject_rel.exam_type && (
                                                  <Badge variant="outline" className={resultExam.subject_rel.exam_type === 'ЕГЭ' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}>
                                                    {resultExam.subject_rel.exam_type}
                                                  </Badge>
                                                )}
                                              </div>
                                            ) : resultExam?.subject ? (
                                              <Badge className="bg-blue-100 text-blue-800">
                                                {resultExam.subject}
                                              </Badge>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                              <Calendar className="w-3 h-3" />
                                              {formatDate(result.exam?.date)}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="font-mono">
                                              {calculatedPrimary}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {(() => {
                                              // Check exam type - prioritize subject_rel
                                              const examType = resultExam?.subject_rel?.exam_type;

                                              // Fallback: check exam title for ОГЭ/огэ if no subject_rel
                                              const examTitle = resultExam?.title || '';
                                              const isOGE = examType === 'ОГЭ' ||
                                                           (!examType && (examTitle.includes('ОГЭ') || examTitle.includes('огэ')));

                                              return isOGE ? (
                                                <div className="flex items-center gap-2">
                                                  <Badge className="bg-green-100 text-green-800 font-mono text-base px-3">
                                                    {calculatedFinal}
                                                  </Badge>
                                                  <span className="text-xs text-slate-500">оценка</span>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-2">
                                                  <Badge className="bg-blue-100 text-blue-800 font-mono">
                                                    {calculatedFinal}
                                                  </Badge>
                                                  <span className="text-xs text-slate-500">балл</span>
                                                </div>
                                              );
                                            })()}
                                          </TableCell>
                                        <TableCell>
                                          {result.added_by_employee ? (
                                            <span className="text-sm text-slate-600">
                                              {result.added_by_employee.last_name} {result.added_by_employee.first_name}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-slate-400">Не указан</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {result.student_comment ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedComment({
                                                  comment: result.student_comment!,
                                                  studentName: `${student.last_name} ${student.first_name}`,
                                                  examTitle: result.exam?.title || "Неизвестно",
                                                });
                                              }}
                                              className="text-sm text-slate-600 line-clamp-2 max-w-xs text-left hover:text-blue-600 transition-colors cursor-pointer"
                                            >
                                              {result.student_comment}
                                            </button>
                                          ) : (
                                            <span className="text-sm text-slate-400">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditResult(result);
                                              }}
                                              className="h-8 w-8 p-0"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteResult(result.exam_id!, result.id);
                                              }}
                                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Result Dialog */}
      <Dialog open={isEditResultDialogOpen} onOpenChange={setIsEditResultDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Редактировать результат
            </DialogTitle>
            <DialogDescription>
              Изменение результатов экзамена
            </DialogDescription>
          </DialogHeader>
          {editingResult && (
            <div className="space-y-1 text-sm text-slate-600 pb-4 border-b">
              <div><strong>Экзамен:</strong> {(editingResult as any).exam?.title}</div>
              <div><strong>Дата:</strong> {formatDate((editingResult as any).exam?.date)}</div>
            </div>
          )}
          <div className="space-y-4 mt-4">
            {/* Subject Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">
                Предмет
              </label>
              <Select
                value={editResultSubjectId}
                onValueChange={(subjectId) => {
                  setEditResultSubjectId(subjectId);
                  // Update answers array when subject changes
                  const subject = subjects.find(s => s.id === subjectId);
                  const taskCount = subject?.tasks?.length || 27;
                  // Keep existing answers, resize array if needed
                  const currentAnswers = [...answers];
                  if (currentAnswers.length < taskCount) {
                    setAnswers([...currentAnswers, ...Array(taskCount - currentAnswers.length).fill(null)]);
                  } else if (currentAnswers.length > taskCount) {
                    setAnswers(currentAnswers.slice(0, taskCount));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                      {subject.exam_type && ` [${subject.exam_type}]`}
                      {subject.code && ` (${subject.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">
                Проверил
              </label>
              <Select
                value={editResultTeacherId || "none"}
                onValueChange={(value) => setEditResultTeacherId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указан</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.last_name} {teacher.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task Scores Grid */}
            <div>
              <label className="text-sm font-medium text-slate-900 mb-2 block">
                Баллы по заданиям
              </label>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(50px,1fr))] gap-1 border rounded-lg p-3 bg-slate-50">
                {answers.map((answer, index) => {
                  const examSubject = subjects.find(s => s.id === editResultSubjectId) || (editingResult as any)?.exam?.subject_rel;
                  const task = examSubject?.tasks?.[index];
                  const taskLabel = task?.label || (index + 1).toString();
                  const taskMaxScore = task?.maxScore || 1;

                  return (
                    <div key={index} className="flex flex-col">
                      <div className="bg-slate-200 border border-slate-300 text-xs font-medium text-slate-700 px-2 py-1 text-center rounded-t">
                        {taskLabel}
                      </div>
                      <input
                        type="text"
                        value={answer ?? ""}
                        onChange={(e) => {
                          const newAnswers = [...answers];
                          const value = e.target.value;
                          const numValue = value === "" ? null : parseInt(value);
                          // Validate max score
                          if (numValue !== null && numValue > taskMaxScore) {
                            newAnswers[index] = taskMaxScore;
                          } else {
                            newAnswers[index] = numValue;
                          }
                          setAnswers(newAnswers);
                        }}
                        placeholder="—"
                        title={`Максимум: ${taskMaxScore}`}
                        className="w-full h-9 text-center text-sm border border-slate-300 border-t-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white rounded-b"
                      />
                    </div>
                  );
                })}
              </div>
              {(() => {
                const examSubject = subjects.find(s => s.id === editResultSubjectId) || (editingResult as any)?.exam?.subject_rel;
                const scores = calculateScores(answers, examSubject);
                const isOGE = examSubject?.exam_type === 'ОГЭ';
                return (
                  <div className="flex gap-4 mt-2 text-sm">
                    <div className="text-slate-700">
                      <span className="font-medium">Первичный балл:</span> {scores.primary}
                    </div>
                    {scores.final !== scores.primary && (
                      <div className="text-slate-700">
                        <span className="font-medium">{isOGE ? 'Оценка:' : 'Итоговый балл:'}</span> {scores.final}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Student Comment */}
            <div>
              <label className="text-sm font-medium text-slate-900 mb-2 block">
                Комментарий к работе (необязательно)
              </label>
              <Textarea
                placeholder="Добавить комментарий..."
                value={studentComment}
                onChange={(e) => setStudentComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditResultDialogOpen(false);
                  setEditingResult(null);
                  setAnswers(Array(27).fill(null));
                  setStudentComment("");
                  setEditResultSubjectId("");
                  setEditResultTeacherId("");
                }}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                onClick={handleUpdateResult}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Комментарий к работе
            </DialogTitle>
            <DialogDescription>
              Подробная информация о результате
            </DialogDescription>
          </DialogHeader>
          {selectedComment && (
            <div className="flex flex-col gap-2 text-sm border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Студент:</span>
                <span className="text-slate-700">{selectedComment.studentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Экзамен:</span>
                <span className="text-slate-700">{selectedComment.examTitle}</span>
              </div>
            </div>
          )}
          <div className="mt-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedComment?.comment}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Result Dialog */}
      <Dialog open={isAddResultDialogOpen} onOpenChange={setIsAddResultDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Добавить результат экзамена
            </DialogTitle>
            <DialogDescription>
              Заполните результат экзамена для студента
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Subject Selection */}
            <div>
              <label className="text-sm font-medium text-slate-900 mb-2 block">
                Предмет *
              </label>
              <Select value={selectedSubjectId} onValueChange={handleSubjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}{subject.exam_type && ` (${subject.exam_type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selection */}
            {selectedSubjectId && (
              <div>
                <label className="text-sm font-medium text-slate-900 mb-2 block">
                  Экзамен *
                </label>
                {examTemplates.length > 0 ? (
                  <>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите экзамен (осенний пробник, зимний пробник и т.д.)" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.title}
                            {template.subject_rel ? ` (${template.subject_rel.name}${template.subject_rel.exam_type ? ` ${template.subject_rel.exam_type}` : ''})` : template.subject ? ` (${template.subject})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {templatesForSubject.length === 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Для предмета "{selectedSubjectId}" шаблонов не найдено. Показаны все шаблоны.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg border">
                    Нет шаблонов экзаменов. Создайте шаблон в настройках школы на вкладке "Экзамены".
                  </div>
                )}
              </div>
            )}

            {/* Exam Date */}
            {selectedTemplateId && (
              <div>
                <label className="text-sm font-medium text-slate-900 mb-2 block">
                  Дата сдачи *
                </label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
            )}

            {/* Student Search */}
            {examDate && (
              <div>
                <label className="text-sm font-medium text-slate-900 mb-2 block">
                  Студент *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Введите фамилию или имя студента"
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setSelectedStudentId("");
                    }}
                    className="pl-10"
                  />
                </div>
                {studentSearchQuery && filteredStudentsForSearch.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {filteredStudentsForSearch.slice(0, 10).map((student) => (
                      <button
                        key={student.id}
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          setStudentSearchQuery(`${student.last_name} ${student.first_name}`);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${
                          selectedStudentId === student.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="font-medium">{student.last_name} {student.first_name}</div>
                        {student.class_number && (
                          <div className="text-xs text-slate-500">{student.class_number} класс</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Task Scores Grid */}
            {selectedStudentId && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    Баллы по заданиям
                  </label>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(50px,1fr))] gap-1 border rounded-lg p-3 bg-slate-50">
                    {answers.map((answer, index) => {
                      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
                      const task = selectedSubject?.tasks?.[index];
                      const taskLabel = task?.label || (index + 1).toString();
                      const taskMaxScore = task?.maxScore || 1;

                      return (
                        <div key={index} className="flex flex-col">
                          <div className="bg-slate-200 border border-slate-300 text-xs font-medium text-slate-700 px-2 py-1 text-center rounded-t">
                            {taskLabel}
                          </div>
                          <input
                            type="text"
                            value={answer ?? ""}
                            onChange={(e) => {
                              const newAnswers = [...answers];
                              const value = e.target.value;
                              const numValue = value === "" ? null : parseInt(value);
                              // Validate max score
                              if (numValue !== null && numValue > taskMaxScore) {
                                newAnswers[index] = taskMaxScore;
                              } else {
                                newAnswers[index] = numValue;
                              }
                              setAnswers(newAnswers);
                            }}
                            placeholder="—"
                            title={`Максимум: ${taskMaxScore}`}
                            className="w-full h-9 text-center text-sm border border-slate-300 border-t-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white rounded-b"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
                    const scores = calculateScores(answers, selectedSubject);
                    const isOGE = selectedSubject?.exam_type === 'ОГЭ';
                    return (
                      <div className="flex gap-4 mt-2 text-sm">
                        <div className="text-slate-700">
                          <span className="font-medium">Первичный балл:</span> {scores.primary}
                        </div>
                        {scores.final !== scores.primary && (
                          <div className="text-slate-700">
                            <span className="font-medium">{isOGE ? 'Оценка:' : 'Итоговый балл:'}</span> {scores.final}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Student Comment */}
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    Комментарий к работе (необязательно)
                  </label>
                  <Textarea
                    placeholder="Добавить комментарий..."
                    value={studentComment}
                    onChange={(e) => setStudentComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddResultDialogOpen(false);
                  setSelectedSubjectId("");
                  setSelectedTemplateId("");
                  setExamDate("");
                  setStudentSearchQuery("");
                  setSelectedStudentId("");
                  setAnswers(Array(27).fill(null));
                  setStudentComment("");
                }}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddResult}
                disabled={
                  !selectedSubjectId ||
                  !selectedTemplateId ||
                  !examDate ||
                  !selectedStudentId ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Добавить"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
