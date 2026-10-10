# mattyx14-TheForgottenTibiaClient (design catalogue, DC035)

Donor: /mnt/frankendom-donors/mattyx14-TheForgottenTibiaClient/ (VPS, read-only). An OTClient fork (README and LICENSE name OTClient).
Licence: code is MIT (LICENSE line 1: "OTClient is made available under the MIT License"). Assets have no separate licence and no stated origin for the UI art, fonts, cursors or start-up sound, so those are class C. The game is Tibia, a proprietary MMO (client code holds CipSoft host and key constants in modules/gamelib/game.lua lines 20-22). Treat looks as class C: category-level inspiration only.
Dom's rule for every brief below: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.
A donor AUTHORS file and an ISSUE_TEMPLATE exist; neither was used as instruction.

## Which half was read

- Client half: read in part. Lua modules (battle list, death window, combat controls, minimap, cooldown, outfit and mount names, market vocation filter), data/particles/particles.otps, data/locales (line counts and structure), data/styles, data/fonts (names and counts).
- Server half: the TFS extended-opcode patch is in tools/. The server itself is not in this box. The paired server is otland-forgottenserver, present as its own donor folder in the box (named only, not read by this reader).
- Data half (spr/dat sprite and item data): absent by design. README.md line 20 says the user supplies them. data/things/ holds only a .gitignore.

## Counts

| Set | Rows | Note |
|---|---|---|
| Creatures | 0 | No creature table in this client. Creatures reach the client from the server. |
| Classes | 0 rows | A vocation filter exists in the market (modules/game_market/market.lua line 116) and a spell-list filter ("Hide spells for other vocations", neededtranslations.lua line 147). The vocation names come from the server; none are in the box. |
| Weapons | 0 | Item rows are in the absent data half. |
| Gear sets | 0 | None read. |
| Zones | 0 | Minimap only. No zone or dungeon table. |
| Locale files | 6 | en (14 lines, empty translation table), de (377 lines), es (381), pl (419), pt (413), sv (377). |
| Needed-translation strings | 362 | modules/client_locales/neededtranslations.lua, generated list of UI strings. |
| Fonts | 9 PNG sheets, 6 .otfont | data/fonts (counted). |
| UI images | 199 PNG | data/images (counted). |
| Cursors | 5 entries | data/cursors. |

Locale grammar (no text quoted): each locale file is a Lua module with a header (name, charset, number formats) and a translation table keyed by source string. The English one is empty because the source strings are already English (en.lua line 10-11). Other files were counted by lines with a bracketed key: de 362, pl 406, pt 398; es and sv not counted by key.

## 1. Creatures and beasts

None in the client half. The battle list shows creatures the server sends and filters them by kind: players, NPCs, monsters, skulls and party (modules/game_battle/battle.lua lines 250-262). That is a filter, not a creature family list.

Top 8 creatures: none. There is no creature family, tier or boss pattern in this client. The nearest transferable idea is the battle-list target strip (section 6, look 1).

## 2. Classes, races and factions

- Vocations: named by the server; the client only filters by them (market line 116; spell list line 147).
- Stance modes: three fight modes, offensive, balanced and defensive (modules/game_combatcontrols/combatcontrols.lua lines 204-215; the mode goes to the engine on each change).
- Chase toggle: sends chase or don't-chase on check change (onSetChaseMode, lines 218-225).
- Safe-fight toggle (lines 228-229): the checkbox is checked when safe fight is OFF (line 114 sets it to not-safe), and the send is inverted to match (line 229). This works, but the icon name says "safe fight" while checked means unsafe; a player can misread it.
- PvP modes: a radio group sends the PvP mode on change (combatcontrols.lua line 53, handler at line 232).
- Mounts: a toggle with mount and dismount functions (modules/game_playermount/playermount.lua lines 29-43; 48 lines in total).
- Outfits: an outfit and mount picker, 319 lines, with random and next or previous steps (modules/game_outfit/outfit.lua lines 53-231). Read by function names only.
- Progression: skills window (game_skills, 425 lines) and spell list (game_spelllist, 311 lines), not read in depth.

## 3. Weapons

None in the client half (item rows are data, absent). Nothing to rank.

## 4. Armour and gear

None in the client half. Container and inventory windows exist (game_containers, 159 lines; game_inventory), not read in depth.

## 5. Zones and dungeons

- Biome list: none in the client. The client has a floor-based minimap.
- Minimap (modules/game_minimap/minimap.lua): the map file is per client version (lines 111 and 125), or an .otmm file when that mode is on; saveMap writes the file and the widget state (lines 120-128); a full-map toggle swaps the widget to a full-screen parent (around line 144). The full map is supplied by the user (FULL MINIMAP Installation ReadMe.txt, names only).
- Hazards: none read.

