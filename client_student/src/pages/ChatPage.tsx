import BottomNav from "../components/BottomNav";

export default function ChatPage() {
  return (
    <div className="bg-cream min-h-screen pb-24 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-purple-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Чат в разработке</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          Мы работаем над внутренним мессенджером.<br />
          Скоро здесь можно будет общаться с учителями и одноклассниками!
        </p>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-medium px-4 py-2 rounded-full">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18.01" />
          </svg>
          В разработке
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
