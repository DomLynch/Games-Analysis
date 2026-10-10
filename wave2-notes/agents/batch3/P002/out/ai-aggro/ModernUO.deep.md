# ModernUO (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs` | Licence: GPL-3.0 (`LICENSE` line 3: "Version 3, 29 June 2007"; file headers: "either version 3 of the License, or" any later version) | C# | symbol `AcquireFocusMob`

Checked: Read the scan path in full: `BaseAI.cs` 853-911 (`AcquireFocusMob`), 913-1043 (bard, controlled, constant focus, aggressor short-circuit, `AcquireNewFocusMob`), 1045-1110 (filters), 138-188 (retaliation and closer-aggressor). `BaseCreature.cs` read at 1090-1094, 1315-1360, 2731-2744, 2781-2810, 3061-3080 (ranking, approach, forced reacquire, aggressive-action hook); 171 and 1321 by grep and their lines. `MeleeAI.cs` read at 14-140 (the callers that use the scan). `AITimer.cs` read at 1-142 of 249: the think timer is only partly read (the rest of `OnTickCore` is not read). `AcquisitionTests.cs` read by grep and selected test bodies (corroboration only). Hint file `FamiliarAITests.cs` was not opened; it is a familiar test and does not hold the scan. Callers of `AcquireFocusMob` checked: `BaseAI.cs:817` and `827`, `MeleeAI.cs:77`, `106`, `127` (read); `AnimalAI`, `PredatorAI`, `BerserkAI`, `HealerAI`, `MageAI` (grep only). Confidence: high on the scan gate, the scoring and the reaction; medium on the think cadence, because `AITimer` 142-249 and `OnThink` were not read. Units of `InRange` (tiles) are (not read).

## 1. Mechanism

- One scan function picks a focus target for a creature: `AcquireFocusMob(iRange, acqType, bPlayerOnly, bFacFriend, bFacFoe)` (`BaseAI.cs:853`). Callers pass the creature's `RangePerception` (16 by default, `BaseCreature.cs:171`) and its `FightMode`.
- Order of steps inside the scan, as the code runs:
  (a) bail if the creature is deleted or has no map, or is bard-pacified (`BaseAI.cs:855-863`);
  (b) bard-provoked target wins (865-868); a controlled creature goes to `HandleControlled` and never falls through to wild targeting (872-875); a constant focus wins (877-880);
  (c) `FightMode.None` clears the focus and returns false (882-886);
  (d) `Aggressor` mode with nobody who has attacked or been attacked, and no faction or ethic allegiance, clears the focus and returns false with no scan (`HandleAggressor`, 888-891; 978-991);
  (e) the gate: `gateRemaining = NextReacquireTime - now` (893-894). A gate that is positive and no larger than `ReacquireDelay` blocks the scan (896-900). A gate larger than `ReacquireDelay` is treated as open (the comment at 80-81 of the test file says so). If the gate is zero or negative, the scan runs;
  (f) `AcquireNewFocusMob` (904). It walks `GetMobilesInRange(location, iRange)`, drops invalid candidates (1001-1014, 1045-1089), skips the summon master into a side slot (1017-1025), scores each one with `GetFightModeRanking` (1027), and keeps the one with the highest score that is in line of sight (1029-1033). A tie keeps the first candidate seen. The result is the best normal target, else an enemy summon (AOS only), else the summon master (1041-1042);
  (g) after the scan, the gate is re-armed to `now + ReacquireDelay` whether or not a target was found (908).
