import { api, fromFils } from './client';
import type { CreditAccount, CreditEntry, Localized } from '../data/types';

type RawCreditAccount = { limit: number | null; balance: number; dueDate: string };
type RawCreditEntry = {
  id: string;
  kind: 'charge' | 'payment';
  title: Localized;
  subtitle: Localized;
  amount: number;
  balanceAfter: number;
  at: string;
};

/**
 * The backend ledger (§4.14) is append-only and tracks a running `balanceAfter`
 * per entry, but has no per-entry "settled" flag — D7 defines the balance as
 * the sum of all entries, not a set of individually-payable line items. The
 * app's UI wants to badge each purchase "Paid"/"Unpaid" regardless, so we
 * derive it here: a payment is always settled; a charge is settled once the
 * running balance reached zero at or after it (i.e. a later payment cleared
 * it), which is the closest honest proxy for "this purchase is paid off".
 */
function deriveSettled(entries: RawCreditEntry[]): boolean[] {
  let clearedFromHere = true;
  const settled: boolean[] = new Array(entries.length);
  // entries arrive newest-first; walk oldest-first to know what's "ahead".
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if (e.kind === 'payment') {
      settled[i] = true;
      clearedFromHere = e.balanceAfter <= 0;
    } else {
      settled[i] = clearedFromHere || e.balanceAfter <= 0;
      if (e.balanceAfter <= 0) clearedFromHere = true;
    }
  }
  return settled;
}

function mapEntries(raw: RawCreditEntry[]): CreditEntry[] {
  const settled = deriveSettled(raw);
  return raw.map((e, i) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    subtitle: e.subtitle,
    amount: fromFils(e.amount),
    settled: settled[i]!,
    at: e.at,
  }));
}

const ENTRY_PAGE = 25;

/** Combines GET /credit + the first page of GET /credit/entries — the app shows them as one account. */
export async function getCreditAccount(): Promise<CreditAccount> {
  const [account, page] = await Promise.all([
    api.get<RawCreditAccount>('/credit'),
    api.get<{ items: RawCreditEntry[]; nextCursor: string | null }>(`/credit/entries?limit=${ENTRY_PAGE}`),
  ]);
  return {
    // null is unlimited and must survive the conversion — fromFils(null)
    // would produce 0, i.e. the exact opposite meaning.
    limit: account.limit == null ? null : fromFils(account.limit),
    balance: fromFils(account.balance),
    dueDate: account.dueDate,
    entries: mapEntries(page.items),
    entriesCursor: page.nextCursor,
  };
}

/**
 * The next page of ledger entries. `settled` is derived by walking the list
 * oldest-first, so it must be recomputed over the combined set rather than
 * per-page — the caller passes the already-loaded raw entries back in.
 */
export async function listCreditEntries(cursor: string): Promise<{ entries: CreditEntry[]; nextCursor: string | null }> {
  const page = await api.get<{ items: RawCreditEntry[]; nextCursor: string | null }>(
    `/credit/entries?limit=${ENTRY_PAGE}&cursor=${encodeURIComponent(cursor)}`,
  );
  return { entries: mapEntries(page.items), nextCursor: page.nextCursor };
}

/** Not a real payment gateway (D12, §9.7) — recording a credit settlement is an admin/staff action; the app has no direct "pay now" endpoint. */
