import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { auth, type AuthSession } from '../api/auth';
import { getMe } from '../api/me';
import { loadPersistedRefreshToken, setTokens, setUnauthorizedHandler, getRefreshToken } from '../api/client';

type AuthContextValue = {
  session: AuthSession | null;
  /** True until the persisted session has been restored — Splash waits on this. */
  isRestoring: boolean;
  /** Sends an OTP and returns the challenge id to verify against. */
  requestOtp: (phone: string, channel: 'sms' | 'whatsapp') => Promise<string>;
  verifyOtp: (challengeId: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Cold start: the refresh token lives in SecureStore (§5.5); if one exists,
  // GET /me either succeeds outright or triggers the client's built-in silent
  // 401-refresh-and-retry, so no separate "am I still logged in" call is needed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await loadPersistedRefreshToken();
        if (!token) return;
        const customer = await getMe();
        if (!cancelled) setSession({ customer });
      } catch {
        if (!cancelled) await setTokens(null);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 that survives the client's own refresh attempt means the session is
  // truly gone (revoked family, blocked account) — force back to Login.
  useEffect(() => {
    setUnauthorizedHandler(() => setSession(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const requestOtp = useCallback(
    (phone: string, channel: 'sms' | 'whatsapp') => auth.requestOtp(phone, channel),
    [],
  );

  const verifyOtp = useCallback(async (challengeId: string, code: string) => {
    const result = await auth.verifyOtp(challengeId, code);
    setSession(result);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = getRefreshToken();
    setSession(null);
    await setTokens(null);
    if (refreshToken) await auth.logout(refreshToken);
  }, []);

  const reloadSession = useCallback(async () => {
    const customer = await getMe();
    setSession({ customer });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isRestoring, requestOtp, verifyOtp, signOut, reloadSession }),
    [session, isRestoring, requestOtp, verifyOtp, signOut, reloadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
