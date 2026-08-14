export function mixColor(hex: string, amount: number, blendWith: 'white' | 'black'): string {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = num >> 16;
  let g = (num >> 8) & 0x00FF;
  let b = num & 0x0000FF;

  const blend = blendWith === 'white' ? 255 : 0;
  r = Math.round(r + (blend - r) * amount);
  g = Math.round(g + (blend - g) * amount);
  b = Math.round(b + (blend - b) * amount);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export type ThemeColors = Record<keyof typeof import('./index').colors, string>;

/**
 * Dynamically generates all primary shade variations based on a single brand hex color,
 * while keeping all the neutral/semantic colors (ink, surface, warning, danger) static.
 */
export function generateDynamicTheme(baseColors: ThemeColors, primaryHex: string | undefined): ThemeColors {
  if (!primaryHex) return baseColors;

  return {
    ...baseColors,
    primary: primaryHex,
    primaryDark: mixColor(primaryHex, 0.2, 'black'),
    primaryDarker: mixColor(primaryHex, 0.4, 'black'),
    primarySoft: mixColor(primaryHex, 0.85, 'white'),
    primarySoftBorder: mixColor(primaryHex, 0.7, 'white'),
    primaryTintedBg: mixColor(primaryHex, 0.95, 'white'),
    primaryOnDark: mixColor(primaryHex, 0.4, 'white'),
  };
}
