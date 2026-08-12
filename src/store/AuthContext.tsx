import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { auth, type AuthSession } from '../api/auth';

const SESSION_KEY = '@freshcart/session';

type AuthContextValue = {
  session: AuthSession | null;
  /** True until the persisted session has been read — Splash waits on this. */
  isRestoring: boolean;
  /** Sends an OTP and returns the challenge id to verify against. */
  requestOtp: (phone: string, channel: 'sms' | 'whatsapp') => Promise<string>;
  verifyOtp: (challengeId: string, code: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Token-based persistence: the customer stays signed in across launches and
  // never re-verifies unless they sign out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!cancelled && raw) setSession(JSON.parse(raw) as AuthSession);
      } catch {
        // A corrupt session is the same as no session.
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: AuthSession) => {
    setSession(next);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }, []);

  const requestOtp = useCallback(
    (phone: string, channel: 'sms' | 'whatsapp') => auth.requestOtp(phone, channel),
    [],
  );

  const verifyOtp = useCallback(
    async (challengeId: string, code: string) => {
      persist(await auth.verifyOtp(challengeId, code));
    },
    [persist],
  );

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      persist(await auth.signInWithProvider(provider));
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    setSession(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isRestoring, requestOtp, verifyOtp, signInWithProvider, signOut }),
    [session, isRestoring, requestOtp, verifyOtp, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
