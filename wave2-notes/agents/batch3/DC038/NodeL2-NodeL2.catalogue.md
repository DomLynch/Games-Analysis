# NodeL2-NodeL2 (design catalogue, cell DC038)

Donor root: /mnt/frankendom-donors/NodeL2-NodeL2 (VPS, read-only). Class C (data tables of unclear provenance; no art, audio, model, map or font in the box).
Rule for every idea below: recreate as a clearly distinct original, never a copy. Inspiration is category-level only (for example "a plated beetle boss"), never an exact look, name or table row copied into the game. Titles and short names are used only to find files.

## Which half was read
- Server half: src/GameServer, read in part (Formulas.js in full; Npc/Npc.js, Actor/Attack.js, Actor/Generics/{UpdateEnvironment,UnderwaterCheck,Revive,AttackExec}.js, World/Generics/{SpawnNpcs,NpcRewards}.js; grep across src/GameServer for spawn respawn and bias fields).
- Data pack: data/, read in part (Npcs, Items, Skills, Templates, Teleports, Admin/Shop counts).
- Client half: not in the box. The README (Prerequisites section) names a separate Lineage II C2 client download. No paired donor in this batch, so there is no other half to match.
- Brief for pairing: none. Treat every visual idea here as a hypothesis until a human checks a client.

## Counts (verified this read)
- NPC and object records: 2,223 in data/Npcs/npcs.json. Kinds: Monster 1,154; Citizen 581; Guard 113; Guild Coach 88; Merchant 82; Summon 72; Teleporter 43; Guild Master 38; Boss 15; Trainer 10; Blacksmith 9; Chamberlain 6; Holything 5; Pet 5; Thing 1; Castle Gate 1.
- Hostile records: 340, all of them Monster kind. Monster levels run 1 to 75.
- Spawn groups: 3,934 top-level records in data/Npcs/Spawns/spawns.json, holding 13,465 spawn entries and 18,551 bounds polygons. Respawn values run from 15 s to 950,400 s (one value is -1).
- Reward groups: 1,788 groups across 613 NPCs in data/Npcs/Rewards/rewards.json. Every group's chances sum to exactly 100.
- Weapons: 473 (10 kinds). Armour: 684 (7 kinds). Other items: 3,488.
- Skills: 1,571 skill rows in the tree (89 class blocks, classId up to 118); 393 active skills (214 flagged as spell, 179 not); 74 passives; 6 switch skills.
- Classes: 9 class templates (5 races: human, elf, dark elf, orc, dwarf; a dwarf fighter only).
- Experience table: 80 cumulative thresholds, the last one 4,200,000,000.
- Teleport destinations: 23, priced from 200 to 23,000.

## 1. Creatures and beasts

### Families and tiers (rough, by name keywords; the data has no family tag)
Name-keyword clusters overlap and cover about half the 1,169 Monster and Boss records. Treat them as my grouping, not a field in the data.
- Undead: about 76 records (levels 1 to 65). Skeleton line is the largest, 18 records.
- Insect and arachnid: about 85 records. The ant line has 8 records, levels 29 to 36.
- Orc, goblin and other humanoids: about 207 records, the largest cluster.
- Demon and abyss: about 49 records.
- Beast and animal: about 72 records.
- Plant and fungus: about 15 records.
- Golem and elemental: about 40 records.
- Dragon and wyrm: about 22 records (levels 27 to 61).

### How monsters escalate with level (verified by band, npcs.json)
- Level 1 to 10: 134 records, max HP about 40 to 100,000 (the top end is an outlier).
- Level 11 to 20: 247 records, HP 185 to 1,028, attack 21 to 100.
- Level 21 to 30: 156 records, HP 364 to 1,812, attack 48 to 211.
- Level 31 to 40: 187 records, HP 636 to 2,993, attack 99 to 306.
- Level 41 to 50: 169 records, HP 1,008 upward, attack 187 to 640 (top end outlier).
- Level 51 to 60: 189 records, HP 1,470 upward, attack 321 to 1,624 (top end outlier at 800,000 HP).
- Level 61 to 70: 69 records, HP 1,986 to 7,333, attack 501 to 4,025.
- Level 71 to 75: 3 records, HP about 5,080 to 5,352.
Reading: attack climbs faster than HP. Above level 40 the attack spread is wider than the HP spread.

