# DCurrent-openbor (combat-sim, cell 2)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD 3-clause style (`engine/LICENSE`, read lines 1-11: copyright Roel van Mastbergen & Senile Team 2003, OpenBOR Team 2004; redistribution conditions and a no-endorsement clause) | C | symbol `calculate_force_damage`

Checked: The hint file `openbor.c` is correct for the topic but the hint line is not the mechanism; the damage pipeline is spread through it (`offense_result_damage` 38149, `defense_result_damage` 38186, `calculate_force_damage` 38838, `checkdamage` 39142, `common_takedamage` 39239, the hit loop in `do_attack` 31443-31935, blocking 30511-30731, `set_pain` 35137, `update_health` 33162). Read in full: 38140-38316, 38830-38901, 39130-39460, 30500-30575, 30649-30735, 31384-31640, 31640-31700, 31740-31935, 33160-33200, 35132-35150, 156-172 (default defense), openbor.h 2240 (sentinel). Not read: `do_attack` lines 31700-31739 (the counter and passive-block branch) and after 31935, `check_blocking_decision`, `try_counter_action`, `do_passive_block`, `checkdamageeffects` body, `checkdamagedrop`, `defense_find_current_object` body (only its comment and returns, 38317-38349), `set_fall`, the caller of `update_health`, the main game loop, where `global_config.block_ratio` defaults. Confidence: high on the damage and guard order (read end to end); medium on the exact per-frame timing (the caller of `update_health` is not read). Camera: not applicable.

## 1. Mechanism

One attack, one target, one frame. Order of operations as the code runs:

- Gates in `do_attack` (31493-31600): the target must exist, be alive (31515), not be intangible (31523, items excepted), match `attack_one` (31536), pass the faction check (31548), and have `next_hit_time` already passed (31558). Then `takedamage` must be set (31564), the attack id must not already be recorded on the target (31577-31581), the on-ground and on-lying rules apply (31587-31596), and a juggle-points check applies to airborne targets (31600-31606). Scripts then run and `lasthit.confirm` decides whether the engine's default hit path runs (31611-31626).
- Blocking decision per hit (31688-31689): `check_blocking_master` decides. Players must already be in the active block state at impact (30675-30678). AI chooses to block on impact through `check_blocking_rules` and `check_blocking_decision` (30681). Then `check_blocking_eligible` (30511-30555) can refuse the block: native block with a guard maximum and no guard points left (30519-30525); attack from behind unless the block config allows it (30528-30531); attack `no_block` at or above the defense's `blockpower` (30542-30545); and a threshold of model `thold` plus defense `blockthreshold` above the attack force (30547-30551).
- If blocked: `set_blocking_action` (30702-30731) spends the attack's `guardcost` from the guard (30719) and counts the hit (30727).
- Blocked damage (31825-31916): `calculate_force_damage(..., true)` runs the attacker's offense first, then the blocker's block ratio (see section 3). Then the block type decides whether MP absorbs part or all of it (31841-31895). The rest goes to HP: if the force is below HP it is subtracted directly (31909-31910), otherwise `nochipdeath` floors HP at 1 (31911-31912), otherwise `takedamage` runs the normal path (31914). That normal path recomputes damage without the block (`checkdamage` passes `false`, 39149).
- If not blocked: `common_takedamage` (39239-39460) runs drop and effect checks (effects skipped while the guard is broken, 39299), direction flip, MP gain, score, then `checkdamage` (39319). `checkdamage` calls `calculate_force_damage(..., false)` (39149). In that call, a hit on an empty guard does zero damage (38864-38865, checked before offense). Otherwise: offense multiplies and clamps (38874), then the defense factor and adjustment apply with rounding (38896, 38219, 38229-38240). Then HP drops by that force (39174), is capped at max health (39176-39178), a no-kill attack floors health at 1 (39180-39182), and the death check runs with invincibility flags (39192-39204).
- Pain and guard break (39384-39457): `defense_result_pain` says whether the defense's pain threshold is met (38284). The reaction is an if / else-if chain: the knockdown or death branch (39386-39443) does not call `set_pain`; the grab branch calls it (39450); the pain branch runs only when the target is not frozen, pain is not disabled, the attack is not `no_pain`, and `pain_check` is true (39453), and calls it (39456). `set_pain` (35142-35146) detects a guard break (guard maximum above zero and guard at or below zero) and sets the guard-break animation and refills the guard to its maximum.
- Guard regeneration (33173-33197): when `_time` reaches `guardtime`, the guard gains `guardrate`, or half that while actively blocking (33179-33188), capped at the maximum (33191-33194). The next check is set to `_time + game_speed` (33197). The caller that runs this every frame was not read.

