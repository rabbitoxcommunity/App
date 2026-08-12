import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ACTIVE_ORDER, CREDIT_ACCOUNT, PAST_ORDERS } from '../data/orders';
import {
  flowFor,
  type CreditAccount,
  type CreditEntry,
  type FulfillmentType,
  type Order,
  type OrderStatus,
  type PaymentMethodKind,
} from '../data/types';

const ORDERS_KEY = '@freshcart/orders';

/** Simulated progression while an order is live, so tracking visibly moves. */
const STEP_INTERVAL_MS = 18000;

export type PlaceOrderInput = Omit<
  Order,
  'id' | 'reference' | 'status' | 'placedAt' | 'events' | 'confirmationCode'
>;

type OrdersContextValue = {
  orders: Order[];
  /** The order currently in flight, if any. */
  activeOrder: Order | null;
  pastOrders: Order[];
  credit: CreditAccount;
  /** True until the persisted store has been read — screens show skeletons. */
  isLoading: boolean;
  getOrder: (id: string) => Order | undefined;
  /**
   * Re-reads the persisted store. Pull-to-refresh calls this; when orders move
   * behind an API it is the one place that becomes a refetch.
   */
  refresh: () => Promise<void>;
  placeOrder: (input: PlaceOrderInput) => Order;
  /** Curbside: the customer tells the store they have parked. */
  markArrived: (orderId: string) => void;
  advance: (orderId: string) => void;
  payCredit: (amount: number) => void;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

const isFinished = (order: Order) =>
  order.status === 'delivered' ||
  order.status === 'handed_over' ||
  order.status === 'cancelled';

const round = (value: number) => Math.round(value * 100) / 100;

function nextStatus(order: Order): OrderStatus | null {
  const flow = flowFor(order.fulfillment);
  const index = flow.indexOf(order.status);
  if (index < 0 || index === flow.length - 1) return null;
  return flow[index + 1];
}

const randomCode = () => String(Math.floor(1000 + Math.random() * 9000));

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([ACTIVE_ORDER, ...PAST_ORDERS]);
  const [credit, setCredit] = useState<CreditAccount>(CREDIT_ACCOUNT);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ORDERS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { orders: Order[]; credit: CreditAccount };
        // Guarded: an empty or corrupt cache must not wipe what is on screen.
        if (saved.orders?.length) setOrders(saved.orders);
        if (saved.credit) setCredit(saved.credit);
      }
    } catch {
      // A corrupt cache falls back to the seeded mock data.
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setHydrated(true);
    })();
  }, [load]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ORDERS_KEY, JSON.stringify({ orders, credit })).catch(
      () => undefined,
    );
  }, [orders, credit, hydrated]);

  const activeOrder = useMemo(() => orders.find((o) => !isFinished(o)) ?? null, [orders]);
  const pastOrders = useMemo(() => orders.filter(isFinished), [orders]);

  const getOrder = useCallback((id: string) => orders.find((o) => o.id === id), [orders]);

  const advance = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const next = nextStatus(order);
        // Curbside waits on the customer: the store cannot hand over an order
        // until they have said they arrived.
        if (!next || (order.fulfillment === 'pickup' && next === 'handed_over')) return order;
        return {
          ...order,
          status: next,
          events: [...order.events, { status: next, at: new Date().toISOString() }],
        };
      }),
    );
  }, []);

  const markArrived = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId || order.fulfillment !== 'pickup') return order;
        if (order.status !== 'ready_for_pickup') return order;
        return {
          ...order,
          status: 'customer_arrived',
          events: [
            ...order.events,
            { status: 'customer_arrived', at: new Date().toISOString() },
          ],
        };
      }),
    );
  }, []);

  // Nudge the live order along so the tracking screen is not static in the demo.
  useEffect(() => {
    if (!activeOrder) return;
    const next = nextStatus(activeOrder);
    if (!next) return;
    if (activeOrder.fulfillment === 'pickup' && next === 'handed_over') return;

    const id = setTimeout(() => advance(activeOrder.id), STEP_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [activeOrder, advance]);

  const placeOrder = useCallback((input: PlaceOrderInput) => {
    const now = new Date();
    const order: Order = {
      ...input,
      id: `ord-${now.getTime()}`,
      reference: `FC-${2841 + Math.floor(Math.random() * 900)}`,
      status: 'placed',
      placedAt: now.toISOString(),
      confirmationCode: randomCode(),
      events: [{ status: 'placed', at: now.toISOString() }],
    };

    setOrders((prev) => [order, ...prev]);

    // A credit order immediately shows up on the tab — same ledger the shop
    // owner reads, so it must be written the moment the order exists.
    if (order.paymentKind === 'credit') {
      const entry: CreditEntry = {
        id: `cr-${order.id}`,
        kind: 'purchase',
        title: { en: `Order #${order.reference}`, ar: `الطلب ${order.reference}` },
        subtitle: {
          en: `${order.lines.length} items`,
          ar: `${order.lines.length} منتجات`,
        },
        amount: order.total,
        settled: false,
        at: order.placedAt,
      };
      setCredit((prev) => ({
        ...prev,
        balance: round(prev.balance + order.total),
        entries: [entry, ...prev.entries],
      }));
    }

    return order;
  }, []);

  const payCredit = useCallback((amount: number) => {
    setCredit((prev) => {
      const paid = Math.min(amount, prev.balance);
      if (paid <= 0) return prev;
      const entry: CreditEntry = {
        id: `cr-pay-${Date.now()}`,
        kind: 'payment',
        title: { en: 'Payment received', ar: 'تم استلام دفعة' },
        subtitle: { en: 'Card •••• 4218', ar: 'بطاقة •••• 4218' },
        amount: -paid,
        settled: true,
        at: new Date().toISOString(),
      };
      return {
        ...prev,
        balance: round(prev.balance - paid),
        // Clearing the balance settles the outstanding purchases too.
        entries: [
          entry,
          ...prev.entries.map((e) =>
            prev.balance - paid <= 0 ? { ...e, settled: true } : e,
          ),
        ],
      };
    });
  }, []);

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      activeOrder,
      pastOrders,
      credit,
      isLoading: !hydrated,
      getOrder,
      refresh: load,
      placeOrder,
      markArrived,
      advance,
      payCredit,
    }),
    [
      orders,
      activeOrder,
      pastOrders,
      credit,
      hydrated,
      getOrder,
      load,
      placeOrder,
      markArrived,
      advance,
      payCredit,
    ],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>');
  return ctx;
}

/** Credit headroom, used by checkout to decide whether Pay Later is offerable. */
export const availableCredit = (credit: CreditAccount): number =>
  round(Math.max(0, credit.limit - credit.balance));

export type { PaymentMethodKind, FulfillmentType };
