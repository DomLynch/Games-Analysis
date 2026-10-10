# ax-grymyr-l2dn-server (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Creature.cs` (`updatePosition` 3017-3218; `moveToLocation` 3368-3638, partly read; `MoveData` 2572-2595), `.../TaskManagers/MovementTaskManager.cs` (pool and 100 ms pass), `.../TaskManagers/GameTimeTaskManager.cs` (tick counter) | Licence: MIT (`/mnt/frankendom-donors/ax-grymyr-l2dn-server/LICENSE.txt`, lines 1-3: "MIT License", "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project") | C# | symbol `Creature.updatePosition`

Checked: read in full: `GameTimeTaskManager.cs` (107 lines), `MovementTaskManager.cs` (99 lines), `Creature.updatePosition` (3017-3218, the geodata and door branches 3053-3159 read but not traced for effect), `moveToLocation` only in part: 3368-3372 and 3586-3638 read, 3373-3585 and 3639 onward not read; `MoveData` (2572-2595), `broadcastMoveToLocation` (584-602). Read for comparison only: `AttackableThinkTaskManager.cs` (106 lines). Not read: the `Set<T>` class both pool managers use (its behaviour when an item is removed during enumeration is unknown), `ThreadPool.scheduleAtFixedRate`, `NotifyAITask`, `revalidateZone`, the client side of ValidatePosition, and the `Vehicle.updatePosition` override body (`Vehicle.cs` 320). Nothing was run. Confidence: high on the tick numbers and the order of steps; medium on what the 1.79 window does in play, because I did not run it.

## 1. Mechanism

- A game tick runs at 10 per second (100 ms). The tick value is computed from wall-clock time since a reference (`GameTimeTaskManager.cs` 46), recomputed on each pass of a loop that waits one tick (62). Readers get the value from the last pass (81). It is never incremented by hand, so a late pass skips ticks instead of drifting.
- Start of a move (`moveToLocation`, 3368): compute the destination and the heading, stamp the start tick (3626), store the move record in `_move` (3629), and register the creature with the movement manager (3633). It sends no packets itself.
- A separate estimate `ticksToMove = 10 x distance / speed` (3613) is used only to schedule a 2 s "revalidate" notice to the AI when the walk is longer than 3 s (3636-3638). It does not decide arrival.
- The movement manager keeps pools of up to 1000 movers and one fixed-rate job per pool at 100 ms (`MovementTaskManager.cs` 19-20, 87). Each pass calls `updatePosition` on each mover (46). A `true` result removes the mover and sends `EVT_ARRIVED` to its AI (48-49). An exception removes the mover and logs it (52-55).
- `updatePosition`, in order:
  - (a) First update only: the timestamp is set to the start tick and the accurate position to the current position (3031-3033).
  - (b) If this tick is already done, return `false` (3039-3042). This makes a second call in the same tick a no-op.
  - (c) Player-only geodata and door checks, which can stop the move (3053-3159). Not traced for effect.
  - (d) Remaining distance to the destination, minus the collision radius of the target or of the mover, floored at 0.00001 (3162-3184).
  - (e) Time passed = speed x ticks since the last timestamp / 10 (3189). Fraction = passed / remaining (3190). If remaining is 1 or less, the fraction is `double.MaxValue` (3186-3187), which forces the snap below.
  - (f) If fraction > 1.79: snap to the destination (3193-3196). Otherwise move the accurate position by the full remaining vector times the fraction (3200) and set the rounded integer position (3204).
  - (g) Store the timestamp as this tick (3209). Playable movers broadcast a move packet at most every 3 ticks on a geodata path (3212-3214). Return `fraction > 1.79` (3218).
- Positions are doubles while moving and rounded only when set (2581 comment: "Otherwise there would be rounding errors.").
- Who owns what, from the doc comment: the server uses its own x and y for range checks (3012). The client sends ValidatePosition to correct Z, which is taken from the client (3010, 3013). The x and y are computed on the server "to avoid that players try to modify their movement speed" (3014).
- Timing: one pass per 100 ms per pool; the step is per-mover, not per-frame.

## 2. Key functions

