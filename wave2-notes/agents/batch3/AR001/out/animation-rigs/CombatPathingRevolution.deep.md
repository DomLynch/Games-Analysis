# CombatPathingRevolution (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/hooks.h` (event hook 9-40) with `src/PayloadInterpreter/payloadManager.cpp` 19-44 and `src/PayloadInterpreter/payloadHandlers/CPRHandler.cpp` 28-41 | Licence: MIT (LICENSE line 1: "MIT License", Copyright (c) 2022 max-su-2019) | C++ (Skyrim SKSE plugin) | symbol `CPR::delegateNative`

Checked: Read in full: `hooks.h` (1-50), `payloadManager.cpp` (1-44), `payloadManager.h` (1-44), `payloadHandlers/CPRHandler.cpp` (1-158), `payloadHandlers/payloadHandler.h` (1-82), and the tokeniser and float parser in `Dtry_Utils.cpp` (4-73). Read in part: one of the four consumers, `src/Circling_Hook.cpp` (1-60 of 160). Not read: `Advance_Hook.cpp`, `Backoff_Hook.cpp`, `Fallback_Hook.cpp`, the rest of `Circling_Hook.cpp`, and how the behaviour graph (`Nemesis_Engine/mod/mscpr/0_master/#0108.txt`, a 2000-line XML) uses the variables; only its string table (`#0106.txt` 1454-1469) and the BDI file were read. Grep (this turn, over `src/`): `checkParamCt` has no caller; `delegateCustom`, `delegateAsync`, `asyncThreadFunc`, `preProcess` and `loadPreDefinedPayload` are declared in `payloadManager.h` with no definition or caller in `src/`. Confidence: high on the producer chain (animation event to graph variables), because it was read end to end; medium on the consumers as a whole, because one of four was read in part.

Best transferable idea: animation clips carry a tagged event whose payload names a gameplay parameter set, and the engine applies that set as one enable flag plus positional floats, so a clip can switch a tuned behaviour on or off at the exact frame it plays.
Decision (proposed): adapt. The tagged clip event that switches one named parameter set on and off fits creature windup and hit windows, but free-text positional payloads authored in animation files do not fit, because a bad payload half-applies (see section 1), and the Frankendom rulings keep tuning in zone and catalogue data and kills server-verified.
Acceptance: a server test for a creature's windup clip asserts that a hit is accepted only while the hit window opened by that clip's event is open for the current attack id, that a hit before the open event or after the close event is rejected, and that the Pit client plays the same clip without changing the outcome.

## 1. Mechanism

