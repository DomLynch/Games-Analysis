# clockworklabs-SpacetimeDB (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/tools/xtask-llm-benchmark/src/benchmarks/auth/t_045_rate_limit/answers/rust.rs` | Licence: Business Source License 1.1 (LICENSE.txt; Licensor Clockwork Laboratories, Inc.; Licensed Work SpacetimeDB 2.12.0) | Rust | symbol `limited_action`

Best transferable idea: the engine stamps the time and the caller, checks a per-identity window before any action work, and on rejection writes nothing and returns a typed error.
Decision (proposed): adapt - the gate shape fits intake, but Frankendom must return a typed RATE_LIMITED result instead of a panic, key the window per action kind, count server ticks instead of wall-clock microseconds, and guarantee no state change on rejection, because kills are server-verified and the server tick is the clock.
Acceptance: a server test sends two engage intents from one identity closer together than the window; the second returns RATE_LIMITED with a retry-after value and the duel state and ledger are unchanged, and an intent after the window is accepted.

Checked: Read the whole answer file (41 lines, `limited_action` at 20-41), its task text `tasks/rust.txt`, and the spec stub `spec.rs`. This is a benchmark reference answer for an LLM task, not shipped game code, so treat it as the shape of a per-identity rate gate, not as evidence of a production policy. The hint file `tools/ci/commands/update-flow/src/main.rs` is the wrong file (its only "ratelimit" mention, line 49, is about GitHub runner API limits). For the host side I read: `crates/client-api/src/routes/energy.rs` (whole), `crates/core/src/energy.rs` (whole), `crates/client-api-messages/src/energy.rs` (lines 1-140), `crates/core/src/host/wasm_common/module_host_actor.rs` (`call_reducer_with_tx`, 1063-1200), `crates/core/src/subscription/module_subscription_actor.rs` (196-206 and 2041-2068), `crates/client-api/src/routes/database.rs` (168-200, HTTP route only), and `crates/core/src/host/wasmtime/wasmtime_module.rs` (904-913). Confidence: high on the gate's order of operations (the file is short and fully read); medium on the host rollback path (read for the reducer call and commit arms, not end to end). (not read): the panic-to-trap mapping inside the wasm host, whether reducers are serialised per module, and the websocket reducer call path (only the HTTP route was read).

## 1. Mechanism

- One reducer, `limited_action`, checks a per-identity window before it does any work. Inputs: the caller's identity (`ctx.sender()`), the server clock (`ctx.timestamp`), and the payload string. Output: an `action_log` row, or a rejection.
- Order of steps as the code runs: (a) take `now` from the reducer context, in microseconds since the Unix epoch (21); (b) look up the caller's row in `rate_limit`, keyed by identity (22); (c) if a row exists and `now - last_call_us < 1_000_000`, panic with "rate limited" (23-24); (d) if the row exists and the call is allowed, update `last_call_us = now` (26-29); if no row exists, insert one with `last_call_us = now` (30-35); (e) insert an `action_log` row with the payload and the sender (36-40).
- The window moves only on accepted calls. A rejected call writes nothing, so repeated spam does not extend the lock-out.
- Rejection mechanics (host side, partly read): the code expects a panic to surface as a wasm trap (the panic-to-trap mapping is (not read)). If it does, `call_reducer_with_tx` marks the call trapped and sends the outer-error path (`module_host_actor.rs` 1120, 1123-1126). That path returns `FailedInternal` (or `OutOfEnergy` if the budget is spent) (1218-1227). A failed status is not committed: the mutable transaction is rolled back (`module_subscription_actor.rs` 2067-2068). So the rate-limit row and the log row are not written for a rejected call.
- Caller identity and time are server-side. `ctx.sender()` and `ctx.timestamp` are host-provided values, not payload fields. The HTTP route takes the identity from the auth claims (`database.rs` 168). The host stamps the reducer call time with `Timestamp::now()` at one site read (`module_host.rs` 2372; enclosing function not read).
- Tick: none. This is event-driven: one check per reducer call, synchronous within the transaction. No timer or loop is involved.

## 2. Key functions

