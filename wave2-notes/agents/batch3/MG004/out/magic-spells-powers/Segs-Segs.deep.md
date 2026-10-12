# Segs-Segs (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/Segs-Segs/Servers/MapServer/WorldSimulation.cpp` | Licence: BSD-3-Clause (repo `LICENSE.md`: "BSD 3-Clause License", Copyright (c) 2006-2020 SEGS Project; code may be adapted) | C++ | symbol `World::checkActivationTimers`

Checked: Read: the power activation timers (WorldSimulation.cpp from 179: the charge, fire and default-power branches), the recharge timers (from 252), the toggle timers (from 269), the sim step (from 30), the per-entity update order (381-385), the regen formulas (342-348). Read: the power check and queue (DataHelpers.cpp 721-788 for `checkPower`; `usePower` from 792; the recharge and range helpers from 831; `queuePower` from 851; `queueRecharge` 900-904), the start of `doPower` (910-925), the endurance step (966), the packet-side dequeue (MessageHelpers.cpp 548-572), the block check and movement (EntityHelpers.cpp 380-400), the power template fields (power_definitions.h 226-242), the queue containers (Entity.h 229-231), and the abort handler (MapInstance.cpp 2318-2332). Callers checked by grep: `checkPowerBlock` has three (DataHelpers.cpp 769 and 806, WorldSimulation.cpp 188); the three timer functions have one caller (WorldSimulation.cpp 383-385); `InterruptTime` appears only in serializers. Confidence: high for the queue, charge, recharge, toggle and block rules; medium for regen (formula read, base values not read). Not read: the body of `doPower` after the endurance step (effects, hit timing), the power template loader and per-power numbers (data files), and the NPC power path. (The toggle group rule is line-recorded: queuePower 875-889.)

## 1. Mechanism

- Per player there is a queue of powers (Entity.h:229, a deque), a list of recharging powers (Entity.h:231), and a list of toggles that are on (Entity.h:230).
- Use (DataHelpers.cpp 721-788, `checkPower`): endurance must cover the cost (752). Before that, pressing a toggle that is already on switches it off and returns, with no cost or range check (733-745). A target must be valid (`checkPowerTarget`, return on failure). A block stops it (769). Then a range check (776) and a recharge check (782), each with a message. Then `queuePower` (787).
- Toggle group rule (queuePower 875-889): queueing a toggle with a GroupMembership marks every active toggle in the same first group as off (`m_activation_state = false`), so one toggle per group.
- Queue (DataHelpers.cpp 851 onward): the new entry takes its charge time and recharge time from the power template (861-863). Queued powers that are not the charging one are marked inactive, so the new power replaces them (loop from 866). The new entry is pushed to the back of the deque.
- Charge (WorldSimulation.cpp `checkActivationTimers`, from 179, once per player per frame): only the front entry is looked at (181). If it is not charging, a block cancels it (188). Otherwise, if recharge is off and the target is in range, the charge starts (the branch ending at 202). While charging, the charge time counts down by the sim frame time (210). When it drops below zero and the entry's state-change flag is clear (`m_active_state_change == false`, 212), a toggle moves to the toggle list (the toggle branch ending at 218) and any other power is fired by `doPower` (the else branch). Then the charging flag is cleared (227) and movement is freed.
- Fire (`doPower`, DataHelpers.cpp 910-): target check (`checkPowerTarget`; if it fails `doPower` returns silently, 924), then endurance is spent (966). The recharge entry is added by `queueRecharge` only for a Click power (948-951); a toggle gets its recharge entry only when it stops (WorldSimulation.cpp 301).
- Recharge (WorldSimulation.cpp `checkRechargeTimers`, from 252): each recharge entry counts down by the sim frame time (256); the entry is removed at zero or below (258).
- Toggle (WorldSimulation.cpp `checkAutoToggleTimers`, from 269): a toggle fires each time its period runs out (ActivatePeriod). The period counts down by the sim frame time (283). It stops when endurance is below the cost, the caster or target is dead, or the target is out of range (the check inside the toggle branch, not line-recorded). A stopped toggle goes to the queue and the recharge list (300-301), and is erased from the toggle list (302).
- Endurance recovery and HP regeneration run per frame (WorldSimulation.cpp 342-348): HP gain = max HP x (Regeneration / 20) x dt / 12; endurance gain = max endurance x (Recovery / 4.9) x dt / 12. Arithmetic from the formula: at Recovery 4.9 the endurance bar refills in 12 s, and at Regeneration 20 the HP bar refills in 12 s (base attribute values not read).
- Cancel: the abort handler (MapInstance.cpp 2323-2328) marks the newest queued power inactive. An inactive entry is removed later, in the packet builder (MessageHelpers.cpp 565-566), not in the sim step.
- Block (EntityHelpers.cpp 395-398): a power cannot start while stunned, sleeping, held, afraid or "only affects self" is above 1. A comment at line 400 says per-status protection should be used instead of 1; that is not built.
- Tick: the step length is the measured frame time, not a fixed step (WorldSimulation.cpp 36 sets 33 ms for the first frame; 43 sets the step from the tick delta). The timers run for players only (381).
- Cast window: the charge is locked once started. The block check is not repeated during the charge (see section 6).

