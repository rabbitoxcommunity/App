import { api } from './client';
import { mapProduct } from './catalog';
import type { Localized, Product } from '../data/types';

export type Banner = {
  id: string;
  imageUrl: string;
  linkType: 'category' | 'product' | 'none';
  linkId: string | null;
};

type RawHome = {
  banners: Array<{ id: string; imageUrl: string; linkType: Banner['linkType']; linkId: string | null }>;
  popular: Parameters<typeof mapProduct>[0][];
  trending: Localized[];
};

export type Home = { banners: Banner[]; popular: Product[]; trending: Localized[] };

/** GET /home — banners, the tenant's curated/derived popular rail, and trending search terms, in one call. */
export async function getHome(): Promise<Home> {
  const raw = await api.get<RawHome>('/home', { skipAuth: true });
  return {
    banners: raw.banners.map((b) => ({ id: b.id, imageUrl: b.imageUrl, linkType: b.linkType, linkId: b.linkId })),
    popular: raw.popular.map(mapProduct),
    trending: raw.trending,
  };
}
