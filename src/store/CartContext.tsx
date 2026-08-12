import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getProduct, getVariant, isPurchasable } from '../data/catalog';
import { DELIVERY_FEE, PROMO_CODES } from '../data/mock';
import type { CartLine, FulfillmentType, Product, ProductVariant } from '../data/types';

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
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const round = (value: number) => Math.round(value * 100) / 100;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [rawLines, setRawLines] = useState<CartLine[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
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
    [rawLines],
  );

  const totals = useMemo<CartTotals>(() => {
    const subtotal = round(lines.reduce((sum, l) => sum + l.lineTotal, 0));
    const promo = promoCode ? PROMO_CODES[promoCode] : undefined;
    const discount = promo ? round((subtotal * promo.percentOff) / 100) : 0;
    // Curbside pickup has no delivery fee — see the fulfillment rules in the brief.
    const deliveryFee = lines.length === 0 || fulfillment === 'pickup' ? 0 : DELIVERY_FEE;
    return {
      subtotal,
      deliveryFee,
      discount,
      total: round(subtotal - discount + deliveryFee),
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    };
  }, [lines, promoCode, fulfillment]);

  const quantityOf = useCallback(
    (variantId: string) => rawLines.find((l) => l.variantId === variantId)?.quantity ?? 0,
    [rawLines],
  );

  const addItem = useCallback((productId: string, variantId: string, quantity = 1) => {
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
  }, []);

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

  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!PROMO_CODES[normalized]) return false;
    setPromoCode(normalized);
    return true;
  }, []);

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
