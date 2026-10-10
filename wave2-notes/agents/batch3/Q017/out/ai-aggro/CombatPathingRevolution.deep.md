# CombatPathingRevolution (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` (with `Fallback_Hook.cpp`, `Advance_Hook.cpp`, `Backoff_Hook.cpp`, `Util.cpp`) | Licence: MIT (`LICENSE`: "MIT License", Copyright (c) 2022 max-su-2019) | C++ (SKSE plugin hooking Skyrim SE/AE) | symbols `ShouldCircle`, `WithinCricleRange`, `GetFallbackDistance`, `RecalculateAdvanceRadius`

Checked: Read in full: `Circling_Hook.cpp` (160 lines), `Fallback_Hook.cpp` (74), `Advance_Hook.cpp` (56), `Backoff_Hook.cpp` (47), `Util.cpp` (103). Read for install points only: `Circling_Hook.h`, `Fallback_Hook.h`, `Advance_Hook.h`, `RE/CombatBehaviorNodesMovement.h`, `RE/CombatBehaviorTreeControl.h`. Confidence: moderate. This donor is a hook layer over Skyrim's engine. The code that consumes these numbers (the circle, fallback, backoff and advance behaviour-tree nodes, the engine's own circle chance, and the meaning of the signed `delta`) lives in `SkyrimSE.exe` and was NOT read. So the note states what the donor decides and tunes, and does not claim how the engine acts on it. Callers: only the hook install points were read, not the engine call sites.

## 1. Mechanism

The donor does not choose targets, track threat, or decide when to chase or flee. It is a set of hooks into the engine's close-range movement nodes (Circle, Backoff, Fallback, Advance; `RE/CombatBehaviorNodesMovement.h` 35-57). Each hook replaces a number or a yes/no gate the engine reads. Most numbers can be overridden per actor by a graph variable (named `CPR_*`); the ones with a fallback use a game setting or a hard-coded default. Four pieces:

(a) Circle gate (`ShouldCircle`, 68-80). The engine's conditional node "CPR Circle" is inserted before the engine's own push (`AdvanceToCircleHook::PushBackNode`, 53-66). Order as the code runs: if `me` and `he` exist (68-72) and `WithinCricleRange` is true (73), take the engine chance `GetCircleChance(me)` (74) and return `Random::get(0,1) <= chance` (75). Otherwise return false (79). The band test is done first, and only once per call; there is no roll out of band.

(b) Band test (`WithinCricleRange`, 18-40). Requires the combat controller and combat style to exist (22), and the per-actor enable flag `CPR_EnableCircling` (24). Distance = centre-to-centre distance minus the target's bound radius (29). The min bound is raised by the optimal weapon range only if the min is above 0 (30); the max bound is always raised by the maximum weapon range (31). Returns `min <= distance <= max` (33). Note: this test does not check `IsMeleeOnly`, so a ranged enemy can use the circle rule (the band uses its equipped ranges).

(c) Out-of-band chance floor (`GetCirclingChance`, 42-51). If the actor is out of band, the value returned is `max(0.1, minChance)` (47-48). Otherwise the engine chance `_GetCirclingChance` is returned (50). The comment at 48 says a chance of zero would leave NPCs stuck behind barriers. Which engine decision consumes this value was not read. The hook is a branch inside engine function 49720 (`Circling_Hook.h` 19-21).

(d) Fallback (retreat). Distance (`GetFallbackDistance`, 10-26): only when `CPR_EnableFallback` and both distance variables are present (13-16) is the style's `fallbackMult` read (17, with no null check) and the distance `min + mult*(max-min)` (18, `RescaleValue` in `Util.cpp` 69), then floored at 2 x bound radius (19-21). Otherwise the engine value (25). Wait time (`GetFallbackWaitTime`, 44-57): same gate (46-50), then `min + mult*(max-min)` with no floor (51-52). Max distance (`GetMaxFallbackDistance`, 28-42): the variable, else game setting `fCombatFallbackDistanceMax`, else 256 (line 41). Minimum wait default is 0.75 (line 72).

(e) Backoff (`Backoff_Hook.cpp`). Start min-distance multiplier: the variable `CPR_BackoffMinDistMult`, else game setting, else 0.75 (8-19; default at line 18). Chance: the variable `CPR_BackoffChance`, else game setting, else 0.25 (21-45; default at line 32). What the engine does with either number was not read.

