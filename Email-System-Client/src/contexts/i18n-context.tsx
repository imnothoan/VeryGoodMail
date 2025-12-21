'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { vi, en, type Translations, type Language, languages } from '@/lib/i18n';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  languages: typeof languages;
}

const translations: Record<Language, Translations> = { vi, en };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'verygoodmail-language';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi');

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && (saved === 'vi' || saved === 'en')) {
      setLanguageState(saved);
    } else {
      // Auto-detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('vi')) {
        setLanguageState('vi');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  }, []);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    languages,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
