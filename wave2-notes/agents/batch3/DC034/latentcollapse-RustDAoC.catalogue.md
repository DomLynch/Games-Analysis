# latentcollapse-RustDAoC (design catalogue, DC034)

Donor: /mnt/frankendom-donors/latentcollapse-RustDAoC/ (VPS, read-only)
Licence (as the files say): code GPL-3.0-or-later (Cargo.toml line 16; LICENSE is the GPL v3 text). README line 7: no retail assets in the repo. README line 76: no code recovered by decompiling the retail client. Retail-derived data: data/client_tables/key_names.tsv line 1 says it is extracted from the retail client's string table. Clean-room shape only for us; no code, no tables, no retail-derived names reused.
Half read: CLIENT half (crates/caer-render, caer-protocol, caer-assets, caer-world sources, plus the shaders and the data/client_tables folder). DATA pack NOT in the box: gamedata.mpk (monsters.csv, anims.csv, monnifs.csv, skins.csv, fig3*.csv) is loaded by code but not shipped in this donor. SERVER half not in the box (README line 50 and 76 name the server). Paired donors that ARE in the box: OpenDAoC-OpenDAoC-Core (zone table source named at crates/caer-world/src/zone_names.rs line 1) and Dawn-of-Light-DOLSharp (named as the oracle in crates/caer-protocol/src/codec.rs line 1). Neither was read by me.
Checked: about 30 source files and 3 shaders opened by grep and sed; 8 data files counted. Confidence high on the code facts quoted, medium on the design read-outs. Dom's rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

## 1. Creatures / beasts

Families and tiers: NOT enumerable from this box. The creature table chain (model id, then monsters.csv, then monnifs.csv, then anims.csv, then skins.csv) is described in code (crates/caer-assets/src/monsters.rs lines 1-19) but the CSVs are not in the donor. The only creature-side data shipped is the test rows inside the code.
Escalation with level: not in the client half. Creature stats live server-side.
Count: creatures = null (not countable from this box). Named creature examples in code: giant or large skeleton (model 26 example, monsters.rs lines 11-12), Dragonfly (monsters.rs line 61), amazon and bear skin examples (monsters.rs line 31), Ire Fairy only as a sample chat line (crates/caer-render/src/combat.rs line 10).
Signature behaviour the client does show (from the animation slots, not from data rows):
- One shared humanoid idle clip is retargeted to skeletons and to player bodies (crates/caer-assets/src/anims.rs line 16).
- Action slots: walk, back, run, turn, slide, jump, land, fly, idle, death (anims.rs lines 30-32, 40-41). A fly slot means flying creatures are a first-class case.
- Combat slots: attack (high, medium, low), flinch, combat idle (anims.rs lines 45-46).
- Death: a dead entity stays as a corpse and is removed from the living draw (crates/caer-render/src/death.rs lines 17-29).
- Ambient idle vocabulary: idle slot plus combat idle slot. No idle-when-bored behaviour is in the client half.
Boss or elite pattern: none found in the client half (not read: the server).

Top creatures (honest: only three are concrete, all from code comments, none from a data table):

- Label: Bone-guard giant (skeleton class, example model 26).
  Why striking: a tall skeleton whose authored mesh needed a per-creature size percentage to read at the right height (monsters.rs lines 63: "Large Skeleton (`Scale = 125`) drew 25% too short").
  Keep: tall silhouette, one shared humanoid idle clip.
  Change: our own silhouette (ribbed chest, a different head); our own idle that breathes slower to mark it as big.
  Ref: crates/caer-assets/src/monsters.rs lines 11-12 and 63.

- Label: Dragonfly-type flier (flying small creature).
  Why striking: its authored mesh is about 1694 units across and needed a Scale of 10 to avoid filling the screen (monsters.rs lines 61-62). The fly clip slot is part of the shared animation table.
  Keep: a fly action slot separate from walk and run; the scale field as a per-creature correction.
  Change: our own wings and flight loop; our own size band (no wingspan that fills the 375-wide view).
  Ref: crates/caer-assets/src/monsters.rs lines 61-62; crates/caer-assets/src/anims.rs line 32.

- Label: Multi-skin humanoid NPC (guards and merchants).
  Why striking: one body mesh with ten separate skin slots (body, head, face, arms, gloves, lower body, legs, boots, cloak, helm), because the head texture must not be the torso texture (monsters.rs lines 81 onward, the SkinSlot enum; the code comments say a face painted with a torso texture caused the "melted" look).
  Keep: slot-by-slot skin binding; the face is its own slot.
  Change: our own slot list (fewer slots, a helm-first rig); a readable face at 375 wide.
  Ref: crates/caer-assets/src/monsters.rs line 81 (enum SkinSlot).

Not in this box: top 5 to 8 creatures. Not read: the server creature table and the gamedata CSVs.

