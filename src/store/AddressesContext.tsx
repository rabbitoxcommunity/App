import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ADDRESSES } from '../data/orders';
import type { Address } from '../data/types';

const ADDRESSES_KEY = '@freshcart/addresses';

/** The editable half of an address — everything except its id. */
export type AddressDraft = Omit<Address, 'id'>;

type AddressesContextValue = {
  addresses: Address[];
  primaryId: string | undefined;
  getAddress: (id: string) => Address | undefined;
  /** Returns the new address so the caller can select it straight away. */
  addAddress: (draft: AddressDraft) => Address;
  updateAddress: (id: string, draft: AddressDraft) => void;
  setPrimary: (id: string) => void;
};

const AddressesContext = createContext<AddressesContextValue | null>(null);

/**
 * Exactly one address carries `isPrimary`, so every write funnels through here
 * rather than trusting callers to clear the previous winner.
 */
const withPrimary = (list: Address[], primaryId: string): Address[] =>
  list.map((a) => ({ ...a, isPrimary: a.id === primaryId }));

export function AddressesProvider({ children }: { children: React.ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(ADDRESSES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ADDRESSES_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Address[];
          // An empty or corrupt list would leave checkout with nothing to ship
          // to, so fall back to the seeded book instead.
          if (Array.isArray(saved) && saved.length) setAddresses(saved);
        }
      } catch {
        // Ignore a corrupt address book rather than blocking checkout on it.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses)).catch(() => undefined);
  }, [addresses, hydrated]);

  const addAddress = useCallback((draft: AddressDraft) => {
    const created: Address = { ...draft, id: `addr-${Date.now()}` };
    setAddresses((list) => {
      const next = [...list, created];
      if (created.isPrimary) return withPrimary(next, created.id);
      // The first address in an empty book is the primary whether asked or not.
      return next.some((a) => a.isPrimary) ? next : withPrimary(next, created.id);
    });
    return created;
  }, []);

  const updateAddress = useCallback((id: string, draft: AddressDraft) => {
    setAddresses((list) => {
      const next = list.map((a) => (a.id === id ? { ...a, ...draft, id } : a));
      // Un-setting the last primary would leave the book without one, so a
      // cleared toggle only takes effect if some other address is already it.
      if (draft.isPrimary) return withPrimary(next, id);
      return next.some((a) => a.isPrimary) ? next : withPrimary(next, id);
    });
  }, []);

  const setPrimary = useCallback((id: string) => {
    setAddresses((list) => withPrimary(list, id));
  }, []);

  const value = useMemo<AddressesContextValue>(
    () => ({
      addresses,
      primaryId: addresses.find((a) => a.isPrimary)?.id,
      getAddress: (id) => addresses.find((a) => a.id === id),
      addAddress,
      updateAddress,
      setPrimary,
    }),
    [addresses, addAddress, updateAddress, setPrimary],
  );

  return <AddressesContext.Provider value={value}>{children}</AddressesContext.Provider>;
}

export function useAddresses() {
  const value = useContext(AddressesContext);
  if (!value) throw new Error('useAddresses must be used inside an AddressesProvider');
  return value;
}
