import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "../auth";
import { getMyBonusEvents, createBonusEvent } from "../api/bonusEvents.api";
import { BonusEvent, BonusEventType, BonusEventStatus } from "../types";
import { Plus, X, CheckCircle, Clock, XCircle, RefreshCw, AlertCircle } from "lucide-react";
import { AxiosError } from "axios";

const TYPE_OPTIONS: { value: BonusEventType; label: string }[] = [
  { value: "event", label: "Мероприятие" },
  { value: "olympiad", label: "Олимпиада" },
  { value: "achievement", label: "Достижение" },
  { value: "custom", label: "Другое" },
];

const STATUS_META: Record<BonusEventStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "На рассмотрении", icon: Clock, color: "#939598" },
  approved: { label: "Одобрено", icon: CheckCircle, color: "#0F2D69" },
  rejected: { label: "Отклонено", icon: XCircle, color: "#C7C8CA" },
};

function StatusBadge({ status }: { status: BonusEventStatus }) {
  const { label, icon: Icon, color } = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}18`, color }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-[#374B9B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function extractFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as Record<string, string | string[]>;
    const out: Record<string, string> = {};
    Object.entries(data).forEach(([k, v]) => {
      out[k] = Array.isArray(v) ? v.join("; ") : String(v);
    });
    return out;
  }
  return {};
}

function extractGenericError(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) return "Сервер недоступен";
    const data = err.response.data;
    if (data?.detail) return String(data.detail);
    if (err.response.status === 403) return "Нет прав доступа";
  }
  return "Ошибка загрузки";
}

export default function BonusesPage() {
  const { user } = useAuth();

  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<BonusEventType>("event");
  const [formProof, setFormProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [filterStatus, setFilterStatus] = useState<"all" | BonusEventStatus>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getMyBonusEvents();
      setEvents(data);
    } catch (err) {
      setLoadError(extractGenericError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!formTitle.trim()) {
      setFieldErrors({ title: "Укажите название" });
      return;
    }
    setSubmitting(true);
    try {
      await createBonusEvent({
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        type: formType,
        proof: formProof.trim() || undefined,
      });
      setShowForm(false);
      setFormTitle("");
      setFormDesc("");
      setFormType("event");
      setFormProof("");
      await load();
    } catch (err) {
      const fe = extractFieldErrors(err);
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe);
      } else {
        setFieldErrors({ _general: extractGenericError(err) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = filterStatus === "all" ? events : events.filter((e) => e.status === filterStatus);

  const counts = {
    all: events.length,
    pending: events.filter((e) => e.status === "pending").length,
    approved: events.filter((e) => e.status === "approved").length,
    rejected: events.filter((e) => e.status === "rejected").length,
  };

  return (
    <div className="px-8 py-8 max-w-4xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[#939598] text-sm mb-1">Мои заявки</p>
          <h1 className="text-[#0F2D69] font-bold text-2xl">Бонусные баллы</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading} title="Обновить"
            className="text-[#939598] hover:text-[#0F2D69] transition-colors disabled:opacity-40">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setShowForm(true); setFieldErrors({}); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-bold text-white"
            style={{ backgroundColor: "#0F2D69" }}
          >
            <Plus size={16} />
            Подать заявку
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-[#939598] text-sm">Загрузка заявок...</p>
        </div>
      )}

      {/* Error */}
      {!loading && loadError && (
        <div className="bg-white rounded-lg border border-red-200 px-6 py-10 flex flex-col items-center gap-4">
          <AlertCircle size={32} className="text-red-400" />
          <div className="text-center">
            <p className="text-[#0F2D69] font-semibold mb-1">Не удалось загрузить заявки</p>
            <p className="text-[#939598] text-sm">{loadError}</p>
          </div>
          <button onClick={load} className="px-5 py-2 rounded text-sm font-bold text-white"
            style={{ backgroundColor: "#0F2D69" }}>Повторить</button>
        </div>
      )}

      {!loading && !loadError && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-0 mb-6 border-b border-[#C7C8CA]">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={[
                  "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                  filterStatus === s
                    ? "border-[#0F2D69] text-[#0F2D69]"
                    : "border-transparent text-[#939598] hover:text-[#0F2D69]",
                ].join(" ")}>
                {s === "all" ? "Все" : STATUS_META[s].label}
                <span className="text-xs rounded-full px-1.5 py-0.5" style={{ backgroundColor: "#E6E7E8", color: "#939598" }}>
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-[#939598] text-sm">
                {filterStatus === "all" ? "Заявок ещё нет. Подайте первую!" : "Заявок с таким статусом нет"}
              </div>
            )}
            {filtered.map((ev) => (
              <div key={ev.id} className="bg-white rounded-lg border border-[#C7C8CA] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[#374B9B] text-xs font-bold uppercase tracking-wide">
                        {ev.type_display || TYPE_OPTIONS.find((t) => t.value === ev.type)?.label}
                      </span>
                      <StatusBadge status={ev.status} />
                    </div>
                    <p className="text-[#0F2D69] font-semibold text-sm mb-1">{ev.title}</p>
                    {ev.description && (
                      <p className="text-[#939598] text-sm leading-relaxed">{ev.description}</p>
                    )}
                    {ev.admin_comment && (
                      <div className="mt-2 text-xs text-[#939598] italic border-l-2 border-[#C7C8CA] pl-3">
                        {ev.admin_comment}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-[#C7C8CA]">
                      Подано: {ev.date}
                      {ev.reviewed_at && ` · Рассмотрено: ${ev.reviewed_at.split("T")[0]}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {ev.status === "approved" && ev.points_awarded > 0 && (
                      <>
                        <div className="font-bold text-xl text-[#0F2D69]"
                          style={{ fontFamily: "var(--font-mono)" }}>
                          +{ev.points_awarded}
                        </div>
                        <div className="text-[#939598] text-xs">баллов</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* New application modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(15,45,105,0.4)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg px-8 py-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#0F2D69] font-bold text-lg">Новая заявка на бонус</h2>
              <button onClick={() => setShowForm(false)} className="text-[#939598] hover:text-[#0F2D69]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fieldErrors._general && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                  {fieldErrors._general}
                </div>
              )}

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Например: Победа в хакатоне"
                  className={[
                    "w-full border rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B]",
                    fieldErrors.title ? "border-red-400" : "border-[#C7C8CA]",
                  ].join(" ")}
                />
                {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">Тип активности</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as BonusEventType)}
                  className="w-full border border-[#C7C8CA] rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B]"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">Описание</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Опишите достижение подробнее..."
                  rows={4}
                  className="w-full border border-[#C7C8CA] rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B] resize-none placeholder-[#C7C8CA]"
                />
              </div>

              <div>
                <label className="block text-[#0F2D69] text-sm font-semibold mb-1.5">
                  Подтверждающий материал
                </label>
                <input
                  type="text"
                  value={formProof}
                  onChange={(e) => setFormProof(e.target.value)}
                  placeholder="Ссылка или описание документа"
                  className="w-full border border-[#C7C8CA] rounded px-3.5 py-2.5 text-sm text-[#0F2D69] bg-white focus:outline-none focus:border-[#374B9B]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: "#0F2D69" }}
                >
                  {submitting && (
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {submitting ? "Отправка..." : "Отправить заявку"}
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
