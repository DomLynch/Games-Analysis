# 2003scape-rsc-c: design catalogue (DC002)

Read from the VPS tree only (`/mnt/frankendom-donors/2003scape-rsc-c/`), over read-only ssh. Nothing copied, run or viewed as an image.

**Halves read:** the client half (C source in `src/`). The game data itself (names, creatures, items, zones) is inside binary archives in `cache/` (`*.jag`, `*.mem`), which were not decoded. So this donor gives mechanics and look techniques, not content names.
**Matching other half:** no 2003 server folder is in the donor list. Box name matches only, not verified: `Open-RSC-Core-Framework` (server-side name) and `Danjb1-rsc-remastered` (client-side name). Neither was read.

**Restricted.** No `_RESTRICTED-NOTE.txt` exists here, but the asset audit (AU001) shows the donor ships original game archives. Treated as restricted: category-level inspiration only, no instance-level looks.

Rule for every item below: recreate as a clearly distinct original, never a copy. Keep the trait named, change the trait named.

## Counts
| Category | Count | Note |
|---|---|---|
| Creatures | not counted | NPC names are inside `cache/entity*.jag` (binary) |
| Classes / races / factions | not counted | none readable in text |
| Weapons | not counted | item names inside archives |
| Gear sets | not counted | same |
| Zones | not counted | maps inside `cache/maps63.*` and `land63.*` (binary) |

No number is guessed.

## 1. Creatures and beasts
Not readable as names. What the client code does tell us, all in `src/game-data.h`:
- The NPC config struct (lines 42-61) holds a sprite set, width and height, two animation speeds, a separate combat width, combat stats, an attackable flag and four colour fields. The header comment on combat width reads "used for e.g. long animals like dragons" (line 51). So the client already models long bodies as a separate width: a useful note for a dragon-like silhouette.
- An attackable field sits in the same struct (lines 42-61); it is a flag, not a family tree.
- No families, tiers or escalation can be counted from this donor.

Top striking creatures: none listed. We cannot describe a creature from this donor without the archives, and the rules say not to open them.

## 2. Classes, races and factions
- Spell and prayer tables exist as struct types: `SpellConfig` (line 68) with a level, a type and up to a fixed number of rune slots; `PrayerConfig` (line 105) with a level and a drain. Names are in the archives, so no list.
- No character classes or races are visible in the code read.

## 3. Weapons
Not counted. The `ItemConfig` struct (`src/game-data.h` lines 77-88) shows the item fields: name, description, command, sprite, mask, base price, equipment slot, stackable, untradable, members. A tier is therefore a sprite and a price, not a shader. Tiers and special properties were not read.

## 4. Armour and gear
Not counted. Same struct. Gear tier, material and gold/crystal looks were not read.

## 5. Zones and dungeons
- No zone names from text. Map data is in `cache/maps63.jag` and `land63.jag`.
- The client has a dungeon mode through the plane index (see section 6). That is the only zone-type cue in the code.
- Fog-of-war and roof hiding are zone moods (see section 6).

## 6. Item and effect looks worth recreating
These are techniques, read from code. Each is a look we can rebuild with our own assets.
1. **Torchlit flicker on the lowest plane.** When the player is on plane index 3 and the flicker option is on, the scene light is reset each frame with a small random jitter on ambient and diffuse. Ref: `src/mudclient.c` lines 4718-4724; option default `src/options.c` line 90.
2. **Cycling frame swaps for fire, lightning and spell charge.** A global counter steps three, four and five state cycles. Each object whose id matches gets its numbered animation frame swapped in. Ref: `src/mudclient.c` lines 3548-3555 (counters), 4451-4476 (frame swap).
3. **Fog-of-war veil.** Fog distance comes from the camera clip range, pulled in with fog-of-war and pushed out without it. Ref: `src/mudclient.c` lines 2637, 4687-4701, 4731-4775; `src/options.c` line 91.
4. Draw-string shadow switched on and off around text draws (only the set/clear lines were read). Ref: `src/mudclient.c` lines 4893-4950. A cheap text-legibility tool.

## 7. Inspiration for Frankendom (originals, not copies)
1. **Torch Depths.** Underground floors get a light that breathes: a slow wobble on ambient, a faint warm shift on diffuse. Keep the per-floor override that jitters each frame on the lowest floor. Change: our own rhythm (a slow pulse, not random), tied to one torch or crystal.
2. **Veil of Mist.** Fog-of-war as a toggle that thins fog around the hero. Keep: a toggle that changes only fog distance, so it is cheap. Change: a round reveal around the hero, not a camera-plane fade; add a short fade on flip.

## Licence (as the files say)
Code: GNU AGPL v3 (`COPYING` line 1; `README.md` lines 352-365, "Copyright 2024 2003Scape Team"). Game data in `cache/` has no licence in the repo and is treated as proprietary. Derived atlases in `cache/textures/` and `gfx/` are treated as derived from those archives. Do not reuse or extract.

## Not read
- `cache/*.jag`, `cache/*.mem` (all game data, binary).
- GLSL shaders in `cache/` (`*.fs`, `*.vs`).
- `3ds/`, `wii/`, `switch/`, `web/`, `win/` PNGs and `3ds-cia.png`.
- `src/` files other than the ones cited above; `src/ui/`, `src/gl/`, `src/pica/`.
- The one `.wav` file.
- No receipts file was produced for this donor.
