import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2, FileText, Calendar, Search, Clock, TrendingUp, User, Copy, Send, ChevronDown, ChevronUp, Trash2, Edit, Save, Check, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Student, WeeklyReport } from "../types/api";

export function StudentsWeeklyReportsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportDays, setReportDays] = useState<number>(7);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editedReportText, setEditedReportText] = useState<string>("");
  const [savingReport, setSavingReport] = useState(false);
  const [studentLatestReports, setStudentLatestReports] = useState<Map<string, WeeklyReport>>(new Map());

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadWeeklyReports(selectedStudent.id);
    } else {
      setReports([]);
      setExpandedReports(new Set());
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents();
      const activeStudents = data.filter(s => s.status === "active");
      setStudents(activeStudents);

      // Load latest report for each student
      await loadLatestReports(activeStudents);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestReports = async (studentsList: Student[]) => {
    try {
      // Load all latest reports in a single request
      const reportsDict = await api.getAllStudentsLatestReports();
      const reportsMap = new Map<string, WeeklyReport>();

      // Convert dict to Map
      Object.entries(reportsDict).forEach(([studentId, report]) => {
        reportsMap.set(studentId, report);
      });

      setStudentLatestReports(reportsMap);
    } catch (error) {
      console.error("Failed to load latest reports:", error);
    }
  };

  const loadWeeklyReports = async (studentId: string) => {
    try {
      setLoadingReports(true);
      const data = await api.getWeeklyReports(studentId);
      setReports(data);
      // Automatically expand the first (most recent) report
      if (data.length > 0) {
        setExpandedReports(new Set([data[0].id]));
      }
    } catch (error) {
      console.error("Failed to load weekly reports:", error);
      setReports([]);
      setExpandedReports(new Set());
    } finally {
      setLoadingReports(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent) return;

    try {
      setGenerating(true);
      await api.generateWeeklyReport(selectedStudent.id, reportDays);
      toast.success("Отчет успешно сгенерирован");

      // Reload reports for selected student
      const updatedReports = await api.getWeeklyReports(selectedStudent.id);
      setReports(updatedReports);

      // Update the latest reports map
      if (updatedReports.length > 0) {
        const newMap = new Map(studentLatestReports);
        newMap.set(selectedStudent.id, updatedReports[0]);
        setStudentLatestReports(newMap);

        // Auto-expand the new report
        setExpandedReports(new Set([updatedReports[0].id]));
      }
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(error.message || "Ошибка при генерации отчета");
    } finally {
      setGenerating(false);
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

  const copyReportToClipboard = async (reportText: string) => {
    try {
      await navigator.clipboard.writeText(reportText);
      toast.success("Отчет скопирован в буфер обмена");
    } catch (err) {
      toast.error("Не удалось скопировать отчет");
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот отчет?")) return;

    try {
      await api.deleteWeeklyReport(reportId);
      toast.success("Отчет успешно удален");
      if (selectedStudent) {
        await loadWeeklyReports(selectedStudent.id);
      }
    } catch (err: any) {
      console.error("Failed to delete report:", err);
      toast.error("Не удалось удалить отчет");
    }
  };

  const startEditingReport = (report: WeeklyReport) => {
    setEditingReportId(report.id);
    setEditedReportText(report.ai_report);
  };

  const cancelEditingReport = () => {
    setEditingReportId(null);
    setEditedReportText("");
  };

  const saveReport = async (reportId: string) => {
    try {
      setSavingReport(true);
      await api.updateWeeklyReport(reportId, { ai_report: editedReportText });
      toast.success("Отчет успешно обновлен");
      setEditingReportId(null);
      setEditedReportText("");
      if (selectedStudent) {
        await loadWeeklyReports(selectedStudent.id);
      }
    } catch (err: any) {
      console.error("Failed to update report:", err);
      toast.error("Не удалось обновить отчет");
    } finally {
      setSavingReport(false);
    }
  };

  const toggleApproveReport = async (report: WeeklyReport) => {
    try {
      let updatedReport: WeeklyReport;

      if (report.is_approved) {
        // Unapprove
        updatedReport = await api.unapproveWeeklyReport(report.id);
        toast.success("Подтверждение отменено");
      } else {
        // Approve
        updatedReport = await api.approveWeeklyReport(report.id);
        toast.success("Отчет подтвержден");
      }

      if (selectedStudent) {
        await loadWeeklyReports(selectedStudent.id);

        // Update the latest reports map
        const newMap = new Map(studentLatestReports);
        newMap.set(selectedStudent.id, updatedReport);
        setStudentLatestReports(newMap);
      }
    } catch (err: any) {
      console.error("Failed to toggle approve report:", err);
      toast.error("Не удалось изменить статус подтверждения");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getAttendancePercentage = (report: WeeklyReport) => {
    const total = report.attendance_count + report.absent_count + report.late_count;
    if (total === 0) return 0;
    return Math.round((report.attendance_count / total) * 100);
  };

  const getHomeworkPercentage = (report: WeeklyReport) => {
    if (report.homework_total === 0) return 0;
    return Math.round((report.homework_completed / report.homework_total) * 100);
  };

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Students Table - Left (1/2 width) */}
      <div className="col-span-1 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Поиск студента..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>ФИО студента</TableHead>
                    <TableHead className="w-32 text-center">Отчет</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const latestReport = studentLatestReports.get(student.id);
                    return (
                      <TableRow
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`cursor-pointer transition-colors ${
                          selectedStudent?.id === student.id
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <TableCell className="py-2">
                          <div className="font-medium text-slate-900">
                            {student.last_name} {student.first_name}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          {latestReport ? (
                            latestReport.is_approved ? (
                              <Check className="w-5 h-5 text-green-600 inline-block" />
                            ) : (
                              <X className="w-5 h-5 text-slate-400 inline-block" />
                            )
                          ) : (
                            <span className="text-xs text-slate-400">Нет</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Section - Right (1/2 width) */}
      <div className="col-span-1">
        {selectedStudent ? (
          <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden sticky top-6">
            {/* Header */}
            <div className="border-b border-[#E8E8E8] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-[18px] h-[18px] text-[#E42313]" />
                <div className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Отчеты: {selectedStudent.last_name} {selectedStudent.first_name}
                </div>
                {reports.length > 0 && (
                  <span className="bg-[#E8E8E8] text-[#0D0D0D] text-xs px-2 py-0.5 rounded">
                    {reports.length}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="border-b border-[#E8E8E8] px-6 py-3 flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 border border-[#E8E8E8] rounded text-xs text-[#7A7A7A] bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Период:
                </div>
                <Select
                  value={reportDays.toString()}
                  onValueChange={(value) => setReportDays(Number(value))}
                >
                  <SelectTrigger className="w-[120px] h-9 bg-white border-[#E8E8E8] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">За 7 дней</SelectItem>
                    <SelectItem value="14">За 14 дней</SelectItem>
                    <SelectItem value="30">За 30 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateReport}
                disabled={generating}
                className="bg-[#0D0D0D] hover:bg-[#000000] text-white px-4 py-2 h-auto font-medium text-xs"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 mr-2" />
                    Создать
                  </>
                )}
              </Button>
            </div>

            {/* Reports List */}
            <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7A7A7A]" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-[#7A7A7A]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Репортов пока нет</p>
                  <p className="text-xs mt-1">Нажмите "Создать" для генерации отчета</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report, index) => (
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
                            {report.is_approved && (
                              <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                                <Check className="w-3 h-3" />
                                Подтвержден
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
                        <div className="p-6 bg-white border-t border-[#E8E8E8]">
                          {editingReportId === report.id ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <Textarea
                                value={editedReportText}
                                onChange={(e) => setEditedReportText(e.target.value)}
                                className="min-h-[300px] text-[13px] leading-relaxed font-[Inter] resize-none"
                                style={{ fontFamily: 'Inter, sans-serif' }}
                              />
                              <div className="flex items-center justify-end gap-3">
                                <Button
                                  onClick={cancelEditingReport}
                                  variant="outline"
                                  size="sm"
                                  disabled={savingReport}
                                  className="gap-2"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Отмена
                                </Button>
                                <Button
                                  onClick={() => saveReport(report.id)}
                                  disabled={savingReport}
                                  size="sm"
                                  className="bg-[#0D0D0D] hover:bg-[#000000] text-white gap-2"
                                >
                                  {savingReport ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Сохранение...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      Сохранить
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="space-y-4">
                              <div className="bg-[#FAFAFA] border border-[#E8E8E8] rounded-lg p-6">
                                <div className="text-[13px] text-[#0D0D0D] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {report.ai_report}
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-3">
                                <Button
                                  onClick={() => startEditingReport(report)}
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Редактировать
                                </Button>
                                {report.is_approved ? (
                                  <Button
                                    onClick={() => toggleApproveReport(report)}
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Отменить подтверждение
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => toggleApproveReport(report)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Подтвердить
                                  </Button>
                                )}
                              </div>
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
        ) : (
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-12 text-center sticky top-6">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Выберите студента</p>
            <p className="text-xs text-slate-400 mt-1">
              Нажмите на студента в таблице, чтобы увидеть его отчеты
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
