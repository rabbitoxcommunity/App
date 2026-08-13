import { api } from './client';
import type { Customer } from './auth';

export const getMe = () => api.get<Customer>('/me');

export const updateMe = (patch: { name?: string; language?: 'en' | 'ar' }) => api.patch<Customer>('/me', patch);

export const registerPushToken = (token: string, platform: 'ios' | 'android' | 'web') =>
  api.post<void>('/me/push-token', { token, platform });