- `limited_action`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/tools/xtask-llm-benchmark/src/benchmarks/auth/t_045_rate_limit/answers/rust.rs` 20-41. The whole gate: time, lookup, window check, row write, log write.
- `call_reducer_with_tx` (host, trap and status mapping): `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/host/wasm_common/module_host_actor.rs` 1063-1130 (read in part). A trap and a returned user error take different arms (1123 and 1128).
- Failed-status rollback: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/module_subscription_actor.rs` 2061-2068 (read in part): only `Committed` commits, the other statuses roll back.
- Per-call compute budget (a second mechanism, not the cell's main pick): `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/host/wasmtime/wasmtime_module.rs` 904-913 (`prepare_store_for_call` sets wasm fuel to the budget) and `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/client-api-messages/src/energy.rs` 137-142 (`PER_EXECUTION_SEC`, `DEFAULT_BUDGET`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-identity window: reject if the time since the last accepted call is under the window | Window 1_000_000 microseconds, i.e. 1 s (theirs, answer.rs 23) |
| Only accepted calls move the window | None (the update sits on the accepted path, 26-29) |
| Server clock, not client clock | `ctx.timestamp` (21), host `Timestamp::now()` (module_host.rs 2372) |
| Reject means no state change | Panic, then rollback of a failed status (module_subscription_actor.rs 2067-2068) |
| Per-call compute budget, traps when spent | 2_000_000_000 fuel per second (theirs, client-api-messages energy.rs 137); default budget = 60 s of fuel (theirs, energy.rs 142); the open-source energy monitor is a null implementation that always returns that default (core energy.rs 27, 33) |

## 4. TypeScript sketch

simplified: keeps the donor order (look up the identity's row, reject inside the window with no write, otherwise write the window row). It omits the `action_log` insert and its auto-increment id, the host transaction and rollback (the sketch relies on "no write before the check" instead), the views and subscriptions, and the `Identity` type (a string here). It replaces the donor's panic with a typed result, and adds `retryAfterUs`, which the donor does not return.

```ts
// Licence: BSL 1.1 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface RateRow {
  identity: string;
  lastAcceptedUs: number; // server clock, microseconds, of the last ACCEPTED call
}

export interface RateTable {
  get(identity: string): RateRow | undefined;
  set(row: RateRow): void;
}

export type GateResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMITED"; retryAfterUs: number };

const MIN_INTERVAL_US = 1_000_000; // 1 second window (donor constant)

// Runs inside the engine's single action step. nowUs must come from the server clock, never from the client.
export function admitAction(
  table: RateTable,
  identity: string,
  nowUs: number,
  minIntervalUs: number = MIN_INTERVAL_US,
): GateResult {
  const row = table.get(identity);
  if (row !== undefined) {
    const sinceUs = nowUs - row.lastAcceptedUs;
    if (sinceUs < minIntervalUs) {
      return { ok: false, code: "RATE_LIMITED", retryAfterUs: minIntervalUs - sinceUs };
    }
  }
  // Only accepted calls move the window; a rejected call writes nothing.
  table.set({ identity, lastAcceptedUs: nowUs });
  return { ok: true };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/AC006-rate-gate.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module): the engine's server-side intake gate, run before any fight action (engage, attack, guard) is applied. Only the server clock and the authenticated identity feed it.
- Parity-checklist row 5 (controls / input intake). No row fits exactly: row 18 (loot roll and XP award, server-verified) covers kills and rewards, and the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" is the closest tick-side home. Row 5 is the intake row, so it is the one cited.
- Reuse tag: rewrite-from-idea (BSL 1.1: clean-room, shape only)
- Brief rule served: server-verified actions (the gate decides in the engine, not in the client); no numbered brief rule applies directly.

## 6. Gaps and risks

- BSL 1.1: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- The donor file is a benchmark reference answer. It shows a gate, not a shipped anti-cheat policy. The open-source host also does not enforce per-identity energy: the energy monitor is a null implementation (core energy.rs 33), so the budget is the same for every caller.
- Rejection by panic is a gap for us. If the panic is a trap (see section 1, not fully read), the host records it as `FailedInternal`, so a client cannot tell "too fast" from a crash. Frankendom should return a typed rejection (the sketch's `RATE_LIMITED` result), so the client can show a too-fast cue and tests can assert the code.
- One row for every action is a gap. The donor keys one window to one identity and one reducer. If engage, attack and chat share a row, one action throttles the others. Frankendom needs a window per (identity, action kind), with the window length as data.
- Wall-clock microseconds make the gate untestable under replay and the fixed step. Frankendom should count server ticks, which keeps a test deterministic. The donor's `ctx.timestamp` is the wrong unit for us.
- The donor relies on the host transaction to undo writes on rejection. Frankendom's one-ledger ruling needs the same guarantee from the engine: a rejected intent must produce no state change, and a test should assert that.
- The gate keys on one identity only: one player with several connections or accounts is not limited across identities. The donor shows no cross-identity limit (not read beyond the energy monitor).
- The per-call fuel budget (60 s default) is a separate, DoS-style guard. Frankendom's per-tick NPC budget (row 18 sub-line) is the closer analogue; the donor's number is not a game number.

Reuse tag: rewrite-from-idea (BSL 1.1; clean-room, shape only)
Brief rule served: server-verified actions (intake gate in the engine); no numbered brief rule applies directly.
