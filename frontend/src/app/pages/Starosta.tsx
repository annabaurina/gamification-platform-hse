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
    if (!err.response) return "Сервер недоступен";
    if (err.response.status === 403) return "Нет прав доступа";
    const data = err.response.data;
    if (data?.detail) return String(data.detail);
  }
  return "Неизвестная ошибка";
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
  const [gradeEdits, setGradeEdits] = useState<Record<string, number>>({});
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
  const myGroupName = myStudentGroup?.group.name ?? "—";

  // Course groups for starosta's group
  const myCourseGroups = myGroupId
    ? courseGroups.filter((cg) => cg.group.id === myGroupId)
    : courseGroups;

  // Students in the group (from student-groups)
  const groupStudents: Student[] = myGroupId
    ? myStudentGroups
        .filter((sg) => sg.group.id === myGroupId)
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

  // Grades: index by "student_id:course_group_id"
  const gradesIndex: Record<string, Grade> = {};
  grades.forEach((g) => {
    gradesIndex[`${g.student.id}:${g.course_group.id}`] = g;
  });

  const handleGradeChange = (studentId: number, cgId: number, val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0 && n <= 10) {
      setGradeEdits((prev) => ({ ...prev, [`${studentId}:${cgId}`]: n }));
    }
  };

  const saveGrades = async () => {
    setSavingGrades(true);
    setGradesMsg(null);
    try {
      const ops = Object.entries(gradeEdits).map(async ([key, score]) => {
        const [sid, cgid] = key.split(":").map(Number);
        const existing = gradesIndex[key];
        if (existing) {
          await updateGrade(existing.id, { score });
        } else {
          await createGrade({ student: sid, course_group: cgid, score });
        }
      });
      await Promise.all(ops);
      setGradeEdits({});
      setGradesMsg({ type: "ok", text: "Оценки сохранены" });
      await load();
    } catch (err) {
      setGradesMsg({ type: "err", text: extractErr(err) });
    } finally {
      setSavingGrades(false);
    }
  };

  const getGradeValue = (studentId: number, cgId: number): number => {
    const key = `${studentId}:${cgId}`;
    if (key in gradeEdits) return gradeEdits[key];
    return gradesIndex[key]?.score ?? 0;
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
            </div>
          )}

          {/* Grades tab */}
          {tab === "grades" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[#939598] text-xs">
                  Оценки от 0 до 10. Изменения применяются после сохранения.
                </p>
                <div className="flex items-center gap-3">
                  {gradesMsg && (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${gradesMsg.type === "ok" ? "text-[#0F2D69]" : "text-red-600"}`}>
                      {gradesMsg.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
                      {gradesMsg.text}
                    </span>
                  )}
                  <button
                    onClick={saveGrades}
                    disabled={savingGrades || Object.keys(gradeEdits).length === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: "#0F2D69" }}
                  >
                    <Save size={14} />
                    {savingGrades ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>

              {myCourseGroups.length === 0 || groupStudents.length === 0 ? (
                <div className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-12 text-center text-[#939598] text-sm">
                  Нет данных для отображения
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-[#C7C8CA] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E7E8]">
                        <th className="text-left px-4 py-3 text-[#0F2D69] font-semibold text-xs w-44">Студент</th>
                        {myCourseGroups.map((cg) => (
                          <th key={cg.id} className="px-3 py-3 text-[#939598] font-medium text-xs text-center whitespace-nowrap">
                            <div className="truncate max-w-[90px] mx-auto" title={cg.discipline.name}>
                              {cg.discipline.name.split(" ")[0]}
                            </div>
                            <div className="text-[#C7C8CA] font-normal">М{cg.module}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupStudents.map((s, idx) => (
                        <tr key={s.id} className={idx % 2 === 0 ? "" : "bg-[#E6E7E8]/30"}>
                          <td className="px-4 py-2 text-[#0F2D69] text-xs font-semibold whitespace-nowrap">
                            {s.full_name}
                          </td>
                          {myCourseGroups.map((cg) => {
                            const key = `${s.id}:${cg.id}`;
                            const val = getGradeValue(s.id, cg.id);
                            const isDirty = key in gradeEdits;
                            return (
                              <td key={cg.id} className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={val}
                                  onChange={(e) => handleGradeChange(s.id, cg.id, e.target.value)}
                                  className={[
                                    "w-12 text-center border rounded px-1 py-1 text-xs focus:outline-none text-[#0F2D69] font-semibold bg-transparent transition-colors",
                                    isDirty ? "border-[#374B9B] bg-[#374B9B08]" : "border-[#C7C8CA] focus:border-[#374B9B]",
                                  ].join(" ")}
                                  style={{ fontFamily: "var(--font-mono)" }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
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
