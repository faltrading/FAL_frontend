"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Phone,
  User as UserIcon,
  Users,
  Image,
  Calculator,
  BarChart3,
  Newspaper,
  CalendarDays,
  Wifi,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import type { Booking, NewsEvent, User } from "@/lib/types";

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const { t, locale } = useI18n();
  const [totalUsers, setTotalUsers] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);

  useEffect(() => {
    if (isAdmin) {
      api
        .get<User[]>("/api/v1/users/")
        .then((users) => setTotalUsers(users.length))
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    api
      .get<Booking[]>("/api/v1/calendar/bookings/mine")
      .then((data) => {
        const now = new Date();
        const upcoming = data
          .filter((b) => b.status === "confirmed" && new Date(b.start_time) > now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 3);
        setBookings(upcoming);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/proxy/news")
      .then((res) => res.json())
      .then((data: NewsEvent[]) => {
        const now = new Date();
        const highImpact = data
          .filter((e) => e.impact === "High" && new Date(e.date) > now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);
        setNews(highImpact);
      })
      .catch(() => {});
  }, []);

  const quickActions = [
    { href: "/chat", icon: MessageSquare, label: t("nav.chat") },
    { href: "/calls", icon: Phone, label: t("nav.calls") },
    { href: isAdmin ? "/users" : "/profile", icon: isAdmin ? Users : UserIcon, label: isAdmin ? t("nav.users") : t("nav.profile") },
    { href: "/gallery", icon: Image, label: t("nav.gallery") },
    { href: "/calculator", icon: Calculator, label: t("nav.calculator") },
    { href: "/journal", icon: BarChart3, label: t("nav.journal") },
    { href: "/news", icon: Newspaper, label: t("nav.news") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card">
        <h1 className="text-2xl font-bold text-surface-100">
          {t("home.welcome")}, {user?.username}
        </h1>
      </div>

      {isAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-surface-200 mb-3">{t("home.platformStats")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="card animate-fade-in">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-brand-400" />
                <div>
                  <p className="text-sm text-surface-400">{t("home.totalUsers")}</p>
                  <p className="text-2xl font-bold text-surface-100">{totalUsers}</p>
                </div>
              </div>
            </div>
            <div className="card animate-fade-in">
              <div className="flex items-center gap-3">
                <Wifi className="h-8 w-8 text-success-400" />
                <div>
                  <p className="text-sm text-surface-400">{t("home.activeConnections")}</p>
                  <p className="text-2xl font-bold text-surface-100">-</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">{t("home.quickActions")}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="card hover:bg-surface-700 transition-colors animate-fade-in">
              <div className="flex flex-col items-center gap-2 py-2">
                <action.icon className="h-8 w-8 text-brand-400" />
                <span className="text-sm font-medium text-surface-200">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">{t("home.upcomingBookings")}</h2>
        {bookings.length === 0 ? (
          <div className="card animate-fade-in">
            <div className="flex items-center gap-3 text-surface-400">
              <CalendarDays className="h-5 w-5" />
              <p className="text-sm">{t("home.noBookings")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="card animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-brand-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-100">
                        {formatDate(booking.start_time, locale)}
                      </p>
                      <p className="text-xs text-surface-400">
                        {formatTime(booking.start_time, locale)} - {formatTime(booking.end_time, locale)}
                      </p>
                    </div>
                  </div>
                  {booking.notes && (
                    <p className="text-xs text-surface-400 truncate max-w-[120px] sm:max-w-[200px] hidden sm:block">{booking.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">{t("home.upcomingNews")}</h2>
        {news.length === 0 ? (
          <div className="card animate-fade-in">
            <div className="flex items-center gap-3 text-surface-400">
              <Globe className="h-5 w-5" />
              <p className="text-sm">{t("home.noNews")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((event, idx) => (
              <div key={idx} className="card animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-error-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-100">{event.title}</p>
                      <p className="text-xs text-surface-400">
                        {formatDate(event.date, locale)} {formatTime(event.date, locale)} - {event.country}
                      </p>
                    </div>
                  </div>
                  <span className="badge-error">{event.impact}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
