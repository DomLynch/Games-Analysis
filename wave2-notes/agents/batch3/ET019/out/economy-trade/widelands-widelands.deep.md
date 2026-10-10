# widelands-widelands (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/widelands-widelands/src/logic/map_objects/tribes/market.cc` (with `src/logic/trade_agreement.h`, `src/logic/game.cc` 1291-1515, `src/commands/cmd_propose_trade.cc` 60-82) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/widelands-widelands/COPYING`, "Version 2, June 1991"; `trade_agreement.h` header lines 6-7: "either version 2" and "of the License, or (at your option) any later version."; clean-room only) | C++ | symbol `Market` (class; `new_trade`, `try_launching_batch`, `is_ready_to_launch_batch`, `launch_batch`, `traded_ware_arrived`, `TradeInstance::check_illegal`)

Hint note: the list's hint file (`data/campaigns/tutorial04_economy.wmf/scripting/mission_thread.lua`) is the WRONG file. It is a tutorial script that drives the trade UI (`trading()`, 184-347, which clicks markets and proposes a trade). It does not implement the mechanism. Read: lines 1-60, and grep for trade, market, price, gold and buy. The mechanism is in C++.

Checked: Read in full: `trade_agreement.h` 1-112; `market.cc` 46-58, 107-137, 233-300, 355-438, 513-568, 631-674, 691-728; `game.cc` 1291-1397 (player match, propose, accept), 1422-1458 (cancel), 1497-1515 (extension proposal, validation only); `cmd_propose_trade.cc` 60-90. Not read: `market.cc` 300-332 (move), 439-512 (input queue lookup), 569-630 (overfull queue, fetch), 675-690 (log); `game.cc` 1399-1421 (retract), 1460-1496 (move), 1516-1690 (extension and action handlers); `cmd_trade_action.cc`. Confidence: high on the batch escrow, launch, arrival and completion, and the proposal validation. The constant-drift and assert points are read from code and were not run. Camera scope: not applicable.

## 1. Mechanism

Player trade here is a standing barter agreement between two Market buildings, one per player, sent in batches. There is no currency. The whole mechanism is a state machine with escrow.

(a) Propose (`cmd_propose_trade.cc` 60-82; `game.cc` 1321-1343). The command checks that the sender owns the initiating market (64) and is not the recipient (69-73). It then runs `check_illegal()` (75-79) and only if that passes stores the offer as proposed (`trade_.initiator = initiator`, 81-82; `propose_trade` 1330-1331) and messages the recipient (1333-1339). `propose_trade` also has `assert(trade.check_illegal().empty())` (1322), a C++ assert.

`check_illegal` (`market.cc` 691-728): batches must be at least 1 or infinite (695); each ware on each side must be 1 to 100 (701, 715); each side must carry 1 to 100 wares in total (706-711, 720-724). The batch-count test (692) compares against `kMaxWaresPerBatch`, not `kMaxBatches` (see section 6).

(b) Accept (`game.cc` 1345-1374). Accept is allowed only from the proposed state (1349). The offer becomes running and records the receiving market (1362-1363). Each market then gets a `TradeOrder`: the initiator gets `items_to_send` and the receiver gets `items_to_receive`, both with the same batch count (1365-1366; `new_trade` 233-260 builds one ware queue per item and one carrier queue of `num_wares_per_batch` slots, 248-255). Connectivity between the two markets is not checked (TODO at 1360).

(c) Batch launch (`market.cc` 355-437). `try_launching_batch` walks the trades and launches a batch only when both markets report ready (357-372). `is_ready_to_launch_batch` (377-406) requires: the trade is not paused (385-387); carrier queue full enough for one batch (390-393); every queued carrier idle and standing at this market (394-397); and every item of this side already queued in full (400-405). When both pass, `launch_batch` runs on each side (371-372). For each ware, the code takes a carrier and gives it the ware (415-423), removes the ware from the economy so it is not treated as idle (425-428), takes it off the queue (429-430), and sends the carrier to the other market (433-434).

(d) Arrival and completion (`market.cc` 631-673). Each arriving ware is counted for this batch (637), added to the receiving economy (641) and counted as consumed on the other side (651). A batch completes only when both sides have received a full batch: `received == num_wares_per_batch()` on each side (654-658). Then both shipped counters go up and both received counters reset (660-663). When shipped equals the total batch count, `game->cancel_trade(trade_id, true, ...)` ends the trade as a regular finish (664-667). `cancel_trade` (`game.cc` 1422-1458) removes both sides and sends the message (1436-1446).

