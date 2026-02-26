import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, FileText, Copy, Send, ChevronDown, ChevronUp, Trash2, MessageSquarePlus, Phone, MessageCircle, User, ThumbsUp, Minus, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { StudentPerformanceResponse, StudentPerformanceRecord, GroupInfo, WeeklyReport, ParentFeedback, ContactType, ParentReaction } from "../types/api";

interface StudentPerformanceTabProps {
  studentId: string;
  studentGroups: GroupInfo[];
  studentName?: string;
}

const getAttendanceDisplay = (attendance?: string) => {
  switch (attendance) {
    case "present": return "✓";
    case "absent": return "Н";
    case "late": return "О";
    case "trial": return "П";
    default: return "-";
  }
};

const getAttendanceBgColor = (attendance?: string) => {
  switch (attendance) {
    case "present": return "#22C55E";
    case "absent": return "#EF4444";
    case "late": return "#F59E0B";
    case "trial": return "#3B82F6";
    default: return "#E2E8F0";
  }
};

const getGradeBgColor = (grade?: string) => {
  if (!grade || grade === "0" || grade === "-") return "#F1F5F9";
  const numGrade = parseInt(grade);
  if (numGrade >= 5) return "#22C55E";
  if (numGrade >= 4) return "#3B82F6";
  if (numGrade >= 3) return "#F59E0B";
  return "#EF4444";
};

