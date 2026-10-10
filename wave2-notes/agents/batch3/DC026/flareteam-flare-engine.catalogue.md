# flareteam-flare-engine (design catalogue, DC026)

Donor: /mnt/frankendom-donors/flareteam-flare-engine (read-only, VPS). Half read: the RUNTIME. That is the client engine source (a flat src/ folder of C++ files) plus the default mod in mods/default. The game is single-player and client-side; this box has no server half. The paired data pack is flareteam-flare-game (its own note, flareteam-flare-game.catalogue.md). That pack holds all the creatures, classes, items, zones and looks. This engine box holds none of them as content.

Licence (per the asset audit AU020, which quotes the files): code is GNU GPL v3 (COPYING; README.engine.md). Contributors keep copyright on their contributions. The default mod is stated as GPL v3 and CC-BY-SA 3.0 with no per-file split. Treat every engine idea below as clean-room: shape and mechanism only, no code copied. Not legal advice.

Rule for every idea below: recreate as a clearly distinct original, never a copy. Each names the trait KEPT and the trait CHANGED.

## Counts (what each number is)
- creatures: 0. No enemy definitions in this box (mods/default has no enemies folder).
- classes: 0. mods/default/engine/classes.txt is a commented example only. Real classes are in flareteam-flare-game.
- weapons: 0 (no item data).
- gear_sets: 0.
- zones: 0 (no map data).
- Engine data present: 3 damage types (melee, ranged, mental; mods/default/engine/damage_types.txt), 4 primary stats (physical, mental, offense, defense; primary_stats.txt), a death-penalty block, a resource-stat example, 67 language files, 126 files in mods/default in total.

## 1. Creatures and beasts
None in this donor. The creature AI that drives every creature in the data pack is here, in section 2. Creature families and tiers are in flareteam-flare-game.catalogue.md.

### Top striking creatures
None: no creature data here.

## 2. Creature AI mechanisms (the runtime half: these are the ideas)

- Engage test (src/EntityBehavior.cpp lines 208-229): an enemy joins combat when the hero is inside its threat radius and it has line of sight (line 208). Stealth shrinks the radius for the hero only (line 154). Aggressive enemies are always in combat. Passive ones never join.
- Pull on join-combat (src/EntityBehavior.cpp lines 243-245): when an enemy joins combat it looks up its beacon power and emits it at its own position. Being hit also starts join-combat for the target (src/Entity.cpp line 360), unless the enemy has no-aggro. Beacon hits do not mark the target as targeted (src/Entity.cpp line 366). The beacon flag is read from power files (src/PowerManager.cpp line 438).
- Leash (src/EntityBehavior.cpp lines 259-262): a non-aggressive enemy leaves combat when the hero passes its far threat radius (line 261), or when it has had no line of sight for its line-of-sight cooldown. The far radius defaults to twice the engage radius (src/StatBlock.cpp line 807). The flee radius defaults to half the threat radius (comment in StatBlock.cpp around line 809).
- Movement stance (src/EntityBehavior.cpp from line 622): an enemy holds position when the hero is at or beyond its flee radius and it can flee (line 625). Otherwise it pursues on a chance roll (chance_pursue, line 631). Within melee range without line of sight, it moves toward the target (same line).
- Flee and re-roll (src/EntityBehavior.cpp around lines 315-321 and 668-675): a successful chance_flee roll sends the enemy to a safe distance. Fleeing lasts at least flee_duration, then is re-rolled each step to prevent endless fleeing (comment at line 668).
- Three radii per enemy (engage, far leash, flee) come from stat keys in the enemy file. The data pack sets them per family.

## 3. Progression, loot and death

- XP scaling (src/XPScaling.cpp lines 136-178): the multiplier is the product of an absolute table keyed by enemy level and a relative table keyed by enemy level minus hero level. Out-of-range keys clamp to the table ends. Tables are data; the data pack ships one (enemies/xp_scaling/il.txt).
- Death penalty (mods/default/engine/death_penalty.txt): a master toggle (enable=true); permadeath off; removes 50 percent of currency; 0 percent of total XP and of XP since the last level; does not remove a random item. One knob per penalty, all in data.
- Hero classes (mods/default/engine/classes.txt): a comment says the points for physical, mental, offense and defense must total no more than the max available points (line 3). The class format is the engine side of the data pack's class files.

## 4. Enemy spawn selection (runtime half)

