import React, { useState, useCallback, useEffect } from "react";
import {
  getPendingBonusEvents,
  getAllBonusEvents,
  getBonusEventStats,
  approveBonusEvent,
  rejectBonusEvent,
} from "../api/bonusEvents.api";
import { BonusEvent, BonusEventStats, BonusEventStatus } from "../types";
import { CheckCircle, XCircle, X, RefreshCw, AlertCircle } from "lucide-react";
import { AxiosError } from "axios";

const STATUS_META: Record<BonusEventStatus, { label: string; color: string }> = {
  pending: { label: "На рассмотрении", color: "#939598" },
  approved: { label: "Одобрено", color: "#0F2D69" },
  rejected: { label: "Отклонено", color: "#C7C8CA" },
};

const TYPE_LABELS: Record<string, string> = {
  event: "Мероприятие",
  olympiad: "Олимпиада",
  achievement: "Достижение",
  custom: "Другое",
};

type ModalState = {
  app: BonusEvent;
  action: "approved" | "rejected";
  comment: string;
  points: string;
} | null;

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-[#374B9B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function extractErr(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) return "Сервер недоступен";
    const data = err.response.data;
    if (data?.detail) return String(data.detail);
    if (err.response.status === 403) return "Нет прав доступа. Только администратор может выполнять это действие.";
  }
  return "Неизвестная ошибка";
}

