# djhenry-eqoxide catalogue (DC019, Haiku design-catalogue pass)

Donor: `/mnt/frankendom-donors/djhenry-eqoxide/` (eqoxide, a Rust client for an EverQuest-emulator server, with a wgpu renderer). Read over ssh, read-only. Asset audit used: `AU016/djhenry-eqoxide.assets.md`.

Licence (what the files say): no LICENSE, COPYING or NOTICE file, and no licence field in Cargo.toml. Code is unlicensed, so it is shape only: no code is adapted. The art is EverQuest client data from the user's own install (`README.md:15` says the client targets an emulator server only). The rights holder is not named in the repo, so treat all art as proprietary (class C). Nothing from the art is reproduced here.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED. Inspiration is for mood (about 20 to 30 percent resemblance), not for stats, names or art.

HALF READ: CLIENT half only (`crates/eqoxide-core`, `eqoxide-assets`, `eqoxide-renderer`, `eqoxide-zone-geometry`, README, and docs). The SERVER half is not read. The paired server, EQEmu, is in the box at `/mnt/frankendom-donors/EQEmu` and was named, not read. The asset server (`eqoxide_asset_server`, README:5) is NOT in the box. The DATA half (EverQuest .s3d archives and derived GLB models) is NOT in the box. The repo has no creature stat table, no item database and no zone-type table. Creature, weapon and gear tiers therefore cannot be catalogued from this box. This catalogue says so for each section instead of inventing tiers.

Counts (each is verified in the file named):
- creatures: 154 NPC race ids (13 to 468) mapped to 19 archetype model families in `crates/eqoxide-core/src/race_class.rs` (lines 42 to 207). No stats are in the box.
- classes: 16 (`class_name`, `race_class.rs:15-21`).
- weapons: 0 families in the box. Weapons are separate per-item models (`gpu.rs:49`), but the item list is not here.
- gear_sets: 0 in the box. The client has 9 equipment slots (see section 4).
- zones: 18 zone short names found in the repo by a search of 18 names (each with at least one mention). This is not an exhaustive census.
- Race codes: 16 playable codes (12 playable plus 4 extras, `race_class.rs:43-45`). README:38 says "All 15 playable races". The table and the README disagree by one. Flagged.

## 1. Creatures and beasts

No creature stat or behaviour data is in the box. The client maps each NPC race id to one of 19 archetype model families (`race_class.rs:46` says "best-fit to an available archetype model"). The mapping is the only creature content in the client. Entry counts by family (ids 13 to 468; 3 of the 157 entries are playable extras, so 154 NPC ids):
HUM 63, SPI 13, SNA 13, GNL 10, WOL 9, SKE 7, FIS 6, FRG 5, BRD 5, ZOM 4, RAT 4, ELF 4, BEA 4, WSP 3, IKS 2, DWF 2, WRM 1, VAH 1, BAT 1. An unknown id falls back to HUM (`race_class.rs:207`, "default to humanoid").

Families (own labels):
- Serpent family (SNA, 13): snakes, drakes and dragon-class NPCs share one model (`race_class.rs:55` and `:85`).
- Floater and crawler family (SPI, 13): spiders, floating eyes, blobs and a mimic share one model.
- Pack humanoid family (GNL, 10): goblins, kobolds, orcs and similar.
- Quadruped family (WOL, 9): wolves, big cats and similar.
- Undead (SKE 7, ZOM 4): skeleton and zombie archetypes.
- Flyers (BRD, 5): flying NPCs share one bird model.
- Large slow family (BEA, 4): bear-like and mammoth-like NPCs.
- Catch-all humanoid (HUM, 63): the default for any unmapped id.

Behaviour in the client (README feature table): smooth NPC movement by velocity dead-reckoning from unreliable position updates (README:43). Pets track, auto-fight and recall (README:57). Auto-attack and facing (README, combat rows).

