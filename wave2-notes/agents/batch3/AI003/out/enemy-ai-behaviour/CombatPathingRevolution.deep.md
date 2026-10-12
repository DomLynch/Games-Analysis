# CombatPathingRevolution (enemy-ai-behaviour, cell 3)

Donor: `/mnt/frankendom-donors/CombatPathingRevolution/src/` (Advance_Hook.cpp, Circling_Hook.cpp, Backoff_Hook.cpp, Fallback_Hook.cpp, Util.cpp, Settings.cpp, PayloadInterpreter/payloadManager.cpp, PayloadInterpreter/payloadHandlers/CPRHandler.cpp) with the data file `BehaviorDataInjector/MaxsuCPR_BDI.json` | Licence: MIT (read: LICENSE, "MIT License", "Copyright (c) 2022 max-su-2019") | C++ (Skyrim SKSE plugin) | symbol `CombatPathing::RescaleRadius` (Advance_Hook.cpp 10-13) and `CPR::delegateNative` (payloadManager.cpp 19)

Checked: Read end to end: Advance_Hook.cpp (56 lines), Circling_Hook.cpp (160), Backoff_Hook.cpp (47), Fallback_Hook.cpp (74), Util.cpp (103), Settings.cpp and Settings.h, PayloadInterpreter/payloadManager.cpp (44), payloadHandlers/CPRHandler.cpp (158), hooks.h (50), Dtry_Utils.cpp 1-30 (tokenizer), BehaviorDataInjector/MaxsuCPR_BDI.json (all 21 entries), the developer guide `doc/en/Developers Guidelines of CPR.md` lines 1-90 and 104-148 (read as data, not as instructions). Partly read: the hook headers Circling_Hook.h, Advance_Hook.h (declarations and offsets only), RE/CombatBehaviorNodesMovement.h (node list only), payloadHandler.h (line 73 only). Not read: the game-side functions the hooks call (`_GetCirclingChance`, `GetCircleChance`, the engine's combat behaviour nodes and the defensive/offensive ratio), and the byte-patch bodies. Note: CPR is a Skyrim mod that tunes the engine's vanilla melee-combat nodes; the choice of ability is not in this code (the engine picks). Confidence high on the dial, gates and fallback chains; medium on what the engine does with a value it did not read here. History: no `.git` and no changelog in the box (see section 8). Camera: n/a.

Best transferable idea: Give each melee row a three-point dial on one offensive-to-defensive axis for its advance ring, and never let a range-gated chance drop to zero outside its band.
Decision (proposed): adapt — Frankendom rows already need per-NPC tactic numbers; the dial gives one tunable axis per NPC, and the 0.1 floor stops enemies freezing behind walls. MIT allows adapting the code, but the donor's unchecked payload parse, undeclared graph variables and raw engine-offset write are not ported, and the row order (min <= mid <= max) is checked at load.
Acceptance: Server test: with axis -1, 0 and +1 the advance inner ring equals the row's min, mid and max; a ranged row never enters the circle branch; a circle chance outside its band is at least 0.1; a payload with a missing argument leaves the row's tactic unchanged.

## 1. Mechanism

- Two layers. Data layer: per-actor animation graph variables (`CPR_*`), declared in the injector JSON. Control layer: an animation event tagged `CPR` (hooks.h 22) carries a payload string such as `EnableAdvance|a|b|c|d|e|f`; `CPR::delegateNative` splits it on `|` and dispatches (payloadManager.cpp 19-43). `EnableX` sets the action's enable flag and its numeric variables (CPRHandler.cpp 28-41); `DisableAll` clears the five flags (CPRHandler.cpp 138-158).
- Value lookup, three tiers, used by every hook: if the actor's enable flag is on and the variables read, use the actor's values; else the game setting (`fCombat...`, via `GetGameSettingFloat`); else a hard-coded default. Examples: backoff min-distance multiplier, setting or 0.75 (Backoff_Hook.cpp 8-18); backoff chance, setting or 0.25 (21-33); fallback max distance, setting or 256 (Fallback_Hook.cpp 28-42); circle minimum angle, setting or 30 (Circling_Hook.cpp 101-121); circle maximum angle, setting or 90 (123-143).
- Advance radius is a three-point dial (Advance_Hook.cpp 10-13): input `delta` in -1..+1. If `delta <= 0` the value runs from min (at -1) to mid (at 0); if `delta > 0` it runs from mid (at 0) to max (at +1). The full-radius path uses the dial on both rings (28-30); the other path uses the mid values (31-34). The developer guide gives the same formula with `delta = -offensiveRatio` and `delta = defensiveRatio` (doc 28-42).
- Melee gate: `IsMeleeOnly` (Util.cpp 7-36) returns false if any equipped item is magic, ranged, scroll or staff; the advance override and the circle angle / view-cone hooks only run when it is true (Advance_Hook.cpp 17; Circling_Hook.cpp 89, 108, 130, 150). The circle band test itself (`WithinCricleRange`, Circling_Hook.cpp 18-40) has no melee gate.
- Circle band (Circling_Hook.cpp 18-40): the test distance is the centre distance minus the target's bound radius (29). The band minimum gets the optimal weapon range added only when the minimum is above zero (30); the band maximum always gets the maximum weapon range (31). The test is inclusive at both ends (33). Requires the enable flag and a combat style (20-24).
- Circle decision (68-80): only inside the band, the engine's chance is rolled: `Random::get(0,1) <= chance` (73-75). Outside the band the chance hook returns `max(0.1, minChance)` (42-48). The 0.1 floor is written in the source with the comment that a zero chance would leave NPCs stuck by barriers (48).
- Fallback (Fallback_Hook.cpp 10-26): distance = rescale(combat-style fallback multiplier, distMin, distMax) (18), then never less than twice the bound radius (19, 21). Wait time = the same multiplier applied to the wait min and max (52). Only the min wait has a hook default (`GetMinFallbackWaitTime` falls back to the setting, then 0.75, 63-72); there is no max-wait hook. The max distance falls back to 256 (37-41) when the variables or settings are missing.
- Backoff: the min-distance multiplier and chance are read per actor (Backoff_Hook.cpp 8-19, 21-45). The trigger comparison itself is in the engine (not read); the doc states it as `combatTargetDistance < InnerRadius * CPR_BackoffMinDistMult` (doc 48-49).
- Interrupt (Advance_Hook.cpp 39-55): when the interrupt flag is on and the advance radius is enabled, the hook writes the byte 5 at offset 0x14 of the engine's context (45-48). The flag is cleared whenever it was set, even when the advance radius is not enabled (50-51), so a request can be consumed without effect. The offset is an engine struct layout (see section 6).

## 2. Key functions

- `RecalculateAdvanceRadius` (three-point dial, melee gate): `/mnt/frankendom-donors/CombatPathingRevolution/src/Advance_Hook.cpp` 15-37; the dial itself 10-13.
- `CirclingChanceHook::GetCirclingChance` and `WithinCricleRange`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` 12-51. Band test and out-of-band floor.
- `AdvanceToCircleHook::ShouldCircle`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` 68-80. The random roll.
- `FallbackDistanceHook1::GetFallbackDistance` and `FallbackWaitTimeHook1::GetFallbackWaitTime`: `/mnt/frankendom-donors/CombatPathingRevolution/src/Fallback_Hook.cpp` 10-26 and 44-57.
- `SetCPRVariables` and `CPRHandler::enableAdvance`: `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/payloadHandlers/CPRHandler.cpp` 28-42 and 45-63 (Advance payload names at 49-56).
- `CPR::delegateNative`: `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/payloadManager.cpp` 19-43. Payload dispatch by hashed verb.
- `Utils::splitSV`: `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/Dtry_Utils.cpp` 4-19. Tokenizer, drops empty fields.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and values |
|---|---|
| Three-point dial on one -1..+1 axis (offensive to defensive) | Shape only; the donor has no clamp (Advance_Hook.cpp 12) |
| Band test: distance from target edge between a min and a max, extended by weapon range | Min offset only when positive (theirs, Circling_Hook.cpp 30); max always extended (31) |
| Non-zero floor on a chance outside the band | 0.1 (theirs, Circling_Hook.cpp 48) |
| Rescale by a combat-style multiplier, floored at a size-based distance | Diameter = 2 x bound radius (theirs, Fallback_Hook.cpp 19, 21) |
| Per-actor value, then game setting, then hard default | Backoff 0.75 / 0.25 (theirs, Backoff_Hook.cpp 18, 32); fallback max 256 (Fallback_Hook.cpp 41); fallback min wait 0.75 (72) |
| Settings written into the game at load | Fallback chance 0.0 to 0.5 (theirs, Settings.cpp 11-12); circle chance 0.0 to 0.75 (13-14); circle player angle multiplier 0.75 (15) |
| Default row values (injector) | Advance inner 0/0/256 and outer 256/512/1024 (theirs, BDI 17-48); circle distance 0 to 1024, angles 30 to 90 (BDI 80-98); fallback distance 96 to 256, wait 0.75 to 1.5 (BDI 110-130); backoff 0.75 and 0.25 (BDI 60-67) |

## 4. TypeScript sketch

simplified: keeps the three-point dial, the band test with the donor's minimum-offset rule (the sketch adds its own `melee` gate to the band, which the donor does not have there; it is our choice so ranged rows never enter the circle branch), the out-of-band chance floor, the linear rescale and a payload parse. It fixes three donor defects: the dial axis is clamped, the payload is rejected before its verb is read, and all arguments are parsed before anything is enabled. It omits the engine chance function (the game's own, not read), the view-cone and angle overrides, the interrupt write, the backoff trigger (in the engine), the surround action (the donor never reads it), and the per-actor graph-variable lookups, which become row fields.

