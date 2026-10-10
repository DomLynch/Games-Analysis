# Doddler-RagnarokRebuildTcp (catalogue, DC020)

Donor root (VPS, read-only): /mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/
Base paths used in this note (each reference is relative to the base named here):
- Db/, Script/, Skills/ = RoRebuildServer/GameConfig/ServerData/
- Monster.cs, ServerMapConfig.cs, MapSpawnRule.cs, MonsterSkillAiState.cs, DataLoader.cs = RoRebuildServer/RoRebuildServer/ (under Data/, EntityComponents/, Data/MapData/)
- Shaders/, Textures/, Materials/, Data/, DamageIndicator/ = RebuildClient/Assets/
- license.txt and README.md = donor root
Licence: custom non-commercial licence (license.txt line 1). Third-party MIT only for 3rdParty/LeanTween and 3rdParty Color picker. Project art and data are Ragnarok-Online-origin and are not in the repo (README.md line 5). Class C. Rule: recreate as a clearly distinct original, never a copy. Creature and item looks stay CATEGORY-LEVEL, and donor names are never reused as labels.

Which half was read:
- Server code (RoRebuildServer/RoRebuildServer): spawn rules, monster respawn, skill check, data loader. Read by line.
- Data pack (RoRebuildServer/GameConfig/ServerData): Db CSV tables, Skills TOML, Script .txt. Read as tables.
- Client half (RebuildClient/Assets): shader bodies (cited lines), FlyingText assets, texture and material listings only. Client C# scripts were NOT read. The client data text files (Data/SharedItemIcons.txt, Data/cardillustrations.txt) were only read through the asset audit AU016.

## Counts (from data tables)
- creatures: 335 monster rows (Db/Monsters.csv). 54 rows are Special=Boss. 20 rows have IDs 6000 and up, and 12 of those carry the donor's custom flag.
- classes: 26 playable job rows (Db/Jobs.csv, Id 0-25) plus 3 special rows. 13 job sections in Skills/SkillTree.toml.
- weapons: 503 rows (Db/ItemsWeapons.csv), 22 weapon types.
- gear_sets: 22 card-pair combo sets (Script/Items/ComboEffects.txt). No named armour sets were found in the tables read.
- zones: 276 map rows (Db/Maps.csv): Field 142, Dungeon 77, Indoor 31, None 14, Town 12. Plus 29 instance rows (Db/Instances.csv) and 18 dungeon warp files (Script/Warps/Dungeons).

## 1. Creatures and beasts
Families by Race column (Db/Monsters.csv): Beast 65, Insect 47, Demihuman 46, Demon 46, Formless 37, Plant 34, Undead 28, Aquatic 19, Angel 8, Dragon 5. Size: Small 98, Medium 166, Large 71.
Escalation with level: level bands 0-19 (55 rows), 20-39 (100), 40-59 (80), 60-79 (87), 80 and up (13).
Element values carry a tier digit 1-4 (for example Earth1 to Earth4), so the same element can come in four strengths.
AI: 14 AI classes in the Monsters table. The full state table is Db/MonsterAI.csv (360 rows; states such as idle, search, chase, attacking, flee, move-to-item).
Boss pattern: 54 bosses. Db/SpawnMinionTable.csv holds 54 rows across 36 bosses, each naming a minion type and a count.
Boss script (Script/MonsterSkills/Bosses.txt): a summon-and-hide boss, a volley of eggs every 200 ms (line 62), a hide-and-heal phase below 40 percent HP (lines 27-28), and a resummon rule after minions die (line 20).
Timed curse event (Script/Event/MiasmaDungeons.txt): a map-wide status applied on signal (lines 12-13), a 15-second timer (line 30), and three pyramid waves of respawning mobs (macros from line 42). The event file is gated by a config header (line 1).

Top 8 striking creatures (own labels):

1. Clutch-spitting hoard beetle (boss, Monsters.csv line 69, code GOLDEN_BUG; script Bosses.txt lines 18-75).
   Why: a telegraphed volley of small blips, one every 200 ms (Bosses.txt:62). Each egg lives about 5 s and has a 15 percent chance to become a summon (Bosses.txt:69-75).
   Keep: the volley rhythm; eggs as separate small targets; a hide phase under 40 percent HP.
   Change: our creature is a sand-crab that buries and sprays clutches; a three-beat volley; our own sound cue.

2. Winged sentinel quartet (four Angel bosses, Monsters.csv lines 333-336, IDs 6018-6021).
   Why: four bosses in one race, all on the standard boss AI, with close attack timings (480 or 420) and different element tiers (Neutral4, Dark3, Holy3, Holy3). One family, four identities.
   Keep: one family with shared timing; four element variants.
   Change: our names and our element set; only one sentinel attacks at a time.

