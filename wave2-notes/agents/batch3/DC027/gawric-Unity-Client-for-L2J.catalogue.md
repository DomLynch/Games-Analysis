# gawric-Unity-Client-for-L2J (catalogue, DC027)

Donor root: /mnt/frankendom-donors/gawric-Unity-Client-for-L2J/ (VPS, read-only).
Half read: CLIENT (Unity project l2-unity/) plus its matching DATA pack (l2-unity/Assets/StreamingAssets/Data/Meta, and Resources/Data for shaders, effects, maps). Read with the AU022 asset audit first.
Server half (L2J Acis or Mobius, README.md:31): not in this box. Not read. No paired server donor was found in the box.
Licence (from files): code Apache-2.0 (LICENSE:2, :191). Art and armour: no licence file. The armour docs say textures and meshes are imported from a Lineage 2 Interlude client (l2-unity/docs/convert-armor/README.md:3). Class C: category-level inspiration only. Dom's rule: recreate as a clearly distinct original, never a copy. Every brief names the trait kept and the trait changed.

Confidence: counts below are from my own reads of the data tables (not the audit). The numeric codes in the interlude tables are mapped only where marked "inferred".

## Counts
| Group | Count | Source |
|---|---|---|
| NPC rows (Npcgrp_Classic.txt) | 5,652 | line count of npc_begin rows |
| Rows with an HP bar (type monster_normal + hide) | 5,112 (1,415 + 3,697) | npc_type field, EntityIdentity.cs:83 |
| Service and citizen rows | 540 (467 citizen_normal, 42 warehouse, 20 gatekeeper, 11 teleport) | npc_type field |
| Distinct monster class_name values (LineageMonster*) | 609 | Npcgrp_Classic.txt |
| Weapon rows (Weapongrp_interlude.txt) | 1,313 | line count |
| Armour rows (Armorgrp_interlude.txt) | 1,014 | line count |
| Item name rows (Itemname-e_interlude.txt) | 9,244 | line count |
| Playable class enum values (CharacterClass.cs) | 58 | enum count |
| Race and character templates (chargrp.txt) | 14 rows (7 models x 2 sexes) | line count |
| Zones or dungeons | 0 zone records; 3 dungeon-type ambience families | TalkingIslandAmbientSounds.json |

## 1. Creatures and beasts

Families (client data):
- Monster series by class prefix (Npcgrp_Classic.txt): LineageMonster base 2,849 rows; LineageMonster2 380; LineageMonster3 178; LineageMonster5 56; LineageMonster13 52; LineageMonster4 41; LineageMonster7 27; LineageMonster9 21; LineageMonster6 8; LineageMonster12 8. The numbered series look like add-on sets (inferred from the names; not confirmed).
- Creature word families (distinct class_name values containing the word): giant 22, skeleton 18, golem 10, zombie 9, drake 9, bear 9, wolf 7, ghost 5, spider 4, basilisk 2, undead 1, elemental 1, dragon 0. Several of these are real families with several variants each.
- Escalation with level (monster_normal rows joined to the NpcName level tag): rows per 10-level band: 1-10 97; 11-20 193; 21-30 182; 31-40 152; 41-50 191; 51-60 122; 61-70 112; 71-80 103; 81-82 10.
- HP escalates with level. Median org_hp per band: 1-10 about 132; 11-20 about 347; 21-30 about 578; 31-40 about 977; 41-50 about 1,499; 51-60 about 2,138; 61-70 about 2,448; 71-80 about 3,638; 81-82 about 102,844 (only 10 rows, not a reliable median). That is about 27x from the first band to the 71-80 band (N3).
- Tiers by nick tag (NpcName_Classic-eu.txt): Raid Boss 242 rows; Raid Fighter 339 rows (the elite tier); Quest Monster 271 rows; Guard 99 rows.
- Boss halo: 25 Npcgrp rows carry the raid-boss halo deco (23 halo_a, 2 halo_b). Halo scale multipliers in those rows run from 0.5 to 2.0 (receipts N4, N5). Movement speed (npc_speed) on those rows runs from about 0.85 to 2.86 (receipt N6).
- Race taxonomy for creatures: InterludeRace enum (InterludeRace.cs:5-31) has 23 values: 5 playable races plus 18 others (animal, beast, bug, castle guard, construct, demonic, divine, dragon, elemental, etc, fairy, giant, humanoid, mercenary, none, plant, siege weapon, undead). The per-NPC race value is not in the client tables I read, so I did not count creatures per race (not read: server side).
- Monster drawscale is the default sentinel (-1.0) on 5,469 of 5,652 rows. Only a few rows set an explicit scale.

