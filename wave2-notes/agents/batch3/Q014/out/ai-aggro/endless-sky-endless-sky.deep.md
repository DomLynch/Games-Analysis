# endless-sky-endless-sky (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` (also read: `Engine.cpp`, `Ship.cpp`, `main.cpp`) | Licence: GPL-3.0-or-later (AI.cpp header: "either version 3 of the License, or (at your option) any later version"; `license.txt` is GPL v3) | C++ | symbol `AI::FindTarget`

Checked: Symbol `AI::FindTarget` is at 1554 and closes at 1726 (read in full). `ShouldFlee` (350-371) read in full. The retarget gate and the flee branch in `AI::Step` (771-773, 896-955) read. Not read: `GetShipsList` (the candidate list), `AI::MoveToAttack`/chase body, the caller `Engine::CalculateUnpaused` (only the call at Engine.cpp:1734 read), `Ship::HealthFraction`. Confidence high on the target score and the retarget cadence; medium on the wider `AI::Step` (only the two parts above read). Cell = category_no 2. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- Clock: `main.cpp` locks the game loop to 60 FPS (573). `Engine.cpp:1734` calls `ai.Step(activeCommands)` once per unpaused update. `AI::Step` advances a counter `step = (step + 1) & 63` (771). Every timing number below is in AI steps (frames at 60 FPS). There is no delta-time argument.
- Retarget gate (per ship, inside the `AI::Step` loop, 896-904). Each eligible ship increments `targetTurn = (targetTurn + 1) & 31` (898). It re-picks when `targetTurn == targetStep` (where `targetStep = step & 31`, 773), or immediately when it has no target, the target is destroyed, the target is disabled and the ship's personality disables or the target is not a valid fighter target and the ship is not vindictive (899-900), the target is fleeing and the ship is merciful, or the target is not targetable (901). Effect: each ship re-picks about every 32 steps, and ships are spread across the 32 slots by their order in the list. The donor's own comment says "about twice a second" (896). The re-pick is `target = FindTarget(*it)` (903), then `SetTargetShip` (904).
- `FindTarget` (1554-1726), order of steps:
  1. Pacifists and ships with no government get `FindNonHostileTarget` (1557-1559). Player-owned ships return their order target for ATTACK, FINISH_OFF or SCAN orders (1564-1572).
  2. Ranges: the shortest and longest non-special weapon range are taken. With no weapon (`maxRange` 0), player ships get no target and other ships get `FindNonHostileTarget` (1581-1592).
  3. Reach: `closest` starts at infinity for hunters, else `maxRange * 1.5` if `minRange > 1000`, else 4000 (1617-1618). A foe only wins if its final score is below this value (1703).
  4. Old target: a non-targetable old target is dropped. A timid ship drops a disabled old target more than 1000 px away (1598-1600). A plunderer keeps a boarded, disabled old target (1602-1604).
  5. Strength cap: unless the ship is daring, `maxStrength = 2 * own strength` (1624-1625). Foes stronger than that are skipped when more than 1000 px away and not disabled (1650-1655).
  6. For each hostile foe from `GetShipsList(ship, true)` (1628, not read): skip if `CanPursue` fails (the invisible fence; definition 1403-1419, call 1638-1639). Merciful ships skip fleeing foes (1658-1659). Disable-only ships, and non-nemesis ships toward a foe that is not the old target, skip disabled foes unless the ship can plunder and has boarded it (1662-1663).
  7. Score = distance between the predicted positions of foe and self, 60 frames ahead (1641-1643). Then:
     - previous target or parent's target: -500 (1645-1647).
     - if not preferred and more than 2 ships already target this foe: +500 if the targeters' strength is at least 25% of allied strength (1672-1676); another +500 if the targeters' strength is at least 2x the foe's strength (1678-1679). The targeter strength is decayed by /1.05 and topped up from the live targeter list (`Ship.cpp:4408-4422`), called once per foe per `FindTarget` call (1666).
     - disabled foe, non-plunder: +5000 (1684). Plunderer branch (1686-1691): skip a foe already being boarded by another ship (1688-1690), otherwise +2000 x (2 x disabled - not boarded by this ship) (1691).
     - unarmed foe: +1000 x (1 + not plunders), so +2000 for a non-plunderer (1695).
     - nearly dead: +500 x (shield fraction + hull fraction) (1699).
     - overheated foe: +3000 x (heat fraction - 0.9) (1701-1702).
  8. The lowest score below the reach wins (1703-1706). Nemesis rules can override this (1703).
