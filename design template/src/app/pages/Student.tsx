import React from "react";
import { useAuth } from "../auth";
import { STUDENTS, SUBJECTS, BONUS_APPLICATIONS } from "../data";
import { TrendingUp, CheckCircle, Star, Award, Medal } from "lucide-react";

const gradeColor = (g: number) => {
  if (g >= 9) return "#0F2D69";
  if (g >= 7) return "#374B9B";
  if (g >= 5) return "#939598";
  return "#C7C8CA";
};

const medalEmoji = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

export default function StudentPage() {
  const { user } = useAuth();
  const me = STUDENTS.find((s) => s.id === user?.id) ?? STUDENTS[0];

  const ranked = [...STUDENTS].sort((a, b) => {
    const scoreA = a.gpa * 5 + a.attendance * 0.3 + a.bonusPoints * 0.2;
    const scoreB = b.gpa * 5 + b.attendance * 0.3 + b.bonusPoints * 0.2;
    return scoreB - scoreA;
  });

  const myRank = ranked.findIndex((s) => s.id === me.id) + 1;
  const top3 = ranked.slice(0, 3);

  const myApps = BONUS_APPLICATIONS.filter((a) => a.studentId === me.id);
  const approvedBonus = myApps
    .filter((a) => a.status === "approved")
    .reduce((sum, a) => sum + a.pointsRequested, 0);

  const stats = [
    { label: "Средний балл", value: me.gpa.toFixed(1), icon: TrendingUp, sub: "из 10" },
    { label: "Посещаемость", value: `${me.attendance}%`, icon: CheckCircle, sub: "занятий" },
    { label: "Бонусные баллы", value: me.bonusPoints, icon: Star, sub: `+${approvedBonus} подтверждено` },
    { label: "Рейтинг в группе", value: `${myRank} / ${STUDENTS.length}`, icon: Award, sub: "место" },
  ];

  return (
    <div className="px-8 py-8 max-w-5xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#939598] text-sm mb-1">Группа {me.group} · {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
        <h1 className="text-[#0F2D69] font-bold text-2xl">Добро пожаловать, {me.name.split(" ")[0]}!</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="bg-white rounded-lg border border-[#C7C8CA] px-5 py-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#939598] text-xs font-semibold uppercase tracking-wide">{label}</span>
              <Icon size={16} style={{ color: "#374B9B" }} />
            </div>
            <div className="text-[#0F2D69] font-bold text-2xl mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>
              {value}
            </div>
            <div className="text-[#939598] text-xs">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject progress */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#C7C8CA] px-6 py-5">
          <h2 className="text-[#0F2D69] font-bold text-base mb-5">Успеваемость по дисциплинам</h2>
          <div className="space-y-4">
            {SUBJECTS.map((subj) => {
              const grade = me.subjects[subj.id] ?? 0;
              const pct = (grade / 10) * 100;
              return (
                <div key={subj.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[#0F2D69] text-sm">{subj.name}</span>
                    <span
                      className="font-bold text-sm"
                      style={{ color: gradeColor(grade), fontFamily: "var(--font-mono)" }}
                    >
                      {grade}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E6E7E8] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: gradeColor(grade) }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[#939598] text-xs">{subj.credits} кредита</span>
                    <span className="text-[#939598] text-xs">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-3 leaderboard */}
        <div className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-5">
          <h2 className="text-[#0F2D69] font-bold text-base mb-5">Топ-3 группы</h2>
          <div className="space-y-3">
            {top3.map((s, i) => {
              const isMe = s.id === me.id;
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
                    <div className="text-[#0F2D69] text-sm font-semibold truncate">{s.name}</div>
                    <div className="text-[#939598] text-xs">
                      ср. {s.gpa.toFixed(1)} · {s.bonusPoints} бал.
                    </div>
                  </div>
                  {isMe && (
                    <span className="text-[#374B9B] text-xs font-bold shrink-0">Вы</span>
                  )}
                </div>
              );
            })}
          </div>

          {myRank > 3 && (
            <div className="mt-4 pt-4 border-t border-[#E6E7E8]">
              <div className="text-[#939598] text-xs mb-2 text-center">Ваша позиция</div>
              <div
                className="flex items-center gap-3 px-3 py-3 rounded-lg border-2"
                style={{ borderColor: "#374B9B", backgroundColor: "#374B9B0D" }}
              >
                <div className="text-sm font-bold w-6 text-center shrink-0 text-[#374B9B]">
                  {myRank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#0F2D69] text-sm font-semibold truncate">{me.name}</div>
                  <div className="text-[#939598] text-xs">
                    ср. {me.gpa.toFixed(1)} · {me.bonusPoints} бал.
                  </div>
                </div>
                <span className="text-[#374B9B] text-xs font-bold shrink-0">Вы</span>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[#E6E7E8]">
            <div className="flex items-center gap-2 text-[#939598] text-xs">
              <Medal size={12} />
              Рейтинг учитывает ср. балл, посещаемость и бонусы
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
