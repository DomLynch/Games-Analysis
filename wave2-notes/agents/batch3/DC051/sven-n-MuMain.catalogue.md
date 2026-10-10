# sven-n-MuMain (design catalogue, DC051)

Donor: `/mnt/frankendom-donors/sven-n-MuMain` (VPS, read only). A community client fork of an MU Online-style game.

**Restricted donor.** `_RESTRICTED-NOTE.txt` line 1: "leaked Webzen MU Online client source (community-maintained), no licence. Study shape/idea only; never copy code, constants or text." Per the catalogue rules this stays at category level: no creature, class, zone or NPC names, no constants, no exact art looks. Labels below are ours.

Which half: I read the **client** half partly (UI health bar code and its call site, README, docs for item data, effects, and the in-game test doc) and the **data** half partly (item group JSON files, item model JSON, effect catalogue JSON, locale folder layout). The **server** half is not in the box (README line 84 names an external compatible server; not fetched). Binary tables (`.bmd`, `.OZJ`, `.OZT`, `.map`, `.att`) were not parsed.

Licence: none in the box. No LICENSE file at the root, README has no licence section, `_RESTRICTED-NOTE.txt` says "no licence". Treat as unlicensed. Font licence for one bundled font is OFL (audit read, `src/bin/fonts/NotoSansTC-LICENSE` line 1); other fonts not read. Class C/D for everything here: shape and mood only.

`CLAUDE.md` and `AGENTS.md` at the donor root are donor files. Read as data only; their instructions were not followed.

Rule for every idea below: recreate as a clearly distinct original, never a copy. About 20-30 percent resemblance in mood only.

## 1. Creatures and beasts

Not determined in this pass. The creature data is not readable text in this box:
- `src/bin/Data/Monster/` holds 947 asset files: 344 `.bmd` models, 489 `.OZJ` and 112 `.OZT` textures, 2 `.ozj`. Some files in that folder are named like gear pieces, so the folder is mixed. The monster-to-file mapping is not verified.
- `src/bin/Data/Local/Eng/MonsterSkill.bmd` (binary) holds skill data for monsters; not parsed.
- Creature families, tiers and boss patterns: not determined. I did not guess categories from file names, because the restricted rule keeps names out.

Top striking creatures: none listed. I could not read creature behaviour from text. The creature-adjacent looks that were read are in section 6 (glow of monsters is set in code, `docs/item-data.md` 310; target tether and target bar in section 6).

## 2. Classes, races and factions