```ts
// Licence of donor: MIT (max-su-2019, 2022). Shape adapted from the described mechanism (three-point dial, melee band with chance floor, payload parse); not a line translation.

export interface Dial3 { min: number; mid: number; max: number } // row data: three points, must be ordered min <= mid <= max

export interface MeleeTactics {
  advanceInner: Dial3;
  advanceOuter: Dial3;
  circleDistMin: number;      // row field, game units from target edge
  circleDistMax: number;
  circleAngleMin: number;     // degrees
  circleAngleMax: number;
  backoffMinDistMult: number; // ratio
  backoffChance: number;      // 0..1
  fallbackDistMin: number;
  fallbackDistMax: number;
  fallbackWaitMin: number;    // seconds
  fallbackWaitMax: number;
  melee: boolean;             // derived from the row's weapon class, not an inventory scan
}

// Engine constant: an out-of-band circle chance is never zero (the donor's anti-stuck rule).
export const CIRCLE_CHANCE_FLOOR = 0.1;

// Three-point dial. axis is -1 (offensive, min) .. 0 (mid) .. +1 (defensive, max).
// FIX: the donor does not clamp the axis; out-of-range values extrapolate.
export function dialValue(axis: number, d: Dial3): number {
  const a = Math.max(-1, Math.min(1, axis));
  return a <= 0 ? d.min + (d.mid - d.min) * (a + 1) : d.mid + (d.max - d.mid) * a;
}

// Linear rescale by a combat-style multiplier in 0..1.
export function rescaleLinear(mult: number, min: number, max: number): number {
  return min + mult * (max - min);
}

// Circle band: distance from the target edge, between min and max plus weapon ranges.
// The optimal range is added to the minimum only when the minimum is positive (donor rule).
export function inCircleBand(
  centreDist: number, targetBoundRadius: number, t: MeleeTactics,
  optimalRange: number, maxRange: number,
): boolean {
  if (!t.melee) return false; // Frankendom gate (donor gates only the angle/view-cone hooks, not the band)
  const d = centreDist - targetBoundRadius;
  const lo = t.circleDistMin > 0 ? t.circleDistMin + optimalRange : t.circleDistMin;
  const hi = t.circleDistMax + maxRange;
  return d >= lo && d <= hi;
}

// Circle chance: the game's chance inside the band, otherwise at least the floor (never zero).
export function circleChance(inBand: boolean, gameChance: number, minChance: number): number {
  return inBand ? gameChance : Math.max(CIRCLE_CHANCE_FLOOR, minChance);
}

// Payload parse: "Verb|a|b|..." . FIX: empty fields are dropped as in the donor, but an empty
// payload is rejected before tokens[0] is read, and every argument is parsed before any flag is set.
export function parsePayload(payload: string, argCount: number): { verb: string; args: number[] } | null {
  const tokens = payload.split('|').filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  const args = tokens.slice(1).map(Number);
  if (args.length !== argCount || args.some((n) => !Number.isFinite(n))) return null;
  return { verb: tokens[0], args };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 ai003-cpr-tactics.ts` on the VPS, exit 0 (local copy in the AI003 work folder as `cpr-tactics.ts`).

