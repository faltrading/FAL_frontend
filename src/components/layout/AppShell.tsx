"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PUBLIC_ROUTES = ["/login", "/register", "/privacy", "/terms", "/offline"];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!user && !loading) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <main className="pt-14 lg:ml-60">
        <div className="p-3 sm:p-4 safe-bottom">{children}</div>
      </main>
    </div>
  );
}
