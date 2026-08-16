import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { getConfig, type TenantConfig } from '../api/config';
import { listPaymentMethods } from '../api/paymentMethods';
import { SOCKET_BASE_URL } from '../api/client';
import type { PaymentMethod } from '../data/types';
import { colors as baseColors, theme as baseTheme, Theme } from '../theme';
import { generateDynamicTheme, ThemeColors } from '../theme/colorUtils';
import { useTenant } from './TenantContext';

type ConfigContextValue = {
  config: TenantConfig | null;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  colors: ThemeColors;
  theme: Theme;
  cachedLogoUrl: string | null;
};

export const ConfigContext = createContext<ConfigContextValue | null>(null);

import AsyncStorage from '@react-native-async-storage/async-storage';

let initialBranding: { primaryHex: string; logoUrl: string | null } | null = null;

export async function preloadBranding() {
  try {
    const json = await AsyncStorage.getItem('@freshcart/branding');
    if (json) initialBranding = JSON.parse(json);
  } catch {}
}

/**
 * White-label branding, store info, fees and enabled payment methods — all
 * public, tenant-scoped (X-Tenant-Id, no auth), and stable enough to fetch
 * once at launch rather than per screen.
 */
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
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
      try {
        await AsyncStorage.setItem('@freshcart/branding', JSON.stringify(cfg.branding));
      } catch {}
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

  // §14 — payment methods are public, tenant-scoped storefront data, so this
  // connects without a token (the namespace allows anonymous sockets for
  // exactly this). A missed event is fine: `load()` above already set the
  // real state, and pull-to-refresh screens re-sync regardless.
  useEffect(() => {
    if (!tenant?.id) return;
    const socket: Socket = io(`${SOCKET_BASE_URL}/t/${tenant.id}`, {
      transports: ['websocket'],
    });
    socket.on('payment-method.changed', () => load());
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const primaryHex = config?.branding?.primaryHex ?? initialBranding?.primaryHex;
  const themeColors = useMemo(() => generateDynamicTheme(baseColors, primaryHex), [primaryHex]);
  const dynamicTheme = useMemo(() => {
    return {
      ...baseTheme,
      colors: themeColors,
      shadow: {
        ...baseTheme.shadow,
        primaryCta: { ...baseTheme.shadow.primaryCta, shadowColor: themeColors.primary },
        floatingBar: { ...baseTheme.shadow.floatingBar, shadowColor: themeColors.primary },
      },
    } as Theme;
  }, [themeColors]);

  const value = useMemo<ConfigContextValue>(
    () => ({ 
      config, 
      paymentMethods, 
      isLoading, 
      error, 
      reload: load, 
      colors: themeColors, 
      theme: dynamicTheme,
      cachedLogoUrl: config?.branding?.logoUrl ?? initialBranding?.logoUrl ?? null,
    }),
    [config, paymentMethods, isLoading, error, themeColors, dynamicTheme],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  console.log('useConfig called, ctx is', !!ctx, new Error().stack); if (!ctx) throw new Error('useConfig must be used inside <ConfigProvider>');
  return ctx;
}

export function useTheme() {
  const ctx = useContext(ConfigContext);
  return ctx ? { colors: ctx.colors, theme: ctx.theme } : { colors: baseColors, theme: baseTheme };
}
