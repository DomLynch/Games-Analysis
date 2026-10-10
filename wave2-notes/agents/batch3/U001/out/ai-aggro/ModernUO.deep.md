# ModernUO (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs` | Licence: GPL-3.0 (repo `LICENSE`, GNU GPL version 3; no per-file licence header in the lines read) | C# | symbols `BaseAI.AcquireFocusMob`, `BaseAI.AcquireNewFocusMob`, `BaseCreature.ScheduleAcquireOnApproach`, `BaseCreature.GetFightModeRanking`, `MeleeAI.HandleOutOfRangeCombatant`

Checked: Read in full: `BaseAI.AcquireFocusMob` (BaseAI.cs 853-910), `HandleAggressor` (978-991), `AcquireNewFocusMob` (993-1043), the filters (1045-1108), `Think` dispatch (268-306), `DoActionCombat` (477-500), `CheckFlee`/`StartFlee` (764-810), `OnAggressiveAction` and `PreferCloserAggressor` (138-190); `BaseCreature` reacquire constants and approach logic (171, 1094, 1321-1360), `GetFightModeRanking` (2731-2745), `AggressiveAction` hand-off (2790-2800), `ForceReacquire` (3061-3064), `OnMovement` hook (3066-3070); `MeleeAI` wander, combat and flee (14-150); `AITimer` think cadence (60, 137-170). Test names read in `UOContent.Tests/Tests/Mobiles/AI/AcquisitionTests.cs` (header and test names only; bodies not read), which describe the same gate and approach gradient. Not read: the `BaseCreature.CheckFlee` body (BaseCreature.cs 4324, called from `BaseAI.CheckFlee`), `GetMobilesInRange` (the range query shape), `GetDistanceToSqrt` body, the `CanBeHarmful`/`IsEnemy` bodies. Confidence: high on the scan gate, the ranking and the approach clamp; medium on the flee path (the `BaseCreature.CheckFlee` gate was not read). Camera scope: not applicable.

## 1. Mechanism

- Think loop: each creature has an `AITimer` that thinks when due (AITimer.cs 137). The next think is `now + CurrentSpeed x 1000` ms (155-156). Idle creatures (speed equal to passive speed) add a random offset of plus or minus one eighth of the period (164-165), so creatures spawned together drift apart. Engaged creatures keep an exact period. `Prod()` (60) forces a think now.
- Each think, flee is checked first (`BaseAI.Think`, 275). Then the action runs. Wander (MeleeAI) calls `AcquireFocusMob(RangePerception, FightMode, bPlayerOnly=false, bFacFriend=false, bFacFoe=true)` (MeleeAI.cs 16). If it finds a target, `Combatant = FocusMob` and the action becomes Combat (18-21). Combat (MeleeAI `DoActionCombat`, 33-) checks the combatant, and if it is outside RangePerception it calls `HandleOutOfRangeCombatant` (44-45).
- The scan gate (`AcquireFocusMob`, 853-908), in order: (a) no scan while bard-pacified; controlled creatures use their order instead (HandleControlled); a constant focus wins. (b) `FightMode.None` clears focus and returns. (c) `HandleAggressor` (978): in `Aggressor` mode with no aggressors, no aggressed and no faction or ethic allegiance, the creature stays idle and does not scan. (d) The gate: `remaining = NextReacquireTime - now` (894). If `0 < remaining <= ReacquireDelay` (896) the scan is skipped and focus is cleared. So a scan runs only once the gate has run down. (e) Otherwise `AcquireNewFocusMob` runs, then `NextReacquireTime = now + ReacquireDelay` (908) whether or not a target was found. Every scan re-arms the full delay.
- Candidate choice (`AcquireNewFocusMob`, 993-1041): for each mobile in the range query, skip invalid ones (`IsInvalidTarget`: deleted, blessed, self, familiar, dead, staff, not visible to the creature, and not a player when player-only is set), skip summon and faction rules, and in `Aggressor`/`Evil` mode skip anyone not hostile (1079-1088). Each valid candidate is scored with `GetFightModeRanking` (1027). A candidate that scores strictly higher and is in line of sight (1029) becomes the best, so the first best wins a tie. The chosen focus is the new best, else an enemy summon, else the summon master (1041).
- Scoring (`GetFightModeRanking`, BaseCreature.cs 2731-2745): `Strongest` = tactics + strength (2740); `Weakest` = negative hits (2741); anything else, the default `Closest`, = negative distance (2742, via `GetDistanceToSqrt`). Player-only scans give the lowest value to non-players (2733-2734).
- Approach pull (BaseCreature.cs 1321-1360, 3066-3070): a creature with no combatant, not controlled or summoned, not `None` or `Aggressor` mode, sees an enemy step inside `AcquireOnApproachRange` = 10 (1330, 1358). Then `ScheduleAcquireOnApproach` (1334) sets the deadline to `now + AcquireOnApproachDelay` (2 s, 1326; zero for paragons). It only moves the gate earlier (`deadline - NextReacquireTime < 0`, 1339). A zero delay prods the think timer. So the ambient scan runs every 10 s (1321), and a nearby enemy pulls the next scan to within 2 s.
- Aggression (`BaseCreature.AggressiveAction`, 2790-2800): the AI's `OnAggressiveAction` decides. If it returns false, the creature stops. Otherwise it stops flee, forces a reacquire (`ForceReacquire` sets the gate to now, 3061-3063), and marks the attacker. `OnAggressiveAction` (BaseAI.cs 138-172) returns false for a friendly-fire guard or a stand-down order. Otherwise `PreferCloserAggressor` (174-185) switches to a visible attacker closer than the current combatant, and a creature with no combatant takes the attacker.
- Leash (MeleeAI `HandleOutOfRangeCombatant`, 75-97): with the combatant outside RangePerception, a rescan runs first (77). If it finds a focus, that becomes the combatant (79-80). Otherwise, if the combatant is beyond `ChaseLeashRange` = 2 x RangePerception (BaseCreature.cs 1094), the combatant is dropped (84-86) and the creature goes to Guard (92). Otherwise it keeps chasing.
- Flee (`BaseAI.StartFlee`, 785-807; MeleeAI 11-12, 144): on each think the creature flees if its hit fraction is at or below `FleeHealthThreshold` (800) and a roll is below `FleeChance` (805). Melee uses threshold 0.2 and chance 0.1 (MeleeAI.cs 11-12). Before the roll, `CheckFlee()` runs first (`Mobile.CheckFlee()` keeps an existing flee going, 766-778), and `StartFlee` returns false at once if `Mobile.CanFlee` is false (793). The flee lasts `Utility.Random(10, 30)` seconds (780); `Utility.Random(from, count)` is `from + Next(count)` (`BuiltInRng.cs` 34), so 10 to 39 s, not 10 to 30. In MeleeAI `DoActionFlee` (142-144), the creature returns to combat when its hits go back above the threshold.