Blocked hits are still hits. The attacker's hit counter goes up (30727), and a combo counter goes up only when the hit was not blocked (31920-31927).

## 2. Key functions

- `do_attack`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 31443-31935 (read 31456-31700 and 31740-31935; 31700-31739 and the tail after 31935 not read). Per-target gates, the block decision, blocked and unblocked damage, `next_hit_time` (31773).
- `offense_result_damage`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 38149-38173. Multiply by factor (truncated), add adjustment, clamp to min and max.
- `defense_result_damage`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 38186-38241. Blocked or unblocked selects ratio, adjustment and bounds; round the ratio result; add adjustment; clamp.
- `calculate_force_damage`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 38838-38901. Touch-of-death cheat (38852-38856), guard-break zero damage (38864-38866), offense (38873-38875), defense lookup if none is passed (38888-38894), defense (38896).
- `checkdamage` and `common_takedamage`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 39142-39206 and 39239-39460.
- `check_blocking_eligible`, `check_blocking_master`, `set_blocking_action`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 30511-30555, 30649-30692, 30702-30731.
- `set_pain` and `update_health`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 35137-35150 and 33162-33198.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Attacker multiplier, truncated, then flat add, then clamp | Clamp bounds come from the attack's offense object; default factor and bounds are data (not read: the default offense object) |
| Defense ratio, rounded, then flat add, then clamp | Default defense factor 1.0 (theirs, 171); default bounds MIN_INT / MAX_INT (theirs, 169-170) |
| Blocked hit: block ratio, rounded | Compatibility sentinel -99999999.0 means "use global" (theirs, openbor.h 2240; 165); global ratio 0.25 when the global block switch is on, else 0 (theirs, 38187, 38208-38210) |
| Chip damage below HP is subtracted directly | None (mechanism); nochipdeath floors at 1 (31911-31912) |
| Unblocked hit on an empty guard does zero damage | None (mechanism); guard refill on break (35145) |
| Guard spent per blocked hit | The attack's guardcost (theirs, the attack data; 30719) |
| Guard regeneration on a cadence, half while blocking | Regen cadence = game_speed (theirs, 33197); half rate by integer halving of guardrate (theirs, 33183; guardrate type not read) |
| Block eligibility: attack no_block vs block power; threshold = thold + blockthreshold | Per-attack and per-model values; no fixed constants in the lines read |
| Per-target hit cooldown | Default cooldown game_speed / 5 when the attack gives none (theirs, 31773) |

## 4. TypeScript sketch

simplified: the sketch keeps the order (guard-break check before offense, offense then defense, block ratio with the global switch, guard spent on a blocked hit, guard refill on break, guard regen on a cadence, per-target cooldown). It omits: the MP block types (MP_ONLY, MP_FIRST, BOTH), the `nochipdeath` floor and the lethal chip path that re-enters the normal damage path, the death and invincibility flags, the touch-of-death cheat, the pain threshold and the set_pain call path (the sketch refills the guard inside the hit; the donor refills only when the pain path runs), the faction check, the juggle cost, the attack id list, the MAX bounds defaults, and the on-ground rules. Math.round rounds halves upward and C round() rounds them away from zero; this differs for negative halves. The chip subtraction is not floored at zero in the sketch.

