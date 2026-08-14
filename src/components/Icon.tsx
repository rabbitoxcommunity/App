import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isLoaded } from 'expo-font';
import React from 'react';
import { I18nManager, Platform, StyleProp, Text, TextStyle } from 'react-native';
import { CODEPOINTS, type SymbolName } from './symbols';
import { useTheme } from "../store/ConfigContext";

/**
 * The design (`FreshCart App.dc.html`) is drawn with Material Symbols Rounded.
 * `@expo/vector-icons` ships Material *Icons* and Material *Community Icons*,
 * which are different drawings — so the real font is bundled instead (subsetted
 * to the glyphs the design actually uses, ~31 KB for both fills) and rendered
 * here by codepoint.
 *
 * The design varies the font's `FILL` axis. Variable-font axes are not settable
 * from React Native, so the two instances the design uses (`FILL 0`, `FILL 1`)
 * are bundled as separate static fonts and picked per icon.
 */

/** Font families registered in `App.tsx`. */
export const SYMBOL_FONTS = {
  outlined: 'MaterialSymbolsRounded-Fill0',
  filled: 'MaterialSymbolsRounded-Fill1',
} as const;

/** Semantic name (what screens reference) -> glyph name (what the design draws). */
const GLYPHS = {
  // Brand & navigation
  leaf: 'eco',
  home: 'home',
  'home-outline': 'home',
  categories: 'grid_view',
  cart: 'shopping_cart',
  'cart-outline': 'shopping_cart',
  orders: 'receipt_long',
  account: 'person',
  'account-outline': 'person',

  // Actions
  back: 'arrow_back',
  forward: 'arrow_forward',
  add: 'add',
  remove: 'remove',
  close: 'close',
  check: 'check',
  'check-circle': 'check_circle',
  search: 'search',
  tune: 'tune',
  sort: 'swap_vert',
  expand: 'expand_more',
  delete: 'delete',
  replay: 'replay',
  'add-to-cart': 'add_shopping_cart',
  bolt: 'bolt',
  favorite: 'favorite_border',

  // Checkout, tracking & account
  'delivery-scooter': 'delivery_dining',
  car: 'directions_car',
  storefront: 'storefront',
  parking: 'local_parking',
  card: 'credit_card',
  wallet: 'account_balance_wallet',
  cash: 'payments',
  info: 'info',
  'bell-active': 'notifications_active',
  call: 'call',
  truck: 'local_shipping',
  'arrow-in': 'south_west',
  shield: 'verified_user',
  support: 'headset_mic',
  chevron: 'chevron_right',
  receipt: 'receipt',
  calendar: 'calendar_month',
  handshake: 'handshake',

  // Status & meta
  location: 'location_on',
  notifications: 'notifications',
  lock: 'lock',
  error: 'error',
  schedule: 'schedule',
  basket: 'shopping_basket',
  promo: 'local_activity',
  inventory: 'inventory_2',
  offline: 'wifi_off',
  signal: 'signal_cellular_alt',
  wifi: 'wifi',
  battery: 'battery_full',
  language: 'language',

  // Category tiles — the glyph fallback behind the photo (see `CategoryImage`).
  'cat-fruits': 'nutrition',
  'cat-dairy': 'egg',
  'cat-bakery': 'bakery_dining',
  'cat-beverages': 'local_cafe',
  'cat-snacks': 'cookie',
  'cat-meat': 'kebab_dining',
  'cat-household': 'soap',
  'cat-baby': 'child_care',

  // Product placeholders, used until product photography is wired up.
  'p-water': 'water_drop',
  'p-juice': 'local_drink',
  'p-energy': 'bolt',
  'p-tea': 'emoji_food_beverage',
  'p-cola': 'local_drink',
  'p-milk': 'grocery',
  'p-banana': 'nutrition',
  'p-eggs': 'egg',
  'p-bread': 'bakery_dining',
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof GLYPHS;

/**
 * Names the design draws with `FILL 1`. Anything absent renders `FILL 0`, which
 * is also why the `-outline` twins exist: the tab bar shows the filled glyph for
 * the active tab and the outlined one otherwise.
 */
const FILLED: ReadonlySet<IconName> = new Set<IconName>([
  'leaf',
  'home',
  'categories',
  'cart',
  'orders',
  'account',
  'wallet',
  'bolt',
  'call',
  'delivery-scooter',
  'car',
  'truck',
  'location',
  'inventory',
  'replay',
  'basket',
  'storefront',
  'cat-fruits',
  'cat-dairy',
  'cat-bakery',
  'cat-beverages',
  'cat-snacks',
  'cat-meat',
  'cat-household',
  'cat-baby',
  'p-water',
  'p-juice',
  'p-energy',
  'p-tea',
  'p-cola',
  'p-milk',
  'p-banana',
  'p-eggs',
  'p-bread',
]);

/** Names whose meaning is directional and must mirror under RTL. */
const MIRRORED: ReadonlySet<IconName> = new Set<IconName>([
  'back',
  'forward',
  'chevron',
  'arrow-in',
  'truck',
  'delivery-scooter',
  'car',
]);

/**
 * Brand marks, which Material Symbols does not contain — these stay on Material
 * Community Icons.
 */
const BRAND = {
  google: 'google',
  apple: 'apple',
  whatsapp: 'whatsapp',
} as const;

export type BrandName = keyof typeof BRAND;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Overrides the design's default fill for this glyph. */
  filled?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 22, color, filled, style }: IconProps) {
    const { colors } = useTheme(); color = color ?? colors.ink;

  const glyph = GLYPHS[name];
  const isFilled = filled ?? FILLED.has(name);
  const family = isFilled ? SYMBOL_FONTS.filled : SYMBOL_FONTS.outlined;

  // The splash renders icons while the fonts are still registering. Drawing the
  // codepoint before then shows tofu, so it is held transparent instead — the
  // box keeps its size, so nothing reflows once the font lands.
  const ready = isLoaded(family);

  // `scaleX: -1` rather than swapping names, so a single call site stays correct
  // whichever direction the app is in.
  const mirror: StyleProp<TextStyle> =
    I18nManager.isRTL && MIRRORED.has(name) ? { transform: [{ scaleX: -1 }] } : null;

  return (
    <Text
      allowFontScaling={false}
      selectable={false}
      style={[
        {
          fontFamily: family,
          fontSize: size,
          // The glyphs are drawn on a square em box; matching the line height to
          // the size keeps them optically centred instead of sitting on a
          // text baseline.
          lineHeight: size,
          width: size,
          height: size,
          color: ready ? color : 'transparent',
          textAlign: 'center',
          ...Platform.select({ android: { includeFontPadding: false } }),
        },
        mirror,
        style,
      ]}
    >
      {String.fromCodePoint(CODEPOINTS[glyph])}
    </Text>
  );
}

/** Brand logos (Google, Apple, WhatsApp) for the social sign-in rows. */
export function BrandIcon({
  name,
  size = 22,
  color,
  style,
}: {
  name: BrandName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
    const { colors } = useTheme(); color = color ?? colors.ink;

  return <MaterialCommunityIcons name={BRAND[name]} size={size} color={color} style={style} />;
}
