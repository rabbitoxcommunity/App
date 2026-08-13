import { api } from './client';
import type { PaymentMethod } from '../data/types';

/** GET /payment-methods — enabled rows only, in the tenant's own order. */
export const listPaymentMethods = () => api.get<PaymentMethod[]>('/payment-methods');
