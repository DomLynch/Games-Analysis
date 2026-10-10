# crossuo-crossuo (CrossUO, Ultima Online client): design catalogue (DC014)

Donor: `/mnt/frankendom-donors/crossuo-crossuo/` (read-only on the VPS). Source is `src/`, shared GL code in `src/GLEngine/`, shader source in `src/ShaderData.h`.
Half read: **client only**. The server half is not in this donor. Other halves named in the box (names only, not read): ModernUO (server), ClassicUO, xrip-uo-client, ZaneDubya-UltimaXNA.
Licence (as the files say): new files AGPL-3.0-or-later (`LICENSE`, README SPDX line); `LICENSE.old` says some files are still MIT (lines 1 and 3); many `src` files carry an MIT SPDX header (`src/QuestArrow.cpp` line 1); `resources/*` is AGPL per `.reuse/dep5`; `external/LICENSE.stb` offers MIT. Game data is not in the repo (read at run time from a UO folder).
Class: the game data (creatures, zones, gear art, sounds) is not in this box. Art and lore inspiration stays category-level. Mechanics are used as shape only.
Rule: recreate as a clearly distinct original, never a copy. Trait KEPT and trait CHANGED are named on each brief. Mood resemblance only, about 20-30 percent.

## Counts (verified this session)
| Item | Count | Note |
|---|---|---|
| Creatures | 0 | Not in the repo. UO creature data is read from the UO folder. |
| Classes | 0 | Professions are read from `prof.txt` in the UO folder (`src/Managers/ProfessionManager.cpp` 381). The only class-like table in code is the spell-school table below. |
| Weapons | 0 | Not in the repo. |
| Gear sets | 0 | Not in the repo. |
| Zones | 0 | Maps are UO data, not in the repo. |
| Spell rows (code table) | 183 | `s_Spells.push_back` rows in `src/Spells.cpp` (school tokens: magery, mastery, necromancy, mysticism, ninjitsu, bushido, chivalry). Not a class list; listed for reference. |
| Gumps (UI windows) | 54 | `src/Gumps/*.cpp` |

## 1. Creatures and beasts
None in the repo. No monster table, no bestiary, no creature sprites. Nothing to catalogue. Creature inspiration must come from the other UO halves (named above, not read here) or from our own design.

## 2. Classes, races and factions
- No race or class data in the repo. The profession loader reads `prof.txt` (a category tree: `src/Profession.cpp`, `CProfessionCategory` and `CProfession`). The file is in the UO folder, not in the box.
- Skill groups exist in the client (`src/SkillGroup.cpp`, `src/Gumps/GumpSkills.cpp`). Not read in depth.
- Spell schools: seven school tokens in `src/Spells.cpp` (magery, mastery, necromancy, mysticism, ninjitsu, bushido, chivalry), 183 table rows. Each row carries a school index and level, a short rune string, a target type and a reagent list. Names not copied.
- Factions and guilds: not read.

## 3. Weapons
None in the repo. The client draws whatever the UO data says.

## 4. Armour and gear
None in the repo. Paperdoll window exists (`src/Gumps/GumpPaperdoll.cpp`, not read in depth).

## 5. Zones and dungeons
None in the repo. Minimap and world map windows exist (`src/Gumps/GumpMinimap.cpp` 334 lines, `src/Gumps/GumpWorldMap.cpp` 871 lines), read by name and length only.

## 6. Item and effect looks worth recreating
Read in full, with receipts:
1. **Palette shader** (`src/ShaderData.h` 28-100). One fragment body serves colour, partial hue, text, land and spectral modes. The red channel of the sprite is read as a 32-entry palette index (`textureColor.r * 31.875`, line 56). Partial hue recolours only pixels that are pure grey (line 65). Spectral and shadow modes turn the sprite into a grey ramp with brightness of 1.5x, 0.5x or a fixed 0.6 (lines 76-87). Ref: `src/ShaderData.h`.
2. **See-through circle around the player** (`src/GLEngine/GLTextureCircleOfTransparency.cpp`). A circle sprite whose alpha falls off linearly with radius (line 27), radius capped at 200 (line 47). The draw pass writes alpha only (line 78) and sets a stencil marker so the rest of the frame can read it. The compositing pass that uses it was not read. Strong for the fight camera's occlusion problem (row 11).
3. **Quest pointer** (`src/QuestArrow.cpp` 29-66). A screen-space arrow with eight directional gump frames (line 31): the frame index is the bearing from player to goal. Its screen position is an iso projection with a step of 22 units (line 38), clamped to the game window edges. It flashes with the colorizer shader: once per cycle the flash runs for about 120 ms (line 61) and then re-arms one second ahead (line 63). Ref: `src/QuestArrow.cpp`.
4. **Weather layer** (`src/Weather.cpp` 41-124, `src/WeatherEffect.cpp` 10). Particle count is window area divided by 7500, plus a base count (line 51). Each particle takes a size ratio from its random id (`WeatherEffect.cpp` line 10). Wind re-rolls every 7 to 13 seconds (lines 113, 117) and cannot flip sign directly: it must pass through zero (line 124). Ref: `src/Weather.cpp`.
5. **Colorizer flash as a state cue** (`QuestArrow.cpp` 66). A recolour pass used as a short, periodic attention flash on a HUD element, not on the world. Ref: `src/QuestArrow.cpp`.
6. **Gump-per-feature HUD** (`src/Gumps/`, 54 files). Each feature is its own window: book, bulletin board and item, combat book, buff, custom house, minimap, world map, paperdoll, party manifest, resource tracker, journal, profile. Read by name only.

