# heroiclabs-nakama (inventory-bank-equipment, cell 2)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_wallet.go` | Licence: Apache-2.0 (LICENSE line 3: "Version 2.0, January 2004", Apache License 2.0; permissive, code may be adapted) | Go | symbol `UpdateWallets` (with `updateWallets`, `executeInTxPostgresPgx`, `MultiUpdate`)

Checked: Read in full: `UpdateWallets` (core_wallet.go 88-114), `updateWallets` (116-264), `ExecuteInTxPgx` and `executeInTxPostgresPgx` (db.go 409-461), `MultiUpdate` (core_multi.go 27-78). Callers read: Go single-user wrapper (runtime_go_nakama.go 2011-2028) and Go multi-user wallet wrapper (2060-2067) only; the Lua (runtime_lua_nakama.go 5917, 6046) and JS (runtime_javascript_nakama.go 4608, 4700) callers were NOT read. Tests: names listed, TestUpdateWalletRepeatedSingleUser (540-577) read; a grep for "negative" and "Insufficient" in core_wallet_test.go found no negative-balance test. The cell hint was INFERRED (no file given): the search for inventory, equip, loot, stash and bank (vendor/ and console/ excluded) found only Hiro inventory audit routes (server/console_audit.go 481-499, server/console_extensions.go 41-45); the inventory logic is not in this donor (not read). What IS here is the wallet ledger, which I read because it is the atomic-move mechanism for stackable balances. Confidence: high on the code path; moderate on topic fit (currency counts, not slots, stacks or equipment). camera_scope: not a camera note.

Best transferable idea: One all-or-nothing batch that reads the balances under lock, checks every change against a zero floor on copies, and writes the balances and one ledger row per change in the same transaction, so a bag-to-bank gold move cannot half-apply.
Decision (proposed): adapt — keep the stage-then-commit batch with a zero balance floor and one ledger row per change; drop the Postgres JSON-blob storage (Frankendom chooses its storage), throw on an unknown user instead of skipping, and sort the lock set. Why: it gives the one-ledger ruling a concrete shape for gold, XP and loot moves; the donor's silent skip and unsorted lock are defects, fixed in the sketch.
Acceptance: A server test calls the move with 50 gold from a bag holding 30: the call rejects, both balances and the ledger are unchanged; a move of 20 writes both balances and two ledger rows in one call; a move naming an unknown user throws and writes nothing.

## 1. Mechanism

- Entry point `UpdateWallets` (88-114) takes a list of updates (user ID, changeset of signed integer deltas, metadata string, and a flag whether to write the ledger). It returns at once for an empty list (89-91). Otherwise it runs `updateWallets` inside one transaction via `ExecuteInTxPgx` (95-97). On error it clears `Updated` on any returned result (106-109), so a failed batch reports no new balances; a `WalletNegativeError` is not logged as an error (103-105).
- Order of steps inside `updateWallets` (116-264), as the code runs:
  (a) Collect the user IDs (121-124). Read every user's wallet JSON in one query with `FOR UPDATE` (126-134) and decode each into a map of key to int64 (145-153).
  (b) For each update in input order (175-227): if the user is not in the map, skip the update silently (177-181). Make a deep copy of the previous balances for the result (184-186). For each key in the changeset (188-201): `newValue = walletMap[k] + v` (190); if `newValue < 0`, return a `WalletNegativeError` for the whole batch (191-199); otherwise set `walletMap[k] = newValue` (200). The result gets the previous copy and `Updated = walletMap` (203-204). The new map is marshalled to JSON (206-212). When the ledger is on, the changeset and metadata are queued with a fresh UUID per update (215-226).
  (c) Writes happen only after every update has passed the check (229-261). The affected user IDs are sorted (230-231), each wallet is written with one `UPDATE users` (234-246), and then all ledger rows go in one `INSERT ... SELECT unnest` (249-260).
- Transaction wrapper (`executeInTxPostgresPgx`, db.go 420-461): up to 5 attempts (437, 458). Each attempt begins a transaction with pgx default options (438), runs the function, and commits (442-443). Only an error whose SQLSTATE class is "40" (serialisation or deadlock) rolls back and retries (446-452); any other error returns at once (455). A deferred rollback covers the early exits (430-434).
- `MultiUpdate` (core_multi.go 27-78) puts account updates (41), storage writes (47), storage deletes (53) and these wallet updates (59) in one transaction (36). The in-memory storage index is refreshed only after the commit (73-75), so a failed multi-update leaves the index unchanged.
- Tick and timing: none. The mechanism is request-driven, one call per action, no loop.

## 2. Key functions

