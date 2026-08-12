# FreshCart — customer app

Expo / React Native app for FreshCart, a grocery home-delivery service for a
single Dubai supermarket. Built from the Claude Design handoff
(`FreshCart App.dc.html`, 25 screens, EN + AR RTL).

```bash
npm install
npx expo start          # then press i / a, or scan with Expo Go
npx tsc --noEmit        # typecheck
```

Sign in with any 9-digit UAE mobile number and the code **4747**.

## Screens

Every screen in the handoff is built. There is **one implementation per screen**,
not a mirrored pair: the layout flips from `start`/`end` styles, so the Arabic
RTL counterparts in the design are the same components under `I18nManager`.

| # | Screen | Where |
| --- | --- | --- |
| 00 | Splash | `SplashScreen` (shown while i18n + session restore) |
| 01 | Login & OTP | `LoginScreen` |
| 02 | Home | `HomeScreen` |
| 03 | Category listing | `CategoryListingScreen` |
| 03b | Filter & sort | `FilterSheet` |
| 03c | Toast messages | `ToastGalleryScreen` |
| 04 | Product detail & variants | `ProductDetailScreen` |
| 05 | Cart | `CartScreen` |
| 06 | Checkout | `CheckoutScreen` |
| 06b | Delivery slot picker | `SlotPickerSheet` |
| 06c | Checkout · curbside | `CheckoutScreen` (fulfillment toggle) |
| 07 | Order tracking | `OrderTrackingScreen` |
| 08 | My Credit / My Tab | `MyCreditScreen` |
| 09 | Order history | `OrdersScreen` |
| 10 | Account | `AccountScreen` |
| 10b | Language switch | `LanguageSheet` |
| — | Categories (tab) | `CategoriesScreen` |

Screens 06 and 06c are one component because the design shows the same screen
with the fulfillment toggle flipped; the sections below it swap accordingly.
The toast gallery (03c) is a design/QA reference rather than a customer
destination, so its Account row only appears in development builds.

### Additions beyond the handoff

- **Google / Apple sign-in** on Login, and a "send by WhatsApp" option. The
  design doesn't draw these; the brief requires them.
- **Categories tab**, which the design's tab bar links to but never draws.

## Motion

`src/components/motion.tsx` holds the animation primitives — all built on the
`Animated` API with `useNativeDriver` wherever the property allows, so the app
carries no extra animation dependency.

| Primitive | Used for |
| --- | --- |
| `PressableScale` | every button, card and chip dips under the finger |
| `FadeSlideIn` | staggered entrance for lists, addresses, timeline steps |
| `Bump` | cart badge on quantity change, tab glyph on focus |
| `AnimatedNumber` | cart and credit totals count to their new value |
| `AnimatedBar` | credit balance fills on the My Credit card |
| `AnimatedConnector` | order-tracking timeline draws itself downward |
| `Pulse` | breathing halo on the live tracking milestone |
| `CrossFade` | product price when a variant is selected |
| `Skeleton` | shimmering placeholders for loading states |

Plus: `BottomSheet` springs up behind a fading backdrop and is dismissible by
dragging the handle; toasts slide in and can be swiped away; stack transitions
use `slide_from_right` (which mirrors under RTL) with `slide_from_bottom` for
order tracking, since arriving there is a completion rather than a push.

## Architecture

```
App.tsx                     bootstrap: i18n → layout direction → providers
src/
  api/          client.ts   fetch wrapper for the Node/Express backend (unused yet)
                auth.ts     OTP / social sign-in — mock implementations
  components/   Icon.tsx    Material Symbols → @expo/vector-icons name map
                ui.tsx      Screen, AppHeader, PrimaryButton, EmptyState, …
                motion.tsx  animation primitives (table above)
                BottomSheet / SelectRow / RangeSlider / Toast / ProductCard / …
  data/         types.ts    Product, Variant, Order, CreditEntry, …
                mock.ts     catalogue mirroring the design content
                orders.ts   addresses, slots, stores, orders, credit ledger
                catalog.ts  pure selectors (pricing, stock, variant matching)
                filters.ts  filter + sort logic for the listing
  hooks/        useLang, useAddToCart
  i18n/         index.ts, LocaleProvider.tsx, locales/{en,ar}.json
  navigation/   RootNavigator (auth-gated stack), TabNavigator
  screens/      one file per screen
  store/        AuthContext, CartContext, OrdersContext
  theme/        design tokens lifted from the handoff
  utils/        format.ts (money, dates, countdown), rtl.ts
```

