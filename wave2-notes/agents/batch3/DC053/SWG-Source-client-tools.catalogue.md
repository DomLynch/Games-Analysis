# SWG-Source-client-tools (catalogue, cell DC053)

Donor: `/mnt/frankendom-donors/SWG-Source-client-tools/` (VPS, read-only). **RESTRICTED** per `_RESTRICTED-NOTE.txt` (leaked official SWG client source and tools, proprietary, no licence). Class **C** for source ideas. Class **D** for executables, installers and plugins (never run, never opened). Inspiration is category-level only. Every idea is to be recreated as a clearly distinct original, never a copy. Trait KEPT and trait CHANGED are named for each item.

Half read: **client half and tools** (`src/game/client/library/swgClientUserInterface/src/shared/page/` for radar and loot UI; `src/engine/client/application/` directory list for the editors; `publish/` manifest names and line counts; `tools/`, `deps/`, `plugin/` names only). The matching data half is **SWG-Source-dsrc** (catalogued in its own file: creature, class, weapon, gear and zone tables live there, not here).

## Counts
- This half holds no game data tables that I counted. Creature, class, weapon, gear and zone counts are in `SWG-Source-dsrc.catalogue.md`. Counts are reported as null here so they are not confused with that donor.
- Publish manifests (`publish/`, 48 files): asset list files by category. Line counts only (not reproduced): skeletal meshes about 5,739 lines, animation about 5,987 lines, static meshes about 483 KB, texture about 1,608 lines, music about 144 lines.

## 1. Creatures / beasts
- Not counted in this half. The creature actors and clips appear only as asset path lists in `publish/` (skeletal mesh and animation lists). Their contents were not opened.
- Top creatures: none from this half. Use `SWG-Source-dsrc.catalogue.md` for families and tiers.

## 2. Classes / races / factions
- Not counted in this half. The class and species tables are in the data half.

## 3. Weapons
- Not counted in this half. Weapon feel is handled by effect tools (see section 6): a swoosh-trail editor and a lightning-arc editor exist as source directories. Their files were not read.

## 4. Armour / gear
- Not counted in this half. Gear tiers are in the data half (`item/item_sets.tab`, armour folders).

## 5. Zones / dungeons / radar range
- Radar range: the ground radar reads its min and max range from a radar range table referenced by path (`datatables/radar/radar_range.iff`) in `SwgCuiGroundRadar.cpp` (function `loadRadarMinMaxRangeList`). The table itself is not in the data half: I searched `sku.0` in `SWG-Source-dsrc` for radar table names and found only `buff_data/radar_hue.tab` (9 rows, hue index and RGB columns; not reproduced). So the range table is referenced by this half but not present in the box.
- Zones: no zone or dungeon files here. The radar is the nearest match to a map.
- Minimap: no minimap file name found in the paths I searched. Treat as not found in this half.

## 6. Looks and UI worth recreating
Ground radar blips (file `SwgCuiGroundRadar_BlipPane.cpp`):
- One blip per role, each with its own image: standard, corpse, waypoint arrow, structure, group, ring, target bracket, entrance. Ref: `SwgCuiGroundRadar_BlipPane.cpp` lines 221 to 256 (constructor and visibility setup), 329 (`renderBlip`).
- Size logic, read from `renderToCanvas` (lines 168 to 200): blip width comes from the pixel-to-world ratio. Waypoints get a larger clamp range than other blips. Bracket and ring add a fixed pad so their overlay stays centred on the blip. Ref: line 177 (`if (isWaypoint)`), line 195 (size applied).
- Technique: role-coded glyphs plus a zoom-scaled size clamp. Readability at 375 wide is the main reason to keep it.

Group loot claim window (file `SwgCuiGroupLootLottery.cpp`, 499 lines):
- A timed claim window with three buttons (none, selection, all), a draining timer bar (width is the remaining fraction of the holster width, from `update`, starting at line 469), and an automatic default. When the window runs out, `update` sends the current selection to the server. Ref: line 473 (timeout test), line 471 (`m_lifeTimeSeconds += deltaTimeSecs;`, frame delta time).
- Closes when the container is gone (line 493) or after a send (line 445, `closeNextFrame();`).
- Defect (from reading the code; not run): the timeout test in `update` has no guard, so `sendSelectionToServer` can run again on the frame before the window closes. A duplicate selection message is possible. I did not find a sent flag in this file. Fix: add a one-shot sent flag checked before the send. The idea is kept.

Other UI and effects:
- Loot box UI: `SwgCuiLootBox.cpp` (141 lines). Name only; not read beyond the file size.
- Effect editors (source directories, files not read): `src/engine/client/application/ParticleEditor`, `SwooshEditor`, `LightningEditor`, `ClientEffectEditor`, `ShaderBuilder`, `SoundEditor`. Technique: separate authoring tools for each effect family.
- Sound: the sound-option page `SwgCuiOptSound.cpp` is the one file whose text mentions ambient settings (grep, not read in full). A grep for crossfade in `src/engine/client` returned only detail-appearance matches. No biome ambience bed or border-crossfade code was found in the paths searched. Sound-music ideas from this half are therefore limited to the editor layout.
- Death and respawn presentation, boss intro and finisher staging, touch UX, and max enemies per frame: not read in this half.

## 7. Inspiration for Frankendom
1. **Glyph radar** (original name). Idea: one glyph per role on the radar, with the waypoint as an arrow and the target as a bracket. Keep: role-coded glyphs and a size clamp that scales with zoom. Change: our glyph shapes, our colour logic, and our own overlay pads.
2. **Claim clock** (original name). Idea: a timed loot-claim window with a draining bar that auto-resolves to the default choice. Keep: the draining bar and the auto default. Change: add a one-shot sent flag (fix the duplicate send), make the window length zone data, and use our own layout.
3. **Trail bench** (original name). Idea: a separate tuning tool for weapon trails and arcs, so feel can be tuned without code. Keep: one authoring tool per effect family. Change: our trail shape, our fade, tied to hitstop (row 10).
4. **Zone-scaled blip clamp** (original name). Idea: blip size from the zoom ratio, clamped to a floor and a ceiling that differ by role, so waypoints stay readable at range. Keep: the clamp and the role-specific range. Change: our numbers and our role set.

## Licence
- `_RESTRICTED-NOTE.txt` says leaked official SWG (Sony Online/Disney) source, proprietary, no licence. The README says the repo contains the client source and tools, with no licence section.
- Class C for the source. Class D for executables and installers (not run, not opened). Clean-room: study the shape only; no code, constants or text copied. This is not a legal opinion.

## Not read
- All executables, installers and plugins in `tools/`, `deps/` (including the 67 MB and 18 MB installers) and `plugin/win32/`. Not run, not opened.
- `publish/client_data_tree_files.mft` (binary, 26 MB): only the header was read earlier by the audit. Not reproduced.
- Publish list contents (only line counts used).
- All `.ui` layout files and editor images (counted by the audit, not opened).
- Editor source files beyond their directory names (`SwooshEditor`, `LightningEditor`, `ParticleEditor`, `ClientEffectEditor`, `SoundEditor`).
- `SwgCuiLootBox.cpp` beyond its size; `SwgCuiGroundRadar.cpp` beyond the range-table loader and the zoom angle declarations.
