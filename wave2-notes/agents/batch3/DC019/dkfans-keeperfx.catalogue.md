# dkfans-keeperfx catalogue (DC019, Haiku design-catalogue pass)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/` (KeeperFX, a GPL v2 fan remake of a dungeon-management strategy game). Read over ssh, read-only. Asset audit used: `AU016/dkfans-keeperfx.assets.md`.

Licence (what the files say): code is GPL v2 (`LICENSE`, `README.md:103`). 82 map and campaign files carry a GPL v2 header (per the asset audit). Original game art, sound and data are NOT in the box (`docs/files_required_from_original_dk.txt`). Creature configs, translations and credits have no stated licence, so this catalogue uses them as design shape only and copies nothing.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED. Inspiration is for mood (about 20 to 30 percent resemblance), not for stats, names or art.

HALF READ: DATA half only. I read `config/creatrs/*.cfg` (all 36 kinds), `config/fxdata/*` (creature actions, magic, shots, powers, terrain, traps, effects, lenses, texture animation, team colours), the level and campaign scripts (counted, plus sampled lines), and `lang/` (counted). CODE half: only the lines that wire hero-party generation (`src/lvl_script_commands.c:6222`, `config/fxdata/rules.cfg:182-185`). The rest of `src/` (about 253 .c files) is not read. No paired donor for the original game is in the box. Another keeper-genre donor is in the box, `miki151-keeperrl`, but it is not a pair and was not read.

Counts (each is verified in the file named):
- creatures: 36 kinds (`config/creatrs/*.cfg`, 36 files; the common list at `config/fxdata/creature.cfg:5` names the same 36).
- classes: 29 distinct kinds appear on hero-party lines (`ADD_TO_PARTY`) across `levels/*/`. One malformed token was ignored.
- weapons: 41 shot kinds (`config/fxdata/magic.cfg`, 42 `[shot]` sections minus NOSHOT); 32 spells; 30 powers; 14 specials.
- gear_sets: 0. The config has no equipment or gear sets. Armour is a stat.
- zones: 219 map scripts (55 in `levels/`: classic 10, deepdngn 15, standard 16, lostlvls 14; 164 in `campgns/` across 13 campaigns). Also 80 terrain slab types in `config/fxdata/terrain.cfg`.

## 1. Creatures and beasts

Families (grouped by the `Properties` and role fields in each `creatrs` file):
- Evil brutes and heavies: dragon, bile_demon, hell_hound, horny, giant, troll, orc, tentacle.
- Lords (LORD flag): knight, avatar (avatar is also ONE_OF_KIND).
- Undead and skeletal: skeleton, vampire, ghost, floating_spirit (a spectator kind, 1 HP).
- Arachnids and insects: spider, spiderling, maiden (summons spiderlings), bug, fly.
- Flyers: bird, fly, ghost, fairy.
- Diggers and utility: imp (SPECIAL_DIGGER), tunneller (DIGGING_CREATURE).
- Adventurer-type casters and fighters (also the hero side in parties): wizard, sorceror, witch, druid, time_mage, dark_mistress, monk, samurai, barbarian, archer, thief, dwarfa.

Tiers and escalation:
- Each kind has 10 levels. The `LevelsTrainValues` line gives 9 training thresholds, for example `config/creatrs/dragon.cfg:91` (1000 to 20000) and `config/creatrs/imp.cfg:286` (starts at 2500).
- Powers unlock by level through `PowersLevelRequired` (1 to 10). Strongest powers often unlock at level 10, for example the dragon's word of power (`config/creatrs/dragon.cfg:89`), the monk's (`monk.cfg:89`), the avatar's (`avatar.cfg:90`).
- Per-level growth lives in `[experience]` of `config/fxdata/creature.cfg` (lines 11 to 38): health, strength, pay, size, defence and dexterity each rise by a fixed step per experience level (for example `HealthIncreaseOnExp = 35` at line 23).
- Evolution: `GrowUp` names a new kind and level once training passes a value. demonspawn becomes DRAGON at level 5 (`config/creatrs/demonspawn.cfg:92`). thief becomes KNIGHT at level 3 (`config/creatrs/thief.cfg:92`). The field semantics are commented at `config/creatrs/imp.cfg:287`.
- Sleep-for-experience on terrain: dragon on LAVA (500, `dragon.cfg:93`), sorceror on GOLD and DENSE_GOLD (200 each, `sorceror.cfg:93`), tentacle on WATER (400, `tentacle.cfg:93`). The rule is commented at `imp.cfg:290-294`: one slab of the named type next to the lair is enough.
- Escape by fear: `FearWounded` and `FearStronger` (`dragon.cfg:12-13`) make a creature flee from stronger foes. The meaning is commented above those keys in `config/creatrs/imp.cfg`.