## 2. Classes / races / factions

Counts: 62 playable class rows (class ids 1 to 62, career.rs line 179), spread over three realms: Albion 22, Midgard 19, Hibernia 21 (realm fields of CLASS_CAREERS, crates/caer-protocol/src/career.rs). 21 playable races (crates/caer-protocol/src/career.rs line 30; the 21 distinct races also appear in data/client_tables/req019_create_combos.tsv). The combo table has 485 data rows (a realm, class, race, gender join) and is a denominator for "which combinations are legal" (data/client_tables/req019_create_combos.tsv line 1).

Classes (role, signature mechanic, progression shape, one line each where code shows it):
- Armsman (Albion): melee tank line. Auto-trains Slash and Thrust; trainable Crush, Polearm, Shields, Two Handed, Parry, Crossbows; promotion weapon templates for sword and polearm (crates/caer-protocol/src/class_catalog.rs lines 289-318). Progression: specs bought with a trainer.
- Mauler (one name, three realms): hybrid with a different career key set per realm (Albion MaulerAlb, Midgard MaulerMid, Hibernia MaulerHib; career.rs lines 725-760). Shape: same name, different base class and race list per realm.
- Necromancer and Bonedancer (pet classes): pet rules are recorded as UNKNOWN in code (crates/caer-world/src/cfx/pets.rs lines 4 and 16). The shade swap and the commander minion array are not in the pet window packet. Do not copy; the code says they are not known.
- Career-key families (occurrences of each key string in career.rs, a rough count of rows): CharacterStyleUserCareer 29, CharacterQuickcastUserCareer 12, PureTankCareer and LightTankCareer on tank lines, StalkerCareer 4 and AssassinCareer 3 on stealth lines, cloth casters (AlbClothCasterCareer 9, HibClothCasterCareer 8, MidClothCasterCareer 5). These are the ability-usage flags, not the ability lists.
- Race list is per class (eligible races field on each row). Gender locks exist for some races and classes (career.rs lines 140-151).

Stat creation curve (crates/caer-protocol/src/starting_stats.rs lines 14-15 and TIERS at line 35): each stat above its race base costs 1 point up to +10, 2 points from +11 to +15, 3 points beyond +15. Total spent must be exactly 30 (crates/caer-protocol/src/charcreate.rs line 7 and its test at line 694: progressive_cost(16) = 23). This is a rising marginal cost, not a flat budget.

Factions: realm (Albion, Midgard, Hibernia) is the only faction layer in the client half. Realm rules sit in career.rs lines 14-16.

## 3. Weapons

Weapon families: not in the client half as data. crates/caer-protocol/src/weapon_armor.rs is a stats packet (weapon damage times 100, weapon skill, armour factor), not a weapon table.
Count: weapon families = null.
Visible weapon data that IS on the wire (crates/caer-protocol/src/equipment.rs, lines 1-40 and 57-61): per item a model id, an optional dye or emblem texture, an optional effect id (glow), and a count of visible active weapon slots. The renderer reads model and slot. A grep of crates/caer-render/src finds no read of the effect field; entities.rs mentions the effect only in a comment (line 3169).
Top 5 striking: none could be verified as a weapon family. Two real presentation facts are worth keeping:
- Weapon damage shown with two decimals from a times-100 integer (weapon_armor.rs, display helper).
- Visible active weapon slot count, so a two-weapon character shows both weapons (equipment.rs line 1 wire layout).

## 4. Armour / gear

Sets: no set table in the box. Gear is a per-slot model-variant system, not a set list. Count: gear_sets = null.
Tiers: armour tier is the extension byte on the torso, arms, legs and feet slots. The renderer keeps only the numbered mesh parts that match the tier (crates/caer-render/src/entities.rs lines 2755-2760; tier 0 is treated as 1; part names begin with Body, Arms, Legs or Boots, then a number). Number of variants per part is not in the box.
Materials: figure and monster meshes carry no internal texture, only a material colour (crates/caer-assets/src/monsters.rs line 19). The static and model shader crates/caer-render/src/mesh.wgsl has one two-sided diffuse term; a grep of mesh.wgsl finds no specular, rim or metallic term (skinned.wgsl not read). So metal, gold and crystal looks are not in the static model path we could see. Gold in the code is currency only (crates/caer-protocol/src/money.rs line 1 area).
How the game shows tiers: a different mesh part, not a colour or a glow. The visible tier comes from the extension byte.
Other gear presentation on the same packet: cloak and helm hidden bits, a hood-up bit, a quiver slot, a guild-emblem bit on cloak and left hand (crates/caer-protocol/src/equipment.rs lines 3-20 wire layout).
Top 5 striking (only these are real):
1. Per-slot armour tier by mesh part number (keep the per-slot byte, change to our own variants).
2. Hood-up and helm-hidden bits on the same record (keep as cheap visual toggles).
3. Dye texture id per item (keep as a per-item tint slot).
4. Emblem bit on cloak and left hand (keep as a claim slot that shows a crest).
5. Glow effect id per item (decoded but not drawn, see section 6).

