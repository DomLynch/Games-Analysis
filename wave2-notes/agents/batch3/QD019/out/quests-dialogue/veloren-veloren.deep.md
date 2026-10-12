# veloren-veloren (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs (settlement in /mnt/frankendom-donors/veloren-veloren/rtsim/src/data/quest.rs) | Licence: GNU GPL version 3 (LICENSE read: "Version 3, 29 June 2007"; copyleft, clean-room shape only) | Rust | symbol Quests::resolve, resolve_take_deposit, finalize_courier_task, check_for_timeouts
Checked: opened rtsim/src/rule/npc_ai/quest.rs (1-546 and 567-620 and 832-904; not read: 547-566 get_nearest_spot, 621-831 labels and start dialogues), rtsim/src/data/quest.rs (26-152; 186-423; 153-185 partly: escort and slay constructors read at 156-179), rtsim/src/rule/npc_ai/dialogue.rs (25; 100-190; the rest (not read)), rtsim/src/rule/npc_ai/mod.rs (1497 only), LICENSE (head). Callers (grep over rtsim, server, common): resolve_take_deposit is called from quest.rs:468 and 523 and dialogue.rs:120 and 166; finalize_courier_task from dialogue.rs:164 only; create_deposit from quest.rs:196, 270, 347. Confidence: high on the escrow and the once-only settlement (read end to end); high on the hand-in order (read in dialogue.rs); medium on the race in section 6 (inferred from the order of calls and the comment at quest.rs:261; not run). camera_scope: not applicable.

## 1. Mechanism

A quest is a deposit held in escrow by the arbiter, a kind (escort, slay, courier), an optional deadline, and a settlement that can happen once.

Offer (quest_request, quest.rs:171-457): the NPC builds up to three candidate offers (escort 188-253, slay 256-328, courier 330-447). Each candidate first calls create_deposit (16-63), which proceeds only if the NPC's own inventory already holds the reward amount (rounded up, line 30). The NPC then asks yes or no. On yes the deposit is removed from the NPC's inventory and recorded in the quest (with_deposit, e.g. 210, 287, 371). One candidate is chosen at random (454); if none exists the NPC says there is nothing to offer (449-451).

Creation: create_quest (161-169) registers the quest id at once (163) and queues the quest for insertion at the end of the rtsim tick (the doc comment, 158-160; the store, data/quest.rs:27-30 and 63-69).

Settlement (Quest::resolve, data/quest.rs:228-245): only the arbiter may resolve (229). The resolution is a single atomic compare-and-exchange from 0 (open) to 1 (failed) or 2 (succeeded) (236-241). The deposit is returned only when the exchange succeeds (243). Resolution never goes back (data/quest.rs:145-147), so the deposit is paid once.

Timeout (check_for_timeouts, quest.rs:459-493): for each quest related to this NPC with a timeout, if now is strictly after the timeout (466), it resolves as failed (468). The deposit goes back into the arbiter's inventory (resolve_take_deposit, 66-108, push at 91-99). A quest that has already been resolved returns an error here and nothing happens (66-70 and 105-107).

Success paths: escort (escorted, 495-537): when the escorter reaches the destination, the quest resolves true and the deposit is given to the player as a gift (523-524). Slay and courier claims (dialogue.rs:118-131, 163-177) do the same through resolve_take_deposit(true).

Courier hand-in, the order that matters (dialogue.rs:163-177): first finalize_courier_task (quest.rs:122-155) checks that the messenger (the player) holds every required item (137-139), then removes them (141-149). Only if that returned true does it call resolve_take_deposit(true) (165-166). If the settlement then fails, the dialogue says the items are lacking (175).

Quest data: the courier variants are a fixed table of five kinds (data/quest.rs:384-403); one is rolled uniformly (833-836). Each variant has an allowed payload and recipient; a payload that needs a spot is dropped when no spot is found (886-891).

## 2. Key functions

