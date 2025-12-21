'use client';

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
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

// Helper to get initial language (for server/hydration)
function getDefaultLanguage(): Language {
  return 'vi';
}

// Helper to get language from localStorage (client-side)
function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return getDefaultLanguage();
  
  const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (saved && (saved === 'vi' || saved === 'en')) {
    return saved;
  }
  
  // Auto-detect browser language
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('vi') ? 'vi' : 'en';
}

// Custom subscribe for useSyncExternalStore
function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Use useSyncExternalStore to properly sync with localStorage
  const storedLanguage = useSyncExternalStore(
    subscribeToStorage,
    getStoredLanguage,
    getDefaultLanguage
  );
  
  const [language, setLanguageState] = useState<Language>(storedLanguage);

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
