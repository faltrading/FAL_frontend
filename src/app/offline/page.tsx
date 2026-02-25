"use client";

import { WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function OfflinePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center">
        <WifiOff className="mx-auto mb-4 text-surface-500" size={48} />
        <h1 className="text-2xl font-bold text-surface-100 mb-2">
          {t("offline.title")}
        </h1>
        <p className="text-surface-400 mb-6">
          {t("offline.message")}
        </p>
        <button
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          {t("offline.refresh")}
        </button>
      </div>
    </div>
  );
}