Boss and elite pattern: LORD and ONE_OF_KIND flags (avatar, `avatar.cfg:36`), very high health (avatar 3000, horny 2000, bile_demon 1200), very high pay (avatar 1200, horny 950). Heavy kinds are slow (BaseSpeed 32 to 48) and fast kinds are light (BaseSpeed 96 to 132).

Top 8 (each is a label I chose, not a donor name):

1. **Slag Wyrm** (dragon). Why: the tallest clipbox in the set (`Size = 200 740`, `dragon.cfg:25`). It is also joint-slowest (BaseSpeed 32, `dragon.cfg:22`, shared with six other kinds). It reads from 375 wide as a tower. Its lava rest is a signature behaviour (`dragon.cfg:93`). Keep: tall slow silhouette; resting on a hazard tile to recover. Change: breath is a telegraphed fan with a glow-up, not a straight flame line; no lair object; our own sigil.
2. **Gall Brute** (bile_demon). Why: a fat, trembling body (`Properties = BLEEDS EVIL TREMBLING FAT`, `config/creatrs/bile_demon.cfg:36`). It has an area gas spell at level 4 (`bile_demon.cfg:90`) and immunity to poison cloud and wind (`bile_demon.cfg:35`). Keep: area-denial gas cloud as a readable zone of danger. Change: the gas is a slow puddle with its own colour; not a bodily-function gag.
3. **Iron Knight** (knight). Why: a LORD with armour 100 and dexterity 150 (`config/creatrs/knight.cfg`). It reflects spells at level 4 (`Powers`, `knight.cfg:89`) and heals at level 7. Keep: a reflect stance as a counter. Change: a visible reflect ring with a short timing window, not a spell list.
4. **Grave Warden** (skeleton). Why: immune to POISON_CLOUD and FEAR (`config/creatrs/skeleton.cfg:35`), armour at level 5, lightning at level 10 (`skeleton.cfg:90`). Keep: immunity as a counter that the player must read. Change: the immunity shows as a rune on the body, readable at 375 wide.
5. **Ember Hound** (hell_hound). Why: base speed 96 (fast) with flame breath at level 5 (`config/creatrs/hell_hound.cfg`). Keep: fast pack pursuit with a breath cone. Change: pack size limited by our MAX_ATTACKERS = 3 rule; no crude name-linked behaviour.
6. **Evolving Hatchling** (demonspawn). Why: at level 5 it grows into a new kind (`demonspawn.cfg:92`). The thief does the same at level 3 (`thief.cfg:92`). Keep: a threshold where a creature becomes a new kind. Change: the threshold comes from zone milestones verified by the server, not from training points alone.
7. **Shaft Sprite** (imp). Why: 75 HP, base speed 96, first-person digging at level 1 and teleport at level 10 (`config/creatrs/imp.cfg:282`). It costs nothing to keep (pay 0, lair size 0). Keep: a cheap scout that digs its own route. Change: it digs a shortcut into zone data and leaves a dust trail.
8. **Lord of the Hall** (avatar). Why: one-of-a-kind LORD with 3000 health, dexterity 160, and nine powers across levels 1 to 10 (`config/creatrs/avatar.cfg:90`). Keep: a single boss with a power ladder. Change: the ladder is three phases, not ten levels, and it obeys MAX_ATTACKERS = 3.

## 2. Classes, races and factions

Races: none. The config has no race system.

Factions: keeper-side creature kinds (`EVIL` property) against hero parties. Map scripts branch on `PLAYER_GOOD` and `PLAYER0`.

Hero-party classes, by count of `ADD_TO_PARTY` lines across `levels/` (counts measured, not sampled):
archer 193, samurai 152, dwarfa 141, barbarian 140, giant 134, wizard 128, thief 117, witch 97, monk 94, fairy 85, knight 62. The rest (under 20 lines each) include hell_hound, fly, ghost, sorceror, skeleton, bug, vampire, spider, orc, avatar, tentacle, dragon, bile_demon, troll, time_mage, demonspawn, horny, tunneller.

