"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  AvailabilityDay,
  PublicDayAvailability,
  AvailabilityOverride,
} from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  CheckCircle,
  Info,
  Settings,
  Plus,
  Video,
  Phone,
  Trash2,
  Save,
  CalendarOff,
  CalendarCheck,
} from "lucide-react";

/* ================================================================== */
/*  Exported Types                                                     */
/* ================================================================== */

export interface BookingEvent {
  id: string;
  bookingDate: string;   // YYYY-MM-DD
  startTime: string;     // HH:MM
  endTime: string;       // HH:MM
  status: "confirmed" | "cancelled";
  username?: string;
  notes?: string | null;
}

export interface CallEvent {
  id: string;
  title?: string;
  start: string;
  end: string;
  username?: string;
  participantCount?: number;
  isActive?: boolean;
}

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface LessonCalendarProps {
  bookings: BookingEvent[];
  calls: CallEvent[];
  /** Per-day availability map keyed by YYYY-MM-DD */
  availabilityDays: PublicDayAvailability[];
  /** General weekly schedule (7 entries, Mon-Sun) */
  generalAvailability: AvailabilityDay[];
  loading?: boolean;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;

  /* User callbacks */
  onCreateBooking?: (
    dateStr: string,
    startTime: string,
    endTime: string,
    notes: string,
  ) => Promise<void>;
  onCancelBooking?: (bookingId: string) => void;
  onJoinCall?: (callId: string) => void;

  /* Admin callbacks */
  onSaveGeneralAvailability?: (days: AvailabilityDay[]) => Promise<void>;
  onSaveOverride?: (ovr: {
    override_date: string;
    is_closed: boolean;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
  }) => Promise<void>;
  onDeleteOverride?: (dateStr: string) => Promise<void>;
  onCancelAnyBooking?: (bookingId: string) => void;
  onScheduleCall?: (roomName: string) => Promise<void>;

  isAdmin?: boolean;
  allowBookingOutsideAvailability?: boolean;
  defaultView?: "month" | "week";
}

/* ================================================================== */
/*  Date helpers                                                       */
/* ================================================================== */

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isToday(d: Date) {
  return isSameDay(d, new Date());
}
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCalendarGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const weeks: Date[][] = [];
  let cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur.getMonth() !== month && w >= 4) break;
  }
  return weeks;
}

