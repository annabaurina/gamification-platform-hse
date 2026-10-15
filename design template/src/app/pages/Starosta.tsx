import React, { useState } from "react";
import { STUDENTS, SUBJECTS, updateGrade } from "../data";
import { Check, X } from "lucide-react";

type TabKey = "attendance" | "grades";

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return { key: d.toISOString().split("T")[0], label: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) };
});

type AttMap = Record<string, Record<string, boolean>>;

const initAttendance = (): AttMap => {
  const map: AttMap = {};
  STUDENTS.forEach((s) => {
    map[s.id] = {};
    DAYS.forEach((d) => {
      map[s.id][d.key] = Math.random() > 0.15;
    });
  });
  return map;
};

export default function StarostaPage() {
  const [tab, setTab] = useState<TabKey>("attendance");
  const [attendance, setAttendance] = useState<AttMap>(initAttendance);
  const [grades, setGrades] = useState<Record<string, Record<string, number>>>(() => {
    const g: Record<string, Record<string, number>> = {};
    STUDENTS.forEach((s) => { g[s.id] = { ...s.subjects }; });
    return g;
  });
  const [savedMsg, setSavedMsg] = useState("");

  const toggleAttendance = (studentId: string, day: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [day]: !prev[studentId][day] },
    }));
  };

  const handleGradeChange = (studentId: string, subjId: string, val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0 && n <= 10) {
      setGrades((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], [subjId]: n },
      }));
    }
  };

  const saveGrades = () => {
    STUDENTS.forEach((s) => {
      Object.entries(grades[s.id] ?? {}).forEach(([subj, val]) => {
        updateGrade(s.id, subj, val);
      });
    });
    setSavedMsg("Оценки сохранены");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const attPct = (studentId: string) => {
    const days = DAYS.map((d) => attendance[studentId]?.[d.key] ?? false);
    const present = days.filter(Boolean).length;
    return Math.round((present / days.length) * 100);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "attendance", label: "Посещаемость" },
    { key: "grades", label: "Оценки" },
  ];

  return (
    <div className="px-8 py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="mb-6">
        <p className="text-[#939598] text-sm mb-1">Группа БИ-241</p>
        <h1 className="text-[#0F2D69] font-bold text-2xl">Панель старосты</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#C7C8CA]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px",
              tab === t.key
                ? "border-[#0F2D69] text-[#0F2D69]"
                : "border-transparent text-[#939598] hover:text-[#0F2D69]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Attendance tab */}
      {tab === "attendance" && (
        <div>
          <p className="text-[#939598] text-xs mb-4">
            Отмечайте присутствие за последние 7 дней. Кликните по ячейке чтобы изменить статус.
          </p>
          <div className="bg-white rounded-lg border border-[#C7C8CA] overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr className="border-b border-[#E6E7E8]">
                  <th className="text-left px-4 py-3 text-[#0F2D69] font-semibold text-xs w-44" style={{ fontFamily: "var(--font-sans)" }}>
                    Студент
                  </th>
                  {DAYS.map((d) => (
                    <th key={d.key} className="px-3 py-3 text-[#939598] font-medium text-xs text-center whitespace-nowrap">
                      {d.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-[#939598] font-medium text-xs text-center">% пос.</th>
                </tr>
              </thead>
              <tbody>
                {STUDENTS.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={idx % 2 === 0 ? "" : "bg-[#E6E7E8]/30"}
                  >
                    <td className="px-4 py-2.5 text-[#0F2D69] text-xs font-semibold whitespace-nowrap" style={{ fontFamily: "var(--font-sans)" }}>
                      {s.name}
                    </td>
                    {DAYS.map((d) => {
                      const present = attendance[s.id]?.[d.key] ?? false;
                      return (
                        <td key={d.key} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => toggleAttendance(s.id, d.key)}
                            className={[
                              "w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors",
                              present
                                ? "bg-[#0F2D69] text-white"
                                : "bg-[#E6E7E8] text-[#939598] hover:bg-[#C7C8CA]",
                            ].join(" ")}
                            title={present ? "Присутствовал" : "Отсутствовал"}
                          >
                            {present ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2} />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className="font-semibold text-xs"
                        style={{ color: attPct(s.id) >= 80 ? "#0F2D69" : "#939598" }}
                      >
                        {attPct(s.id)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-[#939598]">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#0F2D69] inline-flex items-center justify-center">
                <Check size={10} strokeWidth={2.5} className="text-white" />
              </span>
              Присутствовал
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#E6E7E8] inline-flex items-center justify-center">
                <X size={10} strokeWidth={2} className="text-[#939598]" />
              </span>
              Отсутствовал
            </span>
          </div>
        </div>
      )}

      {/* Grades tab */}
      {tab === "grades" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#939598] text-xs">
              Введите оценки от 0 до 10. Изменения применяются после сохранения.
            </p>
            <div className="flex items-center gap-3">
              {savedMsg && (
                <span className="text-[#0F2D69] text-xs font-semibold flex items-center gap-1">
                  <Check size={13} /> {savedMsg}
                </span>
              )}
              <button
                onClick={saveGrades}
                className="px-5 py-2 rounded text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0F2D69" }}
              >
                Сохранить
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#C7C8CA] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6E7E8]">
                  <th className="text-left px-4 py-3 text-[#0F2D69] font-semibold text-xs w-44">
                    Студент
                  </th>
                  {SUBJECTS.map((s) => (
                    <th key={s.id} className="px-3 py-3 text-[#939598] font-medium text-xs text-center whitespace-nowrap max-w-[120px]">
                      <div className="truncate max-w-[90px] mx-auto" title={s.name}>{s.name.split(" ")[0]}</div>
                      <div className="text-[#C7C8CA] font-normal">{s.credits} кр.</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-[#939598] font-medium text-xs text-center">Сред.</th>
                </tr>
              </thead>
              <tbody>
                {STUDENTS.map((s, idx) => {
                  const gVals = Object.values(grades[s.id] ?? {});
                  const avg = gVals.length
                    ? (gVals.reduce((a, b) => a + b, 0) / gVals.length).toFixed(1)
                    : "—";
                  return (
                    <tr key={s.id} className={idx % 2 === 0 ? "" : "bg-[#E6E7E8]/30"}>
                      <td className="px-4 py-2 text-[#0F2D69] text-xs font-semibold whitespace-nowrap">
                        {s.name}
                      </td>
                      {SUBJECTS.map((subj) => {
                        const g = grades[s.id]?.[subj.id] ?? 0;
                        return (
                          <td key={subj.id} className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={g}
                              onChange={(e) => handleGradeChange(s.id, subj.id, e.target.value)}
                              className="w-12 text-center border border-[#C7C8CA] rounded px-1 py-1 text-xs focus:outline-none focus:border-[#374B9B] text-[#0F2D69] font-semibold bg-transparent"
                              style={{ fontFamily: "var(--font-mono)" }}
                            />
                          </td>
                        );
                      })}
                      <td
                        className="px-4 py-2 text-center font-bold text-sm"
                        style={{ color: parseFloat(avg) >= 8 ? "#0F2D69" : "#939598", fontFamily: "var(--font-mono)" }}
                      >
                        {avg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