## 5. Lands in

- TARGET `src/fight/ai.ts` (the melee movement choice per NPC row: advance ring, circle band, backoff chance, fallback distance and wait; decided on the server each tick, the client only plays it).
- Parity-checklist row 2 (AI brain). Row 4 (fight loop: aggro, chase, leash) is not used here.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is shape-only in any case)
- Brief rule served: 1 (one engine: the movement choice runs in the server fight step); MAX_ATTACKERS = 3 is not enforced here (see section 6).

## 6. Gaps and risks

- MIT: code may be adapted. The sketch keeps the shape and rewrites the defects.
- Defect 1, flag before arguments (CPRHandler.cpp 31 sets the enable flag; 39-40 return early on a bad argument): a short or bad payload leaves the action on with partly new or stale values. Fix: parse all arguments into a temporary object and set the flag last (sketch `parsePayload`).
- Defect 2, unchecked first token (payloadManager.cpp 24 reads `tokens[0]` with no size check; Dtry_Utils.cpp 11-12 drops empty fields, so an empty payload gives zero tokens). Fix: reject empty payloads before the read (sketch line `if (tokens.length === 0) return null`).
- Defect 3, dead action: `EnableSurround` writes `CPR_EnableSurround`, `CPR_SurroundDistMin` and `CPR_SurroundDistMax` (CPRHandler.cpp 104-108). No hook in this copy reads them (grep found no reader). Fix: wire it to a real node or drop it. For Frankendom the three-attacker slot logic belongs in the engine, not here.
- Defect 4, undeclared variables: the injector declares 20 variables, but the code also reads or writes `CPR_CirclingViewConeAngle` (CPRHandler.cpp 91; Circling_Hook.cpp 10), `CPR_InterruptAction` (Advance_Hook.cpp 41; payloadHandler.h 73), and the surround variables. None of these is in `MaxsuCPR_BDI.json` (grep: no match). The setters do not check their return values (CPRHandler.cpp 31-37). Whether the engine accepts writes to undeclared graph variables was not verified. Fix: declare every variable the code touches; check the write result.
- Defect 5, no ordering check: the guide says the radii must be ordered (doc 21-26), but the code does not check it (Advance_Hook.cpp 12 has no clamp), and the injector default `CPR_InnerRadiusMin` is 0 (BDI line 18), which the guide's rule ("greater than zero", doc 21) forbids. The defaults are off until a row enables the action. Fix: validate dial order and minimums at load time.
- Defect 6, engine-struct poke: `*(path + 0x14) = 5;` (Advance_Hook.cpp 47) writes into an engine structure at a fixed offset, and the hook addresses are per game version (AE and SE IDs in the headers, Advance_Hook.h 10-13). Fragile across versions. Not portable; Frankendom should express the interrupt as a state change in the engine.
- Behaviour note: the band minimum gets the weapon range only when positive (Circling_Hook.cpp 30). A zero or negative minimum is an absolute distance. The guide does not describe this (doc 58).
- Gap against the rulings: MAX_ATTACKERS = 3 is not in this code. It tunes one NPC at a time; the three-attacker cap and the slot assignment have to be added in the engine.
- Gap against the rulings: the tactics are a Skyrim melee system with no server. Frankendom must keep the decision on the server (server-verified kills), with the client only playing the chosen move.
- Gap: the circle decision uses an engine chance that this code does not show (`GetCircleChance`, Circling_Hook.cpp 74). The formula is not known from this donor, so Frankendom's chance curve would have to be designed on its own.

