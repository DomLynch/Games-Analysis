# clockworklabs-SpacetimeDB (economy-trade, cell 2)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/templates/money-exchange-react-ts/spacetimedb/src/index.ts` | Licence: Business Source License 1.1 (repo `LICENSE.txt`, line 3: "Business Source License 1.1"; Licensed Work SpacetimeDB 2.12.0; restricted, not an open-source licence) | TypeScript (SpacetimeDB module) | symbols `transfer` (100-154), `onConnect` (44-51), `my_account` / `my_account_changes` (53-63)

Checked: read the whole money-exchange module (154 lines) and its README (50 lines, whole file). The hint file (`templates/keynote-2/src/demo.ts`) is wrong: it is a benchmark driver that runs the connectors and seeds accounts (453 lines, opened the top and grepped; no transfer logic). Also opened: the benchmark answer for `t_055_atomic_idempotent_transfer/answers/typescript.ts` (29 lines, whole file) and its `spec.rs` (44 lines, whole file). Grep only, not read in full: the keynote-2 copies of `transfer` in `templates/keynote-2/rust_module/src/lib.rs` (35-60) and `templates/keynote-2/spacetimedb/src/index.ts` (29-59). Grep shows the same kind of balance check and two balance writes; I did not read them whole. Confidence high on the module logic. Not read: SpacetimeDB's own reducer runtime, i.e. whether a thrown error rolls back the writes. The README states it (35-36); the runtime is not in the donor's module code. camera_scope: n/a (economy topic).

## 1. Mechanism

- A zero-sum money transfer between two private accounts, with a public name directory and an audit row on each side. Money is only ever moved, never created or destroyed. Each account is a single integer balance in cents (u64). The module's only money source is the starting grant on first connection.
- Starting grant, `onConnect` (44-51): on each client connection, if the caller has no account row, one is inserted with `STARTING_BALANCE_CENTS` (3, 10_000 = $100.00 per the README line 29). It runs on every connection, but inserts only once per identity, so it is in effect a one-time grant per identity. Nothing caps how many identities can get it.
- Transfer, `transfer` (100-154). Order of steps, all checks before any write:
  (a) the sender must have a directory name (103-106; the throw is at 105); (b) self-transfer refused (107-109); (c) zero amount refused (110-112); (d) recipient must have a directory name (113-115); (e) both account rows must exist (117-121); (f) insufficient funds refused: `fromAccount.balanceCents < amountCents` (122-124); (g) recipient overflow refused: `toAccount.balanceCents > MAX_U64 - amountCents` (125-127). Then the writes: sender debited (129-132), recipient credited (133-136), a `Debit` audit row for the sender (137-144), and a `Credit` audit row for the recipient (145-152). The donor README says the writes are one transaction and an error aborts all of it (35-36).
- There is no sink, no tax and no minting in the module. The sum of all balances is unchanged by `transfer`.
- Privacy: `account` and `account_change` are private tables (17 and 30-39). The `my_account` view returns the caller's own account (53-57). The `my_account_changes` view returns the caller's own change rows through the `accountIdentity` index (59-63). The recipient directory exposes names and identities only (7-14).
- Tick: event-driven. One reducer call per payment, synchronous, no timer.

## 2. Key functions

- `transfer`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/templates/money-exchange-react-ts/spacetimedb/src/index.ts` 100-154. The whole pipeline (checks, two balance writes, two audit rows).
- `onConnect`, the starting grant: same file 44-51.
- `my_account_changes`, the per-caller history view: same file 59-63.
- Benchmark answer `transfer`, the retry guard (the one thing the module lacks): `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/tools/xtask-llm-benchmark/src/benchmarks/reducers/t_055_atomic_idempotent_transfer/answers/typescript.ts` 16-29. A `requestId` row is checked first (19, a repeat returns) and written with the transfer (27). Its spec (`spec.rs` 27-40) tests `transfer_once` and `duplicate_transfer_is_noop`. This is a benchmark answer, not the product module.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Check every rule, then write both sides and both audit rows (122-152) | None (the rule) |
| Zero-sum: the sender loses exactly what the recipient gains (131, 135) | None |
| Recipient overflow guard on a u64 balance (125) | Ceiling `(1n << 64n) - 1n` (5) |
| Refuse zero amounts (110) | Minimum 1 cent (the rule) |
| Starting grant on first connection (48) | 10_000 cents = $100.00 (3); the README calls it play money (README 48-50) |
| Per-caller history view (62) | None |
| Retry guard by request id (benchmark answer, 19) | Not in the product module |

## 4. TypeScript sketch

simplified: an in-memory class instead of SpacetimeDB tables and reducers. It keeps the donor's order (every check, then all writes), and it adds the request-id retry guard from the benchmark answer, which the donor module lacks. It omits the directory and name rules (103-106, 113-115), the private views (53-63), the connection hook as an event (the sketch calls `connect()` by hand), the runtime's rollback (the sketch avoids needing it by checking before writing), and the bounded history (`seenRequests` and `changes` grow without limit here, as the donor's table does).

```ts
// Licence of donor: Business Source License 1.1 (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Cents = bigint;
const MAX_U64 = (1n << 64n) - 1n;

