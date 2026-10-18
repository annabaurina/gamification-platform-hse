import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth";
import { getMyProgress } from "../api/progress.api";
import { getStudents } from "../api/students.api";
import { StudentProgress } from "../types";
import type { LeaderboardStudent } from "../api/students.api";
import { TrendingUp, Star, Award, RefreshCw, AlertCircle, Trophy, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { AxiosError } from "axios";

function extractApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (data?.detail) return String(data.detail);
    if (!err.response) return "Сервер недоступен";
    if (err.response.status === 400) return "Профиль студента не настроен";
    if (err.response.status === 403) return "Нет доступа";
  }
  return "Ошибка загрузки данных";
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-[#374B9B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

const medalEmoji = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

const LEVEL_COLORS: Record<string, string> = {
  "Новичок": "#939598",
  "Академик": "#374B9B",
  "Победитель": "#0F2D69",
};

export default function StudentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prog, studs] = await Promise.all([
        getMyProgress(),
        getStudents(),
      ]);
      setProgress(prog);
      setStudents(studs);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ranked = [...students].sort((a, b) => b.total_points - a.total_points);
  const myRank = user?.studentId
    ? ranked.findIndex((s) => s.id === user.studentId) + 1
    : 0;
  const top3 = ranked.slice(0, 3);

  const levelColor = progress ? (LEVEL_COLORS[progress.level] ?? "#374B9B") : "#374B9B";

  return (
    <div className="px-8 py-8 max-w-5xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[#939598] text-sm mb-1">
            {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-[#0F2D69] font-bold text-2xl">
            Добро пожаловать, {user?.name.split(" ")[0]}!
          </h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Обновить"
          className="text-[#939598] hover:text-[#0F2D69] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-[#939598] text-sm">Загрузка данных...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white rounded-lg border border-red-200 px-6 py-8 flex flex-col items-center gap-4">
          <AlertCircle size={32} className="text-red-400" />
          <div className="text-center">
            <p className="text-[#0F2D69] font-semibold mb-1">Не удалось загрузить данные</p>
            <p className="text-[#939598] text-sm">{error}</p>
          </div>
          <button
            onClick={load}
            className="px-5 py-2 rounded text-sm font-bold text-white"
            style={{ backgroundColor: "#0F2D69" }}
          >
            Повторить
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && progress && (
        <>
          {/* Progress card */}
          <div className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-5 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[#939598] text-xs font-semibold uppercase tracking-wide mb-1">Уровень</p>
                <p className="font-bold text-2xl" style={{ color: levelColor }}>{progress.level}</p>
              </div>
              <div className="text-right">
                <p className="text-[#939598] text-xs font-semibold uppercase tracking-wide mb-1">Баллы</p>
                <p className="font-bold text-2xl text-[#0F2D69]" style={{ fontFamily: "var(--font-mono)" }}>
                  {progress.coins}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-[#939598] mb-1.5">
                <span>{progress.level}</span>
                {progress.nextLevel && <span>{progress.nextLevel}</span>}
              </div>
              <div className="h-2.5 rounded-full bg-[#E6E7E8] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%`, backgroundColor: levelColor }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#939598]">
              <span>{progress.percent.toFixed(0)}% до следующего уровня</span>
              {progress.coinsToNextLevel > 0 && (
                <span>ещё {progress.coinsToNextLevel} баллов до «{progress.nextLevel}»</span>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-[#C7C8CA] px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[#939598] text-xs font-semibold uppercase tracking-wide">Мои Баллы</span>
                <Star size={16} style={{ color: "#374B9B" }} />
              </div>
              <div className="text-[#0F2D69] font-bold text-2xl mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                {progress.coins}
              </div>
              <div className="text-[#939598] text-xs">из {progress.maxCoins}</div>
            </div>

            {myRank > 0 && (
              <div className="bg-white rounded-lg border border-[#C7C8CA] px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#939598] text-xs font-semibold uppercase tracking-wide">Рейтинг</span>
                  <Award size={16} style={{ color: "#374B9B" }} />
                </div>
                <div className="text-[#0F2D69] font-bold text-2xl mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                  {myRank} / {students.length}
                </div>
                <div className="text-[#939598] text-xs">место в рейтинге</div>
              </div>
            )}

            {progress.bestStudent && (
              <div className="bg-white rounded-lg border border-[#C7C8CA] px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#939598] text-xs font-semibold uppercase tracking-wide">Лидер группы</span>
                  <TrendingUp size={16} style={{ color: "#374B9B" }} />
                </div>
                <div className="text-[#0F2D69] font-semibold text-sm mb-0.5 truncate">
                  {progress.bestStudent}
                </div>
                <div className="text-[#939598] text-xs">лучший студент</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-[#C7C8CA] px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[#0F2D69] font-bold text-base">Топ студентов</h2>
                <Trophy size={16} className="text-[#374B9B]" />
              </div>

              {students.length === 0 ? (
                <p className="text-[#939598] text-sm text-center py-8">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  {top3.map((s, i) => {
                    const isMe = user?.studentId ? s.id === user.studentId : false;
                    return (
                      <div
                        key={s.id}
                        className={[
                          "flex items-center gap-3 px-3 py-3 rounded-lg",
                          isMe ? "border-2" : "border border-[#E6E7E8]",
                        ].join(" ")}
                        style={isMe ? { borderColor: "#374B9B", backgroundColor: "#374B9B0D" } : {}}
                      >
                        <div className="text-lg w-6 text-center shrink-0">
                          {medalEmoji(i + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#0F2D69] text-sm font-semibold truncate">{s.full_name}</div>
                          <div className="text-[#939598] text-xs">{s.total_points} баллов</div>
                        </div>
                        {isMe && (
                          <span className="text-[#374B9B] text-xs font-bold shrink-0">Вы</span>
                        )}
                      </div>
                    );
                  })}

                  {myRank > 3 && user?.studentId && (() => {
                    const me = ranked.find((s) => s.id === user.studentId);
                    if (!me) return null;
                    return (
                      <div className="mt-2 pt-2 border-t border-[#E6E7E8]">
                        <div className="text-[#939598] text-xs mb-2 text-center">Ваша позиция</div>
                        <div className="flex items-center gap-3 px-3 py-3 rounded-lg border-2"
                          style={{ borderColor: "#374B9B", backgroundColor: "#374B9B0D" }}>
                          <div className="text-sm font-bold w-6 text-center shrink-0 text-[#374B9B]">
                            {myRank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[#0F2D69] text-sm font-semibold truncate">{me.full_name}</div>
                            <div className="text-[#939598] text-xs">{me.total_points} баллов</div>
                          </div>
                          <span className="text-[#374B9B] text-xs font-bold shrink-0">Вы</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-[#C7C8CA] px-5 py-5">
                <h2 className="text-[#0F2D69] font-bold text-sm mb-4">Быстрый доступ</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("/bonuses")}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded border border-[#E6E7E8] hover:border-[#374B9B] hover:bg-[#374B9B08] transition-colors text-sm text-[#0F2D69] font-medium"
                  >
                    <span>Бонусные баллы</span>
                    <ArrowRight size={14} className="text-[#939598]" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#C7C8CA] px-5 py-5">
                <h2 className="text-[#0F2D69] font-bold text-sm mb-3">Уровни</h2>
                <div className="space-y-2">
                  {[
                    { name: "Новичок", desc: "Начало пути" },
                    { name: "Академик", desc: "Середина пути" },
                    { name: "Победитель", desc: "Вершина" },
                  ].map((lvl) => (
                    <div key={lvl.name} className="flex items-center justify-between">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: LEVEL_COLORS[lvl.name] ?? "#939598" }}
                      >
                        {lvl.name}
                      </span>
                      <span className="text-xs text-[#939598]">{lvl.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
