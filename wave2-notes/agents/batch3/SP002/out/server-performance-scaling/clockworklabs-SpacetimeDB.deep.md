# clockworklabs-SpacetimeDB (server-performance-scaling, cell 3)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/delta.rs` (`eval_delta`, 19-125), called from `core/src/subscription/module_subscription_manager.rs` (`eval_updates_sequential` 1347-1396; v2 fold 1398-1523; send worker 1836-1888) | Licence: Business Source License 1.1 (`LICENSE.txt`: "Business Source License 1.1"; Licensor Clockwork Laboratories, Inc.; Additional Use Grant applies) | Rust | symbol `eval_delta`

Checked: Read in full: `core/src/subscription/delta.rs` 1-125. Read in part: `module_subscription_manager.rs` 530-545 (send worker design comment), 1338-1396 (entry point), 1398-1420 and 1440-1525 (v2 fold; the row-encode body 1420-1440 not read), 1466-1480 (dedup and first call), 1636-1650 (the v1 caller, only up to the call), 1836-1888 (send worker run loop), 1842-1844 (queue creation); `subscription/src/lib.rs` 518-542 (plan-level insert and delete iterators, wrappers only); `client-api/src/routes/subscribe.rs` 547 (default queue length), 1084-1150 (inbound queue and disconnect, read to 1150), 618 (outbound channel, grep). Read in part: the `dropped` flag declaration (`module_subscription_manager.rs` 161-166), its removal (826-836), and where the send worker sets it (1998-2008). Grep only: callers of `eval_delta`. NOT read: `send_one_computed_queries` (per-client aggregation), `encode_v2_rows`, the subscription fragment internals (`fragments.for_each_insert`), whether the datastore's own transaction delta is net, durability batching (`durability/src/imp/local.rs`, grep only). Tests NOT run; sketch typecheck only. Confidence: high on the net-count arithmetic (traced by hand: one insert and three deletes of a row give two deletes; two inserts and one delete give one insert; zero inserts and two deletes give two deletes). Medium on the claim that the per-query dedup is right for multi-table joins (fragment code not read). Low on the single-table assumption that the datastore delta is already net (the donor's comment only). camera_scope: n/a.

## 1. Mechanism

- The datastore commits a transaction, and the subscription entry point (`module_subscription_manager.rs:1347`) runs the query work on the main thread while the datastore lock is still held. Its doc says it evaluates "only the necessary queries for those delta tables" (`1338-1340`), and that it runs single-threaded because the common update is small (`1343-1345`).
- The work is done in two folds. The v2 fold (`1398`) first keeps only tables that have changes (`1459`), then takes every query that touches a changed table (`1461`), and removes repeats by query hash for this transaction (`1463-1466`). So an identical query shared by many clients is evaluated once per transaction, not once per client.
- For each distinct query and plan fragment it calls `eval_delta(tx, metrics, plan)` (`1480`). `eval_delta` returns `None` for an empty change (`116-118`) and otherwise the lists `inserts` and `deletes` (`124`). It works in two modes:
  - Single-table plans (`42-53`): every insert and every delete is pushed as it comes. There is no counting. The donor's comment (`43`) says these plans never return redundant rows.
  - Join plans (`54-112`): inserts are counted per row (`57-68`). Each delete then looks up the row in the insert counts (`72`):
    - no insert for this row: the delete is counted in `delete_counts` (`76-82`);
    - an insert count of 0 (already used up by earlier deletes): the delete is counted in `delete_counts` (`88-91`);
    - an insert count above 0: the delete cancels one pending insert, so the count goes down by one (`97-100`).
    After all deletes, each row with a positive count is emitted that many times (`105-112`). The metric `duplicate_rows_sent` counts the extra copies (`106`, `110`).
- After the fold, a successful result is encoded once per query (`1501-1506`). Then one `V2ClientUpdate` is pushed per subscribed client and query set (`1507-1515`), and each one gets `rows.clone()` (`1513`). The donor's comment says the clone "is just cloning a reference to the row data" (`1512`).
- Hand-off: the entry point sends `SendWorkerMessage::Broadcast { tx_offset, queries }` to the send worker (`1389-1391`) and returns, so the datastore is unlocked before any network work (`1386-1388`). The worker is a separate tokio task (`1842-1843`). Its loop pops messages in order (`1848`), waits for the transaction offset (`1880-1883`), then calls `send_one_computed_queries` (`1884`), which is not read here. The doc says the worker "pops [`ComputedQueries`]es out in order" and "aggregates each client's full set of updates" (`530-531`).
- Client removal is not slow-client handling. When a subscription query errors during a transaction update, the send worker sends an error to that client and sets a per-client `dropped` flag (`2002-2005`, read); `remove_dropped_clients` later removes that client's subscriptions (`826-836`, read). The flag is declared at `161-166`. Nothing in the read code drops a client for a slow outbound queue.

