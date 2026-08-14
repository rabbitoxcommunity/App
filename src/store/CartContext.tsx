import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { toFils } from '../api/client';
import { getVariant, isPurchasable } from '../data/catalog';
import type { CartLine, FulfillmentType, Product, ProductVariant } from '../data/types';
import { useCatalog } from './CatalogContext';
import { useConfig } from './ConfigContext';

const CART_KEY = '@freshcart/cart';

/** A cart line joined back to its catalogue entry for rendering. */
export type ResolvedCartLine = CartLine & {
  product: Product;
  variant: ProductVariant;
  lineTotal: number;
};

export type CartTotals = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  itemCount: number;
};

type CartContextValue = {
  lines: ResolvedCartLine[];
  itemCount: number;
  /** Client-side estimate for instant UI feedback — `cart/price` is the authoritative total at checkout. */
  totals: CartTotals;
  promoCode: string | null;
  /** Curbside pickup waives the delivery fee, so totals depend on it. */
  fulfillment: FulfillmentType;
  setFulfillment: (type: FulfillmentType) => void;
  quantityOf: (variantId: string) => number;
  addItem: (productId: string, variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  applyPromo: (code: string) => Promise<boolean>;
  removePromo: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const round = (value: number) => Math.round(value * 100) / 100;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getProduct } = useCatalog();
  const { config } = useConfig();
  const deliveryFee = config?.settings.deliveryFee ?? 0;

  const [rawLines, setRawLines] = useState<CartLine[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [discount, setDiscount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { lines: CartLine[]; promoCode: string | null };
          setRawLines(saved.lines ?? []);
          setPromoCode(saved.promoCode ?? null);
        }
      } catch {
        // Ignore a corrupt cart rather than blocking the app on it.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify({ lines: rawLines, promoCode })).catch(
      () => undefined,
    );
  }, [rawLines, promoCode, hydrated]);

  /**
   * Lines are stored as ids and joined to the catalogue on read, so a product
   * the shop has since removed simply drops out instead of crashing a screen.
   */
  const lines = useMemo<ResolvedCartLine[]>(
    () =>
      rawLines.flatMap((line) => {
        const product = getProduct(line.productId);
        const variant = product && getVariant(product, line.variantId);
        if (!product || !variant) return [];
        return [{ ...line, product, variant, lineTotal: round(variant.price * line.quantity) }];
      }),
    [rawLines, getProduct],
  );

  useEffect(() => {
    if (!promoCode || lines.length === 0) {
      setDiscount(0);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { priceCart } = await import('../api/cart');
        const priced = await priceCart({
          lines: lines.map(l => ({ variantId: l.variantId, quantity: l.quantity })),
          promoCode,
          fulfillment,
        });
        setDiscount(priced.discount);
      } catch (e) {
        // If pricing fails (e.g. promo became invalid), we keep the current discount
        // or clear it. We'll leave it as is, or maybe clear it:
        // setDiscount(0);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [lines, promoCode, fulfillment]);

  const totals = useMemo<CartTotals>(() => {
    const subtotal = round(lines.reduce((sum, l) => sum + l.lineTotal, 0));
    const fee = lines.length === 0 || fulfillment === 'curbside' ? 0 : deliveryFee;
    return {
      subtotal,
      deliveryFee: fee,
      discount,
      total: round(subtotal - discount + fee),
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    };
  }, [lines, fulfillment, deliveryFee, discount]);

  const quantityOf = useCallback(
    (variantId: string) => rawLines.find((l) => l.variantId === variantId)?.quantity ?? 0,
    [rawLines],
  );

  const addItem = useCallback(
    (productId: string, variantId: string, quantity = 1) => {
      const product = getProduct(productId);
      const variant = product && getVariant(product, variantId);
      // Out-of-stock items can never enter the cart, whatever the caller does.
      if (!product || !variant || !isPurchasable(variant.stock)) return;

      setRawLines((prev) => {
        const existing = prev.find((l) => l.variantId === variantId);
        if (!existing) return [...prev, { productId, variantId, quantity }];
        return prev.map((l) =>
          l.variantId === variantId ? { ...l, quantity: l.quantity + quantity } : l,
        );
      });
    },
    [getProduct],
  );

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setRawLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)),
    );
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setRawLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => {
    setRawLines([]);
    setPromoCode(null);
  }, []);

  /** A quick client-side check (§8) — `cart/price` re-validates authoritatively at checkout regardless. */
  const applyPromo = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) return false;
      const subtotal = toFils(lines.reduce((sum, l) => sum + l.lineTotal, 0));
      const { validatePromo } = await import('../api/promos');
      const result = await validatePromo(normalized, subtotal).catch(() => ({ applied: false }) as const);
      if (!result.applied) return false;
      setPromoCode(normalized);
      return true;
    },
    [lines],
  );

  const removePromo = useCallback(() => setPromoCode(null), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: totals.itemCount,
      totals,
      promoCode,
      fulfillment,
      setFulfillment,
      quantityOf,
      addItem,
      setQuantity,
      removeItem,
      clear,
      applyPromo,
      removePromo,
    }),
    [
      lines,
      totals,
      promoCode,
      fulfillment,
      quantityOf,
      addItem,
      setQuantity,
      removeItem,
      clear,
      applyPromo,
      removePromo,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