Signature behaviour: NOT IN CLIENT DATA. attack_effect is the same generic effect on 5,651 of 5,652 rows (LineageEffect.p_u002_a). Attack sound sets: 28 distinct sets. Real behaviour is server-side (not in box). Each top creature below marks behaviour as "not read".

Top 8 most striking (own labels; silhouette at 375 px, one signature, one sound or effect; recreate as distinct originals at 20-30% mood resemblance):
1. Halo-marked raid tier. Why: a rank halo anchored to a bone reads at distance, so the top tier is obvious. Keep: bone-anchored halo only on the top tier, scale set per creature in data. Change: our own sigil ring, our own colour. Ref: Npcgrp_Classic.txt:1581 (halo_a row), :1853 (halo_b row); NpcName_Classic-eu.txt:1581 (raid tag).
2. Winged serpent boss, the fastest row in the halo set (npc_speed about 2.86). Why: speed is a readable threat cue for a boss. Keep: a fast flying boss read. Change: wing and body design. Ref: Npcgrp_Classic.txt:1770 (npc_speed field); NpcName_Classic-eu.txt:1770 (raid tag). Behaviour: not read.
3. Stone golem line. Why: heavy slow silhouette family, 10 class variants. Keep: large body, low speed read. Change: our own rock forms and gait. Ref: Npcgrp_Classic.txt:16, :83.
4. Skeleton line. Why: 18 variants, the largest undead sub-family in the monster set. Keep: many variants on one skeleton. Change: our own undead design and sound. Ref: Npcgrp_Classic.txt:22, :35.
5. Friendly helper with a buff aura. Why: friend and foe read apart by aura versus halo. Keep: a friendly aura that differs from the boss halo. Change: palette and shape. Ref: Npcgrp_Classic.txt:2599 (u_npc_id_buff deco); NpcName_Classic-eu.txt:2599 (helper name row).
6. Seasonal snow-decorated NPC. Why: event decoration swaps per event. Keep: a deco slot on the NPC row that an event can fill. Change: our own event decor. Ref: Npcgrp_Classic.txt:5311 (u_event_snow deco).
7. Elite raider tier (Raid Fighter tag, 339 rows). Why: a middle tier between normal and boss, which makes escalation readable. Keep: a three-tier read (normal, elite, boss). Change: colours and marker. Ref: NpcName_Classic-eu.txt:1548.
8. Quest-marked monster (Quest Monster tag, 271 rows). Why: tells the player what matters. Keep: a visible quest mark on the row. Change: our own marker shape. Ref: NpcName_Classic-eu.txt:1143.

## 2. Classes, races, factions
- Races (CharacterRace.cs:5-12): Human, Elf, Dark Elf, Orc, Dwarf, Monster. Character models in chargrp.txt: 7 base models (fighter, dark elf, dwarf, elf, magic, orc, shaman) x 2 sexes.
- Classes (CharacterClass.cs:6-71): 58 classes, 0x00 to 0x39. Enum order groups them by race: human (0x00-0x11), elf (0x12-0x1E), dark elf (0x1F-0x2B), orc (0x2C-0x34), dwarf (0x35-0x39). The names suggest promotion steps under each base (inferred; the promotion tree data is not in the client and was not read).
- Client registration (MapClassId.cs:22-40): only 9 active class registrations (one line is commented out): fighter and mage for human, elf, dark elf and orc, and a fighter-only dwarf. The mage flag (MapClassId.cs:24, true for mage) marks the caster branch.
- Role mechanic: the README says the combat system is physical attack only (README.md:41). Mage and warrior animation sets were added (README.md:64).
- Factions: none as data. Guard tags (99 rows) and town-name tags (about ten towns, not counted exactly) show the town groups.

