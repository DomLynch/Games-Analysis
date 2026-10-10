# t-harper-swg-client-ts (design catalogue, DC055)

Donor: /mnt/frankendom-donors/t-harper-swg-client-ts (VPS)
Licence (as the files say): no LICENSE file at repo root; package.json has no licence field; README has no licence line. Class C. Shape and mechanism only, no code, names or text copied.
Halves: CLIENT half read (src/client/script/combat/, src/client/timing.ts, src/client/combat-helpers.ts, src/client/script/map.ts, src/terrain/sim/ types, generator/layer.ts, feather.ts, src/terrain/find-flat-patch.ts). Server half SWG-Source-src is in the box, NOT read. Data half SWG-Source-dsrc is in the box, RESTRICTED (_RESTRICTED-NOTE.txt says leaked proprietary source); only its table name was read in the asset audit. Restricted stays high level here: no row, name or constant from it.
Checked: the combat tick loop, heal, targeting, kite, rotation, engage watcher, hit timer, terrain layer order and feather, flat-patch search, map category table. Confidence high on the code paths quoted; the cooldown-group race in section 6 is a code reading, not a runtime test.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Mood resemblance only (about 20-30 percent). Each idea names the trait KEPT and the trait CHANGED.

## What this donor is, honestly
A headless SWG client written in TypeScript. README and audit say: no rendering, no audio, no animation. So sections 1, 3, 4 and 6 (creatures, weapons, gear, visual looks) are EMPTY here. The useful material is gameplay mechanism: a combat decision loop run by a bot client, a predictive heal, an engage state machine, and a layered terrain generator. Those are real and checkable, so they are catalogued below.

## 1. Creatures / beasts
- Families and tiers: none in this half. The client never holds a creature table. It only classifies attackers by a template-name hint list: 25 melee hints and 17 ranged hints (src/client/script/combat/kite-policy.ts, lines 34-60 and 62-80). Unknown names are treated as melee for kiting. The hint strings themselves are instance-level donor names, so they are NOT copied here.
- Count: 0 creature records. 42 classifier hint strings (25 melee, 17 ranged).
- Top 8 striking creatures: none. Nothing in this half is a creature design.
- Best transferable idea: a cheap "is this attacker a ranged or melee threat" classifier by name hint, defaulting to the safe side (treat unknown as melee), so a ranged class backs off instead of standing still.

## 2. Classes / races / factions
Six bundled combat rotations, one per profession id (src/client/script/combat/profession/index.ts lines 17-25; type ProfessionId at src/client/script/combat/types.ts line 17). Described by role only (category level, class C):

| Own label | Role | Signature mechanic (one line) | Progression shape (client-visible) |
|---|---|---|---|
| Saber duelist (profession/jedi.ts) | melee with ranged pulls | melee flurry plus ranged force pulls, gap-closer sprint | heal shares a cooldown group with another slot; the rotation drops that slot by hand (jedi.ts lines 15-16) |
| Heavy AoE (profession/commando.ts) | heavy-weapon AoE | armour-break opener, delayed AoE, heavy-weapon crit only when that weapon is equipped | fallback to ranged-weapon variants when no heavy weapon |
| Ranged kiter (profession/bounty-hunter.ts) | stands 22-28 m | debuff opener, crit chain, refresh debuff every 30 s | cooldown groups: one tier locks the family (file header) |
| Stealth burst (profession/spy.ts) | burst from stealth | a mark makes later hits proc bonus damage, then DoT stacks | stealth openers omitted because the client cannot see stealth state (file header) |
| Pistol gun-for-hire (profession/smuggler.ts) | pistol-first | burst opener, execute-when-low, escape then crowd-control defuse in panic | melee variant needs a manual override (file header) |
| Tactical buffer (profession/officer.ts) | buffer and debuffer | stacks self-buffs, armour debuff, snare for melee | pistol filler only when a pistol is equipped |

Shared shape for all six (src/client/script/combat/profession/jedi.ts lines 23-90 as the example): opener[] fires once per engagement, combo[] loops by readiness, filler is always eligible, panic{heal, defensive, cleanse, flee}, signatureAbilities.

