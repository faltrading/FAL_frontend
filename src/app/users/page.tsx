"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { User, CalendarSettings, Booking, PaymentPlan } from "@/lib/types";
import { LessonCalendar, type CalendarEvent } from "@/components/calendar/LessonCalendar";
import {
  Users,
  Settings,
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

function CalendarSettingsTab() {
  const { t, locale } = useI18n();
  const [, setSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [slotDuration, setSlotDuration] = useState(30);
  const [minNotice, setMinNotice] = useState(60);
  const [timezone, setTimezone] = useState("UTC");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [batchCreating, setBatchCreating] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");

  // Calendar data
  const [adminSlots, setAdminSlots] = useState<AdminSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Panel state
  const [showSettings, setShowSettings] = useState(false);

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Madrid",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Dubai",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  const fetchCalendarData = useCallback(() => {
    setDataLoading(true);
    Promise.all([
      api.get<AdminSlot[]>("/api/v1/calendar/slots").catch(() => [] as AdminSlot[]),
      api.get<Booking[]>("/api/v1/calendar/bookings").catch(() => [] as Booking[]),
    ])
      .then(([slotsData, bookingsData]) => {
        setAdminSlots(slotsData);
        setBookings(bookingsData);
      })
      .finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    api
      .get<CalendarSettings>("/api/v1/calendar/settings")
      .then((data) => {
        setSettings(data);
        setSlotDuration(data.slot_duration_minutes);
        setMinNotice(data.min_notice_minutes);
        setTimezone(data.timezone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchCalendarData();
  }, [fetchCalendarData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.put<CalendarSettings>("/api/v1/calendar/settings", {
        slot_duration_minutes: slotDuration,
        min_notice_minutes: minNotice,
        timezone,
      });
      setSettings(updated);
      setMessage(t("users.settingsSaved"));
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!startDate || !endDate) return;
    setBatchCreating(true);
    setBatchMessage("");
    try {
      const result = await api.post<Record<string, unknown>[]>("/api/v1/calendar/slots/batch", {
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        exclude_weekends: excludeWeekends,
      });
      const count = Array.isArray(result) ? result.length : (result as unknown as { created_count: number }).created_count;
      setBatchMessage(`${t("users.slotsCreated")}: ${count}`);
      fetchCalendarData();
    } catch {
    } finally {
      setBatchCreating(false);
    }
  };

  const handleDeleteSlot = async (ev: CalendarEvent) => {
    const slotId = ev.slotId;
    if (!slotId) return;
    try {
      await api.delete(`/api/v1/calendar/slots/${slotId}`);
      fetchCalendarData();
    } catch {
      /* handled by api */
    }
  };

  // Build calendar events for admin view
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];
    const bookedSlotIds = new Set(
      bookings.filter((b) => b.status === "confirmed").map((b) => b.slot_id)
    );

    for (const s of adminSlots) {
      if (bookedSlotIds.has(s.id)) continue; // will show as booking below
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

    return events;
  }, [adminSlots, bookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settings toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "btn-secondary text-xs",
            showSettings && "bg-brand-500/20 border-brand-500/40 text-brand-300"
          )}
        >
          <Settings className="h-4 w-4" />
          {t("users.calendarSettings")}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "btn-secondary text-xs",
            !showSettings && "bg-brand-500/20 border-brand-500/40 text-brand-300"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          {t("users.viewCalendar")}
        </button>
      </div>

      {showSettings ? (
        <div className="space-y-6 animate-fade-in">
          {/* Settings card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-brand-400" />
              <h3 className="text-base font-semibold text-surface-100">{t("users.calendarSettings")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">{t("users.slotDuration")}</label>
                <input
                  type="number"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  min={5}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t("users.minNotice")}</label>
                <input
                  type="number"
                  value={minNotice}
                  onChange={(e) => setMinNotice(Number(e.target.value))}
                  min={0}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t("users.timezone")}</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input-field"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {message && (
              <div className="flex items-center gap-2 text-sm text-success-400 mt-3">
                <CheckCircle className="h-4 w-4" />
                {message}
              </div>
            )}
            <button onClick={handleSaveSettings} disabled={saving} className="btn-primary mt-4">
              {saving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("common.save")}
            </button>
          </div>

          {/* Batch create */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-brand-400" />
              <h3 className="text-base font-semibold text-surface-100">{t("users.batchCreateSlots")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("users.startDate")}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t("users.endDate")}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t("users.startTime")}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t("users.endTime")}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="excludeWeekends"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
                className="h-4 w-4 rounded border-surface-600 bg-surface-900 text-brand-500 focus:ring-brand-500/40"
              />
              <label htmlFor="excludeWeekends" className="text-sm text-surface-300">
                {t("users.excludeWeekends")}
              </label>
            </div>
            {batchMessage && (
              <div className="flex items-center gap-2 text-sm text-success-400 mt-4">
                <CheckCircle className="h-4 w-4" />
                {batchMessage}
              </div>
            )}
            <button
              onClick={handleBatchCreate}
              disabled={batchCreating || !startDate || !endDate}
              className="btn-primary mt-4"
            >
              {batchCreating ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("users.createSlots")}
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <LessonCalendar
            events={calendarEvents}
            loading={dataLoading}
            isAdmin
            onDeleteSlot={handleDeleteSlot}
          />
        </div>
      )}
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
    { key: "calendar" as const, label: t("users.calendarSettings"), icon: Settings },
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
      {activeTab === "calendar" && <CalendarSettingsTab />}
      {activeTab === "bookings" && <BookingsTab />}
      {activeTab === "payments" && <PaymentPlansTab />}
    </div>
  );
}