(f) Advance radius (melee only). `RecalculateAdvanceRadius` (15-37) returns early unless the attacker is melee-only (17). `IsMeleeOnly` (`Util.cpp` 7-36) returns false if any equipped item is magic, ranged, scroll or staff (19-24), and true otherwise. With `CPR_EnableAdvanceRadius` on and all six `CPR_*` radius values present (21-24): when the full radius is requested, inner and outer come from `RescaleRadius(delta, min, mid, max)` (28-30). When not, inner = mid and outer = mid (31-34). `RescaleRadius` (`Advance_Hook.cpp` 10-13): for `delta <= 0`, `min + (mid-min)*(delta+1)`; otherwise `mid + (max-mid)*delta`. `delta` is not clamped. What `delta` means was not read.

Tick: none in the donor. The engine evaluates the conditional node; how often it does was not read. The roll uses the game's `Random::get`, not a seeded value from the donor.

Circle-angle and view-cone hooks (`Circling_Hook.cpp` 82-159) change the min and max circle angles and the view cone only for melee-only actors (89, 108, 130, 150). Min angle default 30 (line 120) and max angle default 90 (line 142) when the game setting is absent. Those lines are short and not receipted.

## 2. Key functions

- `ShouldCircle`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` 68-80. Gate: band, then one roll.
- `WithinCricleRange`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` 18-40. The band arithmetic (sic: "Cricle" is the donor's spelling).
- `GetCirclingChance`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` 42-51. Out-of-band floor.
- `GetFallbackDistance`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Fallback_Hook.cpp` 10-26. Rescale plus diameter floor.
- `GetFallbackWaitTime`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Fallback_Hook.cpp` 44-57. Rescale, no floor.
- `RecalculateAdvanceRadius` and `RescaleRadius`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Advance_Hook.cpp` 10-37.
- `RescaleValue`, `IsMeleeOnly`, `GetEquippementRange`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Util.cpp` 67-70, 7-36, 38-45.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Band test: gap (centre distance minus target radius) inside [lo, hi]; lo is raised by optimal range only if lo > 0; hi is raised by max range | Offsets come from graph variables (no fixed default); the band rule is theirs (`Circling_Hook.cpp` 29-33) |
| Out-of-band chance floor so a stuck NPC still rolls | 0.1 (theirs, `Circling_Hook.cpp` 48) |
| One roll against a chance, only when in band | Random in [0,1] (game RNG, theirs, 75) |
| Rescale a value between min and max by one style multiplier | `min + mult x (max - min)` (theirs, `Util.cpp` 69); the range of `mult` was not read (`closeRangeData.fallbackMult`, `Fallback_Hook.cpp` 17) |
| Retreat distance floored at the actor's diameter | Factor 2 x bound radius (theirs, `Fallback_Hook.cpp` 19) |
| Wait after retreat, no floor | Default minimum 0.75 s (theirs, line 72; line too short to receipt); max-distance default 256 (theirs, line 41; short line, not receipted) |
| Backoff chance and min-distance multiplier defaults | 0.25 (theirs, `Backoff_Hook.cpp` 32); 0.75 (theirs, line 18) |
| Angle to radians for the view cone | 0.017453292 = pi/180 (theirs, `Circling_Hook.cpp` 153) |
| Signed-delta radius rescale | Unclamped; the `delta` range was not read |

## 4. TypeScript sketch

simplified: the sketch keeps the band arithmetic (including the raise-only-if-positive rule on the min bound), the out-of-band floor, the single roll gated by the band, the fallback rescale with the diameter floor, the wait rescale, and the advance-radius rescale. It takes the engine circle chance and the roll as inputs, so a server can seed the roll. It omits: the engine's own chance function, the graph-variable reads and the enable flags (the caller passes resolved numbers), the null checks on combat controller and combat style, the `IsMeleeOnly` gate on the advance radius and circle angles, the view-cone change, the not-full-radius branch of the advance radius, the 30 and 90 default angles, the Backoff node, and the Surround and Reposition nodes (not read). It reorders nothing relative to the donor.

```ts
// Licence: MIT (donor: CombatPathingRevolution, max-su-2019). Shape adapted; rewritten, not a line copy.

// Per-enemy spacing data. All numbers are data fields (see sidecar), not constants.
export interface SpacingData {
  optimalRange: number;      // units: weapon optimal range (from the equipped kit)
  maxRange: number;          // units: weapon maximum range
  circleMin: number;         // units: band start; if > 0, optimalRange is added to it
  circleMax: number;         // units: band end; maxRange is always added to it
  circleFloor: number;       // ratio: lowest chance returned out of band
}

export interface FallbackData {
  distMin: number;           // units: retreat distance at fallbackMult 0
  distMax: number;           // units: retreat distance at fallbackMult 1
  waitMin: number;           // s: wait after retreat at fallbackMult 0
  waitMax: number;           // s: wait after retreat at fallbackMult 1
}

// Min + mult x (max - min). The donor does not clamp mult; the range of mult was not read.
function rescale(mult: number, lo: number, hi: number): number {
  return lo + mult * (hi - lo);
}

// Centre distance minus the target's bound radius, tested against the band.
export function inCircleBand(centreDistance: number, targetRadius: number, d: SpacingData): boolean {
  const gap = centreDistance - targetRadius;
  const lo = d.circleMin > 0 ? d.circleMin + d.optimalRange : d.circleMin;
  const hi = d.circleMax + d.maxRange;
  return gap >= lo && gap <= hi;
}

// Chance handed to the engine's circle decision. Out of band it never drops below the floor.
export function circleChance(inBand: boolean, engineChance: number, minChance: number, d: SpacingData): number {
  return inBand ? engineChance : Math.max(d.circleFloor, minChance);
}

// Circle only when in band, then a single roll against the chance.
export function shouldCircle(inBand: boolean, chance: number, roll: number): boolean {
  return inBand && roll <= chance;
}

// Retreat distance: rescaled, never closer than a diameter of the actor.
export function fallbackDistance(fallbackMult: number, f: FallbackData, boundRadius: number): number {
  return Math.max(rescale(fallbackMult, f.distMin, f.distMax), boundRadius * 2);
}

export function fallbackWait(fallbackMult: number, f: FallbackData): number {
  return rescale(fallbackMult, f.waitMin, f.waitMax);
}

// Advance radius from a signed delta: delta <= 0 maps min..mid, delta > 0 maps mid..max. Unclamped.
export function advanceRadius(delta: number, min: number, mid: number, max: number): number {
  return delta <= 0 ? min + (mid - min) * (delta + 1) : mid + (max - mid) * delta;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/ai-spacing.ts` (proposed new module; the Frankendom repo was not read, so this name is a proposal). Parity-checklist row 2 (AI brain). The engine chooses the chase and the flee, so the module supplies spacing values to the duel step; it does not replace the engine's brain.
- Reuse tag: adapt (MIT; code may be adapted; this sketch is a rewrite of the shape)
- Brief rule served: one engine (spacing lives in `src/fight`, server-side); zones as data (numbers as fields, not constants)

## 6. Gaps and risks

- The donor runs inside the Skyrim client's behaviour tree, on the engine's own frame loop. Frankendom's roll must run in the server tick (row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget") and be seeded on the server. The donor's roll frequency was not read, so do not copy a roll-per-evaluation rule without a budget.
- MAX_ATTACKERS = 3: the donor is one actor against one other actor (`he`, supplied by the engine: `CombatAI__get_he`, `Util.cpp` 94-97). It has no slot assignment for several attackers. A "Surround" node exists (`RE/CombatBehaviorNodesMovement.h` 38) but was not read. The band does not solve multi-attacker placement.
- Hate and target choice are not in this donor. The rules here (row 4 aggro and leash) must come from our own engine's hate list, not from this file.
- The floor (0.1) exists because a zero chance stalled NPCs near barriers. Zones in Frankendom have their own geometry; check whether the same stall can happen before copying the floor.
- Null safety: `GetFallbackDistance` and `GetFallbackWaitTime` read `combatController->combatStyle` with no check (`Fallback_Hook.cpp` 17, 51). If that pointer is missing, the donor code crashes. Ours must validate the style before reading the multiplier.
- Ranged enemies: the band does not check `IsMeleeOnly` (`Circling_Hook.cpp` 18-40). A rule for ranged units must be stated per archetype, not inherited.
- The advance `delta` is not clamped (`Advance_Hook.cpp` 12). Clamp it in ours and report when a clamp happens.
- Numbers are per-actor graph variables set by animation or behaviour files. In Frankendom they become catalogue fields (rows 20-21) and zone data only where they differ per encounter. They are not hard-coded.

Best transferable idea: Gate a spacing band (distance to the target minus its radius, widened by weapon ranges) first, then make one seeded roll against a chance that never drops below a small floor outside the band, and rescale the retreat distance and wait by one per-style multiplier with a floor at the actor's diameter.
Decision (proposed): adapt — the band-plus-one-roll gate and the style-scaled retreat are the right shape for spacing in a 1-vs-1 and for the fallback step; we take the shape, make every number catalogue or zone data, seed the roll on the server, and do not take the Skyrim hook layer or the per-frame roll.
Acceptance: server test — with optimalRange 2.0, maxRange 3.0, circleMin 1.0, circleMax 1.0 (band 3.0 to 4.0), a gap of 3.5 with engine chance 0.5 circles on roll 0.2 and not on roll 0.9; a gap of 5.0 never circles, and its chance is max(0.1, minChance).
