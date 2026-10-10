# shoff-ShadowbaneCacheViewer (design catalogue, cell DC050)

Donor: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer (VPS). A C# and C++ viewer and exporter for game cache files. It is a tool, not a game.
Class: C (game-derived, rights unclear). Dom's rule applies in full: recreate as a clearly distinct original, never a copy. Names and looks below are category-level only; no exact art data is copied.
Half read: the CLIENT-SIDE parser and viewer (code, plus 13 hex text dumps of records and 10 empty material exports). The DATA half (the .cache files) is NOT in the box; the README says so (line 5). The matching half is the game client that produced the caches; it is not in the box and was not looked for.
Receipts: /private/tmp/p2/wave2-haiku/batch3/DC050/receipts.tsv (54 rows, all verified).

## Counts (verified records only)
- creatures: 0 records parsed. Four creature families are named by a code comment, a ground-theme menu, or record titles (see section 1).
- classes: 0 classes. One NPC-type record title in the dumps (type not confirmed).
- weapons: 0.
- gear_sets: 0 named sets. The item record type exists (see section 4).
- zones: 6 ground themes in the viewer menu (5 load a model; "Snow" loads none).

## 1. Creatures and beasts
No creature record was parsed. The families below come from one code comment, one menu, or record titles in the dumps. Treat them as family hints, not counted records.
- Undead: comment at Mobile.cs line 93; undead ground theme at sbviewer.cpp lines 583-584; an undead keep record title in cobjects_564600.txt (2.4 KB dump). Ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/src/Shadowbane.Models/Mobile.cs
- Bats (flying): same comment, Mobile.cs line 93. Hover height 4.0 against 2.0 for undead.
- Lizard-folk: a wall, a pyramid and a totem prop name in cobjects_64000.txt, cobjects_64014.txt, and Exports/Lizardman Totem.mtl (0 bytes).
- Minotaur-type: a keep record title in cobjects_814000.txt (2.2 KB dump).
Escalation with level: not read. The record has level-gate fields (Mobile.cs lines 412, 446) but no creature tiers were parsed.
Boss or elite pattern: a single large keep record (minotaur, undead) is the only hint. Not verified as a boss.

Top striking (fewer than 8, because only four families are named and no look data was read). Each is family level, not record level.
1. label: Hover swarm (bats). why: a flying group reads at range, and the height is one number per family. keep: one hover-height field per family as data; the group flies high. change: our own wing silhouette; the swarm moves as one flock with our own flap cadence. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/src/Shadowbane.Models/Mobile.cs (line 93)
2. label: Grave wraith (undead). why: an undead zone changes the ground and pairs with a low hover. keep: undead ground plus a low hover height (2.0 in the comment). change: our own ghost form, not a robed skeleton; our palette only. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Native/sbviewer.cpp (lines 583-584)
3. label: Lizard-folk camp. why: walls with a tall pyramid and totem read as one camp from far off. keep: a camp of wall, centrepiece and tall totem as one prop set. change: our own totem head and ornament set, a coloured banner, our palette. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Documents/CObjects_Text_Views/cobjects_64014.txt (category only)
4. label: Single-keep elite site (minotaur-type). why: one very large keep marks an elite place on the map. keep: one large keep as the elite arena. change: our own layout and boss entrance; no copy of the keep plan. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Documents/CObjects_Text_Views/cobjects_814000.txt (category only)

Signature sound and effect: not read (Sound.cs and SoundCache.cs exist but no sound data is in the box).

## 2. Classes, races and gates
The record type 13 (runes, NPCs, characters) carries requirement blocks. Names are not read; these are gate shapes.
- Race gate: a race list with a requires or prohibits byte. Mobile.cs lines 372-381 (line 375: "0 = requires, 1 = prohibits").
- Class gate: a class list with the same toggle. Mobile.cs lines 382-390 (line 387 toggle).
- Level and skill gate: MinRequiredLevel (line 412), level required (line 446), required skill pairs after it.
- Rune economics: type, category, cost, stack rank and training power bonus (fields at Mobile.cs lines 29-33).
- Effect list: triples of token, modifier and a flag, read at Mobile.cs line 423.
- Progression shape from comments: race runes are 10s, class and profession runes are 15s and count upwards (Mobile.cs lines 582 and 588). Comments only; not checked against data.
- The NPC-type record title in cobjects_44000.txt is a ranger-type name. Its record type is not confirmed; the flag is not in the text view.

Class list (own labels, shape only):
- Race gate: requires or prohibits a set of races. Role: entry restriction. Mechanic: one toggle per gate.
- Class gate: the same toggle, for a class set. Progression: class runes count upward.
- Level and skill gate: one minimum level and a list of skill pairs.
- Rune stack: cost, stack rank and a training bonus per rune.

## 3. Weapons
Not read. The weapon and armour family is in ObjectType flag 0x9 (ObjectType.cs line 9: "0x9 = Items, all weapons, armours, equipment, etc."). No weapon names, tiers or special properties were parsed. weapon_families is empty.

## 4. Armour and gear
Not read as data. The item record (Equipment.cs) holds a render id and two icon ids. Tiers, materials and set bonuses are not in the code read. gear_tiers is empty.
Shape of the item record: world model id, inventory icon id and minimap icon id (Equipment.cs lines 24, 33, 38). Ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/src/Shadowbane.Models/Equipment.cs

