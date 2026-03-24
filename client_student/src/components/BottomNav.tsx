import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";

function readUnread() {
  return parseInt(localStorage.getItem("s_chat_unread") ?? "0", 10) || 0;
}

async function fetchAndStoreUnread() {
  try {
    const rooms = await api.getChatRooms();
    const total = rooms.reduce((sum, r) => sum + (r.unread_count ?? 0), 0);
    localStorage.setItem("s_chat_unread", String(total));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // not logged in or network error — ignore
  }
}

const tabs = [
  { path: "/", label: "ГЛАВНАЯ", icon: HomeIcon },
  { path: "/exams", label: "ЭКЗАМЕНЫ", icon: ExamIcon },
  { path: "/chat", label: "ЧАТ", icon: ChatIcon },
];

interface BottomNavProps {
  chatUnread?: number;
}

export default function BottomNav({ chatUnread: chatUnreadProp }: BottomNavProps = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [lsUnread, setLsUnread] = useState(readUnread);

  useEffect(() => {
    // On mount: fetch fresh count from server (works even without visiting ChatPage)
    fetchAndStoreUnread();

    const onStorage = () => setLsUnread(readUnread());
    // Re-fetch on tab focus so count stays fresh when user switches tabs
    const onFocus = () => { fetchAndStoreUnread(); setLsUnread(readUnread()); };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Prefer prop (when on ChatPage, always fresh), else localStorage
  const chatUnread = chatUnreadProp ?? lsUnread;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white flex items-center px-4 py-3 z-50">
      {/* Top separator line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gray-100" />

      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || (path !== "/" && pathname.startsWith(path));
        const isChat = path === "/chat";
        const badge = isChat && chatUnread && chatUnread > 0 ? chatUnread : 0;
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
                <div className="relative">
                  <Icon className="text-gray-400" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
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
