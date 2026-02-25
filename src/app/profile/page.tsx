"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import type { CalendarSlot, Booking } from "@/lib/types";
import {
  User,
  CalendarDays,
  Save,
  Lock,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
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
  const { t, locale } = useI18n();
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingNotes, setBookingNotes] = useState<Record<string, string>>({});
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchSlots = useCallback(() => {
    setLoadingSlots(true);
    api
      .get<CalendarSlot[]>("/api/v1/calendar/slots")
      .then((data) => setSlots(data.filter((s) => !s.is_booked)))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, []);

  const fetchBookings = useCallback(() => {
    setLoadingBookings(true);
    api
      .get<Booking[]>("/api/v1/calendar/bookings/mine")
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, []);

  useEffect(() => {
    fetchSlots();
    fetchBookings();
  }, [fetchSlots, fetchBookings]);

  const handleBook = async (slotId: string) => {
    setBookingSlot(slotId);
    setMessage("");
    try {
      await api.post("/api/v1/calendar/bookings", {
        slot_id: slotId,
        notes: bookingNotes[slotId] || "",
      });
      setMessage(t("profile.bookingConfirmed"));
      fetchSlots();
      fetchBookings();
    } catch {
    } finally {
      setBookingSlot(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setMessage("");
    try {
      await api.delete(`/api/v1/calendar/bookings/${bookingId}`);
      setMessage(t("profile.bookingCancelled"));
      fetchSlots();
      fetchBookings();
    } catch {
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="flex items-center gap-2 text-sm text-success-400 bg-success-500/10 p-3 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-brand-400" />
          <h3 className="text-base font-semibold text-surface-100">{t("profile.availableSlots")}</h3>
        </div>
        {loadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <div className="flex items-center gap-3 text-surface-400 py-4">
            <Clock className="h-5 w-5" />
            <p className="text-sm">{t("profile.noSlots")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-900 border border-surface-700"
              >
                <div>
                  <p className="text-sm font-medium text-surface-100">
                    {formatDate(slot.start_time, locale)}
                  </p>
                  <p className="text-xs text-surface-400">
                    {formatTime(slot.start_time, locale)} - {formatTime(slot.end_time, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("profile.notes")}
                    value={bookingNotes[slot.id] || ""}
                    onChange={(e) =>
                      setBookingNotes((prev) => ({ ...prev, [slot.id]: e.target.value }))
                    }
                    className="input-field text-xs py-1.5 w-40"
                  />
                  <button
                    onClick={() => handleBook(slot.id)}
                    disabled={bookingSlot === slot.id}
                    className="btn-primary text-xs py-1.5"
                  >
                    {bookingSlot === slot.id ? (
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {t("profile.book")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-brand-400" />
          <h3 className="text-base font-semibold text-surface-100">{t("profile.myBookings")}</h3>
        </div>
        {loadingBookings ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex items-center gap-3 text-surface-400 py-4">
            <Clock className="h-5 w-5" />
            <p className="text-sm">{t("profile.noBookings")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-900 border border-surface-700"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-100">
                      {formatDate(booking.start_time, locale)}
                    </p>
                    <span
                      className={
                        booking.status === "confirmed"
                          ? "badge-success"
                          : "badge-error"
                      }
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400">
                    {formatTime(booking.start_time, locale)} - {formatTime(booking.end_time, locale)}
                  </p>
                  {booking.notes && (
                    <p className="text-xs text-surface-500 mt-1">{booking.notes}</p>
                  )}
                </div>
                {booking.status === "confirmed" && (
                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    className="btn-ghost text-error-400 hover:text-error-300 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("common.cancel")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