- Event entry. The mod replaces the animation-event sink's function slot 1 on the character vtable (`hooks.h` 12-14; the slot is `RE::VTABLE_Character[2]`). The replacement calls its own filter first, then the original (`hooks.h` 36-39). Only events whose tag is exactly `"CPR"` are read (`hooks.h` 22-24). The holder must be non-null (`hooks.h` 27-29). The payload string is copied from the event (`hooks.h` 30) and passed to `CPR::delegateNative` with the holder as an actor (`hooks.h` 32).
- Dispatch. The payload is split on `|` (`payloadManager.cpp` 23), and the first token is hashed with a djb2-style hash, seed 5381, step `h = ((h << 5) + h) + byte` (`payloadManager.cpp` 5, 8). The hash picks one of six cases (`payloadManager.cpp` 24-43). Five are payload verbs (EnableAdvance, EnableBackoff, EnableCircling, EnableSurround, EnableFallback) and one is DisableAll.
- Tokeniser. Empty fields are dropped, not kept (`Dtry_Utils.cpp` 11-12). So `EnableAdvance||5` shifts every later value one place left. The first token is the verb, so argument `i` is token `i+1`.
- Enable and parameters (the shared helper, `CPRHandler.cpp` 28-43). Order of steps: (a) the enable bool named after the verb (for example `CPR_EnableAdvanceRadius`) is set to true (31); (b) for each named parameter, in order: if the token exists and parses as a float, set the graph float (34-37); (c) if a token is missing or does not parse, print a message and return (38-40). Steps already done are not undone. So a bad token leaves the enable on, the values before it new and the values after it stale.
- Float parse (`Dtry_Utils.cpp` 65-73). `from_chars` reads a numeric prefix, so `12abc` parses as 12. It fails only on invalid input or out of range.
- Interrupt. Only `EnableAdvance` asks the behaviour to interrupt its active node (`CPRHandler.cpp` 60-62). The helper walks the behaviour controllers and, if a node of the given type is in the processing state, sets the graph bool `CPR_InterruptAction` to true (`payloadHandler.h` 61-81; 70, 73). It does not stop the node itself. The equivalent calls for Backoff, Circling, Surround and Fallback are commented out (`CPRHandler.cpp` 75-79, 95-99, 112-116, 131-135).
- DisableAll sets the four enable bools to false (`CPRHandler.cpp` 141-157). It does not clear the float values.
- Consumer (one of four read in part). `Circling_Hook.cpp` reads the enable bool each evaluation (24). If it is on and both distance floats read, the window is [min + optimal weapon range, max + max weapon range], where the minimum is widened only when it is positive (27-31). The test is distance minus the target's bound radius within that window (29, 33). Outside the window the chance is floored at 0.1 (47-48; the comment says this stops NPCs being stuck behind barriers).
- Authoring contract (`doc/en/Developers Guidelines of CPR.md` 109-198). The animator puts `CPR.EnableAdvance|...` into the animation's event annotations. The doc gives example values (for example `CPR.EnableAdvance|90|110|300|300|300|500|1000|` at line 130, and `CPR.EnableBackoff` values 0.85 and 0.95 at lines 139-141). These are the author's example values, not the code's defaults. Weapon draw and sheathe clips are suggested as the places for enable and DisableAll (around line 198).
- Declared variables: the BDI file declares the `CPR` event (`BehaviorDataInjector/MaxsuCPR_BDI.json` 4-5). The first enable and float entries read set false and 0 (not every entry was checked).

## 2. Key functions

