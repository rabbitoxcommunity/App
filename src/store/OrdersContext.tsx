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
import { getAccessToken, idempotencyKey, SOCKET_BASE_URL } from '../api/client';
import type {
  CarProfile,
  CreditAccount,
  FulfillmentType,
  Order,
  PaymentMethodKind,
} from '../data/types';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

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
  /** Every order still in flight — a customer can have more than one at a time. */
  activeOrders: Order[];
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
  const { tenant } = useTenant();
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

  /**
   * Insert-or-replace by id. EVERY path that adds an order must go through
   * this: `placeOrder`'s own result and the `order.created` socket event race
   * each other (the server emits the moment the write commits, while the
   * client is still awaiting the HTTP response — and a curbside order awaits
   * a second `setArrival` round trip after that). An unconditional prepend on
   * either side puts the same order in the list twice, which React reports as
   * a duplicate-key error and may then render or drop unpredictably.
   */
  const upsertOrder = useCallback((order: Order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev];
    });
  }, []);

  const mergeOrder = useCallback((raw: RawOrder) => upsertOrder(mapOrder(raw)), [upsertOrder]);

  // §14 — sockets carry notifications, never authority: a missed event is fine,
  // because `load()` above already established the real state, and the next
  // pull-to-refresh re-syncs regardless.
  useEffect(() => {
    if (!session || !tenant?.id) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${SOCKET_BASE_URL}/t/${tenant.id}`, {
      // A function, not the captured `{ token }` — socket.io re-invokes it on
      // every reconnect, so a drop that happens after the access token rotated
      // reconnects with the current one instead of an expired one (which the
      // server rejects, leaving the socket permanently dead until app restart).
      auth: (cb: (data: Record<string, unknown>) => void) => cb({ token: getAccessToken() }),
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // `order.created` matters for orders placed on another device — the local
    // placeOrder path already merges its own result optimistically.
    socket.on('order.created', (raw: RawOrder) => mergeOrder(raw));
    socket.on('order.status', (raw: RawOrder) => mergeOrder(raw));
    socket.on('order.arrival', (raw: RawOrder) => mergeOrder(raw));
    socket.on('order.assigned', (raw: RawOrder) => mergeOrder(raw));
    socket.on('order.lines', (raw: RawOrder) => mergeOrder(raw));
    // The socket payload is the raw account doc (fils, no derived `entries`) —
    // not the app's mapped shape, so re-fetch through the same path `load()`
    // uses rather than setting it directly.
    socket.on('credit.changed', () => {
      getCreditAccount()
        .then(setCredit)
        .catch(() => undefined);
    });

    // Anything that changed while the socket was down emitted events nobody
    // received, so re-read rather than trust the stale in-memory list.
    socket.io.on('reconnect', () => {
      load();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, tenant?.id, mergeOrder, load]);

  /** Every order still in flight — a customer can legitimately have several at once. */
  const activeOrders = useMemo(() => orders.filter((o) => !isFinished(o)), [orders]);
  /** The most recent in-flight order, for screens that track a single one (e.g. OrderTracking's no-param fallback). */
  const activeOrder = useMemo(() => activeOrders[0] ?? null, [activeOrders]);
  const pastOrders = useMemo(() => orders.filter(isFinished), [orders]);

  // Watch every in-flight order, not just the newest — a customer with
  // several orders open needs live status on all of them. The server also
  // routes order events to this customer's own `customer:<id>` room, so this
  // is belt-and-braces (it additionally covers curbside `order.arrival`
  // pings, which are keyed to the order room).
  const activeIdsKey = activeOrders.map((o) => o.id).join(',');
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeIdsKey) return;
    const ids = activeIdsKey.split(',');
    for (const id of ids) socket.emit('order:watch', id);
    return () => {
      for (const id of ids) socket.emit('order:unwatch', id);
    };
  }, [activeIdsKey]);

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

    upsertOrder(finalOrder);
    if (finalOrder.paymentKind === 'credit') {
      getCreditAccount()
        .then(setCredit)
        .catch(() => undefined);
    }
    return finalOrder;
  }, [upsertOrder]);

  const markArrived = useCallback(
    async (orderId: string) => upsertOrder(await ordersApi.markArrived(orderId)),
    [upsertOrder],
  );

  const setArrival = useCallback(
    async (orderId: string, arrival: 'on_way' | 'near') =>
      upsertOrder(await ordersApi.setArrival(orderId, arrival)),
    [upsertOrder],
  );

  const cancelOrder = useCallback(
    async (orderId: string, reason: string) =>
      upsertOrder(await ordersApi.cancelOrder(orderId, reason)),
    [upsertOrder],
  );

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      activeOrder,
      activeOrders,
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
    [orders, activeOrder, activeOrders, pastOrders, credit, isLoading, getOrder, load, placeOrder, markArrived, setArrival, cancelOrder],
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
