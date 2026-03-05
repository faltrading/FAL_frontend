"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Phone,
  User as UserIcon,
  Users,
  Image,
  Calculator,
  BarChart3,
  Newspaper,
  Globe,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/chat", icon: MessageSquare, label: t("nav.chat") },
    { href: "/calls", icon: Phone, label: t("nav.calls") },
    ...(!isAdmin
      ? [{ href: "/profile", icon: UserIcon, label: t("nav.profile") }]
      : []),
    ...(isAdmin
      ? [{ href: "/users", icon: Users, label: t("nav.users") }]
      : []),
    { href: "/gallery", icon: Image, label: t("nav.gallery") },
    { href: "/calculator", icon: Calculator, label: t("nav.calculator") },
    { href: "/journal", icon: BarChart3, label: t("nav.journal") },
    { href: "/news", icon: Newspaper, label: t("nav.news") },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-surface-900 border-r border-surface-700">
      <div className="flex h-14 items-center px-4">
        <span className="text-xl font-bold text-brand-400">FAL Trading</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-target",
                isActive
                  ? "bg-surface-700 text-brand-400"
                  : "text-surface-400 hover:text-surface-100 hover:bg-surface-800"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-700 p-4 space-y-2">
        <button
          onClick={() => setLocale(locale === "en" ? "it" : "en")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors touch-target"
        >
          <Globe className="h-5 w-5" />
          {locale === "en" ? "EN" : "IT"}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-error-400 hover:bg-surface-800 transition-colors touch-target"
        >
          <LogOut className="h-5 w-5" />
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-40 w-60">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
