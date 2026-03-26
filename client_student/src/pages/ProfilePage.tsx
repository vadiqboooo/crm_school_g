import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, StudentProfile } from "../lib/api";
import BottomNav from "../components/BottomNav";
import { useTheme } from "../contexts/ThemeContext";

function SettingsField({
  label, value, onChange, placeholder, type = "text", disabled = false, error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
          disabled
            ? "bg-gray-100 dark:bg-gray-700 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            : error
            ? "bg-gray-50 dark:bg-gray-800 border-red-300 text-gray-900 dark:text-gray-100 focus:border-red-400"
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:border-brand-400 dark:placeholder-gray-500"
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const role = localStorage.getItem("s_role") ?? "student";
  const stored = JSON.parse(localStorage.getItem("s_student") ?? "{}");

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [login, setLogin] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [oldPasswordVerified, setOldPasswordVerified] = useState(false);
  const [oldPasswordError, setOldPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [chatName, setChatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load profile on mount (only for students)
  const hasStudentAccess = role === "student" || (role === "app_user" && stored?.student_id);
  const didLoad = useRef(false);
  if (!didLoad.current && hasStudentAccess) {
    didLoad.current = true;
    api.getMe().then(p => {
      setProfile(p);
      setLogin(p.portal_login ?? "");
      setPhone(p.phone ?? "");
      setEmail(p.email ?? "");
      setChatName(p.chat_display_name ?? "");
      setLoaded(true);
    }).catch(() => setLoaded(true));
  } else if (!didLoad.current) {
    didLoad.current = true;
    setLoaded(true);
  }

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : stored?.first_name ?? "Пользователь";
  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : (stored?.first_name?.[0] ?? "U");

  const handleVerifyOldPassword = async () => {
    if (!oldPassword) return;
    setVerifying(true);
    setOldPasswordError(null);
    try {
      const { valid } = await api.verifyPassword(oldPassword);
      if (valid) setOldPasswordVerified(true);
      else setOldPasswordError("Неверный пароль");
    } catch {
      setOldPasswordError("Ошибка проверки");
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (oldPasswordVerified) {
      if (!newPassword) { setError("Введите новый пароль"); return; }
      if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return; }
    }
    setSaving(true);
    try {
      await api.updateSettings({
        portal_login: login || undefined,
        old_password: oldPasswordVerified ? oldPassword : undefined,
        new_password: oldPasswordVerified ? newPassword : undefined,
        phone,
        email,
        chat_display_name: chatName,
      });
      if (hasStudentAccess) {
        const updated = await api.getMe();
        setProfile(updated);
      }
      setSuccess(true);
      setOldPassword("");
      setOldPasswordVerified(false);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    api.clearTokens();
    navigate("/login");
  };

  return (
    <div className="bg-cream dark:bg-gray-900 min-h-screen pb-28 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 font-bold text-xl">{initials}</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">{displayName}</div>
            {profile?.portal_login && (
              <div className="text-sm text-gray-400 dark:text-gray-500">@{profile.portal_login}</div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Theme toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{theme === "dark" ? "🌙" : "☀️"}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {theme === "dark" ? "Тёмная тема" : "Светлая тема"}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              theme === "dark" ? "bg-brand-700" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                theme === "dark" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {hasStudentAccess && (
          <>
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Аккаунт</div>
            <SettingsField label="Логин" value={login} onChange={setLogin} placeholder="Введите логин" />

            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2">Смена пароля</div>

            {!oldPasswordVerified ? (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Старый пароль</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={e => { setOldPassword(e.target.value); setOldPasswordError(null); }}
                    placeholder="Введите текущий пароль"
                    className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                      oldPasswordError
                        ? "border-red-300 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500 focus:border-brand-400"
                    }`}
                    onKeyDown={e => { if (e.key === "Enter") handleVerifyOldPassword(); }}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOldPassword}
                    disabled={!oldPassword || verifying}
                    className="px-4 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 shrink-0"
                  >
                    {verifying ? "..." : "Далее"}
                  </button>
                </div>
                {oldPasswordError && <p className="text-red-500 text-xs mt-1">{oldPasswordError}</p>}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Старый пароль подтверждён
                  <button type="button" onClick={() => { setOldPasswordVerified(false); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="ml-auto text-xs text-gray-400 underline">Отмена</button>
                </div>
                <SettingsField label="Новый пароль" value={newPassword} onChange={setNewPassword} placeholder="Новый пароль" type="password" />
                <SettingsField label="Подтверждение" value={confirmPassword} onChange={setConfirmPassword} placeholder="Повторите новый пароль" type="password" error={confirmPassword.length > 0 && newPassword !== confirmPassword ? "Пароли не совпадают" : undefined} />
              </>
            )}

            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2">Контакты</div>
            <SettingsField label="Телефон" value={phone} onChange={setPhone} placeholder="+7..." type="tel" />
            <SettingsField label="Email" value={email} onChange={setEmail} placeholder="example@mail.ru" type="email" />

            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2">Чат</div>
            <SettingsField label="Имя в чате" value={chatName} onChange={setChatName} placeholder="Как вас называть в чате" disabled />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-emerald-600 text-sm">Сохранено!</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-brand-700 text-white rounded-2xl py-3.5 font-semibold text-sm disabled:opacity-60 mt-2"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </>
        )}

        <button
          onClick={handleLogout}
          className="w-full text-red-500 text-sm font-semibold py-3 border border-red-100 dark:border-red-900/40 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          Выйти из аккаунта
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
