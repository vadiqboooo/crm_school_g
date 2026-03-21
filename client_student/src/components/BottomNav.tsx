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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white flex items-center px-4 py-3 z-50">
      {/* Top separator line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gray-100" />

      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || (path !== "/" && pathname.startsWith(path));
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex items-center justify-center transition-all duration-200"
          >
            {active ? (
              <div className="flex items-center gap-2 bg-brand-700 text-white px-5 py-2.5 rounded-full transition-all duration-200">
                <Icon className="text-white" />
                <span className="text-xs font-bold tracking-wide">{label}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5 transition-all duration-200">
                <Icon className="text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-400 tracking-wide">{label}</span>
              </div>
            )}
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