### Ladders inside one family (the rank words are the only tier signal)
- Ant line (npcs.json lines 817 onward): Ant Larva (level 29, HP 631, attack 86) to Ant Warrior Captain (level 36, HP 810, attack 152). That is +28% HP and +76% attack over eight ranks, with collision size stepping from 12 to 17.
- Skeleton line: the bow ranks carry the attack. Skeleton (level 12, HP 399, attack 25) against Skeleton Archer (level 13, HP 429, attack 61): about 2.4 times the attack at almost the same HP.

### Bosses
- 15 Boss records, levels 43 to 70. Four bosses carry the high reward values (experience 10, or 200 for the top one). The other eleven carry 0.1. The meaning of that field is not verified.
- Boss footprints: most use collision size 26 to 80. The top boss uses 300. The next largest boss-class value is 125.
- Boss speeds: walk 20 to 100, run 20 to 230. Most bosses run about 2 to 4 times their walk speed; one boss runs at its walk speed.
- Two bosses carry an equipped weapon id (75 and 1,472). The rest carry none.

### Top 8 most striking (data-first; the box has no visuals, so silhouette and sound are inferred from size and speed only)
Each entry: label (mine), why it is striking at 375 wide, keep and change, and the file.

1. Scale tyrant. Boss record selfId 12211 (level 70, collision size 300, walk 50, run 186). Why: its footprint is about 2.4 times the next boss and it walks slowly then charges at nearly four times its walk speed. Keep: enormous footprint and the walk-to-charge contrast. Change: our own silhouette and sound; split the fight into zones rather than one pad. Ref: NodeL2-NodeL2/data/Npcs/npcs.json (selfId 12211).
2. Wide-footprint ring boss. Boss record selfId 12052 (level 50, radius 140, size 75, HP 90,000, run 110). Why: the widest reach of any boss in the file, so it claims space. Keep: a wide reach as space control. Change: draw the reach as a ground ring telegraph (not in the data, so an idea only). Ref: npcs.json (selfId 12052).
3. Armed boss. Boss record selfId 12055 (level 55, equipped weapon id 1472, walk 100 which is the fastest walk of any boss, run 230). Why: the attack is tied to a held item. Keep: a boss with a visible weapon. Change: our own weapon, shape and swing. Ref: npcs.json (selfId 12055); weapon id 1472 is in data/Items/Weapons/weapons.json (not opened by row).
4. Ranged rank pair. Skeleton (selfId 99) and Skeleton Archer (selfId 100): same body band, the archer hits about 2.4 times harder. Why: a readable melee and ranged pair from one family. Keep: same HP band, higher attack for the ranged rank. Change: different silhouette and projectile feedback. Ref: npcs.json lines 1081 and 1092.
5. Shallow rank ladder. Ant line from Ant Larva to Ant Warrior Captain (see ladder above). Why: a family that gets bigger in steps. Keep: rank names and collision-size steps as visible progression. Change: add one visible trait per rank, because the stats alone are a shallow ramp. Ref: npcs.json line 817 (Ant Larva).
6. Lettered summon line. 72 Summon records include families with A to I variants (Shadow, Silhouette, Cuti Cat, Cat The Cat, each with nine letters; Unicorn Boxer A to F; Mechanic Golem A to E). Why: many pets from one template. Keep: a letter-variant set for each pet line. Change: name variants by role, not by letter. Ref: npcs.json (Summon kind records, name field).
7. Pack sprinter. Monster records selfId 12004 (level 37) and 12005 (level 39) and the boss at 12001 all run at 230, the top run speed in the file. Why: a fast flank at mid level. Keep: run speed as a role. Change: give the sprinters a telegraphed leap, not only speed. Ref: npcs.json (selfId 12004, 12005, 12001).
8. Lumbering queen. Boss record selfId 12001 (level 43, HP 60,000, collision 53, radius 45, walk 80, run 230). Why: a large HP bar on a fast-running body. Keep: queen with a heavy HP pool and fast swarm speed. Change: brood spawns in rings; the spawn behaviour is not read. Ref: npcs.json (selfId 12001).