- Enemy pool (src/EnemyGroupManager.cpp lines 76-121): a category maps to enemy entries with a level and a rarity. For a level window, each entry is added to a candidate list as many times as its rarity weight (common 6, uncommon 3, rare 1; line 96 onward). One candidate is then picked (line 121). A missing category logs an error and returns an empty enemy.
- The data pack's map placements (category, level, count range, optional wander radius) feed this pool.
- Spawn caps and despawn timers: not located. The narrow search hit respawn code in GameStatePlay.cpp (lines 358-361 and 430), which is the player's respawn point. Other files that mention respawn (Avatar, EventManager, MapRenderer, MenuExit, SaveLoad) were not opened. Enemy respawn was not found.

## 5. Ideas for Frankendom (originals, not copies; each names what is kept and changed)

1. Pull on first contact. Keep: a join-combat pull implemented as a data power, so it can be tuned per family. Change: pull only a fixed small number of allies, show a visual cue, add a cooldown. Rows: 4 (aggro and leash), 23 (zone population).
2. Two-radius leash. Keep: an engage radius and a far radius (default twice the engage radius) so a chase ends. Change: reset the timer when the hero returns, and show the leash on the minimap. Rows: 4.
3. Pool by rarity weight. Keep: rarity as candidate weight (6, 3, 1) and a level window per category. Change: precompute cumulative weights once at load, use a uniform random helper, and return a reference. Rows: 23 (zone population), 18 (loot and XP).
4. Two-table XP multiplier. Keep: a multiplier from enemy level (absolute) times enemy-minus-hero level (relative), clamped at table ends. Change: check the level-16 value in the data pack (see defects) and keep the table as data. Rows: 18 (loot and XP award).
5. Per-penalty death knobs. Keep: each death penalty is a separate knob (currency percent, XP percent, random item) under a master toggle. Change: our defaults, and a visible respawn cue. Rows: 17 (death and respawn).

## 6. Defects found (keep the idea, fix the defect)

Decision on each: adapt the idea, with the defect fixed in the sketch.

- Pool lookup copies the whole category vector on every call (src/EnemyGroupManager.cpp line 80: enemyCategory = it->second;). Fix: take a const reference, or precompute the weighted pool at load.
- Candidate list is rebuilt on every call (around lines 84-100). Fix: build the weighted pool once and index into it.
- Final pick uses rand() modulo the list size (line 121). Fix: a uniform random helper. Modulo bias is small here; the fix is one line.
- Enemy behaviour rolls chance values once per logic step (chance_pursue at line 631, the flee-start roll around line 321, and the flee re-roll around line 669). If the step rate changes, pursue and flee rates change with it. Fix: turn each roll into a per-second rate using the frame delta, or roll on a fixed tick. Not verified: I did not check whether the logic step is fixed-rate.
- Cross-link (data pack): the level-16 XP value in enemies/xp_scaling/il.txt reads 31768 where the doubling pattern gives 32768. Fix: check the value. Not verified in play.
- Cross-link (data pack): the fantasycore beacon template names power id 132, which the empyrean set uses for a shock spell; the empyrean set overrides it with id 161. Fix: refer to powers by key, or resolve ids per mod.

## Not read
- src/Hazard.cpp (295 lines), src/LootManager.cpp (893 lines), src/FogOfWar.cpp (396 lines), src/MenuMiniMap.cpp (636 lines), src/MenuTouchControls.cpp (138 lines). Not opened: src/MapParallax.cpp, src/CombatText.cpp.
- src/EnemyGroupManager.cpp lines 1-70 (header and load code, read as a summary only).
- mods/default/engine data other than classes, death penalty, damage types, primary stats and resource stats (combat text, font colours, combat.txt, and the rest).
- mods/default images, menus, fonts and languages (counts only, nothing viewed).
- The docs folder.
- Spawn caps and enemy respawn (not located in the narrow search).

## Verification
Receipts: /private/tmp/p2/wave2-haiku/batch3/DC026/flareteam-flare-engine.receipts.tsv, 21 rows, checked with gate/verify_receipts.py (21 ok, 0 failed). The verifier checks that each quote is on the cited line, not the claim. I checked claims against the surrounding lines. Lines marked "around" are approximate.

The three mechanisms most useful for the Frankendom ruling: the engage test and join-combat pull (EntityBehavior.cpp 208-245), the two-radius leash (EntityBehavior.cpp 259-261 with StatBlock.cpp 807), and the rarity-weighted pool (EnemyGroupManager.cpp 96 and 121).