## 2. Key functions

- `AcquireFocusMob`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs` 853-910. The gate, the ambient scan and the re-arm.
- `AcquireNewFocusMob`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs` 993-1043. Candidate filter, ranking, strict-max choice, the focus picked.
- `ScheduleAcquireOnApproach` and the approach trigger: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 1321-1360. The approach pull and its clamp.
- `GetFightModeRanking`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 2731-2745. The three rankings.
- `HandleOutOfRangeCombatant`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/MeleeAI.cs` 75-97. Rescan, then leash drop, then guard.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Scan only when the gate has run down; every scan re-arms a full period | Ambient period 10 s (BaseCreature.cs 1321); gate test `0 < remaining <= delay` (BaseAI.cs 896) |
| Enemy stepping within range pulls the next scan earlier, never later | Approach range 10 tiles (BaseCreature.cs 1330); approach delay 2 s (1326); paragon 0 (1326) |
| Best-ranked visible hostile in range wins; first seen wins ties | Ranking: closest = negative distance (2742); weakest = negative hits (2741); strongest = tactics + strength (2740) |
| Leash: drop a combatant that is too far after a failed rescan | Chase leash = 2 x perception (BaseCreature.cs 1094); perception 16 (BaseCreature.cs 171) |
| Flee when hit fraction is at or below a threshold, on a roll | Melee threshold 0.2, chance 0.1 (MeleeAI.cs 11-12); flee 10 to 39 s (`Utility.Random(10, 30)` = 10 + Next(30); BaseAI.cs 780, BuiltInRng.cs 34) |
| Think period from speed; idle creatures jitter by one eighth | Period = speed x 1000 ms (AITimer.cs 155); jitter = period >> 3 (AITimer.cs 164-165) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for one creature: the aggressor-mode check, then the scan gate (blocked while the remaining time is in (0, period]), then the candidate filter with a strict-greater pick, then the gate re-armed after every scan. The approach pull only moves the gate earlier; zero means think now. The leash drop follows a failed rescan, as in the donor. It omits: the `Strongest` ranking (stat-based, rejected in the decision); the faction, ethic, summon, bard and control filters; the `GetMobilesInRange` box query (not read; the sketch uses Euclidean distance); the hidden-aggressor check in `PreferCloserAggressor`; `ForceReacquire` after an aggression; the Melee flee exit back to combat; the movement-blocked path; the think cadence; the `CanFlee` gate and the duration of a flee (10 to 39 s in the donor), and the approach pull's `ShouldAcquireOnApproach` exclusions of bard-pacified, summoned and controlled creatures (BaseCreature.cs 1354-1359; the sketch's `enemy` flag stands for `IsEnemy && CanBeHarmful`).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type FocusMode = 'none' | 'aggressor' | 'strongest' | 'weakest' | 'closest';

export interface Foe {
  id: string;
  x: number;
  y: number;
  hits: number;
  hitsMax: number;
  alive: boolean;
  inLos: boolean;
  hostile: boolean;   // combatant, aggressor or aggressed toward this creature (used by the aggressor-mode filter)
  enemy: boolean;     // donor IsEnemy(m) && CanBeHarmful(m, false); gates the approach pull (a stranger can qualify)
  tactics: number;
  str: number;
}

export interface Brain {
  x: number;
  y: number;
  mode: FocusMode;
  perception: number;    // scan range in tiles (donor default 16)
  nextScanAt: number;    // ms; the scan gate
  combatant: Foe | null;
  focus: Foe | null;
}

export interface Tuning {
  reacquireMs: number;   // ambient scan period (donor 10 s)
  approachMs: number;    // delay after an enemy steps into approach range (donor 2 s; elite 0)
  approachRange: number; // tiles (donor 10)
  leashMult: number;     // chase leash = perception x this (donor 2)
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

// Higher is preferred. The donor's "strongest" weight is not used here (see decision).
export function rank(mode: FocusMode, b: Brain, f: Foe): number {
  if (mode === 'weakest') return -f.hits;
  return -dist(b.x, b.y, f.x, f.y); // closest, the default
}

// Ambient scan. Blocked while the gate is in the future by at most one period; otherwise the best ranked
// visible hostile in range wins (strict greater-than keeps the first seen on a tie). The gate re-arms
// to a full period after every scan, found or not.
export function scan(b: Brain, foes: Foe[], now: number, t: Tuning, hasAggressor: boolean): boolean {
  if (b.mode === 'none') { b.focus = null; return false; }
  if (b.mode === 'aggressor' && !hasAggressor) { b.focus = null; return false; }
  const remaining = b.nextScanAt - now;
  if (remaining > 0 && remaining <= t.reacquireMs) { b.focus = null; return false; }

  let best: Foe | null = null;
  let bestVal = -Infinity;
  for (const f of foes) {
    if (!f.alive || !f.inLos || dist(b.x, b.y, f.x, f.y) > b.perception) continue;
    if (b.mode === 'aggressor' && !f.hostile) continue;
    const v = rank(b.mode, b, f);
    if (v > bestVal) { bestVal = v; best = f; }
  }
  b.focus = best;
  b.nextScanAt = now + t.reacquireMs;
  return best !== null;
}

// An enemy stepping inside approach range pulls the next scan to at most approachMs away.
// The deadline only moves earlier. Zero means "think now" (returned as true).
export function onEnemyStep(b: Brain, foe: Foe, now: number, t: Tuning, approachMs: number): boolean {
  if (b.combatant !== null || b.mode === 'none' || b.mode === 'aggressor') return false;
  if (!foe.enemy || dist(b.x, b.y, foe.x, foe.y) > t.approachRange) return false;
  const deadline = now + approachMs;
  if (deadline < b.nextScanAt) b.nextScanAt = deadline;
  return approachMs <= 0;
}

// Someone hit this creature: a free creature takes the attacker; a closer visible one takes over.
export function onAggressed(b: Brain, attacker: Foe): void {
  if (b.combatant === null) { b.combatant = attacker; return; }
  if (b.combatant !== attacker && dist(b.x, b.y, attacker.x, attacker.y) < dist(b.x, b.y, b.combatant.x, b.combatant.y)) {
    b.combatant = attacker;
  }
}

// Out of perception range: rescan. If nothing is found and the combatant is beyond the leash, drop it.
export function keepCombatant(b: Brain, foes: Foe[], now: number, t: Tuning, hasAggressor: boolean): 'chase' | 'drop' {
  const c = b.combatant;
  if (c === null) return 'drop';
  if (dist(b.x, b.y, c.x, c.y) <= b.perception) return 'chase';
  if (scan(b, foes, now, t, hasAggressor) && b.focus !== null) { b.combatant = b.focus; return 'chase'; }
  if (dist(b.x, b.y, c.x, c.y) > b.perception * t.leashMult) { b.combatant = null; return 'drop'; }
  return 'chase';
}

// Flee check at each think: at or below the threshold, a roll against the chance. Duration 10 to 39 s in the donor (Utility.Random(10, 30) is 10 + Next(30)); not modelled here.
export function shouldFlee(hits: number, hitsMax: number, threshold: number, chance: number, rand: () => number): boolean {
  if (hits / hitsMax > threshold) return false;
  return rand() < chance;
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (proposed; the creature brain of the fight step). Parity-checklist row 2 (AI brain). The scan gate, approach pull and leash are brain rules; the zone supplies counts and ranges.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a target scan that runs only when a timer gate has run down, where an enemy entering a short approach range can only pull the next scan earlier, so aggro reacts fast without scanning every tick.
Decision (proposed): adapt — keep the gate, the approach pull with its clamp, the leash drop and the flee roll; drop the strength-based `Strongest` rank (no ruling for stat-driven targeting) and let `MAX_ATTACKERS = 3` be enforced by the engine, not by the brain's scan.
Acceptance: a server test shows that an enemy stepping within 10 tiles of an idle creature makes it pick a target within 2 s, that a creature with no enemy re-scans every 10 s, that a combatant beyond twice its perception range is dropped after a failed rescan, and that no more than 3 creatures take a focus on one player.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- The scan and approach run per creature on a timer, with no shared budget. Frankendom's zones need a per-tick NPC budget (the "server tick: fixed step, input intake, per-tick NPC budget" sub-line under row 18 / post-K item 3). The donor's think cadence is speed-based and jittered, which is a different model. Use the approach gate, but drive it from the fixed server step.
- The donor's `Closest` ranking uses distance over a box range query (`GetMobilesInRange`, not read). Frankendom's arena and zones may need a different distance; do not assume the donor's range shape.
- The `Strongest` rank (tactics + strength) would tie targeting to character stats that the rulings do not cover. Rejected for now.
- The donor's creature-wide `ReacquireDelay` and approach numbers are per creature class. Under the zones-as-data ruling they belong on spawn or zone data (for example the approach range and the paragon zero), with the 10 s and 2 s defaults as engine constants.
- Flee is per creature class and roll-based. Frankendom's guard, stance and stagger are in the duel step (rows 1 and 3); a flee roll should not replace the duel's own break rules. The flee path depends on `BaseCreature.CheckFlee` (not read).
- Many-on-one: the donor lets many creatures focus one player with no shared cap in the scan. `MAX_ATTACKERS = 3` must be enforced by the engine when a focus is granted, not left to each creature.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) Flee duration 'Utility.Random(10, 30) seconds = 10 to 30 s' (Mechanism, Numbers table, sketch comment) is WRONG: Utility.Random(from,count) = from + Next(count) (BuiltInRng.cs:34), so BaseAI.cs:780 yields 10..39 s. (2) Sketch onEnemyStep requires foe.hostile (combatant/aggressor/aggressed), but donor ShouldAcquireOnApproach (BaseCreature.cs 1354-1359) uses IsEnemy(m) && CanBeHarmful(m,false) - a stranger would trigger the approach pull in the donor but never in the sketch. (3) Flee description omits the Mobile.CanFlee gate (BaseAI.cs 793) and that CheckFlee() runs before StartFlee (766-778). Verified OK: AcquireFocusMob 853-910 and its order, gate 894-896, re-arm 908, HandleAggressor 978-991, AcquireNewFocusMob 993-1043 (strict > and LOS, summon fallbacks), filters 1045-1089, OnAggressiveAction 138-171, PreferCloserAggressor 174-188, ranking 2731-2745, 10 s 1321, 2 s/paragon 0 at 1326, range 10 at 1330, clamp 1339, DefaultRangePerception 16 (171), ChaseLeash 2x (1094), MeleeAI 11-12 (0.2/0.1), 16, 75-97, AITimer 137/155-156/164-165/Prod 60, AggressiveAction 2790-2800, ForceReacquire 3061-3063, GPL-3.

**Missed:** ShouldAcquireOnApproach also excludes BardPacified and Summoned/Controlled (1354-1359); HandleControlled/guard targeting (930-963) not covered (out of scope).
