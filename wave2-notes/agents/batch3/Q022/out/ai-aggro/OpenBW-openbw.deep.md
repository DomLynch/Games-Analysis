# OpenBW-openbw (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` (targeting functions 1461-1562, 1841-1933, 2694-2805, 4224-4250, 4807-4826, 5710-5731, 12572-12667, 12879-12890; util.h 341-355) | Licence: unclear. The donor tree has no LICENSE file at its root; `README.md` names no licence; a grep of the tree for GPL, MIT, BSD and Apache text found only `deps/asio`. Treated as restricted: clean-room, shape only. | C++ | symbol `find_acquire_target`, `unit_target_attack_priority`, `attack_unit_reacquire_target`

Checked: `unit_target_attack_priority` (1841-1862) read in full; `get_default_priority_targets` (1868-1891) and `find_acquire_target` (1893-1916) and `find_acquire_random_target` (1918-1933) read in full; `attack_unit_reacquire_target` (2743-2783) read in full; `auto_attack_target` (2694-2706), `attack_move_movement` (2708-2727), `attack_move_acquire_target` (2729-2741), `unit_autoattack` (1555-1565), `order_Guard` / `order_PlayerGuard` (4231-4249), `order_AttackMove` (4807-4818), `order_AttackUnit` (4820-4825), `order_HoldPosition` (5710-5731), `order_TowerGuard` (5849-5861); `unit_target_is_visible` (1461-1463), `unit_can_attack_target` (1538-1555, first half), `unit_target_is_enemy` (8542-8546), `unit_target_acquisition_range` (12232-12245), `get_best_score` (util.h 341-355), the per-unit gate `execute_hidden_unit_main_order` (12572-12621), `update_hidden_unit` (12655-12667), `update_units` timer part (12879-12890), `lcg_rand` (13197-13205). Callers: the scan functions are called from order handlers; `unit_autoattack` is called from `order_PlayerGuard` (4237). Not read: `unit_target_in_weapon_movement_range` (1737), `unit_target_in_attack_angle`, `unit_target_weapon`, the body of `try_attack_something` past its first 12 lines (12502-12513), the rest of `update_units`, the name of the per-frame function that calls `update_units` (13101 is the call; enclosing name not confirmed), and `units.dat` values (loaded at run time from game data; the file is not in the donor). Confidence: high on bucket order, nearest-in-bucket and the sticky rule; not claimed: any per-unit numeric range. camera_scope: not applicable.

## 1. Mechanism

