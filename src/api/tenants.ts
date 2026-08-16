import { api } from './client';
import type { Localized } from '../data/types';

export type Shop = {
  id: string;
  slug: string;
  name: Localized;
  logoUrl: string | null;
  primaryHex: string;
  storeName: Localized;
  address: Localized | null;
  geo: { lat: number; lng: number } | null;
};

/** Public — no tenant, no auth. Backs the shop picker shown before login. */
export const listShops = () => api.get<{ items: Shop[] }>('/tenants', { skipAuth: true }).then((r) => r.items);