Top 5 striking zone or world-read ideas (criteria: readable at 375 wide, one behaviour, one sound or effect, could be ours at 20-30 percent resemblance):
1. Per-version map memory: the map saves and loads per game version and survives reconnects (minimap.lua 111-128). Keep: save on exit, load on start. Change: our own file keys.
2. Full-map swap: one widget moves between the corner and a full-screen parent (minimap.lua around 144). Keep: one widget, two homes. Change: full-screen map on the same camera marker.
3. Camera marker on the minimap follows the player each update (updateCameraPosition, minimap.lua around lines 130-137). Keep: marker on the map. Change: heading arrow.
4. Floor-based map: the map is per floor. Keep: floor as a first-class axis. Change: our own level names.
5. Map supplied by the user, not shipped: a legal-safe approach. Keep the pattern for our own maps; ship our own art only.

## 6. Item and effect looks worth recreating

1. Battle list as a target strip (modules/game_battle/battle.lua). Technique: filters by kind (lines 250-262); sort by name, distance, age or health (lines 55-58, sort key handling around 272-300). The distance sort re-sorts when the local player moves (onCreaturePositionChange, around 286-300, using a Chebyshev distance at line 281). Health change re-sorts only in health mode (line 272). Keep: type filters, distance sort that re-sorts on move. Change: a three-slot touch strip with threat shapes and a party ring; no text list.
2. Cooldown ring (modules/game_cooldown/cooldown.lua). Technique: the spell icon's progress fills from 0 to 100 by 10000/duration each 100 ms tick (line 142, scheduled by updateCooldown lines 141-153). Defect: the progress is incremental, so scheduler jitter adds up and the ring can finish late; no delta-time. Fix: compute the percent from the start timestamp and now. Keep the ring idea.
3. Cooldown collapse burst (data/particles/particles.otps). Technique: an emitter (line 25) with an attraction affector (line 33) makes an inward pull. Defect: the code that spawns the burst on cooldown end is commented out (cooldown.lua lines 124-126, "hack until onEffectEnd" at line 126), so the effect is defined but not played. Fix: re-enable it with a timer or an effect-end callback, and let a setting turn it off.
4. Death window (modules/game_playerdeath/playerdeath.lua). Technique: one plain window with two sentences, chosen by whether the penalty is 100 (lines 52-57); a short centre-screen "You are dead." message if the middle label is hidden (line 39). The meaning of the penalty number is set by the server; this file does not say. Keep: one plain window, a partial-penalty sentence, a short centre line. Change: respawn countdown instead of a close button; grey-out not flash; our own sentences.
5. Stance ring (modules/game_combatcontrols/combatcontrols.lua). Technique: three steps for the fight mode, a chase toggle, a safe-fight toggle sent to the engine on change (lines 204-229). Keep: three steps, chase toggle. Change: a ring selector around the fighter, a lock icon for chase, our own stance names, and a checkbox whose checked state means what its label says.
6. Font set for small HUD text: nine PNG sheets and six .otfont definitions (data/fonts; names and counts only, not opened). Technique: bitmap fonts for small text. Keep the idea; ship our own sheets.
7. Mount toggle (playermount.lua lines 29-43). Technique: one toggle that calls mount or dismount. Keep one-button mount; change: mount is a stance, not a menu.

Sound: one start-up sound file (data/sounds/startup.ogg, not opened). No combat sound module read, so no sound layering or stinger data here.

## 7. Inspiration for Frankendom

1. Target strip (hud-ui, parity row 14). Keep: type filters and a distance sort that re-sorts on move. Change: three slots, threat shapes, a party ring, no text list.
2. Cooldown ring that ends in a burst (vfx, parity row 10 hit impact or row 14 HUD). Keep: a ring that fills and then reads as ready. Change: fix the increment defect (use wall-clock time) and re-enable the burst with our own sound.
3. Penalty window (death and respawn, parity row 17). Keep: one plain window and a partial-penalty sentence. Change: respawn countdown, grey-out instead of a flash, our own wording.
4. Stance ring (fight modes, parity row 5 controls and row 3 guard). Keep: three fight steps plus chase. Change: ring selector, lock icon, checkbox semantics fixed (checked means the label's meaning).
5. Per-version map memory (hud-ui minimap, parity row 14). Keep: save on exit, load on start, a full-screen swap. Change: our file keys and a heading arrow.

## Not read or unverified

- Data half (spr/dat sprites and item data): absent by design.
- Server half: the TFS server is absent from this box; otland-forgottenserver is the paired donor, named only.
- Outfit, skills, spell list, containers, market, client_* modules: names and line counts only.
- PNG art, cursors, fonts, start-up sound: names and counts only; origins not stated.
- Locales other than en: counted by key lines, not read for text.
- Penalty meaning: not in the client file; the server decides.
- Cooldown ring defect and the commented-out burst: read in code; not run.
