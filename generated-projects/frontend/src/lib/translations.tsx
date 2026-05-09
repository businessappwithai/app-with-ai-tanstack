"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import deMessages from "@/messages/de.json";
import enMessages from "@/messages/en.json";

const messages = {
  en: enMessages,
  de: deMessages,
} as const;

type TranslationMessages = typeof enMessages;

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof TranslationMessages | string, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function TranslationProvider({
  children,
  defaultLocale: initialLocale = "en",
}: TranslationProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Load locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored && (stored === "en" || stored === "de")) {
      setLocaleState(stored as Locale);
    }
  }, []);

  // Save locale to localStorage when it changes
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let message: any = messages[locale];

    for (const k of keys) {
      message = message?.[k];
    }

    if (typeof message !== "string") {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Replace parameters like {entity} with actual values
    if (params) {
      return message.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param]?.toString() || match;
      });
    }

    return message;
  };

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslations must be used within a TranslationProvider");
  }
  return context;
}

// Standalone translation function that can be used outside React components
// (e.g., in hooks, utility functions, etc.)
// Reads locale from localStorage for non-React contexts
export function translate(
  key: string,
  params?: Record<string, string | number>,
  localeOverride?: Locale
): string {
  // Get locale from override, localStorage, or default to 'en'
  let locale: Locale = "en";
  if (localeOverride) {
    locale = localeOverride;
  } else if (typeof window !== "undefined") {
    const stored = localStorage.getItem("locale");
    if (stored && (stored === "en" || stored === "de")) {
      locale = stored as Locale;
    }
  }

  const keys = key.split(".");
  let message: any = messages[locale];

  for (const k of keys) {
    message = message?.[k];
  }

  if (typeof message !== "string") {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  // Replace parameters like {entity} with actual values
  if (params) {
    return message.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param]?.toString() || match;
    });
  }

  return message;
}
