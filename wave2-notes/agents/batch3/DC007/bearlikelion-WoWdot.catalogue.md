# bearlikelion-WoWdot: design catalogue (DC007, batch3)

Donor path (VPS, read-only): /mnt/frankendom-donors/bearlikelion-WoWdot
Asset audit used first: /private/tmp/p2/wave2-haiku/batch3/AU005/bearlikelion-WoWdot.assets.md (class C overall; logo A with CC BY 4.0 attribution; Blizzard-derived layouts, sounds, icons and screenshots C or OPEN).

## Which half was read
- **Client half (read):** Godot 4 project code under `shared/game/` and `shared/game/world/` (GDScript), `*.gdshader` files, `clients/*/data/*/*.json` (layout and name tables), `clients/wowgd/ui/*.gdshader`, `liquid_*.tres` materials.
- **Server half (not in this repo):** WoWdot ships no server. The matching server half in this batch is the azerothcore donor, read as its data half in `azerothcore-azerothcore-wotlk.catalogue.md`.
- **Art, models, audio, fonts, maps:** none in the repo (audit AU005). They load from the player's own client archives at run time, so the look data is referenced by code, not shipped.

Restricted-note check: no `_RESTRICTED-NOTE.txt` at the donor root.

## Counts
| Category | Count | Note |
|---|---|---|
| Creatures (rows) | 0 | creature list is not in the repo; creature_models.gd builds creatures from DBC display rows that are not shipped |
| Classes | 0 | no class enum found (grep for `enum Class` returned nothing) |
| Races | 0 named | race ids are used as numbers (area_info.gd line 6 lists faction race ids) |
| Weapons | 0 rows | weapon families are in code (item_models.gd), not data |
| Gear sets | 0 | none |
| Zones | 0 rows | area names are not shipped; liquid and weather types are listed below |

The layouts file `clients/wowgd/data/classic/dbc_layouts.json` describes column indexes only (for example AreaTable, AreaPOI, ChatChannels); it holds no rows.

## 1. Creatures and beasts (client half)
- Creature appearance is built from display rows: `creature_models.gd` line 51 (`instantiate`) looks up a display row, then a model row, and reads an "extra" row (race, gender, skin, face, hair style, hair colour, facial hair, bake name, equipment). When no look is given, it reuses the player-character pipeline.
- Creature skin layers: `creature_models.gd` line 4 (`TextureSlot`: MONSTER_SKIN_1 = 11, MONSTER_SKIN_2 = 12, MONSTER_SKIN_3 = 13) and line 8 (`SKIN_COLUMNS`). Three texture slots per creature let one monster body change its look by slot.
- Families, tiers and boss patterns: not in the repo. Mark not read.

## 2. Classes, races and factions
- Equipment slots: `character_models.gd` line 6 (`EquipSlot`: head, shoulder, shirt, chest, waist, legs, feet, wrist, hands, tabard, and more).
- Character sections: line 4 (`Section`: skin, face, facial hair, hair, underwear); options line 5 (`Option`).
- Barbershop style types: `barbershop.gd` line 10 (`StyleType`: hair, facial hair, skin).
- Faction split by race id: `area_info.gd` line 4 (`FactionGroup`) and line 6 (`HORDE_RACES`).
- No class list and no race names in the repo. Progression: none.

## 3. Weapons (code-defined families)
- `item_models.gd` line 4 (`Slot`: head, shoulders, main hand, off hand, ranged).
- Attachment points: line 6 (`Attachment`).
- Sheath states: line 12 (`Sheath`: none, two-handed, staff, one-handed, shield) and line 14 (`SheathState`: unarmed, melee, ranged).
- Weapon subclasses that change carry position: line 15 (`WeaponSubclass`: bow, gun, thrown, crossbow, wand); `BACK_RANGED` at line 32.
- Sheath points: `SHEATH_POINTS` line 25.
- Ammo model folder and weapon model folder constants: lines 20 to 21.
- Tiers and visual variety per weapon: not in repo. Mark not read.