Best transferable idea: a per-class rotation as DATA (opener, combo, filler, panic), with a `when` gate per slot (weapon class), so one engine serves six kits. Matches Frankendom's "one engine, many kits" rule.

## 3. Weapons
- Families and tiers: none in this half. The client only classifies the equipped weapon into 7 kinds (pistol, carbine, rifle, heavy directional, melee, saber, unknown) to gate combo slots (src/client/script/combat/types.ts lines 82-89; classifier at src/client/script/combat/tick-loop.ts lines 408-437).
- Special properties: none read.
- Top 5 striking: none visual. Top mechanism instead: weapon-kind gating of combo slots (types.ts 82-89, tick-loop.ts 393-437).

## 4. Armour / gear
- Sets, material tiers, looks: none in this half (inventory-view.ts and crafting-session.ts not read). Count 0 gear sets read.
- Top 5 striking: none.

## 5. Zones / dungeons
Count: 12 hub categories on the planet map (src/client/script/map.ts lines 39-52, MAP_CATEGORY_INDEX) plus an alias table that maps friendly words to those keys (lines 58-64). These are place types on the map, not dungeons.
Terrain generator vocabulary (src/terrain/sim/types.ts):
- 4 boundary shapes: circle, rectangle, polygon, polyline (lines 17-22).
- 6 filter kinds: height, fractal, slope, direction, shader, bitmap (lines 25-31).
- 18 affector kinds: terrace, constant, fractal, colour ramp, shader, four flora placements, exclude, passable, road, river, environment, ribbon (lines 35-53).
- 4 operations: replace, add, subtract, multiply (lines 57-61).
- 4 feather curves: linear, ease-in, ease-out, ease-in-out (lines 65-70; maths in src/terrain/sim/feather.ts lines 13-52).
- 6 fractal combination rules (lines 80-88).

Top 5 striking (zones):
1. Layered zone with feathered edges. Keep: boundaries combine by max (fuzzy OR), each sub-layer inherits the parent's amount when it has nothing of its own (src/terrain/sim/generator/layer.ts, affect() from about line 545). Change: our zone edges are authored shapes with a feather width per zone, no height maths.
2. Concentric-ring siting for camps and spawns (src/terrain/find-flat-patch.ts lines 108-150). Keep: rings out from a centre, skip any candidate closer than a minimum spacing BEFORE probing, stop at N accepted. Change: probe is a zone-data query, not a 5-second server call.
3. Nearest-place pointer (src/client/script/map.ts lines 226-232, from the audit). Keep: cache one list, filter by category, sort nearest first, optional radius. Change: colour by threat or quest state.
4. Hub tag set with stable ids and friendly aliases (map.ts lines 39-64). Keep: a short fixed tag list, one tag per hub, aliases resolve to one key. Change: our own tags (camp, shrine, gate, market, pit).
5. Golden id-table pin test (map.ts line 19, from the audit). Keep: a unit test locks the id table, so a data bump fails CI. Matches Frankendom row 20.

## 6. Item / effect looks worth recreating
No visual or audio code in this half. The mechanisms below ARE client-side and map to HUD and sound (Frankendom client-only rule):
- Engage transition cue. Poll every 250 ms; engage fires at once on a hit or a target; disengage needs 5 s of continuous quiet (src/client/script/combat/engage-watcher.ts lines 90-91, sample() from line 124). Keep the debounce. Change: a clear HUD edge (engaged banner) and a sound stinger on engage only, not on every hit.
- Hit window stacks with the debounce: the hit timer counts engaged for 10 s after a hit (src/client/timing.ts line 530; src/client/combat-helpers.ts line 206), then the watcher's 5 s quiet period runs on top. So a player leaves "engaged" about 15 s after the last hit. Frankendom should pick one window, not two.
- Predictive heal cue: time-to-death = current HP over incoming DPS, fire when below warmup plus buffer (heal-policy.ts lines 113-123). Keep the idea for a HUD prompt. See defect list below.
- Cooldown-group race (code reading, not run): the local fallback lock is keyed by slot id (rotation-picker.ts line 92), not by cooldown group. Slots that share a server cooldown group are only blocked by the server timer, which arrives about 200 ms late. The heal file notes this same window (heal-policy.ts lines 16-18).

