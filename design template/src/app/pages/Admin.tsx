import React, { useState } from "react";
import {
  BONUS_APPLICATIONS,
  updateApplicationStatus,
  BonusApplication,
} from "../data";
import { CheckCircle, XCircle, X } from "lucide-react";

const STATUS_META = {
  pending:  { label: "На рассмотрении", color: "#939598" },
  approved: { label: "Одобрено",        color: "#0F2D69" },
  rejected: { label: "Отклонено",       color: "#C7C8CA" },
};

type ModalState = {
  app: BonusApplication;
  action: "approved" | "rejected";
  comment: string;
} | null;

export default function AdminPage() {
  const [apps, setApps] = useState<BonusApplication[]>([...BONUS_APPLICATIONS]);
  const [filterStatus, setFilterStatus] = useState<"all" | BonusApplication["status"]>("pending");
  const [modal, setModal] = useState<ModalState>(null);

  const refresh = () => setApps([...BONUS_APPLICATIONS]);

  const openModal = (app: BonusApplication, action: "approved" | "rejected") => {
    setModal({ app, action, comment: "" });
  };

  const handleConfirm = () => {
    if (!modal) return;
    updateApplicationStatus(modal.app.id, modal.action, modal.comment);
    refresh();
    setModal(null);
  };

  const filtered = filterStatus === "all" ? apps : apps.filter((a) => a.status === filterStatus);

  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const totalPending = counts.pending;
  const totalApproved = counts.approved;
  const pointsApproved = apps
    .filter((a) => a.status === "approved")
    .reduce((s, a) => s + a.pointsRequested, 0);

  return (
    <div className="px-8 py-8 max-w-5xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[#939598] text-sm mb-1">Управление заявками</p>
        <h1 className="text-[#0F2D69] font-bold text-2xl">Панель администратора</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: "Ожидают решения", value: totalPending, note: "заявок", highlight: true },
          { label: "Одобрено",        value: totalApproved, note: "заявок", highlight: false },
          { label: "Баллов выдано",   value: pointsApproved, note: "суммарно", highlight: false },
        ].map(({ label, value, note, highlight }) => (
          <div
            key={label}
            className={[
              "rounded-lg border px-5 py-4",
              highlight ? "border-[#374B9B]/40" : "border-[#C7C8CA] bg-white",
            ].join(" ")}
            style={highlight ? { backgroundColor: "#374B9B0D" } : {}}
          >
            <div className="text-[#939598] text-xs font-semibold uppercase tracking-wide mb-2">{label}</div>
            <div
              className="font-bold text-3xl mb-0.5"
              style={{ color: "#0F2D69", fontFamily: "var(--font-mono)" }}
            >
              {value}
            </div>
            <div className="text-[#939598] text-xs">{note}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-0 mb-5 border-b border-[#C7C8CA]">
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
            <span className="text-xs rounded-full px-1.5 py-0.5" style={{ backgroundColor: "#E6E7E8", color: "#939598" }}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Application cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#939598] text-sm">Заявок не найдено</div>
        )}
        {filtered.map((app) => (
          <div key={app.id} className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-5">
            <div className="flex items-start gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[#374B9B] text-xs font-bold uppercase tracking-wide">{app.category}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${STATUS_META[app.status].color}18`, color: STATUS_META[app.status].color }}
                  >
                    {STATUS_META[app.status].label}
                  </span>
                  <span className="text-[#C7C8CA] text-xs">{app.createdAt}</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[#0F2D69] font-bold text-sm">{app.studentName}</span>
                  <span className="text-[#939598] text-xs">· {app.group}</span>
                </div>
                <p className="text-[#0F2D69] text-sm leading-relaxed">{app.description}</p>
                {app.adminComment && (
                  <div className="mt-2 text-xs text-[#939598] italic border-l-2 border-[#C7C8CA] pl-3">
                    Комментарий: {app.adminComment}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-3">
                <div className="text-right">
                  <div
                    className="font-bold text-2xl"
                    style={{ color: "#0F2D69", fontFamily: "var(--font-mono)" }}
                  >
                    +{app.pointsRequested}
                  </div>
                  <div className="text-[#939598] text-xs">баллов</div>
                </div>

                {app.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(app, "approved")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#0F2D69" }}
                    >
                      <CheckCircle size={13} />
                      Одобрить
                    </button>
                    <button
                      onClick={() => openModal(app, "rejected")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border border-[#C7C8CA] text-[#939598] hover:border-[#939598] hover:text-[#0F2D69] transition-colors"
                    >
                      <XCircle size={13} />
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(15,45,105,0.4)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md px-7 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#0F2D69] font-bold text-base">
                {modal.action === "approved" ? "Одобрить заявку?" : "Отклонить заявку?"}
              </h2>
              <button onClick={() => setModal(null)} className="text-[#939598] hover:text-[#0F2D69]">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#E6E7E8] rounded-lg px-4 py-3 mb-4 text-sm text-[#0F2D69]">
              <div className="font-semibold mb-0.5">{modal.app.studentName}</div>
              <div className="text-[#939598] text-xs">{modal.app.description}</div>
            </div>

            <div className="mb-4">
              <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                Комментарий {modal.action === "rejected" && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={modal.comment}
                onChange={(e) => setModal((m) => m ? { ...m, comment: e.target.value } : null)}
                rows={3}
                placeholder={
                  modal.action === "approved"
                    ? "Необязательный комментарий..."
                    : "Укажите причину отклонения..."
                }
                className="w-full border border-[#C7C8CA] rounded px-3 py-2 text-sm text-[#0F2D69] focus:outline-none focus:border-[#374B9B] resize-none placeholder-[#C7C8CA]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={modal.action === "rejected" && !modal.comment.trim()}
                className={[
                  "flex-1 py-2.5 rounded font-bold text-sm text-white transition-opacity",
                  modal.action === "rejected" && !modal.comment.trim() ? "opacity-40 cursor-not-allowed" : "hover:opacity-90",
                ].join(" ")}
                style={{ backgroundColor: modal.action === "approved" ? "#0F2D69" : "#939598" }}
              >
                {modal.action === "approved" ? "Подтвердить одобрение" : "Подтвердить отклонение"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2.5 rounded font-semibold text-sm border border-[#C7C8CA] text-[#939598] hover:border-[#939598] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
