import type { Language } from '../i18n';

/**
 * The design uses Western digits on both the English and Arabic screens
 * ("148.50 د.إ"), which matches everyday UAE usage — so we deliberately format
 * with `en-AE` regardless of language and let the translation string decide
 * where the currency sits.
 */
export const formatAmount = (value: number): string =>
  new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

/** "AED 12.00" in English, "12.00 د.إ" in Arabic. */
export const formatMoney = (value: number, language: Language): string =>
  language === 'ar' ? `${formatAmount(value)} د.إ` : `AED ${formatAmount(value)}`;

export const formatMoneyFrom = (value: number, language: Language): string =>
  language === 'ar' ? `من ${formatAmount(value)} د.إ` : `From AED ${formatAmount(value)}`;

/** mm:ss for the OTP resend timer. */
export const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatShortDate = (iso: string, language: Language): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
    day: 'numeric',
    month: 'long',
    numberingSystem: 'latn',
  }).format(date);
};
