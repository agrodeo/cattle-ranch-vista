import dayjs from 'dayjs';
import { SupportedLanguage } from '@/i18n';

// Currency defaults by language
const currencyDefaults = {
  es: 'ARS',
  en: 'USD',
  pt: 'BRL'
};

// Locale mapping for Intl API
const localeMap = {
  es: 'es-AR',
  en: 'en-US',
  pt: 'pt-BR'
};

/**
 * Format a number according to the specified language
 */
export function formatNumber(value: number, lang: SupportedLanguage = 'es', options?: Intl.NumberFormatOptions): string {
  const locale = localeMap[lang];
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency according to the specified language
 */
export function formatCurrency(
  value: number, 
  currency?: string, 
  lang: SupportedLanguage = 'es'
): string {
  const locale = localeMap[lang];
  const currencyCode = currency || currencyDefaults[lang];
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format date according to the specified language
 */
export function formatDate(
  date: Date | string | null, 
  lang: SupportedLanguage = 'es', 
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const locale = localeMap[lang];
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format relative time using dayjs (already locale-aware)
 */
export function formatRelative(date: Date | string | null, lang: SupportedLanguage = 'es'): string {
  if (!date) return '';
  
  const dateObj = dayjs(date);
  if (!dateObj.isValid()) return '';
  
  return dateObj.fromNow();
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string | null, 
  lang: SupportedLanguage = 'es'
): string {
  return formatDate(date, lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format short date (MM/DD/YYYY style)
 */
export function formatShortDate(
  date: Date | string | null, 
  lang: SupportedLanguage = 'es'
): string {
  return formatDate(date, lang, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number, 
  lang: SupportedLanguage = 'es',
  decimals: number = 1
): string {
  const locale = localeMap[lang];
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * Format weight with appropriate units
 */
export function formatWeight(
  value: number, 
  lang: SupportedLanguage = 'es',
  unit: 'kg' | 'lbs' = 'kg'
): string {
  const formattedNumber = formatNumber(value, lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  
  return `${formattedNumber} ${unit}`;
}

/**
 * Format area with appropriate units
 */
export function formatArea(
  value: number, 
  lang: SupportedLanguage = 'es',
  unit: 'ha' | 'acres' = 'ha'
): string {
  const formattedNumber = formatNumber(value, lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${formattedNumber} ${unit}`;
}