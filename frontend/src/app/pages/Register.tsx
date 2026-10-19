import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AxiosError } from "axios";
import { apiClient } from "../api/client";
import { Eye, EyeOff, UserPlus } from "lucide-react";

type RegisterPayload = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return "Не удалось связаться с сервером. Проверь подключение и попробуй ещё раз.";
    }

    const data = error.response.data as
      | Record<string, unknown>
      | string
      | undefined;

    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") return data.detail;

      const messages = Object.entries(data)
        .map(([field, value]) => {
          const label: Record<string, string> = {
            username: "Логин",
            email: "Электронная почта",
            password: "Пароль",
            password_confirm: "Подтверждение пароля",
            first_name: "Имя",
            last_name: "Фамилия",
          };

          const text = Array.isArray(value)
            ? value.map(String).join(" ")
            : String(value);

          return `${label[field] ?? field}: ${text}`;
        })
        .filter(Boolean);

      if (messages.length > 0) return messages.join("\n");
    }

    if (error.response.status === 404) {
      return "Ошибка регистрации.";
    }
    if (error.response.status === 409) {
      return "Пользователь с таким логином или электронной почтой уже существует.";
    }
  }

  return "Не удалось создать аккаунт. Попробуйте ещё раз.";
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const email = form.email.trim();

    if (form.password.length < 8) {
      setError("Пароль должен содержать не менее 8 символов.");
      return;
    }

    if (form.password !== form.password_confirm) {
      setError("Пароли не совпадают.");
      return;
    }

    const payload: RegisterPayload = {
      username,
      first_name: firstName,
      last_name: lastName,
      email,
      password: form.password,
    };

    setLoading(true);

    try {
      await apiClient.post("/register/", payload);
      navigate("/login", {
        replace: true,
        state: { registrationSuccess: true, username },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-[#C7C8CA] bg-white px-3 py-3 text-sm text-[#0F2D69] outline-none transition focus:border-[#374B9B] focus:ring-2 focus:ring-[#374B9B]/15 placeholder:text-[#939598]";

  const labelClass = "mb-1.5 block text-sm font-medium text-[#0F2D69]";

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F4F5F7] px-4 py-10"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <section className="w-full max-w-lg rounded-xl border border-[#E6E7E8] bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#374B9B]/10 text-[#374B9B]">
            <UserPlus size={23} />
          </div>
          
          <h1 className="text-2xl font-bold text-[#0F2D69]">
            Создание аккаунта
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#939598]">
            Заполните данные, чтобы зарегистрироваться в системе
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="first_name">
                Имя
              </label>
              <input
                id="first_name"
                name="first_name"
                autoComplete="given-name"
                required
                maxLength={150}
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
                className={inputClass}
                placeholder="Имя"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="last_name">
                Фамилия
              </label>
              <input
                id="last_name"
                name="last_name"
                autoComplete="family-name"
                required
                maxLength={150}
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
                className={inputClass}
                placeholder="Фамилия"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="username">
              Логин
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={150}
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              className={inputClass}
              placeholder="Придумайте логин"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Электронная почта
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass}
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Пароль
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="Не менее 8 символов"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[#939598] hover:text-[#0F2D69]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="password_confirm">
              Повторите пароль
            </label>
            <div className="relative">
              <input
                id="password_confirm"
                name="password_confirm"
                type={showPasswordConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password_confirm}
                onChange={(e) =>
                  updateField("password_confirm", e.target.value)
                }
                className={`${inputClass} pr-11`}
                placeholder="Повторите пароль"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((value) => !value)}
                aria-label={
                  showPasswordConfirm ? "Скрыть пароль" : "Показать пароль"
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[#939598] hover:text-[#0F2D69]"
              >
                {showPasswordConfirm ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#0F2D69" }}
          >
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#939598]">
          Уже есть аккаунт?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#374B9B] hover:underline"
          >
            Войти
          </Link>
        </p>
      </section>
    </main>
  );
}
