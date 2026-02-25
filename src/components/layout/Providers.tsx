"use client";

import { useEffect, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "./AppShell";

function ServiceWorkerRegistrar({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ServiceWorkerRegistrar>
          <AppShell>{children}</AppShell>
        </ServiceWorkerRegistrar>
      </AuthProvider>
    </I18nProvider>
  );
}
