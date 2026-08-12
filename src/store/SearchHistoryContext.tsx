import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const HISTORY_KEY = '@freshcart/search-history';

/** How many past searches survive. The home rail renders all of them. */
export const MAX_HISTORY = 5;

type SearchHistoryContextValue = {
  /** Raw query strings, most recent first, never longer than `MAX_HISTORY`. */
  history: string[];
  /** Records a submitted query. Blank input and duplicates are absorbed here. */
  recordSearch: (query: string) => void;
  clearHistory: () => void;
};

const SearchHistoryContext = createContext<SearchHistoryContextValue | null>(null);

/**
 * Search history is what the customer actually typed, so entries are stored as
 * plain strings rather than the `{ en, ar }` shape the seeded catalog uses —
 * there is nothing to translate, and a query typed in Arabic must come back
 * verbatim when the app is switched to English.
 */
export function SearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as unknown;
          if (Array.isArray(saved)) {
            setHistory(saved.filter((q): q is string => typeof q === 'string').slice(0, MAX_HISTORY));
          }
        }
      } catch {
        // A corrupt history is the same as no history — never block the home
        // screen on it.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Guarded on `hydrated` so the empty initial state never overwrites a stored
  // history before the read above lands.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => undefined);
  }, [history, hydrated]);

  const recordSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory((list) =>
      [
        trimmed,
        // Case-insensitive: searching "Milk" after "milk" should move the one
        // entry back to the front rather than stack a near-duplicate.
        ...list.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_HISTORY),
    );
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo(
    () => ({ history, recordSearch, clearHistory }),
    [history, recordSearch, clearHistory],
  );

  return <SearchHistoryContext.Provider value={value}>{children}</SearchHistoryContext.Provider>;
}

export function useSearchHistory() {
  const value = useContext(SearchHistoryContext);
  if (!value) throw new Error('useSearchHistory must be used inside a SearchHistoryProvider');
  return value;
}
