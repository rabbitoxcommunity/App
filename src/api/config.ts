import { api, fromFils } from './client';
import type { Localized, Store } from '../data/types';

export type TenantConfig = {
  name: Localized;
  branding: { logoUrl: string | null; primaryHex: string; appIconUrl: string | null };
  locale: { defaultLanguage: 'en' | 'ar'; timezone: string };
  store: Store;
  settings: {
    currency: string;
    deliveryFee: number;
    deliveryEtaMinutes: number;
    minOrder: number | null;
    curbsideEnabled: boolean;
    creditEnabled: boolean;
    cashEnabled: boolean;
    carColours: { hex: string; name: Localized }[];
    carBodyTypes: Array<'sedan' | 'suv' | 'pickup' | 'coupe'>;
  };
  /** Real span of the shop's published prices, in AED — drives the filter slider. */
  priceRange: { min: number; max: number };
};

type RawConfig = {
  name: Localized;
  priceRange?: { min: number; max: number };
  branding: TenantConfig['branding'];
  locale: TenantConfig['locale'];
  store: { name: Localized; details: Localized; address: Localized; phone: string; baysFree: number };
  settings: {
    currency: string;
    deliveryFee: number;
    deliveryEtaMinutes: number;
    minOrder: number | null;
    curbsideEnabled: boolean;
    creditEnabled: boolean;
    cashEnabled: boolean;
    carColours: { hex: string; name: Localized }[];
    carBodyTypes: Array<'sedan' | 'suv' | 'pickup' | 'coupe'>;
  };
};

/** GET /config — public, no auth required. Every white-label build reads its own branding, fees and flags from here. */
export async function getConfig(): Promise<TenantConfig> {
  const raw = await api.get<RawConfig>('/config', { skipAuth: true });
  return {
    ...raw,
    settings: {
      ...raw.settings,
      deliveryFee: fromFils(raw.settings.deliveryFee),
      minOrder: raw.settings.minOrder != null ? fromFils(raw.settings.minOrder) : null,
    },
    priceRange: {
      min: fromFils(raw.priceRange?.min ?? 0),
      max: fromFils(raw.priceRange?.max ?? 0),
    },
  };
}
