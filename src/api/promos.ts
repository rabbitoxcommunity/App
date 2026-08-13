import { api, toFils } from './client';

export type PromoValidation = { code: string; applied: boolean; reason?: string };

/** POST /promo/validate — a quick check before committing to `cart/price`; the real, authoritative check still happens there. */
export async function validatePromo(code: string, subtotalAed: number): Promise<PromoValidation> {
  return api.post<PromoValidation>('/promo/validate', { code, subtotal: toFils(subtotalAed) });
}
