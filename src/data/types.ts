import type { IconName } from '../components/Icon';

/**
 * Stock is a three-state flag set by the shop — never a live count. The app only
 * reads and displays it. `lowStockCount` is an optional display hint ("Only 3
 * left") and must not be treated as authoritative inventory.
 */
export type StockStatus = 'available' | 'low' | 'out';

/** Every user-facing string from the API arrives in both languages. */
export type Localized = { en: string; ar: string };

/** One selectable option on a variant axis, e.g. "Sugar-free" or "355 ml". */
export type VariantOption = {
  id: string;
  name: Localized;
};

/** A dimension products vary along. FreshCart ships with `flavour` and `size`. */
export type VariantAxis = {
  id: string;
  name: Localized;
  options: VariantOption[];
};

/**
 * A concrete purchasable SKU. `optionIds` maps axis id → option id; a product
 * with no axes has exactly one variant with an empty map.
 */
export type ProductVariant = {
  id: string;
  optionIds: Record<string, string>;
  price: number;
  /** Struck-through "was" price, when the SKU is discounted. */
  compareAtPrice?: number;
  barcode: string;
  stock: StockStatus;
  lowStockCount?: number;
};

export type Product = {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  name: Localized;
  /** Pack description shown under the name — "1 kg bunch", "2 L bottle". */
  subtitle: Localized;
  description?: Localized;
  /** Breadcrumb shown on the product detail screen. */
  shelf?: Localized;
  imageUrl?: string;
  /** Placeholder glyph used until product photography is wired up. */
  icon: IconName;
  axes: VariantAxis[];
  variants: ProductVariant[];
  defaultVariantId: string;
  popularity: number;
  /** ISO date, used by the "Newest" sort. */
  createdAt: string;
};

export type Subcategory = {
  id: string;
  name: Localized;
  /** The backend doesn't maintain a live per-subcategory product count; screens compute it locally when they have the product list, and omit the badge otherwise. */
  count?: number;
};

export type Category = {
  id: string;
  name: Localized;
  /** CMS-managed tile photo URL. Absent until the shop uploads one — screens fall back to `icon`. */
  imageUrl?: string;
  /** Fallback glyph, drawn if there's no photo or it fails to decode. */
  icon: IconName;
  subcategories: Subcategory[];
};

export type CartLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

/** Matches the backend's own naming (BACKEND-DESIGN §8) — "pickup" only ever refers to the `ready_for_pickup` order status. */
export type FulfillmentType = 'delivery' | 'curbside';

/* ----------------------------------------------------------- Checkout data */

export type Address = {
  id: string;
  label: Localized;
  lines: Localized;
  phone?: string;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
};

export type PaymentMethodKind = 'card' | 'credit' | 'cash';

export type PaymentMethod = {
  id: string;
  kind: PaymentMethodKind;
  title: Localized;
  subtitle?: Localized;
  /** Only rendered for customers the shop has approved for credit. */
  requiresCreditApproval?: boolean;
};

/** The tenant's single branch (A1: single-branch-per-tenant) — the curbside pickup point, read from `GET /config`. */
export type Store = {
  name: Localized;
  details: Localized;
  address: Localized;
  phone: string;
  baysFree: number;
};

export type CarProfile = {
  plate: string;
  colour: Localized;
  colourHex: string;
  bodyType: 'sedan' | 'suv' | 'pickup' | 'coupe';
};

/* -------------------------------------------------------------- Order data */

/**
 * The two fulfillment flows have different milestone chains, per the brief:
 * delivery is placed → packed → out_for_delivery → delivered, curbside is
 * placed → packed → ready_for_pickup → customer_arrived → handed_over.
 */
export type OrderStatus =
  | 'placed'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'ready_for_pickup'
  | 'customer_arrived'
  | 'handed_over'
  | 'cancelled';

export const DELIVERY_FLOW: OrderStatus[] = [
  'placed',
  'packed',
  'out_for_delivery',
  'delivered',
];

export const PICKUP_FLOW: OrderStatus[] = [
  'placed',
  'packed',
  'ready_for_pickup',
  'customer_arrived',
  'handed_over',
];

export const flowFor = (type: FulfillmentType): OrderStatus[] =>
  type === 'curbside' ? PICKUP_FLOW : DELIVERY_FLOW;

export type OrderEvent = {
  status: OrderStatus;
  /** ISO timestamp; absent for milestones that have not happened yet. */
  at?: string;
  note?: Localized;
};

export type OrderLine = {
  productId: string;
  variantId: string;
  quantity: number;
  /** Price captured at purchase time — the catalogue may change later. */
  unitPrice: number;
  name: Localized;
  variantLabel: Localized;
  icon: IconName;
};

export type Order = {
  id: string;
  reference: string;
  fulfillment: FulfillmentType;
  status: OrderStatus;
  placedAt: string;
  events: OrderEvent[];
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentKind: PaymentMethodKind;
  /** Handed to the rider at the door / to staff at the bay. */
  confirmationCode: string;
  rider?: { name: Localized; etaMinutes: number };
  estimatedAt?: string;
  /** Curbside only — captured at order creation; staff match the car in the bay against this. */
  car?: CarProfile;
  /** Curbside only — the customer's "on the way" / "near" ping, ahead of tapping "I've arrived". */
  arrival?: 'on_way' | 'near' | null;
  /** Curbside only — the bay number assigned once staff start packing. */
  bay?: number | null;
};

/* ------------------------------------------------------------- Credit data */

export type CreditEntryKind = 'charge' | 'payment';

export type CreditEntry = {
  id: string;
  kind: CreditEntryKind;
  title: Localized;
  subtitle: Localized;
  /** Positive for purchases, negative for payments. */
  amount: number;
  settled: boolean;
  at: string;
};

export type CreditAccount = {
  limit: number;
  balance: number;
  dueDate: string;
  entries: CreditEntry[];
};
