import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { getGradeColor, getAttendanceColor } from "../lib/gradeUtils";
import type { StudentPerformanceResponse, StudentPerformanceRecord, GroupInfo } from "../types/api";

interface StudentPerformanceTabProps {
  studentId: string;
  studentGroups: GroupInfo[];
}

const monthNames = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const getAttendanceLabel = (attendance?: string) => {
  switch (attendance) {
    case "present": return "Присутствовал";
    case "absent": return "Отсутствовал";
    case "late": return "Опоздал";
    case "trial": return "Пробный";
    default: return "—";
  }
};

export function StudentPerformanceTab({ studentId, studentGroups }: StudentPerformanceTabProps) {
  const [performanceData, setPerformanceData] = useState<StudentPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "month" | "range" | "group">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    loadPerformanceData();
  }, [studentId]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentPerformance(studentId);
      setPerformanceData(data);

      // Set default month to current month
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setSelectedMonth(currentMonthKey);
    } catch (err) {
      console.error("Failed to load performance data:", err);
      toast.error("Не удалось загрузить данные об успеваемости");
    } finally {
      setLoading(false);
    }
  };

  // Get available months from performance data
  const availableMonths = useMemo(() => {
    if (!performanceData) return [];

    const months = new Set<string>();
    performanceData.performance_records.forEach((record) => {
      const date = new Date(record.lesson_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthKey);
    });

    return Array.from(months).sort().reverse();
  }, [performanceData]);

  // Filter performance records based on selected filter
  const filteredRecords = useMemo(() => {
    if (!performanceData) return [];

    let filtered = [...performanceData.performance_records];

    if (filterType === "month" && selectedMonth) {
      filtered = filtered.filter((record) => {
        const date = new Date(record.lesson_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === selectedMonth;
      });
    } else if (filterType === "range") {
      if (startDate) {
        filtered = filtered.filter((record) => record.lesson_date >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter((record) => record.lesson_date <= endDate);
      }
    } else if (filterType === "group" && selectedGroup) {
      filtered = filtered.filter((record) => record.group_id === selectedGroup);
    }

    return filtered;
  }, [performanceData, filterType, selectedMonth, selectedGroup, startDate, endDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Тип фильтра</Label>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все уроки</SelectItem>
                <SelectItem value="month">По месяцу</SelectItem>
                <SelectItem value="range">По диапазону дат</SelectItem>
                <SelectItem value="group">По группе</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "month" && (
            <div>
              <Label>Месяц</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите месяц" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((monthKey) => {
                    const [year, month] = monthKey.split("-");
                    const monthIndex = parseInt(month) - 1;
                    return (
                      <SelectItem key={monthKey} value={monthKey}>
                        {monthNames[monthIndex]} {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === "range" && (
            <>
              <div>
                <Label>Дата начала</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Дата окончания</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {filterType === "group" && (
            <div>
              <Label>Группа</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {studentGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Performance Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Группа</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Посещение</TableHead>
                <TableHead>Оценка за урок</TableHead>
                <TableHead>Оценка за ДЗ</TableHead>
                <TableHead>Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.lesson_id}>
                    <TableCell className="font-medium">
                      {formatDate(record.lesson_date)}
                    </TableCell>
                    <TableCell>{formatTime(record.lesson_time)}</TableCell>
                    <TableCell>{record.group_name}</TableCell>
                    <TableCell>{record.subject_name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {record.lesson_topic || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: getAttendanceColor(record.attendance, true),
                          color: "#000",
                        }}
                      >
                        {getAttendanceLabel(record.attendance)}
                        {record.late_minutes && record.late_minutes > 0 && ` (${record.late_minutes} мин)`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.lesson_grade ? (
                        <div
                          className="inline-block px-3 py-1 rounded text-center font-medium min-w-[40px]"
                          style={{
                            backgroundColor: getGradeColor(record.lesson_grade, true),
                            color: "#000",
                          }}
                        >
                          {record.lesson_grade}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.homework_grade ? (
                        <div
                          className="inline-block px-3 py-1 rounded text-center font-medium min-w-[40px]"
                          style={{
                            backgroundColor: getGradeColor(record.homework_grade, true),
                            color: "#000",
                          }}
                        >
                          {record.homework_grade}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      {record.comment ? (
                        <span className="text-sm">{record.comment}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Нет уроков, соответствующих выбранному фильтру
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {filteredRecords.length}
            </div>
            <div className="text-sm text-slate-600">Всего уроков</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {filteredRecords.filter((r) => r.attendance === "present").length}
            </div>
            <div className="text-sm text-slate-600">Присутствовал</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredRecords.filter((r) => r.attendance === "late").length}
            </div>
            <div className="text-sm text-slate-600">Опозданий</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {filteredRecords.filter((r) => r.attendance === "absent").length}
            </div>
            <div className="text-sm text-slate-600">Пропусков</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
