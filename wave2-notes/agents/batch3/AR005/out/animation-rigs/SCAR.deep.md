# SCAR (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/SCAR/src/SCARActionData.cpp` (selection and gates, 182-295) with `/mnt/frankendom-donors/SCAR/src/Hook_AttackCombo.cpp` (combo trigger, 33-61) and `/mnt/frankendom-donors/SCAR/src/DataHandler.cpp` (reads the clip annotations, 37-67) | Licence: MIT (`/mnt/frankendom-donors/SCAR/LICENSE`: "MIT License", Copyright (c) 2023 max-su-2019) | C++ (SKSE plugin for Skyrim) | symbol `SCARActionData::PerformSCARAction`

Checked: Read in full: `Hook_AttackCombo.cpp` (63 lines), `Hook_AttackStart.cpp` (46), `SCARActionData.h` (71), `SCARActionData.cpp` (301), `DataHandler.cpp` (120), `Function.cpp` (145), and the Nemesis hint file `#4874.txt` (16 lines). Read the combo event declaration `#0085.txt` at line 465 only. Read the combo and action-data parts of the EN developer manual by grep lines only. Not read: `main.cpp`, `LoadGame.cpp` (install order), `DataHandler.h`, `Hook_*.h` install code beyond the grep line, `BehaviorDataInjector/SCAR_BDI.json`, the rest of the Havok graph, the engine API internals (`RequestLOS`, `QTimer` units, `CombatAnimation`), the precision-capsule API. Confidence: high on the order of gates, the weights and the defaults (all read). Moderate on what the Havok patch does in the wider graph (one state read). Fit to "animation rigs": moderate. The donor has no skeleton, blend or IK. What it has is an attack chosen from the animation's own timeline, which is the part that transfers. The mechanism is MIT, so code may be adapted; the sketch is nonetheless written from the mechanism.

## 1. Mechanism

