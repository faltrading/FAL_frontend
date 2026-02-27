"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { User, CalendarSettings, Booking, PaymentPlan, Call, JoinCallResponse } from "@/lib/types";
import {
  LessonCalendar,
  type CalendarEvent,
  type WeekSchedule,
  DEFAULT_SCHEDULE,
} from "@/components/calendar/LessonCalendar";
import {
  Users,
  CalendarDays,
  CreditCard,
  Search,
  Save,
  Plus,
  X,
  CheckCircle,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

function UsersTab() {
  const { t, locale } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<User[]>("/api/v1/users/")
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("users.searchPlaceholder")}
          className="input-field pl-10"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.username")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.email")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.role")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.active")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                <td className="py-3 px-3 text-surface-100">{u.username}</td>
                <td className="py-3 px-3 text-surface-300">{u.email}</td>
                <td className="py-3 px-3">
                  <span className="badge-brand">{u.role}</span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={cn(
                      "inline-block h-2.5 w-2.5 rounded-full",
                      u.is_active ? "bg-success-400" : "bg-error-400"
                    )}
                  />
                </td>
                <td className="py-3 px-3 text-surface-400">{formatDate(u.created_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-surface-500 py-8 text-sm">{t("users.noResults")}</p>
        )}
      </div>
    </div>
  );
}

interface AdminSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_by?: string;
}

