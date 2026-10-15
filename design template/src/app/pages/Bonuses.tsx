import React, { useState } from "react";
import { useAuth } from "../auth";
import {
  BONUS_APPLICATIONS,
  BONUS_CATEGORIES,
  addBonusApplication,
  BonusApplication,
} from "../data";
import { Plus, X, CheckCircle, Clock, XCircle, ChevronDown } from "lucide-react";

const STATUS_META = {
  pending:  { label: "На рассмотрении", icon: Clock,        color: "#939598", bg: "#939598" },
  approved: { label: "Одобрено",        icon: CheckCircle,  color: "#0F2D69", bg: "#0F2D69" },
  rejected: { label: "Отклонено",       icon: XCircle,      color: "#C7C8CA", bg: "#C7C8CA" },
};

function StatusBadge({ status }: { status: BonusApplication["status"] }) {
  const { label, icon: Icon, color, bg } = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${bg}18`, color }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function BonusesPage() {
  const { user } = useAuth();
  const isStarosta = user?.role === "starosta";

  const [apps, setApps] = useState<BonusApplication[]>(
    () => isStarosta
      ? BONUS_APPLICATIONS
      : BONUS_APPLICATIONS.filter((a) => a.studentId === user?.id)
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: BONUS_CATEGORIES[0],
    description: "",
    pointsRequested: 10,
  });
  const [formError, setFormError] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | BonusApplication["status"]>("all");

  const refresh = () => {
    setApps(
      isStarosta
        ? [...BONUS_APPLICATIONS]
        : BONUS_APPLICATIONS.filter((a) => a.studentId === user?.id)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setFormError("Заполните описание заявки");
      return;
    }
    addBonusApplication({
      studentId: user?.id ?? "u1",
      studentName: user?.name ?? "Студент",
      group: user?.group ?? "БИ-241",
      ...form,
    });
    refresh();
    setShowForm(false);
    setForm({ category: BONUS_CATEGORIES[0], description: "", pointsRequested: 10 });
    setFormError("");
  };

  const filtered = filterStatus === "all" ? apps : apps.filter((a) => a.status === filterStatus);

  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="px-8 py-8 max-w-4xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[#939598] text-sm mb-1">
            {isStarosta ? "Группа БИ-241 · все заявки" : `Группа ${user?.group}`}
          </p>
          <h1 className="text-[#0F2D69] font-bold text-2xl">Бонусные баллы</h1>
        </div>
        {!isStarosta && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-bold text-white"
            style={{ backgroundColor: "#0F2D69" }}
          >
            <Plus size={16} />
            Подать заявку
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#C7C8CA]">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={[
              "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5",
              filterStatus === s
                ? "border-[#0F2D69] text-[#0F2D69]"
                : "border-transparent text-[#939598] hover:text-[#0F2D69]",
            ].join(" ")}
          >
            {s === "all" ? "Все" : STATUS_META[s].label}
            <span
              className="text-xs rounded-full px-1.5 py-0.5 font-mono"
              style={{ backgroundColor: "#E6E7E8", color: "#939598" }}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Application list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#939598] text-sm">
            Заявок не найдено
          </div>
        )}
        {filtered.map((app) => (
          <div key={app.id} className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-[#374B9B] text-xs font-bold uppercase tracking-wide">
                    {app.category}
                  </span>
                  <StatusBadge status={app.status} />
                </div>
                {isStarosta && (
                  <div className="text-[#0F2D69] text-sm font-semibold mb-1">{app.studentName}</div>
                )}
                <p className="text-[#0F2D69] text-sm leading-relaxed">{app.description}</p>
                {app.adminComment && (
                  <div className="mt-2 text-xs text-[#939598] italic border-l-2 border-[#C7C8CA] pl-3">
                    {app.adminComment}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-bold text-xl mb-0.5"
                  style={{ color: "#0F2D69", fontFamily: "var(--font-mono)" }}
                >
                  +{app.pointsRequested}
                </div>
                <div className="text-[#939598] text-xs">баллов</div>
                <div className="text-[#C7C8CA] text-xs mt-1">{app.createdAt}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New application modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(15,45,105,0.4)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg px-8 py-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#0F2D69] font-bold text-lg">Новая заявка на бонус</h2>
              <button onClick={() => setShowForm(false)} className="text-[#939598] hover:text-[#0F2D69]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">Категория</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full appearance-none border border-[#C7C8CA] rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B] pr-9"
                  >
                    {BONUS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#939598] pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">Описание достижения</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Опишите ваше достижение подробно..."
                  rows={4}
                  className="w-full border border-[#C7C8CA] rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B] resize-none placeholder-[#C7C8CA]"
                />
              </div>

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                  Запрашиваемые баллы
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.pointsRequested}
                  onChange={(e) => setForm((f) => ({ ...f, pointsRequested: parseInt(e.target.value) || 1 }))}
                  className="w-32 border border-[#C7C8CA] rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B]"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                <span className="ml-2 text-[#939598] text-sm">из 50 макс.</span>
              </div>

              {formError && (
                <p className="text-red-600 text-xs">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded font-bold text-sm text-white"
                  style={{ backgroundColor: "#0F2D69" }}
                >
                  Отправить заявку
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded font-semibold text-sm border border-[#C7C8CA] text-[#939598] hover:text-[#0F2D69] hover:border-[#939598] transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