Top 8 (own labels; these are families, since no individual creature is in the box):
1. **Serpent Drake family**. Why: one model covers snakes and dragon-class NPCs (`race_class.rs:55, :85`). Reads cheaply at 375 wide. Keep: one silhouette stands for several threats. Change: our own dragon silhouette; no reuse of any model.
2. **Floater family**. Why: floating eyes, spiders and blobs share a model (`race_class.rs`, SPI block). Keep: one archetype for floating and crawling threats. Change: floaters get a glow pass and a different idle.
3. **Pack humanoid family**. Why: ten NPC ids share one model (GNL). Keep: a shared family for packs. Change: our own colours and armour trims.
4. **Quadruped family**. Why: nine ids share one fast-body model (WOL). Keep: a fast quadruped read. Change: our silhouettes, not reused.
5. **Undead family**. Why: skeleton and zombie archetypes (SKE 7, ZOM 4). Keep: two undead reads. Change: our undead carry a rune, not a bone-colour swap.
6. **Flyer family**. Why: flying NPCs share one bird model (BRD 5). Keep: flyers as one family. Change: our flyers ride a glide cycle.
7. **Large slow family**. Why: bear-like and mammoth-like NPCs share one large slow model (BEA 4). Keep: a large slow silhouette for heavies. Change: our heavies telegraph their hits.
8. **Best-fit fallback (catch-all humanoid)**. Why: any unmapped id still renders (`race_class.rs:207`). Keep: a fallback family so nothing is blank. Change: our fallback is a visible placeholder, flagged in debug.

## 2. Classes, races and factions

Classes (16, `race_class.rs:15-21`). Primary and secondary stat allocation from the design spec table (`docs/specs/2026-06-26-pregame-screens-design.md:452-459`). The spec says these were derived from a seed table and corrected once. The role mechanic beyond stats is server-side, not in the box, except where noted.
- Warrior: STA+25 or STR+7 and STA+18 (two allocation vectors).
- Cleric: WIS+25 and STA+5.
- Paladin: STA+20 (`spec:455`).
- Ranger: DEX+20.
- Shadow Knight: STA+20.
- Druid: WIS+25 and STA+5.
- Monk: AGI+20.
- Bard: CHA+25.
- Rogue: STR+25 and DEX+5.
- Shaman: WIS+25 and STA+5.
- Necromancer: INT+25 and STA+5.
- Wizard: INT+25 and STA+5.
- Magician: INT+25 and STA+5.
- Enchanter: CHA+25 and INT+5.
- Beastlord: even +5 across STA, AGI, DEX and WIS.
- Berserker: STR+25, or STR+10 and STA+15.
Signature mechanics in the client: spell casting with gems and a cast bar (README:55); scribe and memorize (README); pets with tracking and recall (README:57).

Races (16 codes, `race_class.rs:43-45`): HUM, BAR, ERU, ELF, HIE, DKE, HEF, DWF, TRL, OGR, HFL, GNM (playable), IKS, VAH, FRG, DRK (extras). Race size comes from the game height rule (`README:39`, `GetRaceGenderDefaultHeight`). Factions: not in the box.

Progression shape: one primary stat bonus per class, with a secondary, and spell and pet systems as the progression lanes. Level and XP tables are not in the box.

## 3. Weapons

No weapon families or tiers are in the box. What the client does have:
- Held weapon models: each held item is a separate model loaded from the equipment archive and drawn at a hand bone (`crates/eqoxide-renderer/src/gpu.rs:49`). Not baked into the body.
- Swing animation: verified on one race and model; NPC weapons and a generic hand joint are a follow-up (`README.md:41`).
- Special properties (elemental, set bonus): none in the box.

Top 5 striking: the box has only three real items here, so only three are listed.
1. **Hand-bone relic**: a separate held model drawn at a hand bone (`gpu.rs:49`). Keep: held item is its own model, not baked in. Change: a glowing hilt only at the top tier.
2. **Swing arc on the hand bone**: verified swing animation (`README.md:41`). Keep: the swing reads as a weapon at 375 wide. Change: a telegraphed arc with a sound cue.
3. **Pet pack**: pets track, auto-fight and recall (`README.md:57`). Keep: a pet that fights until its target dies. Change: pets back off on a timer, not on a kill event.