Progression shape: base class, then promotion steps, each step unlocks a new class value. Shape only; promotion data not in the client.

## 3. Weapons
- Families by mesh (wpn_mesh[0], Weapongrp_interlude.txt): blades (sword, bastard sword, katana, shamshir, saber, raid sword, sword of delusion); staves and spellbook focuses (apprentice staff 15, apprentice spellbook 27); bows (carnium bow 9 rows, long bow 7, short bow); daggers (knife, hell knife, fist blade); blunt and axe (war axe, poleaxe, hammer); shields (knight shield 11, composite shield 7). Drop bags (drop_sack, 33 rows) are in the same table.
- Type codes (weapon_type column, codes 0-8): 2 = 329 rows, 1 = 293, 8 = 134, 3 = 126, 0 = 107, 4 = 103, 6 = 93, 5 = 75. The enum names in WeaponType.cs do NOT map cleanly: the apprentice spellbook row has code 7, which the enum calls arrow. I did not map the names.
- Grade (crystal_type column, codes 0-5): none 224, D 189, C 384, B 241, A 207, S 68. Grade names come from ItemGrade.cs:2-9; the client shows the grade badge from AbstractServerItem.cs:164-190.
- Material (numeric; the client parser reads names only from text dat files, DatUtils.cs:100): inferred names by enum order for codes 0-22 (ItemMaterial.cs:2-27): 8 (oriharukon, 204 rows), 13 (bone, 110), 1 (steel, 100), 14 (horn, 56), 2 (fine steel, 51), 6 (gold, 39), 19 (scale of dragon, 23). Codes 47-51 are above the enum range and are not decoded.
- Special effect slot: 4 rows carry an effect field (rows 405, 545, 781, 964 of Weapongrp_interlude.txt).
- Set bonus: Itemname-e_interlude.txt has set columns, but the set format is not decoded in this pass. No client code reads set_ids or set_bonus (grep of Scripts: zero hits). Sets are data-only.

Top 5 striking:
1. Effect spear (row 405, item id 2507, grade D, effect NSpear). Keep: spear silhouette with an effect slot. Change: head shape and glow. Ref: Weapongrp_interlude.txt:405.
2. Top-grade winged blade (row 184, id 237, grade S). Keep: a single top-grade blade read. Change: blade shape and winged guard. Ref: Weapongrp_interlude.txt:184.
3. Hero twin blade (row 951, id 6620, grade S). Keep: dual-wield pair read. Change: our own pair design. Ref: Weapongrp_interlude.txt:951.
4. Spellbook focus (row 54, id 99). Keep: a book held as a caster focus. Change: book shape and page glow. Ref: Weapongrp_interlude.txt:54.
5. Ranged bow with shot effects (row 235, id 288, grade A). Keep: a bow silhouette paired with a shot effect. Change: limb shape and arrow glow. Ref: Weapongrp_interlude.txt:235; effect folder Data/Effects/shot_atk_simple.

## 4. Armour and gear
- Families (drop_mesh1, Armorgrp_interlude.txt): fighter body sets drop_mfighter_m001 to m012 (each with texture variants t02, t04, t15, t45 and so on); mage body sets (drop_mmagic_m006, m009); cloth jacket and trousers; accessories: rings 41 rows, necklaces 40, earrings 40, hairpin, clan crest cap (pledge cap), jewel box.
- Armour type (armor_type column): none 691, light 130 (code 1), magic 105 (code 3), heavy 88 (code 2). Names from ArmorType.cs:1-7.
- Grade (crystal_type column): none 292, D 119, C 109, B 254, A 191, S 49.
- Material (inferred names by enum order): 19 scale of dragon (350 rows), 17 chrysolite (154), 13 bone (101), 4 bronze (74), 2 fine steel (66), 3 blood steel (46). Codes 48 and 51 are above the enum range.
- Set bonus: data only (see weapons).
- Tiers shown to the player: grade badge (D to S) in the tooltip; no badge for none (AbstractServerItem.cs:164-190; ItemInstance.cs:283-301). Tier is shown by grade, not by material colour.

