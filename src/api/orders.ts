import { api, fromFils } from './client';
import type {
  CarProfile,
  FulfillmentType,
  Localized,
  Order,
  OrderEvent,
  OrderLine,
  OrderStatus,
  PaymentMethodKind,
} from '../data/types';
import type { IconName } from '../components/Icon';

type RawOrderLine = {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  name: Localized;
  variantLabel: Localized;
  icon: string;
  fulfilledQty: number | null;
};

export type RawOrder = {
  id: string;
  reference: string;
  fulfillment: FulfillmentType;
  status: OrderStatus;
  placedAt: string;
  events: OrderEvent[];
  lines: RawOrderLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentKind: PaymentMethodKind;
  confirmationCode: string;
  rider: { userId: string | null; name: Localized | null; phone: string | null; etaMinutes: number | null } | null;
  estimatedAt: string | null;
  car: CarProfile | null;
  bay: number | null;
  arrival: 'on_way' | 'near' | null;
};

function mapLine(l: RawOrderLine): OrderLine {
  return {
    productId: l.productId,
    variantId: l.variantId,
    quantity: l.quantity,
    unitPrice: fromFils(l.unitPrice),
    name: l.name,
    variantLabel: l.variantLabel,
    icon: l.icon as IconName,
  };
}

/** Exported so OrdersContext can map the same shape arriving over the §14 Socket.io channel. */
export function mapOrder(o: RawOrder): Order {
  return {
    id: o.id,
    reference: o.reference,
    fulfillment: o.fulfillment,
    status: o.status,
    placedAt: o.placedAt,
    events: o.events,
    lines: o.lines.map(mapLine),
    subtotal: fromFils(o.subtotal),
    deliveryFee: fromFils(o.deliveryFee),
    discount: fromFils(o.discount),
    total: fromFils(o.total),
    paymentKind: o.paymentKind,
    confirmationCode: o.confirmationCode,
    rider:
      o.rider?.name && o.rider.etaMinutes != null
        ? { name: o.rider.name, etaMinutes: o.rider.etaMinutes }
        : undefined,
    estimatedAt: o.estimatedAt ?? undefined,
    car: o.car ?? undefined,
    arrival: o.arrival,
    bay: o.bay,
  };
}

export type PlaceOrderPayload = {
  lines: Array<{ variantId: string; quantity: number }>;
  promoCode?: string;
  fulfillment: FulfillmentType;
  addressId?: string;
  priceToken: string;
  paymentKind: PaymentMethodKind;
  car?: CarProfile;
};

/** POST /orders — §13.3. Requires a fresh Idempotency-Key per placement attempt. */
export async function placeOrder(payload: PlaceOrderPayload, idempotencyKey: string): Promise<Order> {
  const raw = await api.post<RawOrder>('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
  return mapOrder(raw);
}

export async function listOrders(): Promise<Order[]> {
  const { items } = await api.get<{ items: RawOrder[]; nextCursor: string | null }>('/orders?limit=50');
  return items.map(mapOrder);
}

export async function getOrder(id: string): Promise<Order> {
  const raw = await api.get<RawOrder>(`/orders/${id}`);
  return mapOrder(raw);
}

export async function markArrived(id: string): Promise<Order> {
  const raw = await api.post<RawOrder>(`/orders/${id}/arrived`);
  return mapOrder(raw);
}

export async function setArrival(id: string, arrival: 'on_way' | 'near'): Promise<Order> {
  const raw = await api.patch<RawOrder>(`/orders/${id}/arrival`, { arrival });
  return mapOrder(raw);
}

export async function cancelOrder(id: string, reason: string): Promise<Order> {
  const raw = await api.post<RawOrder>(`/orders/${id}/cancel`, { reason });
  return mapOrder(raw);
}
