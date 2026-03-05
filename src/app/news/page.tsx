"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, formatDateTime } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types";
import {
  Newspaper,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Filter,
} from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
const IMPACTS = ["High", "Medium", "Low"];
const NOTIFY_OPTIONS = [5, 10, 15, 30, 60];
const NEWS_URL = "/api/proxy/news";

interface NotificationPrefs {
  enabled: boolean;
  minutesBefore: number;
}

function getStoredPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return { enabled: false, minutesBefore: 15 };
  try {
    const stored = localStorage.getItem("fal_news_notification_prefs");
    if (stored) return JSON.parse(stored);
  } catch {
  }
  return { enabled: false, minutesBefore: 15 };
}

function getStoredFilters(): { currencies: string[]; impacts: string[] } {
  if (typeof window === "undefined") return { currencies: [], impacts: [] };
  try {
    const stored = localStorage.getItem("fal_news_filters");
    if (stored) return JSON.parse(stored);
  } catch {
  }
  return { currencies: [], impacts: [] };
}

function impactClass(impact: string): string {
  const normalized = impact.toLowerCase();
  if (normalized === "high") return "bg-error-500/15 text-error-400";
  if (normalized === "medium") return "bg-warning-500/15 text-warning-400";
  return "bg-brand-500/15 text-brand-400";
}

export default function NewsPage() {
  const { t, locale } = useI18n();
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>(
    () => getStoredFilters().currencies
  );
  const [activeImpacts, setActiveImpacts] = useState<string[]>(
    () => getStoredFilters().impacts
  );
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getStoredPrefs);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    fetch(NEWS_URL)
      .then((res) => res.json())
      .then((data: NewsEvent[]) => setEvents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  useEffect(() => {
    localStorage.setItem(
      "fal_news_filters",
      JSON.stringify({ currencies: activeCurrencies, impacts: activeImpacts })
    );
  }, [activeCurrencies, activeImpacts]);

  const toggleCurrency = (currency: string) => {
    setActiveCurrencies((prev) =>
      prev.includes(currency)
        ? prev.filter((c) => c !== currency)
        : [...prev, currency]
    );
  };

  const toggleImpact = (impact: string) => {
    setActiveImpacts((prev) =>
      prev.includes(impact)
        ? prev.filter((i) => i !== impact)
        : [...prev, impact]
    );
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (activeCurrencies.length > 0 && !activeCurrencies.includes(event.country)) {
        return false;
      }
      if (activeImpacts.length > 0) {
        const normalizedImpact =
          event.impact.charAt(0).toUpperCase() + event.impact.slice(1).toLowerCase();
        if (!activeImpacts.includes(normalizedImpact)) return false;
      }
      return true;
    });
  }, [events, activeCurrencies, activeImpacts]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, NewsEvent[]> = {};
    for (const event of filteredEvents) {
      const dateKey = new Date(event.date).toLocaleDateString(
        locale === "it" ? "it-IT" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      );
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    }
    return groups;
  }, [filteredEvents, locale]);

  const handleToggleNotifications = async () => {
    if (notifPrefs.enabled) {
      const updated = { ...notifPrefs, enabled: false };
      setNotifPrefs(updated);
      localStorage.setItem("fal_news_notification_prefs", JSON.stringify(updated));
      return;
    }

    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const updated = { ...notifPrefs, enabled: true };
        setNotifPrefs(updated);
        localStorage.setItem("fal_news_notification_prefs", JSON.stringify(updated));
      }
    }
  };

  const handleMinutesChange = (minutes: number) => {
    const updated = { ...notifPrefs, minutesBefore: minutes };
    setNotifPrefs(updated);
    localStorage.setItem("fal_news_notification_prefs", JSON.stringify(updated));
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-surface-100">
            {t("news.title")}
          </h1>
          <p className="text-sm text-surface-400 mt-1">{t("news.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          className="btn-secondary touch-target shrink-0"
        >
          {notifPrefs.enabled ? (
            <Bell className="h-4 w-4 text-brand-400" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t("news.notifications")}</span>
        </button>
      </div>

      {showNotificationPanel && (
        <div className="card mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-100">
              {t("news.notificationSettings")}
            </h3>
            <button
              onClick={() => setShowNotificationPanel(false)}
              className="text-surface-400 hover:text-surface-100"
            >
              {showNotificationPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={handleToggleNotifications}
              className={cn(
                "btn-secondary",
                notifPrefs.enabled && "border-brand-500 text-brand-400"
              )}
            >
              {notifPrefs.enabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              {notifPrefs.enabled
                ? t("news.notificationsEnabled")
                : t("news.enableNotifications")}
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-surface-400">
                {t("news.notifyBefore")}
              </label>
              <select
                value={notifPrefs.minutesBefore}
                onChange={(e) => handleMinutesChange(Number(e.target.value))}
                className="input-field w-auto"
                disabled={!notifPrefs.enabled}
              >
                {NOTIFY_OPTIONS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} {t("news.minutes")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-surface-400" />
          <span className="text-sm font-medium text-surface-300">
            {t("news.filters")}
          </span>
        </div>
        <div className="mb-3">
          <span className="text-xs text-surface-500 uppercase tracking-wide">
            {t("news.currency")}
          </span>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {CURRENCIES.map((currency) => (
              <button
                key={currency}
                onClick={() => toggleCurrency(currency)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeCurrencies.includes(currency)
                    ? "bg-brand-500 text-white"
                    : "bg-surface-700 text-surface-300 hover:bg-surface-600"
                )}
              >
                {currency}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-surface-500 uppercase tracking-wide">
            {t("news.impact")}
          </span>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {IMPACTS.map((impact) => (
              <button
                key={impact}
                onClick={() => toggleImpact(impact)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeImpacts.includes(impact)
                    ? impact === "High"
                      ? "bg-error-500 text-white"
                      : impact === "Medium"
                        ? "bg-warning-500 text-white"
                        : "bg-brand-500 text-white"
                    : "bg-surface-700 text-surface-300 hover:bg-surface-600"
                )}
              >
                {impact}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(groupedByDate).length === 0 ? (
        <div className="card text-center py-16">
          <Newspaper className="h-12 w-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-400">{t("news.noEvents")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([dateLabel, dayEvents]) => (
            <section key={dateLabel}>
              <h2 className="text-base sm:text-lg font-semibold text-surface-200 mb-3 sticky top-14 sm:top-0 bg-surface-950 py-2 z-10">
                {dateLabel}
              </h2>
              <div className="space-y-3">
                {dayEvents.map((event, idx) => (
                  <div
                    key={`${event.title}-${event.date}-${idx}`}
                    className="card animate-fade-in hover:border-surface-600 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-surface-100">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            {event.country}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(event.date, locale)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "badge flex-shrink-0",
                          impactClass(event.impact)
                        )}
                      >
                        {event.impact}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-surface-500">
                          {t("news.forecast")}:
                        </span>{" "}
                        <span className="text-surface-200">
                          {event.forecast || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-500">
                          {t("news.previous")}:
                        </span>{" "}
                        <span className="text-surface-200">
                          {event.previous || "-"}
                        </span>
                      </div>
                      {event.actual && (
                        <div>
                          <span className="text-surface-500">
                            {t("news.actual")}:
                          </span>{" "}
                          <span className="font-medium text-surface-100">
                            {event.actual}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