## 7. As-data shape (PASS2)

- Data file: `BehaviorDataInjector/MaxsuCPR_BDI.json`, a JSON array. Each entry: `projectPath` (always "Actors"), `type` (`kEvent`, `kBool` or `kFloat`), `name`, and `value` (not for the event). 21 entries: one `kEvent` named `CPR` (line 5) and 20 variables (lines 11-129).
- Variables per action (all per actor, all in animation-graph space): Advance: enable flag, inner min/mid/max, outer min/mid/max (6 floats). Backoff: enable flag, min-distance multiplier, chance (2 floats). Circling: enable flag, distance min/max, angle min/max (4 floats). Fallback: enable flag, distance min/max, wait min/max (4 floats). The circle view-cone and surround and interrupt variables are read by code but not declared (defect 4).
- Payload row (the per-NPC data as text): `CPR.EnableAdvance|InnerMin|InnerMid|InnerMax|OuterMin|OuterMid|OuterMax` (guide line 112 and CPRHandler.cpp 79-88). Other verbs: `EnableBackoff|mult|chance`, `EnableCircling|distMin|distMax|angleMin|angleMax|viewCone`, `EnableFallback|distMin|distMax|waitMin|waitMax`, `EnableSurround|distMin|distMax` (unused), `DisableAll`.
- A new NPC tuning is one row: yes (one payload line or one set of variable values for that actor; no code change). A new action type is one row: no (a new verb needs a new handler, a new hook and an engine node).
- Units: distances and radii in Skyrim game units (not converted here); angles in degrees; waits in seconds; chances 0 to 1.
- Provenance per claim: `CombatPathingRevolution` (MIT). File and line in sections 1-3 and the receipts file. Code may be adapted.