## 2. Key functions

- `World::checkActivationTimers`: `/mnt/frankendom-donors/Segs-Segs/Servers/MapServer/WorldSimulation.cpp` from 179 (front of queue, block check, charge, fire, default power; end line not recorded).
- `World::checkRechargeTimers`: WorldSimulation.cpp from 252.
- `World::checkAutoToggleTimers`: WorldSimulation.cpp from 269.
- `World::update` (sim step): WorldSimulation.cpp from 30.
- `checkPower`: `/mnt/frankendom-donors/Segs-Segs/Servers/MapServer/DataHelpers.cpp` 721-788.
- `queuePower`: DataHelpers.cpp from 851 (toggle group rule 875-889; toggle re-press 733-745 is in checkPower).
- `doPower`: DataHelpers.cpp 910-970 (first part read; the rest not read).
- `checkPowerBlock`: `/mnt/frankendom-donors/Segs-Segs/Common/GameData/EntityHelpers.cpp` 395-400.

## 3. Numbers vs mechanism

Per-power numbers (charge, recharge, period, endurance cost) are data that this cell did not read, so no values are quoted. The table gives the rules and formulas.

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Queue | one power at a time is charging; a new power replaces queued ones not yet charging | front only; new entry at back | queue effectively 1 charging + 1 waiting | n/a | n/a | n/a | DataHelpers.cpp:851, 866; WorldSimulation.cpp:181 |
| Charge (cast) | the power fires after its charge time | charge -= dt; fire when charge < 0 | TimeToActivate (data, not read) | endurance spent at fire | charge time | block checked only before the charge starts | WorldSimulation.cpp:188, 202, 210-212, 227 |
| Endurance cost | queue needs cover; fire spends it | cost <= endurance to queue; endurance -= cost at fire | EnduranceCost (data, not read) | endurance | n/a | discounts TODO | DataHelpers.cpp:752, 804, 966 |
| Recharge | per-power cooldown; entry added at fire for Click powers only (DataHelpers.cpp:948-951), for a toggle only when it stops (WorldSimulation.cpp:301) | timer -= dt; removed at <= 0 | RechargeTime (data, not read) | n/a | cooldown | n/a | WorldSimulation.cpp:256-258 |
| Toggle | periodic fire while on | fire each period; endurance per fire; off when endurance < cost or target out of range | ActivatePeriod (data, not read) | endurance per fire | period | one per group (inside queuePower) | WorldSimulation.cpp:283, 300-302 |
| Block (CC gate) | stops a power starting | any of 5 statuses > 1 | threshold 1 (count) | n/a | n/a | per-status protection TODO | EntityHelpers.cpp:395-400 |
| Endurance recovery | endurance refill | max end x (Recovery / 4.9) x dt / 12 per frame | Recovery attribute; 4.9 scale; /12 | n/a | n/a | capped at max | WorldSimulation.cpp:343, 348 |
| HP regeneration | HP refill | max HP x (Regeneration / 20) x dt / 12 per frame | Regeneration attribute; 20 scale; /12 | n/a | n/a | capped at max | WorldSimulation.cpp:342 |
| Interrupt time | field exists | not used in the code read (grep: serializers only) | InterruptTime (data) | n/a | n/a | n/a | power_definitions.h:235; CharacterAttributes.h:75 |

Which numbers suit a fast mobile fight (proposed, not measured): the structure is right for a fast game, since a special is a short charge plus a recharge and a toggle is a drain. Charge times for a fast duel should be a fraction of a second; the donor's values were not read, so no number is recommended here. Endurance refilling in 12 s at base is slow for a duel of about 30 s, so a Frankendom fight would need a faster recovery value (proposed).

## 4. TypeScript sketch