- Flee (`ShouldFlee`, 350-371): true if the personality is fleeing. False if staying. Otherwise true if `HealthFraction < 0.25 + 0.25 * coward` and the ship is not daring (360-362), or if the AI cache says it needs ammo (364-365), or if it is a getaway with no cargo room and no parent (367-368). In `AI::Step` (925-955): a non-yours ship that should flee and has an enemy target that is not disabled either drops the target if it can jump or land on an inhabited planet, then sets fleeing. If there is nowhere to go it stops fleeing (`SetFleeing(false)`).
- Targeter bookkeeping: `Ship::SetTargetShip` appends the attacker to the foe's `targetingList` if they are enemies (`Ship.cpp:4326`), and removes it from the old target's list (4318-4320). This is what the "targeter count" and "targeter strength" above read.

## 2. Key functions

- `AI::FindTarget`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 1554-1726. The whole target choice: reach, previous-target bias, over-targeting spread, armed and nearly-dead weights, overheat weight, lowest score.
- `AI::Step`, retarget gate: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 771-773 (step counter and 32-slot target step) and 896-904 (per-ship turn and forced re-pick).
- `ShouldFlee`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 350-371.
- Flee branch in `AI::Step`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 925-955.
- `Ship::SetTargetShip` and `Ship::UpdateTargeterStrength`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 4308-4332 and 4408-4422.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score a candidate by its distance a fixed time ahead, using both velocities | Horizon 60 frames (theirs, AI.cpp 1641-1642) |
| Stickiness: a bonus to keep the current target | -500 (theirs, 1647) |
| Spread a many-on-one fight: penalise a target already claimed by 3 or more attackers | "more than 2" (theirs, 1672); penalty 500 twice (theirs, 1676, 1679); thresholds 0.25 of allied strength and 2x the target's strength (theirs, 1675, 1678) |
| Weapon-less player ships pick nothing; reach is tied to weapon range | Reach 4000, or 1.5 x max range when min range > 1000 (theirs, 1618) |
| Armed, weakened and overheated foes are preferred or avoided by score | Unarmed +1000 x (1 + not plunder) (theirs, 1695); nearly dead +500 x (shield + hull) (theirs, 1699); overheat +3000 x (heat - 0.9) (theirs, 1702) |
| Retarget on a staggered schedule, forced when the target is gone | 32-step slot cycle (theirs, 773, 898) |
| Flee below a health fraction, with a bonus for cowards | 0.25 (theirs, 348); +0.25 for coward (theirs, 360) |

## 4. TypeScript sketch

simplified: this sketch keeps the donor order for the scoring (predicted distance, previous-target bonus, over-target spread, unarmed, nearly dead, overheat, lowest score under reach), and the 32-slot retarget gate and the flee rule. It omits the plunder and boarding branches, the nemesis rule, the invisible fence (`CanPursue`), the parent's target, the strength cap for non-daring ships, the disabled-foe filters, the merciful and fleeing rules, the `FindNonHostileTarget` path, the vindictive fallback, and the player order path. Strength is one number here, not the decayed targeter-strength sum. The donor decays targeter strength per call; the sketch takes the decayed values as inputs.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Vec { x: number; y: number; }
interface Body { pos: Vec; vel: Vec; }

interface Foe extends Body {
  id: string;
  strength: number;          // cost-based strength of the foe
  armed: boolean;
  shieldFraction: number;    // 0..1
  hullFraction: number;      // 0..1
  heat: number;              // 0..1
  overheated: boolean;
  targeterCount: number;     // how many of our side already target this foe
  targeterStrength: number;  // summed strength of those attackers
}

interface Attacker extends Body {
  minRange: number;          // shortest non-special weapon range, px
  maxRange: number;          // longest non-special weapon range, px
  hunting: boolean;
  plunders: boolean;
  alliedStrength: number;    // strength of our side in the system
  previousTargetId?: string;
}

// Numbers as read in the donor (AI.cpp 1617-1703, 348-361, 771-773, 898).
const PREDICT_FRAMES = 60;            // "a second from now" at 60 FPS
const PREFERRED_BONUS = -500;         // previous target scores 500 closer
const OVER_TARGET_PENALTY = 500;      // applied at most twice
const UNARMED_WEIGHT = 1000;          // times (1 + !plunders)
const NEARLY_DEAD_WEIGHT = 500;       // times (shield + hull fraction)
const OVERHEAT_WEIGHT = 3000;         // times (heat - 0.9), only when overheated
const DEFAULT_REACH = 4000;           // reach for short-range, non-hunting ships
const LONG_RANGE_CUTOFF = 1000;

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function ahead(b: Body, frames: number): Vec {
  return { x: b.pos.x + frames * b.vel.x, y: b.pos.y + frames * b.vel.y };
}

