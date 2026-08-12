/**
 * Mock checkout, order and credit data. Mirrors the content of screens 06–09 of
 * the Claude Design handoff and stands in for the backend's `/addresses`,
 * `/slots`, `/orders` and `/credit` endpoints.
 */
import type {
  Address,
  CarProfile,
  CreditAccount,
  DeliverySlot,
  Order,
  PaymentMethod,
  PickupStore,
} from './types';

export const ADDRESSES: Address[] = [
  {
    id: 'addr-home',
    label: { en: 'Home · Villa 24', ar: 'المنزل · فيلا 24' },
    lines: {
      en: 'Street 7B, Jumeirah 1, Dubai',
      ar: 'شارع 7B، جميرا 1، دبي',
    },
    phone: '+971 50 214 8873',
    isPrimary: true,
  },
  {
    id: 'addr-office',
    label: { en: 'Office · Bay Square 6', ar: 'المكتب · باي سكوير 6' },
    lines: { en: 'Level 3, Business Bay, Dubai', ar: 'الطابق 3، الخليج التجاري، دبي' },
    isPrimary: false,
  },
  {
    id: 'addr-mum',
    label: { en: "Mum's place · Al Barsha 2", ar: 'بيت الوالدة · البرشاء 2' },
    lines: { en: 'Villa 8, Street 21, Dubai', ar: 'فيلا 8، شارع 21، دبي' },
    isPrimary: false,
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pay-card',
    kind: 'card',
    title: { en: 'Visa •••• 4218', ar: 'فيزا •••• 4218' },
    subtitle: { en: 'Expires 12/28', ar: 'تنتهي 12/28' },
  },
  {
    id: 'pay-credit',
    kind: 'credit',
    title: { en: 'Pay Later (Credit)', ar: 'الدفع لاحقًا (على الحساب)' },
    // Subtitle is generated at render time from the live credit balance.
    requiresCreditApproval: true,
  },
  {
    id: 'pay-cash',
    kind: 'cash',
    title: { en: 'Cash on delivery', ar: 'الدفع نقدًا عند التسليم' },
  },
];

export const PICKUP_STORES: PickupStore[] = [
  {
    id: 'store-jumeirah',
    name: { en: 'FreshCart Jumeirah 1', ar: 'فريش كارت جميرا 1' },
    details: {
      en: 'Street 7B · 1.2 km away · open till 11 PM',
      ar: 'شارع 7B · على بُعد 1.2 كم · مفتوح حتى 11 مساءً',
    },
    baysFree: 4,
  },
];

export const DEFAULT_CAR: CarProfile = {
  plate: 'Dubai · K 48219',
  colour: { en: 'Black', ar: 'أسود' },
  colourHex: '#14181C',
  bodyType: 'sedan',
};

/**
 * Ordered by how common the colour is on the road, so the usual answer is the
 * first thing in the picker. The staff member matching a car in a bay needs the
 * colour the customer would actually say out loud, not a paint code — so this
 * stays a short named list rather than a full colour wheel.
 */
export const CAR_COLOURS: { hex: string; name: { en: string; ar: string } }[] = [
  { hex: '#FFFFFF', name: { en: 'White', ar: 'أبيض' } },
  { hex: '#14181C', name: { en: 'Black', ar: 'أسود' } },
  { hex: '#9AA1A6', name: { en: 'Silver', ar: 'فضي' } },
  { hex: '#5A6169', name: { en: 'Grey', ar: 'رمادي' } },
  { hex: '#C0392B', name: { en: 'Red', ar: 'أحمر' } },
  { hex: '#2C5AA0', name: { en: 'Blue', ar: 'أزرق' } },
  { hex: '#F2C10D', name: { en: 'Yellow', ar: 'أصفر' } },
  { hex: '#E2711D', name: { en: 'Orange', ar: 'برتقالي' } },
  { hex: '#1E7A3C', name: { en: 'Green', ar: 'أخضر' } },
  { hex: '#6B4A2F', name: { en: 'Brown', ar: 'بني' } },
  { hex: '#C9A227', name: { en: 'Gold', ar: 'ذهبي' } },
];