## 2. Classes, races and factions
Nine class templates (data/Templates/templates.json), five races, and the skill tree per class block.

| classId | class | race | base HP | run speed | role read from base stats | skill-tree rows (classId block) |
|---|---|---|---|---|---|---|
| 0 | Human Fighter | human | 80 | 115 | strength and constitution | 7 |
| 10 | Human Mystic | human | 101 | 120 | intelligence and men | 19 |
| 18 | Elven Fighter | elf | 89 | 125 | balanced, dexterity | 9 |
| 25 | Elven Mystic | elf | 104 | 122 | intelligence and men | 18 |
| 31 | Dark Elven Fighter | dark elf | 94 | 122 | strength | 10 |
| 38 | Dark Elven Mystic | dark elf | 106 | 122 | intelligence and men | 19 |
| 44 | Orc Fighter | orc | 80 | 117 | constitution and strength | not read |
| 49 | Orc Mystic | orc | 95 | 121 | men | not read |
| 53 | Dwarven Fighter | dwarf | 80 | 115 | crafter flag set | not read |

Source: data/Templates/templates.json (lines 3 onward). Skill-tree counts come from data/Skills/Tree/tree.json for the first eight blocks listed; the blocks for the orc and dwarf classes were not counted row by row.
- Progression shape: 80 experience levels with cumulative thresholds (data/Templates/Experience/experience.json). Base HP and MP are set by level-based formulas per class (src/GameServer/Formulas.js:11-36). Skills are gated by level and by spirit cost (tree.json levels carry pLevel and sp).
- Factions: none as data. NPC clans appear only as a clan name (blank in the records sampled) and a help radius (300 in the sampled record; npcs.json clan block). No faction reputation system was found in the files read.

## 3. Weapons
- 473 weapon records, ten kinds (data/Items/Weapons/weapons.json): dual 112, blunt 92, sword 67, knife 45, misc 42, pole 33, fist 29, bow 26, pet 19, great sword 8.
- Tiers: rank none 125, d 117, c 108, b 88, a 27, s 8. Six visible steps.
- Special properties in the data: a soulshot grade (0 to 8; most common values 1 to 3) and a spiritshot value, a mana field on 26 weapons, and a crystal field (a cost or upgrade value; meaning not verified).
- Two records have physical attack 30,000 (a lance and a knife). Treat as data outliers, not as design.
- Top five by physical attack (bows dominate the top): Soul Bow (rank a, attack speed 227), The Bow (rank s, attack speed 293), Carnage Bow (rank a), Bow of Peril (rank b), Dark Elven Long Bow (rank b). Refs: data/Items/Weapons/weapons.json.
- Visual distinction per tier: not in the box (no client art).
- Five striking ideas (from the data only): (1) soulshot grade as a charge state; (2) attack-speed tier per bow; (3) mana-bearing weapons as a second resource; (4) rank letters as a readable scale; (5) the bow top end as a range-versus-power trade.