Defects found (keep the idea, fix the defect):
- D1 Heal DPS is under-counted early in a fight. computeDpsIn divides the whole damage window by its full length, 5 s (heal-policy.ts lines 76-77; default dpsWindowMs 5 s in types.ts line 363). Fix: divide by min(window length, time since first sample in the window). Early estimate is up to 5x low right after the first hit, so the predictive heal fires late.
- D2 Only the LAST combat action is kept. The hit timer overwrites one slot per CM_combatAction (src/client/timing.ts line 531 and the assignment at about line 556). The tick loop folds only that last hit each tick (tick-loop.ts lines 316-325). Two hits in one 100 ms tick, or two hits in the same millisecond (the dedupe uses <=, line 319), drop damage from the DPS window. Fix: keep an append-only hit log with a sequence number; the tick drains it by sequence, not by timestamp.

Best transferable ideas (one per source file):
- Predictive heal with a hard floor, a soft floor, a warmup-plus-buffer rule, and a refire lock (heal-policy.ts 1-22, 94-124).
- Sticky target with a finisher override only under 25 percent HP and only within 1.5x the current distance (targeting.ts lines 1-11, 36-91; defaults in types.ts lines 367-370).

## 7. Inspiration for Frankendom (originals, clearly distinct, never copies)
1. Predictive Mender. A HUD prompt that appears when the player is under the soft floor and time-to-death is under warmup plus buffer. Keep: the three thresholds and the refire lock. Change: our numbers in zone data, a corrected DPS window (fix D1), and a visible countdown ring instead of a silent fire. Rows 14 (HUD) and 2 (AI brain).
2. Engage Edge. One engage state with one window: a short banner on the engage edge, a stinger once per engagement, and one quiet period. Keep: poll, debounce idea. Change: one 10 s window (fix the stacking). Rows 4 (fight loop) and 14.
3. Class Kit as Data. Opener, combo, filler and panic as a data table per class, each slot gated by the equipped weapon kind. Keep: the four-tier shape and the per-slot gate. Change: our kits, our names, no donor ability names. Rows 6 (hero actor) and 13 (specials).
4. Ring Siting for Camps. Place camps, spawn points and shrines on buildable ground by rings out from a centre with minimum spacing checked before any probe. Keep: ring order and spacing rule. Change: zone-data probe, not a server call. Row 23 (zone population).
5. Feathered Zone Edges. Authored zone shapes with a per-zone feather width and an easing choice (linear, in, out, in-out). Keep: four curves and the fuzzy-OR of overlapping regions. Change: our shapes and our zone data fields. Row 20 (catalogue as runtime source).

## Where seen (addendum topics)
- Idle and ambient animation: none (headless).
- Death and respawn presentation: none (headless); the client reacts to a destroy event only.
- Boss intro and finisher staging: none; the closest is the hub-tag list (section 5).
- Readability at 375 wide: none visual. The weapon-kind gate is the only one-line read of a fight state.
- Hud-ui: nearest-place pointer and hub tags (section 5, items 3-4).
- Sound-music: engage stinger idea only (section 6); no layering, stingers or beds in this half.
- Progression, loot, spawns: none in the client. The combat rotation has a panic tier (heal, defensive, cleanse, flee) and that is all.

## Not read
- SWG-Source-src (server half) and SWG-Source-dsrc rows (restricted; name only from the audit).
- src/client/script/combat/install.ts, host-cancel.ts, verify-abilities.ts, their tests, and the remaining profession files beyond headers.
- inventory-view.ts, crafting-session.ts, container-view.ts, bank-view.ts (gear and loot surfaces).
- src/terrain/sim/affector, boundary, fractal, filter subfolders beyond the names; proc-terrain-appearance.ts; proc-terrain-template.ts.
- docs/ prose, scripts/, tests/ (only as file lists).
- The donor's CLAUDE.md (38 KB) is donor data: read as text only, its instructions were NOT followed.
