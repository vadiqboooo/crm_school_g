import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { DailyReport } from "../types/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Ошибка при загрузке отчетов");
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkday = async () => {
    try {
      setCreating(true);

      // Check if there's already an active draft report for current user
      const activeDraft = reports.find(report =>
        report.status === "draft" && report.employee_id === user?.id
      );
      if (activeDraft) {
        // Navigate to existing draft instead of creating a new one
        navigate(`/reports/${activeDraft.id}`);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const newReport = await api.createReport({
        date: today,
        start_time: currentTime,
        status: "draft",
        churn_students: [],
        notified_students: [],
      });

      toast.success("Рабочий день начат");
      navigate(`/reports/${newReport.id}`);
    } catch (error) {
      console.error("Failed to create report:", error);
      toast.error("Ошибка при создании отчета");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    try {
      setDeleting(true);
      await api.deleteReport(reportToDelete);
      setReports(reports.filter(r => r.id !== reportToDelete));
      toast.success("Отчет удален");
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Ошибка при удалении отчета");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateDuration = (report: DailyReport) => {
    if (!report.start_time || !report.end_time || report.status === "draft") return null;

    const [startHours, startMinutes] = report.start_time.split(':').map(Number);
    const [endHours, endMinutes] = report.end_time.split(':').map(Number);

    const startTotalMins = startHours * 60 + startMinutes;
    const endTotalMins = endHours * 60 + endMinutes;

    const diffMins = endTotalMins - startTotalMins;

    if (diffMins < 0) return null; // Invalid time range
    if (diffMins < 60) return `${diffMins}м`;

    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hrs}ч ${mins}м` : `${hrs}ч`;
  };

  const getTotalLeads = (report: DailyReport) => {
    return report.lead_calls + report.lead_social + report.lead_website;
  };

  const getTotalRevenue = (report: DailyReport) => {
    const total = report.cash_income + report.cashless_income;
    return total > 0 ? `${total.toLocaleString('ru-RU')} ₽` : null;
  };

  const hasActiveDraft = reports.some(report =>
    report.status === "draft" && report.employee_id === user?.id
  );

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
          <h1 className="text-3xl font-semibold text-slate-900">Отчеты</h1>
          {user?.role === "admin" && (
            <p className="text-slate-600 mt-1">Отчеты всех менеджеров</p>
          )}
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800"
          onClick={handleStartWorkday}
          disabled={creating}
        >
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Загрузка...
            </>
          ) : (
            hasActiveDraft ? "Продолжить рабочий день" : "Начать рабочий день"
          )}
        </Button>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    ДАТА
                  </th>
                  {user?.role === "admin" && (
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      МЕНЕДЖЕР
                    </th>
                  )}
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    ЛИДЫ
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    ПРОБНЫЕ
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    ДЕНЬГИ
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    ПРОДОЛЖИТЕЛЬНОСТЬ
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    ЗАДАЧИ
                  </th>
                  <th className="w-12 px-6 py-4"></th>
                  {user?.role === "admin" && (
                    <th className="w-12 px-6 py-4"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === "admin" ? 9 : 7} className="px-6 py-12 text-center text-slate-500">
                      Отчетов пока нет. Начните рабочий день, чтобы создать первый отчет.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const totalLeads = getTotalLeads(report);
                    const revenue = getTotalRevenue(report);
                    const duration = calculateDuration(report);

                    return (
                      <tr
                        key={report.id}
                        className="border-b hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {formatDate(report.date)}
                        </td>
                        {user?.role === "admin" && (
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {report.employee ?
                              `${report.employee.first_name} ${report.employee.last_name}` :
                              "—"
                            }
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {totalLeads > 0 ? totalLeads : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {report.trial_attended > 0 || report.trial_scheduled > 0
                            ? `${report.trial_attended}/${report.trial_scheduled}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {revenue ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          {report.status === "draft" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Онлайн
                            </span>
                          ) : (
                            <span className="text-sm text-slate-900">
                              {duration ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {report.tasks && report.tasks.length > 0 && (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold">
                              {report.tasks.length}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </td>
                        {user?.role === "admin" && (
                          <td className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteClick(report.id, e)}
                              className="h-8 w-8 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить отчет?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Отчет будет удален безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
