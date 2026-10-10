# vthibault-roBrowser (catalogue, DC058)

Donor: /mnt/frankendom-donors/vthibault-roBrowser/ (VPS only). Receipts: receipts.tsv in this folder (verified, 66 rows across both donors, all pass).
Machine-readable copy: vthibault-roBrowser.catalogue.json.

## Halves and licence
- Read: client half. src/DB tables (items, jobs, monsters, shadows, effects, skills, weather), src/Renderer effect files (Water, Sky, LockOnTarget, Damage).
- Not in box: server half. README.md line 30 names an external websocket proxy. Paired donor MrAntares-roBrowserLegacy is in the box, not read.
- Art and audio: none in the box. client/data, client/BGM and client/resources hold placeholders only. So every look below is code or table level. No sprite, model or colour was seen.
- Licence (as the files say): LICENSE is GPL-3.0 ("Version 3, 29 June 2007"). Vendored MP3 player says MPL 1.1 (src/Audio/mp3-player/license.txt). Game content owner is not named.
- Name tables look like original game text. Structure only was read; no strings are reused here.
- Class: code B, data tables C. Category-level inspiration only for creatures, classes and gear; no instance-level looks.
- Rule for every original below: a clearly distinct original, about 20-30 percent resemblance in mood only, never a copy. Trait kept and trait changed are named in each.

## Counts (what is actually in the box)
- creatures: 1,567 monster rows with ID 1000 or above. The table has 2,271 keyed rows; the 704 rows below 1000 are player and job sprite keys. 1,525 distinct name strings. Source: src/DB/Monsters/MonsterTable.js (keyed rows).
- classes: 211 job id rows in src/DB/Jobs/JobConst.js: 28 base ids (0 to 27), 45 "_H" rows, 69 "_B" rows, and 69 later-class or pet and transform-style ids. Roles are not assigned here; the name strings were not copied.
- weapons: 23 single weapon types (ids 1 to 23) and 6 dual-type pairs (ids 25 to 30) in src/DB/Items/WeaponType.js. Markers at 24 (LAST) and 31 (MAX).
- gear_sets: 0. There is no set-bonus table. Item rows: 8,402 (src/DB/Items/ItemTable.js); headgear rows: 868 (src/DB/Items/HatTable.js); shield rows: 4 (src/DB/Items/ShieldTable.js).
- zones: 12. These are sky rows keyed by map file (src/DB/Effects/WeatherEffect.js), not a zone list. The map files are not in the box.

## 1. Creatures and beasts
Families are a rough name-keyword sizing aid, not a taxonomy. Buckets are substring matches on distinct name strings, so they overlap and miss. 1,220 of 1,525 distinct names matched no bucket.

| bucket (rough) | distinct names |
|---|---|
| humanoid-type | 69 |
| beast or animal | 61 |
| insect or arachnid | 37 |
| undead or spooky | 29 |
| mineral construct | 23 |
| plant or fungus | 19 |
| boss-like tokens | 17 |
| egg-type tokens | 17 |
| ice | 17 |
| dragonkin | 13 |
| demonic | 12 |
| aquatic | 12 |
| slime or blob | 9 |
| fire | 4 |

Shadow size classes (src/DB/Monsters/ShadowTable.js, 351 rows, keyed by monster id): scale 0.5 is the most common (117 rows), then 2.0 (60), 0.7 (48), 1.2 (40), 0.0 meaning no shadow (37), 1.5 (34). Receipt: ShadowTable.js line 17 has the zero row, line 19 a 0.5 row.

- Escalation with level: not in client data. Level and stat growth are server-side. Not read.
- Signature abilities: monster skill logic is on the server half (not in box). The client has 112 ground-unit rows (src/DB/Skills/SkillUnit.js) and 323 effect entries (src/DB/Effects/EffectTable.js).
- Boss pattern: no boss flag in the client tables. 17 boss-like name tokens. Not read further.

Top 8 (category level, from name families and the shadow table only; no art was in the box, so silhouette at 375 wide was NOT judged):

1. Plated insect swarm (insect or arachnid, 37 names). Why: swarm numbers are a readability test at 375 wide. Keep: many of one shape, shared sound. Change: fewer, heavier shells; one shared signature sound. Ref: src/DB/Monsters/MonsterTable.js (rows 1000 and up).
2. Mineral construct (23). Why: slow, heavy, big-shadow archetype. Keep: slow stomp and the largest shadow class. Change: a glowing exposed core as the weak point. Ref: MonsterTable.js; ShadowTable.js.
3. Undead drifter (29). Why: pale, floating, low-threat-read. Keep: translucent idle bob. Change: a fog trail that marks where it has been, to help threat reading. Ref: MonsterTable.js.
4. Dragonkin (13). Why: the largest shadow class (2.0) pairs with a big body. Keep: scale and wings as the silhouette. Change: one wing, a tail sweep as the signature move. Ref: MonsterTable.js; ShadowTable.js.
5. Demonic (12). Why: horned silhouette reads fast. Keep: horn shape. Change: a summon tell (ground ring) before arrival. Ref: MonsterTable.js.
6. Slime or blob (9). Why: squash-and-bounce is the simplest idle vocabulary. Keep: squash idle. Change: hit reaction splits into two small blobs instead of squashing. Ref: MonsterTable.js.
7. Aquatic (12). Why: a rise-from-ground ambush shape. Keep: fin silhouette. Change: rises from a water tile as an ambush. Ref: MonsterTable.js.
8. Beast pack (61). Why: packs test many-vs-one. Keep: a quadruped pack that circles. Change: one shared aggro list for the pack (engine-owned). Ref: MonsterTable.js.

