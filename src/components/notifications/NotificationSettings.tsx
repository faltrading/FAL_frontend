"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Bell,
  BellOff,
  Newspaper,
  MessageSquare,
  Phone,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedOnDevice,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

export function NotificationSettings() {
  const { t } = useI18n();

  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    news_enabled: true,
    chat_enabled: true,
    calls_enabled: true,
  });

  const loadState = useCallback(async () => {
    try {
      const isSupported = await isPushSupported();
      setSupported(isSupported);
      if (!isSupported) {
        setLoading(false);
        return;
      }

      const perm = await getPermissionState();
      setPermission(perm);

      const isSub = await isSubscribedOnDevice();
      setSubscribed(isSub);

      if (isSub) {
        try {
          const savedPrefs = await getNotificationPreferences();
          setPrefs(savedPrefs);
        } catch {
          // Use defaults if backend fails
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleToggleSubscription = async () => {
    setToggling(true);
    setMessage(null);

    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setSubscribed(false);
          setMessage({ type: "success", text: t("notifications.disabledSuccess") });
        } else {
          setMessage({ type: "error", text: t("notifications.disabledError") });
        }
      } else {
        const ok = await subscribeToPush();
        if (ok) {
          setSubscribed(true);
          setMessage({ type: "success", text: t("notifications.enabledSuccess") });
          // Load preferences after subscribing
          try {
            const savedPrefs = await getNotificationPreferences();
            setPrefs(savedPrefs);
          } catch {
            // defaults
          }
        } else {
          const perm = await getPermissionState();
          setPermission(perm);
          if (perm === "denied") {
            setMessage({ type: "error", text: t("notifications.permissionDenied") });
          } else {
            setMessage({ type: "error", text: t("notifications.enabledError") });
          }
        }
      }
    } catch {
      setMessage({ type: "error", text: t("common.error") });
    } finally {
      setToggling(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    setSavingPrefs(true);
    setMessage(null);

    try {
      await updateNotificationPreferences(newPrefs);
      setMessage({ type: "success", text: t("notifications.preferencesSaved") });
    } catch {
      // Revert on failure
      setPrefs(prefs);
      setMessage({ type: "error", text: t("common.error") });
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-surface-400">
          <BellOff className="h-5 w-5" />
          <p className="text-sm">{t("notifications.notSupported")}</p>
        </div>
      </div>
    );
  }

  const prefItems: {
    key: keyof NotificationPreferences;
    icon: typeof Newspaper;
    label: string;
    description: string;
  }[] = [
    {
      key: "news_enabled",
      icon: Newspaper,
      label: t("notifications.newsLabel"),
      description: t("notifications.newsDescription"),
    },
    {
      key: "chat_enabled",
      icon: MessageSquare,
      label: t("notifications.chatLabel"),
      description: t("notifications.chatDescription"),
    },
    {
      key: "calls_enabled",
      icon: Phone,
      label: t("notifications.callsLabel"),
      description: t("notifications.callsDescription"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscribed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20">
                <Bell className="h-5 w-5 text-brand-400" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-700">
                <BellOff className="h-5 w-5 text-surface-400" />
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-surface-100">
                {t("notifications.pushNotifications")}
              </h3>
              <p className="text-sm text-surface-400">
                {subscribed
                  ? t("notifications.statusEnabled")
                  : t("notifications.statusDisabled")}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSubscription}
            disabled={toggling}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              subscribed ? "bg-brand-500" : "bg-surface-600"
            } ${toggling ? "opacity-50" : ""}`}
            role="switch"
            aria-checked={subscribed}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                subscribed ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {permission === "denied" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning-500/10 p-3 text-sm text-warning-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {t("notifications.permissionBlocked")}
          </div>
        )}
      </div>

      {/* Per-category toggles */}
      {subscribed && (
        <div className="card">
          <h3 className="text-base font-semibold text-surface-100 mb-4">
            {t("notifications.categories")}
          </h3>
          <div className="space-y-4">
            {prefItems.map(({ key, icon: Icon, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 text-surface-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-200">
                      {label}
                    </p>
                    <p className="text-xs text-surface-500 truncate">
                      {description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePref(key)}
                  disabled={savingPrefs}
                  className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    prefs[key] ? "bg-brand-500" : "bg-surface-600"
                  } ${savingPrefs ? "opacity-50" : ""}`}
                  role="switch"
                  aria-checked={prefs[key]}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      prefs[key] ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "bg-success-500/10 text-success-400"
              : "bg-error-500/10 text-error-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
