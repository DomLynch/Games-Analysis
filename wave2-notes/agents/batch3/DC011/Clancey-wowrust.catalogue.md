# Clancey-wowrust (catalogue, DC011)

Donor/Licence: /mnt/frankendom-donors/Clancey-wowrust/. No code licence stated; README.md:156 says "Private project. Not for distribution." No LICENSE file; Cargo.toml has no licence line. Asset audit AU009 class D (no usable non-code content). Inspiration stays category-level. Recreate as a clearly distinct original, never a copy.

Half read: client only (Rust crates: wow-formats, wow-world, wow-render, wow-client). This donor has no server half. The paired server half in the box is azerothcore-azerothcore-wotlk (named only; not read by DC011). Data pack (user-supplied MPQ, 18 archives per AU009) is not in the repo.

Data first: the repo holds no data tables. No DBC/CSV/JSON/SQL records, no string table or locale file. The DBC binaries are user-supplied; what is in the repo is the loader code and record structs (crates/wow-formats/src/dbc.rs). Config files (config/default.toml, config/keybinds.toml) were not read.

Counts (records present in the repo): creatures 0, classes 0, weapons 0, gear_sets 0, zones 0. Named race ids: 10 (8 with a model path).

## 1. Creatures / beasts
- None in the repo. No creature families, tiers, bosses or elite patterns are defined.
- Loader shapes only: CreatureDisplayInfoEntry (crates/wow-formats/src/dbc.rs:133) and CreatureModelDataEntry (dbc.rs:152), with lookups get_creature_model_path, get_creature_scale, get_creature_display_info (dbc.rs:811-830).
- Entity kinds in the world model: Player, Npc, GameObject, Item (crates/wow-world/src/entity.rs:17).
- Top 8: none. Nothing here meets the striking test (readable silhouette, signature behaviour, signature sound), because the repo has no creature content.

## 2. Classes / races / factions
- Classes: none. No class table in the repo. Only a test sets player_class = 1 with a "Warrior" comment (crates/wow-client/src/bin/test_entity_rendering.rs:61; not a table).
- Races (name plus model, not classes): test_login.rs:430-446 names 10 ids: Human 1, Orc 2, Dwarf 3, Night Elf 4, Undead 5, Tauren 6, Gnome 7, Troll 8, Blood Elf 10, Draenei 11.
- The model loader maps ids 1-8 only (crates/wow-formats/src/m2.rs:472-487). Ids 10 and 11 fall into the error arm (m2.rs:488), so Blood Elf and Draenei have names but no model path here. This is a gap, not a design.
- Role, signature mechanic, progression: none (no class or race mechanics in code).
- Factions: none.

## 3. Weapons
- None. No weapon records or weapon families in the repo.

## 4. Armour / gear
- No gear sets, no material tiers, no item records. ItemDisplayInfoEntry exists as a struct (crates/wow-formats/src/dbc.rs:181) with no data.
- Top 5: none meet the test.

## 5. Zones / dungeons
- No biome list, no map or area records, no dungeon archetypes in the repo.
- Sky is driven by lookup records, not by data in the repo: LightEntry with 8 param ids (dbc.rs:81-89), LightParamsEntry (dbc.rs:92), colour and float bands (dbc.rs:106-122), find_light by map and position (dbc.rs:378), get_sky_colors by time of day (dbc.rs:398).
- Water: transparent pass that does not write depth (crates/wow-render/src/water.rs:150). No hazard types beyond water in code.
- Top 5 striking (on the loaders alone, not on content): (1) per-time sky colour from bands; (2) transparent water that sits behind terrain by depth test only; (3) light lookup by map id and position (find_light, dbc.rs:378); (4) trail or ribbon motion (see section 6); (5) text and UI on one small shader pair (text.wgsl, ui.wgsl; shaders not read, names from the file listing).

## 6. Item and effect looks worth recreating
- Ribbon trail: TrailSegment carries position, age and max age (crates/wow-render/src/ribbon.rs:48-53). The vertex carries RGBA with alpha fade (ribbon.rs:7-13). Technique: additive ribbon with an age-based tail fade.
- Particle blend: Alpha or Additive, with additive described for fire and sparks (crates/wow-render/src/particle.rs:55-60).
- Sky bands: LightColorBand has 16 time slots and packed colours (crates/wow-formats/src/dbc.rs:106-110); SkyColors holds sky top, middle, horizon and fog (dbc.rs:124-130). Technique: band lookup by time, fog from the horizon band.
- Transparent water: depth write off, depth test on, so water sits behind terrain (crates/wow-render/src/water.rs:145-151).
- Audit-only (AU009, not re-read here): hand-painted blend masks and four-layer ground (PLAN.md line 139); system addon protected group (crates/wow-ui/src/lib.rs line 551).

## 7. Inspiration for Frankendom (5 originals, 3 from code, 2 from the audit only)
1. Dusk Band Sky (row 16 colour grade and quality). Idea: one colour band per time of day sets a zone's mood; fog takes the horizon colour so the seam disappears. Keep: time-indexed bands, horizon-matched fog, a sun disc from the clock. Change: our own band count and palette per biome; our own moon; painted clouds. Ref: crates/wow-formats/src/dbc.rs:398 and :124-130.
2. Swing Ribbon (rows 10 and 13, hit impact and specials). Idea: an additive ribbon shows the arc of a swing or spell. Keep: additive blend, a fading age tail. Change: jagged edge; tail length set per ability; our colour ramp. Ref: crates/wow-render/src/ribbon.rs:48-53.
3. Behind-Terrain Water Pass (row 16). Idea: transparent water writes no depth but still tests depth, so it draws behind terrain without sorting artefacts. Keep: the depth write-off and test-on rule. Change: our hue and wave normals. Ref: crates/wow-render/src/water.rs:145-151.
4. Protected Core HUD Set (row 14 HUD; audit-only, not re-read). Idea: a fixed core set of panels that addons cannot remove. Keep: the protected group. Change: our panel set and our layout file format. Ref: AU009 cites crates/wow-ui/src/lib.rs line 551.
5. Painted Ground Blend (no parity row; audit-only, not re-read). Idea: four ground layers blended by hand-painted masks, read as ground not tiles. Keep: mask per chunk, five LOD steps. Change: our materials; our masks; noise on blend edges. Ref: AU009 cites PLAN.md line 139.

Licence note: Private project. Not for distribution (README.md:156). No LICENSE. Code and content unclear; treat as clean-room, shape only.

## Not read
- crates/wow-ui/src/lib.rs, PLAN.md, IMPLEMENTATION_PLAN.md, README_DBC_SKY.md (beyond AU009 quotes), all shaders beyond the file names, crates/wow-app, crates/wow-assets, wow-audio, wow-lua (only the item quality line 650 in wow-app was seen in grep, not read), config/*.toml, scripts/*.sh, Cargo.lock.
- Not checked: whether Blood Elf and Draenei models load from any other path.

Brief rule served: each original above is a distinct recreation with the KEPT and CHANGED traits named; no exact art values or copied lore are used.
