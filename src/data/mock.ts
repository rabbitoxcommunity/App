/**
 * Mock catalogue standing in for `GET /categories` and `GET /products` until the
 * Node/Express + MongoDB backend is wired up. The shapes here are the contract
 * the API is expected to honour — see `src/data/types.ts`.
 *
 * Content mirrors the Claude Design handoff so screens can be compared 1:1 with
 * the mockups.
 */
import type { Category, Product, ProductVariant, VariantAxis } from './types';

/** Simple products still get exactly one variant, so the cart is uniform. */
function single(
  id: string,
  price: number,
  barcode: string,
  stock: ProductVariant['stock'] = 'available',
  extra: Partial<ProductVariant> = {},
): ProductVariant[] {
  return [{ id: `${id}-default`, optionIds: {}, price, barcode, stock, ...extra }];
}

export const CATEGORIES: Category[] = [
  {
    id: 'fruits-veg',
    name: { en: 'Fruits & Veg', ar: 'فواكه وخضار' },
    image: require('../../assets/categories/fruits-veg.jpg'),
    icon: 'cat-fruits',
    subcategories: [
      { id: 'fresh-fruit', name: { en: 'Fresh fruit', ar: 'فواكه طازجة' }, count: 34 },
      { id: 'fresh-veg', name: { en: 'Fresh vegetables', ar: 'خضار طازجة' }, count: 41 },
      { id: 'herbs', name: { en: 'Herbs & salads', ar: 'أعشاب وسلطات' }, count: 12 },
    ],
  },
  {
    id: 'dairy-eggs',
    name: { en: 'Dairy & Eggs', ar: 'حليب وبيض' },
    image: require('../../assets/categories/dairy-eggs.jpg'),
    icon: 'cat-dairy',
    subcategories: [
      { id: 'milk', name: { en: 'Milk & laban', ar: 'حليب ولبن' }, count: 22 },
      { id: 'cheese', name: { en: 'Cheese', ar: 'أجبان' }, count: 28 },
      { id: 'eggs', name: { en: 'Eggs', ar: 'بيض' }, count: 9 },
      { id: 'yoghurt', name: { en: 'Yoghurt', ar: 'زبادي' }, count: 17 },
    ],
  },
  {
    id: 'bakery',
    name: { en: 'Bakery', ar: 'مخبوزات' },
    image: require('../../assets/categories/bakery.jpg'),
    icon: 'cat-bakery',
    subcategories: [
      { id: 'bread', name: { en: 'Bread', ar: 'خبز' }, count: 19 },
      { id: 'pastry', name: { en: 'Pastries', ar: 'معجنات' }, count: 14 },
    ],
  },
  {
    id: 'beverages',
    name: { en: 'Beverages', ar: 'مشروبات' },
    image: require('../../assets/categories/beverages.jpg'),
    icon: 'cat-beverages',
    subcategories: [
      { id: 'water', name: { en: 'Water', ar: 'مياه' }, count: 24 },
      { id: 'juices', name: { en: 'Juices', ar: 'عصائر' }, count: 18 },
      { id: 'energy', name: { en: 'Energy drinks', ar: 'مشروبات طاقة' }, count: 12 },
      { id: 'tea-coffee', name: { en: 'Tea & coffee', ar: 'شاي وقهوة' }, count: 30 },
    ],
  },
  {
    id: 'snacks',
    name: { en: 'Snacks', ar: 'وجبات خفيفة' },
    image: require('../../assets/categories/snacks.jpg'),
    icon: 'cat-snacks',
    subcategories: [
      { id: 'chips', name: { en: 'Chips & crisps', ar: 'رقائق' }, count: 26 },
      { id: 'chocolate', name: { en: 'Chocolate', ar: 'شوكولاتة' }, count: 33 },
    ],
  },
  {
    id: 'meat-fish',
    name: { en: 'Meat & Fish', ar: 'لحوم وأسماك' },
    image: require('../../assets/categories/meat-fish.jpg'),
    icon: 'cat-meat',
    subcategories: [
      { id: 'poultry', name: { en: 'Poultry', ar: 'دواجن' }, count: 15 },
      { id: 'red-meat', name: { en: 'Red meat', ar: 'لحوم حمراء' }, count: 18 },
      { id: 'seafood', name: { en: 'Seafood', ar: 'مأكولات بحرية' }, count: 11 },
    ],
  },
  {
    id: 'household',
    name: { en: 'Household', ar: 'مستلزمات منزلية' },
    image: require('../../assets/categories/household.jpg'),
    icon: 'cat-household',
    subcategories: [
      { id: 'cleaning', name: { en: 'Cleaning', ar: 'تنظيف' }, count: 29 },
      { id: 'paper', name: { en: 'Paper goods', ar: 'ورقيات' }, count: 13 },
    ],
  },
  {
    id: 'baby-care',
    name: { en: 'Baby Care', ar: 'مستلزمات الأطفال' },
    image: require('../../assets/categories/baby-care.jpg'),
    icon: 'cat-baby',
    subcategories: [
      { id: 'diapers', name: { en: 'Diapers', ar: 'حفاضات' }, count: 16 },
      { id: 'baby-food', name: { en: 'Baby food', ar: 'طعام الأطفال' }, count: 21 },
    ],
  },
];

