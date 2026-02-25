"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import en from "@/messages/en.json";
import it from "@/messages/it.json";

type Messages = Record<string, unknown>;

const messages: Record<string, Messages> = { en, it };

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fal_locale") || "en";
    }
    return "en";
  });

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem("fal_locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(messages[locale] || messages.en, key);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