## 4. Armour and gear
- 684 armour records (data/Items/Armors/armors.json). Kinds: wear 288, jewel 104, fabric 80, shield 72, chain 62, leather 59, pet 19.
- Tiers by rank: b 255, none 131, d 103, c 103, a 75, s 17.
- Materials: fabric, leather, chain, shield (the material is the kind). No set-bonus data exists in the box (counts only; no set table was found).
- Top physical defence: chain armour records at 301 (rank b). Rank s peaks at 269 and rank a at 293, so rank is not the only power axis.
- How the game shows tiers: the client is not in the box, so the visual tier mapping is not read.
- Five striking ideas: (1) fabric-to-chain-to-shield as a visible material ladder; (2) jewel as its own armour slot class; (3) pet armour as a family; (4) rank letter plus material as two axes; (5) crystal cost as a craft gate (unverified).

## 5. Zones and dungeons
- Spawn groups are keyed by a region code in the id: town clusters named for six hubs (by id prefix: 837, 454, 447, 275, 146 and 142 groups), tile-coded groups (t and w prefixes, 613 together), party groups (206), groups with a dg prefix (154, probably dungeon groups; inferred from the prefix), and siege groups named per hub (for example each of four hubs has a siege05 group of 58 entries).
- Teleport destinations: 23 places in five hub regions (talking island 4, elven 5, dark elven 5, orc 5, dwarven 4). Field archetypes named in the list: forest, swamp, spider nest, frozen waterfall, coal and mithril mines, a trial cave, a plateau, ruins, a coast, and a neutral zone. Refs: data/Teleports/teleports.json.
- Hazard: underwater zones are a depth gate (z below -3790) on a list of 23 map tiles (src/GameServer/Actor/Generics/UnderwaterCheck.js:7 and the tile conditions below it). When it applies, a breath bar of 86 seconds is sent (UnderwaterCheck.js:44). The damage after the bar runs out is not read.
- Hazard: day and night change through the Sunset and Sunrise packets (src/GameServer/Network/Response/Sunset.js and Sunrise.js). The cycle timing is not read.
- Top five striking zone ideas: (1) a depth gate with a breath bar; (2) a spider-nest field (archetype only); (3) a frozen waterfall as an ice field; (4) a trial cave as a gated dungeon; (5) hub-plus-siege as a repeating event (siege groups).

## 6. Item and effect looks worth recreating
Techniques only. The box has no art, so each look below is a data or packet hook, not a rendered reference.
- Breath countdown shown as a duration bar of 86 seconds (src/GameServer/Actor/Generics/UnderwaterCheck.js:44). Technique: a timed bar that starts when the depth gate trips and resets when the player leaves.
- Hit or miss flag in the attack packet (src/GameServer/Npc/Npc.js:134, src/GameServer/Actor/Attack.js:51). Technique: one byte says hit or miss, so the client can play a different impact cue for each.
- Stand-up social action after a revive (src/GameServer/Actor/Generics/Revive.js:9). Technique: a stand-up beat after a 2.5-second delay, so a death reads as a pause and not a cut.
- Corpse time per record (the sampled monster records carry 7,000 ms in npcs.json vitals). Technique: the corpse stays readable for a fixed time before it clears.
- Skill timing per row (hit time, reuse, buff) in data/Skills/Active/active.json. Technique: a wind-up time per skill, so each attack has its own visible beat.
- No glow, aura, shader or metallic data exists in the box. Nothing to recreate from this donor on that axis.

## Inspiration for Frankendom
1. Scale tyrant (keep the footprint and the walk-then-charge contrast; change the silhouette and sound and fight it as zones). Based on npcs.json selfId 12211.
2. Ring-reach colossus (keep the wide reach as space control; change the reach to a ground ring plus pillars). Based on npcs.json selfId 12052.
3. Rank-ladder family (keep the rank names and size steps; add one visible trait per rank). Based on the ant line, npcs.json line 817 onward.
4. Ranged rank pair (keep the same body band with a higher-attack ranged rank; change the silhouette and the projectile). Based on the skeleton pair, npcs.json lines 1081 and 1092.
5. Depth-gated drowning zone (keep the depth gate and the breath bar; change the bar to bubbles and add a shore refill). Based on UnderwaterCheck.js.
6. Stand-up after revive (keep the 2.5-second stand-up beat; change it to a short kneel). Based on Revive.js.
7. Lettered pet variants (keep the letter family; change the names to roles). Based on the summon records.
8. Trial-cave gate (keep the gated dungeon archetype; change the gate to an in-world puzzle). Based on the teleport archetypes.