- Quest::resolve (data/quest.rs:228): the once-only settlement, a method on one quest. Caller: resolve_take_deposit (quest.rs:75).
- resolve_take_deposit (quest.rs:66): returns the escrow to the arbiter's inventory, or reports that nothing was settled. Callers: quest.rs:468, 523; dialogue.rs:120, 166.
- create_deposit (quest.rs:16): offer-time escrow check and take. Callers: quest.rs:196, 270, 347.
- finalize_courier_task (quest.rs:122): check then remove the courier's items. Caller: dialogue.rs:164.
- check_for_timeouts (quest.rs:459): fail overdue quests. Caller: npc_ai/mod.rs:1497.
- quest_request (quest.rs:171): build the candidate offers and pick one.

## 3. Numbers vs mechanism

- Escort: destination site must be 1000 to 5000 world units away (188); reward is distance / 5 (193); time limit is 1 + distance / 80 minutes (195); the escorter follows at 5 units (500) and stops within 150 units of the destination (514).
- Slay: reward 1000 coins (269); the target must be within 2500 units (264); timeout 60 minutes (288).
- Courier: timeout 180 minutes (364); distance cap 5000 units (563); reward by variant (589-614): message max(150, 1000 * d / 5000); gnarling carving to another NPC max(500, 1400 * d / 5000); gnarling carving to the giver 350; legoom leaf to another NPC max(400, 1200 * d / 5000); legoom leaf to the giver 200. The distance is fixed once at quest start (data/quest.rs:421).
- Deadline check is strict: expired when now is after the timeout (466).
- Rounding: deposit taken as ceil (quest.rs:30 and 47), refunded as floor (89). The comment at 88 says the rounding down avoids precision exploits.
- Courier variant roll: uniform over five entries (833-836).

## 4. TypeScript sketch

simplified: one holder's stock is a Map (no stacks, no item definitions, no inventory-full failure: the donor ignores a failed push at quest.rs:99, the sketch returns the refund to the caller, who must handle failure), no dialogue or markers, no quest creation at tick end, no escort or slay constructors. Fixes applied: take and refund use one rounding rule (floor); the courier hand-in checks items and settlement, then consumes, then settles, so settlement cannot fail after items are gone (the donor order is consume then settle). Keeps: arbiter-only and once-only settlement, expiry strictly after the deadline, a random pick among offers. Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, exit 0.

```ts
// Escrowed-deposit quest with once-only settlement (shape of the veloren rtsim quest rule; clean-room).
type Stock = Map<string, number>;                       // item id -> count, one holder's inventory
type Payout = { item: string; amount: number };
type Quest = {
  id: number;
  arbiter: string;                                      // only this holder may settle
  deposit: Payout | null;                               // escrowed reward
  timeoutAt: number | null;                             // expired only when now is strictly later
  resolution: 0 | 1 | 2;                                // 0 open, 1 failed, 2 succeeded; never goes back
};

// Offer: the arbiter must already hold the amount; the escrow is taken only when the player says yes.
// simplified-rounding fix: the donor takes ceil and refunds floor; this sketch uses floor for both.
function takeDeposit(stock: Stock, item: string, amount: number): Payout | null {
  const need = Math.floor(amount);
  if ((stock.get(item) ?? 0) < need) return null;
  stock.set(item, (stock.get(item) ?? 0) - need);
  return { item, amount: need };
}

// Pure check first, so settle can never fail after items have been removed.
function canSettle(q: Quest, requester: string): boolean {
  return requester === q.arbiter && q.resolution === 0;
}

// Settle exactly once; a second call returns null (stands in for compare_exchange from 0).
function settle(q: Quest, requester: string, success: boolean): Payout | null {
  if (!canSettle(q, requester)) return null;
  q.resolution = success ? 2 : 1;
  return q.deposit;
}

// Hand-in as one step: check items and settlement, then consume, then settle.
function handIn(q: Quest, stock: Stock, required: [string, number][], requester: string):
  { ok: true; paid: Payout | null } | { ok: false; reason: string } {
  for (const [item, n] of required) {
    if ((stock.get(item) ?? 0) < n) return { ok: false, reason: 'lacks items' };
  }
  if (!canSettle(q, requester)) return { ok: false, reason: 'already settled' };
  for (const [item, n] of required) stock.set(item, (stock.get(item) ?? 0) - n);
  return { ok: true, paid: settle(q, requester, true) };
}

// Timeouts: each quest that has passed its deadline is failed once; the escrow goes back to the arbiter.
function expire(quests: Quest[], now: number): { quest: Quest; refund: Payout }[] {
  const out: { quest: Quest; refund: Payout }[] = [];
  for (const q of quests) {
    if (q.timeoutAt !== null && now > q.timeoutAt) {
      const refund = settle(q, q.arbiter, false);
      if (refund) out.push({ quest: q, refund });
    }
  }
  return out;
}

// Dialogue offer: pick one affordable candidate at random, or nothing.
function pickOffer<T>(candidates: T[], rand: () => number): T | null {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rand() * candidates.length)];
}

export {};
```

