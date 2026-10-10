# brendenbowers-SWGEmuClient (Unreal client for a Star Wars Galaxies emulator; cell DC010)

Donor: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/ (VPS, read-only, reached over ssh).
Licence (from the files): no LICENSE, COPYING or NOTICE file. Plugins/SWGEmu/README.md says the code is "provided as-is for educational purposes related to SWG EMU" (per AU007). Epic template headers appear in engine target files. Asset licence not stated for the .uasset and .umap files, the CSV, or the three GIFs. The README says the client needs the TRE data files from a retail client, which are not in the repo. Rights-holder status is unknown from the repo.
Class C (AU007). Inspiration is category-level and mechanism-level only. No look is copied from the game or the client. Trait KEPT and trait CHANGED are named on each item. This is design inspiration, not a legal opinion.

## Halves read

- CLIENT half (read): Plugins/SWGGame/Source/SWGEmuClient (combat, terrain flora, posture, force and performance components); Plugins/SWGEmu/Source (network layer: message and object baselines; PlayerObject and CreatureObject fields). Read in part, by grep and by reading the functions named below.
- DATA half in this repo (read): Plugins/SWGEmu/Content/SWGFormTagMappings.csv (14 lines: a header and 13 template rows). The game data itself (creature, item and zone tables) is not in this repo: the README says it comes from the retail TRE files.
- ASSET half (listing only): Content/ (19 materials, 9 input assets, 5 props and levels, 1 data table, 40 UI assets across the UI plugins). Binary assets were not opened.
- SERVER half (not read): the matching server halves are in the box but not in my donor list: ProjectSWGCore-Holocore and swgemu-Core3 (server), and SWG-Source-dsrc (data templates). I did not open them.
- Not read: most UI widgets (names from AU007 only), the travel subsystem, the map scene, the combat animation chain, the sky and holo materials.

## Counts (from the files read)

| counts | value | basis |
|---|---|---|
| creatures | 0 | no creature table in this repo; creatures arrive by network baseline and come from the TRE data and the server |
| classes | 0 | no class table; three class-linked state components exist (force, performance, crafting posture) |
| weapons | 0 | no weapon table; the CSV maps a weapon template class to an actor class only |
| gear_sets | 0 | no armour or gear table in this repo |
| zones | 0 | no zone table; terrain flora has 4 streaming tiers and the planet map has 21 landmark kinds (below) |

The zero counts are by design of this repo (client only, data from TRE), not a missed file. Zero is not a count of the game.

## 1. Creatures and beasts

Not in this client. The CSV maps template codes to actor classes: SCOT (creature or vehicle, biped NPCs and players, plus ground vehicles), STOT (generic tangible), SWOT (weapon, a plain tangible actor), RCCT (resource container), STAT (static decoration), SBOT (building), SIOT (installation: harvesters, turrets, factories), CCLT (building interior cell), SSHP (starships, no actor yet), SITN (intangible, no actor), SDSC (schematic, data only), SPLY (player object, attaches to the creature), SHOT (abstract root). Source: Plugins/SWGEmu/Content/SWGFormTagMappings.csv:1-14.

Top 8 creatures: none could be read from this client. I did not invent any.

## 2. Classes, races and factions

No class or race list in the repo. Class-linked client state (what the client can show):
- Force state: a force pool with a current value, a maximum, and a state value (Public/Components/SWGForceComponent.h:18-25). The regeneration rule was not read.
- Entertainer performance state (SWGPerformanceComponent.h:11): dance and music performance state.
- Crafting posture (SWGPostureTypes.h, ESWGPosture Crafting entry, about line 100-120) and a combat attitude set (evasive, normal, aggressive; posture entries 7-9).

Progression shape (client side): none read. Progression data comes from the server.

## 3. Weapons

No weapon families or tiers in the repo. The CSV row SWOT is the only weapon-related data: an equippable weapon is a plain tangible actor in the world (CSV line 4). Top 5 weapons: none could be read.

## 4. Armour and gear

No gear sets or material tiers in the repo. How equipped gear is shown was not read. Top 5 gear: none could be read.

## 5. Zones and dungeons

- Terrain flora streaming in four tiers: Collidable, NonCollidable, RadialNear and a default tier (RadialFar), each with a min and max distance band (SWGTerrainFloraSubsystem.cpp:258-285; the tier enum header was not read). A cell is in a tier's ring when any part of it falls inside the band (cpp:280-285).
- Landmark kinds on the planet map: 21 entries (medical centre, cloning facility, and others), with a label and a marker colour each (SWGMapMarkers.cpp). The colour values are not reproduced here.
- Planets and travel: a travel subsystem and travel messages exist (not read).
- Dungeons and encounter zones: none in the client.