Top 5 striking:
1. Heavy top-grade plate (row 81, id 375, mesh drop_mfighter_m002_t15). Keep: heavy silhouette at top grade. Change: plate forms and palette. Ref: Armorgrp_interlude.txt:81.
2. Scale-coat light top-grade (row 117, id 411, material 19 inferred). Keep: light coat read at top grade. Change: scale pattern. Ref: Armorgrp_interlude.txt:117.
3. Magic-type top-grade robe (row 166, id 460, grade S). Keep: a caster robe read. Change: the cut. Ref: Armorgrp_interlude.txt:166. Note: the mesh is a fighter model; check by eye.
4. Clan crest cap (row 795, id 6834). Keep: a crest as a readable identity mark. Change: our own crest. Ref: Armorgrp_interlude.txt:795.
5. Ring accessory (row 49, id 116). Keep: small accessories as a rarity signal. Change: shape and gem. Ref: Armorgrp_interlude.txt:49.

## 5. Zones and dungeons
- Ambience families (TalkingIslandAmbientSounds.json, one zone, one line file): 4,158 emitters; 210 distinct sound names. Emitter types: AST1_Day 1,547, AST1_Night 1,440, AST1_Always 1,171. Families by count: insect day 1,064; insect night 989; waves 402; animal night 380; animal day 378; harbour 234; ship 221; wind 123; neutral zone 115; stream 72; dragon valley 43; fire 39; dungeon 36; town 20; speaking-island village 18; floran village 8; Cruma dungeon 3; magic school 3; dark elf dungeon 2.
- Emitter radius: most 80 (3,047 emitters); others 70 to 300. Random re-trigger value 0 to 80.
- Time of day: L2WorldAmbientLUT.csv (288 samples, about 5-minute steps), L2HazeLUT.csv (287 rows), L2CloudLUT.csv (288), L2ActorLightLUT.csv (288), L2TerrainIntensityLUT.csv (146 rows).
- Map tiles: 4 tiles (16_24, 16_25, 17_24, 17_25) under Resources/Data/Maps, with 4 matching Geodata files under StreamingAssets/Data/Maps/Geodata. README.md:17 says only the squares near the local player are loaded.
- Dungeon archetypes: dungeon, Cruma dungeon, dark elf dungeon (sparse ambience, 2 to 36 emitters). Hazards: no hazard table in the client; fire and dragon valley ambience only.
- Biomes: forest and insect (day and night), coast (waves, harbour, ship), plains (wind), water (stream), volcanic or fire (fire ambience), towns and villages.

Top 5 striking:
1. Day and night insect beds (1,064 and 989 emitters). Keep: the same bed swapped by time of day. Change: our own sound set.
2. Dragon valley ambience (43 emitters). Keep: a zone-as-sound identity. Change: our own sound.
3. Coast bed: waves, harbour and ship (402, 234, 221). Keep: layered coast with a moving prop (ship). Change: sound set.
4. Time-of-day table (288 samples). Keep: the per-hour look table as data. Change: palette.
5. Dark elf and Cruma dungeon beds (2 and 3 emitters). Keep: a sparse bed = a darker room. Change: our own dungeon sound. Weak evidence (small counts).

