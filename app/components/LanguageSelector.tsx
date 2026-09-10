'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { currentLang, setLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-md p-1 space-x-1 shadow-md">
      <button
        onClick={() => setLanguage('ne')}
        className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold transition ${
          currentLang === 'ne' ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:text-white'
        }`}
        title="नेपाली"
      >
        <span>🇳🇵</span>
        <span>नेपाली</span>
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold transition ${
          currentLang === 'en' ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:text-white'
        }`}
        title="English"
      >
        <span>🇺🇸</span>
        <span>ENG</span>
      </button>
    </div>
  );
};