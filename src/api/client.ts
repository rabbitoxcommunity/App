import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Thin fetch wrapper for the Node/Express + MongoDB backend (BACKEND-DESIGN
 * §10). The tenant is NOT baked in — this is a shared app across every shop on
 * the platform, chosen at runtime via the shop picker (TenantContext) and
 * persisted here the same way the refresh token is.
 */

/**
 * In development the API host is taken from whichever host is already serving
 * the bundle, rather than from a value typed into app.json.
 *
 * A hardcoded host can only ever be right for one target: `localhost` is
 * unreachable from a phone in Expo Go (there, localhost is the phone), and a
 * LAN IP breaks the moment DHCP hands out a different one — both of which
 * happened here. Expo already knows the right host because the device just
 * downloaded the bundle from it, so reuse that and only swap the port.
 *
 * Production builds have no dev host, so they fall through to app.json.
 */
function resolveDevApiBase(): string | null {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  // hostUri is "192.168.0.19:8081" (device) or "localhost:8081" (web/simulator).
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  if (!hostUri) return null;

  const host = hostUri.split('/')[0]?.split(':')[0];
  if (!host) return null;

  // Keep the port and path from the configured value so only the host is
  // inferred — the API does not have to live on the Metro port.
  try {
    const url = new URL(configured ?? 'http://localhost:4000/api/v1');
    url.hostname = host;
    return url.toString().replace(/\/$/, '');
  } catch {
    return `http://${host}:4000/api/v1`;
  }
}

export const API_BASE_URL: string =
  resolveDevApiBase() ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:4000/api/v1';

/** §14 — Socket.io is mounted on the same origin as the HTTP API, one namespace per tenant. */
export const SOCKET_BASE_URL: string = API_BASE_URL.replace(/\/api(\/v\d+)?\/?$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// §5.5 — the refresh token is the long-lived credential, so it belongs in the
// OS keychain (SecureStore) on iOS/Android. SecureStore has no native module on
// web, so the web build falls back to AsyncStorage there — same trust model a
// browser tab already has (localStorage), just not a regression from it.
const REFRESH_TOKEN_KEY = 'fc_refresh_token';
const TENANT_ID_KEY = 'fc_tenant_id';
const secureStorage = {
  getItemAsync: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tenantId: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function getTenantId(): string | null {
  return tenantId;
}

export async function setTenantId(id: string | null): Promise<void> {
  tenantId = id;
  if (id) {
    await secureStorage.setItemAsync(TENANT_ID_KEY, id);
  } else {
    await secureStorage.deleteItemAsync(TENANT_ID_KEY);
  }
}

export async function loadPersistedTenantId(): Promise<string | null> {
  tenantId = await secureStorage.getItemAsync(TENANT_ID_KEY);
  return tenantId;
}

export async function loadPersistedRefreshToken(): Promise<string | null> {
  refreshToken = await secureStorage.getItemAsync(REFRESH_TOKEN_KEY);
  return refreshToken;
}

export async function setTokens(pair: { accessToken: string; refreshToken: string } | null): Promise<void> {
  accessToken = pair?.accessToken ?? null;
  refreshToken = pair?.refreshToken ?? null;
  if (pair?.refreshToken) {
    await secureStorage.setItemAsync(REFRESH_TOKEN_KEY, pair.refreshToken);
  } else {
    await secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

/** Decodes the access token's own claims — display-only, never trusted for authorization. */
export function decodeCustomerId(token: string): string | null {
  try {
    const payload = token.split('.')[1] ?? '';
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json).sub ?? null;
  } catch {
    return null;
  }
}

let onUnauthorized: (() => void) | null = null;
/** Called once by AuthContext so a 401 that survives a refresh attempt forces a logout. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

let refreshInFlight: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (!refreshToken) throw new ApiError('No refresh token', 401, 'UNAUTHENTICATED');
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError('Session expired', 401, 'UNAUTHENTICATED');
        const body = (await res.json()) as { accessToken: string; refreshToken: string };
        await setTokens(body);
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export type RequestOptions = RequestInit & {
  language?: string;
  /** Skip attaching Authorization / triggering the 401 refresh dance (auth endpoints themselves). */
  skipAuth?: boolean;
  /** Internal — set to false to prevent infinite retry loops. */
  retry?: boolean;
};

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { language, skipAuth, retry, headers, ...rest } = init;

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
        ...(language ? { 'Accept-Language': language } : {}),
        ...(accessToken && !skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });

  let response = await doFetch();

  // One transparent retry after a silent refresh — §5.5's rotating-refresh-token
  // flow means this is expected roughly hourly, not an error worth surfacing.
  if (response.status === 401 && !skipAuth && retry !== false && refreshToken) {
    try {
      await refreshAccessToken();
      response = await doFetch();
    } catch {
      await setTokens(null);
      onUnauthorized?.();
      throw new ApiError('Session expired — please sign in again.', 401, 'UNAUTHENTICATED');
    }
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}) as Record<string, unknown>);

  if (!response.ok) {
    const err = (body as { error?: { message?: string; code?: string; details?: unknown } }).error ?? {};
    if (response.status === 401 && !skipAuth) {
      await setTokens(null);
      onUnauthorized?.();
    }
    throw new ApiError(err.message ?? response.statusText, response.status, err.code, err.details);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined, ...opts }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: 'DELETE', ...opts }),
};

/** §13.7 — a fresh key per logical action (e.g. one tap of "Place order"), not per click. */
export function idempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** fils (backend) -> AED float (display/UI, matches formatMoney's expectations). */
export const fromFils = (fils: number): number => Math.round(fils) / 100;
/** AED float -> fils (backend), used the rare times the client itself constructs an amount (e.g. a credit payment). */
export const toFils = (aed: number): number => Math.round(aed * 100);