- `UpdateWallets`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_wallet.go` 88-114. Wraps the batch in one transaction and clears results on error.
- `updateWallets`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_wallet.go` 116-264. Lock, check-on-copies, sorted writes, one ledger insert.
- Balance check (inside `updateWallets`): `/mnt/frankendom-donors/heroiclabs-nakama/server/core_wallet.go` 188-201. Per key, rejects any new value below zero.
- Transaction retry: `/mnt/frankendom-donors/heroiclabs-nakama/server/db.go` 420-461 (`executeInTxPostgresPgx`).
- Multi-store commit: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_multi.go` 27-78 (`MultiUpdate`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| All-or-nothing batch: check every change on copies, write only if all pass | Zero floor: reject if the new value is below 0 (core_wallet.go 191) |
| Read the balances under lock before changing them | `FOR UPDATE` on the users rows (core_wallet.go 126) |
| One ledger row per update, in the same transaction as the balance write | One row per update, not per key (core_wallet.go 215-226, 249-260) |
| Retry only on serialisation or deadlock | SQLSTATE class "40" only (db.go 446) |
| Bounded retry | 5 attempts (db.go 437, 458) |
| Stable write order to reduce deadlocks | Sort the user IDs before the writes, not before the lock (core_wallet.go 230-231) |
| Multi-store commit, then in-memory index refresh | Index refresh after commit (core_multi.go 73-75) |

Balances are int64 (walletMap is `map[string]int64`, core_wallet.go 129). Sums are plain addition (190); I saw no overflow check in these lines.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (lock, check each change on copies, write balances and ledger only after every check passes), and it changes three things: it sorts the lock set before reading, it throws on an unknown user instead of skipping, and it copies `updated` at the time of each result so a later update in the same batch does not change it. It omits the real row lock, the 5-attempt retry on SQLSTATE class 40, the JSON-blob storage, the Cockroach path, the account and storage updates of `MultiUpdate`, and the UUID for ledger rows (a counter stands in). The `moveGold` helper is an illustration, not donor code.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/nakama-atomic-wallet-move.ts, with `export {}` appended): exit 0.

## 5. Lands in

- TARGET `src/fight/ledger.ts` (new module, one ledger for server-side moves of gold, XP and loot). Parity-checklist row 18 (loot roll and XP award), sub-line: server-verified grant, written in the same transaction as the balance.
- Today: not checked (the Frankendom repo was not read in this pass).
- Reuse tag: rewrite-from-idea (Apache-2.0 permits adapting; the sketch is written from the mechanism, storage excluded)
- Brief rule served: one ledger (rulings: one character and one ledger; server-verified changes); the inventory and equipment parts of cell 9 are not served by this donor.

## 6. Gaps and risks

- Defect 1, silent skip: `updateWallets` skips an update for an unknown user (core_wallet.go 177-181, comment at 179). The Go single-user wrapper turns the empty result into an error (runtime_go_nakama.go 2024-2025), but a multi-user caller gets no error for that user. fix: throw on an unknown user before any write (the sketch does this).
- Defect 2, lock order: the sort at 231 orders only the writes, and the comment at 230 says so; the `FOR UPDATE` query at 126 has no ORDER BY, so the lock order is whatever Postgres returns (the plan was not read). From the code, two batches that touch the same users in different orders could deadlock (inference, not tested); the retry on class 40 (db.go 446) would absorb it, up to 5 attempts. fix: sort the IDs before the lock (the sketch sorts the lock set).
- Defect 3, shared result map: `result.Updated = walletMap` (203) is the same map that later updates in the same batch change (200), so an earlier result for a repeated user can show a later balance. fix: copy at result time (the sketch copies).
- Currency only: this donor has no item slots, stacks, bank tabs or equipment. The stacking and equipment parts of cell 9 remain unanswered here (the Hiro inventory system is referenced only by console audit routes, console_audit.go 481-499; its code is not in the box).
- Storage is one JSON object per user (`UPDATE users ... wallet = $2`, core_wallet.go 241). That is fine for a handful of currency keys; Frankendom must decide its own storage. Do not copy the blob for inventories.
- No negative-balance test was found in core_wallet_test.go (grep), so the reject path is read from code only (core_wallet.go 191-199). Treat the acceptance test as the proof.
- Callers: Lua (5917, 6046) and JavaScript (4608, 4700) wrappers were not read; the claim that every caller gets the same behaviour is not checked for them.
- Retry: the retry re-runs the whole function, so the ledger UUIDs are regenerated per attempt (core_wallet.go 222 inside the function). A Frankendom retry must keep the ledger ID stable or de-duplicate it.
- Ledger metadata is a caller-supplied string (core_wallet.go 225, 252) that the code does not validate (not read further). Frankendom should validate it as data.
- The rule "server-verified kills" is not covered by this donor; this note covers only the ledger write.

Reuse tag: rewrite-from-idea (Apache-2.0; adapt allowed; sketch rewritten)
Brief rule served: one ledger; server-verified change; no client balance writes