function getWeekGrid(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

/* ================================================================== */
/*  Color helpers                                                      */
/* ================================================================== */

function bookingColorClasses(status: string, isMine: boolean) {
  if (status === "cancelled")
    return "bg-error-500/15 text-error-400 border-error-500/30 line-through opacity-60";
  return isMine
    ? "bg-success-500/20 text-success-400 border-success-500/40"
    : "bg-warning-500/20 text-warning-400 border-warning-500/40";
}

function bookingDotColor(status: string, isMine: boolean) {
  if (status === "cancelled") return "bg-error-400";
  return isMine ? "bg-success-400" : "bg-warning-400";
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function LessonCalendar({
  bookings,
  calls,
  availabilityDays,
  generalAvailability,
  loading,
  currentMonth: controlledMonth,
  onMonthChange,
  onCreateBooking,
  onCancelBooking,
  onJoinCall,
  onSaveGeneralAvailability,
  onSaveOverride,
  onDeleteOverride,
  onCancelAnyBooking,
  onScheduleCall,
  isAdmin = false,
  allowBookingOutsideAvailability = false,
  defaultView = "month",
}: LessonCalendarProps) {
  const { t, locale } = useI18n();
  const today = new Date();

  /* ---- core state ---- */
  const [internalMonth, setInternalMonth] = useState(today);
  const month = controlledMonth ?? internalMonth;
  const [view, setView] = useState<"month" | "week">(defaultView);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  /* ---- booking form state ---- */
  const [bookingStart, setBookingStart] = useState("09:00");
  const [bookingEnd, setBookingEnd] = useState("10:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  /* ---- admin: general availability panel ---- */
  const [showAvailability, setShowAvailability] = useState(false);
  const [schedule, setSchedule] = useState<AvailabilityDay[]>(
    generalAvailability.length === 7
      ? generalAvailability
      : Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          is_enabled: i < 5,
          start_time: "08:00",
          end_time: "17:00",
        })),
  );
  const [savingAvailability, setSavingAvailability] = useState(false);

  /* ---- admin: override state ---- */
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideClosed, setOverrideClosed] = useState(false);
  const [overrideStart, setOverrideStart] = useState("08:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  /* ---- admin: call state ---- */
  const [showCreateCall, setShowCreateCall] = useState(false);
  const [newCallName, setNewCallName] = useState("");
  const [creatingCall, setCreatingCall] = useState(false);

  // Sync schedule when props change
  React.useEffect(() => {
    if (generalAvailability.length === 7) {
      setSchedule(generalAvailability);
    }
  }, [generalAvailability]);

  /* ---- availability lookup map ---- */
  const availMap = useMemo(() => {
    const m = new Map<string, PublicDayAvailability>();
    for (const d of availabilityDays) m.set(d.date, d);
    return m;
  }, [availabilityDays]);

  /* ---- bookings lookup map ---- */
  const bookingsForDay = useMemo(() => {
    const m = new Map<string, BookingEvent[]>();
    for (const b of bookings) {
      const key = b.bookingDate;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(b);
    }
    m.forEach((list) =>
      list.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
    return m;
  }, [bookings]);

  /* ---- calls lookup map ---- */
  const callsForDay = useMemo(() => {
    const m = new Map<string, CallEvent[]>();
    for (const c of calls) {
      const d = new Date(c.start);
      const key = toDateKey(d);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return m;
  }, [calls]);

  /* ---- month navigation ---- */
  const setMonth = useCallback(
    (d: Date) => {
      if (onMonthChange) onMonthChange(d);
      else setInternalMonth(d);
    },
    [onMonthChange],
  );
  const prevMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    setMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    setMonth(d);
  };
  const goToToday = () => {
    setMonth(new Date());
    setSelectedDate(new Date());
  };

  /* ---- derived ---- */
  const weeks = useMemo(
    () => getCalendarGrid(month.getFullYear(), month.getMonth()),
    [month],
  );
  const weekDays = useMemo(() => {
    if (view === "week" && selectedDate) return getWeekGrid(selectedDate);
    return getWeekGrid(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDate]);

  const monthTitle = month.toLocaleDateString(
    locale === "it" ? "it-IT" : "en-US",
    { month: "long", year: "numeric" },
  );

  const dayNames = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
        weekday: "short",
      });
    });
  }, [locale]);

  const fullDayNames = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
        weekday: "long",
      });
    });
  }, [locale]);

  /* ================================================================ */
  /*  Handlers                                                         */
  /* ================================================================ */

  const handleCreateBooking = async () => {
    if (!onCreateBooking || !selectedDate) return;
    setCreatingBooking(true);
    try {
      const dateStr = toDateKey(selectedDate);
      await onCreateBooking(dateStr, bookingStart, bookingEnd, bookingNotes);
      setShowBookingForm(false);
      setBookingNotes("");
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!onSaveGeneralAvailability) return;
    setSavingAvailability(true);
    try {
      await onSaveGeneralAvailability(schedule);
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!onSaveOverride || !selectedDate) return;
    setSavingOverride(true);
    try {
      await onSaveOverride({
        override_date: toDateKey(selectedDate),
        is_closed: overrideClosed,
        start_time: overrideClosed ? null : overrideStart,
        end_time: overrideClosed ? null : overrideEnd,
        notes: overrideNotes || null,
      });
      setShowOverrideForm(false);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!onDeleteOverride || !selectedDate) return;
    await onDeleteOverride(toDateKey(selectedDate));
    setShowOverrideForm(false);
  };

  const handleScheduleCall = async () => {
    if (!onScheduleCall) return;
    setCreatingCall(true);
    try {
      await onScheduleCall(newCallName || "");
      setShowCreateCall(false);
      setNewCallName("");
    } finally {
      setCreatingCall(false);
    }
  };

  const updateScheduleDay = (
    idx: number,
    field: keyof AvailabilityDay,
    value: string | boolean | number,
  ) => {
    setSchedule((prev: AvailabilityDay[]) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  /* ================================================================ */
  /*  Render: General Availability Panel (Admin)                       */
  /* ================================================================ */

  const renderAvailabilityPanel = () => {
    if (!showAvailability || !isAdmin) return null;

    return (
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-semibold text-surface-100">
              {t("lessonCalendar.configureAvailability")}
            </h3>
          </div>
          <button
            onClick={() => setShowAvailability(false)}
            className="text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-surface-400 mb-4">
          {t("lessonCalendar.generalAvailabilityDesc")}
        </p>

        {/* Per-day schedule */}
        <div className="space-y-2">
          {schedule.map((day: AvailabilityDay, i: number) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                day.is_enabled
                  ? "bg-surface-800/80"
                  : "bg-surface-900/40 opacity-60",
              )}
            >
              <button
                onClick={() =>
                  updateScheduleDay(i, "is_enabled", !day.is_enabled)
                }
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative flex-shrink-0",
                  day.is_enabled ? "bg-brand-500" : "bg-surface-600",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    day.is_enabled ? "left-5" : "left-0.5",
                  )}
                />
              </button>

              <span className="text-sm font-medium text-surface-200 w-24 capitalize">
                {fullDayNames[i]}
              </span>

              {day.is_enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateScheduleDay(i, "start_time", e.target.value)
                    }
                    className="input-field text-xs py-1 px-2 w-28"
                  />
                  <span className="text-surface-500">–</span>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateScheduleDay(i, "end_time", e.target.value)
                    }
                    className="input-field text-xs py-1 px-2 w-28"
                  />
                </div>
              ) : (
                <span className="text-xs text-surface-600 italic">
                  {t("lessonCalendar.dayOff")}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSaveAvailability}
            disabled={savingAvailability}
            className="btn-primary"
          >
            {savingAvailability ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("lessonCalendar.saveAvailability")}
          </button>
        </div>
      </div>
    );
  };

  /* ================================================================ */
  /*  Render: Availability Info (shown in detail panel)                */
  /* ================================================================ */

  const renderAvailabilityInfo = (dateKey: string) => {
    const avail = availMap.get(dateKey);
    if (!avail) return null;

    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          avail.is_available
            ? "bg-brand-500/10 text-brand-300"
            : "bg-surface-800 text-surface-400",
        )}
      >
        {avail.is_available ? (
          <CalendarCheck className="h-4 w-4 flex-shrink-0" />
        ) : (
          <CalendarOff className="h-4 w-4 flex-shrink-0" />
        )}
        <div className="flex-1">
          {avail.is_available ? (
            <span>
              {t("lessonCalendar.availableHours")}: {avail.start_time} – {avail.end_time}
            </span>
          ) : (
            <span>{t("lessonCalendar.notAvailable")}</span>
          )}
          {avail.is_override && (
            <span className="text-xs ml-2 opacity-60">
              ({t("lessonCalendar.customSchedule")})
            </span>
          )}
          {avail.notes && (
            <span className="text-xs ml-2 opacity-60">— {avail.notes}</span>
          )}
        </div>
      </div>
    );
  };

  /* ================================================================ */
  /*  Render: Day Cell                                                 */
  /* ================================================================ */

  const renderDayCell = (date: Date, isCurrentMonth: boolean) => {
    const key = toDateKey(date);
    const dayBookings = bookingsForDay.get(key) ?? [];
    const dayCalls = callsForDay.get(key) ?? [];
    const avail = availMap.get(key);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const todayFlag = isToday(date);

    const confirmedBookings = dayBookings.filter(
      (b) => b.status === "confirmed",
    );
    const hasAvailability = avail?.is_available ?? false;

    return (
      <button
        key={date.toISOString()}
        onClick={() => setSelectedDate(date)}
        className={cn(
          "relative flex flex-col items-start p-1 sm:p-1.5 min-h-[72px] sm:min-h-[90px] border border-surface-700/50 transition-all duration-150 text-left",
          isCurrentMonth ? "bg-surface-800/50" : "bg-surface-900/30",
          isSelected && "ring-2 ring-brand-500/60 bg-surface-800",
          !isSelected && isCurrentMonth && "hover:bg-surface-700/40",
          (date.getDay() === 0 || date.getDay() === 6) && "bg-surface-900/50",
        )}
      >
        {/* Date number + availability dot */}
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full",
              todayFlag && "bg-brand-500 text-white",
              !todayFlag && isCurrentMonth && "text-surface-200",
              !todayFlag && !isCurrentMonth && "text-surface-600",
            )}
          >
            {date.getDate()}
          </span>
          {/* Subtle availability indicator — not an event block */}
          {hasAvailability && isCurrentMonth && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400/50" />
          )}
        </div>

        {/* Booking / call mini-events */}
        <div className="flex flex-wrap gap-0.5 mt-0.5 w-full">
          {confirmedBookings.slice(0, 3).map((b) => (
            <div
              key={b.id}
              className={cn(
                "hidden sm:block w-full text-[10px] leading-tight px-1 py-0.5 rounded truncate border-l-2",
                bookingColorClasses(b.status, !isAdmin),
              )}
              title={`${b.startTime} - ${b.endTime}${b.username ? ` (${b.username})` : ""}`}
            >
              {b.startTime}
              {b.username ? ` ${b.username}` : ""}
            </div>
          ))}
          {dayCalls.slice(0, 1).map((c) => (
            <div
              key={c.id}
              className="hidden sm:block w-full text-[10px] leading-tight px-1 py-0.5 rounded truncate border-l-2 bg-purple-500/20 text-purple-300 border-purple-500/40"
              title={c.title || t("lessonCalendar.call")}
            >
              <span className="flex items-center gap-0.5">
                <Video className="h-2.5 w-2.5 inline flex-shrink-0" />
                {c.title || t("lessonCalendar.call")}
              </span>
            </div>
          ))}
          {/* Mobile: dots */}
          <div className="flex gap-0.5 sm:hidden">
            {confirmedBookings.slice(0, 4).map((b) => (
              <span
                key={b.id}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  bookingDotColor(b.status, !isAdmin),
                )}
              />
            ))}
            {dayCalls.slice(0, 1).map((c) => (
              <span key={c.id} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            ))}
          </div>
          {confirmedBookings.length + dayCalls.length > 3 && (
            <span className="hidden sm:block text-[10px] text-surface-500 px-1">
              +{confirmedBookings.length + dayCalls.length - 3}
            </span>
          )}
        </div>
      </button>
    );
  };

  /* ================================================================ */
  /*  Render: Detail Panel                                             */
  /* ================================================================ */

  const renderDetailPanel = () => {
    if (!selectedDate) return null;

    const dateKey = toDateKey(selectedDate);
    const dayBookings = bookingsForDay.get(dateKey) ?? [];
    const dayCalls = callsForDay.get(dateKey) ?? [];
    const avail = availMap.get(dateKey);

    const dateStr = selectedDate.toLocaleDateString(
      locale === "it" ? "it-IT" : "en-US",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );

    return (
      <div className="card animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-semibold text-surface-100 capitalize">
            {dateStr}
          </h3>
          <button
            onClick={() => {
              setSelectedDate(null);
              setShowBookingForm(false);
              setShowOverrideForm(false);
              setShowCreateCall(false);
            }}
            className="text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Availability info (NOT an event, just info text) ── */}
        {renderAvailabilityInfo(dateKey)}
        {allowBookingOutsideAvailability && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-surface-500">
            <Info className="h-3 w-3" />
            {t("lessonCalendar.bookingOutsideAllowed")}
          </div>
        )}

        {/* ── Bookings ── */}
        {dayBookings.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wide">
              {t("lessonCalendar.bookings")}
            </h4>
            {dayBookings.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "p-3 rounded-lg border-l-3 border transition-all",
                  bookingColorClasses(b.status, !isAdmin),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {b.startTime} – {b.endTime}
                      </span>
                    </div>
                    {b.username && (
                      <p className="text-xs mt-1 opacity-80">{b.username}</p>
                    )}
                    {b.notes && (
                      <p className="text-xs mt-1 opacity-70">{b.notes}</p>
                    )}
                    <span
                      className={cn(
                        "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        b.status === "confirmed"
                          ? "bg-success-500/20 text-success-300"
                          : "bg-error-500/15 text-error-300",
                      )}
                    >
                      {b.status === "confirmed"
                        ? t("lessonCalendar.status_confirmed")
                        : t("lessonCalendar.status_cancelled")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {b.status === "confirmed" && !isAdmin && onCancelBooking && (
                      <button
                        onClick={() => onCancelBooking(b.id)}
                        className="btn-ghost text-error-400 hover:text-error-300 text-xs py-1 px-2"
                      >
                        <X className="h-3 w-3" />
                        {t("lessonCalendar.cancelBooking")}
                      </button>
                    )}
                    {b.status === "confirmed" && isAdmin && onCancelAnyBooking && (
                      <button
                        onClick={() => onCancelAnyBooking(b.id)}
                        className="btn-ghost text-error-400 hover:text-error-300 text-xs py-1 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("lessonCalendar.cancelBooking")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Calls ── */}
        {dayCalls.length > 0 && (
          <div className="mt-4 space-y-2">
            {dayCalls.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg border-l-3 border bg-purple-500/20 text-purple-300 border-purple-500/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {c.title || t("lessonCalendar.call")}
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-70">
                      {c.participantCount ?? 0} {t("lessonCalendar.participants")}
                      {c.isActive === false &&
                        ` — ${t("lessonCalendar.callEnded")}`}
                    </p>
                  </div>
                  {c.isActive !== false && onJoinCall && (
                    <button
                      onClick={() => onJoinCall(c.id)}
                      className="btn-primary text-xs py-1 px-2 bg-purple-600 hover:bg-purple-500"
                    >
                      <Phone className="h-3 w-3" />
                      {t("lessonCalendar.joinCall")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {dayBookings.length === 0 && dayCalls.length === 0 && (
          <div className="flex items-center gap-2 text-surface-500 py-3 mt-3">
            <Clock className="h-4 w-4" />
            <p className="text-sm">{t("lessonCalendar.noEventsDay")}</p>
          </div>
        )}

        {/* ══ User: Create Booking Form ══ */}
        {!isAdmin && onCreateBooking && (
          <div className="border-t border-surface-700 pt-4 mt-4">
            <button
              onClick={() => {
                if (!showBookingForm && avail) {
                  setBookingStart(avail.start_time ?? "09:00");
                  setBookingEnd(avail.end_time ?? "10:00");
                }
                setShowBookingForm(!showBookingForm);
              }}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                showBookingForm
                  ? "text-brand-400"
                  : "text-surface-400 hover:text-surface-200",
              )}
            >
              <Plus className="h-4 w-4" />
              {t("lessonCalendar.newBooking")}
            </button>
            {showBookingForm && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-[10px] text-surface-500 block mb-0.5">
                      {t("lessonCalendar.from")}
                    </label>
                    <input
                      type="time"
                      value={bookingStart}
                      onChange={(e) => setBookingStart(e.target.value)}
                      className="input-field text-xs py-1 px-2 w-28"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-500 block mb-0.5">
                      {t("lessonCalendar.to")}
                    </label>
                    <input
                      type="time"
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      className="input-field text-xs py-1 px-2 w-28"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder={t("lessonCalendar.addNote")}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="input-field text-xs py-1.5 px-2 w-full"
                />
                <button
                  onClick={handleCreateBooking}
                  disabled={creatingBooking}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {creatingBooking ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  {t("lessonCalendar.book")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ Admin: Override + Call actions ══ */}
        {isAdmin && (
          <div className="border-t border-surface-700 pt-4 mt-4 space-y-3">
            {/* Override */}
            {onSaveOverride && (
              <div>
                <button
                  onClick={() => {
                    if (!showOverrideForm && avail) {
                      setOverrideClosed(!avail.is_available);
                      setOverrideStart(avail.start_time ?? "08:00");
                      setOverrideEnd(avail.end_time ?? "17:00");
                      setOverrideNotes(avail.notes ?? "");
                    }
                    setShowOverrideForm(!showOverrideForm);
                    setShowCreateCall(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    showOverrideForm
                      ? "text-brand-400"
                      : "text-surface-400 hover:text-surface-200",
                  )}
                >
                  <Settings className="h-4 w-4" />
                  {t("lessonCalendar.overrideDay")}
                </button>
                {showOverrideForm && (
                  <div className="mt-3 space-y-3 animate-fade-in">
                    {/* Closed toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        onClick={() => setOverrideClosed(!overrideClosed)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative flex-shrink-0",
                          overrideClosed ? "bg-error-500" : "bg-brand-500",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                            overrideClosed ? "left-0.5" : "left-5",
                          )}
                        />
                      </button>
                      <span className="text-sm text-surface-200">
                        {overrideClosed
                          ? t("lessonCalendar.dayClosed")
                          : t("lessonCalendar.dayOpen")}
                      </span>
                    </label>
                    {/* Time pickers if open */}
                    {!overrideClosed && (
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="text-[10px] text-surface-500 block mb-0.5">
                            {t("lessonCalendar.from")}
                          </label>
                          <input
                            type="time"
                            value={overrideStart}
                            onChange={(e) => setOverrideStart(e.target.value)}
                            className="input-field text-xs py-1 px-2 w-28"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-surface-500 block mb-0.5">
                            {t("lessonCalendar.to")}
                          </label>
                          <input
                            type="time"
                            value={overrideEnd}
                            onChange={(e) => setOverrideEnd(e.target.value)}
                            className="input-field text-xs py-1 px-2 w-28"
                          />
                        </div>
                      </div>
                    )}
                    {/* Notes */}
                    <input
                      type="text"
                      placeholder={t("lessonCalendar.overrideNotes")}
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      className="input-field text-xs py-1.5 px-2 w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveOverride}
                        disabled={savingOverride}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {savingOverride ? (
                          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {t("lessonCalendar.saveOverride")}
                      </button>
                      {avail?.is_override && onDeleteOverride && (
                        <button
                          onClick={handleDeleteOverride}
                          className="btn-ghost text-error-400 hover:text-error-300 text-xs py-1.5 px-3"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("lessonCalendar.removeOverride")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule Call */}
            {onScheduleCall && (
              <div>
                <button
                  onClick={() => {
                    setShowCreateCall(!showCreateCall);
                    setShowOverrideForm(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    showCreateCall
                      ? "text-purple-400"
                      : "text-surface-400 hover:text-surface-200",
                  )}
                >
                  <Video className="h-4 w-4" />
                  {t("lessonCalendar.startCall")}
                </button>
                {showCreateCall && (
                  <div className="mt-2 flex items-end gap-2 animate-fade-in">
                    <div className="flex-1">
                      <label className="text-[10px] text-surface-500 block mb-0.5">
                        {t("lessonCalendar.roomName")}
                      </label>
                      <input
                        type="text"
                        value={newCallName}
                        onChange={(e) => setNewCallName(e.target.value)}
                        placeholder={t("lessonCalendar.roomNamePlaceholder")}
                        className="input-field text-xs py-1 px-2"
                      />
                    </div>
                    <button
                      onClick={handleScheduleCall}
                      disabled={creatingCall}
                      className="btn-primary text-xs py-1.5 px-3 bg-purple-600 hover:bg-purple-500"
                    >
                      {creatingCall ? (
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Video className="h-3 w-3" />
                      )}
                      {t("lessonCalendar.create")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ================================================================ */
  /*  Render: Legend                                                    */
  /* ================================================================ */

  const renderLegend = () => {
    const items = isAdmin
      ? [
          { color: "bg-warning-400", label: t("lessonCalendar.status_booked") },
          { color: "bg-error-400", label: t("lessonCalendar.status_cancelled") },
          { color: "bg-purple-400", label: t("lessonCalendar.status_call") },
        ]
      : [
          { color: "bg-success-400", label: t("lessonCalendar.status_my-booking") },
          { color: "bg-purple-400", label: t("lessonCalendar.status_call") },
        ];
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
            <span className="text-xs text-surface-400">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  /* ================================================================ */
  /*  Main Render                                                      */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-ghost p-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-surface-100 capitalize min-w-[130px] sm:min-w-[180px] text-center">
            {monthTitle}
          </h2>
          <button onClick={nextMonth} className="btn-ghost p-2">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="btn-ghost text-xs py-1.5 px-3 ml-1"
          >
            {t("lessonCalendar.today")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {renderLegend()}

          {isAdmin && onSaveGeneralAvailability && (
            <button
              onClick={() => setShowAvailability(!showAvailability)}
              className={cn(
                "btn-ghost text-xs py-1.5 px-3 ml-2 flex items-center gap-1.5",
                showAvailability && "bg-brand-500/20 text-brand-400",
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              {t("lessonCalendar.availability")}
            </button>
          )}

          <div className="flex rounded-lg border border-surface-700 overflow-hidden ml-2">
            <button
              onClick={() => setView("month")}
              className={cn(
                "text-xs font-medium px-3 py-1.5 transition-colors",
                view === "month"
                  ? "bg-brand-500 text-white"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200",
              )}
            >
              {t("lessonCalendar.monthView")}
            </button>
            <button
              onClick={() => {
                setView("week");
                if (!selectedDate) setSelectedDate(new Date());
              }}
              className={cn(
                "text-xs font-medium px-3 py-1.5 transition-colors",
                view === "week"
                  ? "bg-brand-500 text-white"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200",
              )}
            >
              {t("lessonCalendar.weekView")}
            </button>
          </div>
        </div>
      </div>

      {/* Availability panel (admin) */}
      {renderAvailabilityPanel()}

      {/* Calendar grid */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-surface-700">
          {dayNames.map((name, i) => (
            <div
              key={i}
              className={cn(
                "py-2 text-center text-xs font-medium uppercase tracking-wider",
                i >= 5 ? "text-surface-500" : "text-surface-400",
              )}
            >
              {name}
            </div>
          ))}
        </div>

        {view === "month" && (
          <div className="grid grid-cols-7">
            {weeks.flatMap((week) =>
              week.map((date) =>
                renderDayCell(date, date.getMonth() === month.getMonth()),
              ),
            )}
          </div>
        )}

        {view === "week" && (
          <div className="grid grid-cols-7">
            {weekDays.map((date) => renderDayCell(date, true))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {renderDetailPanel()}
    </div>
  );
}