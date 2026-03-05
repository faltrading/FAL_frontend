"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Bell, BellOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getInitials } from "@/lib/utils";
import { isPushSupported, isSubscribedOnDevice } from "@/lib/notifications";

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();
  const [pushActive, setPushActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = await isPushSupported();
      if (!supported || cancelled) return;
      const sub = await isSubscribedOnDevice();
      if (!cancelled) setPushActive(sub);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 z-30 flex h-14 items-center justify-between border-b border-surface-700 bg-surface-900/80 px-4 backdrop-blur lg:left-60">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/profile?tab=notifications"
          className="relative rounded-lg p-2 touch-target text-surface-400 hover:bg-surface-800 hover:text-surface-100"
          title={t("notifications.title")}
        >
          {pushActive ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </Link>

        <Link href="/profile" className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-800 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-medium text-brand-400">
            {user
              ? getInitials(user.first_name, user.last_name, user.username)
              : "??"}
          </div>
          <span className="hidden text-sm font-medium text-surface-200 sm:block">
            {user?.username}
          </span>
          {isAdmin && (
            <span className="badge-brand">{t("common.admin")}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
