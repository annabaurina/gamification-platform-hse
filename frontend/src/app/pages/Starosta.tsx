import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth";
import { getStudentGroups } from "../api/studentGroups.api";
import { getCourseGroups } from "../api/courseGroups.api";
import { getGrades, createGrade, updateGrade } from "../api/grades.api";
import { getAttendance, markGroupAttendance } from "../api/attendance.api";
import { CourseGroup, Grade, Attendance, StudentGroup, Student } from "../types";
import { Check, X, RefreshCw, AlertCircle, Save, ChevronDown } from "lucide-react";
import { AxiosError } from "axios";

type TabKey = "attendance" | "grades";

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-[#374B9B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-lg border border-red-200 px-6 py-10 flex flex-col items-center gap-4">
      <AlertCircle size={32} className="text-red-400" />
      <div className="text-center">
        <p className="text-[#0F2D69] font-semibold mb-1">Ошибка загрузки</p>
        <p className="text-[#939598] text-sm">{message}</p>
      </div>
      <button onClick={onRetry} className="px-5 py-2 rounded text-sm font-bold text-white"
        style={{ backgroundColor: "#0F2D69" }}>
        Повторить
      </button>
    </div>
  );
}

function extractErr(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return `Нет ответа от сервера: ${err.message}`;
    }

    const { status, data } = err.response;

    if (typeof data === "string") {
      return `HTTP ${status}: ${data}`;
    }

    if (data && typeof data === "object") {
      return `HTTP ${status}: ${Object.entries(data)
        .map(([field, value]) => {
          const message =
            typeof value === "string"
              ? value
              : JSON.stringify(value);

          return `${field}: ${message}`;
        })
        .join("; ")}`;
    }

    return `Ошибка HTTP ${status}`;
  }

  return err instanceof Error
    ? err.message
    : "Неизвестная ошибка";
}