simplified: keeps the donor order: front of the queue only, blocks checked only before the charge starts, the charge countdown, the fire (endurance spent, recharge started), the recharge countdown and the toggle period with its endurance stop. It omits: the packet-side dequeue (here the queue is cut at once), the body of `doPower` (targets and effects), the one-toggle-per-group rule, re-pressing an active toggle to switch it off (733-745), the `m_active_state_change` fire gate (212, a packet-handshake flag), the recharge entry for a toggle that stops, the dead-target toggle stop, the default power used when the queue is empty, the player-only gate (the caller decides), and the InterruptTime field (not used in the code read). Refusals return at once; the donor sends a message for range and recharge and then keeps going (that is the defect fix).

```ts
// Licence: BSD-3-Clause (donor). Clean-room sketch of the mechanism, written from the described steps and their order.
export {};

export interface PowerDef {
  castS: number;         // TimeToActivate: charge time in seconds
  rechargeS: number;     // RechargeTime in seconds
  periodS: number;       // ActivatePeriod: toggle period in seconds
  enduranceCost: number; // EnduranceCost
  toggle: boolean;
}

export interface Blocks { stunned: boolean; sleep: boolean; held: boolean; afraid: boolean; onlySelf: boolean; }

export interface Queued { id: string; tgt: number; charge: number; }

export interface Caster {
  endurance: number;
  queue: Queued[];                                 // index 0 is the power charging or next to charge
  charging: boolean;
  recharge: Map<string, number>;                   // power id -> seconds left
  toggles: Map<string, { next: number; tgt: number }>;
  blocks: Blocks;
}

export function blocked(b: Blocks): boolean {
  return b.stunned || b.sleep || b.held || b.afraid || b.onlySelf;
}

// Queue entry check. Returns a refusal reason, or null when the power is queued.
// The donor sends a message for range and recharge and then keeps going; here each refusal stops the call.
export function queuePower(c: Caster, id: string, tgt: number, d: PowerDef, inRange: boolean): string | null {
  if (c.endurance < d.enduranceCost) return 'not enough endurance';
  if (c.recharge.has(id)) return 'recharging';
  if (!inRange) return 'out of range';
  // A new power replaces queued ones that have not started; the charging one (index 0) is kept.
  c.queue = c.charging ? c.queue.slice(0, 1) : [];
  c.queue.push({ id, tgt, charge: d.castS });
  return null;
}

// One step of the charge for the front of the queue. Returns the id that fired, or null.
export function tickCharge(c: Caster, defs: Map<string, PowerDef>, dt: number, inRange: (tgt: number) => boolean): string | null {
  const front = c.queue[0];
  if (front === undefined) return null;
  const def = defs.get(front.id);
  if (def === undefined) { c.queue.shift(); return null; }
  if (!c.charging) {
    // Blocks are checked only before the charge starts; a block that arrives mid-charge does not stop it (donor).
    if (blocked(c.blocks)) { c.queue.shift(); return null; }
    if (c.recharge.has(front.id) || !inRange(front.tgt)) return null; // wait at the front
    c.charging = true;
    return null;
  }
  front.charge -= dt;
  if (front.charge >= 0) return null;
  c.queue.shift();
  c.charging = false;
  if (def.toggle) {
    c.toggles.set(front.id, { next: def.periodS, tgt: front.tgt });
    return null;
  }
  c.endurance -= def.enduranceCost;
  c.recharge.set(front.id, def.rechargeS);
  return front.id;
}

export function tickRecharge(c: Caster, dt: number): void {
  for (const [id, left] of Array.from(c.recharge.entries())) {
    const next = left - dt;
    if (next <= 0) c.recharge.delete(id);
    else c.recharge.set(id, next);
  }
}

// Toggles fire every period and stop when endurance runs short or the target is out of range.
export function tickToggles(
  c: Caster,
  defs: Map<string, PowerDef>,
  dt: number,
  inRange: (tgt: number) => boolean,
  fire: (id: string, tgt: number) => void,
): void {
  for (const [id, t] of Array.from(c.toggles.entries())) {
    const def = defs.get(id);
    if (def === undefined) { c.toggles.delete(id); continue; }
    if (t.next <= 0) {
      c.endurance -= def.enduranceCost;
      fire(id, t.tgt);
      t.next += def.periodS;
    } else {
      t.next -= dt;
    }
    if (c.endurance < def.enduranceCost || !inRange(t.tgt)) c.toggles.delete(id);
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/mg004-Segs-Segs.ts`) exits 0.

## 5. Lands in

