import { displayPrice, isPurchasable, productStock } from './catalog';
import type { Product } from './types';

export const SORT_KEYS = ['popular', 'priceAsc', 'newest', 'discount'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type FilterState = {
  sort: SortKey;
  subcategoryIds: string[];
  minPrice: number;
  /**
   * null means NO upper limit.
   *
   * This used to default to PRICE_BOUNDS.max (50), which silently price-filtered
   * the catalogue before the customer touched anything — 158 published products
   * priced above AED 50, including every phone, were unreachable because the
   * slider could not go past its own ceiling. Storing "unbounded" explicitly
   * also means raising the ceiling later cannot resurrect the bug.
   */
  maxPrice: number | null;
  inStockOnly: boolean;
};

/**
 * Fallback slider bounds only, used before the tenant's real range has loaded.
 * The live ceiling comes from `/config`'s priceRange, derived from what the shop
 * actually sells — a hardcoded one drifts the moment they stock something dearer.
 */
export const PRICE_BOUNDS = { min: 0, max: 50 } as const;

export const defaultFilters = (): FilterState => ({
  sort: 'popular',
  subcategoryIds: [],
  minPrice: PRICE_BOUNDS.min,
  maxPrice: null,
  inStockOnly: true,
});

export const isDefaultFilters = (f: FilterState): boolean => {
  const d = defaultFilters();
  return (
    f.sort === d.sort &&
    f.subcategoryIds.length === 0 &&
    f.minPrice === d.minPrice &&
    f.maxPrice === d.maxPrice &&
    f.inStockOnly === d.inStockOnly
  );
};

/** Number of active filters, shown as the badge on the Filters chip. */
export const activeFilterCount = (f: FilterState): number => {
  const d = defaultFilters();
  let count = f.subcategoryIds.length;
  if (f.minPrice !== d.minPrice || f.maxPrice !== d.maxPrice) count += 1;
  if (f.inStockOnly !== d.inStockOnly) count += 1;
  return count;
};

const discountOf = (product: Product): number => {
  const best = product.variants.reduce((max, v) => {
    if (!v.compareAtPrice || v.compareAtPrice <= v.price) return max;
    return Math.max(max, 1 - v.price / v.compareAtPrice);
  }, 0);
  return best;
};

export function applyFilters(products: Product[], filters: FilterState): Product[] {
  const filtered = products.filter((product) => {
    if (filters.inStockOnly && !isPurchasable(productStock(product))) return false;
    if (
      filters.subcategoryIds.length > 0 &&
      (!product.subcategoryId || !filters.subcategoryIds.includes(product.subcategoryId))
    ) {
      return false;
    }
    const { min } = displayPrice(product);
    if (min < filters.minPrice) return false;
    return filters.maxPrice == null || min <= filters.maxPrice;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case 'priceAsc':
      sorted.sort((a, b) => displayPrice(a).min - displayPrice(b).min);
      break;
    case 'newest':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case 'discount':
      sorted.sort((a, b) => discountOf(b) - discountOf(a));
      break;
    case 'popular':
    default:
      sorted.sort((a, b) => b.popularity - a.popularity);
  }
  return sorted;
}