Role and progression (one line each; levels are from `PowersLevelRequired`):
- Archer: ranged; fire arrow at 1, navigating missile at 4, speed at 6, slow at 8 (`config/creatrs/archer.cfg:89`).
- Samurai: melee; sight at 5, lightning at 6, speed at 7, freeze at 9 (`samurai.cfg:89`).
- Barbarian: melee; armour at 6 (`barbarian.cfg:89`).
- Dwarfa: melee; armour at 4, rebound at 7.
- Knight: LORD melee; rebound at 4, heal at 7 (`knight.cfg:89`).
- Thief: steals; speed at 4, invisibility at 7, rebound at 10 (`thief.cfg`). Grows to knight at level 3.
- Wizard: caster; missile at 1, fireball at 3, rebound at 5, heal at 5, freeze at 6, hailstorm at 7, drain at 8, slow at 9, fire bomb at 10 (`wizard.cfg:90`).
- Witch: caster; poison cloud at 3, rebound at 4, wind at 5, lightning at 7, heal at 8, hailstorm at 10 (`witch.cfg`).
- Monk: healer-fighter; heal at 2, armour at 3, slow at 4, hailstorm at 9, word of power at 10 (`monk.cfg:89`).
- Fairy: flyer; drain at 3, lightning at 4, heal at 5, invisibility at 6, navigating missile at 7, rebound at 8, fire bomb at 9, freeze at 10 (`fairy.cfg`).
- Druid: summons a familiar bird at 2, hailstorm at 5, drain at 7, freeze at 9, word of power at 10 (`druid.cfg:89`).
- Maiden: summons spiderlings at 4, armour at 5, drain at 7, fear at 9 (`maiden.cfg:88`).
- Time mage: teleport at 3, slow at 7, fly at 9, chicken at 10 (`time_mage.cfg`).
- Sorceror: fireball at 2, heal at 3, fire bomb at 4, invisibility at 5, navigating missile at 6, sight at 7, wind at 8, word of power at 9 (`sorceror.cfg:89`, `PowersLevelRequired` line below it).
- Avatar and knight: LORD tier, see section 1.

## 3. Weapons

Families (from `config/fxdata/magic.cfg`):
- Melee swings: SWING_WEAPON_SWORD and SWING_WEAPON_FIST are creature actions in `config/fxdata/creature.cfg` (instance1, instance2).
- Arrows and navigating missiles: arrow (SHOT_ARROW), navigating missile (SHOT_NAVI_MISSILE, `magic.cfg:681`, 40 damage).
- Elemental bolts: fireball (SHOT_FIREBALL, `magic.cfg:537`, 30 damage, explosion effect at 556, light radius 7 at the same block), lightning (SHOT_LIGHTNING, 20 damage), lightning ball (SHOT_LIGHTNING_BALL, `magic.cfg:1177`, 150 damage), hailstorm (5 damage).
- Area bombs: fire bomb (SHOT_FIREBOMB, 50 damage, wall explosion), grenade (hits creatures and objects), time bomb (SHOT_TIME_BOMB, `magic.cfg:1272`, 300 damage, speed 40, hits objects too).
- Ballistic heavies: boulder (SHOT_BOULDER, `magic.cfg:925`, 5000 damage, speed 64), solid boulder (5000), spike (5000).
- Status-only: freeze (SHOT_FREEZE, `magic.cfg:598`, 0 damage, applies the FREEZE spell flag at `magic.cfg:109` with Duration 125), slow, fear, chicken, disease, cripple (`magic.cfg:1494`).
- Gas: poison cloud, crazy gas (the area gas used by the bile brute).
- Traps (`config/fxdata/trapdoor.cfg`, 17 sections in all): boulder, alarm, poison gas (`trapdoor.cfg:360`), lightning, word of power (`trapdoor.cfg:438`), lava, TNT (`SHOT_TRAP_TNT`, `magic.cfg:1360`).

Tiers and special properties: no item tiers. Tiers come from creature level (section 1). Special properties are status flags (freeze, armour, fear) and damage-on-object flags.

Top 5 striking (readable at 375 wide, one signature behaviour, one signature effect):
1. **Time bomb**: slowest visible projectile (speed 40), hits objects and creatures, 300 damage (`magic.cfg:1272`, `:1283`). Keep: a slow readable threat. Change: the fuse glows in our own colour.
2. **Freeze bolt**: no damage; applies a timed freeze (`magic.cfg:598`, `:109`). Keep: status-only projectile. Change: a shatter finisher when the freeze ends.
3. **Boulder**: 5000 damage, slow (speed 64, `magic.cfg:925`). Keep: heavy rolling silhouette. Change: a warning shadow on the floor first.
4. **Fireball**: 30 damage, explosion on impact and a light (`magic.cfg:537`, `:556`). Keep: a bright explosion with a flash of light. Change: our palette; the flash lasts less than 0.2 s.
5. **Navigating missile**: homing, 40 damage (`magic.cfg:681`). Keep: a missile that corrects its path. Change: the correction is a visible arc, and it is capped at one retarget.

