'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/lib/translations';

type Language = 'en' | 'ne';

interface LanguageContextType {
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  t: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLang] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('arena_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ne')) {
      setCurrentLang(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('arena_lang', lang);
  };

  // Helper translation function that supports both t.key and t('key')
  const translationsObj = translations[currentLang] || translations.en;
  
  const t = (key: string) => {
    return (translationsObj as any)[key] || (translations.en as any)[key] || key;
  };

  // Attach properties to function so t.appTitle also works if used anywhere
  Object.assign(t, translationsObj);

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}