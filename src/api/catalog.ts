import { api, fromFils } from './client';
import type { Category, Localized, Product, ProductVariant, Subcategory, VariantAxis } from '../data/types';
import type { IconName } from '../components/Icon';

type RawVariant = {
  id: string;
  optionIds: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  barcode: string | null;
  stock: ProductVariant['stock'];
  lowStockCount: number | null;
};

type RawAxis = { id: string; slug: string; name: Localized; options: { id: string; slug: string; name: Localized }[] };

type RawProduct = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  name: Localized;
  subtitle: Localized;
  description: Localized | null;
  shelf: Localized | null;
  imageUrl: string | null;
  icon: string;
  axes: RawAxis[];
  variants: RawVariant[];
  defaultVariantId: string | null;
  popularity: number;
  createdAt: string;
};

type RawSubcategory = { id: string; slug: string; name: Localized; sortOrder: number };
type RawCategory = {
  id: string;
  slug: string;
  name: Localized;
  imageUrl: string | null;
  icon: string;
  subcategories: RawSubcategory[];
};

function mapVariant(v: RawVariant): ProductVariant {
  return {
    id: v.id,
    optionIds: v.optionIds,
    price: fromFils(v.price),
    compareAtPrice: v.compareAtPrice != null ? fromFils(v.compareAtPrice) : undefined,
    barcode: v.barcode ?? '',
    stock: v.stock,
    lowStockCount: v.lowStockCount ?? undefined,
  };
}

function mapAxis(a: RawAxis): VariantAxis {
  return { id: a.id, name: a.name, options: a.options.map((o) => ({ id: o.id, name: o.name })) };
}

export function mapProduct(p: RawProduct): Product {
  return {
    id: p.id,
    categoryId: p.categoryId ?? '',
    subcategoryId: p.subcategoryId ?? undefined,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description ?? undefined,
    shelf: p.shelf ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
    icon: p.icon as IconName,
    axes: p.axes.map(mapAxis),
    variants: p.variants.map(mapVariant),
    defaultVariantId: p.defaultVariantId ?? p.variants[0]?.id ?? '',
    popularity: p.popularity,
    createdAt: p.createdAt,
  };
}

function mapSubcategory(s: RawSubcategory): Subcategory {
  return { id: s.id, name: s.name };
}

export function mapCategory(c: RawCategory): Category {
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl ?? undefined,
    icon: c.icon as IconName,
    subcategories: c.subcategories.map(mapSubcategory),
  };
}

export async function listCategories(): Promise<Category[]> {
  const raw = await api.get<RawCategory[]>('/categories', { skipAuth: true });
  return raw.map(mapCategory);
}

export type ProductPage = {
  items: Product[];
  page: number;
  limit: number;
  total: number;
  /** Price span of the whole result set (not just this page), in AED. */
  priceRange: { min: number; max: number };
};

export type ListProductsParams = {
  category?: string;
  sub?: string;
  sort?: 'popularity' | 'newest' | 'priceAsc' | 'priceDesc';
  minPrice?: number;
  maxPrice?: number;
  /** Hide products with no sellable variant — the storefront listing default. */
  inStock?: boolean;
  page?: number;
  limit?: number;
};

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function listProducts(params: ListProductsParams = {}): Promise<ProductPage> {
  const raw = await api.get<{
    items: RawProduct[];
    page: number;
    limit: number;
    total: number;
    priceRange?: { min: number; max: number };
  }>(
    `/products${toQuery(params)}`,
    { skipAuth: true },
  );
  return {
    ...raw,
    items: raw.items.map(mapProduct),
    priceRange: {
      min: fromFils(raw.priceRange?.min ?? 0),
      max: fromFils(raw.priceRange?.max ?? 0),
    },
  };
}

export async function getProduct(id: string): Promise<Product> {
  const raw = await api.get<RawProduct>(`/products/${id}`, { skipAuth: true });
  return mapProduct(raw);
}

export type SearchParams = {
  page?: number;
  limit?: number;
  sort?: ListProductsParams['sort'];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

export async function searchProducts(q: string, params: SearchParams = {}): Promise<ProductPage> {
  const raw = await api.get<{
    items: RawProduct[];
    page: number;
    limit: number;
    total: number;
    priceRange?: { min: number; max: number };
  }>(
    `/search${toQuery({ q, ...params })}`,
    { skipAuth: true },
  );
  return {
    ...raw,
    items: raw.items.map(mapProduct),
    priceRange: {
      min: fromFils(raw.priceRange?.min ?? 0),
      max: fromFils(raw.priceRange?.max ?? 0),
    },
  };
}
