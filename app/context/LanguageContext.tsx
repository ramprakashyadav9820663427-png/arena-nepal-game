'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { translations, Language, Translation } from '@/lib/Translations';
type TranslationFunction = {
  (key: string): string;
} & Translation;

interface LanguageContextType {
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationFunction;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentLang, setCurrentLang] = useState<Language>('en');

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('arena_lang');

      if (savedLang === 'en' || savedLang === 'ne') {
        setCurrentLang(savedLang);
      }
    } catch (error) {
      console.error('Failed to load saved language:', error);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLang(lang);

    try {
      localStorage.setItem('arena_lang', lang);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const t = useMemo<TranslationFunction>(() => {
    const selectedTranslations =
      translations[currentLang] || translations.en;

    const translate = ((key: string): string => {
      const selectedValue = selectedTranslations[
        key as keyof Translation
      ];

      if (
        typeof selectedValue === 'string' &&
        selectedValue.length > 0
      ) {
        return selectedValue;
      }

      const fallbackValue = translations.en[
        key as keyof Translation
      ];

      if (
        typeof fallbackValue === 'string' &&
        fallbackValue.length > 0
      ) {
        return fallbackValue;
      }

      return key;
    }) as TranslationFunction;

    Object.assign(translate, selectedTranslations);

    return translate;
  }, [currentLang]);

  const contextValue = useMemo<LanguageContextType>(
    () => ({
      currentLang,
      setLanguage,
      t,
    }),
    [currentLang, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      'useLanguage must be used inside a LanguageProvider'
    );
  }

  return context;
}