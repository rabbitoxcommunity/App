import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';

import * as ordersApi from '../api/orders';
import { mapOrder, type RawOrder } from '../api/orders';
import { priceCart } from '../api/cart';
import { getCreditAccount } from '../api/credit';
import { getAccessToken, idempotencyKey, SOCKET_BASE_URL, TENANT_ID } from '../api/client';
import type {
  CarProfile,
  CreditAccount,
  FulfillmentType,
  Order,
  PaymentMethodKind,
} from '../data/types';
import { useAuth } from './AuthContext';

const isFinished = (order: Order) =>
  order.status === 'delivered' || order.status === 'handed_over' || order.status === 'cancelled';

const EMPTY_CREDIT: CreditAccount = { limit: 0, balance: 0, dueDate: new Date().toISOString(), entries: [] };

export type PlaceOrderInput = {
  lines: Array<{ variantId: string; quantity: number }>;
  promoCode?: string | null;
  fulfillment: FulfillmentType;
  addressId?: string;
  paymentKind: PaymentMethodKind;
  car?: CarProfile;
  /** Curbside only — sent as a follow-up `PATCH /orders/:id/arrival` right after creation. */
  arrival?: 'on_way' | 'near';
};

type OrdersContextValue = {
  orders: Order[];
  /** The order currently in flight, if any. */
  activeOrder: Order | null;
  pastOrders: Order[];
  credit: CreditAccount;
  /** True until the first load of orders/credit has completed. */
  isLoading: boolean;
  getOrder: (id: string) => Order | undefined;
  refresh: () => Promise<void>;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  /** Curbside: the customer tells the store they have parked. */
  markArrived: (orderId: string) => Promise<void>;
  /** Curbside: "on my way" / "near the shop", ahead of arriving. */
  setArrival: (orderId: string, arrival: 'on_way' | 'near') => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [credit, setCredit] = useState<CreditAccount>(EMPTY_CREDIT);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [list, account] = await Promise.all([
        ordersApi.listOrders(),
        getCreditAccount().catch(() => EMPTY_CREDIT),
      ]);
      setOrders(list);
      setCredit(account);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) load();
    else {
      setOrders([]);
      setCredit(EMPTY_CREDIT);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const mergeOrder = useCallback((raw: RawOrder) => {
    const order = mapOrder(raw);
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev];
    });
  }, []);

  // §14 — sockets carry notifications, never authority: a missed event is fine,
  // because `load()` above already established the real state, and the next
  // pull-to-refresh re-syncs regardless.
  useEffect(() => {
    if (!session || !TENANT_ID) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${SOCKET_BASE_URL}/t/${TENANT_ID}`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('order.status', (raw: RawOrder) => mergeOrder(raw));
    socket.on('order.arrival', (raw: RawOrder) => mergeOrder(raw));
    socket.on('order.assigned', (raw: RawOrder) => mergeOrder(raw));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, mergeOrder]);

  const activeOrder = useMemo(() => orders.find((o) => !isFinished(o)) ?? null, [orders]);
  const pastOrders = useMemo(() => orders.filter(isFinished), [orders]);

  // The active order is the one screen a customer watches live; joining its
  // room is what makes the events above actually arrive (§14 — rooms are opt-in).
  useEffect(() => {
    const socket = socketRef.current;
    const id = activeOrder?.id;
    if (!socket || !id) return;
    socket.emit('order:watch', id);
    return () => {
      socket.emit('order:unwatch', id);
    };
  }, [activeOrder?.id]);

  const getOrder = useCallback((id: string) => orders.find((o) => o.id === id), [orders]);

  const placeOrder = useCallback(async (input: PlaceOrderInput): Promise<Order> => {
    const priced = await priceCart({
      lines: input.lines,
      promoCode: input.promoCode ?? undefined,
      fulfillment: input.fulfillment,
      addressId: input.addressId,
    });

    const order = await ordersApi.placeOrder(
      {
        lines: input.lines,
        promoCode: input.promoCode ?? undefined,
        fulfillment: input.fulfillment,
        addressId: input.addressId,
        priceToken: priced.priceToken,
        paymentKind: input.paymentKind,
        car: input.car,
      },
      idempotencyKey(),
    );

    let finalOrder = order;
    if (input.fulfillment === 'curbside' && input.arrival) {
      finalOrder = await ordersApi.setArrival(order.id, input.arrival);
    }

    setOrders((prev) => [finalOrder, ...prev]);
    if (finalOrder.paymentKind === 'credit') {
      getCreditAccount()
        .then(setCredit)
        .catch(() => undefined);
    }
    return finalOrder;
  }, []);

  const markArrived = useCallback(async (orderId: string) => {
    const order = await ordersApi.markArrived(orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
  }, []);

  const setArrival = useCallback(async (orderId: string, arrival: 'on_way' | 'near') => {
    const order = await ordersApi.setArrival(orderId, arrival);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    const order = await ordersApi.cancelOrder(orderId, reason);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
  }, []);

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      activeOrder,
      pastOrders,
      credit,
      isLoading,
      getOrder,
      refresh: load,
      placeOrder,
      markArrived,
      setArrival,
      cancelOrder,
    }),
    [orders, activeOrder, pastOrders, credit, isLoading, getOrder, load, placeOrder, markArrived, setArrival, cancelOrder],
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
  Math.round(Math.max(0, credit.limit - credit.balance) * 100) / 100;

export type { PaymentMethodKind, FulfillmentType };