## 2. Classes, races and factions
- Base job ids 0 to 27 (the top block of the return object in src/DB/Jobs/JobConst.js). Roles are not assigned here because that needs the name strings, which were not copied.
- Progression shape from id bands only: base id, then an "_H" variant band starting at 4001 (JobConst.js line 45), then a "_B" variant band starting at 4023 (line 67), then a later-class band from 4046 on. Pet and transform-style ids sit in the same table (for example line 153).
- Races: no race table in the box. Factions: none found in the client tables.

## 3. Weapons
Families (src/DB/Items/WeaponType.js):
- Blade: short sword, sword, two-hand sword.
- Spear, axe, mace, rod: each in one-hand and two-hand form.
- Bow, knuckle, instrument, whip, book, katar, shuriken, two-hand rod.
- Gun group (5 types): handgun, rifle, gatling, shotgun, grenade launcher.
- Dual-type pairs (6): short sword with short sword, sword with sword, axe with axe, short sword with sword, short sword with axe, sword with axe.

Hit-sound families (src/DB/Items/WeaponSoundTable.js): 6 distinct hit files (sword, axe, mace, rod, spear, arrow). The mace file is used by 18 rows, including the no-weapon fallback (line 18). Sword file 3 rows, arrow 1 row.

Tiers: none. Weapon rows have no rarity field and no visual tier code was found in src/. Refine results are handled as a packet (src/Engine/MapEngine/Item.js, around lines 320 to 324), with no look change seen.

Top 5 (category level):
1. Two-hand rod (id 23). Keep: long caster reading. Change: a crystal head that glows with the spell charge. Ref: WeaponType.js line 40.
2. Gun group (5 types). Keep: ranged firearm class. Change: fewer, slower shots with a visible tracer. Ref: WeaponType.js lines 34 to 38.
3. Dual-type pair (6 combos). Keep: two weapon families on one character. Change: each hand keeps its own hit sound, layered. Ref: WeaponType.js lines 42 to 47.
4. Whip. Keep: reach. Change: a reach telegraph on the ground before the strike. Ref: WeaponType.js line 31.
5. Bow. Keep: its own ranged hit sound family. Change: arrow impact is a separate short sound layered with the target's hit. Ref: WeaponSoundTable.js line 29.

## 4. Armour and gear
- Items: 8,402 rows. Fields in every row: unidentified and identified display names, resource names, description arrays, slotCount (socket count), and ClassNum (class restriction). There is no rarity field. Source: src/DB/Items/ItemTable.js.
- Description text uses inline colour markup. That is text emphasis, not a tier system.
- Headgear: 868 rows (src/DB/Items/HatTable.js). Shields: 4 keyed rows (src/DB/Items/ShieldTable.js).
- Materials (metal, gold, crystal): none in the data. Not read in any art.

Top 5 (category level):
1. Socketed item (slotCount above 0). Keep: socket count as a visible tier. Change: sockets glow when filled. Ref: ItemTable.js line 31 (field shape).
2. Headgear family (868 rows). Keep: one head swap per slot. Change: head-top silhouette is the signal, not colour. Ref: HatTable.js.
3. Shield size steps (4 rows). Keep: four steps small to large. Change: each step adds a rim, so the size reads at 375 wide. Ref: ShieldTable.js.
4. Class-locked gear (ClassNum). Keep: class lock as a badge. Change: badge sits on the item icon, not the model. Ref: ItemTable.js.
5. Emphasis line in item text (inline colour markup). Keep: one bold stat line. Change: our own marker, not the donor's colour codes. Ref: ItemTable.js.

## 5. Zones and dungeons
- Sky rows (src/DB/Effects/WeatherEffect.js lines 23 to 36): 12 rows keyed by map file. 10 are blue-sky maps. 2 extras: a dark tower and a boss room with a pale warm sky and dark red clouds. The file ends with a TODO for snow and fireworks (not built).
- Ground hazards (src/DB/Skills/SkillUnit.js, 112 rows): wall types (safety, fire, ice), a slow field (quagmire), a mine, a pillar, and a healing area. Ground units are drawn by the client; where they are placed was not read.
- Dungeon archetypes and biome list: map files are not in the box. Not read.