(e) Pause and resume (`market.cc` 513-567). `set_paused` changes the flag at any time (532-543) and messages the other side (545-559). Which players may call it is in the command layer, which was not read. Resume is refused unless every ware queue and the carrier queue is full (518-530; checked at 538-541). A resume that succeeds immediately tries to launch a batch (564-566).

(f) Cancel (`market.cc` 107-136). Wares still in the queues are pushed back into the economy (124-131). A carrier already on a trade task gets a "trade" signal (113-115); any other carrier is sent back to the base flag (116-118). Nothing is refunded as money because nothing was paid.

(g) Extension (`game.cc` 1497-1515). Either party may propose more batches. The proposal is checked (1500-1511: batches 1 to 100 or infinite; the trade exists; the sender is a party; the trade is not infinite) and queued as an extension proposal (1513).

## 2. Key functions

- `TradeInstance::check_illegal`: `/mnt/frankendom-donors/widelands-widelands/src/logic/map_objects/tribes/market.cc` 691-728. Read in full.
- `Market::try_launching_batch` and `is_ready_to_launch_batch`: same file 355-406. Read in full.
- `Market::launch_batch`: same file 408-437. Read in full.
- `Market::traded_ware_arrived`: same file 631-673. Read in full.
- `Market::set_paused` and `can_resume`: same file 513-567. Read in full.
- `Market::TradeOrder::cleanup`: same file 107-136. Read in full.
- `Game::propose_trade`, `accept_trade`: `/mnt/frankendom-donors/widelands-widelands/src/logic/game.cc` 1321-1374. Read in full.
- `Game::cancel_trade`: same file 1422-1458. Read in full.
- `Game::propose_trade_extension`: same file 1497-1515 (validation and queueing only).
- Command guard: `/mnt/frankendom-donors/widelands-widelands/src/commands/cmd_propose_trade.cc` 60-82.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Batch size limit per ware, per side | 1 to `kMaxWaresPerBatch` = 100 (`trade_agreement.h` 38; checks 701, 715) |
| Wares per side per batch | At most 100 in total (`kMaxWaresPerBatch`, 709, 723) |
| Batch count | At least 1, or `kInfiniteTrade` = -1 (`trade_agreement.h` 35; 695) |
| Batch limit | `kMaxBatches` = 100 (`trade_agreement.h` 37) is declared but never used; the check at `market.cc` 692 and `game.cc` 1500 uses `kMaxWaresPerBatch` |
| Batch completes only when both sides are full | Mechanism (654-658), no number |
| Resume needs full buffers | Mechanism (525-529), no number |

## 4. TypeScript sketch

simplified: the sketch debits the sender's ledger when a leg is funded (escrow), where the donor takes the wares from the economy at launch and makes no money move. It refuses an overdraft instead of relying on queue limits. It checks that both legs are full as one test, which is the same as the donor's two-side test when each side is a single item list. It honours the pause flag but not the donor's resume rule (full buffers, 518-530). It has no cancel path (the donor returns queued wares to the economy, 124-131). It omits carriers and walking, the extension proposals, the connectivity check (absent in the donor too, 1360), the move-to-another-market path, and the donor's shipped-batch counters and statistics (642, 651).

```ts
// Licence: GPL-2.0-or-later (donor header). Clean-room sketch of the described mechanism; not a translation.
type Items = Record<string, number>;
type Account = string;

// One ledger: balances move only through post(), and every move is a row.
class Ledger {
  rows: { seq: number; account: Account; item: string; delta: number; reason: string }[] = [];
  private bal = new Map<string, number>();
  have(account: Account, item: string): number { return this.bal.get(account + "/" + item) ?? 0; }
  post(account: Account, item: string, delta: number, reason: string): void {
    const next = this.have(account, item) + delta;
    if (next < 0) throw new Error("overdraft refused");   // refuse, never clamp
    this.bal.set(account + "/" + item, next);
    this.rows.push({ seq: this.rows.length + 1, account, item, delta, reason });
  }
}

function covers(have: Items, need: Items): boolean {
  return Object.keys(need).every(k => (have[k] ?? 0) >= need[k]);
}

interface Trade {
  sides: [Account, Account];     // leg 0 goes from sides[0] to sides[1], leg 1 the other way
  perBatch: [Items, Items];      // items per batch on each leg
  batchesLeft: number;           // Infinity for an open-ended deal
  escrow: [Items, Items];        // taken from the sender, not yet launched
  transit: [Items, Items];       // launched, on the way
  arrived: [Items, Items];       // arrived for the current batch
  paused: boolean;
  done: boolean;
}

// Taking a leg's items from the sender into escrow (one ledger write per item).
function fund(l: Ledger, t: Trade, leg: 0 | 1): void {
  const from = t.sides[leg];
  for (const [item, n] of Object.entries(t.perBatch[leg])) {
    l.post(from, item, -n, "escrow for trade");
    t.escrow[leg][item] = (t.escrow[leg][item] ?? 0) + n;
  }
}

// A batch launches only when both legs are fully funded and the trade is not paused.
function tryLaunch(t: Trade): void {
  if (t.paused || t.done) return;
  for (const leg of [0, 1] as const) if (!covers(t.escrow[leg], t.perBatch[leg])) return;
  for (const leg of [0, 1] as const) {
    for (const [item, n] of Object.entries(t.perBatch[leg])) {
      t.escrow[leg][item] -= n;
      t.transit[leg][item] = (t.transit[leg][item] ?? 0) + n;
    }
  }
}

// Items reach the receiving side. The batch completes only when both legs have arrived in full.
function arrive(l: Ledger, t: Trade, leg: 0 | 1, item: string, n: number): void {
  t.transit[leg][item] -= n;
  t.arrived[leg][item] = (t.arrived[leg][item] ?? 0) + n;
  const legsDone = ([0, 1] as const).every(i => covers(t.arrived[i], t.perBatch[i]));
  if (!legsDone) return;
  for (const i of [0, 1] as const) {
    const to = t.sides[i === 0 ? 1 : 0];
    for (const [it, m] of Object.entries(t.perBatch[i])) l.post(to, it, m, "trade batch received");
    t.arrived[i] = {};
  }
  if (t.batchesLeft !== Infinity && --t.batchesLeft === 0) t.done = true;
  tryLaunch(t);
}
```

