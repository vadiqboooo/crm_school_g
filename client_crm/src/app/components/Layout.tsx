import { Outlet, useLocation, Link, useNavigate } from "react-router";
import { Sparkles, Users, GraduationCap, School, BarChart3, Wallet, ClipboardList, LogOut, FileText, ChevronLeft, ChevronRight, CheckSquare, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useTasksWebSocket } from "../hooks/useTasksWebSocket";
import { showTaskNotification, initializeAudio } from "../utils/notifications";
import { useHeaderActions } from "../contexts/HeaderActionsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { api } from "../lib/api";

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isManager = user?.role === "manager";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { headerActions } = useHeaderActions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uncompletedLessonsCount, setUncompletedLessonsCount] = useState(0);
  const [lastReportsUrl, setLastReportsUrl] = useState("/reports");

  const adminNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/students", icon: GraduationCap, label: "Клиенты" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
    { path: "/school", icon: School, label: "Школа" },
    { path: "/analytics", icon: BarChart3, label: "Аналитика" },
    { path: "/finances", icon: Wallet, label: "Финансы" },
    { path: "/reports", icon: ClipboardList, label: "Отчеты" },
    { path: "/tasks", icon: CheckSquare, label: "Задачи" },
  ];

  const managerNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/students", icon: GraduationCap, label: "Клиенты" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
    { path: "/reports", icon: ClipboardList, label: "Отчеты" },
  ];

  const teacherNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
  ];

  const navItems = isAdmin ? adminNavItems : isManager ? managerNavItems : teacherNavItems;

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Track last reports URL to restore navigation state
  useEffect(() => {
    if (location.pathname.startsWith("/reports")) {
      setLastReportsUrl(location.pathname);
    }
  }, [location.pathname]);

  // Request notification permission for managers
  useEffect(() => {
    if (!isManager) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isManager]);

  // Initialize audio on first user interaction
  useEffect(() => {
    if (!isManager) return;
    const handleFirstInteraction = () => {
      initializeAudio();
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };
    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);
    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [isManager]);

  // Global WebSocket listener for task notifications (only for managers)
  const handleGlobalTaskUpdate = useCallback((message: any) => {
    if (!isManager) return;
    if (message.action === "create" && message.task?.assigned_to === user?.id) {
      showTaskNotification(message.task.title);
    }
  }, [user?.id, isManager]);

  useTasksWebSocket(handleGlobalTaskUpdate);

  // Update document title based on current route
  useEffect(() => {
    const getPageTitle = () => {
      const path = location.pathname;
      if (path.startsWith("/group/")) return;
      const titleMap: { [key: string]: string } = {
        "/": "Группы",
        "/students": "Клиенты",
        "/exams": "Экзамены",
        "/school": "Школа",
        "/analytics": "Аналитика",
        "/finances": "Финансы",
        "/reports": "Отчеты",
      };
      document.title = `${titleMap[path] || "Школа Гарри"} | Школа Гарри`;
    };
    getPageTitle();
  }, [location.pathname]);

  // Load uncompleted lessons count for teachers
  useEffect(() => {
    if (!isTeacher) return;
    const loadUncompletedLessons = async () => {
      try {
        const lessons = await api.getLessons();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const uncompleted = lessons.filter((lesson) => {
          const lessonDate = new Date(lesson.date);
          lessonDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today.getTime() - lessonDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff > 1 && lesson.status !== "conducted";
        });
        setUncompletedLessonsCount(uncompleted.length);
      } catch (error) {
        console.error("Failed to load lessons:", error);
      }
    };
    loadUncompletedLessons();
    const interval = setInterval(loadUncompletedLessons, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isTeacher, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <header className={`lg:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 z-40 gap-3 ${location.pathname.startsWith("/group/") || location.pathname.startsWith("/students/") ? "hidden" : ""}`}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 -ml-1 rounded-md hover:bg-slate-100 transition-colors"
          aria-label="Открыть меню"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-900">
            {(() => {
              const path = location.pathname;
              if (path.startsWith("/group/")) return "Группа";
              if (path.startsWith("/students/")) return "Ученик";
              if (path.startsWith("/reports/")) return "Отчёт";
              const map: Record<string, string> = {
                "/": "Группы",
                "/students": "Клиенты",
                "/exams": "Экзамены",
                "/school": "Школа",
                "/analytics": "Аналитика",
                "/finances": "Финансы",
                "/reports": "Отчёты",
                "/tasks": "Задачи",
              };
              return map[path] ?? "Школа Гарри";
            })()}
          </span>
        </div>
        {headerActions && (
          <div className="ml-auto flex items-center">
            {headerActions}
          </div>
        )}
      </header>

      {/* ── Mobile overlay backdrop ───────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-40
          w-64
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>

        {/* Logo */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-slate-900 leading-tight">ШКОЛА ГАРРИ</h1>
                <p className="text-xs text-slate-500">CRM Система</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === "/" && location.pathname.startsWith("/group")) ||
              (item.path === "/reports" && location.pathname.startsWith("/reports")) ||
              (item.path === "/exams" && location.pathname.startsWith("/exams"));

            const navigateTo = item.path === "/reports" ? lastReportsUrl : item.path;

            return (
              <Link key={item.path} to={navigateTo} className="relative block">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-11 ${
                    isActive
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  } ${sidebarCollapsed ? "lg:px-2 lg:justify-center" : "px-4"}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className={`flex items-center justify-between flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                    <span className="font-medium">{item.label}</span>
                    {isTeacher && item.path === "/" && uncompletedLessonsCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                      >
                        {uncompletedLessonsCount}
                      </Badge>
                    )}
                  </div>
                </Button>
                {sidebarCollapsed && isTeacher && item.path === "/" && uncompletedLessonsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute top-1/2 -translate-y-1/2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0 rounded-full pointer-events-none"
                  >
                    {uncompletedLessonsCount > 9 ? "9+" : uncompletedLessonsCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-slate-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full h-auto py-2.5 ${
                  sidebarCollapsed ? "lg:px-2 lg:justify-center px-3 justify-start" : "px-3 justify-start"
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
                  </div>
                  <div className={`flex flex-col items-start flex-1 min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                    <span className="text-sm font-medium text-slate-900 truncate w-full">
                      {user?.first_name} {user?.last_name}
                    </span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.first_name} {user?.last_name}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-red-600 cursor-pointer"
                onClick={() => { logout(); navigate("/login"); }}
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse Toggle — desktop only */}
        <div className="hidden lg:block p-3 border-t border-slate-200">
          <Button
            variant="ghost"
            className="w-full justify-center"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="ml-2 text-sm">Свернуть</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main
        className={`min-h-screen transition-all duration-300
          ${location.pathname.startsWith("/group/") || location.pathname.startsWith("/students/") ? "pt-0" : "pt-14"} lg:pt-0
          ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
}