## Defects found while reading (keep the idea, fix the defect)
- Respawn and bias fields are in data/Npcs/Spawns/spawns.json but no code in src/GameServer reads them (grep found no hits). Fix: read respawn and bias in the spawn loop, or drop the fields.
- Explicit spawn coordinates are created once per count, so a group with total N and K coordinates spawns N times K creatures. The loop is at src/GameServer/World/Generics/SpawnNpcs.js:20 and 22. Fix: count per coordinate, or spawn one creature per coordinate.
- Combat leash: the combat timer checks distance against 1,500 units (src/GameServer/Npc/Npc.js:65), not 150 as the earlier asset audit said. The audit figure is wrong.
- First combat tick: the coordinate object starts at zero (Npc.js:58 to 62) and the in-motion branch compares it against the actor (Npc.js:79). If the NPC is still moving one second after engage, it steers toward the origin first. Fix: seed the coordinates from the actor before the first tick.
- Hit chance is a fixed 90 percent roll with a TODO (src/GameServer/Formulas.js:149 to 150). It ignores accuracy, evasion and level. The same roll is used for player attacks (src/GameServer/Actor/Attack.js:50). Fix: replace with an accuracy-versus-evasion check, as the TODO says.
- Updates read this.previousXY but write actor.previousXY (src/GameServer/Actor/Generics/UpdateEnvironment.js:9 and 18). The call site is Generics.updateEnvironment (UpdatePosition.js:11), so this is the Generics module object and the read always gets the default. The resend check then fires on almost every move. Fix: read and write the same actor field.
- Debug console line in the underwater check runs on every call (UnderwaterCheck.js:37). Fix: remove before use.
- A TODO hack sets the NPC height to the actor height (UpdateEnvironment.js:24). Fix: keep the NPC's own height.
- Two weapon records (a lance and a knife) carry 30,000 physical attack (weapons.json). Fix: check the data before any balance work.
- Drop chance: the overall gate is multiplied by a rate option (NpcRewards.js:10); the item pick is first-hit-wins on cumulative chance (NpcRewards.js:15 and 17). The sums are correct (all 100), so the pick is sound.

## Licence note
Code: Apache License 2.0 (LICENSE; README.md:47). Data (data/): no licence file or header; the README says half the datapack is unimplemented (README.md:44). Rights-holder status for the data: unknown; the README names the emulated game but not who owns its data. Do not reproduce data rows; use the mechanisms only.

## Not read
- The client half (not in the box).
- data/Skills/Passive, data/Skills/Switch and most of data/Skills/Tree (counted only).
- data/Items beyond counts; data/Templates other than the class templates, the experience table and the spawns; data/Admin/Shop (one record); the Html dialogue (data/Html, 11 files, not opened in this read).
- src/AuthenticationServer, the network layer, src/GameServer/Model, and database/sql/database.sql.
- config/default.ini (holds credential-style settings; not recorded here).
- The leash branch beyond the first tick, and the boss brain (none in this box beyond the combat loop).

## Corrections to the asset audit AU037
- spawns.json: the audit says 7,868 records. The top-level count is 3,934 records, with 13,465 spawn entries inside them. 7,868 is neither figure.
- rewards.json: the audit says 3,450 records. The file holds 2,223 records (one per NPC), with 1,788 reward groups.
- Leash: the audit says combat drops at 150 units. The code uses 1,500 (Npc.js:65).
- The zero-coordinate object: the audit says "use not read". It is read now, and it is a real first-tick defect (see Defects).