### Top 5 striking weapon ideas (from the code, not from the data)
1. **Back-carried ranged family.** Bow, gun, thrown, crossbow and wand all sit on the back when unarmed (`item_models.gd` line 32). Why: a readable silhouette rule. Keep: ranged on back, melee on hip. Change: our own carry points and idle pose.
2. **Sheath state as a three-state rule.** Unarmed, melee and ranged (line 14). Why: small state machine, readable at 375 wide. Keep: three states. Change: add a shield state that changes the idle stance.
3. **Trail as a weapon signature.** `ribbon_trail.gd` lines 5 to 14: additive trail, 30 edges per second, lifetime 0.5 seconds, tint. Why: a cheap swoosh that reads at phone size. Keep: short additive trail. Change: trail shape and tint per weapon family.
4. **Sheath socket table.** `item_models.gd` line 25 (`SHEATH_POINTS`) gives a per-sheath socket position, used for unarmed and ranged states (line 160). Why: weapons sit on the body without per-model tuning. Keep: one socket table per sheath type. Change: our own socket coordinates.
5. **Shield state with its own stance.** Derived from line 12 (shield sheath). Keep: shield as its own stance. Change: stance and colour.

## 4. Armour and gear (look technique)
- **Armour painted into one skin atlas.** `character_models.gd` `_paint_equipment` (line 341): for each equipment slot in draw order (`ITEM_DRAW_ORDER`, line 53), the code blends each armour texture region into a shared skin image (size set by `SKIN_ATLAS_SIZE`, line 10). Components are per gender (suffix `_M`, `_F`, or shared `_U`, comment near line 360).
- **Helmet and cloak hides.** `PLAYER_FLAG_HIDE_HELM` (0x400, line 36), `PLAYER_FLAG_HIDE_CLOAK` (0x800, line 37), and `HELMET_HIDES` (line 70) hide parts under helmets.
- **Shoulders and weapons attach as models**, not as texture (`_attach_items`, line 328).
- Material tiers (cloth to plate, mythic metals) and metallic, gold or glow looks: not in the repo. Mark not read.

### Top 5 striking gear looks (technique, not data)
1. **Armour as paint on a shared skin.** Line 341. Why: one draw call per body and no extra meshes for cloth and leather tiers. Keep: texture-region painting. Change: our own atlas layout and a glow channel.
2. **Helmet hide flags.** Lines 36 to 37 and 70. Why: a clean rule for helm visibility. Keep: per-slot hide flags. Change: different hide rules for our silhouettes.
3. **Shoulder and weapon as attached models.** Line 328 onward. Why: separate meshes for tier glow. Keep: attach-model for shoulders. Change: tier glow on the attached piece.
4. **Death tint as a world condition.** `world_light.gd` line 26 lists `DEATH` alongside CLEAR, UNDERWATER, STORM and STORM_UNDERWATER. Why: a single condition drives a readable tint. Keep: condition enum with a death state. Change: our palette.
5. **Unit portrait mask.** `clients/wowgd/ui/portrait.gdshader` (6 lines): a round mask on the portrait texture via smoothstep (no colour codes). Why: one shader for a readable frame. Keep: round mask. Change: frame shape.

## 5. Zones, dungeons and hazards
- **Liquids (4 materials):** `shared/game/world/liquid_magma.tres` (unshaded, warm orange albedo), `liquid_ocean.tres`, `liquid_slime.tres`, `liquid_water.tres`. These are the liquid look types a zone can use.
- **Weather (3 particle kinds):** `world_weather.gd` lines 4 to 12: rain and snow textures, snow gravity (downward, light), sand gravity (strong sideways drift). `world_weather.tscn` holds the scene.
- **World conditions:** `world_light.gd` line 26 (`Condition`: clear, underwater, storm, storm underwater, death). Storm and underwater change fog and cloud parameters through the light bands (`ColorBand`, line 5; `FloatBand`, line 24).
- **Instance modes:** `instance_difficulty.gd` line 8 (`InstanceType`: none, party, raid, PvP, arena), `DUNGEON_MODES` = 2 (line 10), `RAID_MODES` = 4 (line 11).
- **Zone names and biomes:** not in repo (area names from DBC, not shipped).

### Top 5 striking zone and effect ideas (from code)
1. **Sand storm with sideways gravity.** `world_weather.gd` (sand gravity line 12). Why: a clear hazard read. Keep: sideways particle drift. Change: sand colour and warning shimmer.
2. **Underwater as a world condition.** `world_light.gd` line 26. Why: one state switches fog and tint. Keep: underwater state. Change: our fog and palette.
3. **Death as a world condition.** Same enum (line 26). Why: a clear state for a dead player. Keep: death tint. Change: no desaturation copy, our own grade.
4. **Magma liquid as one material.** `liquid_magma.tres`. Why: unshaded material reads as hot at a glance. Keep: unshaded hot liquid. Change: add crack glow.
5. **Slime liquid as a hazard material.** `liquid_slime.tres`. Why: a separate liquid type gives a separate hazard read. Keep: one liquid, one hazard. Change: our colour and bubble effect.