Top 5 (category level):
1. Boss-room sky. Keep: separate sky entry for a boss room. Change: add a horizon band as a zone data field. Ref: WeatherEffect.js line 36.
2. Tower sky. Keep: an interior uses its own sky entry. Change: a dark purple sky with a pink cloud tint, lower cloud count. Ref: WeatherEffect.js line 35.
3. Quagmire slow field. Keep: a slow field as a placed ground unit. Change: ripples show the slow radius. Ref: SkillUnit.js line 28.
4. Fire wall. Keep: a wall that blocks a lane for a few seconds. Change: a warning ring before it lights. Ref: SkillUnit.js line 17.
5. Ice wall. Keep: a blocking wall. Change: a crack sound before it fully blocks. Ref: SkillUnit.js line 27.

## 6. Item and effect looks worth recreating
| label | technique | ref |
|---|---|---|
| Vertex-wave water with a looping caustic strip | surface height is a sine of position plus a time offset; texture frame is picked by time over 32 frames | src/Renderer/Map/Water.js lines 97 and 235 |
| Pre-aged cloud pool | 150 sprites, random life up to 8000 ms, each born 2000 ms in the past so the sky starts full | src/Renderer/Effects/Sky.js lines 30, 128, 129 |
| Stepped lock-on ring | brightness is 20 steps (time over 20, mod 20), the ring spins by tick over 4 degrees, one uniform tints two channels | src/Renderer/Effects/LockOnTarget.js lines 102, 157, 260 |
| Damage numbers | lifetime 1500 ms; alpha is 1 minus life fraction; size scales by a factor; an enemy flag is set when the target is a player object; colour is chosen by hit-type bits | src/Renderer/Effects/Damage.js lines 159, 163, 361, 363 |
| Keyed effects with random variants | 323 effect entries; a "%d" in a file name is replaced by a random range; a sound and an attached-entity flag per entry | src/DB/Effects/EffectTable.js line 25 (header) and the entry bodies |
| Shadow by monster id | scale per id, zero means no shadow | src/DB/Monsters/ShadowTable.js lines 17 and 19 |
| Hit sound per weapon type | one hit file per weapon family, with mace as the fallback | src/DB/Items/WeaponSoundTable.js lines 18 and 20 |

## 7. Inspiration for Frankendom (originals)
1. Caustic shallows. A shallow-water floor with a vertex wave and a 32-frame caustic loop. Ripples radiate from fight impacts. Keep: a cheap vertex wave and a looping caustic strip. Change: ripples come from hits, our palette, no clouds. Client-only (HUD and grade rows 14 and 16).
2. Rune halo. A target ring with discrete steps (12 or 20), two colours, and a spoke that marks facing. Keep: discrete steps for readability and a slow spin. Change: segmented runes; the spin follows the fighter's stance, not a fixed rate. Parity row 14 (HUD).
3. Ember numbers. Hit numbers that punch in, arc up, and fade. Keep: colour by hit class and alpha by life. Change: punch scale on spawn, arc path, our own glyphs. Parity row 10 (hit impact).
4. Zone sky card. One keyed zone table with a gradient and a horizon band as fields; a boss room gets its own dim entry. Keep: one table keyed by zone. Change: gradient and horizon are data fields. Parity row 20 (catalogue as runtime source) and row 21 (catalogue fields).
5. Ground hazard set. Four ground hazards as data rows: a wall, a slow field, a mine, and a healing area. Each has a warning ring before it is live. Keep: id-keyed ground-unit map. Change: a warning ring before activation. Parity row 13 (specials).
6. Hit families. Six hit-sound families; a dual-weapon character layers both families; a crit stinger sits on top. Keep: family-level mapping. Change: an explicit fallback family, with a log line when a weapon has no family. Parity row 12 (combat sound cues).

Defects in the donor, kept idea and fixed in originals:
- Weapon sound fallback: 18 rows point at the mace file, so a missing entry is silent in review. Fix: explicit fallback plus a log line (see original 6).
- Sky table: a map missing from the table has no fallback read here (not read). Fix: a default sky entry per zone.

## Fold-ins (addendum topics)
- hud-ui: lock-on ring and damage numbers read. Minimap, world map, touch UX, input buffer and accessibility: not in the client tables read. Not read.
- sound-music: weapon hit-family mapping read. Stingers and biome beds: not in the box. Only the sky table is per map.
- progression, loot, spawn density: not in the box (server half).
- idle or ambient vocabulary: water sway and cloud drift are the only ambient animations read. Creature idle clips: not read (src/Renderer/Entity not read).
- death and respawn, boss intro, finisher staging: not read.
- readability at 375 wide: no art, so not judged. Counts only: swarm size and shadow class are the proxies.

## Not verified
- Server half, src/Engine (most), src/Renderer/Entity (animation), sound loader, UI, the paired MrAntares donor.
- Status table (src/DB/Status/StatusInfo.js) not counted; a TODO in that file lists unknown icon ranges.
- Full text of name, description and skill tables (structure only).
- Vendored libraries beyond their headers.
- Tick units in Sky and LockOnTarget are not checked against the clock, so the speeds are stated in the donor's units only.
