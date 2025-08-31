import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/pt-br';

// Translation files
import commonEs from './locales/es/common.json';
import menuEs from './locales/es/menu.json';
import animalsEs from './locales/es/animals.json';
import activitiesEs from './locales/es/activities.json';
import corralsEs from './locales/es/corrals.json';
import financeEs from './locales/es/finance.json';
import authEs from './locales/es/auth.json';
import errorsEs from './locales/es/errors.json';
import formsEs from './locales/es/forms.json';

import commonEn from './locales/en/common.json';
import menuEn from './locales/en/menu.json';
import animalsEn from './locales/en/animals.json';
import activitiesEn from './locales/en/activities.json';
import corralsEn from './locales/en/corrals.json';
import financeEn from './locales/en/finance.json';
import authEn from './locales/en/auth.json';
import errorsEn from './locales/en/errors.json';
import formsEn from './locales/en/forms.json';

import commonPt from './locales/pt/common.json';
import menuPt from './locales/pt/menu.json';
import animalsPt from './locales/pt/animals.json';
import activitiesPt from './locales/pt/activities.json';
import corralsPt from './locales/pt/corrals.json';
import financePt from './locales/pt/finance.json';
import authPt from './locales/pt/auth.json';
import errorsPt from './locales/pt/errors.json';
import formsPt from './locales/pt/forms.json';

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// Language to dayjs locale mapping
const dayjsLocaleMap = {
  es: 'es',
  en: 'en',
  pt: 'pt-br'
};

export type SupportedLanguage = 'es' | 'en' | 'pt';

export const supportedLanguages: SupportedLanguage[] = ['es', 'en', 'pt'];

// Helper function to set language and update dayjs locale
export const setLanguage = (lang: SupportedLanguage) => {
  i18n.changeLanguage(lang);
  dayjs.locale(dayjsLocaleMap[lang]);
  localStorage.setItem('agrodeo:lang', lang);
};

// Helper function to get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage || 'es';
};

const resources = {
  es: {
    common: commonEs,
    menu: menuEs,
    animals: animalsEs,
    activities: activitiesEs,
    corrals: corralsEs,
    finance: financeEs,
    auth: authEs,
    errors: errorsEs,
    forms: formsEs,
  },
  en: {
    common: commonEn,
    menu: menuEn,
    animals: animalsEn,
    activities: activitiesEn,
    corrals: corralsEn,
    finance: financeEn,
    auth: authEn,
    errors: errorsEn,
    forms: formsEn,
  },
  pt: {
    common: commonPt,
    menu: menuPt,
    animals: animalsPt,
    activities: activitiesPt,
    corrals: corralsPt,
    finance: financePt,
    auth: authPt,
    errors: errorsPt,
    forms: formsPt,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    defaultNS: 'common',
    ns: ['common', 'menu', 'animals', 'activities', 'corrals', 'finance', 'auth', 'errors', 'forms'],
    
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupLocalStorage: 'agrodeo:lang',
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng, ns, key) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${ns}:${key} for language: ${lng}`);
      }
    },
  });

// Set initial dayjs locale based on i18n language
const initialLang = i18n.language as SupportedLanguage;
if (supportedLanguages.includes(initialLang)) {
  dayjs.locale(dayjsLocaleMap[initialLang]);
}

export default i18n;