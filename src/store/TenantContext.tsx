import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadPersistedTenantId, setTenantId } from '../api/client';
import type { Shop } from '../api/tenants';

type TenantContextValue = {
  tenant: Shop | null;
  /** True until the persisted tenant choice has been restored — TenantGate waits on this. */
  isRestoring: boolean;
  chooseTenant: (shop: Shop) => Promise<void>;
  clearTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Shop | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Only the id is persisted (client.ts, same key as the refresh token
  // pattern) — the rest of the shop's details are refetched on the picker
  // the next time it's shown, not carried across restarts as stale data.
  useEffect(() => {
    (async () => {
      const id = await loadPersistedTenantId();
      if (id) setTenant((prev) => prev ?? ({ id } as Shop));
      setIsRestoring(false);
    })();
  }, []);

  const chooseTenant = useCallback(async (shop: Shop) => {
    await setTenantId(shop.id);
    setTenant(shop);
  }, []);

  const clearTenant = useCallback(async () => {
    await setTenantId(null);
    setTenant(null);
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({ tenant, isRestoring, chooseTenant, clearTenant }),
    [tenant, isRestoring, chooseTenant, clearTenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}
