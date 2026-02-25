import { createBrowserRouter, Navigate } from "react-router";
import { HomePage } from "./pages/HomePage";
import { GroupPage } from "./pages/GroupPage";
import { StudentsPage } from "./pages/StudentsPage";
import { ExamsPage } from "./pages/ExamsPage";
import { SchoolPage } from "./pages/SchoolPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { FinancesPage } from "./pages/FinancesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ReportFormPage } from "./pages/ReportFormPage";
import { TasksPage } from "./pages/TasksPage";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: "group/:groupId",
        Component: GroupPage,
      },
      {
        path: "students",
        Component: StudentsPage,
      },
      {
        path: "students/:studentId",
        Component: StudentsPage,
      },
      {
        path: "exams",
        Component: ExamsPage,
      },
      {
        path: "school",
        Component: SchoolPage,
      },
      {
        path: "analytics",
        Component: AnalyticsPage,
      },
      {
        path: "finances",
        Component: FinancesPage,
      },
      {
        path: "reports",
        Component: ReportsPage,
      },
      {
        path: "reports/:reportId",
        Component: ReportFormPage,
      },
      {
        path: "reports/new",
        Component: ReportFormPage,
      },
      {
        path: "tasks",
        Component: TasksPage,
      },
    ],
  },
]);