### Bilingual + RTL

- All UI copy lives in `src/i18n/locales/*.json`, including plural forms
  (English `one`/`other`, Arabic `zero`/`one`/`two`/`few`/`many`/`other`).
- Product and order data carry both languages as `{ en, ar }` and are read
  through `t(field, language)` from `src/data/catalog.ts` — the backend is
  expected to return `name_en` / `name_ar` and map to this shape.
- Layout mirrors via `I18nManager`. **Styles use `start`/`end`, never
  `left`/`right`.** The one deliberate exception is `RangeSlider`, where the
  numeric axis stays low-to-high left-to-right so the drag gesture keeps
  matching the labels.
- Direction changes need a restart on native (`I18nManager.forceRTL` only
  applies to the next bundle load) but not on web, where the flag is read at
  render time and a reload would in fact discard it. `src/utils/rtl.ts` owns
  that difference; the reload after switching to Arabic is expected behaviour.

### Products, variants and stock

- Every product has a `variants` array. Simple products have exactly one variant
  with no options; multi-variant products (e.g. Vitalize Energy) declare `axes`
  (flavour, size) and one SKU per combination, each with its own price, barcode
  and stock flag.
- Listings show one card per **parent** product with a `From AED …` price and a
  small tune badge on the add button; tapping it opens the detail screen, which
  is where a SKU is chosen. Cart lines and order lines both store the specific
  `variantId` and its label.
- Stock is the three-state flag `available | low | out`, set by the shop. There
  is no live POS integration and no quantity tracking. Out-of-stock products
  render greyed with a disabled add button and a "Notify me" affordance;
  `CartContext.addItem` refuses out-of-stock variants regardless of caller.

### Fulfillment

`OrdersContext` models the two chains from the brief and never mixes them:

- **Home delivery** — placed → packed → out for delivery → delivered.
- **Curbside** — placed → packed → ready for pickup → customer arrived → handed
  over, with no delivery fee. The store cannot advance past *ready for pickup*
  until the customer taps "I have arrived", so `advance()` stops there and only
  `markArrived()` moves it on.

Checkout and tracking both branch on `order.fulfillment`: checkout swaps the
address/time block for the store/car/arrival block, and tracking swaps the rider
card for the store card and renders the five-step chain.

### Credit / My Tab

`OrdersContext` also owns the credit ledger. Placing an order paid with credit
writes a `purchase` entry and raises the balance in the same action, so the
customer's tab and the shop owner's record are the same list — that shared
source of truth is the point of the feature. "Pay Later (Credit)" appears at
checkout only for `creditApproved` customers, and is disabled when the order
exceeds the remaining headroom.

## Backend integration

Nothing calls the network yet. `src/api/client.ts` holds the fetch wrapper,
bearer-token handling and `API_BASE_URL` (set via `expo.extra.apiBaseUrl` in
`app.json`). To go live, replace the bodies in `src/api/*.ts` with `request(...)`
calls and swap `src/data/mock.ts` / `orders.ts` for API modules — the selectors
in `catalog.ts` and every screen work unchanged as long as the API returns the
shapes in `src/data/types.ts`.

## Known gaps

- Product photography: `ProductImage` renders a tinted glyph placeholder until
  `imageUrl` is populated. The same applies to rider and account avatars.
- Search, notifications and the address picker are non-functional affordances.
- Address add/edit, "Help & support" and receipts raise a toast rather than
  opening a screen — none of these are drawn in the handoff.
- Fonts: the design specifies Plus Jakarta Sans / Cairo. The app currently uses
  the platform UI font (which renders Arabic correctly); bundle the two families
  with `expo-font` to match the handoff exactly.
- Order progression is simulated on a timer so tracking visibly moves in the
  demo; the real app will get status from the backend.
