# OpenRA-OpenRA (asset audit, class C, cell AU039)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA
Code licence: GPL v3 (COPYING:1; README.md:54). Copyright line: "Copyright (c) OpenRA Developers and Contributors" (README.md:52).
Asset licence: none stated in the repo. INSTALL.md:1 says several files are needed from the original game disks. INSTALL.md:2 says a minimal asset pack can be downloaded and installed by the game. The map files of the Westwood-era content name "Author: Westwood Studios" (ts/maps/drawbrid/map.yaml:7; cnc/maps/gdi04c/map.yaml:7). No licence line for that content in the repo.
Rights-holder status: mixed, as the files say. Engine and rules code: OpenRA Developers and Contributors (README.md:52). Game content: Westwood Studios is named as author in the map files. Unknown beyond that. No _RESTRICTED-NOTE.txt in the donor.
Half read: the code half (OpenRA.Game, OpenRA.Mods.Common, cited lines only) and the data half (mods/*/rules YAML, palettes, fluent grammar, one tileset line). The binary asset packs (.shp, .aud, .oramap, tile sets, .bin) are present in the mods but were listed by extension and not opened. The -content folders are installers only; their packages are not in the box.

## Inventory (by extension, mods/ tree; 2519 files total)
| Group | Count | Class | Note |
|---|---|---|---|
| YAML rules and maps (data half) | 724 | B | Repo GPL; vehicles.yaml 933 lines, 20 top-level units with Inherits. |
| Fluent strings (.ftl) | 174 files | B | About 769 key = value lines in RA alone. |
| Lua scripts | 234 | B | Mission and mod logic. Names only. |
| Sprite sheets (.shp) | 213 | C | Westwood-era art by extension. Not opened. |
| Audio (.aud, .WAV) | about 50 | C | Not opened. |
| Tile sets (.tem, .sno, .des, .int, .win) | 311 | C | Not opened. |
| Maps (.oramap) | 189 plus plain map.yaml | C | Author lines name Westwood Studios. |
| Other binaries (.bin, .r16, .pal) | about 190 | C | Palette rules read; palette files not opened. |
| UI art (.png, chrome) | 383 | C | Not opened; credits files have no licence line. |
| Fonts (.ttf) | 4 | C | No licence file in the box for these. |
| Installer metadata (YAML) | about 9 | A | Package names and mirror URLs. No packages present. |

## Data first
- Unit and building rules are YAML (mods/ra/rules/, 21 files). Units inherit from base templates: the first vehicle definition inherits from a base (vehicles.yaml:2).
- Palettes are rules too: mods/ra/rules/palettes.yaml lists each palette source, shadow indices and the remap range (lines 2-70).
- Strings are Fluent: keys such as actor-<id>-name (mods/ra/fluent/rules.ftl:95). Values not quoted.

## Inspiration (category level; no instance looks)
- Team colour: 16 reserved palette indices (80 to 95) remapped from one chosen colour (palettes.yaml:47; PlayerColorRemap.cs:18-38).
- Remap done in linear colour space, hue and value taken once from the chosen colour (PlayerColorRemap.cs:29-38).
- Fog of war with three source states: passive visibility, shroud, visible (Shroud.cs:74). Separate shroud and fog palettes and a fallback fog index (ShroudRenderer.cs:35, :57).
- Flat shadow as two fixed palette indices (ShadowIndex 3, 4) on terrain palettes (palettes.yaml:6, :16).
- One palette per biome with shared shadow and remap indices: snow (:2), temperate (:12), desert (:17), interior (:7). Zone palette swap.
- Unit definitions by inheritance: base templates plus small overrides (vehicles.yaml:2). Catalogue pattern for row 21.
- Colour picker that uses the same remap indices, so the player sees the colour on a sample (ColorPickerPalette.cs:44; palettes.yaml:44-47).
- Localisation keys per actor id in Fluent files (rules.ftl:95). Stable ids in code, text in files.

## Inspiration briefs
1. **Team-colour trim on a grey-clad soldier.** Keep: a reserved 16-step range for team colour; one chosen colour per player; remap done once in linear space. Change: our own ramp and shade steps; trim on armour and belts only; our own glow ring. Ref: mods/ra/rules/palettes.yaml:47; OpenRA.Game/Graphics/PlayerColorRemap.cs:18-38.
2. **Remembered fog over explored ground.** Keep: three source states; separate shroud and fog palettes; a fallback fog index for tiles without fully fogged art. Change: our own fog ramp and mist texture; soft edge in our style; faint outline on explored roads. Ref: OpenRA.Game/Traits/Player/Shroud.cs:74; OpenRA.Mods.Common/Traits/World/ShroudRenderer.cs:35, :57.
3. **Desert palette swap for a zone.** Keep: one palette per biome; shared shadow and remap indices; swap by zone data. Change: our own biome colours and sky tint; fewer, bolder palette steps; heat shimmer instead of a sand texture. Ref: mods/ra/rules/palettes.yaml:17 and :6.

Recreate every idea as a clearly distinct original. Never copy the donor's look. Class C content: category level only.

## Cross-link
- Zones: per-biome palette (palettes.yaml) and tileset rules (tilesets/*.yaml) are the zone data pattern.
- Spawns and encounters: mission Lua scripts (234 files) exist but were not read.
- HUD and fog: the shroud and fog pair is the fog-of-war reference for hud-ui and vfx.
- Sound: audio packs present by extension, not opened.
- Loot, camera, death presentation: not read for this audit.

## Not read or not in box
See the not_read list in OpenRA-OpenRA.assets.json. Main gaps: binary asset packs (not opened), Lua mission logic, UI art, installer packages (not in box).