interface Account { id: string; balanceCents: Cents; }
interface ChangeRow { requestId: string; accountId: string; counterparty: string; direction: "Debit" | "Credit"; amountCents: Cents; at: number; }

class Ledger {
  private accounts = new Map<string, Account>();
  private seenRequests = new Set<string>();
  private changes: ChangeRow[] = [];

  constructor(private readonly startingCents: Cents) {}

  // Faucet: the first connection of an identity creates its account with the starting balance.
  connect(id: string): void {
    if (!this.accounts.has(id)) this.accounts.set(id, { id, balanceCents: this.startingCents });
  }

  balanceOf(id: string): Cents | undefined {
    return this.accounts.get(id)?.balanceCents;
  }

  history(id: string): ChangeRow[] {
    return this.changes.filter(c => c.accountId === id);
  }

  // Zero-sum transfer. Every check runs before any write, so a refused call changes nothing.
  // requestId makes a retried call a no-op (idempotency), a gap in the donor's module.
  transfer(requestId: string, fromId: string, toId: string, amount: Cents, at: number): "done" | "duplicate" {
    if (this.seenRequests.has(requestId)) return "duplicate";
    if (fromId === toId) throw new Error("You cannot send money to yourself");
    if (amount <= 0n) throw new Error("Amount must be greater than zero");
    const from = this.accounts.get(fromId);
    const to = this.accounts.get(toId);
    if (!from || !to) throw new Error("Account does not exist");
    if (from.balanceCents < amount) throw new Error("Insufficient funds");
    if (to.balanceCents > MAX_U64 - amount) throw new Error("Recipient balance is too large");

    // All checks passed: write both sides and both audit rows.
    from.balanceCents -= amount;
    to.balanceCents += amount;
    this.changes.push({ requestId, accountId: fromId, counterparty: toId, direction: "Debit", amountCents: amount, at });
    this.changes.push({ requestId, accountId: toId, counterparty: fromId, direction: "Credit", amountCents: amount, at });
    this.seenRequests.add(requestId);
    return "done";
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed. Run on the VPS (10_000 start; alice pays bob 4_000 under r1): alice 6_000, bob 14_000 (done). The same r1 again: duplicate, balances unchanged. A 1_000_000 payment: refused "Insufficient funds", nothing written, alice's history holds one Debit row. A self-payment: refused.

## 5. Lands in

- TARGET `origins/server/ledger.ts` (proposed new module; I did not check the Frankendom tree, and no existing file is named here). The transfer and the grant run only on the server. Clients read their own balance and history rows and never write them.
- Parity-checklist row: none. The closest row is 18 (loot roll and XP award), but a player-to-player transfer is not a loot or XP rule, so I did not file it there. No row 1-23 covers trade or currency. Flagged for Lead.
- Reuse tag: rewrite-from-idea (BSL 1.1: clean-room, shape only; do not copy the module)
- Brief rule served: one ledger (every change is a debit and a credit row in one call, and the sum is unchanged); server-verified (the server checks every rule, the client only reads the private views)

## 6. Gaps and risks

- Licence: BSL 1.1, restricted. Shape only, clean-room. The sketch was written from the mechanism and is not a translation.
- No retry guard: a repeated call (double click, lost reply, reconnect) pays twice. The module has no request id. The benchmark answer (t_055, `answers/typescript.ts` 19) shows the fix. That answer is not the product module, so it is a design reference only.
- No sink and no inflation control: the transfer is zero-sum, and the only money source is the starting grant on connection (44-51), which has no cap on how many identities get it. Frankendom needs a capped grant or a sink (a tax or a fee), set as zone data or an engine constant.
- Sender check: this module checks the sender's funds (122-124). The BAR gadget in the same comparison does not (see the cell-1 note, 54-87). Frankendom must keep the check on the server.
- Atomicity: the module relies on the runtime rolling back writes when a reducer throws (README 35-36). The runtime is not in the donor's module code and was not read. Frankendom's server must guarantee the same: check all, then write all, in one transaction.
- Audit rows grow without limit. `my_account_changes` (62) returns every row for the caller. Frankendom must decide the history retention (for example, keep the last N rows per account and archive the rest).
- Balances are integer cents (u64). The client formats them (`formatMoney`, App.tsx 198 and 240, not read in full). Frankendom's ledger must keep integers and do the formatting on the client only.
- The recipient needs a directory name before anyone can pay them (113-115), so the directory is a gate on trade. Frankendom's trade rules must say whether that gate exists.
- No item trade, no market, no price: the module moves money only. Item shops and auctions are not covered by this donor. A separate read of another donor is needed for those.

Best transferable idea: a zero-sum transfer that checks every rule first (funds, self, zero, overflow), then writes both balances and two audit rows, so a refused call changes nothing and every change can be read back per account.

Decision (proposed): adapt — take the two-row audit ledger and the check-all-then-write order, which is the one-ledger shape we want; add a request id for retries (from t_055) and turn the starting grant into a capped data field instead of an open grant on every new identity.
Acceptance: a server test: alice (100.00) pays bob 40.00 under request r1, leaving alice 60.00 and bob 40.00 with one Debit and one Credit row; the same r1 again changes nothing; a 1000.00 payment is refused and writes no rows; a self-payment is refused.