- Scoring (`BaseCreature.cs:2731-2744`): if `bPlayerOnly` and the candidate is not a player the score is `double.MinValue`. `Strongest` = `Skills.Tactics.Value + Str`. `Weakest` = `-Hits`. Any other mode (`Closest`, and the default for `Evil` and `Aggressor`) = `-GetDistanceToSqrt`, so the nearest scores highest.
- Filters for mode `Aggressor` or `Evil` (1077-1089): the candidate must be hostile (it has attacked or been attacked, or is the creature's combatant, or holds an enemy faction or ethic allegiance). `Evil` also keeps a candidate whose master (or own) karma is negative.
- Approach pull (`BaseCreature.cs:1334-1359`, called from `OnMovement` at 3066-3071): when an enemy moves inside 10 tiles (`AcquireOnApproachRange`, 1330) and the creature has no combatant, is not controlled, summoned or pacified, is not `None` or `Aggressor`, and the enemy is an enemy that can be harmed, the scan deadline becomes `now + AcquireOnApproachDelay` (2 s by default, 0 for paragons, 1326). The gate is only moved earlier (1339-1341). When the delay is zero, a think is forced now (1344-1348).
- Attack reaction (`BaseCreature.cs:2781-2798`, `BaseAI.cs:138-171`): the retaliation policy runs first. It can refuse (friendly fire, or stand-down order). If it accepts, a visible closer aggressor takes over (`PreferCloserAggressor`, 174-187), and an idle creature takes the aggressor as combatant and goes to war mode (164-168). If it accepted, `ForceReacquire` sets the gate to now (3061-3063), so the next poll scans at once.
- Leash: when the melee AI's combatant is out of `RangePerception` and a rescan finds no new target, it drops the combatant if the combatant is beyond `ChaseLeashRange` = 2 x `RangePerception` = 32 (`MeleeAI.cs:75-87`; `BaseCreature.cs:1094`).
- Tick: the think loop is `AITimer`, a timer whose interval is the creature's `CurrentSpeed` seconds (`AITimer.cs:35`), with a random first start of 0-255 ms (54). `Prod()` sets the delay to zero for an immediate think (60-72). When due, the tick calls `_owner.Mobile.OnThink()` (137-139). The melee guard path calls the scan from `DoActionGuard` (`MeleeAI.cs:125-139`).

## 2. Key functions

- `AcquireFocusMob`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs` 853-911. The gate, the mode checks, the scan and the re-arm.
- `AcquireNewFocusMob`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs` 993-1043. The candidate loop and the best-score pick.
- Candidate filters: `BaseAI.cs` 1045-1110 (`IsInvalidTarget`, `IsInvalidSummonTarget`, `IsInvalidFactionTarget`, `IsInvalidFightModeTarget`).
- Retaliation: `BaseAI.cs` 138-188 (`OnAggressiveAction`, `PreferCloserAggressor`).
- Ranking: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 2731-2744 (`GetFightModeRanking`).
- Approach and forced reacquire: `BaseCreature.cs` 1334-1359 and 3061-3075.
- Aggressive action hook: `BaseCreature.cs` 2781-2810.
- Melee caller: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/MeleeAI.cs` 58-140.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score each filtered, in-sight candidate by mode; take the highest, first one wins a tie | Closest = -squared distance; Weakest = -Hits; Strongest = Tactics + Str (`BaseCreature.cs:2738-2742`) |
| One scan gate with a timestamp; blocks while the remaining time is within the re-arm; re-armed after every scan | `ReacquireDelay` = 10 s by default (`BaseCreature.cs:1321`); faction guards 2 s (`BaseFactionGuard.cs:81`) |
| An enemy entering approach range clamps the gate earlier, never later | Range 10 tiles (`BaseCreature.cs:1330`); delay 2 s (1326); paragons 0 s (1326) |
| Attacked: scan at once | Gate set to now (`BaseCreature.cs:3063`) |
| Give up a combatant beyond the leash | 2 x `RangePerception` (16) = 32 (`BaseCreature.cs:1094`, 171) |
| Think timer | Interval = `CurrentSpeed` seconds (`AITimer.cs:35`); first start 0-255 ms (54) |

The scan uses `Core.TickCount` (wall-clock milliseconds) for its gate (`BaseAI.cs:894`, `908`). The test file pins this: an empty scan leaves the gate 5-10 s out (`AcquisitionTests.cs:63`).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the scan (mode None, then the aggressor short-circuit, then the gate, then the scan with strict `>` and line of sight, then the re-arm after the scan), and it keeps the approach clamp and the forced reacquire. It omits the bard-provoked, controlled-order and constant-focus branches that come before the mode check in the donor; the summon-master and enemy-summon fallbacks; faction and ethic allegiance filters; the familiar, blessed, staff and dead-bonded filters (the candidates arrive pre-filtered, with `isPlayer` only for `playerOnly`); the retaliation policy (`OnAggressiveAction`, `PreferCloserAggressor`); and the `Core.TickCount` clock (the sketch takes `now`). It uses `-Infinity` where the donor uses `double.MinValue` for a filtered candidate; both are never chosen.

```ts
// Licence: GPL-3.0-or-later (donor, ModernUO). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type FightMode = 'none' | 'aggressor' | 'strongest' | 'weakest' | 'closest';

export interface Candidate {
  id: string;
  distSq: number;      // squared distance from the creature
  tactics: number;     // skill + strength, used by 'strongest'
  hits: number;        // current hit points, used by 'weakest'
  inLos: boolean;      // line of sight to the creature
  isPlayer: boolean;
}

export interface Mind {
  gate: number;            // no scan before this time (ms)
  reacquireDelay: number;  // full re-arm after every scan (ms)
  approachDelay: number;   // delay an enemy entering approach range pulls the scan to (ms)
  focus: string | null;
}

// Higher score wins. Mode 'closest' prefers the smallest distance.
function score(mode: FightMode, c: Candidate, playerOnly: boolean): number {
  if (playerOnly && !c.isPlayer) return -Infinity;
  if (mode === 'strongest') return c.tactics;
  if (mode === 'weakest') return -c.hits;
  return -c.distSq;
}

// One scan. Honours the gate the way the donor does, then re-arms the gate after the scan.
export function acquire(
  m: Mind, now: number, mode: FightMode, cands: Candidate[], playerOnly: boolean, anyAggressor: boolean,
): string | null {
  if (mode === 'none') { m.focus = null; return null; }
  if (mode === 'aggressor' && !anyAggressor) { m.focus = null; return null; }  // nobody hostile: no scan at all

  const remain = m.gate - now;
  if (remain > 0 && remain <= m.reacquireDelay) { m.focus = null; return null; }  // inside the gate
  // A gate further out than the re-arm is illegal and reads as open (the scan runs).

  let best: Candidate | null = null;
  let bestVal = -Infinity;
  for (const c of cands) {
    const v = score(mode, c, playerOnly);
    if (v > bestVal && c.inLos) { best = c; bestVal = v; }   // strict '>': the first candidate wins ties
  }
  m.gate = now + m.reacquireDelay;   // re-arm after every scan, found or not
  m.focus = best ? best.id : null;
  return m.focus;
}

// An enemy inside approach range pulls the next scan earlier. It clamps the deadline; it never extends it.
export function scheduleOnApproach(m: Mind, now: number): void {
  const deadline = now + m.approachDelay;
  if (deadline - m.gate < 0) m.gate = deadline;
}

// Being attacked: the next poll scans at once.
export function forceReacquire(m: Mind, now: number): void {
  m.gate = now;
}
```

Typecheck: `work/modernuo-aggro.ts` (this block plus `export {};`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (proposed new module: the engine's target choice and the aggro gate; not checked against the repo). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: target choice lives in the engine, not in the creature class); rules 7-9 n/a

Best transferable idea: pick a target by a per-mode score over filtered, in-sight candidates, let an enemy entering a short approach radius pull the next scan earlier, and re-arm one scan gate after every scan.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- MAX_ATTACKERS = 3 is not in the donor. Many creatures can pick the same focus (no slot count appears in `AcquireNewFocusMob`, 993-1043). Frankendom needs a slot check in the engine's target choice, so a fourth attacker waits. This is the largest gap.
- Wall-clock gates: the gate is `Core.TickCount` milliseconds (`BaseAI.cs:894`, `908`). Frankendom's server must express the gate in fixed ticks, or the outcome will depend on frame timing.
- Scoring is a virtual method on the creature class (`BaseCreature.cs:2731`), overridden per monster (for example `BladeSpirits`, `AnimatedWeapon`, `EnergyVortex` by grep). Frankendom's rule is zones as data: the fight mode and scores should be data fields, with defaults.
- The approach pull is tuned for wandering mobs (2 s, 10 tiles). In a fast duel the scan delay must be zero or the engine must be the one that engages (duel step). Do not copy the 2 s delay into the Pit.
- The retaliation rule that a visible closer aggressor takes over is one rule for pets and monsters. Frankendom's one-ledger rule needs one hate record; the donor keeps two lists (`Aggressors`, `Aggressed`) that are read by `IsAggressor` and `IsAggressed` (`BaseAI.cs:1094-1110`).
- Line of sight (`Mobile.InLOS`) and the distance units are (not read).
- Stand-down and friendly-fire rules are control-order rules (pets, guards). Frankendom has no command model in the duel, so only the gate and the scoring transfer.
