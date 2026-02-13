import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DollarSign, TrendingUp, Users, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface FinanceStats {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  color: string;
}

const financeStats: FinanceStats[] = [
  {
    title: "Доход за месяц",
    value: "₽485,000",
    change: "+12% от прошлого месяца",
    icon: DollarSign,
    color: "bg-green-500",
  },
  {
    title: "Расходы за месяц",
    value: "₽320,000",
    change: "+5% от прошлого месяца",
    icon: TrendingUp,
    color: "bg-red-500",
  },
  {
    title: "Оплативших студентов",
    value: "138/143",
    change: "96% оплатили",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    title: "Ожидают оплаты",
    value: "5",
    change: "₽25,000",
    icon: Clock,
    color: "bg-orange-500",
  },
];

interface StudentPayment {
  id: string;
  name: string;
  group: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
}

const mockPayments: StudentPayment[] = [
  {
    id: "1",
    name: "Антипин Саша",
    group: "Математика 11А",
    amount: 8000,
    status: "paid",
    dueDate: "2026-02-01",
  },
  {
    id: "2",
    name: "Бяков Матвей",
    group: "Математика 11А",
    amount: 8000,
    status: "paid",
    dueDate: "2026-02-01",
  },
  {
    id: "3",
    name: "Килин Егор",
    group: "Физика 10Б",
    amount: 7500,
    status: "pending",
    dueDate: "2026-02-15",
  },
  {
    id: "4",
    name: "Алиев Андрей",
    group: "Математика 11А",
    amount: 8000,
    status: "overdue",
    dueDate: "2026-01-30",
  },
];

interface TeacherSalary {
  id: string;
  name: string;
  lessons: number;
  rate: number;
  total: number;
  status: "paid" | "pending";
}

const mockSalaries: TeacherSalary[] = [
  {
    id: "1",
    name: "Божко В.Д.",
    lessons: 48,
    rate: 1500,
    total: 72000,
    status: "paid",
  },
  {
    id: "2",
    name: "Иванова А.С.",
    lessons: 38,
    rate: 1500,
    total: 57000,
    status: "paid",
  },
  {
    id: "3",
    name: "Петров И.М.",
    lessons: 52,
    rate: 1500,
    total: 78000,
    status: "pending",
  },
];

export function FinancesPage() {
  const [payments] = useState<StudentPayment[]>(mockPayments);
  const [salaries] = useState<TeacherSalary[]>(mockSalaries);
  const [filterMonth, setFilterMonth] = useState("2026-02");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Оплачено";
      case "pending":
        return "Ожидает";
      case "overdue":
        return "Просрочено";
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Финансы</h1>
          <p className="text-slate-600 mt-1">
            Учет оплат студентов и зарплаты у��ителей
          </p>
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026-02">Февраль 2026</SelectItem>
            <SelectItem value="2026-01">Январь 2026</SelectItem>
            <SelectItem value="2025-12">Декабрь 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {financeStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {stat.change}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payments">Оплаты студентов</TabsTrigger>
          <TabsTrigger value="salaries">Зарплаты учителей</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Оплаты за {filterMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Студент
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Группа
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Сумма
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Срок оплаты
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                        Статус
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {payment.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {payment.group}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900">
                            ₽{payment.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(payment.dueDate).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                              payment.status
                            )}`}
                          >
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {payment.status !== "paid" && (
                            <Button size="sm" variant="outline">
                              Отметить оплату
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries">
          <Card>
            <CardHeader>
              <CardTitle>Зарплаты за {filterMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Учитель
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                        Уроков
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Ставка
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Итого
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                        Статус
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map((salary) => (
                      <tr key={salary.id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {salary.name.charAt(0)}
                            </div>
                            <div className="font-medium text-slate-900">
                              {salary.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                            {salary.lessons}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">
                          ₽{salary.rate.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-lg font-bold text-slate-900">
                            ₽{salary.total.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                              salary.status
                            )}`}
                          >
                            {getStatusText(salary.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {salary.status !== "paid" && (
                            <Button size="sm" variant="outline">
                              Отметить выплату
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