function CalendarTab() {
  const { t } = useI18n();
  const [adminSlots, setAdminSlots] = useState<AdminSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<AdminSlot[]>("/api/v1/calendar/slots").catch(() => [] as AdminSlot[]),
      api.get<Booking[]>("/api/v1/calendar/bookings").catch(() => [] as Booking[]),
      api.get<{ calls: Call[] }>("/api/v1/calls/rooms").then(
        (r) => (Array.isArray(r) ? r : r.calls ?? []) as Call[],
      ).catch(() => [] as Call[]),
      api.get<CalendarSettings>("/api/v1/calendar/settings").catch(() => null),
    ]).then(([slotsData, bookingsData, callsData, settingsData]) => {
      setAdminSlots(slotsData);
      setBookings(bookingsData);
      setCalls(callsData);
      if (settingsData) setSettings(settingsData);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Build events for admin view */
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];
    const bookedSlotIds = new Set(
      bookings.filter((b) => b.status === "confirmed").map((b) => b.slot_id),
    );

    for (const s of adminSlots) {
      if (bookedSlotIds.has(s.id)) continue;
      events.push({
        id: `slot-${s.id}`,
        start: s.start_time,
        end: s.end_time,
        type: s.is_available ? "available" : "cancelled",
        slotId: s.id,
      });
    }

    for (const b of bookings) {
      events.push({
        id: `booking-${b.id}`,
        start: b.start_time,
        end: b.end_time,
        type: b.status === "confirmed" ? "booked" : "cancelled",
        bookingId: b.id,
        slotId: b.slot_id,
        username: b.username,
        notes: b.notes,
      });
    }

    for (const c of calls) {
      const startDate = c.started_at || c.created_at || new Date().toISOString();
      const endDate = c.ended_at || new Date(new Date(startDate).getTime() + 3600000).toISOString();
      events.push({
        id: `call-${c.id}`,
        title: c.room_name,
        start: startDate,
        end: endDate,
        type: "call",
        callId: c.id,
        username: c.creator_username,
        participantCount: c.participant_count ?? 0,
        isActive: c.status === "active",
      });
    }

    return events;
  }, [adminSlots, bookings, calls]);

  /* Handlers */
  const handleDeleteSlot = async (ev: CalendarEvent) => {
    if (!ev.slotId) return;
    try {
      await api.delete(`/api/v1/calendar/slots/${ev.slotId}`);
      fetchAll();
    } catch { /* */ }
  };

  const handleCreateSlot = async (date: string, startTime: string, endTime: string) => {
    try {
      await api.post("/api/v1/calendar/slots/batch", {
        start_date: date,
        end_date: date,
        start_time: startTime,
        end_time: endTime,
        exclude_weekends: false,
      });
      setMessage(t("lessonCalendar.slotCreated"));
      fetchAll();
    } catch { /* */ }
  };

  const handleScheduleCall = async (roomName: string) => {
    try {
      await api.post("/api/v1/calls/rooms", {
        room_name: roomName || undefined,
      });
      setMessage(t("lessonCalendar.callStarted"));
      fetchAll();
    } catch { /* */ }
  };

  const handleJoinCall = async (ev: CalendarEvent) => {
    if (!ev.callId) return;
    try {
      const data = await api.post<JoinCallResponse>(`/api/v1/calls/rooms/${ev.callId}/join`);
      const url = data.jitsi_room_url || `https://${data.jitsi_domain}/${data.jitsi_room}`;
      window.open(url, "_blank");
    } catch { /* */ }
  };

  const handleSaveAvailability = async (
    schedule: WeekSchedule,
    weeks: number,
    slotDuration: number,
  ) => {
    // 1) Save settings
    try {
      await api.put("/api/v1/calendar/settings", {
        slot_duration_minutes: slotDuration,
        min_booking_notice_minutes: settings?.min_notice_minutes ?? 60,
        timezone: "UTC",
      });
    } catch {
      // settings endpoint might not exist yet, continue anyway
    }

    // 2) Generate slots for each enabled day in the next N weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const batchCalls: Promise<unknown>[] = [];

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const dayConfig = schedule[d];
        if (!dayConfig.enabled) continue;

        // d: 0=Mon..6=Sun → JS getDay(): 0=Sun..6=Sat
        // target JS day: (d + 1) % 7
        const targetJsDay = (d + 1) % 7;
        const diff = ((targetJsDay - today.getDay()) + 7) % 7;
        const date = new Date(today);
        date.setDate(today.getDate() + diff + w * 7);

        // Only future dates
        if (date < today) continue;

        const dateStr = date.toISOString().split("T")[0];
        batchCalls.push(
          api.post("/api/v1/calendar/slots/batch", {
            start_date: dateStr,
            end_date: dateStr,
            start_time: dayConfig.startTime,
            end_time: dayConfig.endTime,
            exclude_weekends: false,
          }).catch(() => null),
        );
      }
    }

    await Promise.all(batchCalls);
    setMessage(t("lessonCalendar.availabilitySaved"));
    fetchAll();
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="flex items-center gap-2 text-sm text-success-400 bg-success-500/10 p-3 rounded-lg animate-fade-in">
          <CheckCircle className="h-4 w-4" />
          {message}
          <button onClick={() => setMessage("")} className="ml-auto text-surface-400 hover:text-surface-200">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <LessonCalendar
        events={calendarEvents}
        loading={loading}
        isAdmin
        initialSlotDuration={settings?.slot_duration_minutes ?? 30}
        initialSchedule={[...DEFAULT_SCHEDULE] as WeekSchedule}
        onDeleteSlot={handleDeleteSlot}
        onCreateSlot={handleCreateSlot}
        onScheduleCall={handleScheduleCall}
        onJoinCall={handleJoinCall}
        onSaveAvailability={handleSaveAvailability}
      />
    </div>
  );
}

function BookingsTab() {
  const { t, locale } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "cancelled">("all");

  useEffect(() => {
    api
      .get<Booking[]>("/api/v1/calendar/bookings")
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter((b) => {
    if (statusFilter === "all") return true;
    return b.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "confirmed", "cancelled"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              statusFilter === status
                ? "bg-brand-500 text-white"
                : "bg-surface-800 text-surface-400 hover:text-surface-200"
            )}
          >
            {t(`users.status_${status}`)}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.username")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.date")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.time")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.status")}</th>
              <th className="text-left py-3 px-3 text-surface-400 font-medium">{t("users.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                <td className="py-3 px-3 text-surface-100">{b.username}</td>
                <td className="py-3 px-3 text-surface-300">{formatDate(b.start_time, locale)}</td>
                <td className="py-3 px-3 text-surface-300">
                  {formatTime(b.start_time, locale)} - {formatTime(b.end_time, locale)}
                </td>
                <td className="py-3 px-3">
                  <span className={b.status === "confirmed" ? "badge-success" : "badge-error"}>
                    {b.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-surface-400 max-w-[200px] truncate">
                  {b.notes || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-surface-500 py-8 text-sm">{t("users.noBookings")}</p>
        )}
      </div>
    </div>
  );
}

