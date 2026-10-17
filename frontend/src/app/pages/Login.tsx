import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { AxiosError } from "axios";

const HseMark = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="56" height="56" rx="4" fill="white" fillOpacity="0.1" />
    <rect x="2" y="2" width="60" height="60" rx="6" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
    <text x="32" y="38" textAnchor="middle" fill="white" fontSize="22" fontWeight="700"
      fontFamily="PT Sans, sans-serif" letterSpacing="-1">ВШЭ</text>
  </svg>
);

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (typeof data === "object" && data !== null) {
      if (data.detail) return String(data.detail);
      const msgs = Object.values(data).flat().filter(Boolean);
      if (msgs.length > 0) return msgs.join("; ");
    }
    if (err.response?.status === 401) return "Неверный логин или пароль";
    if (!err.response) return "Сервер недоступен. Проверьте соединение.";
  }
  if (err instanceof Error) return err.message;
  return "Ошибка входа. Попробуйте ещё раз.";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError("Введите логин"); return; }
    if (!password) { setError("Введите пароль"); return; }
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      const stored = localStorage.getItem("hse_user");
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === "admin") navigate("/admin");
      else if (user?.role === "starosta") navigate("/starosta");
      else navigate("/student");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-14"
        style={{ backgroundColor: "#0F2D69" }}>
        <div>
          <HseMark />
          <div className="mt-8">
            <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">
              Национальный исследовательский университет
            </p>
            <h1 className="text-white font-bold text-3xl leading-tight">
              Высшая школа<br />экономики
            </h1>
          </div>
          <div className="mt-10 w-12 h-0.5 bg-white/20" />
          <p className="mt-6 text-white/60 text-sm leading-relaxed">
            Студенческий образовательный портал.<br />
            Прогресс, посещаемость, бонусные баллы<br />
            и заявки — в одном месте.
          </p>
        </div>

        <div className="text-white/25 text-xs">
          <p>Геймификация НИУ ВШЭ</p>
          <p className="mt-1">Используйте учётные данные университетского портала</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center bg-[#E6E7E8] px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-3"
              style={{ backgroundColor: "#0F2D69" }}>
              <span className="text-white font-bold text-lg">ВШЭ</span>
            </div>
            <p className="text-[#939598] text-sm">Студенческий портал НИУ ВШЭ</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-[#C7C8CA] px-8 py-9">
            <h2 className="text-[#0F2D69] font-bold text-2xl mb-1">Вход</h2>
            <p className="text-[#939598] text-sm mb-7">Введите учётные данные для входа</p>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                  Логин
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Введите логин"
                  required
                  autoComplete="username"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded border border-[#C7C8CA] bg-white text-[#0F2D69] text-sm placeholder-[#C7C8CA] focus:outline-none focus:border-[#374B9B] focus:ring-2 focus:ring-[#374B9B]/20 transition disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 pr-10 rounded border border-[#C7C8CA] bg-white text-[#0F2D69] text-sm placeholder-[#C7C8CA] focus:outline-none focus:border-[#374B9B] focus:ring-2 focus:ring-[#374B9B]/20 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#939598] hover:text-[#0F2D69] transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded font-bold text-sm text-white transition-opacity mt-2 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#0F2D69", opacity: loading ? 0.6 : 1 }}
              >
                {loading && (
                  <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {loading ? "Вход..." : "Войти"}
              </button>
            </form>
          </div>

          <p className="text-center text-[#939598] text-xs mt-6">
            © {new Date().getFullYear()} НИУ ВШЭ. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  );
}
