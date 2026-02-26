import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, locale: string = "en") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: string | Date | null | undefined, locale: string = "en") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locale === "it" ? "it-IT" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: string | Date | null | undefined, locale: string = "en") {
  if (!date) return "—";
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPnl(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function getInitials(firstName?: string | null, lastName?: string | null, username?: string) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }
  return "??";
}

export function timeAgo(date: string | Date | null | undefined, locale: string = "en") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals: [number, string, string][] = [
    [31536000, "year", "anno"],
    [2592000, "month", "mese"],
    [86400, "day", "giorno"],
    [3600, "hour", "ora"],
    [60, "minute", "minuto"],
  ];

  for (const [secs, en, it] of intervals) {
    const interval = Math.floor(seconds / secs);
    if (interval >= 1) {
      const unit = locale === "it" ? it : en;
      const suffix = locale === "it" ? " fa" : " ago";
      const plural = interval > 1 ? (locale === "it" ? "i" : "s") : "";
      return `${interval} ${unit}${plural}${suffix}`;
    }
  }
  return locale === "it" ? "ora" : "now";
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