## 4. Armour and gear

No gear sets and no equipment slots. Armour is a stat: a 0 to 200 scale where 200 is 80 percent absorption (`config/creatrs/imp.cfg:26`), and the protect spell adds 25 percent (`imp.cfg:27`). The armour spell has Duration 250 and is self-cast (`config/fxdata/magic.cfg:119`).

Material and tier look: no gear tiers in the config. Treasure comes in five object sizes, GOLD_HOARD_1 to GOLD_HOARD_5 (`config/fxdata/objects.cfg:1341` to `:1437`); how the game picks which one to show is not read.

Top 5 striking (these are the closest analogues to gear looks):
1. **Armour spell as a visible self-buff** (`magic.cfg:119`). Keep: a timed self-buff with a clear end. Change: a rim of light instead of a colour swap.
2. **Percent-absorption armour** (`imp.cfg:26-27`). Keep: armour as a percentage with a cap. Change: a visible shell tier per percentage band.
3. **Gold hoard tiers** (GOLD_HOARD_1 to 5, `objects.cfg:1341-1437`). Keep: five steps of treasure size as a visual ladder. Change: our own metal ramp (warm bronze, not gold).
4. **Team colour kit** (`config/fxdata/spritecolors.toml:2-6`). Keep: one base set plus per-team palette swaps. Change: a shape badge per team so colour is not the only cue. Note: the asset audit listed 8 team colours; the file lists 9 (Orange is the ninth, line 2).
5. **Level-10 power as the top tier of a creature** (`dragon.cfg:89`, `monk.cfg:89`). Keep: the highest tier unlocks a signature effect. Change: our top tier is shown by a visible change in the model, not only in the power list.

## 5. Zones and dungeons

Terrain and biomes (80 slab types in `config/fxdata/terrain.cfg`):
- Liquids: LAVA (FillStyle 1, Wibble 2, `terrain.cfg:240-250`); WATER (FillStyle 2, Wibble 2, `terrain.cfg:258-268`). "Wibble 2" is a wavy liquid.
- Treasure: GOLD (1024 held, `terrain.cfg:41`), DENSE_GOLD (3072 held, `terrain.cfg:1073`), GEMS (174 held), gold and gem doors (DOOR_MIDAS).
- Room floors: treasury, library, prison, torture, training, workshop, temple pool, graveyard, hatchery, lair, barracks, garden, guard post.
- Doors: wood, braced, steel, magic, secret, midas (gold).
- Other: ABYSS, bridge frame, dirt near water, brick near water (texture animation names).

Dungeon archetypes: the dungeon is a grid of claimed slabs with rooms. Campaigns (13 with maps) and level sets (classic, deepdngn, standard, lostlvls) differ by layout and win condition. Map scripts use `WIN_GAME`, `DUNGEON_DESTROYED` and `DISPLAY_OBJECTIVE`.

Hazards: lava damage by creature kind (`HurtByLava`: 0 for dragon, demonspawn and hell_hound; 2 for most; 8 for druid; 4 for spiderling). Seven trap kinds (`trapdoor.cfg`). Hero party waves with an objective (`ATTACK_ENEMIES`, example at `levels/deepdngn/map00080.txt:91`).

Hero entrance timing (row 23 relevance: spawn interval and cap): the default entrance-generation interval is 350 turns (`config/fxdata/rules.cfg:183`), set per player by `SET_GENERATE_SPEED` and applied at `src/lvl_script_commands.c:6222`. The cap is 200 creatures at the entrance (`rules.cfg:185`). Despawn and per-tick budget are not read.

