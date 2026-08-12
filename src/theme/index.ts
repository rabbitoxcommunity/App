/**
 * Design tokens lifted straight from the FreshCart Claude Design handoff
 * (`FreshCart App.dc.html`). Every screen reads from here — no raw hex in screens.
 */

export const colors = {
  /** Brand green. */
  primary: '#47BB1C',
  /** Pressed / darker brand green, used for text on tinted surfaces. */
  primaryDark: '#3A9614',
  primaryDarker: '#2F7D10',
  /** Tinted brand surface (category tiles, stock chips, selected variants). */
  primarySoft: '#EDF8E7',
  primarySoftBorder: '#C6E8B4',
  primaryTintedBg: '#F8FCF5',
  /** Bright green used on dark surfaces (toast actions). */
  primaryOnDark: '#7BD65A',

  ink: '#14181C',
  inkMuted: '#5C6469',
  textSecondary: '#7A8288',
  textTertiary: '#8A9196',
  placeholder: '#9AA1A6',
  disabled: '#B4BABE',
  disabledSoft: '#C3C8CB',

  surface: '#FFFFFF',
  surfaceMuted: '#F5F6F7',
  surfaceSubtle: '#F7F8F8',
  surfaceDisabled: '#FAFBFB',
  canvas: '#F1F3F2',

  border: '#E4E7E8',
  borderLight: '#EDEFF0',
  borderLighter: '#F2F4F4',
  borderDashed: '#D8DCDE',
  divider: '#F0F1F2',
  checkboxBorder: '#DDE1E3',
  chipDisabled: '#EEF0F1',

  warning: '#B57A05',
  warningInk: '#8A5C03',
  warningInkSoft: '#A6791F',
  warningSoft: '#FDF2DE',
  warningSoftBorder: '#F2D9A6',

  danger: '#C0392B',
  dangerInk: '#8F2B20',
  dangerInkSoft: '#A85A50',
  dangerSoft: '#FDECEC',
  dangerSoftBorder: '#F5C9C9',

  overlay: 'rgba(20, 24, 28, 0.45)',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255, 255, 255, 0.82)',
} as const;

export const radii = {
  xs: 7,
  sm: 9,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 22,
  '5xl': 28,
  sheet: 30,
  pill: 999,
} as const;

export const spacing = {
  /** Standard horizontal screen gutter across every screen in the design. */
  gutter: 20,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 26,
} as const;

export const fontSize = {
  micro: 10,
  tiny: 11,
  caption: 12,
  small: 13,
  body: 14,
  bodyLg: 15,
  base: 16,
  lg: 17,
  xl: 18,
  '2xl': 20,
  '3xl': 22,
  '4xl': 26,
  '5xl': 30,
  hero: 38,
} as const;

/**
 * The design uses Plus Jakarta Sans (LTR) and Cairo (RTL). Both are Google
 * fonts; until the .ttf files are bundled we fall back to the platform UI font,
 * which renders Arabic correctly on both iOS and Android. `fontWeight` values
 * below match the design's 600/700/800 usage.
 */
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const shadow = {
  /** Brand-green glow under primary CTAs. */
  primaryCta: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floatingBar: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  toast: {
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sheet: {
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: -14 },
    elevation: 20,
  },
} as const;

export const theme = { colors, radii, spacing, fontSize, weight, shadow };
export type Theme = typeof theme;
