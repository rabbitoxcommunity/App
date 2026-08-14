import { api } from './client';
import type { Address } from '../data/types';

export type AddressPayload = {
  label: { en: string; ar: string };
  lines: { en: string; ar: string };
  phone?: string;
  isPrimary?: boolean;
  latitude?: number;
  longitude?: number;
};

export const listAddresses = () => api.get<Address[]>('/addresses');

export const createAddress = (payload: AddressPayload) => api.post<Address>('/addresses', payload);

export const updateAddress = (id: string, payload: Partial<AddressPayload>) =>
  api.patch<Address>(`/addresses/${id}`, payload);

export const deleteAddress = (id: string) => api.delete<void>(`/addresses/${id}`);