/** Axes for the Vitalize energy drink — the design's variant showcase. */
const VITALIZE_AXES: VariantAxis[] = [
  {
    id: 'flavour',
    name: { en: 'Flavour', ar: 'النكهة' },
    options: [
      { id: 'original', name: { en: 'Original', ar: 'أصلي' } },
      { id: 'sugar-free', name: { en: 'Sugar-free', ar: 'بدون سكر' } },
      { id: 'watermelon', name: { en: 'Watermelon', ar: 'بطيخ' } },
      { id: 'tropical', name: { en: 'Tropical', ar: 'استوائي' } },
    ],
  },
  {
    id: 'size',
    name: { en: 'Size', ar: 'الحجم' },
    options: [
      { id: '250ml', name: { en: '250 ml', ar: '250 مل' } },
      { id: '355ml', name: { en: '355 ml', ar: '355 مل' } },
      { id: '4x250ml', name: { en: '4 × 250 ml', ar: '4 × 250 مل' } },
    ],
  },
];

/**
 * Vitalize SKUs. Prices come from the design (250 ml = 8.00 discounted from
 * 10.00, 355 ml = 11.00). The Tropical flavour and the 4-pack are out of stock,
 * which is what makes the disabled-variant states visible.
 */
const VITALIZE_VARIANTS: ProductVariant[] = (() => {
  const basePrice: Record<string, number> = { '250ml': 8.0, '355ml': 11.0, '4x250ml': 28.0 };
  const compareAt: Record<string, number | undefined> = { '250ml': 10.0 };
  const flavourSurcharge: Record<string, number> = {
    original: 0,
    'sugar-free': 0,
    watermelon: 0.5,
    tropical: 0.5,
  };

  const out: ProductVariant[] = [];
  let barcode = 6291000100010;

  for (const flavour of VITALIZE_AXES[0].options) {
    for (const size of VITALIZE_AXES[1].options) {
      const unavailable = flavour.id === 'tropical' || size.id === '4x250ml';
      const low = flavour.id === 'watermelon' && size.id === '355ml';
      out.push({
        id: `vitalize-${flavour.id}-${size.id}`,
        optionIds: { flavour: flavour.id, size: size.id },
        price: +(basePrice[size.id] + flavourSurcharge[flavour.id]).toFixed(2),
        compareAtPrice: compareAt[size.id],
        barcode: String(barcode++),
        stock: unavailable ? 'out' : low ? 'low' : 'available',
        lowStockCount: low ? 4 : undefined,
      });
    }
  }
  return out;
})();

