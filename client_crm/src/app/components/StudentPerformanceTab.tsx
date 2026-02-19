import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, FileText, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { getGradeColor, getAttendanceColor } from "../lib/gradeUtils";
import type { StudentPerformanceResponse, StudentPerformanceRecord, GroupInfo, WeeklyReport } from "../types/api";

interface StudentPerformanceTabProps {
  studentId: string;
  studentGroups: GroupInfo[];
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

export function StudentPerformanceTab({ studentId, studentGroups }: StudentPerformanceTabProps) {
  const [performanceData, setPerformanceData] = useState<StudentPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<{
    report: string;
    period: { start: string; end: string };
    stats: {
      attendance_count: number;
      absent_count: number;
      late_count: number;
      homework_completed: number;
      homework_total: number;
    };
    generatedAt?: Date;
  } | null>(null);
  const [reportDays, setReportDays] = useState<number>(7);
  const [reportsHistory, setReportsHistory] = useState<WeeklyReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadPerformanceData();
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
      const report = await api.generateWeeklyReport(studentId, reportDays);
      setWeeklyReport({
        ...report,
        generatedAt: new Date()
      });
      toast.success(weeklyReport ? "Отчет пересоздан" : "Отчет успешно сгенерирован");
      // Перезагрузить историю после создания нового репорта
      loadReportsHistory();
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

  const toggleHistory = () => {
    if (!showHistory && reportsHistory.length === 0) {
      loadReportsHistory();
    }
    setShowHistory(!showHistory);
  };

  const copyReportToClipboard = async () => {
    if (!weeklyReport) return;
    try {
      await navigator.clipboard.writeText(weeklyReport.report);
      toast.success("Отчет скопирован в буфер обмена");
    } catch (err) {
      toast.error("Не удалось скопировать отчет");
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

  // Calculate statistics
  const absenceCount = useMemo(() => {
    return filteredRecords.filter((r) => r.attendance === "absent").length;
  }, [filteredRecords]);

  const incompleteHomework = useMemo(() => {
    return filteredRecords.filter((r) => !r.homework_grade || r.homework_grade === "0").length;
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
      <Card className="p-8">
        <div className="text-center text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Нет данных об успеваемости</p>
          <p className="text-sm mt-1">Студент пока не посещал проведенные уроки</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Report Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Еженедельный отчет для родителей</h3>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={reportDays.toString()}
                onValueChange={(value) => {
                  setReportDays(Number(value));
                  // Сбросить отчет при смене периода
                  setWeeklyReport(null);
                }}
              >
                <SelectTrigger className="w-[150px]">
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : weeklyReport ? (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Пересоздать отчет
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Сгенерировать отчет
                  </>
                )}
              </Button>
            </div>
          </div>

          {weeklyReport && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-600">
                    <div>Период: {new Date(weeklyReport.period.start).toLocaleDateString('ru-RU')} -{' '}
                    {new Date(weeklyReport.period.end).toLocaleDateString('ru-RU')}</div>
                    {weeklyReport.generatedAt && (
                      <div className="text-xs text-slate-500 mt-1">
                        Создан: {weeklyReport.generatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={copyReportToClipboard}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Копировать
                    </Button>
                  </div>
                </div>

                {/* Текст отчета от AI */}
                <div className="bg-white rounded-md p-5 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">📋 Отчет от администрации школы</h4>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-base">
                      {weeklyReport.report}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!weeklyReport && !generatingReport && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">
                Нажмите "Сгенерировать отчет", чтобы создать краткое резюме успеваемости студента
              </p>
              <p className="text-xs mt-2 text-slate-400">
                Отчет будет содержать информацию о посещениях, выполнении ДЗ и комментарии преподавателей
              </p>
              <p className="text-xs mt-2 text-slate-400">
                💡 Совет: Можно пересоздать отчет в любой момент или изменить период
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports History Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-900">История репортов</h3>
              {reportsHistory.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {reportsHistory.length}
                </span>
              )}
            </div>
            <Button
              onClick={toggleHistory}
              variant="outline"
              size="sm"
            >
              {showHistory ? "Скрыть" : "Показать историю"}
            </Button>
          </div>

          {showHistory && (
            <div className="space-y-4">
              {loadingHistory && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              )}

              {!loadingHistory && reportsHistory.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">История репортов пуста</p>
                  <p className="text-xs mt-1">Созданные репорты будут сохраняться здесь</p>
                </div>
              )}

              {!loadingHistory && reportsHistory.length > 0 && (
                <div className="space-y-3">
                  {reportsHistory.map((report) => (
                    <div
                      key={report.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-700">
                            📅 Период: {new Date(report.period_start).toLocaleDateString('ru-RU')} -{' '}
                            {new Date(report.period_end).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Создан: {new Date(report.created_at).toLocaleDateString('ru-RU')}{' '}
                            в {new Date(report.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* Отчет от администрации */}
                      <div className="bg-white border border-slate-200 rounded p-4">
                        <div className="text-sm font-semibold text-slate-700 mb-3">📋 Отчет от администрации школы</div>
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {report.ai_report}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Filter and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">Предмет:</span>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[200px]">
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

        <div className="flex items-center gap-6 bg-white rounded-lg px-6 py-3 border">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{absenceCount}</div>
            <div className="text-xs text-slate-600 mt-1">Пропусков</div>
          </div>
          <div className="h-10 w-px bg-slate-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{incompleteHomework}</div>
            <div className="text-xs text-slate-600 mt-1">ДЗ не сделано</div>
          </div>
        </div>
      </div>


      {/* Performance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {filteredRecords.length > 0 ? (
              <table className="border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="sticky left-0 z-10 bg-slate-50 border-r text-left px-2 py-1.5 text-sm font-semibold text-slate-700 min-w-[120px]">
                      Тип
                    </th>
                    {filteredRecords.map((record) => (
                      <th
                        key={record.lesson_id}
                        className="border-r text-center px-0 py-1.5 text-sm font-semibold text-slate-700"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition-colors px-1">
                              {formatDateShort(record.lesson_date)}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Дата и время:</h4>
                                <p className="text-sm text-slate-600">{formatDate(record.lesson_date)} {formatTime(record.lesson_time)}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Предмет:</h4>
                                <p className="text-sm text-slate-600">{record.subject_name}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Тема урока:</h4>
                                <p className="text-sm text-slate-600">{record.lesson_topic || "Не указана"}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Домашнее задание:</h4>
                                <p className="text-sm text-slate-600">{record.lesson_homework || "Не указано"}</p>
                              </div>
                              {record.comment && (
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 mb-1">Комментарий:</h4>
                                  <p className="text-sm text-slate-600">{record.comment}</p>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-2 py-1.5 text-sm font-medium text-slate-900">
                      Посещение
                    </td>
                    {filteredRecords.map((record) => (
                      <td key={record.lesson_id} className="border-r p-0">
                        <div
                          className="h-10 flex items-center justify-center text-xs font-semibold"
                          style={{
                            backgroundColor: getAttendanceColor(record.attendance, true),
                            color: "white"
                          }}
                        >
                          {getAttendanceDisplay(record.attendance)}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-2 py-1.5 text-sm font-medium text-slate-900">
                      Домашняя работа
                    </td>
                    {filteredRecords.map((record) => (
                      <td key={record.lesson_id} className="border-r p-0">
                        <div
                          className="h-10 flex items-center justify-center text-xs font-semibold"
                          style={{
                            backgroundColor: getGradeColor(record.homework_grade, true),
                            color: record.homework_grade ? "white" : "#94a3b8"
                          }}
                        >
                          {record.homework_grade || "-"}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-2 py-1.5 text-sm font-medium text-slate-900">
                      Работа на уроке
                    </td>
                    {filteredRecords.map((record) => (
                      <td key={record.lesson_id} className="border-r p-0">
                        <div
                          className="h-10 flex items-center justify-center text-xs font-semibold"
                          style={{
                            backgroundColor: getGradeColor(record.lesson_grade, true),
                            color: record.lesson_grade ? "white" : "#94a3b8"
                          }}
                        >
                          {record.lesson_grade || "-"}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-slate-500">
                Нет уроков, соответствующих выбранному фильтру
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Комментарии к урокам</h3>
          <div className="space-y-4">
            {filteredRecords.filter((r) => r.comment).length > 0 ? (
              filteredRecords
                .filter((r) => r.comment)
                .map((record) => (
                  <div key={record.lesson_id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">{formatDate(record.lesson_date)}</span>
                        <span className="text-sm text-slate-500">{formatTime(record.lesson_time)}</span>
                        <span className="text-sm text-slate-600">{record.subject_name}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{record.comment}</p>
                  </div>
                ))
            ) : (
              <p className="text-center text-slate-500 py-8">Комментариев пока нет</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
