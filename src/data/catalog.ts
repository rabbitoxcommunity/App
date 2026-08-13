/**
 * Pure selectors over a product/variant — everything a screen needs to derive
 * that doesn't require the catalogue itself. Fetching and caching the
 * catalogue live in `store/CatalogContext`.
 */
import type { Language } from '../i18n';
import type { Localized, Product, ProductVariant, StockStatus } from './types';

export const t = (text: Localized, language: Language): string => text[language] ?? text.en;

export const getVariant = (
  product: Product,
  variantId: string,
): ProductVariant | undefined => product.variants.find((v) => v.id === variantId);

export const hasVariants = (product: Product): boolean => product.axes.length > 0;

export const isPurchasable = (stock: StockStatus): boolean => stock !== 'out';

/**
 * A product tile shows the *product's* stock, which is the best status across
 * its SKUs: a drink is still buyable when one flavour has sold out.
 */
export function productStock(product: Product): StockStatus {
  if (product.variants.some((v) => v.stock === 'available')) return 'available';
  if (product.variants.some((v) => v.stock === 'low')) return 'low';
  return 'out';
}

/** Cheapest in-stock price, falling back to the cheapest overall when sold out. */
export function displayPrice(product: Product): { min: number; max: number; ranged: boolean } {
  const sellable = product.variants.filter((v) => isPurchasable(v.stock));
  const pool = sellable.length > 0 ? sellable : product.variants;
  const prices = pool.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, ranged: min !== max };
}

/** The variant a listing tap should preselect: the default if it can be bought. */
export function defaultVariant(product: Product): ProductVariant {
  const preferred = getVariant(product, product.defaultVariantId);
  if (preferred && isPurchasable(preferred.stock)) return preferred;
  return product.variants.find((v) => isPurchasable(v.stock)) ?? product.variants[0];
}

export function findVariantByOptions(
  product: Product,
  optionIds: Record<string, string>,
): ProductVariant | undefined {
  return product.variants.find((variant) =>
    product.axes.every((axis) => variant.optionIds[axis.id] === optionIds[axis.id]),
  );
}

/**
 * Stock for one option on one axis, holding the other axes at the current
 * selection — this is what greys out "Tropical" when every Tropical size is out.
 */
export function optionStock(
  product: Product,
  axisId: string,
  optionId: string,
  selection: Record<string, string>,
): StockStatus {
  const matches = product.variants.filter((variant) => {
    if (variant.optionIds[axisId] !== optionId) return false;
    return product.axes.every(
      (axis) => axis.id === axisId || variant.optionIds[axis.id] === selection[axis.id],
    );
  });
  if (matches.some((v) => v.stock === 'available')) return 'available';
  if (matches.some((v) => v.stock === 'low')) return 'low';
  return 'out';
}

/** Cheapest price for an option, used by the size cards which show a price. */
export function optionPrice(
  product: Product,
  axisId: string,
  optionId: string,
  selection: Record<string, string>,
): number | undefined {
  const matches = product.variants.filter((variant) => {
    if (variant.optionIds[axisId] !== optionId) return false;
    return product.axes.every(
      (axis) => axis.id === axisId || variant.optionIds[axis.id] === selection[axis.id],
    );
  });
  if (matches.length === 0) return undefined;
  return Math.min(...matches.map((v) => v.price));
}

/**
 * Human label for a chosen SKU — "Original · 250 ml". Falls back to the
 * product's pack subtitle for single-variant products.
 */
export function variantLabel(
  product: Product,
  variant: ProductVariant,
  language: Language,
): string {
  if (!hasVariants(product)) return t(product.subtitle, language);
  return product.axes
    .map((axis) => axis.options.find((o) => o.id === variant.optionIds[axis.id]))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map((o) => t(o.name, language))
    .join(' · ');
}