- `ProcessEvent` and `ProcessEvent_NPC` (event filter and chain): `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/hooks.h` 20-40.
- `CPR::delegateNative` (verb dispatch): `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/payloadManager.cpp` 19-44.
- `SetCPRVariables` (shared enable and parse helper): `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/payloadHandlers/CPRHandler.cpp` 28-43; `enableAdvance` 45-63 (the only one that interrupts).
- `InterruptActiveAction<T>`: `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/payloadHandlers/payloadHandler.h` 60-81.
- Tokeniser: `/mnt/frankendom-donors/CombatPathingRevolution/src/PayloadInterpreter/Dtry_Utils.cpp` 4-18; float parse 65-73.
- Consumer window: `/mnt/frankendom-donors/CombatPathingRevolution/src/Circling_Hook.cpp` 18-40 (window), 42-51 (chance floor; read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One tagged event selects one named parameter set; its enable is written first | Tag `CPR` (theirs, hooks.h 22); enable names (theirs, CPRHandler.cpp 47, 67, 84, 104, 121) |
| Positional floats mapped to named variables, in order | Parameter counts: Advance 6, Backoff 2, Circling 5, Surround 2, Fallback 4 (theirs, CPRHandler.cpp 49-56, 69-72, 86-92, 106-109, 123-128) |
| Window widened by the weapon range | Widening is added to the minimum only when the minimum is positive (theirs, Circling_Hook.cpp 30) |
| Chance floor outside the window | 0.1 (theirs, Circling_Hook.cpp 48) |
| Clip-event hash dispatch | Seed 5381 (theirs, payloadManager.cpp 5) |
| Example tuning values | Doc examples only (theirs, Developers Guidelines lines 117-179) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (unknown verb ignored, enable written before any value, parse failure returns with earlier values kept) and the consumer window and floor. It omits the hash dispatch (a string switch stands in), the interrupt request, DisableAll, the behaviour-graph binding, the bound-radius and weapon-range lookups (the caller passes them in), and the four consumers other than Circling. It also keeps the donor's dropping of empty tokens, which is the fragility section 6 names; a Frankendom version should reject empty fields instead.

```ts
// Licence: MIT (donor LICENSE, Maxsu 2022). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export interface GraphVars {
  setBool(name: string, v: boolean): void;
  setFloat(name: string, v: number): void;
}

export interface ParamSpec {
  name: string; // graph float name the value is written to
}

// Read the longest numeric prefix (donor uses from_chars, which stops at the first non-number character).
function parseLeadingFloat(s: string): number {
  const m = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s);
  return m ? Number(m[0]) : NaN;
}

// One animation event payload, e.g. "EnableAdvance|90|110|300|...".
// Returns true only if every value parsed.
export function applyPayload(
  vars: GraphVars,
  payload: string,
  specs: Record<string, { enableName: string; params: ParamSpec[] }>,
): boolean {
  const tokens = payload.split("|").filter((t) => t.length > 0); // empty fields are dropped, so later positions shift
  const verb = tokens[0];
  const spec = verb === undefined ? undefined : specs[verb];
  if (spec === undefined) return false; // unknown verb is ignored

  vars.setBool(spec.enableName, true); // donor: the enable is written BEFORE any value is parsed
  for (let i = 0; i < spec.params.length; i++) {
    const raw: string | undefined = tokens[i + 1];
    const value = raw === undefined ? NaN : parseLeadingFloat(raw);
    if (Number.isNaN(value)) return false; // stop here; values already written stay written
    vars.setFloat(spec.params[i]!.name, value);
  }
  return true;
}

// Consumer side: the distance window is widened by the weapon ranges (donor Circling_Hook.cpp 24-33).
export function inCirclingWindow(
  distance: number,
  minDist: number,
  maxDist: number,
  optimalWeaponRange: number,
  maxWeaponRange: number,
): boolean {
  const lo = minDist + (minDist > 0 ? optimalWeaponRange : 0);
  const hi = maxDist + maxWeaponRange;
  return distance >= lo && distance <= hi;
}

// Outside the window the donor floors the chance at 0.1 so units do not stall behind a barrier (Circling_Hook.cpp 47-48).
export function circlingChance(inWindow: boolean, baseChance: number, minChance: number): number {
  return inWindow ? baseChance : Math.max(0.1, minChance);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (sketch copy: `/tmp/cpr-clip-event-payload.ts`).

## 5. Lands in

- TARGET `src/fight/clip-events.ts` (new): clip-authored event tags that open or close a named engine window (for example a hit window) on the creature's current attack. The engine owns the numbers, and the clip only names the window. Parity-checklist row 7 (creature actor/clips).
- today: not checked in this pass (the Frankendom repo was not opened here).
- Reuse tag: adapt-allowed (MIT, max-su-2019: code may be adapted; this sketch is written clean-room from the mechanism)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The payload is free text in the animation file. A bad field half-applies: the enable is set and the earlier floats are new while the later ones are stale (CPRHandler.cpp 31-40). Frankendom must validate a clip event against a catalogue schema and apply it all or nothing.
- Empty fields are dropped (Dtry_Utils.cpp 11), so a missing value shifts the rest of the payload into the wrong slots. A Frankendom event parser must reject empty fields.
- Tuning values in the clip (the doc examples at lines 117-179) put gameplay numbers into animation assets. Frankendom's rulings keep tuning in zone and catalogue data (rows 20-21), so the clip should carry only the window name.
- The donor runs this in the game process, from the animation graph callback. Frankendom's kills are server-verified, so a hit window must be opened and checked on server time. A client-side animation callback must not decide whether a hit counts.
- The enable bool and the float values are never cleared by the event itself; only DisableAll clears the enable bools, and it leaves the floats. A stale float is harmless only while its enable is false, so the consumer must check the enable first (Circling_Hook.cpp 24).
- Interrupt: only EnableAdvance requests an interrupt, and the request is a graph bool that the graph must read (payloadHandler.h 73). Whether the graph honours it was not read. Frankendom's stagger and recovery (rows 1 and 3) must be engine state, not a graph flag.
- Dead code in the donor: `checkParamCt` has no caller, and the INI, async and custom-payload functions are declared with no definition in `src/`. Do not copy these; they are not a working mechanism.
- Skeleton and blending: none in this donor's source. The behaviour graph is the donor's blend layer, and it was not read beyond its string table. Nothing here covers skinning, IK, ragdoll or attachment points.
