import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as addressesApi from '../api/addresses';
import type { Address } from '../data/types';
import { useAuth } from './AuthContext';

/** The editable half of an address — everything except its id. */
export type AddressDraft = Omit<Address, 'id'>;

type AddressesContextValue = {
  addresses: Address[];
  primaryId: string | undefined;
  isLoading: boolean;
  getAddress: (id: string) => Address | undefined;
  /** Returns the new address so the caller can select it straight away. */
  addAddress: (draft: AddressDraft) => Promise<Address>;
  updateAddress: (id: string, draft: AddressDraft) => Promise<void>;
  setPrimary: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AddressesContext = createContext<AddressesContextValue | null>(null);

export function AddressesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setAddresses(await addressesApi.listAddresses());
    } catch {
      // Checkout falls back to "add an address" when the list is empty/unreachable.
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) load();
    else {
      setAddresses([]);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const addAddress = useCallback(async (draft: AddressDraft) => {
    const created = await addressesApi.createAddress(draft);
    // The backend enforces exactly-one-primary (§4.9); simplest to just re-read
    // the book rather than guess how it renumbered locally.
    setAddresses(await addressesApi.listAddresses());
    return created;
  }, []);

  const updateAddress = useCallback(async (id: string, draft: AddressDraft) => {
    await addressesApi.updateAddress(id, draft);
    setAddresses(await addressesApi.listAddresses());
  }, []);

  const setPrimary = useCallback(async (id: string) => {
    await addressesApi.updateAddress(id, { isPrimary: true } as AddressDraft);
    setAddresses(await addressesApi.listAddresses());
  }, []);

  const value = useMemo<AddressesContextValue>(
    () => ({
      addresses,
      primaryId: addresses.find((a) => a.isPrimary)?.id,
      isLoading,
      getAddress: (id) => addresses.find((a) => a.id === id),
      addAddress,
      updateAddress,
      setPrimary,
      refresh: load,
    }),
    [addresses, isLoading, addAddress, updateAddress, setPrimary, load],
  );

  return <AddressesContext.Provider value={value}>{children}</AddressesContext.Provider>;
}

export function useAddresses() {
  const value = useContext(AddressesContext);
  if (!value) throw new Error('useAddresses must be used inside an AddressesProvider');
  return value;
}