3. Ant brood trio with larvae (IDs 6006-6011, Monsters.csv lines 323-328; summoned by a boss in SpawnMinionTable.csv:16-18).
   Why: three small fast soldiers plus larvae that assist. Many small units around one boss is a many-vs-one read.
   Keep: small assist units; the egg as a stationary plant-AI object.
   Change: our insect family; larvae drag toward the player instead of looting.

4. Spore-burst fungus (IDs 6013-6014, Monsters.csv lines 330-331; field spawn in Script/Spawns/gef_dun.txt:7).
   Why: a dense field of 90 spores with a 5-15 s respawn window (gef_dun.txt:7). Density reads as a hazard field.
   Keep: dense field with a short respawn; poison tiers 2 and 4.
   Change: a spore bursts into a fan on death; no damage over time; our own ground tint.

5. Silver-weak beast (ID 6003, Monsters.csv line 320; Tags column reads WeakToSilver).
   Why: weakness as a data tag. The player gets a reason to swap gear, and the tag can be read by any item rule.
   Keep: a tag-driven weakness.
   Change: our weakness element (for example ice); a visible tell on the creature.

6. Swarm summoner (Monsters.csv line 182, code DRACULA; SpawnMinionTable.csv line 2: 10 minions).
   Why: one large demon calls ten small flyers at once. Ten at once reads as a cloud at 375 wide.
   Keep: the big summoner with a fixed minion count.
   Change: our own flyers (a swarm of small winged shapes, not bats); our own call animation.

7. Rare large dragon (ID 4274, Monsters.csv line 277, code MUTANT_DRAGON; Dragon race has only 5 rows).
   Why: the race is rare, so the silhouette stays special. Large size class.
   Keep: rare race as reserved content; Large size class.
   Change: our dragon silhouette and element.

8. Top-tier ghost boss (ID 4048, Monsters.csv line 51, code GHOSTRING; SpawnMinionTable.csv line 22: 5 minions).
   Why: the only monster with the Ghost4 element tier (Monsters.csv:51 is the only Ghost4 row). A unique element tier gives an identity.
   Keep: a single top-tier element as identity; five minions.
   Change: our own ghost visual; a fade in and out instead of a fixed look.

Behaviour notes (not art):
- Monster respawn: each death picks a random time between min and max respawn (Monster.cs:797), with a floor of 0.4 s (Monster.cs:798-799).
- Spawn zones: each monster gets its own offset inside the spawn area when UseAccurateSpawnZoneFormula is set (ServerMapConfig.cs:71, 88-89).
- Skill chance: CheckCast rolls 0-999 against a chance value (MonsterSkillAiState.cs:457); cooldown is checked first (line 454).

## 2. Classes, races, factions
Shape (from Db/Jobs.csv and Skills/SkillTree.toml):
- Base class (cap level 10).
- Six first-tier classes (cap 50): sword melee with taunt and endure; archer with eye-buffs and volley; mage with elemental bolts and walls; acolyte with support and buffs; thief with stealth and ranged; merchant with a cart.
- Thirteen second-tier classes (cap 70) that extend the first tier. SkillTree.toml names six of them (knight, wizard, priest, hunter, assassin, blacksmith). The other seven were not found in SkillTree.toml and were not searched further.
- Three branch classes at cap 70 and three at cap 50.
- Three special rows (Id 499, 507, 513). Not used.
Progression is a skill tree: each skill lists prerequisites with a rank (SkillTree.toml line 16, MagnumBreak needs Bash at rank 5). About 220 skill sections exist in Skills/Skills.toml (header count). 78 status-effect sections exist in Skills/StatusEffects.toml.

## 3. Weapons
- 22 weapon types: dagger 69 rows, sword 51, rod 35, mace 34, 2H sword 33, bow 31, 2H spear 30, whip 26, katar 25, knuckle 25, book 24, 2H axe 23, plus guns, grenade, shuriken and instrument.
- Tiers by Rank column: rank 1 has 53 rows, rank 2 has 72, rank 3 has 198, rank 4 has 180. Level ranges overlap across tiers (rank 4 has minimum level 1), so the tier is a power band, not a level gate.
- Elemental: 91 of 503 weapons carry a non-neutral property (wind 22, dark 15, fire 13, holy 13, water 11, earth 9, poison 3, undead 3, ghost 2).
- Element swap: consumable items change the weapon element (Script/Items/MiscEffects.txt lines 2-3).
- Speed per class and weapon: Db/WeaponAttackTiming.csv (24 lines with header). Most cells are 1 to 1.6, but many cells read 4. The meaning of 4 was not verified.
- Refine: Db/RefineSuccess.csv (20 steps, four weapon tiers plus armour). Rows 1-11 were read: success falls from 100 to 10 or 20 percent by step 10-11.

