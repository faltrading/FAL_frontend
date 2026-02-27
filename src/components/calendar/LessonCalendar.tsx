"use client";

import React, { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, formatTime } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  id: string;
  title?: string;
  start: string;           // ISO datetime
  end: string;             // ISO datetime
  type: "available" | "booked" | "my-booking" | "cancelled";
  slotId?: string;
  bookingId?: string;
  username?: string;
  notes?: string | null;
}

interface LessonCalendarProps {
  events: CalendarEvent[];
  loading?: boolean;
  /** Which month to control externally (optional) */
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
  /** Callbacks */
  onBookSlot?: (event: CalendarEvent, notes: string) => void;
  onCancelBooking?: (event: CalendarEvent) => void;
  onDeleteSlot?: (event: CalendarEvent) => void;
  /** Show admin-only controls */
  isAdmin?: boolean;
  /** view mode */
  defaultView?: "month" | "week";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

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
  const startDay = first.getDay(); // 0=Sun
  // Adjust to Monday start: Mon=0 ... Sun=6
  const offset = (startDay + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);

  const weeks: Date[][] = [];
  let current = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    // Stop if we've passed the end of the month and have a complete extra week
    if (current.getMonth() !== month && w >= 4) break;
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
    default:
      return "bg-surface-400";
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LessonCalendar({
  events,
  loading,
  currentMonth: controlledMonth,
  onMonthChange,
  onBookSlot,
  onCancelBooking,
  onDeleteSlot,
  isAdmin = false,
  defaultView = "month",
}: LessonCalendarProps) {
  const { t, locale } = useI18n();
  const today = new Date();

  /* ---- state ---- */
  const [internalMonth, setInternalMonth] = useState(today);
  const month = controlledMonth ?? internalMonth;

  const [view, setView] = useState<"month" | "week">(defaultView);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  const setMonth = (d: Date) => {
    if (onMonthChange) onMonthChange(d);
    else setInternalMonth(d);
  };

  /* ---- derived ---- */
  const weeks = useMemo(
    () => getCalendarGrid(month.getFullYear(), month.getMonth()),
    [month]
  );

  const weekDays = useMemo(() => {
    if (view === "week" && selectedDate) return getWeekGrid(selectedDate);
    return getWeekGrid(today);
  }, [view, selectedDate, today]);

  const eventsForDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    // Sort each day's events by start time
    map.forEach((dayEvents) => {
      dayEvents.sort(
        (a: CalendarEvent, b: CalendarEvent) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    });
    return map;
  }, [events]);

  const getEventsForDate = (d: Date) => {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return eventsForDay.get(key) ?? [];
  };

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  /* ---- navigation ---- */
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

