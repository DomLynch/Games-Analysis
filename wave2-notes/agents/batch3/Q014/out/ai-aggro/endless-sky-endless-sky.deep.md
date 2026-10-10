# endless-sky-endless-sky (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` | Licence: GPL-3.0-or-later (AI.cpp header: "version 3 of the License, or (at your option) any later version"; `license.txt` is the GPL v3 text) | C++ | symbol `AI::FindTarget`

Checked: `AI::FindTarget` is defined at 1554 and closes at 1726 (verified, read in full). Its only call site found by grep is the retarget path in `AI::Step` at 903 (read 880-905). Helpers read: `AI::CanPursue` (1403-1419), `AI::GetShipsList` (1815-1842; read to 1835, the tail not read), `AI::UpdateStrengths` (5172-5229), `AI::CacheShipLists` (5234, first lines only), `Ship::SetTargetShip` (4311-4333), `Ship::UpdateTargeterStrength` (4408-4423), `Ship::Strength` (1635-1638), `AI::Clean` (692-718, callers not read), `IsArmed` (165-179). Read but not receipted: the orders block at the top of `FindTarget`, the merciful and disable-only skips (1658 and 1662), the nemesis flag, the plunder branch's boarder check (1687-1692). The 500 constant at 1647 sits on a 14-character line, below the receipt minimum; confirmed by reading only. The `Ship::Strength` body `return Cost();` is also 14 characters; confirmed by reading only. Confidence: high for the `FindTarget` order of operations and numbers; medium for the stored-strength behaviour in section 6 (read as code, not run). The engine's frame rate and the AI step rate were not measured.

## 1. Mechanism

