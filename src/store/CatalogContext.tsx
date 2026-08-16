import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { listCategories, listProducts } from '../api/catalog';
import { SOCKET_BASE_URL } from '../api/client';
import type { Category, Product } from '../data/types';
import { useTenant } from './TenantContext';

type CatalogContextValue = {
  categories: Category[];
  products: Product[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
  productsInCategory: (categoryId: string) => Product[];
  popularProducts: (limit?: number) => Product[];
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

const PAGE_LIMIT = 100;

/** Backend pages products 100 at a time; the app's screens filter/sort a full in-memory list, so this walks every page once at launch. */
async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let page = 1;
  for (;;) {
    const res = await listProducts({ page, limit: PAGE_LIMIT });
    all.push(...res.items);
    if (all.length >= res.total || res.items.length === 0) break;
    page += 1;
  }
  return all;
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [cats, prods] = await Promise.all([listCategories(), fetchAllProducts()]);
      setCategories(cats);
      setProducts(prods);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the catalogue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // §14 — categories/products are public storefront data, so this connects
  // without a token, same as ConfigContext's payment-methods socket. A new
  // category, a product edit, or a Quick Stock toggle all land here live.
  useEffect(() => {
    if (!tenant?.id) return;
    const socket: Socket = io(`${SOCKET_BASE_URL}/t/${tenant.id}`, {
      transports: ['websocket'],
    });
    socket.on('category.changed', () => reload());
    socket.on('product.changed', () => reload());
    socket.on('stock.changed', () => reload());
    return () => {
      socket.disconnect();
    };
  }, [tenant?.id, reload]);

  const getProduct = useCallback((id: string) => products.find((p) => p.id === id), [products]);
  const getCategory = useCallback((id: string) => categories.find((c) => c.id === id), [categories]);
  const productsInCategory = useCallback(
    (categoryId: string) => products.filter((p) => p.categoryId === categoryId),
    [products],
  );
  const popularProducts = useCallback(
    (limit = 8) => [...products].sort((a, b) => b.popularity - a.popularity).slice(0, limit),
    [products],
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      categories,
      products,
      isLoading,
      error,
      reload,
      getProduct,
      getCategory,
      productsInCategory,
      popularProducts,
    }),
    [categories, products, isLoading, error, reload, getProduct, getCategory, productsInCategory, popularProducts],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