export default function StarostaPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("attendance");

  // Data state
  const [myStudentGroups, setMyStudentGroups] = useState<StudentGroup[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attendance state
  const [selectedCourseGroup, setSelectedCourseGroup] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [presentSet, setPresentSet] = useState<Set<number>>(new Set());
  const [savingAtt, setSavingAtt] = useState(false);
  const [attMsg, setAttMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Grades state
  const [gradeEdits, setGradeEdits] = useState<Record<string, string>>({});
  const [selectedGradeCourseGroup, setSelectedGradeCourseGroup] = useState<number | null>(null);
  const [selectedGradeDate, setSelectedGradeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradesMsg, setGradesMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sgs, cgs, grs, att] = await Promise.all([
        getStudentGroups(),
        getCourseGroups(),
        getGrades(),
        getAttendance(),
      ]);
      setMyStudentGroups(sgs);
      setCourseGroups(cgs);
      setGrades(grs);
      setAttendance(att);
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Find the group the starosta belongs to
  const myStudentGroup = user?.studentId
    ? myStudentGroups.find((sg) => sg.student.id === user.studentId)
    : undefined;
  const myGroupId = myStudentGroup?.group.id;
  const myGroupYear = myStudentGroup?.year;
  const myGroupName = myStudentGroup?.group.name ?? "—";

  // Scope every action to the starosta's exact group and academic year.
  const myCourseGroups = myGroupId && myGroupYear
    ? courseGroups.filter((cg) => cg.group.id === myGroupId && cg.year === myGroupYear)
    : [];

  // Include every enrolled student, including the starosta themself.
  const groupStudents: Student[] = myGroupId && myGroupYear
    ? myStudentGroups
        .filter((sg) => sg.group.id === myGroupId && sg.year === myGroupYear)
        .map((sg) => sg.student)
    : [];

  // When course group or date changes, pre-populate present set from loaded attendance
  useEffect(() => {
    if (!selectedCourseGroup) return;
    const existing = attendance.filter(
      (a) => a.course_group.id === selectedCourseGroup && a.date === selectedDate
    );
    const ids = existing.filter((a) => a.is_present).map((a) => a.student.id);
    if (existing.length > 0) {
      setPresentSet(new Set(ids));
    } else {
      // Default: all present
      setPresentSet(new Set(groupStudents.map((s) => s.id)));
    }
  }, [selectedCourseGroup, selectedDate, attendance]);

  const togglePresent = (studentId: number) => {
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const saveAttendance = async () => {
    if (!selectedCourseGroup) {
      setAttMsg({ type: "err", text: "Выберите курс" });
      return;
    }
    setSavingAtt(true);
    setAttMsg(null);
    try {
      const result = await markGroupAttendance({
        course_group_id: selectedCourseGroup,
        date: selectedDate,
        present_students: Array.from(presentSet),
      });
      setAttMsg({ type: "ok", text: `Сохранено: ${result.created} из ${result.total} записей` });
      await load();
    } catch (err) {
      setAttMsg({ type: "err", text: extractErr(err) });
    } finally {
      setSavingAtt(false);
    }
  };

  // A separate grade record is identified by student + course + date.
  const gradesIndex: Record<string, Grade> = {};
  grades.forEach((g) => {
    gradesIndex[`${g.student.id}:${g.course_group.id}:${g.date}`] = g;
  });

  const gradeKey = (studentId: number, courseGroupId: number, date: string) =>
    `${studentId}:${courseGroupId}:${date}`;

  const handleGradeChange = (studentId: number, courseGroupId: number, val: string) => {
    const key = gradeKey(studentId, courseGroupId, selectedGradeDate);
    if (val === "") {
      setGradeEdits((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    const score = Number(val);
    if (Number.isInteger(score) && score >= 0 && score <= 10) {
      setGradeEdits((prev) => ({ ...prev, [key]: val }));
    }
  };

  const activeGradeEdits = Object.entries(gradeEdits).filter(([key, value]) => {
    const [, courseGroupId, date] = key.split(":");
    return Number(courseGroupId) === selectedGradeCourseGroup && date === selectedGradeDate && value !== "";
  });

  const saveGrades = async () => {
    if (!selectedGradeCourseGroup) {
      setGradesMsg({ type: "err", text: "Сначала выберите предмет" });
      return;
    }
    if (activeGradeEdits.length === 0) {
      setGradesMsg({ type: "err", text: "Измените хотя бы одну оценку" });
      return;
    }

    setSavingGrades(true);
    setGradesMsg(null);
    try {
      const ops = activeGradeEdits.map(async ([key, rawScore]) => {
        const [studentId, courseGroupId, date] = key.split(":");
        const score = Number(rawScore);
        const existing = gradesIndex[key];
        if (existing) {
          await updateGrade(existing.id, { score, date });
        } else {
          await createGrade({ student: Number(studentId), course_group: Number(courseGroupId), score, date });
        }
      });
      await Promise.all(ops);
      setGradeEdits((prev) => {
        const next = { ...prev };
        activeGradeEdits.forEach(([key]) => delete next[key]);
        // Empty temporary values in this same subject/date are not saved.
        Object.keys(next).forEach((key) => {
          const [, courseGroupId, date] = key.split(":");
          if (Number(courseGroupId) === selectedGradeCourseGroup && date === selectedGradeDate) delete next[key];
        });
        return next;
      });
      setGradesMsg({ type: "ok", text: "Оценки сохранены" });
      await load();
    } catch (err) {
      setGradesMsg({ type: "err", text: extractErr(err) });
    } finally {
      setSavingGrades(false);
    }
  };

  const getGradeValue = (studentId: number, courseGroupId: number): string => {
    const key = gradeKey(studentId, courseGroupId, selectedGradeDate);
    if (key in gradeEdits) return gradeEdits[key];
    const existing = gradesIndex[key];
    return existing ? String(existing.score) : "";
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "attendance", label: "Посещаемость" },
    { key: "grades", label: "Оценки" },
  ];

  return (
    <div className="px-8 py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[#939598] text-sm mb-1">Группа {myGroupName}</p>
          <h1 className="text-[#0F2D69] font-bold text-2xl">Панель старосты</h1>
        </div>
        <button onClick={load} disabled={loading} title="Обновить"
          className="text-[#939598] hover:text-[#0F2D69] transition-colors disabled:opacity-40">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-[#939598] text-sm">Загрузка данных...</p>
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {/* Tabs */}
          <div className="flex gap-0 mb-6 border-b border-[#C7C8CA]">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={[
                  "px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px",
                  tab === t.key
                    ? "border-[#0F2D69] text-[#0F2D69]"
                    : "border-transparent text-[#939598] hover:text-[#0F2D69]",
                ].join(" ")}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Attendance tab */}
          {tab === "attendance" && (
            <div>
              {/* Controls */}
              <div className="flex flex-wrap items-end gap-4 mb-5">
                <div>
                  <label className="block text-[#0F2D69] text-xs font-semibold mb-1.5">Курс / дисциплина</label>
                  <div className="relative">
                    <select
                      value={selectedCourseGroup ?? ""}
                      onChange={(e) => setSelectedCourseGroup(e.target.value ? Number(e.target.value) : null)}
                      className="appearance-none border border-[#C7C8CA] rounded px-3.5 py-2 pr-8 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B] min-w-[240px]"
                    >
                      <option value="">— Выберите курс —</option>
                      {myCourseGroups.map((cg) => (
                        <option key={cg.id} value={cg.id}>
                          {cg.discipline.name} · Модуль {cg.module}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#939598] pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[#0F2D69] text-xs font-semibold mb-1.5">Дата</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-[#C7C8CA] rounded px-3.5 py-2 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B]"
                  />
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  {attMsg && (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${attMsg.type === "ok" ? "text-[#0F2D69]" : "text-red-600"}`}>
                      {attMsg.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
                      {attMsg.text}
                    </span>
                  )}
                  <button
                    onClick={saveAttendance}
                    disabled={savingAtt || !selectedCourseGroup}
                    className="flex items-center gap-2 px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: "#0F2D69" }}
                  >
                    <Save size={14} />
                    {savingAtt ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>

              {groupStudents.length === 0 ? (
                <div className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-12 text-center text-[#939598] text-sm">
                  Студенты группы не найдены
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-[#C7C8CA]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E7E8]">
                        <th className="text-left px-4 py-3 text-[#0F2D69] font-semibold text-xs">Студент</th>
                        <th className="px-4 py-3 text-[#939598] font-medium text-xs text-center">Присутствие</th>
                        <th className="px-4 py-3 text-[#939598] font-medium text-xs text-center">Баллы</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStudents.map((s, idx) => {
                        const isPresent = presentSet.has(s.id);
                        return (
                          <tr key={s.id} className={idx % 2 === 0 ? "" : "bg-[#E6E7E8]/30"}>
                            <td className="px-4 py-2.5 text-[#0F2D69] text-xs font-semibold">{s.full_name}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => togglePresent(s.id)}
                                className={[
                                  "w-7 h-7 rounded flex items-center justify-center mx-auto transition-colors",
                                  isPresent ? "bg-[#0F2D69] text-white" : "bg-[#E6E7E8] text-[#939598] hover:bg-[#C7C8CA]",
                                ].join(" ")}
                              >
                                {isPresent ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2} />}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-center text-[#939598] text-xs"
                              style={{ fontFamily: "var(--font-mono)" }}>
                              {s.total_points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedCourseGroup && groupStudents.length > 0 && (() => {
                const end = new Date(`${selectedDate}T12:00:00`);
                const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(end);
                  d.setDate(end.getDate() - (6 - i));
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                });
                const selectedRecords = attendance.filter((a) => a.course_group.id === selectedCourseGroup);
                return (
                  <section className="mt-7">
                    <div className="mb-3">
                      <h3 className="text-[#0F2D69] font-bold text-base">Посещаемость за 7 дней</h3>
                      <p className="text-[#939598] text-xs mt-1">Для выбранной дисциплины. Процент считается по всем датам, на которые уже внесена посещаемость.</p>
                    </div>
                    <div className="bg-white rounded-lg border border-[#C7C8CA] overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#E6E7E8]">
                            <th className="text-left px-3 py-3 text-[#0F2D69] font-semibold text-xs min-w-[170px]">Студент</th>
                            {lastSevenDays.map((day) => (
                              <th key={day} className="px-2 py-3 text-[#939598] font-medium text-xs text-center whitespace-nowrap">{day.slice(5)}</th>
                            ))}
                            <th className="px-3 py-3 text-[#0F2D69] font-semibold text-xs text-center whitespace-nowrap">Посещаемость</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupStudents.map((student, idx) => {
                            const studentRecords = selectedRecords.filter((a) => a.student.id === student.id);
                            const presentCount = studentRecords.filter((a) => a.is_present).length;
                            const percent = studentRecords.length ? Math.round((presentCount / studentRecords.length) * 100) : null;
                            return (
                              <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-[#E6E7E8]/30"}>
                                <td className="px-3 py-2 text-[#0F2D69] text-xs font-semibold">{student.full_name}</td>
                                {lastSevenDays.map((day) => {
                                  const mark = studentRecords.find((a) => a.date === day);
                                  return <td key={day} className="px-2 py-2 text-center text-xs">{mark ? (mark.is_present ? <span className="text-green-700 font-bold">✓</span> : <span className="text-red-600 font-bold">✕</span>) : <span className="text-[#C7C8CA]">—</span>}</td>;
                                })}
                                <td className="px-3 py-2 text-center text-xs font-bold text-[#0F2D69]">{percent === null ? "Нет данных" : `${percent}% (${presentCount}/${studentRecords.length})`}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })()}
            </div>
          )}

          {/* Grades tab: select exactly one subject for the chosen date */}
          {tab === "grades" && (
            <div>
              <div className="bg-white rounded-lg border border-[#C7C8CA] px-4 py-4 mb-5">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-[#0F2D69] text-xs font-semibold mb-1.5">Дата занятия</label>
                    <input
                      type="date"
                      value={selectedGradeDate}
                      onChange={(e) => setSelectedGradeDate(e.target.value)}
                      className="border border-[#C7C8CA] rounded px-3.5 py-2 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F2D69] text-xs font-semibold mb-1.5">Предмет</label>
                    <div className="relative">
                      <select
                        value={selectedGradeCourseGroup ?? ""}
                        onChange={(e) => setSelectedGradeCourseGroup(e.target.value ? Number(e.target.value) : null)}
                        className="appearance-none border border-[#C7C8CA] rounded px-3.5 py-2 pr-8 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B] min-w-[260px]"
                      >
                        <option value="">— Выберите предмет —</option>
                        {myCourseGroups.map((cg) => (
                          <option key={cg.id} value={cg.id}>
                            {cg.discipline.name} · Модуль {cg.module}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#939598] pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    {gradesMsg && (
                      <span className={`text-xs font-semibold flex items-center gap-1 ${gradesMsg.type === "ok" ? "text-[#0F2D69]" : "text-red-600"}`}>
                        {gradesMsg.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
                        {gradesMsg.text}
                      </span>
                    )}
                    <button
                      onClick={saveGrades}
                      disabled={savingGrades || activeGradeEdits.length === 0 || !selectedGradeCourseGroup}
                      className="flex items-center gap-2 px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                      style={{ backgroundColor: "#0F2D69" }}
                    >
                      <Save size={14} />
                      {savingGrades ? "Сохранение..." : "Сохранить оценки"}
                    </button>
                  </div>
                </div>
                <p className="text-[#939598] text-xs mt-3">
                  Выберите дату и один предмет из расписания, затем выставьте оценки от 0 до 10.
                </p>
              </div>

              {myCourseGroups.length === 0 || groupStudents.length === 0 ? (
                <div className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-12 text-center text-[#939598] text-sm">
                  Нет студентов или предметов для вашей учебной группы
                </div>
              ) : !selectedGradeCourseGroup ? (
                <div className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-12 text-center text-[#939598] text-sm">
                  Выберите один предмет, чтобы открыть журнал оценок
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-[#C7C8CA] overflow-x-auto">
                  <div className="px-4 py-3 border-b border-[#E6E7E8]">
                    <h3 className="text-[#0F2D69] font-bold text-sm">
                      {myCourseGroups.find((cg) => cg.id === selectedGradeCourseGroup)?.discipline.name}
                    </h3>
                    <p className="text-[#939598] text-xs mt-1">Дата: {selectedGradeDate} · Группа {myGroupName}</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E7E8]">
                        <th className="text-left px-4 py-3 text-[#0F2D69] font-semibold text-xs w-44">Студент</th>
                        <th className="px-4 py-3 text-[#939598] font-medium text-xs text-center">Оценка (0–10)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStudents.map((student, idx) => {
                        const value = getGradeValue(student.id, selectedGradeCourseGroup);
                        const key = gradeKey(student.id, selectedGradeCourseGroup, selectedGradeDate);
                        const isDirty = key in gradeEdits;
                        return (
                          <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-[#E6E7E8]/30"}>
                            <td className="px-4 py-2.5 text-[#0F2D69] text-xs font-semibold whitespace-nowrap">
                              {student.full_name}{student.id === user?.studentId ? " (вы)" : ""}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="1"
                                value={value}
                                onChange={(e) => handleGradeChange(student.id, selectedGradeCourseGroup, e.target.value)}
                                aria-label={`Оценка ${student.full_name}`}
                                className={[
                                  "w-20 text-center border rounded px-2 py-1.5 text-sm focus:outline-none text-[#0F2D69] font-semibold bg-transparent transition-colors",
                                  isDirty ? "border-[#374B9B] bg-[#374B9B08]" : "border-[#C7C8CA] focus:border-[#374B9B]",
                                ].join(" ")}
                                style={{ fontFamily: "var(--font-mono)" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
