import { Outlet, useLocation, Link, useNavigate } from "react-router";
import { Sparkles, Users, GraduationCap, School, BarChart3, Wallet, ClipboardList, LogOut, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const adminNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/students", icon: GraduationCap, label: "Студенты" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
    { path: "/school", icon: School, label: "Школа" },
    { path: "/analytics", icon: BarChart3, label: "Аналитика" },
    { path: "/finances", icon: Wallet, label: "Финансы" },
    { path: "/reports", icon: ClipboardList, label: "Отчеты" },
  ];

  const teacherNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/exams", icon: FileText, label: "Экзамены" },
  ];

  const navItems = isAdmin ? adminNavItems : teacherNavItems;

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

            return (
              <Link key={item.path} to={item.path}>
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
                    <span className="font-medium">{item.label}</span>
                  )}
                </Button>
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
                      <span className="text-xs text-slate-500 truncate w-full">
                        {user?.email}
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
                  <span className="text-xs text-slate-500 font-normal">{user?.email}</span>
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