## 5. Zones and dungeons
- Ground themes in the viewer menu: grass, desert, volcanic, undead, snow and checker (sbviewer.cpp lines 144-150; enums.h lines 47-54). Each theme loads a model by id, except snow (see the defect below).
- Defect: the snow entry loads id 0. canvas.cpp line 252 creates a model only for a non-zero id, and line 249 deletes the old one first. So snow draws the checker fallback (canvas.cpp line 367 draws the loaded model if one exists, otherwise the checker). Snow and checker look the same in the viewer. Fix: a real snow plane.
- Zone archive: a zone record has a name and a list of prop objects. Each prop entry holds an object id and several floats; the floats are logged, not named (zones.cpp lines 43-56). Ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Native/zones.cpp
- Dungeon archive: a separate file name (DungeonCache.cs line 7). Contents not in the box.
- Cache file kinds (CacheFile.cs lines 3-18): object, zone, dungeon, mesh, motion, palette, render, skeleton, sound, terrain alpha, textures, tile, visual.
- Hazards: none read.

Top 5 zones (striking, category level):
1. Undead ground plane. keep: a per-zone ground model picked by theme. change: our ground plane and palette; no grave-yard copy. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Native/sbviewer.cpp (lines 583-584)
2. Volcanic ground plane. keep: a hot, distinct ground per zone. change: our own glow and crack pattern, not read from the donor. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Native/sbviewer.cpp (lines 586-587)
3. Desert ground plane. keep: sand-type ground as a zone theme. change: our own dune palette. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Native/sbviewer.cpp (lines 580-581)
4. Swamp ruins with a lair. keep: ruins as the zone frame and a lair inside. change: our own water and reed look. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Documents/CObjects_Text_Views/cobjects_484280.txt (category only)
5. Keep-scale structures (the two largest record dumps, about 2.2-2.5 KB each). keep: one big set piece per zone. change: our own gate-to-zone flow; whether these open a dungeon was not read. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Documents/CObjects_Text_Views/cobjects_564600.txt (category only)

## 6. Item and effect looks worth recreating
- Hover height per family: one float in the record, not a shader. ref: Mobile.cs line 93. Technique: data field, read at parse time.
- Three-view item identity: one record gives a world id, an inventory icon id and a minimap icon id. ref: Equipment.cs lines 33 and 38; Deed.cs line 14.
- Ground plane per zone with a checker fallback. ref: canvas.cpp lines 247-256 and 365-369.
- Effect as a single id: a particle record is one render id, so an effect is placed by id with no parameters read. ref: Particle.cs line 23.
- Material blocks: a named material with diffuse, specular, transparency and shine terms (values not recorded). ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Documents/ExportedFromMaya/head.mtl (lines 1-8). Shape only.
- Metal, gold, glow and crystal looks: NOT in any data read. The material exports are 0 bytes (Exports/*.mtl), and the PNG textures were not read. Do not claim a look.

## 7. Inspiration for Frankendom (originals, clearly distinct)
1. Land claim stake. idea: one claim record shows in the world, the bag and the minimap with one identity. keep: one record, three icon ids, one claimable plot. change: a stake with a pennant instead of a deed sheet; zone colour as the palette key. Ref: Deed.cs lines 14-16 and 25-29.
2. Hover height per family. idea: a flying family hovers at a family height set in data. keep: one hover field per family (undead low, bats high). change: our own flight profile and flock motion; numbers in zone data. Row 7 (creature actor).
3. Zone ground swap that really loads. idea: each zone picks its own ground plane by id, with a fallback that never draws the wrong one. keep: a plane per zone theme. change: fix the snow case so it loads its own plane, and use our palette. Ref: sbviewer.cpp lines 590 and 593; canvas.cpp line 252.
4. Lizard-folk camp prop set. idea: a camp is one set of walls, a centre pyramid and a tall totem. keep: the wall-centrepiece-totem camp as one prop set. change: our own totem and banner; no shared shapes. Category only.
5. Single-keep elite site. idea: one large keep marks the elite place. keep: one big set piece per elite site. change: our own arena layout and entrance. Category only.
6. Three-view loot card. idea: a drop has a world icon, an inventory icon and a minimap icon as one identity. keep: three icon ids on one item. change: a phone inspect card with our rarity colours and sound. Row 18 (loot roll).
7. Level-and-skill gate with a requires or prohibits toggle. idea: an item or rune is gated by minimum level and skills, with one toggle for requires or prohibits. keep: the toggle and the level gate. change: no race or class lists, because Frankendom keeps one character and one ledger. Ref: Mobile.cs lines 375, 387, 412.

## Licence (what the files say)
- Code: no LICENSE, COPYING or NOTICE file in the repository root, src/ or Native/ (audit AU049 and this read).
- Assets: README.md lines 4-5 say the cache files "are the property of the owner of the Shadownbane intellectual property" and are not included. No asset licence is stated for anything else.
- Bundled web libraries: jQuery and Bootstrap, MIT per their files. These are libraries, not game content.
- 010 templates: no licence stated.
- Treatment: shape only. No code or asset copied.

## Not read
- The .cache game data (absent; excluded by the README).
- Documents/Framework 2012-05-21.7z (NOT in the earlier audit; not opened or extracted).
- Documents/CacheObjectIndexes.rar (8.7 MB; not opened).
- Documents/duplicate_render_ids.xlsx (not opened).
- Documents PDFs (three; not opened).
- uv_map.png and the Maya PNG textures (binary).
- Mobile.cs lines 241-359, 431-559 and 641-735 (the middle parse and the finder class; names only). Read: lines 1-240, 360-430 and 560-640.
- Native/objects.cpp bodies for types 3, 5 and 15; animation, skeleton, model and texture code.
- Sound.cs and SoundCache.cs (no sound data in the box).
- Shadowbane.Web pages, tests, and the 010 templates (names only).
- The 13 text dumps beyond their record headers.
