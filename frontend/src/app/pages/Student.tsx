
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth";
import { getMyProgress } from "../api/progress.api";
import { getStudents } from "../api/students.api";
import { getGrades } from "../api/grades.api";
import { getAttendance } from "../api/attendance.api";
import type { StudentProgress, Grade, Attendance } from "../types";
import type { LeaderboardStudent } from "../api/students.api";
import {
  TrendingUp,
  CheckCircle,
  Star,
  Award,
  RefreshCw,
  AlertCircle,
  Medal,
} from "lucide-react";
import { AxiosError } from "axios";

function extractApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return "Сервер недоступен. Проверьте подключение.";
    }

    const { status, data } = err.response;

    if (typeof data === "string") {
      return data;
    }

    if (data && typeof data === "object") {
      const messages = Object.entries(data).map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.map(String).join(", ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);

        return field === "detail" || field === "error"
          ? message
          : `${field}: ${message}`;
      });

      if (messages.length > 0) {
        return messages.join("; ");
      }
    }

    return `Ошибка сервера: HTTP ${status}`;
  }

  return err instanceof Error
    ? err.message
    : "Неизвестная ошибка";
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-[#374B9B]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Загрузка"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

const medalEmoji = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

export default function StudentPage() {
  const { user } = useAuth();

  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [progressLoading, setProgressLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [progressError, setProgressError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [gradesError, setGradesError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const loading =
    progressLoading ||
    studentsLoading ||
    gradesLoading ||
    attendanceLoading;

  const load = useCallback(async () => {
    // У каждого запроса своя загрузка и собственная ошибка.
    setProgressLoading(true);
    setStudentsLoading(true);
    setGradesLoading(true);
    setAttendanceLoading(true);

    setProgressError(null);
    setStudentsError(null);
    setGradesError(null);
    setAttendanceError(null);

    const progressRequest = getMyProgress()
      .then((data) => {
        setProgress(data);
      })
      .catch((err: unknown) => {
        setProgressError(extractApiError(err));
      })
      .finally(() => {
        setProgressLoading(false);
      });

    const studentsRequest = getStudents()
      .then((data) => {
        setStudents(data);
      })
      .catch((err: unknown) => {
        setStudentsError(extractApiError(err));
      })
      .finally(() => {
        setStudentsLoading(false);
      });

    const gradesRequest = getGrades()
      .then((data) => {
        setGrades(data);
      })
      .catch((err: unknown) => {
        setGradesError(extractApiError(err));
      })
      .finally(() => {
        setGradesLoading(false);
      });

    const attendanceRequest = getAttendance()
      .then((data) => {
        setAttendance(data);
      })
      .catch((err: unknown) => {
        setAttendanceError(extractApiError(err));
      })
      .finally(() => {
        setAttendanceLoading(false);
      });

    await Promise.all([
      progressRequest,
      studentsRequest,
      gradesRequest,
      attendanceRequest,
    ]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Средний балл по оценкам, доступным текущему студенту через API.
  const averageGrade =
    grades.length > 0
      ? grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
      : null;

  // Процент посещаемости по записанным занятиям.
  const attendancePercent =
    attendance.length > 0
      ? (attendance.filter((item) => item.is_present).length /
          attendance.length) *
        100
      : null;

  // Группировка оценок по дисциплинам.
  const disciplineStats = Object.values(
    grades.reduce<
      Record<
        number,
        {
          id: number;
          name: string;
          totalScore: number;
          count: number;
        }
      >
    >((acc, grade) => {
      const discipline = grade.course_group.discipline;
      const id = discipline.id;

      if (!acc[id]) {
        acc[id] = {
          id,
          name: discipline.name,
          totalScore: 0,
          count: 0,
        };
      }

      acc[id].totalScore += grade.score;
      acc[id].count += 1;

      return acc;
    }, {})
  )
    .map((item) => ({
      id: item.id,
      name: item.name,
      average: item.totalScore / item.count,
      count: item.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  // Глобальный рейтинг среди студентов, которые вернулись из API.
  const ranked = [...students].sort(
    (a, b) => b.total_points - a.total_points
  );

  const myIndex =
    user?.studentId != null
      ? ranked.findIndex(
          (student) => Number(student.id) === Number(user.studentId)
        )
      : -1;

  const myRank = myIndex >= 0 ? myIndex + 1 : 0;
  const top3 = ranked.slice(0, 3);

  const statCards = [
    {
      label: "Средний балл",
      value: gradesLoading
        ? "…"
        : gradesError
          ? "—"
          : averageGrade !== null
            ? averageGrade.toFixed(1)
            : "—",
      sub: gradesLoading
        ? "Загрузка оценок"
        : gradesError
          ? "Не удалось загрузить оценки"
          : grades.length > 0
            ? `По оценкам: ${grades.length}`
            : "Пока нет оценок",
      icon: TrendingUp,
    },
    {
      label: "Посещаемость",
      value: attendanceLoading
        ? "…"
        : attendanceError
          ? "—"
          : attendancePercent !== null
            ? `${Math.round(attendancePercent)}%`
            : "—",
      sub: attendanceLoading
        ? "Загрузка посещаемости"
        : attendanceError
          ? "Не удалось загрузить данные"
          : attendance.length > 0
            ? `Записано занятий: ${attendance.length}`
            : "Пока нет записей",
      icon: CheckCircle,
    },
    {
      label: "Бонусные баллы",
      value: progressLoading
        ? "…"
        : progressError
          ? "—"
          : progress
            ? String(progress.coins)
            : "—",
      sub: progressLoading
        ? "Загрузка баланса"
        : progressError
          ? "Не удалось загрузить баланс"
          : "Текущий баланс",
      icon: Star,
    },
    {
      label: "Рейтинг среди студентов",
      value: studentsLoading
        ? "…"
        : studentsError
          ? "—"
          : myRank > 0
            ? `${myRank} / ${students.length}`
            : "—",
      sub: studentsLoading
        ? "Загрузка рейтинга"
        : studentsError
          ? "Не удалось загрузить рейтинг"
          : myRank > 0
            ? "Место по бонусным баллам"
            : "Позиция не определена",
      icon: Award,
    },
  ];

  return (
    <div
      className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Заголовок страницы */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-[#939598]">
            {new Date().toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          <h1 className="text-2xl font-bold text-[#0F2D69]">
            Добро пожаловать
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title="Обновить данные"
          aria-label="Обновить данные"
          className="shrink-0 rounded p-2 text-[#939598] transition-colors hover:text-[#0F2D69] disabled:opacity-40"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Карточки показателей */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="min-w-0 rounded-lg border border-[#C7C8CA] bg-white px-5 py-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#939598]">
                {label}
              </span>
              <Icon
                size={16}
                className="shrink-0 text-[#374B9B]"
              />
            </div>

            <div
              className="mb-0.5 break-words text-2xl font-bold text-[#0F2D69]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {value}
            </div>

            <div className="text-xs text-[#939598]">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Успеваемость по дисциплинам */}
        <section className="min-w-0 rounded-lg border border-[#C7C8CA] bg-white px-5 py-5 sm:px-6 xl:col-span-2">
          <h2 className="mb-4 text-base font-bold text-[#0F2D69]">
            Успеваемость по дисциплинам
          </h2>

          {gradesLoading ? (
            <div className="flex items-center gap-3 py-6 text-sm text-[#939598]">
              <Spinner />
              Загрузка оценок…
            </div>
          ) : gradesError ? (
            <div className="flex items-start gap-2 py-4 text-sm text-red-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{gradesError}</span>
            </div>
          ) : disciplineStats.length === 0 ? (
            <p className="py-6 text-sm text-[#939598]">
              Пока нет оценок по дисциплинам.
            </p>
          ) : (
            <div className="space-y-5">
              {disciplineStats.map((discipline) => {
                const percentage = Math.min(
                  100,
                  Math.max(0, (discipline.average / 10) * 100)
                );

                return (
                  <div key={discipline.id}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[#0F2D69]">
                          {discipline.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#939598]">
                          Оценок: {discipline.count}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-bold text-[#374B9B]">
                        {discipline.average.toFixed(1)} / 10
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-[#E6E7E8]">
                      <div
                        className="h-full rounded-full bg-[#374B9B] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Топ-3 студентов */}
        <section className="min-w-0 rounded-lg border border-[#C7C8CA] bg-white px-5 py-5 sm:px-6">
          <h2 className="mb-5 text-base font-bold text-[#0F2D69]">
            Топ-3 студентов
          </h2>

          {studentsLoading && students.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Spinner />
              <p className="text-sm text-[#939598]">
                Загрузка рейтинга…
              </p>
            </div>
          ) : studentsError && students.length === 0 ? (
            <div className="flex items-start gap-2 py-4 text-sm text-red-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{studentsError}</span>
            </div>
          ) : top3.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#939598]">
              Нет данных о рейтинге
            </p>
          ) : (
            <div className="space-y-3">
              {top3.map((student, index) => {
                const isMe =
                  Number(user?.studentId) === Number(student.id);

                return (
                  <div
                    key={student.id}
                    className={[
                      "flex min-w-0 items-center gap-3 rounded-lg px-3 py-3",
                      isMe
                        ? "border-2"
                        : "border border-[#E6E7E8]",
                    ].join(" ")}
                    style={
                      isMe
                        ? {
                            borderColor: "#374B9B",
                            backgroundColor: "#374B9B0D",
                          }
                        : undefined
                    }
                  >
                    <div className="w-6 shrink-0 text-center text-lg">
                      {medalEmoji(index + 1) ?? index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#0F2D69]">
                        {student.full_name}
                      </div>
                      <div className="text-xs text-[#939598]">
                        {student.total_points} баллов
                      </div>
                    </div>

                    {isMe && (
                      <span className="shrink-0 text-xs font-bold text-[#374B9B]">
                        Вы
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {studentsError && students.length > 0 && (
            <p className="mt-3 text-xs text-red-600">
              Не удалось обновить рейтинг: {studentsError}
            </p>
          )}

          {myRank > 3 && user?.studentId != null && (
            <div className="mt-4 border-t border-[#E6E7E8] pt-4">
              <div className="mb-2 text-center text-xs text-[#939598]">
                Ваша позиция
              </div>

              {(() => {
                const me = ranked.find(
                  (student) =>
                    Number(student.id) === Number(user.studentId)
                );

                if (!me) return null;

                return (
                  <div
                    className="flex min-w-0 items-center gap-3 rounded-lg border-2 px-3 py-3"
                    style={{
                      borderColor: "#374B9B",
                      backgroundColor: "#374B9B0D",
                    }}
                  >
                    <div className="w-6 shrink-0 text-center text-sm font-bold text-[#374B9B]">
                      {myRank}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#0F2D69]">
                        {me.full_name}
                      </div>
                      <div className="text-xs text-[#939598]">
                        {me.total_points} баллов
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-bold text-[#374B9B]">
                      Вы
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="mt-5 border-t border-[#E6E7E8] pt-4">
            <div className="flex items-center gap-2 text-xs text-[#939598]">
              <Medal size={12} />
              Рейтинг рассчитан по бонусным баллам студентов
            </div>
          </div>
        </section>
      </div>

      {/* Ошибка прогресса не блокирует рейтинг и успеваемость */}
      {progressError && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-600">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>
            Не удалось загрузить бонусный прогресс: {progressError}
          </span>
        </div>
      )}

      {attendanceError && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-600">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>
            Не удалось загрузить посещаемость: {attendanceError}
          </span>
        </div>
      )}
    </div>
  );
}
