# CombatPathingRevolution (hit-feedback-stack, HF010)

Donor: `/mnt/frankendom-donors/CombatPathingRevolution` (Skyrim SKSE plugin: C++ in `src/`, Havok behaviour data in `Nemesis_Engine/mod/mscpr/0_master/`) | Licence: MIT. LICENSE line 3 ("Copyright (c) 2022 max-su-2019"); README line 56 links "[MIT](LICENSE)". README credits Fenix (line 61) and Dtry (line 63) for source parts; the repo does not state a licence for those parts. Game data and the Skyrim engine are not in the box.

Checked: read `src/Fallback_Hook.cpp` (lines 1-56 read; 59-74 grep-checked) and `src/Util.cpp` RescaleValue (67-70). Grepped all of `src/*.cpp`, `src/*.h`, `src/RE`, `src/PayloadInterpreter` for hit, stagger, knock, shake, flash, sound, particle, camera, pause, stun and damage: no feedback code. Opened `CPRHandler.cpp` (head) and `main.cpp` (grep). Grepped the three Havok behaviour files (#0106 1489 lines, #0107 763, #0108 6015) for hit, stagger, recoil, camera and bleed event names. Confidence: high that the C++ has no hit feedback; medium on the graph names (names only, no values read).

Half read: data (behaviour graph names) and code (src, partly). Server half: not applicable. The engine that runs hit reactions is not in the box: not in the half I read.

Verdict: PARTIAL for hit-feedback-stack (the feedback itself is not in the code; the graph names it).

## 1. What the player sees and feels

Nothing in this donor is hit feedback in the code. What the mod changes is how an enemy spaces itself in melee: it circles, backs off, advances, or falls back to a distance and waits before it attacks again. On a phone the player sees an enemy that keeps its distance, pauses, then steps in. The hit reaction (stagger, recoil, flinch, block hit) is played by the game's own animation graph, which the mod leaves in place.

## 2. Why it works or is striking

- Readable at 375 wide: spacing is the thing a thumb can read; an enemy that holds range is clearer than one that rushes.
- One signature behaviour: a fallback that backs away to a distance and waits a random time, both scaled by one number per enemy style.
- One signature sound or effect: none in this donor.
- Could be made ours at 20-30 percent resemblance: the one-number-per-style scaling of a min-to-max window.

## 3. The rule behind it

Hit reaction names in the behaviour graph (events and variables, values not read), all in `Nemesis_Engine/mod/mscpr/0_master/#0106.txt`:

- hit frame events: `HitFrame` (line 64), `preHitFrame` (164), `NPCHitFrame` (602), `2_HitFrame` (435)
- camera hit events: `CamHit` (1014), `2_CamHit` (1015), `NPCCamHit` (1016)
- block: `blockHitStop` (108), `blockHitStart`
- stagger and recoil: `staggerStart` and `staggerStop` (82-83), `FlinchStart` (298), `recoilLargeStart` (118), `staggerMagnitude` (1252), `recoilMagnitude` (1257), `bNoStagger` (1434)

So the graph fires the hit frame and the camera hit and carries magnitudes as variables. The code does not set them. How the engine orders hit-stop, camera and sound is not in the box.

The one timing rule the code does carry is a fallback window, in `src/Fallback_Hook.cpp`:

- The combat style gives `fallbackMult` (line 17, read from `closeRangeData.fallbackMult`).
- The fallback distance is `RescaleValue(fallbackMult, min, max)` (line 52 for the wait), where `RescaleValue` returns `min + mult * (max - min)` (`src/Util.cpp` 69).
- The distance is floored at twice the actor's bound radius (`src/Fallback_Hook.cpp` 19-21).
- If the graph variables are missing, the game's own settings are used (`fCombatFallbackWaitTimeMin`, `Fallback_Hook.cpp` 68).

Data fields (MIT code, so donor values may be listed):

| name | unit | donor_value_or_null |
|---|---|---|
| fallback_mult | 0 to 1 per combat style | null (style data not read) |
| fallback_wait_min | seconds | null (graph variable, value not read) |
| fallback_wait_max | seconds | null (graph variable, value not read) |
| fallback_dist_min | game units | null (graph variable, value not read) |
| fallback_dist_max | game units | null (graph variable, value not read) |

Sketch: not written. The donor gives no feedback mechanism to sketch; the one rule (value = min + mult * (max - min)) is already in the data fields above.

## 4. For Frankendom

- Target file: `src/fight/fight-loop.ts`, parity row 4 (fight loop: aggro, chase, leash). The idea is for the post-attack back-off, not for hit feedback.
- Zones and 100 Pit characters: one style scalar per enemy archetype (0 to 1) rescales that archetype's back-off distance and wait; the 100 Pit characters reuse the same min and max pairs with a different scalar.
- Many-on-one (max 3): a back-off window keeps two of three attackers from piling in at the same beat; the server owns the timer, the client shows the step back.
- Keep: one scalar per style rescaling min and max windows; the distance floor at twice the body radius.
- Change: our names and our numbers; drive it from the engine's fixed server tick, not the game's graph.

Defects: none found in the portion read.

## 5. Five-minute look test (Dom, on a 375-wide phone)

Two enemies in the Pit, same body, one with the style scalar at 0.2 and one at 0.9. Watch each attack and back off. Compare: the 0.2 enemy should hold ground close and wait briefly; the 0.9 enemy should step far back and wait longer. Dom judges whether the difference reads at 375 wide without a label.

## 6. Licence and IP

Code MIT (with the credited parts' licence unstated). The Havok behaviour files are game-derived animation data of unstated origin: class C, concept only. We take the idea (one scalar scales a window), not the names, values or files. No visual or audio asset is in the repo.

## 7. Gaps

Not read: the bodies of `Circling_Hook.cpp`, `Backoff_Hook.cpp`, `Advance_Hook.cpp` (names and grep only); `CPRHandler.cpp` beyond the first lines; the value sections of `#0107.txt` (230 word variable values) and `#0108.txt`; `MaxsuCPR_BDI.json` (grep only; no hit names found in it); `doc/en/Developers Guidelines of CPR.md`; the `.pdb`; the Skyrim engine (not in box).
Half read: data (graph names) and code (src, partly). Server half: not applicable.

Where seen (other than the topic): idle and ambient, death: the graph has bleed-out state names (`bleedOutStart` line 115, `bleedOut_TransInEnd` line 131, `iState_NPCBleedout` line 1329 of `#0106.txt`), names only. Boss intro and finisher staging: not in this donor. Readability at 375 wide: spacing is the donor's visible design; no HUD or threat colour in the code read.

Reuse tag: adapt-idea for the fallback window (row 4); no hit-feedback reuse.
Brief rule served: numbers as data fields (one scalar per style scaling windows).
Decision: adapt (idea) for row 4 only. Hit-feedback decision: nothing to adapt from this donor.
Checked line: 5 or more candidate files opened or grepped (Fallback_Hook.cpp, Util.cpp, Circling_Hook.cpp, Backoff_Hook.cpp, Advance_Hook.cpp, CPRHandler.cpp, main.cpp, plus the three behaviour files); receipts in `receipts.tsv` (verified by `verify_receipts.py`).