- Data lives on the animation. Each attack clip carries annotations; an annotation whose text starts with `SCAR_ActionData` holds a JSON option. The annotation's own time becomes the option's weight (`DataHandler.cpp` 55). Options are read from the clip's first annotation track (49-63).
- Trigger from the animation: while a melee attack plays, the clip's `SCAR_ComboStart` event fires at a time the animator chose. The handler requires: an actor in combat with a target, `IsAttacking()`, the event tag `SCAR_ComboStart`, and a roll on the event payload (`Hook_AttackCombo.cpp` 40-41). An empty payload always passes; otherwise `atoi(payload) >= Random(0..100)` (9-12). So the percent is written on the event (for example `SCAR_ComboStart.60` in the docs).
- The clip for the trigger is found by scanning the active nodes of the first behaviour graph for the first clip with a `SCAR_ActionData` annotation (`DataHandler.cpp` 94-108).
- Start from the AI: `AIAttackStartHook::StartAttack` (`Hook_AttackStart.cpp` 34-44). If the attacker has such a clip and a target, the SCAR path runs and its result is returned; the vanilla start is not called on that path (38-41, 43). The SCAR path also has a pacing gate: it returns false while the attacker is pathing and less than the setting `fCombatAttackAnimationDrivenDelayTime` (default 1.5 in the code) has passed since the last finished attack (14-15).
- Selection (`PerformSCARAttack`, `Hook_AttackCombo.cpp` 15-31 and the same in `Hook_AttackStart.cpp` 8-32): the attacker must not be the player, must have line of sight to the target, and must pass the pathing check (18-19). The options are sorted by weight, highest first (22), and the first one that `PerformSCARAction` accepts ends the search (23-26).
- Gates inside one option (`PerformSCARAction`, `SCARActionData.cpp` 182-295), in this order: attacker, target and process exist (184-185); the context has attack data (187-189); the clip's local time is inside `[TriggerStartTime, TriggerEndTime]` (191-193); the option's action type matches the attack type, except IDLE (195-199); then the chance roll and the geometry together (211-212): the roll is drawn first, then the distance band and the cone (`WithinAttackRange`).
- Cone and distance (`Function.cpp` 56-110): the target is taken into the attacker's frame; the planar distance and `atan2(x, y)` are compared with a min and a max distance (max grows by the target radius, min grows by both radii when min > 0; 61-63) and an angular sector that wraps when start is above end (102-110). A height-overlap test runs first (96).
- Cooldown: an option may name a `CoolDownAlias` (another option's name in the same context) or use its own attack data. A cooldown is "in force" while `now - stamp <= timer` (`SCARActionData.cpp` 101). The timer is set to `CoolDownTime` or the attack's recovery time (112), and only after the attack or idle action succeeds (238, 276).
- Execute: an attack option sets the graph variable `SCAR_AttackVariants` to its variant id (272), sets the animation event (273) and calls `Execute()` (274). An idle option sets the same variant variable (172) and then calls the idle action's `Process()` (173).

Order for one trigger on an AI tick: payload roll (combo) or pacing gate (start) -> sort by weight -> per option: window, chance roll, cone and distance, cooldown, conditions, execute -> cooldown set on success -> first success returns true.

## 2. Key functions

- `AnimEventHook::ProcessEvent`: `/mnt/frankendom-donors/SCAR/src/Hook_AttackCombo.cpp` 33-61 (combo trigger, payload roll, clip lookup, attack thread only).
- `PerformSCARAttack` (combo copy): `/mnt/frankendom-donors/SCAR/src/Hook_AttackCombo.cpp` 15-31 (LOS and pathing gate; sort by weight; first success).
- `AIAttackStartHook::StartAttack`: `/mnt/frankendom-donors/SCAR/src/Hook_AttackStart.cpp` 34-44 (replaces the vanilla start while a SCAR clip is active).
- `PerformSCARAttack` (start copy with the pacing gate): `/mnt/frankendom-donors/SCAR/src/Hook_AttackStart.cpp` 8-32.
- `SCARActionData::PerformSCARAction`: `/mnt/frankendom-donors/SCAR/src/SCARActionData.cpp` 182-295 (the whole gate order, idle and attack branches).
- `SCARActionData::IsInAttackCoolDown` and `UpdateAttackCoolDown`: same file, 99-114.
- `DataHandler::GetSCARActionData` and `GetSCARDataClip`: `/mnt/frankendom-donors/SCAR/src/DataHandler.cpp` 37-67 and 87-118.
- `AttackRangeCheck::WithinAttackRange`: `/mnt/frankendom-donors/SCAR/src/Function.cpp` 56-111.
- Defaults and JSON: `/mnt/frankendom-donors/SCAR/src/SCARActionData.h` 11-44 and `/mnt/frankendom-donors/SCAR/src/SCARActionData.cpp` 9-54.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Options sorted by an authored weight; first one that passes wins | Weight is the annotation time (DataHandler.cpp 55); sort is descending (SCARActionData.cpp 299) |
| Option is open only inside a window of the attack's own timeline | Window default 0 to unbounded (SCARActionData.h 34 and 36); the donor reads clip local time (SCARActionData.cpp 191) |
| Chance rolled before geometry, percent 0-100 | Default chance 100 (SCARActionData.h 28); clamped to -180..180 (SCARActionData.cpp 32), which does not match the 0-100 roll |
| Cone and distance band, planar, from forward | Default max distance 150 (SCARActionData.h 22); default cone -60 to 60 degrees (SCARActionData.h 24, 26) |
| Continuation percent carried on the event | Empty payload means 100 percent (Hook_AttackCombo.cpp 9-10 and docs line 171) |
| Cooldown per option or shared by alias | Cooldown = CoolDownTime or recovery time (SCARActionData.cpp 112) |
| Pacing gate after an attack while moving | 1.5 default setting (Hook_AttackStart.cpp 14) |
| Melee pathing: weapon range plus target radius, else navigation with radius 2.0 | Constants at Function.cpp 50 and 53 |

Docs example (not run): a power attack that is valid only between 0.8 and 1.0 s of its clip, so a combo event at 0.833 fires it but one at 1.833 does not (EN manual line 188).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside one option (window, then chance roll, then cone and distance, then cooldown), the weight-sorted first-success loop, the cone wrap, and the payload rule with a non-number reading as 0 (as `atoi` does). It omits the radius inflation of the min and max distances, the height test, line of sight and pathing, the reach selection (passed in as a plain number here), the idle and attack branches, the conditions alias, the variant id, the call that executes the animation, and the cooldown write after success (the caller must do that).

```ts
// Licence: MIT (donor: SCAR by max-su-2019, 2023). Adapted shape; this sketch is written from the mechanism, not a translation of the donor lines.
// An attack option is authored on the attack's own timeline: a window, a weight, a chance, a cone and reach, a cooldown.

interface AttackOption {
  name: string;
  weight: number;        // sort key: higher is tried first (donor: the annotation time)
  windowStart: number;   // seconds into the attack timeline
  windowEnd: number;
  chancePct: number;     // 0..100
  minDist: number;       // units
  maxDist: number;       // units, before reach is added
  coneStartDeg: number;  // measured from the forward axis; a start above the end wraps through behind
  coneEndDeg: number;
  cooldownKey?: string;  // options may share a cooldown by name
}

// Target measured in the attacker's frame: planar distance and angle from forward.
interface Geometry { dist: number; angleRad: number; reach: number; }

function inCone(g: Geometry, o: AttackOption): boolean {
  const s = (o.coneStartDeg * Math.PI) / 180;
  const e = (o.coneEndDeg * Math.PI) / 180;
  const inAngle = s < e ? g.angleRad >= s && g.angleRad <= e : !(g.angleRad >= e && g.angleRad <= s);
  return g.dist <= o.maxDist + g.reach && g.dist >= o.minDist && inAngle;
}

// First option that passes wins. Order: window, then chance, then geometry, then cooldown.
function pickAttack(timeNow: number, options: AttackOption[], g: Geometry, roll: () => number,
                    coolingDown: (key: string) => boolean): AttackOption | null {
  const ordered = [...options].sort((a, b) => b.weight - a.weight);
  for (const o of ordered) {
    if (timeNow < o.windowStart || timeNow > o.windowEnd) continue;
    if (o.chancePct < roll()) continue;              // roll is 0..100, and it is drawn before geometry
    if (!inCone(g, o)) continue;
    if (o.cooldownKey !== undefined && coolingDown(o.cooldownKey)) continue;
    return o;
  }
  return null;
}

// Combo continuation: the event payload is a percent. An empty payload means always; a non-number reads as 0.
function continueCombo(payload: string, roll: () => number): boolean {
  if (payload === "") return true;
  const pct = parseInt(payload, 10) || 0;
  return pct >= roll();
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed (file `scar_attack_window.ts` in `/tmp`, copy in the work folder). The sketch was not run; only typechecked.

## 5. Lands in

- TARGET `src/fight/attack-window.ts` (new, proposed; not checked against the repo). The engine's attack choice for a creature: one catalogue option per attack with window, weight, chance, cone, reach and cooldown, evaluated on the engine tick. The client only plays the animation the engine chose.
- Parity-checklist row 7 (creature actor/clips). The windows are creature clip data, so row 7 is the closest. The selection itself also touches row 2 (AI brain), but one row only is listed here.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, sketch written from the mechanism)
- Brief rule served: 7 (creature clips and the windows on the attack's timeline); 6 not used; MIT, adaptable with attribution

Best transferable idea: author each attack option on the attack's own timeline (a window, a weight, a chance, a cone, a cooldown) and let the first option that passes window, roll and geometry win, with the combo continuation carried as a percent on the attack's event.
Decision (proposed): adapt - take the option shape and the first-success order; reject reading the presentation clip time to decide, and reject the hook that replaces the vanilla attack start with no fallback.
Acceptance: in a duel, a creature's combo follow-up is offered only while its catalogue window is open (for example 0.8 to 1.0 s into the attack); a server test asserts that a request at 0.7 s and at 1.1 s is refused, that when two options pass the higher weight wins, and that over 10,000 seeded trials a 60 percent continuation lands within 2 points of 60.

## 6. Gaps and risks

- MIT: adaptable with the licence text kept. The sketch is written from the mechanism, not from the donor lines.
- The window is keyed on the animation's own clock (`a_clip->localTime`, SCARActionData.cpp 191). Frankendom's server verifies kills, so the window must be engine time (ticks) from the catalogue. A presentation clock must never decide a hit.
- The combo percent is text on an animation event (`Hook_AttackCombo.cpp` 12). Frankendom should hold the percent as a catalogue field (row 21), so there is one source of truth.
- Vanilla replacement: when a SCAR clip is active, the vanilla attack start is not called (`Hook_AttackStart.cpp` 38-41, 43). Frankendom rules want one engine and no silent second path. An option set that finds nothing must return "no attack" from the one path, and say so in the record.
- Clip lookup: the trigger uses the first active clip with SCAR data in graph zero (`DataHandler.cpp` 94-108). With several clips active the pick depends on node order. Frankendom should pick by attack id.
- Missing data passes: when an idle form named by `ConditionsAlias` cannot be found, the condition is skipped (`SCARActionData.cpp` 266-267: `if (IdleAnimation && !IdleAnimation->CheckConditions(...))`). Frankendom's catalogue check should fail closed.
- Chance clamp: `chance` is clamped to -180..180 (SCARActionData.cpp 32), not 0..100. A chance above 100 always passes and a negative one never does. Frankendom should clamp to 0..100 and report the clamp (clamp-and-report).
- Dead helper: `GetWeaponReach` is defined (SCARActionData.cpp 66) and nothing in `src/` calls it (grep). Do not port it.
- No attacker cap: the donor has no many-on-one limit. `MAX_ATTACKERS = 3` must sit in the engine above this selection.
- The geometry is Skyrim-specific: 3D bounds, navmesh, the precision-capsule API and debug overlays (`Function.cpp` 17-54, 113-143). Frankendom's arena or zone plane is 2D; keep distance and cone, drop the height test unless the Pit has vertical geometry. The overlay is client-only.
- Not read: `main.cpp`, `LoadGame.cpp`, `DataHandler.h`, `BehaviorDataInjector/SCAR_BDI.json`, the rest of the Havok graph, and the RE API internals.

Reuse tag: rewrite-from-idea (MIT; adaptable, sketch written from the mechanism)
Brief rule served: 7 (creature windows on the attack timeline); licence MIT, adaptable with attribution
