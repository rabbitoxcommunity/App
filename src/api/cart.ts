import { api, fromFils } from './client';
import type { FulfillmentType } from '../data/types';

export type PricedLineDto = { variantId: string; quantity: number };

export type PricedCart = {
  lines: Array<{ variantId: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promo: { code: string | null; applied: boolean; reason?: string };
  unavailable: string[];
  minOrderReason: string | null;
  priceToken: string;
};

type RawPricedCart = Omit<PricedCart, 'lines' | 'subtotal' | 'deliveryFee' | 'discount' | 'total'> & {
  lines: Array<{ variantId: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
};

/** POST /cart/price — §8 THE PRICING ENGINE. Always re-run before showing a total the customer can act on. */
export async function priceCart(input: {
  lines: PricedLineDto[];
  promoCode?: string;
  fulfillment: FulfillmentType;
  addressId?: string;
}): Promise<PricedCart> {
  const raw = await api.post<RawPricedCart>('/cart/price', input);
  return {
    ...raw,
    lines: raw.lines.map((l) => ({ ...l, unitPrice: fromFils(l.unitPrice), lineTotal: fromFils(l.lineTotal) })),
    subtotal: fromFils(raw.subtotal),
    deliveryFee: fromFils(raw.deliveryFee),
    discount: fromFils(raw.discount),
    total: fromFils(raw.total),
  };
}