```ts
// Licence: BSD-3-Clause-style (donor engine/LICENSE). Clean-room sketch of the mechanism; not a translation.

const GLOBAL_BLOCK_RATIO = 0.25;   // used only when the global block-ratio switch is on

interface Offense { factor: number; adjust: number; min: number; max: number; }
interface Defense {
  factor: number; adjust: number; min: number; max: number;   // unblocked hit
  blockRatio: number | null;                                  // null = use the global switch
  blockAdjust: number; blockMin: number; blockMax: number;    // blocked hit
  blockPower: number; blockThreshold: number;                 // which attacks may be blocked
}
interface Fighter {
  hp: number; maxHp: number;
  guard: number; guardMax: number; guardRate: number; guardNextTick: number;
  blocking: boolean;
}
interface Attack { force: number; guardCost: number; noBlock: number; }

function offenseDamage(o: Offense, force: number): number {
  let r = Math.trunc(force * o.factor);   // C (int) cast truncates
  r += o.adjust;
  return Math.min(o.max, Math.max(o.min, r));
}

function defenseDamage(d: Defense, force: number, blocked: boolean, globalBlockOn: boolean): number {
  const ratio = blocked ? (d.blockRatio ?? (globalBlockOn ? GLOBAL_BLOCK_RATIO : 0)) : d.factor;
  const adj = blocked ? d.blockAdjust : d.adjust;
  const lo = blocked ? d.blockMin : d.min;
  const hi = blocked ? d.blockMax : d.max;
  let r = Math.round(force * ratio) + adj;
  return Math.min(hi, Math.max(lo, r));
}

// Native block: the guard must still have points and the attack must be above the block threshold.
function canBlock(t: Fighter, a: Attack, d: Defense, threshold: number): boolean {
  if (!t.blocking) return false;
  if (t.guardMax > 0 && t.guard <= 0) return false;
  if ((a.noBlock > 0 || d.blockPower > 0) && a.noBlock >= d.blockPower) return false;
  if (threshold > a.force) return false;
  return true;
}

// One hit on one target. Returns the HP lost and whether the guard broke.
function resolveHit(t: Fighter, a: Attack, off: Offense, def: Defense, globalBlockOn: boolean, threshold: number) {
  if (canBlock(t, a, def, threshold)) {
    t.guard -= a.guardCost;
    const chip = defenseDamage(def, offenseDamage(off, a.force), true, globalBlockOn);
    t.hp -= chip;                      // chip damage; the donor sends a lethal chip to the full path (omitted)
    return { hpLost: chip, guardBroke: false };
  }
  if (t.guardMax > 0 && t.guard <= 0) {
    t.guard = t.guardMax;              // guard break: no damage, refill (donor refills in set_pain)
    return { hpLost: 0, guardBroke: true };
  }
  const dmg = defenseDamage(def, offenseDamage(off, a.force), false, globalBlockOn);
  t.hp = Math.max(0, t.hp - dmg);
  return { hpLost: dmg, guardBroke: false };
}

// Guard regenerates on a tick cadence; half rate while actively blocking.
function regenGuard(t: Fighter, nowTick: number, gameSpeedTicks: number): void {
  if (t.guardMax <= 0 || nowTick < t.guardNextTick) return;
  t.guard += t.blocking ? Math.trunc(t.guardRate / 2) : t.guardRate;
  if (t.guard > t.guardMax) t.guard = t.guardMax;
  t.guardNextTick = nowTick + gameSpeedTicks;
}

// Per-target hit cooldown: a target cannot be hit again until its next_hit_time has passed.
function nextHitTime(now: number, attackCooldown: number, gameSpeed: number): number {
  return now + (attackCooldown !== 0 ? attackCooldown : Math.trunc(gameSpeed / 5));
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the one damage step: offense, then defense, then guard; guard break is a zero-damage state). Parity-checklist row 1 (duel step / sim). The guard meter itself is row 3 (guard / parry / stamina) and would sit beside this in `src/fight/guard.ts`; it is not named as the target here.
- Reuse tag: adapt-from-idea (BSD 3-clause style: code may be adapted; the sketch is clean-room anyway)
- Brief rule served: 1 (one combat core, two clients)

## 6. Gaps and risks

- Order matters and is a choice in the donor: the guard-break check runs before offense (38864), and a blocked lethal chip re-enters the unblocked path (31914, 39149). Frankendom should keep one order and test it; it should not copy the re-entry.
- The guard is spent per blocked hit (30719) but the donor's refill happens in `set_pain` only in the grab or pain branches. A knockdown or death, an attack with `no_pain`, or one the defense resists leaves the guard empty. Frankendom must refill on break as an explicit rule, not as a side effect of the pain path.
- Guard regen and the hit cooldown are time-based (`_time`, `game_speed`). Frankendom's guard, the cooldown and the block eligibility must run on server ticks (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- Per-attack and per-model blocking values (`no_block`, `blockpower`, `thold`, `blockthreshold`) are data. In Frankendom they should be per-weapon or per-zone data with explicit defaults, not sentinel values (the donor uses -99999999.0 as "use global").
- The regen caller (the per-frame update loop) was not read, so the donor's exact regen rate per second is not established here.
- MP block types and the death and invincibility flags were not carried into the sketch; Frankendom has no MP in the duel, so only the HP path transfers.

Best transferable idea: a blocked hit spends a guard meter and takes a block-ratio share of the damage, and an empty guard turns the next hit into a zero-damage guard break that refills the meter.
Decision (proposed): adapt - the offense-then-defense order and the zero-damage guard break fit the duel step, but the guard meter is row 3, its regen and block eligibility must run on server ticks, and the lethal-chip re-entry must not be copied.
Acceptance: a server test with a guard of 100 and guardCost 40 blocks hits 1 to 3 at round(force x 0.25) with no HP loss beyond that, and the 4th hit is unblocked, deals 0 damage and leaves the guard refilled to 100; a hit below the block threshold is never blocked.