Top 5 striking weapons and ideas (own words):
1. Rank-4 elemental blade (ID 1131, ItemsWeapons.csv line 25; water property). A top-tier blade with a clear element. Keep the element read; change the blade shape.
2. Gun family (Handgun, Rifle, Shotgun, GatlingGun, Grenade in ItemsWeapons.csv). Unusual in a fantasy set. Keep a distinct silhouette per type; sprites are not in the repo.
3. Element-swap imbue items (MiscEffects.txt lines 2-3). A consumable that recolours the blade by element. Keep the swap; change the aura and duration.
4. Class-by-weapon speed matrix (WeaponAttackTiming.csv). A data table of speed per class and weapon.
5. Magic books and rods (book 24 rows, rod 35 rows). Magic weapons with their own proportions.

## 4. Armour and gear
- Armour rows: Db/Armor.csv 581 (headgear 198, body 43, accessory 27, footgear 12, shield 10, garment 8, and 283 with no type). Db/ItemsEquipment.csv 555 rows.
- Material words in item names (weapons, armour, equipment): ice 20, glass 10, gold 9, golden 5, silver 3, mithril 1, crystal 1, diamond 1. Mythic metal tiers as data: none found.
- How tiers show: weapon Rank column, refine step, and a per-item sprite field (WeaponSprite on weapons). No material shader names in the client Shaders folder (checked by file name).
- Cards: 441 card rows (ItemsCards.csv). 440 card-effect lines (Script/Items/CardEffects.txt). Card prefixes: Low Level, Lucky, Aqua, Mirror (ItemsCards.csv Prefix column).
- Card-pair sets: 22 sets (ComboEffects.txt). The mini-boss pairs add a flee bonus of 18 plus one small stat (line 8 and the lines after it). Other pairs differ: the pantie-and-undershirt pair gives agility 5 and flee 10 (ComboEffects.txt line 2).
- Equipment effect example: a shield that gives nine element resistances at 20 each (EquipmentEffects.txt line 4).

Top 5 striking gear ideas:
1. Card-pair sets (ComboEffects.txt line 8). Two named cards unlock a set bonus. Keep the pair rule; change the bonus.
2. Element resistance shield (EquipmentEffects.txt line 4). One item covers every element. Keep the breadth; change the number.
3. Refine curve (RefineSuccess.csv line 6 and onward). Success falls with each step and with tier. Keep the curve shape.
4. Element swap items (MiscEffects.txt lines 2-3).
5. Ice and glass material words in names (names only, no look data). Use as a naming idea for our tiers, not as looks.

## 5. Zones and dungeons
- Biomes by MapMode (Db/Maps.csv): field 142, dungeon 77, indoor 31, town 12. Each town has its own field instance (Db/Instances.csv).
- Dungeon archetypes (18 warp files in Script/Warps/Dungeons): a sewer, a maze, a tower, an undersea tunnel, a pyramid, a sunken hull, a magma vault, a bug nest, an orc camp, a toy-factory, a clock tower, a forest labyrinth, an undead crypt, and others.
- Hazards: flag AllWater on two undersea floors (Db/Maps.csv lines 32-33); flag NoTeleport on three maps; map-wide curse (miasma) event; spore field (gef_dun.txt:7).
- Instances (Db/Instances.csv): job zones (line 25), guild realm, war-of-siege comment row, plus dungeon and field instances.

Top 5 striking zones (own labels):
1. Undersea tunnel floors (Maps.csv lines 32-33, flag AllWater). A water-filled dungeon. Keep the water rule; change the look.
2. Timed curse pyramid (MiasmaDungeons.txt lines 12-13, 42-81). A timed event with three waves. Keep the wave structure; change the trigger.
3. Spore field (gef_dun.txt line 7). Dense respawning hazard field.
4. Job zones (Instances.csv line 25). Class-specific zone rooms.
5. Guild realm (Instances.csv, Prontera Guild Realm row). A player-owned space.