export function StudentPerformanceTab({ studentId, studentGroups, studentName }: StudentPerformanceTabProps) {
  const [performanceData, setPerformanceData] = useState<StudentPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Parent Feedback state
  const [parentFeedbacks, setParentFeedbacks] = useState<ParentFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [contactType, setContactType] = useState<ContactType>("call");
  const [feedbackToParent, setFeedbackToParent] = useState("");
  const [feedbackFromParent, setFeedbackFromParent] = useState("");
  const [parentReaction, setParentReaction] = useState<ParentReaction | undefined>(undefined);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPerformanceData();
    loadParentFeedbacks();
  }, [studentId]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentPerformance(studentId);
      setPerformanceData(data);
    } catch (err) {
      console.error("Failed to load performance data:", err);
      toast.error("Не удалось загрузить данные об успеваемости");
    } finally {
      setLoading(false);
    }
  };

  const loadParentFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const feedbacks = await api.getParentFeedbacks(studentId);
      setParentFeedbacks(feedbacks);
    } catch (err: any) {
      console.error("Failed to load parent feedbacks:", err);
      toast.error("Не удалось загрузить обратную связь");
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const openFeedbackDialog = () => {
    setContactType("call");
    setFeedbackToParent("");
    setFeedbackFromParent("");
    setParentReaction(undefined);
    setFeedbackDialogOpen(true);
  };

  const getContactTypeLabel = (type: ContactType) => {
    switch (type) {
      case "call": return "Звонок";
      case "telegram": return "Телеграм";
      case "in_person": return "Лично";
    }
  };

  const getParentReactionLabel = (reaction?: ParentReaction | null) => {
    if (!reaction) return "—";
    switch (reaction) {
      case "positive": return "Положительная";
      case "neutral": return "Нейтральная";
      case "negative": return "Отрицательная";
    }
  };

  const toggleFeedbackExpanded = (feedbackId: string) => {
    setExpandedFeedbacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId);
      } else {
        newSet.add(feedbackId);
      }
      return newSet;
    });
  };

  const saveFeedback = async () => {
    if (!feedbackToParent.trim()) {
      toast.error("Заполните поле обратной связи");
      return;
    }

    try {
      setSavingFeedback(true);
      await api.createParentFeedback(studentId, {
        contact_type: contactType,
        feedback_to_parent: feedbackToParent,
        feedback_from_parent: feedbackFromParent || undefined,
        parent_reaction: parentReaction,
      });
      toast.success("Обратная связь сохранена");
      setFeedbackDialogOpen(false);
      await loadParentFeedbacks();
    } catch (err: any) {
      console.error("Failed to save feedback:", err);
      toast.error("Не удалось сохранить обратную связь");
    } finally {
      setSavingFeedback(false);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту обратную связь?")) return;

    try {
      await api.deleteParentFeedback(feedbackId);
      toast.success("Обратная связь удалена");
      await loadParentFeedbacks();
    } catch (err: any) {
      console.error("Failed to delete feedback:", err);
      toast.error("Не удалось удалить обратную связь");
    }
  };

  const toggleCommentExpanded = (lessonId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const truncateComment = (comment: string, lessonId: string) => {
    const maxLength = 200;
    if (comment.length <= maxLength) {
      return comment;
    }

    const isExpanded = expandedComments.has(lessonId);
    if (isExpanded) {
      return comment;
    }

    return comment.substring(0, maxLength) + '...';
  };

  // Get available subjects from performance data
  const availableSubjects = useMemo(() => {
    if (!performanceData) return [];
    const subjects = new Set<string>();
    performanceData.performance_records.forEach((record) => {
      subjects.add(record.subject_name);
    });
    return Array.from(subjects).sort();
  }, [performanceData]);

  // Filter performance records based on selected subject
  const filteredRecords = useMemo(() => {
    if (!performanceData) return [];
    let filtered = [...performanceData.performance_records];

    if (filterSubject !== "all") {
      filtered = filtered.filter((record) => record.subject_name === filterSubject);
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime());
  }, [performanceData, filterSubject]);

  // Calculate comprehensive statistics
  const statistics = useMemo(() => {
    const totalLessons = filteredRecords.length;
    const presentCount = filteredRecords.filter((r) => r.attendance === "present").length;
    const absentCount = filteredRecords.filter((r) => r.attendance === "absent").length;
    const lateCount = filteredRecords.filter((r) => r.attendance === "late").length;

    // Calculate attendance percentage
    const attendancePercentage = totalLessons > 0
      ? Math.round((presentCount / totalLessons) * 100)
      : 0;

    // Calculate average grade (combining lesson and homework grades)
    const allGrades: number[] = [];
    filteredRecords.forEach((r) => {
      if (r.lesson_grade && r.lesson_grade !== "0" && r.lesson_grade !== "-") {
        const grade = parseInt(r.lesson_grade);
        if (!isNaN(grade)) allGrades.push(grade);
      }
      if (r.homework_grade && r.homework_grade !== "0" && r.homework_grade !== "-") {
        const grade = parseInt(r.homework_grade);
        if (!isNaN(grade)) allGrades.push(grade);
      }
    });
    const averageGrade = allGrades.length > 0
      ? (allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length).toFixed(1)
      : "—";

    // Calculate homework completion
    const homeworkRecords = filteredRecords.filter((r) => r.homework_grade);
    const completedHomework = homeworkRecords.filter((r) =>
      r.homework_grade && r.homework_grade !== "0" && r.homework_grade !== "-"
    ).length;
    const homeworkPercentage = homeworkRecords.length > 0
      ? Math.round((completedHomework / homeworkRecords.length) * 100)
      : 0;

    return {
      attendancePercentage,
      averageGrade,
      absentCount,
      homeworkPercentage,
      totalLessons,
      presentCount,
      lateCount,
      completedHomework,
      totalHomework: homeworkRecords.length
    };
  }, [filteredRecords]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}`;
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "—";
    return timeStr.substring(0, 5); // HH:MM
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!performanceData || performanceData.performance_records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8">
        <div className="text-center text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Нет данных об успеваемости</p>
          <p className="text-sm mt-1">Студент пока не посещал проведенные уроки</p>
        </div>
      </div>
    );
  }

  // Helper function to get color based on percentage
  const getAttendanceColor = (percentage: number) => {
    if (percentage === 100) return '#22C55E'; // green
    if (percentage >= 90) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getHomeworkColor = (percentage: number) => {
    if (percentage > 90) return '#22C55E'; // green
    if (percentage >= 70) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  return (
    <div className="space-y-6">{/* Removed bg and padding to match Info tab */}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Посещаемость - только процент с цветом */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 flex flex-col gap-3">
          <div className="text-[13px] text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>Посещаемость</div>
          <div className="flex items-center">
            <div
              className="text-[32px] font-bold"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: getAttendanceColor(statistics.attendancePercentage)
              }}
            >
              {statistics.attendancePercentage}%
            </div>
          </div>
        </div>

        {/* Пропуски - X из Y с цветом */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 flex flex-col gap-3">
          <div className="text-[13px] text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>Пропуски</div>
          <div className="flex items-center">
            <div
              className="text-[32px] font-bold"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: statistics.absentCount === 0 ? '#22C55E' : '#EF4444'
              }}
            >
              {statistics.absentCount} из {statistics.totalLessons}
            </div>
          </div>
        </div>

        {/* ДЗ выполнено - процент справа сверху + числа снизу */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>ДЗ выполнено</div>
            <div
              className="text-[18px] font-bold"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: getHomeworkColor(statistics.homeworkPercentage)
              }}
            >
              {statistics.homeworkPercentage}%
            </div>
          </div>
          <div className="text-[32px] font-bold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {statistics.completedHomework}/{statistics.totalHomework}
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
        <div className="border-b border-[#E8E8E8] px-6 py-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Журнал успеваемости
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>Предмет:</span>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[200px] h-10 bg-white border-[#E8E8E8] px-4">
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все предметы</SelectItem>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border-b border-[#E8E8E8] px-6 py-3 grid grid-cols-[70px_120px_80px_50px_50px_200px_1fr] gap-4">
          <div className="text-[13px] text-[#7A7A7A] font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>Дата</div>
          <div className="text-[13px] text-[#7A7A7A] font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>Предмет</div>
          <div className="text-[13px] text-[#7A7A7A] font-normal text-center" style={{ fontFamily: 'Inter, sans-serif' }}>Посещение</div>
          <div className="text-[13px] text-[#7A7A7A] font-normal text-center" style={{ fontFamily: 'Inter, sans-serif' }}>ДЗ</div>
          <div className="text-[13px] text-[#7A7A7A] font-normal text-center" style={{ fontFamily: 'Inter, sans-serif' }}>Урок</div>
          <div className="text-[13px] text-[#7A7A7A] font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>Тема урока</div>
          <div className="text-[13px] text-[#7A7A7A] font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>Комментарий</div>
        </div>

        {filteredRecords.length > 0 ? (
          filteredRecords.slice(0, 10).map((record, index) => (
            <div
              key={record.lesson_id}
              className={`px-6 py-3.5 grid grid-cols-[70px_120px_80px_50px_50px_200px_1fr] gap-4 items-start ${
                index < 9 ? 'border-b border-[#E8E8E8]' : ''
              }`}
            >
              <div className="text-sm font-medium text-[#0D0D0D] pt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {formatDateShort(record.lesson_date)}
              </div>
              <div className="text-sm text-[#0D0D0D] pt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                {record.subject_name}
              </div>
              <div className="flex justify-center pt-1">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: getAttendanceBgColor(record.attendance) }}
                >
                  {getAttendanceDisplay(record.attendance)}
                </div>
              </div>
              <div className="flex justify-center pt-1">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: getGradeBgColor(record.homework_grade),
                    color: record.homework_grade && record.homework_grade !== "0" && record.homework_grade !== "-" ? "white" : "#94a3b8"
                  }}
                >
                  {record.homework_grade || "-"}
                </div>
              </div>
              <div className="flex justify-center pt-1">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: getGradeBgColor(record.lesson_grade),
                    color: record.lesson_grade && record.lesson_grade !== "0" && record.lesson_grade !== "-" ? "white" : "#94a3b8"
                  }}
                >
                  {record.lesson_grade || "-"}
                </div>
              </div>
              <div className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {record.lesson_topic || "—"}
              </div>
              <div className="text-sm text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {record.comment ? (
                  <div>
                    <div className="leading-relaxed">
                      {truncateComment(record.comment, record.lesson_id)}
                    </div>
                    {record.comment.length > 200 && (
                      <button
                        onClick={() => toggleCommentExpanded(record.lesson_id)}
                        className="text-[#E42313] hover:underline text-xs mt-1 font-medium"
                      >
                        {expandedComments.has(record.lesson_id) ? 'Свернуть' : 'Читать далее'}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[#7A7A7A]">—</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-[#7A7A7A]">
            Нет уроков, соответствующих выбранному фильтру
          </div>
        )}
      </div>

      {/* Parent Feedback Section */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
        <div className="border-b border-[#E8E8E8] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquarePlus className="w-[18px] h-[18px] text-[#E42313]" />
            <div className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Обратная связь с родителями
            </div>
            {parentFeedbacks.length > 0 && (
              <span className="bg-[#E8E8E8] text-[#0D0D0D] text-xs px-2 py-0.5 rounded">
                {parentFeedbacks.length}
              </span>
            )}
          </div>
          <Button
            onClick={openFeedbackDialog}
            className="bg-[#0D0D0D] hover:bg-[#000000] text-white px-5 py-2.5 h-auto font-medium text-[13px]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <MessageSquarePlus className="w-3.5 h-3.5 mr-2" />
            Добавить новую обратную связь
          </Button>
        </div>

        <div className="p-6">
          {loadingFeedbacks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#7A7A7A]" />
            </div>
          ) : parentFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-[#7A7A7A]">
              <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Обратной связи пока нет</p>
              <p className="text-xs mt-1">Нажмите "Добавить новую обратную связь" для создания первой записи</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parentFeedbacks.map((feedback) => {
                const isExpanded = expandedFeedbacks.has(feedback.id);
                const createdDate = new Date(feedback.created_at);
                const now = new Date();
                const diffMs = now.getTime() - createdDate.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                let timeAgo = '';
                if (diffMins < 1) timeAgo = 'только что';
                else if (diffMins < 60) timeAgo = `${diffMins} мин назад`;
                else if (diffHours < 24) timeAgo = `${diffHours} ч назад`;
                else if (diffDays < 7) timeAgo = `${diffDays} дн назад`;
                else timeAgo = createdDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

                return (
                  <div key={feedback.id} className="border border-[#E8E8E8] rounded-lg overflow-hidden">
                    <div className="p-4 bg-[#FAFAFA] flex items-start justify-between gap-4">
                      <div className="flex-1 grid grid-cols-[auto_1fr_auto] gap-4 items-start">
                        {/* Date & Time */}
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {createdDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                          <div className="text-xs text-[#7A7A7A] mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {createdDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-[#3B82F6] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {timeAgo}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {feedback.contact_type === "call" && <Phone className="w-4 h-4 text-[#E42313]" />}
                              {feedback.contact_type === "telegram" && <MessageCircle className="w-4 h-4 text-[#0088cc]" />}
                              {feedback.contact_type === "in_person" && <User className="w-4 h-4 text-[#22C55E]" />}
                              <span className="text-sm font-medium text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {getContactTypeLabel(feedback.contact_type)}
                              </span>
                            </div>
                            <span className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {feedback.created_by_first_name && feedback.created_by_last_name
                                ? `${feedback.created_by_first_name} ${feedback.created_by_last_name}`
                                : feedback.created_by_employee
                                ? `${feedback.created_by_employee.first_name} ${feedback.created_by_employee.last_name}`
                                : '—'}
                            </span>
                          </div>

                          {/* Feedback preview */}
                          <div className="text-sm text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            <span className="font-medium">Обратная связь: </span>
                            {isExpanded ? feedback.feedback_to_parent : (
                              feedback.feedback_to_parent.length > 150
                                ? `${feedback.feedback_to_parent.substring(0, 150)}...`
                                : feedback.feedback_to_parent
                            )}
                          </div>

                          {feedback.feedback_from_parent && (
                            <div className="text-sm text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                              <span className="font-medium">Ответ родителя: </span>
                              {isExpanded ? feedback.feedback_from_parent : (
                                feedback.feedback_from_parent.length > 150
                                  ? `${feedback.feedback_from_parent.substring(0, 150)}...`
                                  : feedback.feedback_from_parent
                              )}
                            </div>
                          )}

                          {(feedback.feedback_to_parent.length > 150 || (feedback.feedback_from_parent && feedback.feedback_from_parent.length > 150)) && (
                            <button
                              onClick={() => toggleFeedbackExpanded(feedback.id)}
                              className="text-[#E42313] hover:underline text-xs font-medium"
                            >
                              {isExpanded ? 'Свернуть' : 'Читать полностью'}
                            </button>
                          )}
                        </div>

                        {/* Reaction */}
                        {feedback.parent_reaction && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                            backgroundColor: feedback.parent_reaction === 'positive' ? '#F0FDF4' :
                                           feedback.parent_reaction === 'negative' ? '#FEF2F2' : '#F8FAFC'
                          }}>
                            {feedback.parent_reaction === 'positive' && <ThumbsUp className="w-4 h-4 text-[#22C55E]" />}
                            {feedback.parent_reaction === 'neutral' && <Minus className="w-4 h-4 text-[#7A7A7A]" />}
                            {feedback.parent_reaction === 'negative' && <ThumbsDown className="w-4 h-4 text-[#EF4444]" />}
                            <span className="text-xs font-medium" style={{
                              fontFamily: 'Inter, sans-serif',
                              color: feedback.parent_reaction === 'positive' ? '#22C55E' :
                                     feedback.parent_reaction === 'negative' ? '#EF4444' : '#7A7A7A'
                            }}>
                              {getParentReactionLabel(feedback.parent_reaction)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Delete button */}
                      <Button
                        onClick={() => deleteFeedback(feedback.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Parent Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить новую обратную связь с родителем</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Тип связи с родителем</Label>
              <Select value={contactType} onValueChange={(value) => setContactType(value as ContactType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Звонок</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="telegram">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>Телеграм</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_person">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Лично</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Какая была обратная связь</Label>
              <Textarea
                placeholder="Опишите что было сообщено родителю..."
                value={feedbackToParent}
                onChange={(e) => setFeedbackToParent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Обратная связь от родителя</Label>
              <Textarea
                placeholder="Опишите ответ родителя (необязательно)..."
                value={feedbackFromParent}
                onChange={(e) => setFeedbackFromParent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Реакция родителя (необязательно)</Label>
              <Select value={parentReaction || "none"} onValueChange={(value) => setParentReaction(value === "none" ? undefined : value as ParentReaction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-[#7A7A7A]">Не указано</span>
                  </SelectItem>
                  <SelectItem value="positive">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-[#22C55E]" />
                      <span>Положительная</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="neutral">
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-[#7A7A7A]" />
                      <span>Нейтральная</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="negative">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-4 h-4 text-[#EF4444]" />
                      <span>Отрицательная</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveFeedback} disabled={savingFeedback}>
              {savingFeedback ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
