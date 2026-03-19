import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/", label: "ГЛАВНАЯ", icon: HomeIcon },
  { path: "/exams", label: "ЭКЗАМЕНЫ", icon: ExamIcon },
  { path: "/chat", label: "ЧАТ", icon: ChatIcon },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex z-50">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || (path !== "/" && pathname.startsWith(path));
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active ? "bg-brand-700" : "bg-transparent"}`}>
              <Icon className={active ? "text-white" : "text-gray-400"} />
            </div>
            <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-brand-700" : "text-gray-400"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function ExamIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="12" y2="15" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