## 4. Armour and gear

Nine equipment slots. Each slot holds a material id (u32) and an RGB tint (`docs/equipment-textures-findings.md:100-101`; "9 slots × `u32` LE = material id per slot"). Tint is a multiplier on the texture (`docs/equipment-textures-findings.md:82`). Wire colour order is reversed on parse (`:101`). Runtime changes come from the WearChange packet, which updates material and tint per slot (`docs/equipment-textures-findings.md:105`; `docs/equipment_texture_plan.md:212-233`).

Armour is region-variant: material names encode region, material and variant (from AU016, `docs/equipment-textures-findings.md`, GLB primitive and material name sections; not re-read here). Helms, hair and head armour: not built (`README.md:46`, "Attached-model subsystem not built yet").

Material tiers (cloth to plate, mythic metals): not in the client. Tiers come from the item database on the server side, which is not in the box.

Top 5 striking:
1. **Per-slot tint multiplier** (`docs/equipment-textures-findings.md:82`). Keep: one texture serves many colours by tint. Change: a metal ramp per slot (warm bronze, gold-plate).
2. **Runtime WearChange swap** (`docs/equipment_texture_plan.md:212-233`). Keep: a worn piece changes at once when equipped. Change: a short shine sweep on the swap.
3. **Region-variant pieces** (AU016, not re-read). Keep: disjoint region pieces that cover the body without overlap. Change: our own shoulder and gauntlet silhouettes.
4. **Hair tint table with gating** (`crates/eqoxide-renderer/src/head.rs:16-19`, 24 entries; tint applies only to a subset of race and gender pairs, `head.rs:31-33`). Keep: a gated tint table. Change: our own palette and gating rule.
5. **Nine-slot kit** (`README.md`, equipment rows; `docs/equipment-textures-findings.md:100`). Keep: a fixed slot set so any kit fits the body. Change: our slot list and two extra jewel slots.

## 5. Zones and dungeons

Zone names found in the repo (short names, mention counts from a word search across `crates`, `src`, `docs`, `tests` and `README.md`): qcat 237, qeynos 131, neriakc 82, gfaydark 67, freportw 47, blackburrow 45, akanon 40, crushbone 34, everfrost 32, qeytoqrg 19, permafrost 11, tox 8, oasis 6, kedge 4, ecommons 2, crescent 2, paineel 1, freportn 1. No zone-type table is in the box, so the biome list is limited to what the code says about specific zones.

Mechanics tied to zone data:
- Moat with ladders: a moat whose wall is about 10 units, too high for the native step-up. Five ladder objects are placed around the ring (`crates/eqoxide-zone-geometry/src/climb.rs:6-9`).
- Water volumes: a sparse water-span grid, not a full 3D voxel grid, because a full voxel grid at everfrost scale would be about 10^9 nodes (`water_grid.rs:1-9` and the design note it cites). Slice 1 is additive only (`water_grid.rs:7`).
- Multi-level dungeons: floor selection works when the start z is stale (`docs/collision-system.md:91`; `docs/autonomous-play.md:213`).
- Outdoor vertical offset: some outdoor zones render terrain with a Z offset (README, rendering table; the example zone is qeytoqrg). A known defect, not a feature.
- Weather: server-driven precipitation field, see section 6.

Top 5 striking:
1. **Moat-ladder keep**: a wall too high to step, so an authored climb object is the only way up (`climb.rs:6-9`). Keep: authored climb anchors around a moat. Change: our anchors are breakable grapples in zone data.
2. **Water span grid**: sparse water nodes instead of a full voxel grid (`water_grid.rs:1-9`). Keep: sparse nodes for swimmers. Change: our node density is set per zone as data.
3. **Multi-level dungeon floor pick** (`docs/collision-system.md:91`). Keep: floor choice that survives a stale start height. Change: floors are named in zone data.
4. **Outdoor offset defect** (README rendering table). Keep: a warning on the zone where terrain is shifted. Change: our zones carry a ground-check test.
5. **Weather field** (section 6). Keep: precipitation that follows the camera. Change: our own sleet band.