## 2. Key functions

- `eval_delta`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/delta.rs` 19-125. Bag semantics stated at 12-14. Single-table branch 42-53. Join branch 54-113. Empty return 116-118. Result 124.
- `eval_updates_sequential`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/module_subscription_manager.rs` 1347-1396 (entry; hand-off at 1389-1391).
- `eval_updates_sequential_inner_v2` (v2 fold): `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/module_subscription_manager.rs` 1398-1523 (dedup 1463-1466; `eval_delta` 1480; encode once 1501; per-subscriber push 1507-1515).
- Send worker: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/module_subscription_manager.rs` 1836-1888 (queue at 1842; loop 1847-1888).
- Plan iterators (wrappers): `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/subscription/src/lib.rs` 520-542.
- Inbound queue, the only bounded queue found: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/client-api/src/routes/subscribe.rs` 547 (default 16384), 1091-1150 (queue, try_send, disconnect).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count inserts, cancel a delete against a pending insert, emit what is left (multiset difference) | None; the rule is in the code (`eval_delta` 54-112) |
| Emit a row as many times as its net count (bag semantics) | None (`107`, `111`) |
| Evaluate each distinct query once per transaction (dedup by hash) | None (`1463-1466`) |
| Encode the rows once and fan the same buffer out to every subscriber | None (`1501`, `1512-1513`) |
| Inbound queue bounded; overflow disconnects the client | Default 16384 requests (`client-api/.../subscribe.rs:547`); close reason "too many requests" (`1099`) |
| Outbound send queue | Unbounded (`module_subscription_manager.rs:1842`); length is a gauge, not a limit |

Counting worked out by hand from the code (not run): inserts of a row = 1, deletes = 3 gives 2 deletes emitted (`ins.n` 1 to 0 at the first delete; the next two go to `delete_counts`: 2). Inserts = 2, deletes = 1 gives 1 insert emitted. Inserts = 0, deletes = 2 gives 2 deletes emitted. The metric `duplicate_rows_sent` counts `n - 1` for each emitted row with count `n`.

## 4. TypeScript sketch

simplified: the sketch keeps the join branch's counting rules exactly: insert counts first, then deletes that either go to the delete counts or cancel a pending insert, and the positive counts are emitted repeated. It uses a string key in place of the projected row (the donor hashes the row value). It omits: the view projection (`plan.is_view()`), the metrics object, the error path (`eval_delta` returns `Err`), the encode step and the send worker. It differs in one place: it returns the duplicate counts even for an empty delta, where the donor adds them to metrics only when the delta is non-empty (`118-122`). The single-table branch is kept as a plain pass-through, as in the donor, with no netting.

```ts
// Licence: Business Source License 1.1 (donor LICENSE.txt). Restricted: clean-room, shape only; not a translation of the donor lines.
// clean-room
export interface Delta<Row> {
  inserts: Row[];
  deletes: Row[];
}

export interface DeltaResult<Row> {
  delta: Delta<Row> | null;   // null when nothing changed for this query
  duplicatesEvaluated: number;
  duplicatesSent: number;
}

// One query, one transaction. Inserts are counted first, then deletes cancel
// pending inserts of the same row; what is left is emitted with bag semantics.
export function evalDelta<Row>(
  forEachInsert: (f: (r: Row) => void) => void,
  forEachDelete: (f: (r: Row) => void) => void,
  keyOf: (r: Row) => string,
  isJoin: boolean,
): DeltaResult<Row> {
  const inserts: Row[] = [];
  const deletes: Row[] = [];
  let duplicatesEvaluated = 0;
  let duplicatesSent = 0;

  if (!isJoin) {
    // Single-table plans: no counting, every row is emitted once.
    forEachInsert((r) => { inserts.push(r); });
    forEachDelete((r) => { deletes.push(r); });
  } else {
    // A join can return the same row several times, so count per row.
    const insertCounts = new Map<string, { row: Row; n: number }>();
    const deleteCounts = new Map<string, { row: Row; n: number }>();

    forEachInsert((r) => {
      const k = keyOf(r);
      const e = insertCounts.get(k);
      if (e !== undefined) {
        duplicatesEvaluated += 1;
        e.n += 1;
      } else {
        insertCounts.set(k, { row: r, n: 1 });
      }
    });

    forEachDelete((r) => {
      const k = keyOf(r);
      const ins = insertCounts.get(k);
      if (ins === undefined) {
        // No insert for this row in this tx: a real delete.
        const d = deleteCounts.get(k);
        if (d !== undefined) { duplicatesEvaluated += 1; d.n += 1; }
        else deleteCounts.set(k, { row: r, n: 1 });
      } else if (ins.n === 0) {
        // Inserts already used up by earlier deletes: this one is a real delete too.
        duplicatesEvaluated += 1;
        const d = deleteCounts.get(k);
        if (d !== undefined) d.n += 1;
        else deleteCounts.set(k, { row: r, n: 1 });
      } else {
        // Cancels one pending insert: neither row is sent.
        duplicatesEvaluated += 1;
        ins.n -= 1;
      }
    });

    for (const { row, n } of insertCounts.values()) {
      if (n > 0) {
        duplicatesSent += n - 1;
        for (let i = 0; i < n; i++) inserts.push(row);
      }
    }
    for (const { row, n } of deleteCounts.values()) {
      if (n > 0) {
        duplicatesSent += n - 1;
        for (let i = 0; i < n; i++) deletes.push(row);
      }
    }
  }

  if (inserts.length === 0 && deletes.length === 0) {
    return { delta: null, duplicatesEvaluated, duplicatesSent };
  }
  return { delta: { inserts, deletes }, duplicatesEvaluated, duplicatesSent };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sync.ts` (new module: the per-tick delta of fight state for each viewer, encoded once and fanned out; the same zone or fight is one query). Frankendom's current sync code was not read in this pass.
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget": the per-tick send is the tail of that sub-line. No row names fan-out or delta sync; row 18 is the nearest.
- Reuse tag: rewrite-from-idea (BSL 1.1: clean-room, shape only; no code adopted)
- Brief rule served: 1 (one engine: the server computes the change once; the client only renders it); rule 8 (row 18 cited)

