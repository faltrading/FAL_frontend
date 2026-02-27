"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDate, getInitials } from "@/lib/utils";
import type { CalendarSlot, Booking, Call, JoinCallResponse } from "@/lib/types";
import { LessonCalendar, type CalendarEvent } from "@/components/calendar/LessonCalendar";
import {
  User,
  CalendarDays,
  Save,
  Lock,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

function ProfileTab() {
  const { user, refreshUser, logout } = useAuth();
  const { t, locale } = useI18n();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [gdprMessage, setGdprMessage] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhoneNumber(user.phone_number || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      await api.put("/api/v1/users/me", {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      });
      await refreshUser();
      setProfileMessage(t("profile.profileUpdated"));
    } catch {
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordSaving(true);
    setPasswordMessage("");
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage(t("profile.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
    } catch {
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    setGdprMessage("");
    try {
      const data = await api.get<unknown>("/api/v1/users/gdpr/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setGdprMessage(t("profile.dataExported"));
    } catch {
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      await api.post("/api/v1/users/gdpr/delete", { password: deletePassword });
      await logout();
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
            <span className="text-brand-400 text-xl font-semibold">
              {getInitials(user?.first_name, user?.last_name, user?.username)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-100">{user?.username}</h2>
            <p className="text-sm text-surface-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-brand">{user?.role}</span>
              <span className="text-xs text-surface-500">
                {t("profile.memberSince")} {user?.created_at ? formatDate(user.created_at, locale) : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <button
          onClick={() => setShowEditProfile(!showEditProfile)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-semibold text-surface-100">{t("profile.editProfile")}</h3>
          </div>
          {showEditProfile ? (
            <ChevronUp className="h-4 w-4 text-surface-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-surface-400" />
          )}
        </button>
        {showEditProfile && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">{t("profile.firstName")}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">{t("profile.lastName")}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">{t("profile.phoneNumber")}</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field"
              />
            </div>
            {profileMessage && (
              <div className="flex items-center gap-2 text-sm text-success-400">
                <CheckCircle className="h-4 w-4" />
                {profileMessage}
              </div>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="btn-primary"
            >
              {profileSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("common.save")}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-brand-400" />
          <h3 className="text-base font-semibold text-surface-100">{t("profile.changePassword")}</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">{t("profile.currentPassword")}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">{t("profile.newPassword")}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
            />
          </div>
          {passwordMessage && (
            <div className="flex items-center gap-2 text-sm text-success-400">
              <CheckCircle className="h-4 w-4" />
              {passwordMessage}
            </div>
          )}
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving || !currentPassword || !newPassword}
            className="btn-primary"
          >
            {passwordSaving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {t("profile.changePassword")}
          </button>
        </div>
      </div>

      <div className="card border-error-600/30">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-error-400" />
          <h3 className="text-base font-semibold text-surface-100">{t("profile.gdpr")}</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportData}
              disabled={exportingData}
              className="btn-secondary"
            >
              {exportingData ? (
                <div className="h-4 w-4 border-2 border-surface-100 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("profile.exportData")}
            </button>
          </div>
          {gdprMessage && (
            <div className="flex items-center gap-2 text-sm text-success-400">
              <CheckCircle className="h-4 w-4" />
              {gdprMessage}
            </div>
          )}
          <div className="border-t border-surface-700 pt-4">
            <button
              onClick={() => setShowDeleteSection(!showDeleteSection)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-error-400" />
                <span className="text-sm font-medium text-error-400">{t("profile.deleteAccount")}</span>
              </div>
              {showDeleteSection ? (
                <ChevronUp className="h-4 w-4 text-surface-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-surface-400" />
              )}
            </button>
            {showDeleteSection && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-warning-400 bg-warning-500/10 p-3 rounded-lg">
                  {t("profile.deleteWarning")}
                </p>
                <div>
                  <label className="label">{t("profile.confirmDelete")}</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword}
                  className="btn-danger"
                >
                  {deleting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {t("profile.deleteAccount")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarTab() {
  const { t } = useI18n();
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<CalendarSlot[]>("/api/v1/calendar/slots").catch(() => [] as CalendarSlot[]),
      api.get<Booking[]>("/api/v1/calendar/bookings/mine").catch(() => [] as Booking[]),
      api.get<{ calls: Call[] }>("/api/v1/calls/rooms").then(
        (r) => (Array.isArray(r) ? r : r.calls ?? []) as Call[],
      ).catch(() => [] as Call[]),
    ])
      .then(([slotsData, bookingsData, callsData]) => {
        setSlots(slotsData);
        setBookings(bookingsData);
        setCalls(callsData);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build calendar events from slots + bookings + calls
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];

    // User's bookings
    const bookedSlotIds = new Set(
      bookings.filter((b) => b.status === "confirmed").map((b) => b.slot_id)
    );

    for (const b of bookings) {
      events.push({
        id: `booking-${b.id}`,
        start: b.start_time,
        end: b.end_time,
        type: b.status === "confirmed" ? "my-booking" : "cancelled",
        bookingId: b.id,
        slotId: b.slot_id,
        notes: b.notes,
      });
    }

    // Available slots (not booked by this user)
    for (const s of slots) {
      if (!s.is_booked && !bookedSlotIds.has(s.id)) {
        events.push({
          id: `slot-${s.id}`,
          start: s.start_time,
          end: s.end_time,
          type: "available",
          slotId: s.id,
        });
      }
    }

    // Active calls
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
  }, [slots, bookings, calls]);

  const handleBookSlot = async (ev: CalendarEvent, notes: string) => {
    setMessage("");
    try {
      await api.post("/api/v1/calendar/bookings", {
        slot_id: ev.slotId,
        notes: notes || "",
      });
      setMessage(t("profile.bookingConfirmed"));
      fetchData();
    } catch {
      /* handled by api */
    }
  };

  const handleCancelBooking = async (ev: CalendarEvent) => {
    setMessage("");
    try {
      await api.delete(`/api/v1/calendar/bookings/${ev.bookingId}`);
      setMessage(t("profile.bookingCancelled"));
      fetchData();
    } catch {
      /* handled by api */
    }
  };

  const handleJoinCall = async (ev: CalendarEvent) => {
    if (!ev.callId) return;
    try {
      const data = await api.post<JoinCallResponse>(`/api/v1/calls/rooms/${ev.callId}/join`);
      const url = data.jitsi_room_url || `https://${data.jitsi_domain}/${data.jitsi_room}`;
      window.open(url, "_blank");
    } catch {
      /* handled by api */
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="flex items-center gap-2 text-sm text-success-400 bg-success-500/10 p-3 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      <LessonCalendar
        events={calendarEvents}
        loading={loading}
        onBookSlot={handleBookSlot}
        onCancelBooking={handleCancelBooking}
        onJoinCall={handleJoinCall}
      />
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"profile" | "calendar">("profile");

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "profile" as const, label: t("profile.profile"), icon: User },
    { key: "calendar" as const, label: t("profile.calendar"), icon: CalendarDays },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-surface-100 mb-6">{t("profile.title")}</h1>

      <div className="flex gap-1 mb-6 border-b border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-surface-400 hover:text-surface-200"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "calendar" && <CalendarTab />}
    </div>
  );
}