## 6. Item and effect looks worth recreating

- Additive glow surfaces: a material flagged `eqAdditive` blends by pure addition, so black texels vanish (`crates/eqoxide-assets/src/lib.rs:22`, `:30`; pipelines `crates/eqoxide-renderer/src/pipeline.rs:114-118`). Good for torches, forges and magic.
- Animated material: a millisecond interval and a frame list read from `extras.eqAnim` (`lib.rs:37`, `:41`). Good for flicker and water.
- Foliage cutout: alpha test at 128 of 255 (`lib.rs:58`), and a corner-key fallback when a bake forgot to key out the background (`lib.rs:88`).
- Precipitation field: rain as thin streaks along the falling direction, snow as small camera-facing flakes that drift (`crates/eqoxide-renderer/src/shaders/weather.wgsl:63-68`). Camera-centred wrap so no edge shows (`weather.wgsl:43-49`). Cap 4000 particles at full intensity, floor 1200 for any active weather (`crates/eqoxide-core/src/weather.rs:56`, `:60`).
- Skinned humanoid re-grounding per clip: scale to a target height and re-ground from the current clip, not the bind pose (from AU016, `docs/character-models.md`, Normalization section; not re-read).
- Hair tint table gated to a subset of race and gender pairs (`crates/eqoxide-renderer/src/head.rs:16-19`, `:31-33`).

## 7. Inspiration for Frankendom

Each item is an original. Keep and change are named.

1. **Moat-Ladder Keep** (zone). A moat whose wall needs an authored climb object. Keep: authored climb anchors, a wall too high to step. Change: anchors are breakable grapples in zone data (zone rows).
2. **Lantern Hall** (look). Torches and braziers on an additive glow pass with a short frame list. Keep: additive pass plus frame list. Change: a cooler ember ramp and a three-frame cycle.
3. **Squall Field** (weather). A camera-centred precipitation field with a particle cap and a floor. Keep: camera wrap; rain and snow kinds. Change: add a sleet band; caps tuned to our frame budget.
4. **Best-Fit Roster** (creature families). Every unknown NPC id maps to a family, so nothing renders blank. Keep: family fallback. Change: our six families and a visible placeholder tag; no NPC names carried.
5. **Class Spine** (classes). One primary stat bonus (+20 or +25 in the spec table) and an optional secondary (+5). Keep: primary plus optional secondary pattern. Change: our four archetypes (Duelist, Guard, Caster, Beastcaller) with our own numbers.
6. **Relic Hilt** (weapon look). A held weapon as its own model at the hand bone, with a glowing hilt at top tier only. Keep: separate held model at the bone. Change: our hilt designs; glow reserved for the top tier.
7. **Tint-Slot Armour** (gear look). Nine slots, each with a material and an RGB tint, updated live on equip. Keep: slot plus tint scheme. Change: our metal ramps (bronze, gold-plate) and region pieces with our silhouettes.

Licence note: no licence on the code, so shape only. The art is proprietary client data; no art is copied or reproduced here.

Not read: the server half (EQEmu, in the box at `/mnt/frankendom-donors/EQEmu`, named only); the asset server (not in the box); the EverQuest art and derived models (not in the box); `crates/eqoxide-net`, `eqoxide-protocol`, `eqoxide-ui`, `eqoxide-nav`, `eqoxide-http` (not read beyond name); most of `eqoxide-renderer` and the wgsl shaders apart from the first lines of `weather.wgsl`; `mock_eq_server.py` (names only); `src/`; `tests/`; `tools/`; `docs/` apart from the cited lines; `LanternEQ-*` and `eq-p99-tools-eq-client` in the box (extractor and client-data tools, not read and not used).
