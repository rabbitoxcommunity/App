import { api } from './client';

/** POST /notify-requests — back-in-stock ping for a sold-out variant. */
export const requestStockNotification = (variantId: string) =>
  api.post<{ ok: boolean }>('/notify-requests', { variantId });