Top 5 striking:
1. **Lava hall** (deepdngn maps with LAVA plus lava-resting kinds). Keep: a hot floor that heals the right creature. Change: the lava is a safe rest for one of our bosses only.
2. **Gilded vault** (GOLD, DENSE_GOLD, GEMS, gold doors, sorceror sleeping on gold). Keep: treasure as a place to rest and grow. Change: our own ore tiles.
3. **Water moat** (WATER with wavy liquid and the tentacle's sleep-in-water). Keep: water as a zone of its own kind of creature. Change: a visible rim that is not a wall.
4. **Trap corridor** (seven trap kinds, `trapdoor.cfg`). Keep: a corridor where each trap kind reads from its shape. Change: traps telegraph by colour and sound 1 s before firing.
5. **Hero entrance** (generation interval plus party waves, `rules.cfg:183`, `:185`, `levels/deepdngn/map00080.txt:91`). Keep: an entrance on a timer with a cap. Change: spawn caps and grace timers are zone data fields (row 23).

## 6. Item and effect looks worth recreating

- Liquid wibble: lava and water are wavy liquids (`config/fxdata/terrain.cfg:250`, `:268`).
- Eight-frame liquid loops: water (`config/fxdata/textureanim.toml:14`), lava (`:18`), lava2 (name at `:21`). Frame lists are short with a few held frames.
- Gold glint with repeated frames for uneven hold (`textureanim.toml:26`). Gold-near-lava variants use shifted frame cycles (`textureanim.toml`, gold_near_lava entries).
- Six-tile ring props (magic mirror and furnace), each tile on its own 8-frame cycle with paired frames (`textureanim.toml:53`).
- Light-emitting explosions: EFFECT_EXPLOSION_1 to _8 (radius 2 to 16 in the light fields of `config/fxdata/effects.toml`).
- Word of power glow (`effects.toml:276`) and fear circle (`effects.toml:1464`).
- Projectile lights: each shot has a light triple (radius, intensity, flags). Example: fireball at `magic.cfg:537`.
- Lens post effects: 15 lens sections in `config/fxdata/lenses.cfg`, including wibble (`lenses.cfg:11`), fisheye (`:23`) and mist layers.
- Team colour palette swap (`config/fxdata/spritecolors.toml:2-6`).

## 7. Inspiration for Frankendom

Each item is an original. Keep and change are named.

1. **Slag Wyrm** (boss). A tall, slow lair-type brute that rests on a hot tile to recover between phases. Keep: tall slow silhouette; hot-tile rest. Change: telegraphed fan breath; our sigil; the rest tile is a zone data flag, and the boss obeys MAX_ATTACKERS = 3.
2. **Gall Brute** (zone hazard creature). A heavy kind whose area gas spell denies a zone for 5 s. Keep: area denial as a readable zone. Change: a slow puddle with a sound, not a fart gag.
3. **Iron Knight** (lord duellist). A lord with a reflect stance at its fourth rank. Keep: reflect as a counter. Change: a visible reflect ring with a timing window (row 3 parry/guard).
4. **Grave Warden** (immunity counter). Immune to poison and fear, so the player must bring a different tool. Keep: immunity as a readable counter. Change: a rune shows the immunity; the warden has no lightning.
5. **Evolving Hatchling** (tier-up creature). Reaches a new kind at a threshold. Keep: a threshold where the creature becomes a new kind. Change: the trigger is zone milestones verified by the server (row 18 kill and XP rule).
6. **Shaft Sprite** (digger scout). Cheap, fast and digs its own shortcut. Keep: a scout that digs. Change: it edits zone data and leaves a dust trail that fades.
7. **Gilded Vault** (zone). A treasure zone where resting on gold gives experience, with five hoard tiers. Keep: rest-to-grow on a resource tile; five visual tiers. Change: our own ore tiles and a bronze ramp.
8. **Ember Ring** (prop look). A six-tile ring prop with staggered 8-frame loops so the ring never blinks in step. Keep: staggered phases on a ring. Change: our palette, our ring size, a pulse on hit.

Licence note: GPL v2 code and GPL-headed maps may be read for shape. Nothing from the maps, credits or translations is reproduced here. Creature configs carry no stated licence and are used as design pattern only.

Not read: `src/` (about 253 .c files) apart from the three lines cited above; `config/fxdata/slabset.toml` (8633 lines, counted only); `config/fxdata/cubes.cfg` (539 entries, not read); `lang/*.po` (24 translation files plus 2 templates; `lang/gtext_eng.pot` has 1124 msgid entries, counted only); `campgns/*` maps and credits (headers and counts only); Lua scripts (46 files, names only: `config/fxdata/lua/classes` has ten class wrappers); `config/fxdata/sounds.cfg` (3 sections, 144 lines with an equals sign, counted only); `config/mods`; `levels/*` beyond the party and generate-speed lines.
