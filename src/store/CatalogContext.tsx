import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { listCategories, listProducts } from '../api/catalog';
import { SOCKET_BASE_URL } from '../api/client';
import type { Category, Product, StockStatus } from '../data/types';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

type CatalogContextValue = {
  categories: Category[];
  products: Product[];
  isLoading: boolean;
  /** True while later pages are still streaming in behind an already-usable screen. */
  isHydrating: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
  productsInCategory: (categoryId: string) => Product[];
  popularProducts: (limit?: number) => Product[];
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

const PAGE_LIMIT = 100;
/** Pages fetched concurrently after the first. Sequential paging made launch latency-bound: 47 round trips at 300ms RTT is ~14s of pure waiting before anything is usable. */
const PARALLEL_PAGES = 6;
/** A Quick Stock session fires an event per toggle; coalesce a burst into one refetch. */
const RELOAD_DEBOUNCE_MS = 1500;

type StockChangePayload = {
  productId?: string;
  variantId?: string;
  stock?: StockStatus;
  lowStockCount?: number | null;
};

/**
 * Fresh rows win, existing order is kept, genuinely new ids are appended.
 * Never removes anything — pruning only happens once a full walk has finished
 * and we actually know what the server still has.
 */
function mergeById(prev: Product[], incoming: Product[]): Product[] {
  if (prev.length === 0) return incoming;
  if (incoming.length === 0) return prev;
  const byId = new Map(incoming.map((p) => [p.id, p]));
  const existing = new Set(prev.map((p) => p.id));
  const merged = prev.map((p) => byId.get(p.id) ?? p);
  const added = incoming.filter((p) => !existing.has(p.id));
  return added.length > 0 ? [...merged, ...added] : merged;
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const { session } = useAuth();
  const isSignedIn = Boolean(session);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every load so a walk still in flight stops appending once a newer
  // one has started — otherwise two overlapping walks interleave their pages.
  const runRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Loads page 1, paints, then streams the rest in parallel batches.
   *
   * This used to await all 47 pages before rendering anything, so the customer
   * stared at a splash for 8.6s on 4G and 34.7s on 3G with a 4,680-product
   * catalogue. Screens now become usable after ONE request and fill in behind.
   */
  const load = useCallback(async () => {
    const run = ++runRef.current;
    setError(null);
    setIsHydrating(true);
    try {
      const [cats, first] = await Promise.all([
        listCategories(),
        listProducts({ page: 1, limit: PAGE_LIMIT }),
      ]);
      if (run !== runRef.current) return;

      setCategories(cats);
      // Merge, never replace. This used to be `setProducts(first.items)`, which
      // on a RELOAD threw the whole catalogue away and put back only page 1 —
      // so for the rest of the walk every product on a later page was simply
      // absent from state, and anything resolving one by id treated it as gone.
      // Pull-to-refresh on a product from page 3 rendered "Unavailable", and
      // the cart silently dropped lines, until that page happened to land.
      setProducts((prev) => mergeById(prev, first.items));
      // Usable now — do not wait on the remaining pages.
      setIsLoading(false);

      // Every id this walk has seen. Merging can only ever add, so this is what
      // lets the finished walk prune products deleted since the last load.
      const walkedIds = new Set(first.items.map((p) => p.id));

      const totalPages = Math.max(1, Math.ceil(first.total / PAGE_LIMIT));
      for (let start = 2; start <= totalPages; start += PARALLEL_PAGES) {
        const batch: number[] = [];
        for (let p = start; p < start + PARALLEL_PAGES && p <= totalPages; p += 1) batch.push(p);

        const pages = await Promise.all(batch.map((p) => listProducts({ page: p, limit: PAGE_LIMIT })));
        if (run !== runRef.current) return;

        // Dedupe by id: a product created or deleted mid-walk shifts every
        // later page, which would otherwise duplicate or drop rows.
        const incoming = pages.flatMap((r) => r.items).filter((p) => !walkedIds.has(p.id));
        for (const p of incoming) walkedIds.add(p.id);
        if (incoming.length > 0) setProducts((prev) => mergeById(prev, incoming));
      }

      // Walk complete: drop anything the server no longer returns. Pruning from
      // current state rather than swapping in the fetched array keeps any
      // `stock.changed` patch that landed mid-walk.
      setProducts((prev) => {
        const pruned = prev.filter((p) => walkedIds.has(p.id));
        return pruned.length === prev.length ? prev : pruned;
      });
    } catch (e) {
      if (run !== runRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load the catalogue.');
    } finally {
      if (run === runRef.current) {
        setIsLoading(false);
        setIsHydrating(false);
      }
    }
  }, []);

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void load();
    }, RELOAD_DEBOUNCE_MS);
  }, [load]);

  /**
   * `stock.changed` carries { productId, variantId, stock, lowStockCount },
   * which is everything needed to patch state in place — so the commonest
   * event in the system now costs ZERO requests. It previously triggered a full
   * reload, meaning one Quick Stock toggle made every connected app re-download
   * the entire 3.3 MB catalogue.
   */
  const applyStockChange = useCallback((payload: StockChangePayload) => {
    const { productId, variantId, stock } = payload ?? {};
    if (!productId || !variantId || !stock) {
      scheduleReload();
      return;
    }
    setProducts((prev) => {
      let hit = false;
      const next = prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            if (v.id !== variantId) return v;
            hit = true;
            return { ...v, stock, lowStockCount: payload.lowStockCount ?? undefined };
          }),
        };
      });
      if (!hit) {
        // A product this client has not loaded yet (still hydrating, or newly
        // created) — let the debounced reload pick it up rather than guessing.
        scheduleReload();
        return prev;
      }
      return next;
    });
  }, [scheduleReload]);

  // §16 — the catalogue is public, but it is only reachable behind login in
  // this app (RootNavigator shows the Login group when there is no session).
  // Fetching it before sign-in pulled 3.3 MB for a visitor who never logs in.
  useEffect(() => {
    if (!isSignedIn) {
      setProducts([]);
      setCategories([]);
      setIsLoading(true);
      return;
    }
    void load();
  }, [isSignedIn, load]);

  // §14 — categories/products are public storefront data, so this connects
  // without a token, same as ConfigContext's payment-methods socket.
  useEffect(() => {
    if (!tenant?.id || !isSignedIn) return undefined;
    const socket: Socket = io(`${SOCKET_BASE_URL}/t/${tenant.id}`, {
      transports: ['websocket'],
    });
    socket.on('category.changed', () => scheduleReload());
    socket.on('product.changed', () => scheduleReload());
    socket.on('stock.changed', (payload: StockChangePayload) => applyStockChange(payload));
    return () => {
      socket.disconnect();
    };
  }, [tenant?.id, isSignedIn, scheduleReload, applyStockChange]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

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
      isHydrating,
      error,
      reload: load,
      getProduct,
      getCategory,
      productsInCategory,
      popularProducts,
    }),
    [categories, products, isLoading, isHydrating, error, load, getProduct, getCategory, productsInCategory, popularProducts],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
