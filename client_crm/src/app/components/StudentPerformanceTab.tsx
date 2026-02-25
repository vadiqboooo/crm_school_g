import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, FileText, Copy, Send, ChevronDown, ChevronUp, Trash2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { StudentPerformanceResponse, StudentPerformanceRecord, GroupInfo, WeeklyReport } from "../types/api";

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
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportDays, setReportDays] = useState<number>(7);
  const [reportsHistory, setReportsHistory] = useState<WeeklyReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [parentCommentDialogOpen, setParentCommentDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [parentFeedback, setParentFeedback] = useState("");
  const [parentReaction, setParentReaction] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    loadPerformanceData();
    loadReportsHistory(); // Загружаем историю сразу при загрузке компонента
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

  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      await api.generateWeeklyReport(studentId, reportDays);
      toast.success("Отчет успешно сгенерирован");
      // Перезагрузить историю после создания нового репорта
      const history = await api.getWeeklyReports(studentId);
      setReportsHistory(history);
      // Автоматически развернуть новый (первый) репорт
      if (history.length > 0) {
        setExpandedReports(new Set([history[0].id]));
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      toast.error(err.message || "Не удалось сгенерировать отчет");
    } finally {
      setGeneratingReport(false);
    }
  };

  const loadReportsHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await api.getWeeklyReports(studentId);
      setReportsHistory(history);
    } catch (err: any) {
      console.error("Failed to load reports history:", err);
      toast.error("Не удалось загрузить историю репортов");
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleReportExpanded = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
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

  const copyReportToClipboard = async (reportText: string) => {
    try {
      await navigator.clipboard.writeText(reportText);
      toast.success("Отчет скопирован в буфер обмена");
    } catch (err) {
      toast.error("Не удалось скопировать отчет");
    }
  };

  const openParentCommentDialog = (report: WeeklyReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReportId(report.id);
    setParentFeedback(report.parent_feedback || "");
    setParentReaction(report.parent_reaction || "");
    setParentCommentDialogOpen(true);
  };

  const saveParentComment = async () => {
    if (!selectedReportId) return;
    try {
      setSavingComment(true);
      const updated = await api.updateWeeklyReportParentComment(selectedReportId, {
        parent_feedback: parentFeedback,
        parent_reaction: parentReaction,
      });
      setReportsHistory(prev => prev.map(r => r.id === selectedReportId ? updated : r));
      setParentCommentDialogOpen(false);
      toast.success("Комментарий сохранён");
    } catch (err) {
      toast.error("Не удалось сохранить комментарий");
    } finally {
      setSavingComment(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот отчет?")) return;

    try {
      await api.deleteWeeklyReport(reportId);
      toast.success("Отчет успешно удален");
      // Обновить список репортов
      await loadReportsHistory();
    } catch (err: any) {
      console.error("Failed to delete report:", err);
      toast.error("Не удалось удалить отчет");
    }
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

      {/* Weekly Report Section - Всегда показываем таблицу */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
        <div className="border-b border-[#E8E8E8] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-[18px] h-[18px] text-[#E42313]" />
            <div className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Еженедельные отчеты для родителей
            </div>
            {reportsHistory.length > 0 && (
              <span className="bg-[#E8E8E8] text-[#0D0D0D] text-xs px-2 py-0.5 rounded">
                {reportsHistory.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 border border-[#E8E8E8] rounded text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Период:
            </div>
            <Select
              value={reportDays.toString()}
              onValueChange={(value) => setReportDays(Number(value))}
            >
              <SelectTrigger className="w-[150px] h-10 bg-white border-[#E8E8E8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">За 7 дней</SelectItem>
                <SelectItem value="14">За 14 дней</SelectItem>
                <SelectItem value="30">За 30 дней</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateReport}
              disabled={generatingReport}
              className="bg-[#0D0D0D] hover:bg-[#000000] text-white px-5 py-2.5 h-auto font-medium text-[13px]"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {generatingReport ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 mr-2" />
                  Сгенерировать отчет
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="p-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#7A7A7A]" />
            </div>
          ) : reportsHistory.length === 0 ? (
            <div className="text-center py-12 text-[#7A7A7A]">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Репортов пока нет</p>
              <p className="text-xs mt-1">Нажмите "Сгенерировать отчет" для создания первого отчета</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportsHistory.map((report, index) => (
                <div key={report.id} className="border border-[#E8E8E8] rounded-lg overflow-hidden">
                  <div
                    className="px-4 py-3 bg-[#FAFAFA] cursor-pointer hover:bg-[#F0F0F0] transition-colors flex items-center justify-between"
                    onClick={() => toggleReportExpanded(report.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          📅 {formatDate(report.period_start)} — {formatDate(report.period_end)}
                        </div>
                        {index === 0 && (
                          <span className="bg-[#E42313] text-white text-xs px-2 py-0.5 rounded">
                            Новый
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#7A7A7A] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Создан: {new Date(report.created_at).toLocaleDateString('ru-RU')} в{' '}
                        {new Date(report.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyReportToClipboard(report.ai_report);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3"
                      >
                        <Copy className="w-3 h-3 text-[#7A7A7A]" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement send functionality
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3"
                      >
                        <Send className="w-3 h-3 text-[#7A7A7A]" />
                      </Button>
                      <Button
                        onClick={(e) => openParentCommentDialog(report, e)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3"
                        title="Добавить комментарий родителя"
                      >
                        <MessageSquarePlus className={`w-3 h-3 ${report.parent_feedback || report.parent_reaction ? "text-blue-600" : "text-[#7A7A7A]"}`} />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteReport(report.id);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                      {expandedReports.has(report.id) ? (
                        <ChevronUp className="w-4 h-4 text-[#7A7A7A]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#7A7A7A]" />
                      )}
                    </div>
                  </div>
                  {expandedReports.has(report.id) && (
                    <div className="p-6 bg-white border-t border-[#E8E8E8] space-y-4">
                      <div className="bg-[#FAFAFA] border border-[#E8E8E8] rounded-lg p-6">
                        <div className="text-[13px] text-[#0D0D0D] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {report.ai_report}
                        </div>
                      </div>
                      {(report.parent_feedback || report.parent_reaction) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Обратная связь с родителем</div>
                          {report.parent_feedback && (
                            <div>
                              <div className="text-xs text-[#7A7A7A] mb-1">Обратная связь от родителя</div>
                              <div className="text-sm text-[#0D0D0D] whitespace-pre-wrap">{report.parent_feedback}</div>
                            </div>
                          )}
                          {report.parent_reaction && (
                            <div>
                              <div className="text-xs text-[#7A7A7A] mb-1">Как родитель принял обратную связь</div>
                              <div className="text-sm text-[#0D0D0D] whitespace-pre-wrap">{report.parent_reaction}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Parent comment dialog */}
      <Dialog open={parentCommentDialogOpen} onOpenChange={setParentCommentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Обратная связь с родителем</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Обратная связь от родителя</Label>
              <Textarea
                placeholder="Напишите что сообщил родитель..."
                value={parentFeedback}
                onChange={(e) => setParentFeedback(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Как родитель принял обратную связь</Label>
              <Textarea
                placeholder="Опишите реакцию родителя..."
                value={parentReaction}
                onChange={(e) => setParentReaction(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParentCommentDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveParentComment} disabled={savingComment}>
              {savingComment ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
