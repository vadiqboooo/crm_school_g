import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AlertTriangle, ChevronDown, ChevronRight, DollarSign, Loader2, TrendingUp, Users } from "lucide-react";
import { api } from "../lib/api";
import type { Payment, EmployeeSalary, Student } from "../types/api";

interface TeacherGroup {
  employee_id: string;
  employee_name: string;
  records: EmployeeSalary[];
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
}

function statusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Оплачено</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ожидает</Badge>;
    case "overdue":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Просрочено</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function salaryStatusBadge(status: string) {
  return status === "paid"
    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Выплачено</Badge>
    : <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Не выплачено</Badge>;
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

export function FinancesPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [payingAll, setPayingAll] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, st] = await Promise.all([api.getPayments(), api.getSalaries(), api.getStudents()]);
      setPayments(p);
      setSalaries(s);
      setStudents(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group salaries by teacher
  const teacherGroups: TeacherGroup[] = Object.values(
    salaries.reduce((acc, s) => {
      const key = s.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employee_id: s.employee_id,
          employee_name: s.employee_name || "—",
          records: [],
          totalPending: 0,
          totalPaid: 0,
          pendingCount: 0,
        };
      }
      acc[key].records.push(s);
      if (s.status === "pending") {
        acc[key].totalPending += s.total || 0;
        acc[key].pendingCount++;
      } else {
        acc[key].totalPaid += s.total || 0;
      }
      return acc;
    }, {} as Record<string, TeacherGroup>)
  ).sort((a, b) => b.totalPending - a.totalPending);

  const totalIncome = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalSalaryPending = salaries
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const toggleTeacher = (id: string) => {
    setExpandedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePayAll = async (group: TeacherGroup) => {
    setPayingAll(group.employee_id);
    try {
      const pending = group.records.filter((r) => r.status === "pending");
      await Promise.all(pending.map((r) => api.updateSalary(r.id, { status: "paid" })));
      await load();
    } finally {
      setPayingAll(null);
    }
  };

  const handlePayRecord = async (id: string) => {
    await api.updateSalary(id, { status: "paid" });
    await load();
  };

  // Students awaiting payment: debt (balance < 0) or ≤2 lessons remaining
  const awaitingPayment = students
    .filter((s) => {
      if (!s.subscription_plan) return false;
      const hasDebt = (s.balance ?? 0) < 0;
      const lowLessons = s.lessons_remaining !== null && s.lessons_remaining !== undefined && s.lessons_remaining <= 2;
      return hasDebt || lowLessons;
    })
    .sort((a, b) => {
      const aDebt = (a.balance ?? 0) < 0;
      const bDebt = (b.balance ?? 0) < 0;
      if (aDebt && !bDebt) return -1;
      if (!aDebt && bDebt) return 1;
      // Both debt: bigger debt first
      if (aDebt && bDebt) return (a.balance ?? 0) - (b.balance ?? 0);
      // Both low lessons: fewer lessons first
      return (a.lessons_remaining ?? 99) - (b.lessons_remaining ?? 99);
    });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Финансы</h1>
        <p className="text-slate-600 mt-1">Учёт оплат студентов и зарплат учителей</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Поступления (оплачено)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₽{fmt(totalIncome)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Ожидают оплаты</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₽{fmt(totalPending)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {payments.filter((p) => p.status !== "paid").length} платежей
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">К выплате учителям</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₽{fmt(totalSalaryPending)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {salaries.filter((s) => s.status === "pending").length} записей
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="awaiting" className="space-y-4">
        <TabsList>
          <TabsTrigger value="awaiting" className="flex items-center gap-1.5">
            Ожидают оплаты
            {awaitingPayment.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold leading-none">
                {awaitingPayment.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Поступления от студентов</TabsTrigger>
          <TabsTrigger value="salaries">Зарплаты учителей</TabsTrigger>
        </TabsList>

        {/* Awaiting payment tab */}
        <TabsContent value="awaiting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Требуют пополнения баланса
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : awaitingPayment.length === 0 ? (
                <div className="py-12 text-center text-slate-400">Все студенты в порядке</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50 text-sm font-semibold text-slate-600">
                        <th className="text-left px-6 py-3">Студент</th>
                        <th className="text-left px-6 py-3">Абонемент</th>
                        <th className="text-center px-6 py-3">Осталось уроков</th>
                        <th className="text-right px-6 py-3">Баланс</th>
                        <th className="text-center px-6 py-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awaitingPayment.map((s) => {
                        const hasDebt = (s.balance ?? 0) < 0;
                        return (
                          <tr key={s.id} className={`border-b hover:bg-slate-50 ${hasDebt ? "bg-red-50/40" : ""}`}>
                            <td className="px-6 py-3">
                              <span className="font-medium text-slate-900">
                                {s.last_name} {s.first_name}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-500">
                              {s.subscription_plan?.name ?? "—"}
                            </td>
                            <td className="px-6 py-3 text-center">
                              {s.lessons_remaining !== null && s.lessons_remaining !== undefined ? (
                                <span className={`font-semibold ${s.lessons_remaining <= 0 ? "text-red-600" : s.lessons_remaining === 1 ? "text-orange-500" : "text-yellow-600"}`}>
                                  {s.lessons_remaining}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <span className={`font-semibold ${hasDebt ? "text-red-600" : "text-slate-700"}`}>
                                {hasDebt ? "−" : ""}₽{fmt(Math.abs(s.balance ?? 0))}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-center">
                              {hasDebt ? (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Долг</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Мало уроков</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>История поступлений</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center text-slate-400">Платежей пока нет</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50 text-sm font-semibold text-slate-600">
                        <th className="text-left px-6 py-3">Студент</th>
                        <th className="text-left px-6 py-3">Группа</th>
                        <th className="text-right px-6 py-3">Сумма</th>
                        <th className="text-left px-6 py-3">Дата</th>
                        <th className="text-center px-6 py-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-slate-50">
                          <td className="px-6 py-3">
                            <span className="font-medium text-slate-900">
                              {p.student_name || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500">
                            {p.group_name ? (
                              p.group_name
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 font-medium">Пополнение баланса</span>
                                {p.description && <span className="text-slate-400">· {p.description}</span>}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="font-semibold text-emerald-600">
                              +₽{fmt(p.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500">
                            {new Date(p.created_at).toLocaleDateString("ru-RU")}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {statusBadge(p.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salaries tab */}
        <TabsContent value="salaries">
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : teacherGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-400">
                  Записей о зарплатах пока нет. Они появятся после проведения уроков учителями с установленными ставками.
                </CardContent>
              </Card>
            ) : (
              teacherGroups.map((group) => {
                const isExpanded = expandedTeachers.has(group.employee_id);
                const isPaying = payingAll === group.employee_id;
                return (
                  <Card key={group.employee_id}>
                    {/* Teacher summary row */}
                    <div
                      className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 rounded-t-lg"
                      onClick={() => toggleTeacher(group.employee_id)}
                    >
                      <button className="text-slate-400">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                        {group.employee_name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900">{group.employee_name}</div>
                        <div className="text-xs text-slate-400">
                          {group.records.length} уроков · выплачено ₽{fmt(group.totalPaid)}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-slate-900">
                          ₽{fmt(group.totalPending)}
                        </div>
                        <div className="text-xs text-slate-400">к выплате</div>
                      </div>

                      {group.pendingCount > 0 && (
                        <Button
                          size="sm"
                          disabled={isPaying}
                          onClick={(e) => { e.stopPropagation(); handlePayAll(group); }}
                        >
                          {isPaying
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            : null}
                          Выплатить всё
                        </Button>
                      )}
                      {group.pendingCount === 0 && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Выплачено
                        </Badge>
                      )}
                    </div>

                    {/* Expanded lesson records */}
                    {isExpanded && (
                      <CardContent className="p-0 border-t">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                              <th className="text-left px-6 py-2">Описание</th>
                              <th className="text-center px-4 py-2">Студентов</th>
                              <th className="text-right px-4 py-2">Ставка</th>
                              <th className="text-right px-4 py-2">Итого</th>
                              <th className="text-center px-4 py-2">Статус</th>
                              <th className="px-4 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.records.map((r) => (
                              <tr key={r.id} className="border-t hover:bg-slate-50">
                                <td className="px-6 py-2.5 text-sm text-slate-700 max-w-xs">
                                  <div>{r.description || `Урок от ${new Date(r.created_at).toLocaleDateString("ru-RU")}`}</div>
                                </td>
                                <td className="px-4 py-2.5 text-center text-sm text-slate-500">
                                  {r.students_count ?? "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm text-slate-500">
                                  ₽{fmt(r.rate || 0)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                  ₽{fmt(r.total || 0)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {salaryStatusBadge(r.status)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {r.status === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs h-7"
                                      onClick={() => handlePayRecord(r.id)}
                                    >
                                      Выплатить
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