- Cadence. `AI::Step` runs once per unpaused engine update (`Engine.cpp` 1734 calls `ai.Step`; the engine's frame rate was not read). Its counter `step` runs 0 to 63 (771). `targetTurn` is a local set to 0 for each `AI::Step` call (774). The ship loop (782) skips destroyed ships and ships with no system, then computes `isPresent` (802). Only present, non-swarming ships enter the retarget path (894), and each one increments `targetTurn` (898). So the k-th such ship in list order is compared with `step & 31` (773, 899). A ship therefore re-picks once every 32 steps, staggered by list position. The donor's comment says "about twice a second" (896, 772), which assumes 60 steps per second. The comment at 772 says the step goes "from 0 to 30"; the code is `& 31`, so 0 to 31. Slots change when ships enter or leave the list.
- Re-pick trigger (899). The ship re-picks when its slot comes up, or at once when it has no target, its target is destroyed, the target is disabled and the ship disables or cannot fire on it, the target is fleeing and the ship is merciful, or the target is not targetable. The re-pick is `target = FindTarget(*it)` (903), stored with `SetTargetShip`.
- Order of operations inside `FindTarget` (1554-1726):
  1. Pacifist or no government: non-hostile fallback only (1559).
  2. Player ships with ATTACK, FINISH_OFF or SCAN orders take the ordered target; HOLD_FIRE returns none (1562-1574 region; read, not receipted; HOLD_FIRE check at 1573).
  3. No weapon with a range (non-special hardpoints): NPCs take the non-hostile fallback, player ships get no target (1591 region; read, not receipted).
  4. Cutoff `closest` (1617-1618): hunting ships have no cutoff. Otherwise it is 4000, or 1.5 x the longest weapon range when the shortest weapon range is over 1000.
  5. Candidates: `GetShipsList(ship, true)` (1628), the cached enemy roster for this government. Each candidate must pass `CanPursue` (1638). It always passes for unconstrained personalities and player ships; otherwise it fails when the foe's "invisible fence" count has reached `FENCE_MAX` (1418).
  6. Score starts as the distance between the hunter and the foe, each projected 60 frames ahead along its velocity (1642-1643). This prefers foes that are approaching.
  7. Stickiness (1645-1647): if the foe is the previous target or the parent's target, subtract 500.
  8. Size cap (1623-1625, 1650-1653): unless the hunter is daring, `maxStrength` = 2 x its stored strength. A foe beyond 1000 units, not disabled, with a larger stored strength than that cap, is skipped.
  9. Crowd (1672-1680): if the foe is not the sticky target and more than 2 ships already target it, add 500 when the targeters' combined strength is at least 0.25 x allied strength (1675), and add 500 when it is at least 2 x the foe's cost (1678).
  10. Disabled (1683-1684): when the hunter cannot plunder (`!canPlunder`, 1683; a plundering personality with free cargo and a ship that cannot be carried takes the other branch), a disabled foe adds 5000. The other branch (1685-1692) skips foes that another ship is already boarding and otherwise adds 2000 x (2 if disabled, minus 1 if this ship is not already boarding it) (read; receipted at 1683 only).
  11. Armed (1694-1695): an unarmed foe adds 1000, doubled for non-plunderers (1+ !plunders).
  12. Scorn (1696-1697): minus 1000 if the foe has boarded this government.
  13. Low health (1698-1699): add 500 x (shield fraction + hull fraction). A damaged foe scores lower and is preferred.
  14. Overheat (1700-1702): an overheated foe adds 3000 x (heat - 0.9). The comment says "focus on ships that can attack back", so a very hot foe is deprioritised.
  15. Pick (1703): the candidate with the lowest score under the cutoff wins (nemesis rule also at 1703; not read in full).
  16. Fallbacks (1713-1722): an NPC that is special or has scan permission in this system, with no hostile target, takes a non-hostile one (1713). A vindictive ship with no hostile target keeps its current target unless that target is cloaked or in another system (1718-1721; 1718 receipted, 1720-1721 read only).
- Targeter bookkeeping. `SetTargetShip` (4311-4333) adds the ship to the new target's `targetingList` only if the target's government is an enemy (4325-4326). `UpdateTargeterStrength` (4408-4423) is called for each candidate inside `FindTarget` (1667). It first decays the foe's stored value (4411: divide by 1.05, or set to 0 below 1), then adds the `Strength()` of each live ship in the list (4420). The decay therefore runs once per candidate evaluation, not once per second.
- Strength. `Ship::Strength()` returns `Cost()` (1635-1638), so strength is a ship's price, not a combat rating. `AI::UpdateStrengths` (5172) rebuilds the enemy and ally totals each step (the clear starts at 5185; the rest of that block was read but its end line is not receipted). Each ship's stored `shipStrength` (used for the cap at 1625 and the foe comparison at 1653) is refreshed when `Random::Int(60)` returns 0 (5215), which is 1 in 60 per step, so about once a second. The refresh adds the cost of allied governments' ships within 2000 units (5218-5226). `Random::Int(60)` scales a 32-bit draw into [0, 60) (Random.cpp 83).

## 2. Key functions

- `AI::FindTarget`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 1554-1726. The whole pick: cutoff, candidate score, crowd, fallbacks.
- `AI::Step` retarget slot: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 771-773 (step and slot), 782 and 802 (ship loop and presence), 894-903 (turn counter, re-pick trigger, call).
- `Ship::SetTargetShip` and `Ship::UpdateTargeterStrength`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 4311-4333 and 4408-4423.
- `AI::UpdateStrengths` (strength map, ally and enemy totals, per-ship stored strength): `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 5172-5229.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score = predicted separation 60 frames ahead (approaching foes score lower) | Look-ahead 60 frames (1642) |
| Stickiness: keep the current target unless something is clearly better | Bonus 500 (1647) |
| Far-range skip against much stronger foes | Range 1000 (1650); cap 2 x own stored strength (1625) |
| Crowd spreading: penalise a foe already targeted by more than 2 | Count 2 (1672); allies share 0.25 (1675) and cost ratio 2 (1678), each +500 |
| Disabled foes are low priority for non-plunderers | +5000 (1684) |
| Unarmed foes are low priority | +1000, x2 for non-plunderers (1695) |
| Scorn: a foe that boarded this government is preferred | -1000 (1697) |
| Focus on hurt foes | +500 x (shield + hull fraction) (1699) |
| Do not chase a foe that cannot fire back | +3000 x (heat - 0.9) when overheated (1702); floor 0.9 |
| Search cutoff | 4000, or 1.5 x max range when min range is over 1000; hunting is unlimited (1617-1618) |
| Staggered retarget | 32 slots, `step & 31` (773, 898-899) |
| Crowd sum decay | divide by 1.05, zero below 1 (4411); per evaluation |
| Strength refresh | 1 in 60 steps (5215); ally radius 2000 (5225) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's score order (sticky bonus, far-range skip, crowd penalties, disabled, unarmed, scorn, low-health focus, overheat, then lowest-wins under the cutoff) and the slot test. It takes the foe's cost, stored strength, targeter count and crowd sum as inputs. It omits the plunderer branch (boarding targets), the parent's target as a sticky target, the CanPursue fence filter, the merciful and disable-only skips, the nemesis flag, the no-weapon early return, the orders block, the vindictive and non-hostile fallbacks, and the stored-strength refresh. The crowd decay is a separate function, called by the caller once per candidate, as in the donor.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Foe {
  id: number;
  x: number; y: number;          // world units
  vx: number; vy: number;        // world units per tick
  cost: number;                  // ship price (donor Ship::Strength returns Cost)
  storedStrength: number;        // the foe's stored strength estimate (donor shipStrength)
  disabled: boolean;
  overheated: boolean;
  heatFraction: number;          // 0..1+
  armed: boolean;
  hullPlusShield: number;        // shield fraction + hull fraction, 0..2
  targeters: number;             // count of ships already targeting this foe
  targeterStrength: number;      // decayed crowd sum (see decayCrowd)
  boardedMe: boolean;            // this foe has boarded our side
}

export interface Hunter {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  allyStrength: number;          // summed strength of our allies
  ownCapStrength: number;        // 2 x own stored strength; 0 when daring (no cap)
  previousTargetId: number | null;
}

export const TUNE = {
  lookAheadTicks: 60,
  stickyBonus: 500,
  crowdMinTargeters: 2,          // crowd rules only when more than this many target the foe
  crowdAllyShare: 0.25,
  crowdAllyPenalty: 500,
  crowdOverCost: 2,
  crowdOverPenalty: 500,
  disabledPenalty: 5000,
  unarmedPenalty: 1000,
  unarmedNonPlunderMultiplier: 2,
  scornPenalty: 1000,
  focusPerFraction: 500,
  overheatFloor: 0.9,
  overheatPenalty: 3000,
  capFarRange: 1000,
  aggroRange: 4000,
} as const;

// Decayed crowd sum: first decay (zero below 1), then add each live targeter's strength.
// The donor calls this once per candidate evaluation, so the decay is per evaluation.
export function decayCrowd(current: number, targeterStrengths: number[]): number {
  let s = current < 1 ? 0 : current / 1.05;
  for (const t of targeterStrengths) s += t;
  return s;
}

function distanceAhead(h: Hunter, f: Foe, ticks: number): number {
  const dx = (f.x + ticks * f.vx) - (h.x + ticks * h.vx);
  const dy = (f.y + ticks * f.vy) - (h.y + ticks * h.vy);
  return Math.hypot(dx, dy);
}

// Score a foe: lower is better. Returns null when the foe is not eligible.
export function scoreFoe(h: Hunter, f: Foe): number | null {
  let range = distanceAhead(h, f, TUNE.lookAheadTicks);
  const sticky = f.id === h.previousTargetId;
  if (sticky) range -= TUNE.stickyBonus;

  // A hunter does not chase a much stronger foe beyond the far range, unless the foe is disabled.
  if (h.ownCapStrength > 0 && range > TUNE.capFarRange && !f.disabled
      && f.storedStrength > h.ownCapStrength) return null;

  if (!sticky && f.targeters > TUNE.crowdMinTargeters) {
    if (f.targeterStrength >= TUNE.crowdAllyShare * h.allyStrength) range += TUNE.crowdAllyPenalty;
    if (f.targeterStrength >= TUNE.crowdOverCost * f.cost) range += TUNE.crowdOverPenalty;
  }

  // Non-plunderer branch only (the plunder branch is not sketched).
  if (f.disabled) range += TUNE.disabledPenalty;
  if (!f.armed) range += TUNE.unarmedPenalty * TUNE.unarmedNonPlunderMultiplier;

  if (f.boardedMe) range -= TUNE.scornPenalty;
  range += TUNE.focusPerFraction * f.hullPlusShield;
  if (f.overheated) range += TUNE.overheatPenalty * (f.heatFraction - TUNE.overheatFloor);
  return range;
}

// Lowest score wins. The cutoff is compared with the scored range, not the raw distance.
export function pickTarget(h: Hunter, foes: Foe[], hunting: boolean, minRange: number, maxRange: number): Foe | null {
  let closest = hunting ? Infinity : (minRange > 1000 ? maxRange * 1.5 : TUNE.aggroRange);
  let best: Foe | null = null;
  for (const f of foes) {
    const r = scoreFoe(h, f);
    if (r === null) continue;
    if (r < closest) { closest = r; best = f; }
  }
  return best;
}

// Staggered retarget. slotCount is the 1-based count of present, non-swarming ships so far this step.
// A ship re-picks when its slot comes up (slot and step both masked to 0..31), or when its target is gone.
export function shouldRetarget(slotCount: number, step: number,
    target: { alive: boolean; eligible: boolean } | null): boolean {
  if ((slotCount & 31) === (step & 31)) return true;
  return target === null || !target.alive || !target.eligible;
}
```

## 5. Lands in

- TARGET `src/fight/target-select.ts` (new): the engine's pick for a hunting creature among foes, run on the retarget slot. Parity-checklist row 2 (AI brain). The `MAX_ATTACKERS = 3` cap is a separate engine rule and stays where the attack slots are assigned (that file was not read in this pass).
- Best transferable idea: score each candidate by its separation one second ahead, subtract a bonus for the current target, and add penalties for foes that many others already attack, so a group spreads out instead of stacking on one target.
- Decision (proposed): adapt. Keep the look-ahead score, sticky bonus, low-health focus and crowd penalty as the engine's many-vs-one pick; keep `MAX_ATTACKERS = 3` as a hard engine cap (the donor only penalises, it never caps); do not copy the cumulative stored strength (section 6).
- Acceptance: a server test with one hero and four creatures and `MAX_ATTACKERS = 3` asserts that no more than three creatures are in attack state on any tick, and that when one attacker dies the waiting creature with the lowest score engages within one retarget cycle (32 ticks in the donor's scheme), with the same pick for the same seed and positions.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (target choice lives in the engine, not in the client); the `MAX_ATTACKERS = 3` ruling (the cap stays a hard rule in the engine)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism, not translated from the donor lines.
- Soft penalty, not a cap. The donor never refuses a target because too many already attack it; it only adds 500 or 1000 units to the score. Frankendom's `MAX_ATTACKERS = 3` is a hard rule, so the crowd penalty can only order the creatures that are waiting. It cannot replace the cap.
- Stored strength looks cumulative. `UpdateStrengths` adds into `shipStrength` with `+=` (5218-5226). The only `clear()` found is in `AI::Clean` (715), and I did not find a reset inside `UpdateStrengths`. As read, a ship's stored strength, and so its 2 x cap, grows the longer it stays in the system. This was not run. Frankendom must use a value recomputed each tick, or a decayed one, and test it. Do not copy the accumulation.
- Retarget slots follow list order (771-773, 898). A creature's slot moves when another enters or leaves the list. Frankendom should key the slot on a stable creature id, and state the slot count (32) as an engine constant.
- Units. The look-ahead is 60 frames and the constants are in world units tuned to Endless Sky's scale. Frankendom must write them as ticks and units, as engine constants for the rules (stickiness, crowd, focus) and as zone data for the aggro range (4000) and the far range, after a replay check.
- Crowd decay runs once per candidate evaluation (4411, 1667), so its half-life depends on how many foes are scored, not on time. Frankendom should decay once per tick, not per candidate.
- Two ledgers. The donor keeps `targetingList` and the crowd sum on each ship object. Frankendom's one-ledger rule means the attacker list must be the server's single list, and the crowd sum must be derived from it.
- Not ported: plunder and boarding branch, merciful and disable-only skips, nemesis flag, vindictive and non-hostile fallbacks. The nemesis block (1703) and the mercy lines (1658 and 1662) were read but not checked line by line.
- The donor comment says "0 to 30" (772), but the code uses `& 31`. Use the code, not the comment.