## 5. Lands in

- TARGET `origins/server/economy/trade-escrow.ts` (new module; the path is proposed and was not checked against the repo). A two-party standing trade: funded legs, a server-side launch, completion only when both sides have received, and a finish that is a single server write.
- Parity-checklist row 18 (loot roll and XP award): the closest row, and only a partial fit. Row 18 covers item ownership moving on a server-verified event; it has no row for player trade. The launch and completion run on the server, so the tick sub-line is "server tick: fixed step, input intake, per-tick NPC budget".
- Today: not checked; no current Frankendom trade file was read.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only; the sketch was written from the described mechanism)
- Brief rule served: one-character/one-ledger rule (HANDOFF "also usable" list); rules 1-10 n/a

## 6. Gaps and risks

- Server-verified: the only guard on a proposal is the command handler (`cmd_propose_trade.cc` 64-79). `propose_trade` relies on an `assert` (1322), which a release build may not check. Frankendom must validate at the server entry point and never rely on an assert.
- Accept: `accept_trade` checks the state (1349) but not who is accepting. The recipient check is `check_trade_player_matches` (1291-1310), called from the other trade actions (1519, 1549, 1590, 1630). Whether the accept path calls it is in `cmd_trade_action.cc`, which was not read. Frankendom must check every trade action against the two parties on the server.
- Constant drift: `kMaxBatches` (`trade_agreement.h` 37) is never used. The batch checks use `kMaxWaresPerBatch` (`market.cc` 692; `game.cc` 1500). Both are 100, so nothing breaks today. Frankendom should name one constant per limit.
- One ledger: the donor has no money and no ledger rows. Escrow here means a queue, and the wares leave the economy only at launch (425-428), not at offer. Our escrow debits the sender's gold or item balance at funding, and every debit and credit is a row.
- Connectivity: accept does not check that the two markets can reach each other (TODO, 1360). For us, a trade between zones needs an explicit rule, written as zone data.
- Infinite trades (`kInfiniteTrade`) never finish on their own (`game.cc` 1509, 1635-1661). Frankendom needs an explicit cap or a cancel rule.
- Cancel: the donor returns queued wares to the economy (124-131), which is safe only because nothing was paid. For us, cancel must refund each reserved item or gold exactly once, and the test must show it.
- Pause: resume needs full buffers (518-530). A server can copy the same fill check, but the rule must be a test, not a comment.

Best transferable idea: a standing two-party trade that starts a batch only when both sides have their items reserved, and finishes a batch only when both sides have received it in full, so neither side can be charged for a batch the other never delivered.
Decision (proposed): adapt - the launch and completion rules are a clean escrow pattern for player trade, but the walking carriers and the supply network do not fit, so Frankendom keeps the state machine and drops the transport.
Acceptance: two players agree a standing trade of 5 potions for 3 scrolls over 10 batches; a batch starts only when both have the goods reserved; when both sides have received, the batch counter reads 1 of 10 on both screens; cancelling refunds any reserved goods that have not started.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only)
Brief rule served: one-character/one-ledger rule (HANDOFF "also usable" list); rules 1-10 n/a