- TARGET `src/fight/specials.ts` (new module: the queue, the charge, the recharge and the toggle for specials). The windup numbers and the cancel rule come from cell 2 (`src/fight/cast.ts`). The server runs the queue; the client shows the charge bar.
- Parity-checklist row 13 (specials).
- Data fields: charge time, recharge time, toggle period, endurance cost and the regen rates are data (see the JSON sidecar).
- Reuse tag: rewrite-from-idea (BSD-3-Clause; adapt allowed, keep the licence notice if code is copied)
- Brief rule served: 1 (one engine: the queue and its timers are server state); rules 7-9 n/a

## 6. Gaps and risks

- Donor defects and fixes:
  - No return after the range and recharge messages (DataHelpers.cpp 776-787): the refused power is still queued and waits at the front (the charge starts only when range and recharge pass, the branch ending at WorldSimulation.cpp 202). Fix: return a reason at once.
  - Iterator invalidation in the toggle stop (WorldSimulation.cpp 302): `erase(rpow_idx)` is not reassigned and the loop then tests the stale iterator. Fix: `it = list.erase(it)` with no increment on that path.
  - Dequeue in the packet builder (MessageHelpers.cpp 565-566): the server's state depends on what is sent. Fix: remove cancelled entries in the sim step, then send.
  - Variable step (WorldSimulation.cpp 36, 43): all timers scale with the measured frame, and the first frame assumes 33 ms. Fix: a fixed step with an accumulator, as Frankendom's server tick rule asks.
  - InterruptTime is read and saved but not used in the code read (power_definitions.h 235). Fix: implement a window (a block or a hit inside it cancels the charge) or delete the field.
- Design question for Strategy: a block that arrives mid-charge does not stop the charge in this donor (only the start is gated; grep finds no other checkPowerBlock caller). For a fast duel a stun should break a special's charge. Proposed fix: check the block every tick during the charge and cancel with cell 2's rule; the endurance is then not spent.
- Range is checked at queue time and at charge start. Whether `doPower` checks range again at fire time was not read.
- Players only (WorldSimulation.cpp 381): NPCs and mobs have no power queue here. Frankendom's one-engine rule needs one queue for every fighter.
- The CC gate uses a count (above 1) rather than the single CC ladder (Strategy rule c). Frankendom must feed block state from the one ladder.
- The endurance formulas (WorldSimulation.cpp 342-343) use base attribute values that were not read, so the 12 s figures above are arithmetic, not measured.

Reuse tag: rewrite-from-idea (BSD-3-Clause; adapt allowed)
Brief rule served: 1 (one engine: the queue and its timers are server state); rules 7-9 n/a

Best transferable idea: a special is a queued action that starts only when its target and recharge checks pass, charges for a fixed time, spends its cost when it fires, then sits on a recharge timer, and a toggle is the same action that fires on a period and stops on empty endurance.

Decision (proposed): adapt - keep the queue (front only, a new special replaces the waiting ones), the charge, the cost at fire, the recharge timer and the toggle period with its endurance stop; fix the four defects above; add a block check during the charge so a stun breaks it (Strategy to rule on this); feed block state from the one CC ladder.

Acceptance: a server test: a special queued while another is charging leaves the charging one in place and replaces only the waiting entries; a special that is out of range is refused with a reason and not queued; a stun landing mid-charge breaks the charge and the endurance is not spent (if Strategy adopts it); a toggle stops on the tick its endurance falls below its cost; the recharge bar counts down in server ticks.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Claim that doPower adds the recharge entry for any fired power is wrong: queueRecharge only for PowerType::Click (DataHelpers.cpp:948-951); toggles get recharge when they stop (WorldSimulation.cpp:301). Confirmed, fixed in Mechanism and table.
- Fire gate omitted: charge completes only if time<0 and m_active_state_change==false (WorldSimulation.cpp:212). Confirmed, added; sketch omission list updated (it is a packet handshake flag).
- Acceptance wording 'replaces nothing' was loose. Confirmed (queuePower keeps the charging one, marks waiting ones inactive); reworded.
- Missed: re-press of an active toggle switches it off before any cost/range checks (733-745); queuePower toggle group rule 875-889 (readable, now recorded); doPower skipped silently if checkPowerTarget fails (924). All confirmed, added.

Fixed 2026-10-12: recharge-for-Click-only, fire gate, toggle re-press, group rule, doPower target return, acceptance wording. Sketch code unchanged (its tickCharge already recharges only non-toggles; the extra rules are listed as omitted).
