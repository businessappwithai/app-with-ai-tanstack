import React, { type ReactNode, createContext, useContext } from 'react';

const translations = {
  en: {
    'common.dashboard': 'Dashboard',
    'common.logout': 'Logout',
    'common.login': 'Login',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Operation successful',
  },
};

interface TranslationContextType {
  t: (key: string) => string;
  locale: string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
  locale?: string;
}

export function TranslationProvider({ children, locale = 'en' }: TranslationProviderProps) {
  const t = (key: string): string => {
    const dict = translations[locale as keyof typeof translations] || translations.en;
    return (dict as Record<string, string>)[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ t, locale }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
}

export function translate(key: string, locale = 'en'): string {
  const dict = translations[locale as keyof typeof translations] || translations.en;
  return (dict as Record<string, string>)[key] || key;
}

export const useTranslations = useTranslation;