## 6. Gaps and risks

- Netting is for visibility, not for state. Frankendom's HP, damage and kill events are one-count facts on the one ledger: they must never be netted or deduplicated the way row counts are. Net only "enters or leaves a viewer's view" (spawn, despawn, move into range). Damage and kill events go out as ordered events.
- The donor's bag semantics come from SQL joins. Frankendom has no joins; the rule that carries over is "an entity added and removed in the same tick sends nothing".
- Unbounded outbound queue: the send worker channel is unbounded (`module_subscription_manager.rs:1842`) and only exports a gauge. A slow client does not stop the queue, so memory grows under a slow consumer. The only hard limit found is the inbound queue (16384 requests, `subscribe.rs:547`), which disconnects the client with "too many requests" (`1099`, `1117-1121`). Frankendom must set both an outbound bound and the shedding rule (which viewer is dropped, and when) on purpose.
- Ordering: the donor keeps updates in transaction order through one worker (`1847-1884`). Frankendom's one-ledger rule needs the same property: deltas for a tick are applied in tick order, and a client never sees a kill before its damage.
- The donor's comment that single-table plans never return redundant rows depends on the datastore's transaction delta being net. That was not read. Do not rely on it for Frankendom until the server's own delta is checked.
- Per-query dedup (`1463-1466`) is per transaction across all changed tables. It is correct only if one `eval_delta` call covers every changed table of the query. The fragment code (`subscription/src/lib.rs`) was not read, so this is a medium-confidence claim.
- Pit as client: the Pit renders deltas and never computes them. The Pit must not own a view.
- MAX_ATTACKERS = 3: the fan-out is per viewer, not per attacker. Many-on-one target selection is not in this code.
- Licence: BSL 1.1 has an Additional Use Grant that governs use of the Licensed Work. No code is adopted; the sketch is written from the shape only.
- Tests not run. Typecheck only: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0. Not executed.

Best transferable idea: per tick, evaluate each distinct view once (dedupe by query), emit only the net inserts and deletes of rows a viewer can see, encode them once, and fan the same bytes out to every viewer.

Decision (proposed): adapt. Keep the shape (one evaluation per distinct view, net enter and leave events, one encode, one fan-out) and drop bag semantics for HP and kills, which are one-count facts. Pair it with a bounded outbound queue and a written shedding rule, since the donor has none.

Acceptance: server test: with 3 viewers of one fight, the view is computed once per tick and encoded once (counter = 1) and each viewer gets the same bytes; an entity spawned and removed in the same tick sends no add and no remove; a tick with no change for a view sends nothing to that view's viewers; a viewer whose outbound queue is full is dropped by the stated rule, not by blocking the tick.

Reuse tag: rewrite-from-idea (BSL 1.1: clean-room, shape only; no code adopted)
Brief rule served: 1 (one engine computes the change once; the client renders it); rule 8 (row 18 cited)