- `Creature.updatePosition`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Creature.cs` 3017-3218. The whole step. Order as in section 1.
- `GameTimeTaskManager`: `.../TaskManagers/GameTimeTaskManager.cs` 13-14 (constants), 46 (tick from clock), 62 (wait one tick), 81 (reader). The tick source.
- `MovementTaskManager`: `.../TaskManagers/MovementTaskManager.cs` 19-20 (pool and delay), 42-55 (the pass, with arrival and error handling), 87 (fixed-rate job). The shared 100 ms pass.
- `Creature.moveToLocation`: `.../Model/Actor/Creature.cs` 3368 (signature), 3371 (speed), 3613 (ticks estimate), 3626 (start tick), 3633 (register), 3636-3638 (long-walk notice). The start of a move.
- `MoveData`: same file, 2572-2595. Holds the start tick, last tick, destination, accurate position, and last broadcast tick.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| One shared clock-derived tick for all movers | `TICKS_PER_SECOND = 10` (13); `MILLIS_IN_TICK = 1000 / TICKS_PER_SECOND` (14); tick loop waits one tick (62) |
| One pass per tick over all movers, pooled | Pool size 1000 (`MovementTaskManager.cs` 19); pass every 100 ms (20, 87) |
| Advance by speed x ticks elapsed since last step | `distPassed = speed x (ticks) / 10` (3189); `TICKS_PER_SECOND` as divisor |
| Idempotent per tick | Return `false` when the timestamp equals this tick (3040-3042) |
| Remaining distance minus collision radius | `delta - collision`, floor 0.00001 (3184) |
| Arrival by fraction threshold | Snap and arrive above `1.79` (3193, 3218); fraction `MaxValue` when remaining is 1 or less (3186-3187) |
| Long-walk AI notice | `3000` ms threshold (3636); `2000` ms delay (3638) |
| Broadcast throttle | Every 3 ticks (3212; 593-595), i.e. 300 ms |

## 4. TypeScript sketch

simplified: keeps the donor order for one mover: the tick check, distance minus collision, time passed from ticks since the last step, the fraction, the 1.79 snap and the partial step. It omits the geodata and door checks and cursor-key movement, the 3D distance (the donor uses 3D except for grounded movers within 100 units horizontally with a Z gap over 50, where it drops Z, at 3164-3170; the sketch is 2D), the first-update rule (the caller sets `lastTick` to the start tick), the integer rounding, the heading, zone revalidation, the playable broadcast every 3 ticks, the AI notice for long walks, the pool scheduler (`tickMovers` is one pass), and the `Set<T>` removal behaviour. It keeps the 1.79 threshold and the unclamped partial step as the donor writes them; the sketch does not fix or test the window where the step passes the destination.

```ts
// Licence: MIT (donor, L2Dn Server Project). Clean-room sketch written from the described mechanism; no donor lines copied.
// clean-room
const TICKS_PER_SECOND = 10;

interface Mover {
  x: number;                       // accurate position, not rounded
  y: number;
  dest: { x: number; y: number };
  speed: number;                   // units per second
  collision: number;               // radius taken off the remaining distance
  lastTick: number;                // tick of the last step (set at move start)
  arrived: boolean;
}

// The tick is derived from the clock, never incremented: a late loop skips ticks instead of drifting.
function tickAt(nowMs: number, referenceMs: number, msPerTick: number): number {
  return Math.floor((nowMs - referenceMs) / msPerTick);
}

// Advance one mover to tick `now`. Calling it twice in the same tick does nothing.
// Returns true on the step where the mover is considered arrived.
function stepMover(m: Mover, now: number): boolean {
  if (m.arrived) return true;
  if (m.lastTick === now) return false;

  const dx = m.dest.x - m.x;
  const dy = m.dest.y - m.y;
  const remaining = Math.max(0.00001, Math.hypot(dx, dy) - m.collision);
  const passed = (m.speed * (now - m.lastTick)) / TICKS_PER_SECOND;
  const fraction = remaining > 1 ? passed / remaining : Infinity;

  m.lastTick = now;
  if (fraction > 1.79) {
    m.x = m.dest.x;
    m.y = m.dest.y;
    m.arrived = true;
    return true;
  }
  m.x += dx * fraction;            // not clamped at the destination for fractions 1..1.79, as written in the donor
  m.y += dy * fraction;
  return false;
}