## 6. Looks worth recreating (reference files)
- Explosion frame strip: Textures/Explosion/frame_00_delay-0.1s.png to frame_16_delay-0.1s.png (17 frames, 0.1 s each, delay written in the file name). Technique: strip with timing in the name.
- Casting ring and motes: Textures/CastCircle.mat, Textures/Casting.mat, Textures/Firefly.mat; Shaders/FireflyShader.shader lines 10 and 69 (additive blend, soft fade by depth). Technique: additive particles with depth fade.
- Screen swirl for a status: Shaders/IllusionStatusShader.shader lines 118 and 123 (polar swirl with sine wobble and a strength value from 0 to 1). Technique: full-screen polar distortion.
- Crit digit style: Shaders/DamageIndicator.shader lines 256 and 268 (jitter and a brightness factor for crits); material DamageIndicator/Crit.mat. Technique: per-digit layout with a crit variant.
- Flying text paths: Data/FlyingText/ has nine path assets (Bounce, Combo, Critical, Damage, Debuff, Effect, Exp, Heal, Miss). CriticalPath.asset line 13 names it; line 44 holds the first size key. Technique: each damage type has its own curve asset for trajectory and size.
- Miasma haze: Materials/miasmaclouds.mat; the map-wide effect is registered at Script/Event/MiasmaDungeons.txt line 12.
- Water barrier: Materials/waterbarrier.mat; Shaders/WaterShader.shader (not read beyond listing).
- Window frame kit: Textures/UI/basewin_bg2-transparent-nobottom.png, Textures/UI/bottom_handle.psd, Textures/UI/corner_handle.psd. Technique: transparent and no-bottom variants of one frame.
- Tier digits on elements (Monsters.csv Element column, digits 1-4): a clean way to show four strengths of one look.

## 7. Inspiration for Frankendom (originals, not copies)
1. Clutch-spitting sand-crab boss. Name: Burrow Clutch Crab. Idea: a boss that buries and sprays small clutches on a fixed beat, with a hide phase under 40 percent. Keep: the 200 ms-style volley, separate small targets, the hide phase. Change: our crab, a three-beat volley, our own sound.
2. Winged sentinel quartet. Name: Four Wardens. Idea: one winged family in four element tiers, sharing animations. Keep: one family, four element variants. Change: our names, our elements, one attacks at a time.
3. Ant brood. Name: Swarm Brood. Idea: small fast soldiers plus larvae that assist a boss. Keep: assist units, egg as a stationary object. Change: larvae drag toward the player.
4. Spore field. Name: Pollen Field. Idea: dense short-respawn spore pods that burst into a fan on death. Keep: density and short respawn. Change: no damage over time; a burst fan.
5. Weakness tag. Name: Frost-Weak Hide. Idea: a creature tag that makes it weak to one element, with a visible tell. Keep: tag-driven weakness. Change: our element and our tell.
6. Element swap consumable. Name: Element Draught. Idea: a timed consumable that changes the weapon element and tints the aura. Keep: element swap. Change: our duration and aura shader.
7. Class-by-weapon speed matrix. Name: Stance Table. Idea: one data table of speed per class and weapon kind. Keep: data-driven matrix. Change: our multipliers and our kinds (verify meaning of cell value 4 first).
8. Miasma-style timed curse. Name: Blight Ritual. Idea: a timed map curse with three waves, gated by a config flag. Keep: wave structure, config gate. Change: a three-stage ritual with its own fog.

## Defects noticed (keep the idea, fix the defect)
- Bosses.txt line 20: the comment reads "resummon if we have 4 or less" while the value is 8. Which one governs was not verified. Fix: name the threshold once and cite it.
- WeaponAttackTiming.csv: many cells read 4. The meaning was not verified. Fix: document the sentinel or drop it.
- MvpList.csv: drop chances read as 5500, 1000 and so on. The unit (per 10000 or per 100000) was not verified.

## Not read
- RoRebuildOld/ (older server and zone server): listing only.
- RebuildClient/Assets/Scripts (client C#): not read.
- RebuildClient/Assets scenes, prefabs and most of Textures: listing only.
- Script/Event/MilestoneEvent.txt and MilestoneOkolnir.txt: one grep only.
- Other/RoStatProcessing.xlsx and Other/LuckTest.xlsx (binary spreadsheets): not read.
- Other/RoWikiGenerator, DataToClientUtility and the Keys folder: not read.
- ItemDescriptions/*.txt: line counts only (about 9,249 lines); text not read or quoted.
- Script/Npcs, Script/Event milestone files: listed only.
- Db/ItemBoxSummonList.csv, Db/ItemMonsterSummonList.csv, Db/Npcs.csv: not read. Db/Effects.csv: header and first 25 rows only.
- Script/MonsterSkills scripts other than Bosses.txt and MiasmaDungeons.txt: listed only.
- Client Data/SharedItemIcons.txt and Data/cardillustrations.txt: only through audit AU016.
- Sprites and sounds: not in the repo (README.md line 35 says these are excluded).