// Lowest score wins. The score is a distance in px plus penalties and bonuses.
export function pickTarget(self: Attacker, foes: Foe[]): string | undefined {
  const reach = self.minRange > LONG_RANGE_CUTOFF ? self.maxRange * 1.5 : DEFAULT_REACH;
  let best: string | undefined;
  let bestScore = reach; // a foe must score below the reach to be chosen
  for (const foe of foes) {
    const preferred = foe.id === self.previousTargetId;
    let score = dist(ahead(foe, PREDICT_FRAMES), ahead(self, PREDICT_FRAMES));
    if (preferred) score += PREFERRED_BONUS;
    if (!preferred && foe.targeterCount > 2) {
      if (foe.targeterStrength >= 0.25 * self.alliedStrength) score += OVER_TARGET_PENALTY;
      if (foe.targeterStrength >= 2 * foe.strength) score += OVER_TARGET_PENALTY;
    }
    if (!foe.armed) score += UNARMED_WEIGHT * (self.plunders ? 1 : 2);
    score += NEARLY_DEAD_WEIGHT * (foe.shieldFraction + foe.hullFraction);
    if (foe.overheated) score += OVERHEAT_WEIGHT * (foe.heat - 0.9);
    if (score < bestScore) { bestScore = score; best = foe.id; }
  }
  return best;
}

// Retarget gate. step is the AI step counter (0..63); ordinal is this ship's index among
// eligible ships in list order. Donor: a ship retargets when (ordinal+1)&31 equals step&31,
// or when it has no target or the target is gone.
export function retargetDue(step: number, ordinal: number, targetGone: boolean): boolean {
  return ((ordinal + 1) & 31) === (step & 31) || targetGone;
}

// Flee rule from ShouldFlee: low health (coward raises the bar) or no ammo, unless daring.
export function shouldFlee(healthFraction: number, coward: boolean, daring: boolean, needsAmmo: boolean): boolean {
  const lowHealth = healthFraction < 0.25 + 0.25 * (coward ? 1 : 0);
  if (!daring && lowHealth) return true;
  return needsAmmo;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the engine's AI brain: target choice and retarget cadence for NPCs, server-side). Parity-checklist row 2 (AI brain). The retarget slot count is a fight-loop cadence, so it also touches row 4 (fight loop, aggro); the note cites row 2 only.
- Frankendom has no target choice for many-on-one yet beyond the MAX_ATTACKERS = 3 rule (checked by design only; not read in the repo, so no "today" file is named).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the target choice lives in the engine, not the client); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; the donor's code is not translated.
- The donor's spread is a penalty, not a cap. A foe with 3 or more attackers can still be chosen when it is much closer than the alternatives. Frankendom's MAX_ATTACKERS = 3 must stay a hard rule in the engine; this scoring only chooses between legal targets.
- The donor compares strengths (cost-based) and decays a targeter-strength sum per call. Frankendom has no ship strength. An attacker count per target is the honest analogue; the strength terms need a Frankendom equivalent or should be dropped.
- Frame-locked: every number is per AI step at 60 FPS. A server tick in Frankendom must use the fixed step, not a wall-clock frame count. The 32-slot cadence is in steps, so it changes if the server rate changes (server tick: fixed step, input intake, per-tick NPC budget, row 18 / post-K item 3).
- The donor's retarget is a stagger by list order, not by distance or time since last pick. A new target in the 32-slot cycle waits up to about 0.5 s at 60 FPS. A fast duel may need the forced re-pick on a hit; the donor forces it only on target loss, disable, flee, or untargetable.
- Chase and leash are not covered: `MoveToAttack` and the chase body were not read. The donor's invisible fence (`CanPursue`, AI.cpp 411 and 757) is a space-game leash and does not transfer as is.
- Plunder, boarding, nemesis, merciful, vindictive, and escort rules are donor-specific and are left out of the sketch.

Best transferable idea: score each candidate target by its predicted distance plus a spread penalty for foes already claimed by several attackers, and re-pick on a staggered slot schedule so a many-on-one fight spreads out instead of piling onto the nearest foe.
Decision (proposed): adapt — take the spread penalty and the staggered re-pick, but count attackers per target (MAX_ATTACKERS = 3 stays the hard rule in the engine) instead of the donor's strength sums, which Frankendom does not have.
Acceptance: a server test with three NPCs already on target A, and target B about 300 px farther away, has the fourth NPC pick B; the engine still refuses a fourth attacker on A.