/** Four bookable days starting today, matching the design's date strip. */
export function slotDays(from = new Date()): string[] {
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const SLOT_TEMPLATE: Omit<DeliverySlot, 'id' | 'date'>[] = [
  {
    label: { en: '6:00 – 7:00 PM', ar: '6:00 – 7:00 مساءً' },
    note: { en: 'Recommended', ar: 'موصى به' },
    fee: 5,
    slotsLeft: 4,
    recommended: true,
  },
  {
    label: { en: '7:00 – 8:00 PM', ar: '7:00 – 8:00 مساءً' },
    fee: 5,
    slotsLeft: 9,
  },
  {
    label: { en: '8:00 – 9:00 PM', ar: '8:00 – 9:00 مساءً' },
    note: { en: 'Off-peak · free delivery', ar: 'خارج الذروة · توصيل مجاني' },
    fee: 0,
    slotsLeft: 6,
  },
  {
    label: { en: '9:00 – 10:00 PM', ar: '9:00 – 10:00 مساءً' },
    slotsLeft: 0,
  },
];

export function slotsForDate(date: string): DeliverySlot[] {
  return SLOT_TEMPLATE.map((slot, index) => ({
    ...slot,
    id: `${date}-slot-${index}`,
    date,
  }));
}

/** Past orders shown on the Order history screen. */
export const PAST_ORDERS: Order[] = [
  {
    id: 'ord-2790',
    reference: 'FC-2790',
    fulfillment: 'delivery',
    status: 'delivered',
    placedAt: '2026-08-06T17:40:00.000Z',
    events: [],
    lines: [
      {
        productId: 'fresh-milk',
        variantId: 'fresh-milk-default',
        quantity: 2,
        unitPrice: 11,
        name: { en: 'Fresh Milk', ar: 'حليب طازج' },
        variantLabel: { en: '2 L bottle', ar: 'عبوة 2 لتر' },
        icon: 'p-milk',
      },
      {
        productId: 'bananas',
        variantId: 'bananas-default',
        quantity: 1,
        unitPrice: 6.5,
        name: { en: 'Bananas', ar: 'موز' },
        variantLabel: { en: '1 kg bunch', ar: 'حزمة 1 كجم' },
        icon: 'p-banana',
      },
      {
        productId: 'eggs',
        variantId: 'eggs-default',
        quantity: 1,
        unitPrice: 17.25,
        name: { en: 'Eggs', ar: 'بيض' },
        variantLabel: { en: 'Tray of 30', ar: 'طبق 30 حبة' },
        icon: 'p-eggs',
      },
      {
        productId: 'arabic-bread',
        variantId: 'arabic-bread-default',
        quantity: 8,
        unitPrice: 4.25,
        name: { en: 'Arabic Bread', ar: 'خبز عربي' },
        variantLabel: { en: 'Large · 5 pcs', ar: 'كبير · 5 أرغفة' },
        icon: 'p-bread',
      },
    ],
    // 2×11 + 6.50 + 17.25 + 8×4.25 = 79.75, + 5 delivery.
    subtotal: 79.75,
    deliveryFee: 5,
    discount: 0,
    total: 84.75,
    paymentKind: 'credit',
    confirmationCode: '7318',
    addressId: 'addr-home',
  },
  {
    id: 'ord-2744',
    reference: 'FC-2744',
    fulfillment: 'pickup',
    status: 'handed_over',
    placedAt: '2026-08-02T15:05:00.000Z',
    events: [],
    lines: [
      {
        productId: 'cola',
        variantId: 'cola-default',
        quantity: 2,
        unitPrice: 13.25,
        name: { en: 'Cola Soft Drink', ar: 'مشروب كولا' },
        variantLabel: { en: '330 ml × 6 cans', ar: '330 مل × 6' },
        icon: 'p-cola',
      },
      {
        productId: 'mineral-water',
        variantId: 'mineral-water-default',
        quantity: 3,
        unitPrice: 9.75,
        name: { en: 'Mineral Water', ar: 'مياه معدنية' },
        variantLabel: { en: '1.5 L × 6 pack', ar: '1.5 لتر × 6' },
        icon: 'p-water',
      },
      {
        productId: 'apple-juice',
        variantId: 'apple-juice-default',
        quantity: 2,
        unitPrice: 12,
        name: { en: 'Apple Juice', ar: 'عصير تفاح' },
        variantLabel: { en: '1 L carton', ar: 'عبوة 1 لتر' },
        icon: 'p-juice',
      },
    ],
    // 2×13.25 + 3×9.75 + 2×12 = 79.75; curbside carries no delivery fee.
    subtotal: 79.75,
    deliveryFee: 0,
    discount: 0,
    total: 79.75,
    paymentKind: 'credit',
    confirmationCode: '2094',
    storeId: 'store-jumeirah',
  },
  {
    id: 'ord-2701',
    reference: 'FC-2701',
    fulfillment: 'delivery',
    status: 'cancelled',
    placedAt: '2026-07-28T11:20:00.000Z',
    events: [],
    lines: [
      {
        productId: 'orange-juice',
        variantId: 'orange-juice-default',
        quantity: 1,
        unitPrice: 14.5,
        name: { en: 'Orange Juice', ar: 'عصير برتقال' },
        variantLabel: { en: '1 L carton', ar: 'عبوة 1 لتر' },
        icon: 'p-juice',
      },
      {
        productId: 'fresh-laban',
        variantId: 'fresh-laban-default',
        quantity: 1,
        unitPrice: 7.5,
        name: { en: 'Fresh Laban', ar: 'لبن طازج' },
        variantLabel: { en: '1 L bottle', ar: 'عبوة 1 لتر' },
        icon: 'p-milk',
      },
      {
        productId: 'bananas',
        variantId: 'bananas-default',
        quantity: 1,
        unitPrice: 2.75,
        name: { en: 'Bananas', ar: 'موز' },
        variantLabel: { en: '1 kg bunch', ar: 'حزمة 1 كجم' },
        icon: 'p-banana',
      },
    ],
    subtotal: 24.75,
    deliveryFee: 0,
    discount: 0,
    total: 24.75,
    paymentKind: 'card',
    confirmationCode: '0000',
    addressId: 'addr-home',
  },
];

/**
 * An order already in flight, so Order tracking has something live to show
 * before the customer places one of their own.
 */
export const ACTIVE_ORDER: Order = {
  id: 'ord-2841',
  reference: 'FC-2841',
  fulfillment: 'delivery',
  status: 'out_for_delivery',
  placedAt: '2026-08-11T05:12:00.000Z',
  events: [
    {
      status: 'placed',
      at: '2026-08-11T05:12:00.000Z',
      note: { en: 'Paid with credit', ar: 'على الحساب' },
    },
    {
      status: 'packed',
      at: '2026-08-11T05:24:00.000Z',
      note: { en: '4 items packed', ar: '4 منتجات' },
    },
    {
      status: 'out_for_delivery',
      at: '2026-08-11T05:31:00.000Z',
      note: { en: 'On the way to you', ar: 'خرج للتوصيل' },
    },
  ],
  lines: [
    {
      productId: 'fresh-milk',
      variantId: 'fresh-milk-default',
      quantity: 1,
      unitPrice: 11,
      name: { en: 'Fresh Milk', ar: 'حليب طازج' },
      variantLabel: { en: '2 L bottle', ar: 'عبوة 2 لتر' },
      icon: 'p-milk',
    },
    {
      productId: 'vitalize-energy',
      variantId: 'vitalize-original-250ml',
      quantity: 2,
      unitPrice: 8,
      name: { en: 'Vitalize Energy Drink', ar: 'مشروب طاقة فيتالايز' },
      variantLabel: { en: 'Original · 250 ml', ar: 'أصلي · 250 مل' },
      icon: 'p-energy',
    },
    {
      productId: 'bananas',
      variantId: 'bananas-default',
      quantity: 1,
      unitPrice: 6.5,
      name: { en: 'Bananas', ar: 'موز' },
      variantLabel: { en: '1 kg bunch', ar: 'حزمة 1 كجم' },
      icon: 'p-banana',
    },
    {
      productId: 'arabic-bread',
      variantId: 'arabic-bread-default',
      quantity: 1,
      unitPrice: 4.25,
      name: { en: 'Arabic Bread', ar: 'خبز عربي' },
      variantLabel: { en: 'Large · 5 pcs', ar: 'كبير · 5 أرغفة' },
      icon: 'p-bread',
    },
  ],
  subtotal: 37.75,
  deliveryFee: 5,
  discount: 3.75,
  total: 39,
  paymentKind: 'credit',
  confirmationCode: '4926',
  addressId: 'addr-home',
  rider: { name: { en: 'Adnan', ar: 'عدنان' }, etaMinutes: 12 },
  estimatedAt: '2026-08-11T05:53:00.000Z',
};

/**
 * The credit ledger. This is the customer's view of the same records the shop
 * owner sees — one shared source of truth, so the numbers must agree.
 */
export const CREDIT_ACCOUNT: CreditAccount = {
  limit: 1000,
  /** The three purchase entries below: 39 + 84.75 + 79.75. */
  balance: 203.5,
  dueDate: '2026-08-31',
  entries: [
    {
      id: 'cr-2841',
      kind: 'purchase',
      title: { en: 'Order #FC-2841', ar: 'الطلب FC-2841' },
      subtitle: { en: '11 Aug · 4 items', ar: '11 أغسطس · 4 منتجات' },
      amount: 39,
      settled: false,
      at: '2026-08-11T05:12:00.000Z',
    },
    {
      id: 'cr-pay-1',
      kind: 'payment',
      title: { en: 'Payment received', ar: 'تم استلام دفعة' },
      subtitle: { en: '8 Aug · Card •••• 4218', ar: '8 أغسطس · بطاقة •••• 4218' },
      amount: -200,
      settled: true,
      at: '2026-08-08T09:00:00.000Z',
    },
    {
      id: 'cr-2790',
      kind: 'purchase',
      title: { en: 'Order #FC-2790', ar: 'الطلب FC-2790' },
      subtitle: { en: '6 Aug · 12 items', ar: '6 أغسطس · 12 منتجًا' },
      amount: 84.75,
      settled: false,
      at: '2026-08-06T17:40:00.000Z',
    },
    {
      id: 'cr-2744',
      kind: 'purchase',
      title: { en: 'Order #FC-2744', ar: 'الطلب FC-2744' },
      subtitle: { en: '2 Aug · 7 items', ar: '2 أغسطس · 7 منتجات' },
      amount: 79.75,
      settled: true,
      at: '2026-08-02T15:05:00.000Z',
    },
  ],
};
