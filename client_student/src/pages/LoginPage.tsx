import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) return;
    setError("");
    setLoading(true);
    try {
      await api.login(login.trim(), password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-between px-6 py-10">
      {/* Logo + Title */}
      <div />
      <div className="w-full flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-brand-700 flex items-center justify-center shadow-md">
          <span className="text-3xl font-bold text-amber-400">Г</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Школа Гарри</h1>
          <p className="text-gray-500 text-sm mt-1">Войдите в свой аккаунт</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Логин</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <UserIcon />
              </span>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Введите логин"
                className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm outline-none focus:border-brand-700 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Пароль</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <LockIcon />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full pl-10 pr-10 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm outline-none focus:border-brand-700 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button type="button" className="text-sm text-brand-700 font-medium">
              Забыли пароль?
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !login || !password}
            className="w-full py-4 bg-brand-700 text-white rounded-2xl font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-transform mt-2"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="flex items-center gap-3 w-full my-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">или</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button className="w-full py-3.5 border border-gray-200 bg-white rounded-2xl text-sm font-medium text-gray-700 flex items-center justify-center gap-2">
          <PhoneIcon />
          Связаться с поддержкой
        </button>
      </div>

      <p className="text-xs text-gray-400">© 2026 Школа Гарри</p>
    </div>
  );
}

// Icons
const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.09 6.09l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