Seven class-requirement flags appear across item definitions (`src/bin/Data/Items/Group*.json`, each item's `classRequirements` block; 772 items carry one). Each flag is on 235 to 376 items. Names are not recorded here (restricted donor). Category-level description: each class has its own gear line, so a piece can be locked to one or more classes.

Class-specific character models are in `src/bin/Data/Player/` (873 files, binary, not parsed).

Factions: none found in text. Races: none found in text.

## 3. Weapons

Six hand-weapon families plus shields, in the item JSON (`src/bin/Data/Items/Group00` to `Group06`):
- Hand weapons: 135 items across six families. Per family counts: 36, 9, 20, 12, 26, 32 (family sizes from one parse).
- Shields: 24 items (group 06, off-hand).
- Two-hand flag: 62 items carry `twoHanded` (all groups).
- Weapon item level climbs with the family: levels start low in each family and reach the high 140s in most families. Damage fields (`damageMin`, `damageMax`) also climb with item level.
- Attack type: 370 items carry an `attackType` integer (what animation or attack shape). Meaning per value not read.
- Special properties: 11 items carry `resistances` (elements: ice, fire, wind, poison, lightning, earth, water), 17 entries in total. Set bonus: not in the JSON; the set option data is binary (`Local/Eng/ItemSetOption.bmd`, not parsed).

Top 5 striking (category level):
1. **Two-hand heavy weapon with a long level ladder.** Two-hand flag on 62 items; the ladder climbs to the high 140s. Keep: two-hand as a flag that changes the stance. Change: a heavy stance with a wind-up that reads at 375 px.
2. **Elemental weapon with resistance on the item.** 11 items carry element resistance fields. Keep: element as data on the item. Change: our element palette and a glow cue (section 6).
3. **Shield family.** 24 items, all in the shield group, each with a block rate (`blockRate`). Keep: a block rate on the shield. Change: parry and guard rules from our duel parity rows 3.
4. **Bow family with the highest damage cap.** The bow group reaches the highest `damageMax` of the weapon groups (one parse; 15 of its items use the off-hand slot). Keep: a ranged family with its own ladder. Change: a bow shot as a lock-on tether (section 6), not a pure damage number.
5. **Staff family with an off-hand pairing.** The staff family allows an off-hand item (`slot` values include off-hand). Keep: pairing as a slot rule. Change: pairing gives a spell mod, not a second weapon.

## 4. Armour and gear

Armour pieces (not sets): helm 66, armour 74, pants 74, gloves 68, boots 74 = 356 pieces across groups 07 to 11. Level ranges per piece group climb from low single digits to roughly 127-147.

Tiers shown by data:
- **Wing tiers** (`wingTier`): four values, `small`, `first`, `second`, `third` (24 wing items: small 6, first 4, second 7, third 7). Documented as driving the wing formulas for defence, damage and absorption (`docs/item-data.md` 81).
- **Item level**: a `level` field climbs with the group; the glow ladder reads it (section 6).
- **Upgrade and ancient**: item upgrade and ancient sets are decided by the game, not in the group files; set options and ancient glow are binary tables (`Local/Eng/ItemSetOption.bmd`, not parsed).
- **Durability**: `durability` on 593 items; repairable flag on 377.

Item tags (`tags` field, 250 items carry tags). Top tags by count: cash-shop 108 (not a design target for us), valuable 79, socket-seed-sphere 30, lucky-item ticket 10, gemJewelry 7, jewel 6, cape 6, socket-seed 6, buff-scroll 6, and smaller groups.

Sockets: 39 items carry socket tags (socket seed, socket seed sphere, socket sphere). Gems and jewels: 13 items (jewel 6, gem jewelry 7).

Helpers (group 13): 137 items with pet, pendant, ring and off-hand slots, levels up to 300. Potions (group 14): 162 items. Miscellaneous (group 15): 36 items.

Top 5 striking (category level):
1. **Wing ladder with four named tiers.** Four tiers (`small` to `third`) change the wing formulas (`docs/item-data.md` 81). Keep: tiers as named steps that change a formula. Change: our wing tiers change flight height and landing, not only defence (row 22).
2. **Socket sphere ladder.** Three socket item types (39 items). Keep: a socket item that adds a slot to gear. Change: a socket is consumed into a charge (row 15).
3. **Helper slot with its own level range.** Helpers reach level 300 in group 13 (137 items). Keep: a companion slot with a long level ladder. Change: companion as a tether or wingman, not a pet.
4. **Gamble item.** Tag `gambleItem` (5 items) and a slow spin as idle state (section 6). Keep: a gamble item as a reward item with its own idle motion. Change: a hit-spin reward chest.
5. **Upgrade glow and shine from +7 and +11.** Glow colour from +7, shine from +11, excellent glow flagged per mesh, ancient colour for sets (`docs/item-data.md` 288, 290). Keep: a stepped glow ladder by upgrade. Change: three steps with a pulse pattern, not colour alone (accessibility).

## 5. Zones and dungeons

Zone folders: `src/bin/Data/World1` to `World40` (47 folders by count). Each zone folder holds terrain (`.map`, 86 files) and attribute layers (`.att`, 117 files), counted at the top level of each folder. The audit had 90 and 123; my count differs, so I report mine.

Object folders: 48 (`Object1` to `Object82`, some lowercase). Object sets are world props, binary.

NPC folder: 326 files (binary, not parsed). Locale: `src/bin/Data/Local/` has three language folders (Eng, Por, Spn). Map names are in `Local/Eng/ImgsMapName` (34 files) and minimap images in `Local/Eng/Minimap` (20 files). `Local/Eng/NpcName_Eng.txt` is text with 678 lines of NPC names (not quoted).

Biome list: not read (terrain is binary). Hazards: not read.

Dungeon archetypes (from the in-game test doc, category level): a gated area that needs a kill quota across three monster kinds (`docs/in-game-tests.md` 335); a flight-gated area that needs flight gear (`docs/item-data.md` 131-132); a timed arena event with its own item set (named in `docs/item-data.md` 287, not recorded here).

Top 5 striking (category level):
1. **Flight-gated area.** Wings and flying mounts let a character fly; the area refuses entry without flight gear, and the last flight item cannot be removed (`docs/item-data.md` 131-132). Keep: flight as an entry gate in data. Change: entry gate with a visible landing ring, and flight ends on hit (row 22).
2. **Kill-quota gate.** An area needs a quota of kills across three enemy kinds (`docs/in-game-tests.md` 335). Keep: quota per enemy kind as data. Change: counted by the server-verified kill ledger (row 18).
3. **Zone as folder pair.** One folder per zone with a terrain layer and an attribute layer. Keep: terrain and attributes as separate files per zone. Change: attribute layer holds spawn caps and grace timer (row 23).
4. **Timed arena event.** Event area with its own item set (named in the doc, not recorded). Keep: an event with a bounded time. Change: our event is a short duel ladder, not a map.
5. **Map name images.** Map names have a folder of 34 entries in the locale folder (`ImgsMapName`); I did not open them, so I do not know their format. Keep: a per-language map-name set. Change: text on our HUD at 375 px, not a banner image.

## 6. Item and effect looks worth recreating

Each look has a reference file so a human can check it. Art colours are not recorded (restricted donor); the palette is named only.

| label | technique | ref |
|---|---|---|
| Upgrade glow ladder | glow colour from +7, shine from +11, ancient colour for sets, excellent glow flagged per mesh; the game picks the glow from level | `docs/item-data.md` 276, 287-290 |
| Named glow palette | one shared list of named colours (45 names); names must be letters and digits; start is refused when defaults are missing | `src/bin/Data/Effects/GlowColors.json` (present, not copied); `docs/item-data.md` 305 |
| Per-mesh glow | glow and shine can be limited to named meshes, or all but one hidden mesh | `docs/item-data.md` 288-296 (glow field rows) |
| Item model glow usage | 889 model entries in `src/bin/Data/Items/Models/Group*.json`; 420 carry a glow object (colour 302, level 110, shine colour 53, excellent 24, ancient colour 15); 38 distinct colour names used | `src/bin/Data/Items/Models/Group00_Sword.json` (glow object) |
| Inventory idle spin | every item turns while hovered; gamble items turn slowly all the time | `docs/item-data.md` 269 |
| Four effect kinds | object, particle, joint, sprite; each has its own create function and own type names | `docs/effect-data.md` 21-24 |
| Joint tether | a link between two points (lightning, beams, trails) | `docs/effect-data.md` 23; `src/bin/Data/Effects/JointTypes.json` (31 types) |
| Tether follows a copy of the nearest target | the joint's target is a copy of the nearest monster or NPC; it follows while its slot holds it; re-acquires the nearest when gone | `docs/effect-data.md` 393-395 |
| Target bar only for the selected target | bar drawn under the selected name only; drawn only when status is not zero | `src/source/UI/Combat/MonsterHealthBar.cpp` 3-5; `src/source/UI/NewUI/Character/NewUINameWindow.cpp` 210 |
| Target bar appears after attack | bar added after the first attack | `README.md` 43 |
| Reduce-effects toggle | options checkbox that cuts effects for frame rate | `README.md` 14 |

Effect counts from the JSON (category level): effect 464 types, particle 98, joint 31, sprite 53 (646 in all).

## 7. Inspiration for Frankendom

Each original is a clearly distinct idea, not a copy of any creature, class, zone or item name, and not a copy of any art.

1. **Upgrade Glow Ladder.** Gear shows its upgrade through a glow that starts at a middle step and a shine that starts at a higher step. Keep: stepped glow by upgrade, one colour list. Change: three steps with a pulse pattern, so the tier reads without colour (accessibility). Rows 15 and 16.
2. **Named Glow Palette.** One shared list of named colours for all gear, refused at start if the defaults are missing. Keep: the single list and the start-time check. Change: our palette, and a contrast check at 375 px. Rows 15 and 16.
3. **Tether Line.** A dotted line in team colour that links two fighters, follows a copy of the nearest target, and re-acquires when the target is gone. Keep: the joint kind, the follow, and re-acquire. Change: breaks past the leash, no lightning look. Rows 8 and 4.
4. **Target Bar After Hit.** A bar shows only for the selected target, hidden at zero, and appears after the first hit. Keep: selected-only, hidden at zero, shown after an attack. Change: segmented bar that fades after a few quiet seconds, half-point tick for 375 px. Row 14.
5. **Four Effect Kinds.** Hit burst, aura, tether, marker, and a ground decal, each with its own create path and names in data. Keep: the kinds and separate create paths. Change: kinds named by gameplay role. Row 8.
6. **Wing Tiers Flight.** Four named wing tiers change flight height and landing; flight is an entry gate in data. Keep: tiers as named steps and the entry gate. Change: landing ring and flight ends on a hit. Row 22.
7. **Kill-Quota Gate.** An area opens after a quota across three enemy kinds, counted by the server ledger. Keep: quota per enemy kind as data. Change: our own enemy kinds and a visible progress ring. Rows 18 and 23.
8. **Inventory Idle Spin.** Gear turns while hovered; rare gear keeps a slow spin in idle. Keep: the hover turn and the slow idle spin for rare items. Change: a tilt-and-shimmer instead of a full turn, so the phone view stays calm. Row 15.

## Cross-link to our topics

- VFX and hit feedback: effect kinds, tether, the follow rule (section 6).
- HUD and readability: target bar rule, glow ladder, reduce-effects toggle.
- Spawns, zones, loot: zone folder pair (terrain plus attributes), kill-quota gate, item level ladder.
- Progression: wing tiers, socket items, helper level ladder.
- Sound and camera: not read.

## Not read

Binary game data: `.bmd`, `.OZJ`, `.OZT`, `.map`, `.att`, `.OZB`, `Effect/` entries (320 files), `Monster/` models and textures, `Player/`, `NPC/`, `Skill/` (366 files), `Local/` binary tables (`ItemSetOption.bmd`, `MonsterSkill.bmd`, `MasterSkillTree.bmd`, etc.). Shop archives (`InGameShopScript/`). Item group bodies beyond the parsed fields, and `Items/Models/SharedModels.json` beyond counts. `src/source/` beyond the health bar file and its call site. `CHANGELOG.md`, `tests/`, `tools/`, `ClientLibrary/`. Font licences beyond the first lines. `docs/` other than the item, effect and in-game test docs. `CLAUDE.md` and `AGENTS.md` (data only, not followed). Server half (not in box).

## Reuse tag

Shape and idea only. No licence in the box, restricted note says study shape only. Do not reuse code, constants, names or text. Category-level looks only.

## Brief rule served

Every idea above is kept at mechanism or shape level and recreated under our own names; the traits kept and changed are listed per item.