export const PRODUCTS: Product[] = [
  // ---------- Beverages (matches screen 03 in the design) ----------
  {
    id: 'mineral-water',
    categoryId: 'beverages',
    subcategoryId: 'water',
    name: { en: 'Mineral Water', ar: 'مياه معدنية' },
    subtitle: { en: '1.5 L × 6 pack', ar: '1.5 لتر × 6' },
    description: {
      en: 'Low-mineral bottled drinking water sourced in the UAE.',
      ar: 'مياه شرب معبأة منخفضة المعادن من مصادر في الإمارات.',
    },
    shelf: { en: 'Beverages · Ambient', ar: 'مشروبات · رف عادي' },
    icon: 'p-water',
    axes: [],
    variants: single('mineral-water', 9.75, '6291000200011'),
    defaultVariantId: 'mineral-water-default',
    popularity: 96,
    createdAt: '2025-11-02',
  },
  {
    id: 'orange-juice',
    categoryId: 'beverages',
    subcategoryId: 'juices',
    name: { en: 'Orange Juice', ar: 'عصير برتقال' },
    subtitle: { en: '1 L carton', ar: 'عبوة 1 لتر' },
    description: {
      en: 'Not-from-concentrate chilled orange juice, no added sugar.',
      ar: 'عصير برتقال مبرّد غير مركّز، بدون سكر مضاف.',
    },
    shelf: { en: 'Beverages · Chilled shelf', ar: 'مشروبات · رف المبردات' },
    icon: 'p-juice',
    axes: [],
    variants: single('orange-juice', 14.5, '6291000200028', 'low', { lowStockCount: 3 }),
    defaultVariantId: 'orange-juice-default',
    popularity: 88,
    createdAt: '2026-01-14',
  },
  {
    id: 'vitalize-energy',
    categoryId: 'beverages',
    subcategoryId: 'energy',
    name: { en: 'Vitalize Energy Drink', ar: 'مشروب طاقة فيتالايز' },
    subtitle: { en: '4 flavours · 250 / 355 ml', ar: '4 نكهات · 250 / 355 مل' },
    description: {
      en: 'Chilled carbonated energy drink with B-vitamins and caffeine. Best served cold.',
      ar: 'مشروب طاقة غازي مبرّد مع فيتامينات B والكافيين. يُفضّل تقديمه باردًا.',
    },
    shelf: { en: 'Beverages · Chilled shelf', ar: 'مشروبات · رف المبردات' },
    icon: 'p-energy',
    axes: VITALIZE_AXES,
    variants: VITALIZE_VARIANTS,
    defaultVariantId: 'vitalize-original-250ml',
    popularity: 94,
    createdAt: '2026-03-01',
  },
  {
    id: 'lemon-iced-tea',
    categoryId: 'beverages',
    subcategoryId: 'tea-coffee',
    name: { en: 'Lemon Iced Tea', ar: 'شاي مثلج بالليمون' },
    subtitle: { en: '330 ml × 4', ar: '330 مل × 4' },
    shelf: { en: 'Beverages · Ambient', ar: 'مشروبات · رف عادي' },
    icon: 'p-tea',
    axes: [],
    variants: single('lemon-iced-tea', 12.0, '6291000200035', 'out'),
    defaultVariantId: 'lemon-iced-tea-default',
    popularity: 61,
    createdAt: '2025-08-19',
  },
  {
    id: 'cola',
    categoryId: 'beverages',
    subcategoryId: 'juices',
    name: { en: 'Cola Soft Drink', ar: 'مشروب كولا' },
    subtitle: { en: '330 ml × 6 cans', ar: '330 مل × 6' },
    shelf: { en: 'Beverages · Ambient', ar: 'مشروبات · رف عادي' },
    icon: 'p-cola',
    axes: [],
    variants: single('cola', 13.25, '6291000200042'),
    defaultVariantId: 'cola-default',
    popularity: 91,
    createdAt: '2025-06-05',
  },
  {
    id: 'fresh-laban',
    categoryId: 'beverages',
    subcategoryId: 'water',
    name: { en: 'Fresh Laban', ar: 'لبن طازج' },
    subtitle: { en: '1 L bottle', ar: 'عبوة 1 لتر' },
    shelf: { en: 'Beverages · Chilled shelf', ar: 'مشروبات · رف المبردات' },
    icon: 'p-milk',
    axes: [],
    variants: single('fresh-laban', 7.5, '6291000200059'),
    defaultVariantId: 'fresh-laban-default',
    popularity: 79,
    createdAt: '2026-02-08',
  },
  {
    id: 'apple-juice',
    categoryId: 'beverages',
    subcategoryId: 'juices',
    name: { en: 'Apple Juice', ar: 'عصير تفاح' },
    subtitle: { en: '1 L carton', ar: 'عبوة 1 لتر' },
    shelf: { en: 'Beverages · Chilled shelf', ar: 'مشروبات · رف المبردات' },
    icon: 'p-juice',
    axes: [],
    variants: single('apple-juice', 12.0, '6291000200066'),
    defaultVariantId: 'apple-juice-default',
    popularity: 74,
    createdAt: '2026-04-22',
  },

  // ---------- Popular on Home ----------
  {
    id: 'bananas',
    categoryId: 'fruits-veg',
    subcategoryId: 'fresh-fruit',
    name: { en: 'Bananas', ar: 'موز' },
    subtitle: { en: '1 kg bunch', ar: 'حزمة 1 كجم' },
    description: {
      en: 'Sweet Cavendish bananas, ripened for eating today.',
      ar: 'موز كافنديش حلو، ناضج وجاهز للأكل اليوم.',
    },
    shelf: { en: 'Fruits & Veg · Fresh', ar: 'فواكه وخضار · طازج' },
    icon: 'p-banana',
    axes: [],
    variants: single('bananas', 6.5, '6291000300017'),
    defaultVariantId: 'bananas-default',
    popularity: 99,
    createdAt: '2026-05-01',
  },
  {
    id: 'fresh-milk',
    categoryId: 'dairy-eggs',
    subcategoryId: 'milk',
    name: { en: 'Fresh Milk', ar: 'حليب طازج' },
    subtitle: { en: '2 L bottle', ar: 'عبوة 2 لتر' },
    description: {
      en: 'Full-fat pasteurised cow milk. Keep refrigerated.',
      ar: 'حليب بقري مبستر كامل الدسم. يُحفظ مبردًا.',
    },
    shelf: { en: 'Dairy & Eggs · Chilled shelf', ar: 'حليب وبيض · رف المبردات' },
    icon: 'p-milk',
    axes: [],
    variants: single('fresh-milk', 11.0, '6291000400014'),
    defaultVariantId: 'fresh-milk-default',
    popularity: 98,
    createdAt: '2026-04-11',
  },
  {
    id: 'eggs',
    categoryId: 'dairy-eggs',
    subcategoryId: 'eggs',
    name: { en: 'Eggs', ar: 'بيض' },
    subtitle: { en: 'Tray of 30', ar: 'طبق 30 حبة' },
    shelf: { en: 'Dairy & Eggs · Chilled shelf', ar: 'حليب وبيض · رف المبردات' },
    icon: 'p-eggs',
    axes: [],
    variants: single('eggs', 17.25, '6291000400021'),
    defaultVariantId: 'eggs-default',
    popularity: 95,
    createdAt: '2026-03-18',
  },
  {
    id: 'arabic-bread',
    categoryId: 'bakery',
    subcategoryId: 'bread',
    name: { en: 'Arabic Bread', ar: 'خبز عربي' },
    subtitle: { en: 'Large · 5 pcs', ar: 'كبير · 5 أرغفة' },
    shelf: { en: 'Bakery · Baked today', ar: 'مخبوزات · خبز اليوم' },
    icon: 'p-bread',
    axes: [],
    variants: single('arabic-bread', 4.25, '6291000500011'),
    defaultVariantId: 'arabic-bread-default',
    popularity: 93,
    createdAt: '2026-05-20',
  },
];

/** Stands in for the customer's last order, used by Home's reorder card. */
export const LAST_BASKET = {
  itemCount: 12,
  total: 148.5,
  date: '2026-08-04',
  lines: [
    { productId: 'fresh-milk', variantId: 'fresh-milk-default', quantity: 2 },
    { productId: 'bananas', variantId: 'bananas-default', quantity: 1 },
    { productId: 'eggs', variantId: 'eggs-default', quantity: 1 },
    { productId: 'arabic-bread', variantId: 'arabic-bread-default', quantity: 3 },
  ],
};

export const DEFAULT_ADDRESS = {
  label: { en: 'Villa 24, Jumeirah 1', ar: 'فيلا 24، جميرا 1' },
};

/** Flat delivery fee and promo table until the backend owns them. */
export const DELIVERY_FEE = 5.0;
export const DELIVERY_ETA_MINUTES = 30;
export const PROMO_CODES: Record<string, { percentOff: number }> = {
  FRESH10: { percentOff: 10 },
};

