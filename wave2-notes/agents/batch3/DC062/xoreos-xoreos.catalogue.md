# xoreos-xoreos (design catalogue, DC062)

Donor: /mnt/frankendom-donors/xoreos-xoreos (VPS, read-only). Licence: GPL-3.0-or-later for the code (COPYING; dists/debian/copyright "Files: *"). Icon dists/win32/xoreos.ico is CC-BY-SA-3.0 per the packaging file. Embedded font src/common/systemfonts.cpp carries Bitstream Vera / Arev licence texts in doc/. Clean-room: shape and idea only, no code is copied into Frankendom.

Half read: ENGINE (src/engines enum and type headers, src/graphics model and shader code, src/sound bank parsers, src/aurora field tables, src/engines/sonic/areaminimap.cpp). Data half (the user's own game archives: .2da, .rim, .mdl, .ncs, area files) is NOT in the box, so every creature, item and zone row below is a name or enum from code, not a game data row. Paired data donor in the box: none.

Rule for every idea below: recreate as a clearly distinct original at about 20-30 percent resemblance in mood, never a copy. Each idea names the trait KEPT and the trait CHANGED.

## Data first
- Data tables in the box are code headers that mirror game tables: kotorbase/types.h (class, race, faction, skill, slot enums), nwn2/types.h (ItemType 109 entries, ItemPropertyType about 92, CClass 12, Feat about 68 entries), dragonage/types.h (Worksheet 13 entries: animations, abilities, appearances, classes, projectiles, races, items, portraits, visual effects, sounds, naked variations, placeables, waypoints), aurora/gff4fields.h (about 2,493 numeric GFF field IDs by grep count; area environment, grid and sunlight fields at lines 95-378).
- String table: src/aurora/language_strings.h kLanguageNames (line 30) lists 13 language names and a per-language filename-token table. No translation file (.po) is in the box.

## 1. Creatures / beasts
Counts: 3 creature families named in code. No creature table, no creature art, no boss pattern in the box (grep for boss, elite, champion found only script function names).
- Summoned beast companions (wolf, spider, bear): src/engines/dragonage/dragonage.cpp lines 230, 232, 233 index three ability archives named for each beast (summonwolf, summonspider, summonbear). Summoned creatures are an associate type (src/engines/nwn/types.h line 245, kAssociateTypeSummoned) with a remove call (nwn script function table).
- Not read: the beasts' models, stats, AI and sound (in the game archives).

Top striking (applied criteria: silhouette at 375 wide, one signature behaviour, one signature sound, 20-30 percent resemblance). Silhouette and sound could not be checked; listed for the behaviour only.
1. Caster-bound beast summon (wolf-type). Why: a companion tied to its caster and removable by a call, so the summon is a tool, not a pet. Keep: the caster-owned associate and the remove call. Change: our beast is a pack runner with a distinct silhouette and its own sound. Ref: dragonage.cpp:230; nwn/types.h:245.
2. Caster-bound beast summon (spider-type). Why: same mechanism, different body plan. Keep: the ability-archive-per-beast layout. Change: a skitter with a web-line attack, not a copy of any beast. Ref: dragonage.cpp:232.
3. Caster-bound beast summon (bear-type). Why: a heavy companion next to the fast one gives a readable size contrast. Keep: one companion slot per caster. Change: a short-lived brute with a telegraphed slam. Ref: dragonage.cpp:233.

## 2. Classes / races / factions
- KotOR-family class enum: 17 entries (src/engines/kotorbase/types.h lines 127-145, sentinel at 147). Groups by name: 9 base entries (soldier, scout, scoundrel, three force-user paths, two droid types, one minion type); 8 later entries (tech specialist, bounty-hunter type, three light-side force specialists, three dark-side paths). Role and mechanic: from the enum names only; the rules are in the 2DA tables (not in box). Progression shape: not in box.
- NWN2 classes.2da class enum: 12 entries (src/engines/nwn2/types.h lines 329-340). Own-word roles from the names only: heavy melee, support caster, healer caster, nature caster, martial generalist, unarmed monk-type, holy-knight type, ranged skirmisher, rogue, spontaneous arcane, study arcane, pact caster. Progression shape: not in box.
- Races: 6 base races plus unknown, all, and invalid sentinels, and 1 sub-race (kotorbase/types.h lines 150-165).
- Factions: 19 real factions plus an invalid sentinel (kotorbase/types.h lines 167-191). Shape: hostile, friendly and neutral sides, plus predator, prey, rancor-type, surrender and planet-specific groups. Relation table: ReputationType (kotorbase/types.h line 281) has friend, enemy, neutral. Use for many-on-one target choice.

Counts: classes 29 (17 KotOR-family plus 12 NWN2). Races listed separately (6).

## 3. Weapons
- Base weapon names: ItemType in src/engines/nwn2/types.h lines 107-231 (109 entries in total). About 45 entries match weapon-like name patterns (blades, axes, hammers and maces, flails, polearms, bows, crossbows, thrown, staves, wands). The count is by name pattern, not hand-split; it includes ammunition.
- Families seen in names: one-handed blades and two-handed blades; axes (hand, battle, great, throwing); hammers, maces, flails; polearms; bows and crossbows with their ammunition; thrown and sling weapons; staves and wands; daggers and short blades; creature natural weapons (four types: slash, pierce, bludgeon, slash-pierce; nwn2/types.h lines 69-72); giant-scale blades and axes; two demon-themed blades; a racial waraxe.
- Special properties (ItemPropertyType, src/engines/nwn2/types.h lines 345-438, about 92 entries including a sentinel): extra melee damage type (line 379), extra ranged damage type, on-hit cast spell (line 428), damage reduction (line 436), damage bonus and attack bonus vs racial or alignment group, life-steal type regeneration (line 413), bonus hit points (line 412), spell resistance, immunity by school.
- Elemental and set bonus: elemental damage is a per-weapon property (extra damage type); no set-bonus table found (grep for itemset, set bonus, kArmorSet returned nothing in the read dirs).
- Visual tiers: no tier art in the box.
Top 5 striking (criteria as above; visuals not read):
1. On-hit spell weapon (line 428). Why: a weapon that fires a spell on hit gives a second readable effect. Keep: on-hit trigger as a property row. Change: our on-hit is a short spark arc, not a named spell.
2. Elemental melee property (line 379). Why: the weapon carries a damage type, so one blade can change matchup. Keep: damage type as a property. Change: three elements of our own, shown by a colour glint and a sound.
3. Creature natural-weapon classes (nwn2/types.h lines 69-72). Why: monsters have their own weapon family, so enemy hits read differently. Keep: separate weapon family for creatures. Change: claws and bites tied to our beast silhouettes.
4. Giant-scale blade family (nwn2 CGiant entries). Why: oversize weapons read at a distance. Keep: scale as a family. Change: a shape change, not a size change only.
5. Reputation relation table (kotorbase/types.h, ReputationType). Why: a three-state relation (friend, enemy, neutral) decides who the blade hits. Keep: three states. Change: our states feed the engine hate list (MAX_ATTACKERS = 3).

## 4. Armour / gear
- Modular armour: 19 parts (src/engines/nwn/item.h lines 73-92): head, neck, torso, pelvis, belt, both feet, both shins, both thighs, both forearms, both biceps, both shoulders, both hands.
- Material channels: 6 colour channels, metal 1-2, leather 1-2, cloth 1-2 (src/engines/nwn/item.h lines 42-50). How a channel is applied per part or per item is not read. Tiers are not in the box.
- Equip slots: 15 named slots (src/engines/kotorbase/types.h lines 215-232): head, body, hands, two weapon slots, two arm slots, implant, belt, three creature-weapon slots, creature armour, two second-weapon slots.
- Gear sets: 0 named sets in the box (no set-bonus data).
- Gilt and metallic look: see section 6 (env-map pass, glow map, specular fields).
Top 5 striking:
1. Per-part armour (19 parts). Why: separate parts let a set show tier by which parts are upgraded. Keep: per-part slots. Change: 12 slots of ours, mix-and-match tiers, no copy of the part list.
2. Material channel per part (metal, leather, cloth, two each). Why: a readable material read without new art. Keep: two shades per material. Change: the material set is ours (gilded metal, bone, oiled cloth).
3. Gear slot with a second weapon set (slots 18 and 19). Why: a swap slot makes weapon swaps a readable action. Keep: second slot for weapon swap. Change: swap is a quick action with a sound cue.
4. Implant slot (kotorbase slot 9). Why: a body-mounted slot is a distinct gear family. Keep: a separate slot. Change: a charm slot for our zone relics.
5. Creature armour slot (kotorbase slot 17). Why: monsters carry armour in their own slot. Keep: separate slot. Change: a natural-armour shell for beasts.

## 5. Zones / dungeons
Counts: 5 area archetypes inferred from field names (not read from data files):
1. Sunlit outdoor area: environment settings (gff4fields.h line 104), sunlight enabled (line 264), sunlight colour and direction, skydome model, local and global wind lists.
2. Interior with roof cutoff: cutoff height (line 244) and cutoff system switch, force character lighting.
3. Gridded room interior: area grid with rooms, links, cell size, clearance and abstract sectors for pathfinding (gff4fields.h lines 175-236).
4. Chunked terrain: chunk row and column counts, chunk width and height (gff4fields.h lines 237-243).
5. Area-of-effect and trigger zones: object types (src/engines/kotorbase/types.h lines 33-43): creature, item, trigger, door, area-of-effect, waypoint, placeable, store, encounter, sound.
Hazards: trigger and area-of-effect object types, by name only. No hazard data in the box.
Spawn: encounter object type (types.h line 42), a spawn-area type by name only; its behaviour is not read. Spawn caps and respawn are not in the box (row 23 not read).
Sound: sound object type (types.h line 43), a sound object by name only; its behaviour is not read.
Per-area minimap: src/engines/sonic/areaminimap.cpp (one image per area name, loaded from an NBFS and NBFP resource pair, shown or hidden; lines 44-68).
Top 5 striking (the data is not in the box; these are structure, not looks):
1. Per-area minimap card (areaminimap.cpp). Keep: one image per area, chosen by name, show and hide. Change: our map is generated at runtime with fog reveal.
2. Encounter object as a zone type (types.h line 42). Keep: spawn area as its own object type. Change: spawn caps and grace timer as zone data (row 23).
3. Sound object as a placed type (types.h line 43). Keep: sound as its own placed object type. Change: emitter radius per zone, not a looping file per emitter.
4. Interior roof cutoff (gff4fields.h line 244). Keep: height cutoff for indoor rooms. Change: an interior flag per zone instead of a height field.
5. Area grid rooms and links (gff4fields.h lines 175-236). Keep: rooms with neighbour links for pathing. Change: our rooms come from zone tiles, not stored grids.

## 6. Item and effect looks worth recreating
- Environment-map pass, "under" mode (src/graphics/aurora/modelnode.cpp lines 699-725). The mesh is drawn with the reflective environment map first, then drawn again with the diffuse texture on top. Gives a metallic read on a plated item without a new texture. Ref: modelnode.cpp:700-701, 708.
- Environment-map pass, "over" mode (modelnode.cpp lines 726-760). Diffuse first, then an env-map-only pass; per the comment the diffuse colour modulates the reflection. Ref: modelnode.cpp:727-728.
- Reflection UVs in the shader builder: cube reflection (shaderbuilder.cpp line 361) and sphere reflection (line 375). Gives a chrome or gilt sweep as a shader input, not a baked texture. Ref: shaderbuilder.cpp:361, 375.
- Per-mesh shininess and alpha defaults (modelnode.cpp line 70). Ref: modelnode.cpp:70.
- Glow map read per mesh (src/graphics/aurora/model_nwn2.cpp line 222), with specular power and value (lines 229-234; receipt at 233). A self-light mask per part, so a rune can glow without a light source. Ref: model_nwn2.cpp:222, 233.
- Music transitions in the XACT bank: crossfade, fade into a transitional sound, fade from it (src/sound/xactsoundbank.h lines 146-174; bank text parser xactsoundbank_ascii.cpp line 476). Use for a boss intro stinger and zone border crossfades (hud-ui and sound-music fold-in).
- Effects not read: frame-buffer effects and skydome shaders (gff4fields.h only lists the fields).

Looks list (label, technique, ref):
- Gilt env pass: two-pass env map under diffuse (modelnode.cpp:699-725).
- Gilt env pass, over mode: diffuse then env-only pass (modelnode.cpp:726-760).
- Glow mask: per-mesh glow map (model_nwn2.cpp:222).
- Specular highlight: power and value per mesh (model_nwn2.cpp:233).
- Reflection sweep: cube and sphere UVs in the shader (shaderbuilder.cpp:361, 375).

## 7. Cross-link to our cell topics
- hud-ui: per-area minimap card (areaminimap.cpp 44-68); fallback debug font (systemfonts.cpp 38, our own pixel face only).
- sound-music: XACT transitions (xactsoundbank.h 146-174); per-event volume and pitch fades (xactsoundbank.h 216-232).
- progression, loot, spawns: encounter object type (types.h 42); property rows (nwn2 types 345-438). No drop ceremony, rarity colour or walk-density data in the box.
- idle and death: not in the box (creature animation data is in the game archives).
- readability at 375 wide: not read (no layout code for a phone width).
- Language: 13 language names (aurora/language_strings.h line 30).

## Inspiration for Frankendom (originals; keep / change)
1. Gilt plate pass (zone loot, rare armour). Keep: reflection drawn under the diffuse, so the plate reads as metal. Change: our reflection comes from a per-zone sky gradient, and the gilt tone is our own. Row 15 gear dressing.
2. Glow-mask rune (rare gear, boss weapon). Keep: a per-part glow mask that pulses without a light source. Change: our mask is in the sprite atlas, with a slow pulse curve that is not a copy. Row 16 colour grade, row 15.
3. Caster-bound beast summon trio (player spells, class kit). Keep: one caster-owned companion slot and a remove call. Change: our three beasts are a pack runner, a web skitter and a slow brute, each with its own sound. Rows 2 and 13 (specials).
4. Modular armour parts with material channels (gear tiers). Keep: 19-part style slots and two shades per material. Change: 12 of our own slots and a gilded-metal, bone, oiled-cloth palette instead of a generic metal set. Row 15.
5. On-hit and elemental weapon properties (loot affixes). Keep: properties as rows (on-hit spell, extra damage type, damage reduction). Change: three elements of ours, a spark arc on hit, and no named spells. Row 18 loot roll.
6. XACT-style transition stinger (boss intro, zone border). Keep: crossfade and fade-into a short transitional sound. Change: our stinger is a short sound sting with a ducked music bed. Row 12 combat sound cues.
7. Per-zone minimap card (hud-ui). Keep: one card per zone, chosen by name, shown or hidden. Change: fog-of-war reveal from zone geometry, with a touch corner toggle. Row 14 HUD.

## Licence note
Code under GPL-3.0-or-later (COPYING line 1; dists/debian/copyright). Font: Bitstream Vera and Arev licence texts (doc/). Icon: CC-BY-SA-3.0. Game data: none in the box. Our use is idea-only; no code copied.

## Not read
- The embedded font bytes (systemfonts.cpp, lines 38 to about 20760) and both icon binaries.
- src/aurora archive loaders (keyfile, biffile, erffile, rimfile) and their bodies.
- Per-game engine bodies beyond the enum and type headers (dragonage, nwn, nwn2, witcher, jade, kotor, creature and area code).
- Function tables (nwn and nwn2 script function tables) beyond the summon names.
- Frame-buffer effects and skydome shaders; sound decoders beyond the bank headers.
- doc/ (apart from the licence name), tests, external/ libraries, dists/ beyond the copyright file.
- Other half (game archives): not in the box.