## 6. Item and effect looks worth recreating (with file references)
- **Water shader:** `shared/game/world/water.gdshader` lines 2 and 10 to 20: unshaded, no depth draw, ripple texture array with frame count, shallow and deep colour uniforms, alpha range, depth-texture fade (lines 19 to 20). Technique: ripple array plus depth-based shallow to deep blend.
- **Sky shader:** `shared/game/world/sky.gdshader` lines 4 to 22: five sky band colours plus fog, disc and halo sizes, cloud noise with wind, glow, storm and density uniforms. Technique: banded sky gradient with a cloud noise layer and a storm parameter.
- **Terrain shader:** `shared/game/world/terrain.gdshader` lines 2 to 8: layered texture array per chunk, a chunk layer map and alpha maps (splat blending). Technique: per-chunk texture layers blended by alpha.
- **Aura colour by dispel type:** `shared/game/world/unit_auras.gd` line 4 (`DispelType`: none, magic, curse, disease, poison), 48 slots (line 6), harmful auras from slot 32 (line 7), colours per type (line 9). Technique: colour-coded debuff slots, not copied.
- **Weapon trail:** `shared/game/world/ribbon_trail.gd` lines 5 to 14 (additive blend, edges per second, lifetime, tint). Technique: additive ribbon trail.
- **Spell visual kits:** `shared/game/world/spell_visuals.gd` line 5 (`Kit`: precast, cast, impact), missile speed (line 82), effects per kit (line 48), shake group (line 92). Technique: data-driven visual kits per spell.
- **Portrait mask:** `clients/wowgd/ui/portrait.gdshader` (round mask).
- Minimap and colour-wheel shaders (`clients/wowgd/ui/minimap.gdshader`, `color_wheel.gdshader`, `color_value.gdshader`): not read in detail.

## 7. Inspiration for Frankendom (originals; never a copy, 20 to 30 percent mood resemblance)
Dom's rule for every item: recreate as a clearly distinct original, never a copy. Class C donor: category-level only, no instance-level looks.

1. **Dune-storm zone.** A desert zone whose sand storm drifts sideways and lowers visibility. Keep: sideways sand drift and a storm state. Change: palette, shimmer warning and our own weather odds.
2. **Tidal basin.** A water zone that switches to an underwater state when the player dips below the surface. Keep: one world-condition enum drives fog and tint. Change: our underwater palette; no copied grade.
3. **Ember channel.** A magma liquid used as a hazard channel with crack glow lines. Keep: unshaded hot liquid. Change: crack glow and a pulse.
4. **Three-state stance.** Unarmed, melee and ranged, with a shield stance added. Keep: three states readable at 375 wide. Change: shield stance and our own idle poses.
5. **Armour-as-paint.** Armour is painted into one skin atlas, with a glow channel for tier. Keep: texture-region painting. Change: our atlas layout and glow tiers.
6. **Trail by weapon family.** Short additive ribbon trails whose shape and tint depend on the weapon family. Keep: short additive trail. Change: trail shape and tint per family.
7. **Colour-coded debuff slots.** Harmful auras shown in a block of slots coloured by type. Keep: slot block and type colours. Change: our slot layout and iconography.
8. **Round portrait mask.** A frame with a round mask on the unit portrait. Keep: round mask. Change: frame shape and ornament.

## Licence note
Code: MIT (LICENSE line 3: copyright 2026 Mark Arneman and WoWdot contributors). Vendored third-party code keeps its own licence per NOTICE.md (WoWee MIT, godot-cpp MIT, StormLib MIT and public domain, zlib, bzip2, GLM MIT, nlohmann/json MIT, GDDocs MIT). Logo: CC BY 4.0 (Andrea Calabro), per NOTICE.md line 19. WoWee original music is reserved (NOTICE.md lines 21 to 22). Blizzard-derived layouts, sound names, icons and screenshots are marked OPEN in docs/legal-and-provenance.md (per AU005). Not legal advice.

## Not read
- Contents of the 285 `.tscn` scenes under clients (8 named only, per AU005); frames.json and ui_sounds.json contents (sizes and paths only); screenshot JPGs (names only); icon PNGs (names only).
- Translation CSVs beyond the header (59,015 keys each, per AU005).
- `extension/api/extension_api.json` (6.9 MB) and the WoWee C++ and gdshader files under `extension/`.
- `world_sky.gd`, `world_weather.gd` (only the constants were read), `character_models.gd` beyond the lines cited, `creature_models.gd` beyond line 70.
- Minimap, colour-wheel and colour-value shaders.
- The 11 `.tres` and remaining `.gdshader` files in `shared/game/world`.