Top 5 striking:
1. **Halo Sight** (label: see-through halo). Keep: radial alpha falloff with a radius cap. Change: elliptical iso falloff, fade time for our fight camera. Ref: `GLTextureCircleOfTransparency.cpp` 27, 47, 78.
2. **Palette dye** (label: red-channel recolour). Keep: one shader, 32-entry palette from the red channel, grey-only hue. Change: our palette and our ghost look. Ref: `ShaderData.h` 56, 65.
3. **Chevron pointer with flash** (label: bearing pointer). Keep: eight bearing frames, clamped to HUD edges, a short periodic flash. Change: ribbon shape, our palette, HUD-edge anchor. Ref: `QuestArrow.cpp` 31, 38, 61, 63.
4. **Gusting weather** (label: drifting dust). Keep: particle count from area, random size per particle, wind re-roll on a 7 to 13 second timer, no instant sign flip. Change: pixel-cell particles, tint by region, wind per zone. Ref: `Weather.cpp` 51, 113, 124.
5. **Modular gump windows** (label: notice boards and tomes). Keep: each feature is a window that opens over the world. Change: our own window art, pinned cards, drag-to-pin. Ref: `src/Gumps/GumpBulletinBoard.cpp` (115 lines), `src/Gumps/GumpBook.cpp` (name only).

Idle and ambient motion: weather particles drift with wind; the quest pointer flashes. No creature idle animation is in the repo.
Death presentation: spectral and shadow shader modes exist (`ShaderData.h` 76-87). Which path uses them for death was not traced.
Readability at 375 wide: not read (mobile layout not searched).

## 7. Inspiration for Frankendom (originals, not copies)
1. **Halo Sight** (see-through halo at the hero). Keep: radial falloff, radius cap, alpha-only write. Change: elliptical iso falloff, our fade time, a mobile-width radius. Lane: camera, row 11.
2. **Bearing Pin** (a HUD pointer to the next objective). Keep: eight bearing frames, clamped to the HUD edge, a 120 ms colour flash on a 1-second rhythm. Change: our ribbon chevron, our palette, a hit-free flash rule. Lane: hud-ui.
3. **Palette Dye** (one shader, red channel into 32 entries, grey-only hue, spectral ramp). Keep: the mechanism. Change: our palette, our ghost colours. Lane: art and recolour (Hero Look, Armour).
4. **Gust Layer** (zone weather with wind re-roll that cannot flip sign). Keep: particle count from area, random size per particle, wind timer 7-13 s, pass through zero. Change: zone-specific wind, pixel-cell particles. Lane: zones and atmosphere.
5. **Bulletin Pin** (a notice-board window of posted notes). Keep: list plus post plus per-item window. Change: pinned cards, wood frame, drag-to-pin. Lane: hud-ui.

Dom's rule applied to each: clearly distinct original; KEEP and CHANGE named above.

## Not read / unverified
- The Wisp subsystem (`src/Wisp/`): by its file names a connection and packet layer, not a visual effect. Names only, not read.
- Most gump files (only names and line counts), the minimap and world-map logic, party code, walker and pathing, macros, the GLFrameBuffer post-process, and the compositing pass that uses the circle of transparency.
- Shader bodies for the land-lighting and font modes beyond the lines cited.
- Death presentation path (which code draws the spectral mode and when).
- Audio: none in the repo (the deps folder holds five demo WAV files of the SDL library, not game sound). Sound-music fold-in: nothing to read.
- Spawns and encounters: none in the repo.
- Progression and loot: none in the repo beyond the skill and spell tables.
- Client binary art (`resources/`): pixel contents not viewed.