## 5. Zones / dungeons

Zone names: 473 name arms, 316 distinct names (crates/caer-world/src/zone_names.rs, generated from the OpenDAoC zone XML; line 1). Zone offset table: 476 rows (crates/caer-world/src/zone_offsets.rs header). Some names repeat across the table: "Dark Cavern", "Damp Cavern", "Burial Tomb", "The Cursed Barrow", "Forgotten Mines", "Unused Mine", "The Accursed Caves" and "the Sundered Tombs" each appear 8 times (names, not ids).
Zone classes (constants with the comment that they were counted on an unmodified 1.127 tree; not re-counted by me): surface 96, dungeon 281 (line 27), skycity 17, interior 5, primary total 399 (crates/caer-world/src/dungeon_zones.rs lines 22-31).
Biome and dungeon archetypes (from name patterns only):
- Barrows, tombs, crypts (Cursed Barrow, Burial Tomb, Sundered Tombs, Hidden Crypt, Lower Crypt, Steward's Crypt).
- Caves and caverns (Dark Cavern, Damp Cavern, Accursed Caves, Koalinth Caverns, Vendo Caverns).
- Mines (Forgotten Mines, Unused Mine, Tepok's Mine, Midgard's and Hibernia's Abandoned Mines).
- Lairs and pits (Cetus' Pit, Pit of Despair, Lair of Doom, Lair of the Demon Lord, Master's Lair, Cursed Lair, Nisse's Lair).
- Sanctuaries (Keeper Iraeda's and Keeper Garran's Sanctuary).
- Sea and sound zones (Oceanus Notos, Hesperos, Boreal, Anatole; Lamfhota's, Munin and Constantine's Sound).
- Ruins and islands (Ruins of Atlantis, Ashen Isles, Isle of Glass).
- Mountain and marsh (Snowdonia, Pennine Mountains, Avalon Marsh, Bog of Cullen).
Dungeon mechanism (crates/caer-assets/src/dungeon.rs lines 1-12; crates/caer-render/src/dungeon_mesh.rs lines 1-20): a dungeon zone is a palette of chunk models (one model file per line, zero-based index) plus placement rows (position, angle, axis, scale, flags) plus prop rows. A zone with zero rows is empty and fails coverage. Canonical example: Stonehenge Barrows, zone 19 (dungeon_mesh.rs line header table).
Hazards: none found in the client half (hazard data would be server or data-pack side). Not read.
Sky per zone: two colours per time of day, zenith and horizon fog, from INI sky files (crates/caer-assets/src/sky.rs line 8 onward). The fog colour doubles as the horizon.
Ambience per zone: a sounds.dat per zone with sound regions, shapes, time windows and weather gates (section 6).
Top 5 striking: Ruins of Atlantis (sea-ruin mood); Stonehenge Barrows (the canonical palette dungeon); Oceanus Anatole and the other ocean zones (sea-plane zones; the ocean plane is drawn globally, crates/caer-render/src/atmosphere/ocean.rs); Ashen Isles (island-with-ash mood, name only); Isle of Glass (name only). Only the Barrows entry has a read mechanism; the rest are name-only.

## 6. Item and effect looks worth recreating

- Translucent water surface. Technique: alpha 0.62 flat surface drawn last, lighting floor of 0.15 and a dynamic light weight of 0.35 (crates/caer-render/src/water.wgsl line 40 and the lighting lines above it). Depth write is ON in the pipeline (crates/caer-render/src/gpu.rs lines 1414-1420). The water.wgsl header (line 2) says depth write is OFF. That header is stale. The pipeline comment is the truth.
- Soft additive sprite for effects. Technique: camera-facing quad, premultiplied soft blob, additive blend. The texture is an honest placeholder, not game art (crates/caer-render/src/particle_billboard.wgsl line 2; crates/caer-render/src/particles.rs header and the PARTICLE_BILLBOARD_PLACEHOLDER constant).
- Two-sided diffuse shade. Technique: absolute value of normal dot light, times texture, with ambient and dynamic light from the atmosphere tables (crates/caer-render/src/mesh.wgsl line 95).
- Sky gradient from two colours per time of day (crates/caer-assets/src/sky.rs line 8).
- Glow item effect id: decoded per item (crates/caer-protocol/src/equipment.rs line 61) and stored on the world item (crates/caer-world/src/lib.rs around line 671), but the renderer does not draw it. This is a gap, not a look. Worth keeping as a data field for our rare-item glow.
- Spell sounds split into cast and land (crates/caer-render/src/event_audio/spell.rs header and the two constants): a cast bed on the cast packet, a land hit on the effect packet, and the land sound is suppressed when the packet says no sound or failed.
- Icon list for buffs and debuffs with remaining seconds and a negative flag (crates/caer-protocol/src/effects.rs header, lines 1-24).
- Combat text: system-message classes decide what goes to the combat log; damage is attributed by direction, not by entity (crates/caer-render/src/combat.rs lines 1-20).
- Palette fold for skinning: posed bones are streamed once and a compute pass folds the inverse-bind matrices (crates/caer-render/src/palette_fold.wgsl lines 1-10). Uniform scale only.

## 7. Inspiration for Frankendom (originals, never copies)

1. Name: Slot-tier armour. Idea: a per-slot tier byte picks which numbered mesh variant shows (torso, arms, legs, boots), with tier 0 read as 1. Keep: per-slot byte, base layer fallback. Change: our own tier rows in data (no DAoC part names); a visible crest on the top tier only.
2. Name: Visual scale row. Idea: every creature has a percentage scale field (100 = as authored) so oversized imports are fixed in data, not in code. Keep: the percentage field and the default of 100. Change: a QA check that fails any creature whose silhouette is wider than the 375-wide fight frame.
3. Name: Region ambience scheduler. Idea: each region has a shape, a time-of-day window, a weather gate, and either a fixed or ranged spacing for one-shots. Keep: shape plus window plus weather plus spacing. Change: a seeded random interval per sound (the donor's ranged spacing is a counter, see section 8), our own sound names, a cross-fade at region borders.
4. Name: Palette dungeon. Idea: a dungeon is a palette of pieces and a list of placements; an empty list means an empty zone and fails a check. Keep: palette, placement rows, the empty-zone check. Change: ring arenas with our own pieces; a hit radius per placement instead of a mesh bound.
5. Name: Rising stat-point cost. Idea: raising a stat costs 1 point for the first 10 points, 2 for the next 5, and 3 beyond; the budget must be spent exactly. Keep: a marginal cost that rises at two thresholds and an exact-spend rule. Change: our own thresholds and budget for hero creation; a live cost readout on the stat bar.
6. Name: Water pool drawn last. Idea: a translucent flat surface drawn after everything else with one blend layer and depth write on. Keep: drawn last, one layer, depth write on (the code is right and the header is wrong). Change: a darker rim, a ripple from the hit point, and a six-second fade for a blood pool.
7. Name: Corpse stays, living draw skips. Idea: a dead entity stays as a corpse and the living draw skips it on a flag, not on zero health. Keep: the flag as the single switch. Change: our own fade and a ghost pose later.
8. Name: Glow slot on items. Idea: an item record carries an effect id that a glow shader reads. Keep: the per-item effect field. Change: our own glow shader (rim plus slow pulse) for rare tier items only, shown in the phone inspect view.
9. Name: Split spell sounds. Idea: cast and land are separate sound events; land is suppressed on failure. Keep: the split and the suppression. Change: our own sound names and a short tail on the land event.
10. Name: Buff icons with a negative flag. Idea: each icon has a remaining-seconds count and a flag that marks it as a debuff or crowd control. Keep: the flag and the countdown. Change: our own icon strip and colour for crowd control, separate from damage over time.

## 8. Defects found while reading (keep the idea, fix the defect)

- Ambience spacing comment says random; the code uses a counter. crates/caer-render/src/audio_bus.rs line 703 computes lo + (salt mod span), with salt incremented each time (line 702). This is deterministic and cycles. The doc at crates/caer-assets/src/zonesounds.rs line 46 says random. Fix: a seeded random draw per sound. Decision: adapt (idea kept, defect fixed in our sketch).
- Water header says depth write off; the pipeline turns depth write on on purpose (gpu.rs lines 1414-1420). Fix: trust the pipeline comment; correct the header.
- Glow effect id decoded and stored but not drawn. Fix: draw it in our own shader; keep the field.

## Not read / unverified
- The gamedata CSVs (monsters, anims, skins, fig3 tables) are not in the box. Creature families, weapon and gear sets, and per-class ability lists are NOT countable here.
- Most .rs bodies in caer-protocol (only headers and selected bodies), caer-world tests, caer-render goldens (five PNGs, class C, not opened), the login capture (crates/caer-world/tests/fixtures/rustdaoc_login_20260714.bin, not opened), and the Cargo.lock.
- The string table data (data/client_tables/key_names.tsv, 38 non-comment lines including the header) and the keyboard tables were counted only. Not reused: class C retail-derived names.
- The 281 dungeon and 96 surface counts are the author's constants; not recounted.
- The server half and the paired donors (OpenDAoC-OpenDAoC-Core, Dawn-of-Light-DOLSharp) were not read.