// One pass over all movers at one tick. Returns the movers that arrived on this pass.
function tickMovers(movers: Mover[], now: number): Mover[] {
  const arrived: Mover[] = [];
  for (const m of movers) {
    if (stepMover(m, now)) arrived.push(m);
  }
  return arrived;
}
```

Typecheck: the block plus `export {}` (`/private/tmp/p2/wave2-haiku/batch1/E/work/l2dn-move-tick.ts`) was copied to the VPS and run with `tsc --noEmit --strict --target es2020`: exit 0. A negative control (a string assigned to a number) on the same VPS gave exit 1, so the checker is live.

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module: the server tick and one movement step for every mover, run on the server only). Parity-checklist row 18, whose Slice column reads "post-K item 3: server tick unifies". The checklist says rows 18 and 19 are owned by the post-K server-tick work, so this is the row for it. The row's name is loot and XP; the server-tick work is what the checklist files under it.
- Ruling (Lead Dev, 2026-10-10): no new row for the server tick. It stays under row 18 / post-K item 3 as the named sub-line "server tick: fixed step, input intake, per-tick NPC budget". Acceptance is many-on-one (Proof 3: N NPC brains inside the tick budget).
- Today: not located in trunk in this pass (not read). The checklist names the Zone 1 loop as `main.ts -> world-combat.ts -> zone1.ts -> open-fight.ts`, stepping `stepDuel` headless; it does not say where a server tick would sit.
- Reuse tag: rewrite-from-idea (MIT, L2Dn Server Project; idea and shape only, no lines copied)
- Brief rule served: server-verified positions and kills, one engine (Frankendom rulings)

## 6. Gaps and risks

- MIT: adaptation with the licence notice is allowed. This note uses the idea and shape only. The donor credits "Forsaiken, Mobius" in `GameTimeTaskManager.cs` (9) and "Mobius" in the other pool managers; I did not check the upstream licences behind that lineage (not read).
- Authority: the donor takes Z from the client and computes x and y on the server (3010-3014). Frankendom's rulings make the engine the authority for the fight. Do not copy the client Z trust for a flat duel floor; a duel needs no Z at all.
- Tick rate: the donor steps movement at 10 ticks per second. Frankendom's fight loop runs at 60 Hz on the client (checklist row 4). A 10 Hz server step with a 60 Hz client needs an interpolation rule that the donor does not show in this function (the client side was not read). The donor's reader sees a value up to 100 ms old (81).
- The 1.79 window: for fractions above 1 and up to 1.79 the step moves past the destination without arriving (3200, 3218). The comment at 3012 says the position is set to the destination at the end of the estimated time, and only the above-1.79 branch does that. I read this as written and did not run it. The overshoot size and whether the mover oscillates back are not measured. Test before copying the 1.79 constant, especially for three attackers closing on one target.
- `Set<T>` and removal during enumeration: the pass removes movers from the set it is looping over (48, 54). The `Set<T>` type was not read. If it wraps a .NET collection that throws on modification, the throw happens on the next enumeration step, outside the try block at 44-56. Do not copy the loop without iterating over a snapshot.
- Many-on-one (MAX_ATTACKERS = 3): the donor's pools hold thousands of unrelated movers; one pass does not decide who may stand where around a target. The chase and surround rules live in the AI, which was not read. Frankendom's hate list and target choice (checklist rows 2 and 4) stay in the engine, not in the mover step.
- One ledger and state changes: arrival notifies the AI (49). Under Frankendom's rulings an arrival is a state change inside the engine. The mover pass must report arrival to the engine and must not change game state itself.
- Idempotency: a second call in the same tick does nothing (3040). Frankendom needs the same guard when a server tick and a client resend both call the step.
- Second path: the vehicle overrides `updatePosition` (`Vehicle.cs` 320). Frankendom must keep one step (one-engine ruling). The override body was not read.
- Separate candidate, not written up here: `AttackableThinkTaskManager.cs` runs AI thinks in pools of 1000 at a 1 s fixed rate (15-16, 83). It is an AI scheduling pattern, relevant to checklist row 2 rather than to this cell.

Best transferable idea: one 100 ms server pass over all moving creatures, where each mover's position is advanced by speed times the ticks elapsed since its last step, with a per-tick guard so a second call in the same tick does nothing.

Reuse tag: rewrite-from-idea (MIT, L2Dn Server Project; idea and shape only, no lines copied)
Brief rule served: server-verified positions and kills, one engine (Frankendom rulings)
