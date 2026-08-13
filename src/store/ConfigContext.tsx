import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getConfig, type TenantConfig } from '../api/config';
import { listPaymentMethods } from '../api/paymentMethods';
import type { PaymentMethod } from '../data/types';

type ConfigContextValue = {
  config: TenantConfig | null;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

/**
 * White-label branding, store info, fees and enabled payment methods — all
 * public, tenant-scoped (X-Tenant-Id, no auth), and stable enough to fetch
 * once at launch rather than per screen.
 */
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [cfg, methods] = await Promise.all([getConfig(), listPaymentMethods()]);
      setConfig(cfg);
      setPaymentMethods(methods);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load store configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({ config, paymentMethods, isLoading, error, reload: load }),
    [config, paymentMethods, isLoading, error],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used inside <ConfigProvider>');
  return ctx;
}
