import { Outlet, useLocation, Link, useNavigate } from "react-router";
import { Sparkles, Users, GraduationCap, School, BarChart3, Wallet, ClipboardList, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
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
  
  const adminNavItems = [
    { path: "/", icon: Users, label: "Группы" },
    { path: "/students", icon: GraduationCap, label: "Студенты" },
    { path: "/school", icon: School, label: "Школа" },
    { path: "/analytics", icon: BarChart3, label: "Аналитика" },
    { path: "/finances", icon: Wallet, label: "Финансы" },
    { path: "/reports", icon: ClipboardList, label: "Отчеты" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Header - Always Visible */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-purple-600" />
              <h1 className="text-2xl font-semibold text-slate-900">
                ШКОЛА ГАРРИ
              </h1>
            </div>
            
            {/* Admin Navigation */}
            {isAdmin && (
              <nav className="flex items-center gap-2">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = 
                    location.pathname === item.path || 
                    (item.path === "/" && location.pathname.startsWith("/group")) ||
                    (item.path === "/reports" && location.pathname.startsWith("/reports"));
                  
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                          isActive 
                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            )}
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
                    </div>
                    <span className="text-sm text-slate-600">
                      {user?.first_name} {user?.last_name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.first_name} {user?.last_name}</span>
                      <span className="text-xs text-slate-500">{user?.email}</span>
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
          </div>
        </div>
      </header>

      {/* Page Content */}
      <Outlet />
    </div>
  );
}