- Target choice is priority buckets, then nearest. `unit_target_attack_priority` (1841-1862) gives an enemy a number from 0 (best) to 5 (worst). 0 means the target can attack the choosing unit: the default for a live enemy that can hit back (the `r` starts at 0 and is raised only in the branches below). If the target cannot attack the chooser (1854), it gets +2 when it can attack something else (1855), else +3 when it can move (1856), else +4 (1857). A target that is not yet complete or is loaded gets +1 (1859). A bucket-0 target that cannot attack anything at all gets +1 (1860). Larvae and eggs are fixed at 5 (1850-1851). Workers get +2 (1853).
- Candidate filter, `get_default_priority_targets` (1868-1891). Bounding box of max distance plus 64 on each side (1870). Keep an enemy only if it is an enemy (1877), visible to the owner (1878), attackable by this unit (1879), not beyond max distance (1881), and not inside the weapon's minimum range (1882). A unit that cannot turn must also have the target inside its attack angle (1883-1885). Each bucket holds at most 16 entries (1888).
- Choice, `find_acquire_target` (1893-1916). Acquire range is the unit type value (12245), plus 2 when in a bunker (1895). Max distance is range x 32 (1898; 32 is the donor's units-per-tile). The first non-empty bucket, from 0 upward, wins, and inside it the nearest by position distance wins (1911-1912). `get_best_score` (util.h 349) takes the strict minimum, so the first one in a tie stays.
- Random variant, `find_acquire_random_target` (1918-1933). Same buckets, but inside the first non-empty bucket the pick is `lcg_rand(19) % size` (1929). Hold Position uses this (5726).
- Sticky current target, `attack_unit_reacquire_target` (2743-2783). If the current order target can be attacked and is priority 0 and still in weapon movement range, keep it and return (2748-2752). If it is priority 0 but out of range, treat it as priority 1. A sticky auto-target replaces it only if its priority is strictly lower (2757-2767, 2763). A fresh scan runs only if no priority-0 target is held (2769); it replaces the target only if strictly lower (2771). If the current order target can no longer be attacked, the local target is cleared (2754) and the order target is cleared with it (2775-2776).
- Auto-attack state. `unit_autoattack` (1555-1565) keeps the auto target only while it is an enemy and attackable; otherwise it clears it (1556-1562).
- Scan cadence. Guard (`order_Guard`, 4232) starts with a random timer of 0-15 ticks (`lcg_rand(29, 0, 15)`). `order_PlayerGuard` (4236-4249) tries the auto target first. When its timer is zero it resets the timer to 15 (4238-4239) and, if the unit has a range, acquires and auto-attacks (4245). Attack-move (4807-4818) scans on the same 15-tick timer, and only if the unit is not already at its move target (4809-4811). Hold Position (5724-5728) and Tower Guard (5851-5852) use the random variant on a 15-tick timer.
- Order gate and stagger. `update_unit_values` counts `main_order_timer` down once per call (1210). The main order runs only when `order_process_timer` is zero; then it is set to 8 (12617-12621). `update_units` (12882-12887) refreshes the offsets every 150 counts: visible units are given `order_process_timer` values 0-7 in turn, so the 8-tick gates are spread across units.
- Tick. Fixed step: `update_units` runs once per game frame (called from the per-frame step at 13101). Frame counts (8, 15, 150) are in frames. Nothing here is variable step.

## 2. Key functions

- `unit_target_attack_priority`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 1841-1862. Lower is better; 0 = can hit me.
- `get_default_priority_targets`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 1868-1891. Filter, then fill six buckets of at most 16.
- `find_acquire_target`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 1893-1916. First non-empty bucket, nearest inside it.
- `attack_unit_reacquire_target`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 2743-2783. Keep a bucket-0 target in range; switch only to a strictly better bucket.
- `execute_hidden_unit_main_order` gate: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 12617-12621. Act when the 8-tick timer reads zero.
- `update_units` stagger: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 12882-12887. Offsets 0-7 refreshed every 150 counts.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Six threat buckets: 0 = can hit me; a non-attacker is pushed down by +2, +3 or +4 by what it can still do | 0-5 range and the +2/+3/+4 offsets are the donor's rules (1853-1860); unit classes (worker, larva, egg, loaded, incomplete) are StarCraft types |
| Nearest inside the first non-empty bucket | Strict minimum; first wins ties (util.h 349) |
| Bucket capacity | 16 per bucket (1888) |
| Acquire distance | Range x 32 units (1898); bunker +2 range (1895) |
| Sticky target: keep a bucket-0 target in range; a new target needs a strictly lower bucket | Rule (2750-2771); weapon movement range from `unit_target_in_weapon_movement_range` (not read) |
| Scan and order timers | 8 ticks per order (12621); 15 ticks per scan (4239, 4810); guard start offset 0-15 (4232); stagger 0-7 every 150 counts (12882-12887) |
| Random tie inside a bucket (hold, tower) | `lcg_rand(19)` (1929); RNG rule (13203-13204) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the candidate filter (enemy, visible, attackable, distance, minimum range), the six capped buckets, nearest-first inside the first non-empty bucket, and the reacquire rule (keep a bucket-0 target in weapon range; otherwise switch only to a strictly lower bucket), plus the 8-tick gate and the 0-7 stagger. It omits: the worker, loaded-unit and larva/egg classes; the attack-angle test for units that cannot turn; the sticky auto-target (`auto_target_unit`) and `unit_autoattack`; the random variant used by Hold Position and Tower Guard; the order handlers that call these functions; the per-unit timer decrement in `update_unit_values` (the sketch's `tickTimer` stands in for it); the `unit_target_in_weapon_movement_range` test (passed in as `inWeaponRange`, not read). Distances are plain pixels; `TILE` is 32 as in the donor.

```ts
// Licence: unclear (donor tree has no LICENSE file; README.md names none). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Candidate {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  invincible: boolean;
  enemy: boolean;            // donor unit_target_is_enemy (8542-8546)
  visible: boolean;          // donor unit_target_is_visible (1461-1463)
  attackableByMe: boolean;   // donor unit_can_attack_target(u, target) (1538)
  canHitMe: boolean;         // donor unit_can_attack_target(target, u)
  canHitAnyone: boolean;     // donor unit_can_attack(target)
  canMove: boolean;          // donor u_can_move(target)
  active: boolean;           // donor u_completed(target); false adds one
}

interface Me {
  id: number;
  x: number;
  y: number;
  acquireRange: number;      // tiles; donor target_acquisition_range (12245), from game data
  inBunker: boolean;
  minRange: number;          // pixels; weapon minimum range (donor 1903), value not read
}

const TILE = 32;             // donor bwgame.h 1898: range x 32
const BUCKETS = 6;           // donor 1874: targets[6]
const BUCKET_CAP = 16;       // donor 1888: 0x10 per bucket
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

// Donor unit_target_attack_priority (1841-1862): 0 = a target that can hit me; higher = worse.
function priority(t: Candidate): number {
  let r = 0;
  if (!t.canHitMe) {
    if (t.canHitAnyone) r += 2;
    else if (t.canMove) r += 3;
    else r += 4;
  }
  if (!t.active) r += 1;
  if (r === 0 && !t.canHitAnyone) r += 1;
  return r;
}

// Donor get_default_priority_targets (1868-1891) and find_acquire_target (1893-1916):
// filter, sort into capped buckets, return the nearest in the first non-empty bucket.
export function acquire(me: Me, foes: Candidate[]): Candidate | null {
  const maxDist = (me.acquireRange + (me.inBunker ? 2 : 0)) * TILE;
  const buckets: Candidate[][] = Array.from({ length: BUCKETS }, () => []);
  for (const t of foes) {
    if (!t.alive || t.invincible || !t.enemy || !t.visible || !t.attackableByMe) continue;
    const d = dist(me, t);
    if (d > maxDist) continue;
    if (me.minRange > 0 && d <= me.minRange) continue;
    const b = buckets[priority(t)];
    if (b.length < BUCKET_CAP) b.push(t);
  }
  for (const b of buckets) {
    if (b.length === 0) continue;
    let best = b[0];
    for (const t of b) if (dist(me, t) < dist(me, best)) best = t; // strict minimum, first wins ties
    return best;
  }
  return null;
}

// Donor attack_unit_reacquire_target (2743-2783), simplified: a bucket-0 target still in weapon range is kept;
// otherwise a new scan replaces the current target only when it is in a strictly better bucket.
export function reacquire(me: Me, current: Candidate | null, foes: Candidate[], inWeaponRange: (t: Candidate) => boolean): Candidate | null {
  let target = current;
  let prio = Number.MAX_SAFE_INTEGER;
  if (target !== null) {
    if (target.attackableByMe && target.alive) {
      prio = priority(target);
      if (prio === 0) {
        if (inWeaponRange(target)) return target;
        prio = 1;
      }
    } else {
      target = null;
    }
  }
  if (target === null || prio !== 0) {
    const fresh = acquire(me, foes);
    if (fresh !== null && priority(fresh) < prio) target = fresh;
  }
  return target;
}

// Donor order gate (12617-12621) and scan timer (4238-4239): act when the timer is zero, then reset it.
export function tickTimer(timer: number, resetTo: number): { timer: number; act: boolean } {
  if (timer > 0) return { timer: timer - 1, act: false };
  return { timer: resetTo, act: true };
}

// Donor update_units (12882-12887): visible units get an offset 0-7 so their 8-frame gates are spread out.
export const staggerSlot = (index: number): number => index % 8;

export {};
```

## 5. Lands in

- TARGET `src/fight/targeting.ts` (new): the per-fighter target choice (threat buckets, nearest in bucket, sticky target). Parity-checklist row 2 (AI brain). It can sit inside `src/fight/aggro.ts` if one module is preferred; this note names the one file.
- today: no targeting module; the server-side pick is not yet a function of the fight state.
- Reuse tag: rewrite-from-idea (licence unclear; clean-room, shape only)
- Brief rule served: one engine (target selection is engine logic, not client); server tick: fixed step, per-tick NPC budget (the 8-tick gate and 0-7 stagger; post-K item 3 sub-line, row 18)

## 6. Gaps and risks

- Licence unclear. Nothing copied; the sketch is written from the described rules only.
- The donor's priority is threat-first: a unit prefers the enemy that can hit it back (bucket 0) over enemies that cannot. That is the transferable rule for many-on-one: when three enemies are near one fighter, the one that can hit this fighter now is chosen first, then nearest. Frankendom must define "can hit me now" from its own fight state (for example, in range and not staggered), not from unit classes.
- The worker, larva, egg and loaded-unit classes are StarCraft types. Frankendom has no equivalent; only the bucket offsets and the incomplete +1 shape transfer (the +1 for an inactive target could map to a downed or staggered fighter, if Frankendom wants that).
- Sticky target: the donor keeps a priority-0 target while it is in weapon range. Frankendom's MAX_ATTACKERS = 3 needs the same stickiness at the attacker-slot level, or the slots will flicker. In the functions read, nothing caps how many units pick the same target; the cap is Frankendom's own rule and must be engine logic.
- The random tie-break (`lcg_rand`) is seeded. Frankendom's server is authoritative; a seeded server-side RNG is acceptable, but client-side random pick is not (it would desync from server-verified kills).
- The 8-tick order gate and 0-7 stagger are the donor's per-tick NPC budget. They fit row 18 (post-K item 3 sub-line: fixed step, per-tick NPC budget). Frankendom must still choose the actual tick length; the donor's frame is not a wall-clock rate and is not read here.
- Numbers (range, minimum range, weapon range checks) come from game data not in the donor. Frankendom would set its own per fighter or per encounter (zone data).
- Not read: `unit_target_in_weapon_movement_range`, `unit_target_in_attack_angle`, `unit_target_weapon`, the rest of `try_attack_something`. The sketch takes the weapon-range test as an input and makes no claim about its implementation.
- Reuse check: no prior lane implementation was looked up in this pass; the Frankendom tree was not read.

Best transferable idea: Pick the enemy that can hit this fighter right now first, then the nearest; keep the current target while it stays in range, and switch only to a strictly better bucket.
Decision (proposed): adapt — take the threat-first buckets, nearest-in-bucket pick and sticky reacquire rule; change the bucket inputs to Frankendom's fight state (in range and active, not StarCraft unit classes); keep the MAX_ATTACKERS = 3 cap as a separate engine rule; reject the RNG tie-break on the client.
Acceptance: In a three-on-one server test, a fighter that is hit by an enemy in range keeps that enemy as its target while it stays in range, and a second assertion shows that an enemy which cannot hit it right now is not chosen while a hitter is in range.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** (1) Order gate cited at bwgame.h 12617-12621 is in execute_hidden_unit_main_order (hidden units, where PlayerGuard/AttackMove just reset to Nothing). The gate that governs the cited orders is execute_main_order 7758-7762 (same logic). (2) 'order_process_timer 8-tick gate': timer set to 8 then decremented each call, so the order runs every 9th call, not 8; and with main_order_timer reset to 15 the effective scan spacing is 18 frames (next gated pass >= 15), not 15. (3) Note implies worker +2 adds to the chain; code is if worker r+=2 else-if cannot-attack chain (exclusive, bwgame.h 1853-1857). Buckets, 16 cap, +64 bounds, range*32, bunker +2, reacquire sticky logic 2743-2783, lcg_rand 13197, get_best_score strict min all verified; no-LICENSE claim holds.

**Missed:** get_default_priority_targets: bunker target is replaced by its loaded unit before priority (1842-1849); find_acquire_target min_distance takes the min of ground/air min_range when both exist (1900-1906); attack_unit_reacquire_target returns at once unless u_ready_to_attack (2744).
