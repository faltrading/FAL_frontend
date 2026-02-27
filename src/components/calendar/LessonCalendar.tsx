"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, formatTime } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Video,
  Phone,
  Trash2,
  CalendarDays,
  Save,
} from "lucide-react";

/* ================================================================== */
/*  Exported Types                                                     */
/* ================================================================== */

export interface CalendarEvent {
  id: string;
  title?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  type: "available" | "booked" | "my-booking" | "cancelled" | "call";
  slotId?: string;
  bookingId?: string;
  callId?: string;
  username?: string;
  notes?: string | null;
  /** Call-specific */
  participantCount?: number;
  isActive?: boolean;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

/** Index 0 = Monday … 6 = Sunday */
export type WeekSchedule = [
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
];

export const DEFAULT_SCHEDULE: WeekSchedule = [
  { enabled: true, startTime: "09:00", endTime: "17:00" },
  { enabled: true, startTime: "09:00", endTime: "17:00" },
  { enabled: true, startTime: "09:00", endTime: "17:00" },
  { enabled: true, startTime: "09:00", endTime: "17:00" },
  { enabled: true, startTime: "09:00", endTime: "17:00" },
  { enabled: false, startTime: "09:00", endTime: "17:00" },
  { enabled: false, startTime: "09:00", endTime: "17:00" },
];

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface LessonCalendarProps {
  events: CalendarEvent[];
  loading?: boolean;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
  /* User callbacks */
  onBookSlot?: (event: CalendarEvent, notes: string) => void;
  onCancelBooking?: (event: CalendarEvent) => void;
  onJoinCall?: (event: CalendarEvent) => void;
  /* Admin callbacks */
  onDeleteSlot?: (event: CalendarEvent) => void;
  onCreateSlot?: (date: string, startTime: string, endTime: string) => Promise<void>;
  onScheduleCall?: (roomName: string) => Promise<void>;
  onSaveAvailability?: (
    schedule: WeekSchedule,
    weeks: number,
    slotDuration: number,
  ) => Promise<void>;
  isAdmin?: boolean;
  defaultView?: "month" | "week";
  /** Pre-fill availability panel */
  initialSchedule?: WeekSchedule;
  initialSlotDuration?: number;
}

/* ================================================================== */
/*  Date helpers                                                       */
/* ================================================================== */

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function getCalendarGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Mon-start
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
/*  Color / style helpers                                              */
/* ================================================================== */

function eventColorClasses(type: CalendarEvent["type"]) {
  switch (type) {
    case "available":
      return "bg-brand-500/20 text-brand-300 border-brand-500/40";
    case "booked":
      return "bg-warning-500/20 text-warning-400 border-warning-500/40";
    case "my-booking":
      return "bg-success-500/20 text-success-400 border-success-500/40";
    case "cancelled":
      return "bg-error-500/15 text-error-400 border-error-500/30 line-through opacity-60";
    case "call":
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    default:
      return "bg-surface-700 text-surface-300 border-surface-600";
  }
}

function eventDotColor(type: CalendarEvent["type"]) {
  switch (type) {
    case "available":
      return "bg-brand-400";
    case "booked":
      return "bg-warning-400";
    case "my-booking":
      return "bg-success-400";
    case "cancelled":
      return "bg-error-400";
    case "call":
      return "bg-purple-400";
    default:
      return "bg-surface-400";
  }
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function LessonCalendar({
  events,
  loading,
  currentMonth: controlledMonth,
  onMonthChange,
  onBookSlot,
  onCancelBooking,
  onJoinCall,
  onDeleteSlot,
  onCreateSlot,
  onScheduleCall,
  onSaveAvailability,
  isAdmin = false,
  defaultView = "month",
  initialSchedule,
  initialSlotDuration,
}: LessonCalendarProps) {
  const { t, locale } = useI18n();
  const today = new Date();

  /* ---- core state ---- */
  const [internalMonth, setInternalMonth] = useState(today);
  const month = controlledMonth ?? internalMonth;
  const [view, setView] = useState<"month" | "week">(defaultView);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  /* ---- booking state ---- */
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  /* ---- availability panel (admin) ---- */
  const [showAvailability, setShowAvailability] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>(
    initialSchedule ?? [...DEFAULT_SCHEDULE] as WeekSchedule,
  );
  const [slotDuration, setSlotDuration] = useState(initialSlotDuration ?? 30);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [savingAvailability, setSavingAvailability] = useState(false);

  /* ---- admin inline create state ---- */
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [showCreateCall, setShowCreateCall] = useState(false);
  const [newCallName, setNewCallName] = useState("");
  const [creatingCall, setCreatingCall] = useState(false);

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

  /* ---- derived data ---- */
  const weeks = useMemo(
    () => getCalendarGrid(month.getFullYear(), month.getMonth()),
    [month],
  );

  const weekDays = useMemo(() => {
    if (view === "week" && selectedDate) return getWeekGrid(selectedDate);
    return getWeekGrid(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDate]);

  const eventsForDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    map.forEach((dayEvts) => {
      dayEvts.sort(
        (a: CalendarEvent, b: CalendarEvent) =>
          new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    });
    return map;
  }, [events]);

  const getEventsForDate = (d: Date) => {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return eventsForDay.get(key) ?? [];
  };

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  /* ---- month title ---- */
  const monthTitle = month.toLocaleDateString(
    locale === "it" ? "it-IT" : "en-US",
    { month: "long", year: "numeric" },
  );

  /* ---- day header names ---- */
  const dayNames = useMemo(() => {
    const base = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
        weekday: "short",
      });
    });
  }, [locale]);

  /* ---- full day names for availability panel ---- */
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

  const handleBookClick = async (ev: CalendarEvent) => {
    if (!onBookSlot) return;
    setBookingInProgress(ev.id);
    await onBookSlot(ev, bookingNotes);
    setBookingInProgress(null);
    setBookingNotes("");
  };

  const handleSaveAvailability = async () => {
    if (!onSaveAvailability) return;
    setSavingAvailability(true);
    try {
      await onSaveAvailability(schedule, weeksAhead, slotDuration);
    } finally {
      setSavingAvailability(false);
      setShowAvailability(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!onCreateSlot || !selectedDate) return;
    setCreatingSlot(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      await onCreateSlot(dateStr, newSlotStart, newSlotEnd);
      setShowCreateSlot(false);
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleScheduleCall = async () => {
    if (!onScheduleCall) return;
    setCreatingCall(true);
    try {
      await onScheduleCall(newCallName || undefined as unknown as string);
      setShowCreateCall(false);
      setNewCallName("");
    } finally {
      setCreatingCall(false);
    }
  };

  const updateDaySchedule = (
    dayIndex: number,
    field: keyof DaySchedule,
    value: string | boolean,
  ) => {
    setSchedule((prev: WeekSchedule) => {
      const next = [...prev] as WeekSchedule;
      next[dayIndex] = { ...next[dayIndex], [field]: value };
      return next;
    });
  };

  /* ================================================================ */
  /*  Render: Availability Configuration Panel (Admin)                 */
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

        {/* Top controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">{t("lessonCalendar.slotDuration")}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={slotDuration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSlotDuration(Math.max(5, Number(e.target.value)))
                }
                min={5}
                className="input-field w-24"
              />
              <span className="text-xs text-surface-400">min</span>
            </div>
          </div>
          <div>
            <label className="label">{t("lessonCalendar.generateWeeks")}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={weeksAhead}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWeeksAhead(Math.max(1, Math.min(12, Number(e.target.value))))
                }
                min={1}
                max={12}
                className="input-field w-24"
              />
              <span className="text-xs text-surface-400">
                {t("lessonCalendar.weeks")}
              </span>
            </div>
          </div>
        </div>

        {/* Per-day schedule */}
        <div className="space-y-2">
          {schedule.map((day: DaySchedule, i: number) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                day.enabled
                  ? "bg-surface-800/80"
                  : "bg-surface-900/40 opacity-60",
              )}
            >
              {/* Toggle */}
              <button
                onClick={() => updateDaySchedule(i, "enabled", !day.enabled)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative flex-shrink-0",
                  day.enabled ? "bg-brand-500" : "bg-surface-600",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    day.enabled ? "left-5" : "left-0.5",
                  )}
                />
              </button>

              {/* Day name */}
              <span className="text-sm font-medium text-surface-200 w-24 capitalize">
                {fullDayNames[i]}
              </span>

              {/* Time inputs */}
              {day.enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDaySchedule(i, "startTime", e.target.value)
                    }
                    className="input-field text-xs py-1 px-2 w-28"
                  />
                  <span className="text-surface-500">–</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDaySchedule(i, "endTime", e.target.value)
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

        {/* Save button */}
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
            {t("lessonCalendar.generateSlots")}
          </button>
        </div>
      </div>
    );
  };

  /* ================================================================ */
  /*  Render: Day Cell                                                 */
  /* ================================================================ */

  const renderDayCell = (date: Date, isCurrentMonth: boolean) => {
    const dayEvents = getEventsForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const todayFlag = isToday(date);

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

        <div className="flex flex-wrap gap-0.5 mt-0.5 w-full">
          {dayEvents.slice(0, 3).map((ev: CalendarEvent) => (
            <div
              key={ev.id}
              className={cn(
                "hidden sm:block w-full text-[10px] leading-tight px-1 py-0.5 rounded truncate border-l-2",
                eventColorClasses(ev.type),
              )}
              title={
                ev.type === "call"
                  ? `${ev.title || t("lessonCalendar.call")} — ${ev.participantCount ?? 0} ${t("lessonCalendar.participants")}`
                  : `${formatTime(ev.start, locale)} - ${formatTime(ev.end, locale)}${ev.username ? ` (${ev.username})` : ""}`
              }
            >
              {ev.type === "call" ? (
                <span className="flex items-center gap-0.5">
                  <Video className="h-2.5 w-2.5 inline flex-shrink-0" />
                  {ev.title || t("lessonCalendar.call")}
                </span>
              ) : (
                <>
                  {formatTime(ev.start, locale)}
                  {ev.username ? ` ${ev.username}` : ""}
                </>
              )}
            </div>
          ))}
          {/* Mobile: dots */}
          <div className="flex gap-0.5 sm:hidden">
            {dayEvents.slice(0, 5).map((ev: CalendarEvent) => (
              <span
                key={ev.id}
                className={cn("w-1.5 h-1.5 rounded-full", eventDotColor(ev.type))}
              />
            ))}
          </div>
          {dayEvents.length > 3 && (
            <span className="hidden sm:block text-[10px] text-surface-500 px-1">
              +{dayEvents.length - 3}
            </span>
          )}
        </div>
      </button>
    );
  };

  /* ================================================================ */
  /*  Render: Detail Panel (selected day)                              */
  /* ================================================================ */

  const renderDetailPanel = () => {
    if (!selectedDate) return null;

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
              setShowCreateSlot(false);
              setShowCreateCall(false);
            }}
            className="text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Events list */}
        {selectedDayEvents.length === 0 ? (
          <div className="flex items-center gap-2 text-surface-500 py-4">
            <Clock className="h-4 w-4" />
            <p className="text-sm">{t("lessonCalendar.noEventsDay")}</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {selectedDayEvents.map((ev: CalendarEvent) => (
              <div
                key={ev.id}
                className={cn(
                  "p-3 rounded-lg border-l-3 border transition-all",
                  eventColorClasses(ev.type),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Time / title row */}
                    <div className="flex items-center gap-2">
                      {ev.type === "call" ? (
                        <Video className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        {ev.type === "call"
                          ? ev.title || t("lessonCalendar.call")
                          : `${formatTime(ev.start, locale)} – ${formatTime(ev.end, locale)}`}
                      </span>
                    </div>
                    {/* Username */}
                    {ev.username && (
                      <p className="text-xs mt-1 opacity-80">{ev.username}</p>
                    )}
                    {/* Notes */}
                    {ev.notes && (
                      <p className="text-xs mt-1 opacity-70">{ev.notes}</p>
                    )}
                    {/* Call info */}
                    {ev.type === "call" && (
                      <p className="text-xs mt-1 opacity-70">
                        {ev.participantCount ?? 0} {t("lessonCalendar.participants")}
                        {ev.isActive === false && ` — ${t("lessonCalendar.callEnded")}`}
                      </p>
                    )}
                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        ev.type === "available" && "bg-brand-500/20 text-brand-300",
                        ev.type === "booked" && "bg-warning-500/20 text-warning-300",
                        ev.type === "my-booking" && "bg-success-500/20 text-success-300",
                        ev.type === "cancelled" && "bg-error-500/15 text-error-300",
                        ev.type === "call" && "bg-purple-500/20 text-purple-300",
                      )}
                    >
                      {t(`lessonCalendar.status_${ev.type}`)}
                    </span>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {/* Book (user) */}
                    {ev.type === "available" && onBookSlot && !isAdmin && (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder={t("lessonCalendar.addNote")}
                          value={bookingNotes}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setBookingNotes(e.target.value)
                          }
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          className="input-field text-xs py-1 px-2 w-36"
                        />
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleBookClick(ev);
                          }}
                          disabled={bookingInProgress === ev.id}
                          className="btn-primary text-xs py-1 px-2"
                        >
                          {bookingInProgress === ev.id ? (
                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {t("lessonCalendar.book")}
                        </button>
                      </div>
                    )}
                    {/* Cancel booking (user) */}
                    {ev.type === "my-booking" && onCancelBooking && (
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onCancelBooking(ev);
                        }}
                        className="btn-ghost text-error-400 hover:text-error-300 text-xs py-1 px-2"
                      >
                        <X className="h-3 w-3" />
                        {t("lessonCalendar.cancelBooking")}
                      </button>
                    )}
                    {/* Delete slot (admin) */}
                    {isAdmin && ev.type === "available" && onDeleteSlot && (
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onDeleteSlot(ev);
                        }}
                        className="btn-ghost text-error-400 hover:text-error-300 text-xs py-1 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("lessonCalendar.deleteSlot")}
                      </button>
                    )}
                    {/* Join call */}
                    {ev.type === "call" && ev.isActive !== false && onJoinCall && (
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onJoinCall(ev);
                        }}
                        className="btn-primary text-xs py-1 px-2 bg-purple-600 hover:bg-purple-500"
                      >
                        <Phone className="h-3 w-3" />
                        {t("lessonCalendar.joinCall")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- Admin quick actions ---- */}
        {isAdmin && (
          <div className="border-t border-surface-700 pt-4 space-y-3">
            {/* Add Slot */}
            {onCreateSlot && (
              <div>
                <button
                  onClick={() => {
                    setShowCreateSlot(!showCreateSlot);
                    setShowCreateCall(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    showCreateSlot
                      ? "text-brand-400"
                      : "text-surface-400 hover:text-surface-200",
                  )}
                >
                  <Plus className="h-4 w-4" />
                  {t("lessonCalendar.addSlot")}
                </button>
                {showCreateSlot && (
                  <div className="mt-2 flex items-end gap-2 animate-fade-in">
                    <div>
                      <label className="text-[10px] text-surface-500 block mb-0.5">
                        {t("lessonCalendar.from")}
                      </label>
                      <input
                        type="time"
                        value={newSlotStart}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewSlotStart(e.target.value)
                        }
                        className="input-field text-xs py-1 px-2 w-28"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-surface-500 block mb-0.5">
                        {t("lessonCalendar.to")}
                      </label>
                      <input
                        type="time"
                        value={newSlotEnd}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewSlotEnd(e.target.value)
                        }
                        className="input-field text-xs py-1 px-2 w-28"
                      />
                    </div>
                    <button
                      onClick={handleCreateSlot}
                      disabled={creatingSlot}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      {creatingSlot ? (
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {t("lessonCalendar.create")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Start Call */}
            {onScheduleCall && (
              <div>
                <button
                  onClick={() => {
                    setShowCreateCall(!showCreateCall);
                    setShowCreateSlot(false);
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewCallName(e.target.value)
                        }
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
    const adminItems = [
      { type: "available" as const, label: t("lessonCalendar.status_available") },
      { type: "booked" as const, label: t("lessonCalendar.status_booked") },
      { type: "cancelled" as const, label: t("lessonCalendar.status_cancelled") },
      { type: "call" as const, label: t("lessonCalendar.status_call") },
    ];
    const userItems = [
      { type: "available" as const, label: t("lessonCalendar.status_available") },
      { type: "my-booking" as const, label: t("lessonCalendar.status_my-booking") },
      { type: "call" as const, label: t("lessonCalendar.status_call") },
    ];
    const items = isAdmin ? adminItems : userItems;

    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <span
              className={cn("w-2.5 h-2.5 rounded-full", eventDotColor(item.type))}
            />
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
      {/* ---- Toolbar ---- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-ghost p-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-surface-100 capitalize min-w-[180px] text-center">
            {monthTitle}
          </h2>
          <button onClick={nextMonth} className="btn-ghost p-2">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={goToToday} className="btn-ghost text-xs py-1.5 px-3 ml-1">
            {t("lessonCalendar.today")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {renderLegend()}

          {/* Admin: availability config toggle */}
          {isAdmin && onSaveAvailability && (
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

          {/* View toggle */}
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

      {/* ---- Availability panel (admin) ---- */}
      {renderAvailabilityPanel()}

      {/* ---- Calendar grid ---- */}
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

      {/* ---- Day detail panel ---- */}
      {renderDetailPanel()}
    </div>
  );
}