Top 5 striking zones (from what was read):
1. Ring streaming for flora: a cell loads when it enters the band and unloads only when it has left the band plus one cell of slack. Keep: a ring with hysteresis. Change: our zone cells are zone data, with a per-frame budget in ms. Ref: SWGTerrainFloraSubsystem.cpp:280-285, :322, :335.
2. Nearest-first placement queue with an in-flight cap: cells near the player are placed first, and no more than a fixed number are in flight. Keep: nearest-first and a cap. Change: a browser budget per frame, not per flight. Ref: cpp:350, :362, :372.
3. Landmark map: 21 landmark kinds on a planet map, with labels. Keep: a fixed set of landmark kinds on the map. Change: our own kinds and icons. Ref: SWGMapMarkers.cpp:26-37 (colour lines not reproduced).
4. Four vegetation tiers by distance: a near collidable tier, a non-collidable tier and two radial tiers. Keep: distance bands per detail tier. Change: our own bands per zone. Ref: cpp:258-270.
Only four striking zone items could be read; a fifth (interiors keyed by cell number, CCLT row) is a data rule rather than a visual, so it is noted but not ranked. Ref: SWGFormTagMappings.csv:CCLT row.

## 6. Item and effect looks worth recreating

1. Posture as a status list: one enum carries stun, blind, dizzy, intimidated, immobilized, frozen, poisoned, bleeding, diseased, on fire and similar states (SWGPostureTypes.h, ESWGPosture, about lines 14-58). Technique: one enum with one code per state. What each state drives (movement, HUD, effects) was not found in the read code; GlowingJedi appears only in the enum, with no handler in this repo. Ref: SWGPostureTypes.h:117 (GlowingJedi entry).
2. Combat swing feedback: the client sends one swing at a time and waits for the server's verdict (see section 8). The donor logs refusals and does not show them: "the server explains itself over system chat, which we do not decode yet". Ref: SWGCombatSubsystem.cpp:457-512.
3. Holo panels, ghost placement, radial ring, scan field, layered sky (named in AU007; the materials and widgets were not opened). Keep: translucent projected panels, a translucent build ghost, a ring menu near the cursor, a tinted scan field, layered sky sprites. Change: our own palette and shapes. Ref: AU007 list; Plugins/SWGUIHolo/Content/UI and Content/SWGEmu/Materials (names only).
4. Target outline material on the HUD: Content/SWGEmu/UI/HUD/M_TargetOutline.uasset (name only; not opened).

Idle and ambient vocabulary: not read (the animation pipeline file was not read in full).
Death and respawn presentation: not read.
Boss intro and finisher staging: none in the client.
Readability at 375 wide: not measured.

## 7. Inspiration for Frankendom (originals, not copies)

1. Swing Gate (auto-attack with server cooldown). Keep: one pending server reply at a time; cooldown set by the server's timer with a floor; transient refusals retry after a fixed interval, other refusals stop. Change: a pending swing keeps its action id so a timeout does not send a second swing; every refusal shows a short line on the HUD.
2. Ring Stream (zone props by distance). Keep: an annulus test, load and unload with slack, a nearest-first queue, an in-flight cap. Change: our zone cells are data; the cap is a per-frame millisecond budget.
3. Status Stack (one status enum). Keep: a single status code per state that drives movement and the HUD. Change: our own first set of six statuses, each with an icon and a sound; no glow state unless it has a handler.
4. Focus Pool (force-style pool with state). Keep: a separate pool value, a maximum and a state flag on the hero. Change: our own name and regeneration rule (earned in fights, not on a timer).
5. Landmark Board (planet-map landmark kinds). Keep: a fixed set of landmark kinds with labels. Change: our own kinds and icons, placed by zone data.
6. Holo Ledger (translucent panels for sheet, map, inventory; from AU007). Keep: translucent frames with thin meter lines. Change: our palette, angular frames, our own type. Category-level only.
7. Ghost Placement (translucent build preview; from AU007). Keep: a ghost before commit. Change: our grid and colour states; a footprint outline.

## Defects seen (keep the idea, fix the defect)

- A. The swing timeout (SWGCombatSubsystem.cpp:361-368) clears the pending action and sends again, without knowing whether the first swing landed. The reply for the first is then ignored. Result: a possible double swing if the server acted late. Fix: keep the action id and wait longer, or let the server dedupe by action count. The "server verdict wait" in this file is otherwise sound.
- B. Refusals are only logged (cpp:468-476). Fix: show each refusal as a short HUD line.
- C. UpdateStreaming scans a square of cells for every enabled tier on each call (cpp:287-345), and PumpPlaceQueue copies and sorts the whole queue on each call (cpp:348-379). Fix: keep the queue in a heap, and cap the work per frame.

## Fold-ins

- hud-ui: a target outline material (name only), a radial ring and an action bar (AU007 names). Touch UX and input buffering: input mapping assets exist (Content/Input: IMC_Default, IMC_MouseLook, touch interface), not opened.
- sound-music: none read in the client.
- progression: force pool and jedi state fields (section 2). Progression rules are server-side.
- loot: none read in the client.
- spawns and encounters: the flora streaming rings are the only spawn-like rule read.
- death and respawn: not read.
- boss intro and finisher staging: none.
- readability at 375 wide: not measured.

## Licence and use

No code licence and no asset licence in the repo. Rights-holder status is unknown from the repo. Use the mechanisms as shape only, clean-room, and make every look from scratch. Do not copy the UI, the textures or the sky. This is not a legal opinion.
