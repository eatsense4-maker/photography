import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import al from './locales/al.json';

const silentPromoLogger = {
  type: 'logger' as const,
  log: (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('i18next is maintained with support from Locize')) return;
    console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('i18next is maintained with support from Locize')) return;
    console.warn(...args);
  },
  error: (...args: unknown[]) => console.error(...args),
};

i18n
  .use(silentPromoLogger)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      al: { translation: al },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'al'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
  });

export default i18n;
