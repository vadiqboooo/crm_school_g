import { Outlet, useLocation, Link, useNavigate } from "react-router";
import { Sparkles, Users, GraduationCap, School, BarChart3, Wallet, ClipboardList, LogOut, FileText, ChevronLeft, ChevronRight, CheckSquare } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useTasksWebSocket } from "../hooks/useTasksWebSocket";
import { showTaskNotification, initializeAudio } from "../utils/notifications";
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
  const [uncompletedLessonsCount, setUncompletedLessonsCount] = useState(0);
  const [lastReportsUrl, setLastReportsUrl] = useState("/reports");

  const adminNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/students", icon: GraduationCap, label: "Студенты" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
    { path: "/school", icon: School, label: "Школа" },
    { path: "/analytics", icon: BarChart3, label: "Аналитика" },
    { path: "/finances", icon: Wallet, label: "Финансы" },
    { path: "/reports", icon: ClipboardList, label: "Отчеты" },
    { path: "/tasks", icon: CheckSquare, label: "Задачи" },
  ];

  const managerNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/students", icon: GraduationCap, label: "Студенты" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
    { path: "/reports", icon: ClipboardList, label: "Отчеты" },
  ];

  const teacherNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
  ];

  const navItems = isAdmin ? adminNavItems : isManager ? managerNavItems : teacherNavItems;

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
      // Remove listeners after first interaction
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
    // Only process for managers
    if (!isManager) return;

    // Only show notifications for new tasks assigned to the current manager
    if (message.action === "create" && message.task?.assigned_to === user?.id) {
      showTaskNotification(message.task.title);
    }
  }, [user?.id, isManager]);

  // Connect to WebSocket (callback filters by manager role)
  useTasksWebSocket(handleGlobalTaskUpdate);

  // Update document title based on current route
  useEffect(() => {
    const getPageTitle = () => {
      const path = location.pathname;

      // Don't update title for group pages - they will set their own
      if (path.startsWith("/group/")) {
        return;
      }

      const titleMap: { [key: string]: string } = {
        "/": "Группы",
        "/students": "Студенты",
        "/exams": "Экзамены",
        "/school": "Школа",
        "/analytics": "Аналитика",
        "/finances": "Финансы",
        "/reports": "Отчеты",
      };

      const pageTitle = titleMap[path] || "Школа Гарри";
      document.title = `${pageTitle} | Школа Гарри`;
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

        // Count lessons that are more than 1 day old and not conducted
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
    // Reload every 5 minutes
    const interval = setInterval(loadUncompletedLessons, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isTeacher, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-900">ШКОЛА ГАРРИ</h1>
                <p className="text-xs text-slate-500">CRM Система</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === "/" && location.pathname.startsWith("/group")) ||
              (item.path === "/reports" && location.pathname.startsWith("/reports")) ||
              (item.path === "/exams" && location.pathname.startsWith("/exams"));

            // Special handling for reports to maintain navigation state
            const navigateTo = item.path === "/reports" ? lastReportsUrl : item.path;

            return (
              <Link key={item.path} to={navigateTo} className="relative">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-11 ${
                    isActive
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  } ${sidebarCollapsed ? "px-2 justify-center" : "px-4"}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1">
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
                  )}
                </Button>
                {sidebarCollapsed && isTeacher && item.path === "/" && uncompletedLessonsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute top-1/2 -translate-y-1/2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0 rounded-full pointer-events-none"
                  >
                    {uncompletedLessonsCount > 9 ? '9+' : uncompletedLessonsCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full h-auto py-3 ${
                  sidebarCollapsed ? "px-2 justify-center" : "px-3 justify-start"
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900 truncate w-full">
                        {user?.first_name} {user?.last_name}
                      </span>
                    </div>
                  )}
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
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse Toggle */}
        <div className="p-4 border-t border-slate-200">
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

      {/* Main Content */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}