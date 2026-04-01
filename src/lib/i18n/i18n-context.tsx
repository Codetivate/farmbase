'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { th, en, type Locale, type Translations } from './translations';

const localeMap: Record<Locale, Translations> = { th, en };

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'th',
  t: th,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th');

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('farmbase-locale', l);
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === 'th' ? 'en' : 'th';
      if (typeof window !== 'undefined') {
        localStorage.setItem('farmbase-locale', next);
      }
      return next;
    });
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: localeMap[locale], setLocale, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useCropName(englishName: string): string {
  const { t } = useI18n();
  return t.cropNames[englishName] || englishName;
}