## 6. Item and effect looks worth recreating
- Gold-on-black ground drop: Assets/Resources/Data/Shaders/Items/L2DropMeshMasked.shader lines 1-4 (intent) and line 73 (clip of dark texels). A drop mesh clips dark pixels so only the gilt reads.
- Raid-boss halo: deco effect ra_boss_halo_a_ca, bone-anchored (Npcgrp_Classic.txt:1581; Assets/Resources/Data/Effects/deco/README.txt lines 1-16). Feet glow versus head ring is set by the deco height (deco README line 4).
- Despawn fade: Assets/Resources/Data/Shaders/Actor/L2ActorFade.shader line 2 (255 to 0 over 2 s) and line 87 (alpha).
- Crystal and ice: L2_Shader_Property_Catalog.md lines 43-45 list an ice effect with an environment cube and a specular mask (crystal-like reflection).
- Batched nameplates: README.md:19; Assets/Scripts/Rendering/L2FxCompositor/L2NameplateOverlayQueue.cs lines 54-61.
- Weapon effect slot: Weapongrp_interlude.txt rows 405 and 781 (effect NSpear). README.md:60 gives a sword-sharpening glow as the example effect; README.md:73 shows a sword-glow preview image.
- Skill effect folders (Assets/Resources/Data/Effects): de_fire (glow textures de_fire_glow.png and LIGHT_GLOW01.png, haze material), el_ice_bolt, el_wind_strike, shield, vampiric, soul_N_stick, shot_atk_simple. About 40 top-level folders (audit count of 893 files, not re-counted).
- Snow NPC decoration: Npcgrp_Classic.txt:5311.

## 7. Inspiration for Frankendom (originals, mood only, 20-30% resemblance)
1. Rank halo boss tier: a bone-anchored ring that marks only the top tier; scale set in the creature data. Keep: bone anchor, per-creature scale, top tier only. Change: our own sigil and palette. (Parity row 7, creature actor.)
2. Gilt loot ground: a loot mesh whose dark texels are clipped so only gilt pixels read on the ground. Keep: the clip rule. Change: our glint and colour. (Row 18, loot roll.)
3. Dissolve on despawn: a 2-second alpha fade when a creature despawns on an empty zone. Keep: the 2-second fade. Change: our dissolve motif. (Row 23, zone population despawn.)
4. Hour-of-day zone mood table: per-zone table of 288 samples for haze, cloud and light, read by the renderer. Keep: 5-minute sampling, one table per zone. Change: our palette. (Row 16, colour grade.)
5. Three-type zone emitters: day, night and always emitters with a radius and a random re-trigger. Keep: the three-way split and the random re-trigger. Change: our sound set. (Sound-music fold-in; not a combat row.)
6. Feet-or-head NPC deco: a deco that sits at the feet as a ground glow or at the head as a ring, chosen by one height field. Keep: the height split. Change: shapes. (Rows 7 and 8.)
7. Friend aura versus enemy halo: a friendly helper gets an aura that never looks like a boss halo. Keep: the distinct read. Change: colour. (Row 14, HUD.)
8. Grade badge only when graded: a D-to-S badge in the tooltip, none shows no badge. Keep: no badge for ungraded gear. Change: our badge shapes. (Row 15, gear dressing.)
9. Level HP curve: monsters' HP rises about 27x from the first band to the 71-80 band. Keep: a steady climb per band. Change: our own curve. (Row 21 catalogue fields and row 18.)

## Not read
- Assets/Scripts C# (only the named files above were read; directory listing only for the rest).
- Server half (not in box). Interlude server-side monster AI and skill lists (not read).
- Docs/Ui.md and Docs/Ui_Interface.md (named only).
- Classic data tables: Armorgrp_Classic.txt (4,462 rows) and Weapongrp_Classic.txt (1,675 rows) counted, not decoded. Skillgrp_Classic.txt (15 MB) and SkillName tables not decoded.
- Npc_deco_effects.csv (479 rows): header read only.
- Binary and art files (PNG, TGA, FBX, meshes, FMOD banks, Unity scenes and prefabs): counted or listed, not opened.
- Terrain and intensity grid .bin files: sizes only.
- Video links in README.md.
