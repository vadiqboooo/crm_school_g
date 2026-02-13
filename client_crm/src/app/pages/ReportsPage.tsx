import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChevronDown } from "lucide-react";

interface Report {
  id: string;
  date: string;
  leads: number | null;
  trials: string | null;
  revenue: string | null;
  duration: string | null;
  tasks: number | null;
  status: "online" | "completed";
}

const mockReports: Report[] = [
  {
    id: "1",
    date: "9 февраля 2026 г.",
    leads: null,
    trials: null,
    revenue: null,
    duration: null,
    tasks: 2,
    status: "online",
  },
  {
    id: "2",
    date: "8 февраля 2026 г.",
    leads: 6,
    trials: "2/3",
    revenue: "27800 ₽",
    duration: "37м",
    tasks: 1,
    status: "completed",
  },
];

export function ReportsPage() {
  const navigate = useNavigate();
  const [reports] = useState<Report[]>(mockReports);

  const handleStartWorkday = () => {
    navigate("/reports/new");
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Отчеты</h1>
        <Button 
          className="bg-slate-900 hover:bg-slate-800"
          onClick={handleStartWorkday}
        >
          Начать рабочий день
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
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {report.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {report.leads ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {report.trials ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {report.revenue ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {report.status === "online" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Онлайн
                        </span>
                      ) : (
                        <span className="text-sm text-slate-900">
                          {report.duration}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {report.tasks !== null && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold">
                          {report.tasks}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