  /* ---- month title ---- */
  const monthTitle = month.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
    month: "long",
    year: "numeric",
  });

  /* ---- day names ---- */
  const dayNames = useMemo(() => {
    const names: string[] = [];
    // Start from a known Monday (e.g. 2024-01-01 is a Monday)
    const base = new Date(2024, 0, 1);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      names.push(
        d.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
          weekday: "short",
        })
      );
    }
    return names;
  }, [locale]);

  /* ---- booking handler ---- */
  const handleBookClick = async (ev: CalendarEvent) => {
    if (!onBookSlot) return;
    setBookingInProgress(ev.id);
    await onBookSlot(ev, bookingNotes);
    setBookingInProgress(null);
    setBookingNotes("");
  };

  /* ---- render helpers ---- */
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
          // weekends slightly different
          date.getDay() === 0 || date.getDay() === 6
            ? "bg-surface-900/50"
            : ""
        )}
      >
        {/* Date number */}
        <span
          className={cn(
            "text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full",
            todayFlag && "bg-brand-500 text-white",
            !todayFlag && isCurrentMonth && "text-surface-200",
            !todayFlag && !isCurrentMonth && "text-surface-600"
          )}
        >
          {date.getDate()}
        </span>

        {/* Event dots / pills */}
        <div className="flex flex-wrap gap-0.5 mt-0.5 w-full">
          {dayEvents.slice(0, 3).map((ev: CalendarEvent) => (
            <div
              key={ev.id}
              className={cn(
                "hidden sm:block w-full text-[10px] leading-tight px-1 py-0.5 rounded truncate border-l-2",
                eventColorClasses(ev.type)
              )}
              title={`${formatTime(ev.start, locale)} - ${formatTime(ev.end, locale)}${ev.username ? ` (${ev.username})` : ""}`}
            >
              {formatTime(ev.start, locale)}
              {ev.username ? ` ${ev.username}` : ""}
            </div>
          ))}
          {/* Mobile: just dots */}
          <div className="flex gap-0.5 sm:hidden">
            {dayEvents.slice(0, 4).map((ev: CalendarEvent) => (
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

  /* ---------------------------------------------------------------- */
  /*  Detail panel for selected day                                    */
  /* ---------------------------------------------------------------- */
  const renderDetailPanel = () => {
    if (!selectedDate) return null;

    const dateStr = selectedDate.toLocaleDateString(
      locale === "it" ? "it-IT" : "en-US",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    );

    return (
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-semibold text-surface-100 capitalize">
            {dateStr}
          </h3>
          <button
            onClick={() => setSelectedDate(null)}
            className="text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="flex items-center gap-2 text-surface-500 py-4">
            <Clock className="h-4 w-4" />
            <p className="text-sm">{t("lessonCalendar.noEventsDay")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((ev: CalendarEvent) => (
              <div
                key={ev.id}
                className={cn(
                  "p-3 rounded-lg border-l-3 border transition-all",
                  eventColorClasses(ev.type)
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {formatTime(ev.start, locale)} – {formatTime(ev.end, locale)}
                      </span>
                    </div>
                    {ev.username && (
                      <p className="text-xs mt-1 opacity-80">
                        {ev.username}
                      </p>
                    )}
                    {ev.notes && (
                      <p className="text-xs mt-1 opacity-70">{ev.notes}</p>
                    )}
                    <span
                      className={cn(
                        "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        ev.type === "available" && "bg-brand-500/20 text-brand-300",
                        ev.type === "booked" && "bg-warning-500/20 text-warning-300",
                        ev.type === "my-booking" && "bg-success-500/20 text-success-300",
                        ev.type === "cancelled" && "bg-error-500/15 text-error-300"
                      )}
                    >
                      {t(`lessonCalendar.status_${ev.type}`)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {/* Book action for available slots (user) */}
                    {ev.type === "available" && onBookSlot && (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder={t("lessonCalendar.addNote")}
                          value={bookingNotes}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingNotes(e.target.value)}
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
                    {/* Admin: delete slot */}
                    {isAdmin && ev.type === "available" && onDeleteSlot && (
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onDeleteSlot(ev);
                        }}
                        className="btn-ghost text-error-400 hover:text-error-300 text-xs py-1 px-2"
                      >
                        <X className="h-3 w-3" />
                        {t("lessonCalendar.deleteSlot")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Legend                                                            */
  /* ---------------------------------------------------------------- */
  const renderLegend = () => {
    const items = isAdmin
      ? [
          { type: "available" as const, label: t("lessonCalendar.status_available") },
          { type: "booked" as const, label: t("lessonCalendar.status_booked") },
          { type: "cancelled" as const, label: t("lessonCalendar.status_cancelled") },
        ]
      : [
          { type: "available" as const, label: t("lessonCalendar.status_available") },
          { type: "my-booking" as const, label: t("lessonCalendar.status_my-booking") },
        ];

    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", eventDotColor(item.type))} />
            <span className="text-xs text-surface-400">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */
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
          <button
            onClick={goToToday}
            className="btn-ghost text-xs py-1.5 px-3 ml-1"
          >
            {t("lessonCalendar.today")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {renderLegend()}
          <div className="flex rounded-lg border border-surface-700 overflow-hidden ml-3">
            <button
              onClick={() => setView("month")}
              className={cn(
                "text-xs font-medium px-3 py-1.5 transition-colors",
                view === "month"
                  ? "bg-brand-500 text-white"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
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
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
              )}
            >
              {t("lessonCalendar.weekView")}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Calendar grid ---- */}
      <div className="card p-0 overflow-hidden">
        {/* Day name headers */}
        <div className="grid grid-cols-7 border-b border-surface-700">
          {dayNames.map((name, i) => (
            <div
              key={i}
              className={cn(
                "py-2 text-center text-xs font-medium uppercase tracking-wider",
                i >= 5 ? "text-surface-500" : "text-surface-400"
              )}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Month view */}
        {view === "month" && (
          <div className="grid grid-cols-7">
            {weeks.flatMap((week) =>
              week.map((date) =>
                renderDayCell(date, date.getMonth() === month.getMonth())
              )
            )}
          </div>
        )}

        {/* Week view */}
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