export default function AdminPage() {
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [stats, setStats] = useState<BonusEventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | BonusEventStatus>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evs, st] = await Promise.all([
        getAllBonusEvents(),
        getBonusEventStats(),
      ]);
      setEvents(evs);
      setStats(st);
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (app: BonusEvent, action: "approved" | "rejected") => {
    setModal({ app, action, comment: "", points: "" });
    setModalError(null);
  };

  const handleConfirm = async () => {
    if (!modal) return;
    if (modal.action === "rejected" && !modal.comment.trim()) {
      setModalError("Укажите причину отклонения");
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      const payload = {
        admin_comment: modal.comment.trim() || undefined,
        points_awarded: modal.action === "approved" && modal.points
          ? parseInt(modal.points)
          : undefined,
      };
      if (modal.action === "approved") {
        await approveBonusEvent(modal.app.id, payload);
      } else {
        await rejectBonusEvent(modal.app.id, { admin_comment: modal.comment.trim() });
      }
      setModal(null);
      await load();
    } catch (err) {
      setModalError(extractErr(err));
    } finally {
      setModalLoading(false);
    }
  };

  const allEvents = events;
  const filtered = filterStatus === "all" ? allEvents : allEvents.filter((e) => e.status === filterStatus);

  const pendingCount = allEvents.filter((e) => e.status === "pending").length;

  return (
    <div className="px-8 py-8 max-w-5xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[#939598] text-sm mb-1">Управление заявками</p>
          <h1 className="text-[#0F2D69] font-bold text-2xl">Панель администратора</h1>
        </div>
        <button onClick={load} disabled={loading} title="Обновить"
          className="text-[#939598] hover:text-[#0F2D69] transition-colors disabled:opacity-40">
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
        <div className="bg-white rounded-lg border border-red-200 px-6 py-10 flex flex-col items-center gap-4">
          <AlertCircle size={32} className="text-red-400" />
          <div className="text-center">
            <p className="text-[#0F2D69] font-semibold mb-1">Ошибка загрузки</p>
            <p className="text-[#939598] text-sm">{error}</p>
          </div>
          <button onClick={load} className="px-5 py-2 rounded text-sm font-bold text-white"
            style={{ backgroundColor: "#0F2D69" }}>Повторить</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            {[
              {
                label: "Ожидают решения",
                value: stats?.pending ?? pendingCount,
                note: "заявок",
                highlight: true,
              },
              {
                label: "Одобрено",
                value: stats?.approved ?? 0,
                note: "заявок",
                highlight: false,
              },
              {
                label: "Отклонено",
                value: stats?.rejected ?? 0,
                note: "заявок",
                highlight: false,
              },
              {
                label: "Баллов выдано",
                value: stats?.total_points_awarded ?? 0,
                note: "суммарно",
                highlight: false,
              },
            ].map(({ label, value, note, highlight }) => (
              <div key={label}
                className={["rounded-lg border px-5 py-4", highlight ? "border-[#374B9B]/40" : "border-[#C7C8CA] bg-white"].join(" ")}
                style={highlight ? { backgroundColor: "#374B9B0D" } : {}}>
                <div className="text-[#939598] text-xs font-semibold uppercase tracking-wide mb-2">{label}</div>
                <div className="font-bold text-3xl mb-0.5"
                  style={{ color: "#0F2D69", fontFamily: "var(--font-mono)" }}>
                  {value}
                </div>
                <div className="text-[#939598] text-xs">{note}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0 mb-5 border-b border-[#C7C8CA]">
            {(["all", "pending"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={[
                  "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                  filterStatus === s
                    ? "border-[#0F2D69] text-[#0F2D69]"
                    : "border-transparent text-[#939598] hover:text-[#0F2D69]",
                ].join(" ")}>
                {s === "all" ? "Все загруженные" : "Ожидают решения"}
                <span className="text-xs rounded-full px-1.5 py-0.5"
                  style={{ backgroundColor: "#E6E7E8", color: "#939598" }}>
                  {s === "all" ? allEvents.length : pendingCount}
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
                      <span className="text-[#374B9B] text-xs font-bold uppercase tracking-wide">
                        {app.type_display || TYPE_LABELS[app.type] || app.type}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${STATUS_META[app.status].color}18`,
                          color: STATUS_META[app.status].color,
                        }}>
                        {STATUS_META[app.status].label}
                      </span>
                      <span className="text-[#C7C8CA] text-xs">{app.date}</span>
                    </div>
                    <p className="text-[#0F2D69] font-bold text-sm mb-1">{app.title}</p>
                    {app.description && (
                      <p className="text-[#939598] text-sm leading-relaxed mb-1">{app.description}</p>
                    )}
                    {app.proof && (
                      <p className="text-[#939598] text-xs">Материал: {app.proof}</p>
                    )}
                    {app.admin_comment && (
                      <div className="mt-2 text-xs text-[#939598] italic border-l-2 border-[#C7C8CA] pl-3">
                        Комментарий: {app.admin_comment}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-3">
                    {app.status === "approved" && app.points_awarded > 0 && (
                      <div className="text-right">
                        <div className="font-bold text-2xl"
                          style={{ color: "#0F2D69", fontFamily: "var(--font-mono)" }}>
                          +{app.points_awarded}
                        </div>
                        <div className="text-[#939598] text-xs">баллов</div>
                      </div>
                    )}

                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(app, "approved")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: "#0F2D69" }}>
                          <CheckCircle size={13} />
                          Одобрить
                        </button>
                        <button
                          onClick={() => openModal(app, "rejected")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border border-[#C7C8CA] text-[#939598] hover:border-[#939598] hover:text-[#0F2D69] transition-colors">
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
        </>
      )}

      {/* Confirmation modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(15,45,105,0.4)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md px-7 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#0F2D69] font-bold text-base">
                {modal.action === "approved" ? "Одобрить заявку?" : "Отклонить заявку?"}
              </h2>
              <button onClick={() => setModal(null)} className="text-[#939598] hover:text-[#0F2D69]">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#E6E7E8] rounded-lg px-4 py-3 mb-4">
              <div className="text-[#0F2D69] font-semibold text-sm mb-0.5">{modal.app.title}</div>
              {modal.app.description && (
                <div className="text-[#939598] text-xs">{modal.app.description}</div>
              )}
            </div>

            {modal.action === "approved" && (
              <div className="mb-4">
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                  Количество баллов
                </label>
                <input
                  type="number"
                  min="0"
                  value={modal.points}
                  onChange={(e) => setModal((m) => m ? { ...m, points: e.target.value } : null)}
                  placeholder="Введите количество баллов..."
                  className="w-full border border-[#C7C8CA] rounded px-3 py-2 text-sm text-[#0F2D69] focus:outline-none focus:border-[#374B9B]"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
            )}

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

            {modalError && (
              <p className="text-red-600 text-xs mb-3">{modalError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={
                  modalLoading ||
                  (modal.action === "rejected" && !modal.comment.trim())
                }
                className={[
                  "flex-1 py-2.5 rounded font-bold text-sm text-white flex items-center justify-center gap-2",
                  (modal.action === "rejected" && !modal.comment.trim()) || modalLoading
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:opacity-90",
                ].join(" ")}
                style={{ backgroundColor: "#0F2D69" }}>
                {modalLoading && (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {modal.action === "approved" ? "Подтвердить одобрение" : "Подтвердить отклонение"}
              </button>
              <button
                onClick={() => setModal(null)}
                disabled={modalLoading}
                className="px-5 py-2.5 rounded font-semibold text-sm border border-[#C7C8CA] text-[#939598] hover:border-[#939598] transition-colors disabled:opacity-40">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