## 8. What they patched later

- No history available: the box has no `.git` directory and no changelog. The only history is the in-code comments and the developer guide.
- In-code notes that point at fixes: the "ae change" comments in Backoff_Hook.cpp 40 (the redirect now writes into the array in place for the newer game version), and the "Enable data override on vanilla ... data" comments in CPRHandler.cpp 144-156 (the disable path was written to hand control back to vanilla data).
- The Backoff interrupt is commented out in the handler (CPRHandler.cpp, the commented `InterruptActiveAction` blocks for backoff, circling, surround and fallback), so only the advance path interrupts. This is a visible scope cut, not a fix.

## 9. Rulings for Dom

1. Should a melee row store its advance rings as a three-point dial on one offensive-to-defensive axis (CPR's shape), or as six plain numbers? Recommendation: the dial, because one slider per NPC is easier to tune and to validate.
2. Should a ranged or caster row ever use circling? Recommendation: no; decide it from the row's weapon class at load time, not by scanning the inventory each tick.
3. Should an out-of-band circle chance keep a non-zero floor? Recommendation: yes, at 0.1, so an enemy never freezes behind a wall.

Reuse tag: adapt (MIT; shape only, defects fixed)
Brief rule served: 1 (one engine; the movement choice runs in the server fight step); rules 7-9 n/a

Added 2026-10-12 (checker): donor defect, `Fallback_Hook.cpp` 17 and 51 dereference `combatController->combatStyle` with no null check (the circling hook checks it at 22), a possible crash; fix: null-check, as the circling hook does. Also `CPRHandler.enableAdvance` calls `InterruptActiveAction` after a possibly half-failed parse; fix: only interrupt after all arguments parsed.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- 'Min and max wait fall back to 0.75': only the min-wait hook has a default; no max-wait hook exists.
- Sketch inCircleBand returned false for non-melee while the donor band test has no IsMeleeOnly check (melee gate is on the angle/view-cone hooks); presented as 'keeps the donor band test'.
- Interrupt flag is cleared whenever set, even when advance is not enabled; note said cleared inside the enabled condition.
- Missed: Fallback_Hook null deref of combatStyle; enableAdvance interrupts after half-failed parse.

Fixed 2026-10-12: wait-default wording, melee-gate attribution (note and sketch comment, work file synced), interrupt-flag clearing, added the null-deref defect.