function PaymentPlansTab() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [interval, setInterval] = useState<"monthly" | "yearly" | "one_time">("monthly");
  const [featuresText, setFeaturesText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    api
      .get<PaymentPlan[]>("/api/v1/payments/plans")
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice(0);
    setCurrency("USD");
    setInterval("monthly");
    setFeaturesText("");
    setEditingPlan(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || "");
    setPrice(plan.price);
    setCurrency(plan.currency);
    setInterval(plan.interval);
    setFeaturesText(plan.features.join(", "));
    setShowCreateModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const features = featuresText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    const payload = { name, description, price, currency, interval, features };
    try {
      if (editingPlan) {
        await api.put(`/api/v1/payments/plans/${editingPlan.id}`, payload);
      } else {
        await api.post("/api/v1/payments/plans", payload);
      }
      setShowCreateModal(false);
      resetForm();
      fetchPlans();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (plan: PaymentPlan) => {
    try {
      await api.put(`/api/v1/payments/plans/${plan.id}`, {
        ...plan,
        is_active: !plan.is_active,
      });
      fetchPlans();
    } catch {
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="h-4 w-4" />
          {t("users.createPlan")}
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="card text-center py-12">
          <CreditCard className="h-10 w-10 text-surface-500 mx-auto mb-3" />
          <p className="text-surface-400 text-sm">{t("users.noPlans")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="card flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-surface-100">{plan.name}</h3>
                <span className={plan.is_active ? "badge-success" : "badge-error"}>
                  {plan.is_active ? t("users.active") : t("users.inactive")}
                </span>
              </div>
              {plan.description && (
                <p className="text-sm text-surface-400 mb-3">{plan.description}</p>
              )}
              <div className="mb-3">
                <span className="text-2xl font-bold text-surface-100">
                  {plan.currency === "EUR" ? "\u20AC" : "$"}{plan.price.toFixed(2)}
                </span>
                <span className="text-sm text-surface-500 ml-1">/ {plan.interval}</span>
              </div>
              {plan.features.length > 0 && (
                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-surface-300">
                      <CheckCircle className="h-3.5 w-3.5 text-success-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 mt-auto pt-3 border-t border-surface-700">
                <button
                  onClick={() => openEditModal(plan)}
                  className="btn-ghost flex-1 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => handleToggleActive(plan)}
                  className="btn-ghost flex-1 text-xs"
                >
                  {plan.is_active ? (
                    <ToggleRight className="h-3.5 w-3.5 text-success-400" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5 text-surface-500" />
                  )}
                  {plan.is_active ? t("users.deactivate") : t("users.activate")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">
                {editingPlan ? t("users.editPlan") : t("users.createPlan")}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-surface-400 hover:text-surface-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">{t("users.planName")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t("users.planDescription")}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t("users.price")}</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">{t("users.currency")}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input-field"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">{t("users.interval")}</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value as "monthly" | "yearly" | "one_time")}
                  className="input-field"
                >
                  <option value="monthly">{t("users.monthly")}</option>
                  <option value="yearly">{t("users.yearly")}</option>
                  <option value="one_time">{t("users.oneTime")}</option>
                </select>
              </div>
              <div>
                <label className="label">{t("users.features")}</label>
                <input
                  type="text"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={t("users.featuresPlaceholder")}
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="btn-ghost"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !name.trim()}
                  className="btn-primary"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingPlan ? t("common.save") : t("users.createPlan")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"users" | "calendar" | "bookings" | "payments">("users");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-surface-400">{t("common.unauthorized")}</p>
      </div>
    );
  }

  const tabs = [
    { key: "users" as const, label: t("users.users"), icon: Users },
    { key: "calendar" as const, label: t("users.calendar"), icon: CalendarDays },
    { key: "bookings" as const, label: t("users.bookings"), icon: CalendarDays },
    { key: "payments" as const, label: t("users.paymentPlans"), icon: CreditCard },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-surface-100 mb-6">{t("users.title")}</h1>

      <div className="flex gap-1 mb-6 border-b border-surface-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-surface-400 hover:text-surface-200"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "calendar" && <CalendarTab />}
      {activeTab === "bookings" && <BookingsTab />}
      {activeTab === "payments" && <PaymentPlansTab />}
    </div>
  );
}
