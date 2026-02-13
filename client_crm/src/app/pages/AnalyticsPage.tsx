import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { TrendingUp, Users, Calendar, Award } from "lucide-react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  color: string;
}

const stats: StatCard[] = [
  {
    title: "Посещаемость",
    value: "87%",
    change: "+3% от прошлого месяца",
    trend: "up",
    icon: Calendar,
    color: "bg-blue-500",
  },
  {
    title: "Средний балл",
    value: "4.2",
    change: "+0.3 от прошлого месяца",
    trend: "up",
    icon: Award,
    color: "bg-green-500",
  },
  {
    title: "Активных студентов",
    value: "143",
    change: "+12 за последний месяц",
    trend: "up",
    icon: Users,
    color: "bg-purple-500",
  },
  {
    title: "Проведено уроков",
    value: "256",
    change: "+18 за последний месяц",
    trend: "up",
    icon: TrendingUp,
    color: "bg-orange-500",
  },
];

interface GroupPerformance {
  group: string;
  subject: string;
  students: number;
  attendance: number;
  avgGrade: number;
}

const groupPerformance: GroupPerformance[] = [
  {
    group: "Математика 11А",
    subject: "Математика",
    students: 12,
    attendance: 92,
    avgGrade: 4.5,
  },
  {
    group: "Физика 10Б",
    subject: "Физика",
    students: 10,
    attendance: 88,
    avgGrade: 4.2,
  },
  {
    group: "Русский язык 9В",
    subject: "Русский язык",
    students: 15,
    attendance: 85,
    avgGrade: 4.0,
  },
  {
    group: "Английский 11Г",
    subject: "Английский язык",
    students: 14,
    attendance: 90,
    avgGrade: 4.3,
  },
];

interface TeacherLoad {
  teacher: string;
  groups: number;
  students: number;
  lessons: number;
  attendance: number;
}

const teacherLoad: TeacherLoad[] = [
  {
    teacher: "Божко В.Д.",
    groups: 5,
    students: 32,
    lessons: 48,
    attendance: 89,
  },
  {
    teacher: "Иванова А.С.",
    groups: 4,
    students: 25,
    lessons: 38,
    attendance: 91,
  },
  {
    teacher: "Петров И.М.",
    groups: 6,
    students: 38,
    lessons: 52,
    attendance: 87,
  },
];

export function AnalyticsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">
          Аналитика и статистика
        </h1>
        <p className="text-slate-600 mt-1">
          Общая статистика по школе и успеваемости
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {stat.value}
                    </p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
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

      {/* Group Performance */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Успеваемость по группам</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    Группа
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    Предмет
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                    Студентов
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                    Посещаемость
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                    Средний балл
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupPerformance.map((group) => (
                  <tr key={group.group} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {group.group}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {group.subject}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                        {group.students}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              group.attendance >= 90
                                ? "bg-green-500"
                                : group.attendance >= 80
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${group.attendance}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-12 text-right">
                          {group.attendance}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        {group.avgGrade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Load */}
      <Card>
        <CardHeader>
          <CardTitle>Загрузка учителей</CardTitle>
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
                    Групп
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                    Студентов
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                    Уроков за месяц
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                    Посещаемость
                  </th>
                </tr>
              </thead>
              <tbody>
                {teacherLoad.map((teacher) => (
                  <tr key={teacher.teacher} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {teacher.teacher.charAt(0)}
                        </div>
                        <div className="font-medium text-slate-900">
                          {teacher.teacher}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                        {teacher.groups}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                        {teacher.students}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-slate-900">
                        {teacher.lessons}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              teacher.attendance >= 90
                                ? "bg-green-500"
                                : teacher.attendance >= 80
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${teacher.attendance}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-12 text-right">
                          {teacher.attendance}%
                        </span>
                      </div>
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