## 5. Lands in

Target: origins/server/quest-escrow.ts (proposed new file; not checked against the Frankendom repo). Parity row 18 (loot roll and XP award): the reward is paid from escrow on success and returned on failure. Sub-line: hand-in reward and settlement in one step, once only.

## 6. Gaps and risks

Against Frankendom's rulings (one ledger, server-verified, zones as data):
- Hand-in order is consume then settle (dialogue.rs:164-166, and the && chain). If the quest is settled between the menu opening and the claim (for example by check_for_timeouts), the items are consumed and the player is told they lack items (175). Read from the order; not run. Fix: check settlement first, consume, then settle (the sketch's handIn).
- Rounding asymmetry: taken as ceil (quest.rs:30, 47), refunded as floor (89). Up to one unit is lost per deposit. Fix: one rule for both (floor in the sketch).
- Refund failure is ignored: `let _ = inv.push(item);` (quest.rs:99). The quest is already settled when this runs, so a full inventory loses the escrow without a message. Fix: check space before settling, or settle only after the push succeeds with a rollback.
- Slay quest uses the escort constant for its deposit (quest.rs:287 uses ESCORT_REWARD_ITEM; the slay constant is at 256). Same value (coin) today. Fix: use the slay constant.
- Target race: the slay target filter is `related_to(...).count() == 0` (quest.rs:262), and the comment admits "imperfect: race conditions" (261). Quests are inserted only at tick end (create_quest, 161-169), so two NPCs can pick the same monster in one tick. Fix: claim the target atomically at registration.
- Courier check and removal (quest.rs:137-149): presence is checked for all items, then removed one by one with no rollback in the removal loop. Whether a removal can fail after the presence check passed is not verified. Fix: remove all or none (the sketch's consume loop assumes the check covers it).
- Escort site choice is seeded by a 15-minute window (quest.rs:191) and marked with a TODO ("Don't do this", 190). Fix: store the chosen site as quest data at creation.
- Not read: get_nearest_spot (547-566), the start dialogue text (621-831), what_items_needed in dialogue.rs (after line 190).

Reuse tag: adopt the escrow and once-only settlement (monotonic resolution, one winner, arbiter-only). Adapt the hand-in order and the refund path. Brief rule served: one ledger (escrow is held in the arbiter's inventory and paid once), server-verified (only the arbiter may settle; the server checks items before consuming), zones as data (courier variants are a table, quest distances and rewards are numbers in one place).

Best transferable idea: hold a reward as escrow with the arbiter at offer time, and settle it exactly once, with the check, consume, settle order, so a timeout or a claim can never pay twice or take items without paying.
Decision (proposed): adapt - the escrow and once-only settlement are the right shape for stakes and timed quests, but the donor's order (consume then settle), its rounding and its ignored refund failure must be fixed in our version (see the sketch and section 6).
Acceptance: a player accepts a slay quest with a 1000-coin escrow; if the timeout passes the escrow returns to the NPC once; if the player claims a courier after the timeout has already settled the quest, no items are taken and the player is told the quest is closed; a server test asserts both.
