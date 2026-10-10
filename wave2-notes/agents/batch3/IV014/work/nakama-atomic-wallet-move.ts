// Licence: Apache-2.0 (donor). Adapted shape, rewritten in TypeScript from the described mechanism; not a line-by-line translation.
type Changeset = Record<string, number>;

interface WalletUpdate {
  userId: string;
  changeset: Changeset;
  metadata: string;
}

interface WalletUpdateResult {
  userId: string;
  previous: Record<string, number>;
  updated: Record<string, number>;
}

interface LedgerRow {
  id: number;
  userId: string;
  changeset: Changeset;
  metadata: string;
}

// One store holds every balance and the ledger, so one commit moves them together.
interface LedgerStore {
  wallets: Map<string, Record<string, number>>;
  ledger: LedgerRow[];
  nextId: number;
}

class WalletNegativeError extends Error {
  constructor(
    readonly userId: string,
    readonly path: string,
    readonly current: number,
    readonly amount: number,
  ) {
    super(`insufficient ${path} for ${userId}`);
  }
}

// All updates apply or none do. Balances are read into copies, every changeset is checked
// against those copies, and the store is written only after every check has passed.
function applyWalletUpdates(
  store: LedgerStore,
  updates: WalletUpdate[],
  writeLedger: boolean,
): WalletUpdateResult[] {
  // Lock step (a database would run SELECT ... FOR UPDATE over these IDs). Sorted, so every
  // move takes the rows in the same order.
  const lockOrder = [...new Set(updates.map((u) => u.userId))].sort();
  const staged = new Map<string, Record<string, number>>();
  for (const id of lockOrder) {
    const wallet = store.wallets.get(id);
    if (!wallet) throw new Error(`unknown user ${id}`); // fix: the donor skips an unknown user silently
    staged.set(id, { ...wallet });
  }

  // Check and apply each changeset in input order, on the staged copies.
  const results: WalletUpdateResult[] = [];
  const rows: LedgerRow[] = [];
  for (const u of updates) {
    const wallet = staged.get(u.userId)!; // every ID was staged above
    const previous = { ...wallet };
    for (const [path, amount] of Object.entries(u.changeset)) {
      const current = wallet[path] ?? 0;
      const next = current + amount;
      if (next < 0) throw new WalletNegativeError(u.userId, path, current, amount);
      wallet[path] = next;
    }
    results.push({ userId: u.userId, previous, updated: { ...wallet } });
    if (writeLedger) {
      rows.push({ id: store.nextId++, userId: u.userId, changeset: { ...u.changeset }, metadata: u.metadata });
    }
  }

  // Commit. Nothing above wrote to the store, so a throw leaves it unchanged.
  for (const [id, wallet] of staged) store.wallets.set(id, wallet);
  store.ledger.push(...rows);
  return results;
}

// A move between a bag and a bank is two changesets in one call: both apply or neither does.
function moveGold(store: LedgerStore, from: string, to: string, amount: number): WalletUpdateResult[] {
  return applyWalletUpdates(
    store,
    [
      { userId: from, changeset: { gold: -amount }, metadata: "bank-deposit" },
      { userId: to, changeset: { gold: amount }, metadata: "bank-deposit" },
    ],
    true,
  );
}

export {};
