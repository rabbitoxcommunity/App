import Constants from 'expo-constants';

/**
 * Thin fetch wrapper for the Node/Express + MongoDB backend. Nothing calls it
 * yet — the app runs entirely on `src/data/mock.ts` — but the API modules are
 * written against this so swapping to live data is a one-line change in each.
 */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export async function request<T>(
  path: string,
  init: RequestInit & { language?: string } = {},
): Promise<T> {
  const { language, headers, ...rest } = init;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      // The backend returns both name_en and name_ar; this only picks defaults.
      ...(language ? { 'Accept-Language': language } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as Record<string, unknown>);
    throw new ApiError(
      (body.message as string) ?? response.statusText,
      response.status,
      body.code as string | undefined,
    );
  }

  return (await response.json()) as T;
}

/** Simulated latency so loading states are exercised against mock data. */
export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
