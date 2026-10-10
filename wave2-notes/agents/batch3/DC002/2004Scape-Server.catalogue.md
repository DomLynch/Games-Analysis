# 2004Scape-Server: design catalogue (DC002)

Read from the VPS tree only (`/mnt/frankendom-donors/2004Scape-Server/`), over read-only ssh. Nothing copied, run or viewed as an image.

**Half read:** the server half, with its data pack (`data/src/scripts/`, `data/src/scripts/_unpack/`). These hold the names, levels, drop tables, item and location tables, and the effects table. The matching client half is in the same repo under `public/client/` (JS and wasm): **not read**. A client by name in the box, `LostCityRS-Client-TS`, is name-match only and not verified as the matching half.

**Class:** game-derived content has no licence or stated source (AU002, class C). Treated as category-level only: creature families and techniques, never instance-level looks. Names below are the donor's data names, used only to point at a file.

Rule for every item below: recreate as a clearly distinct original, never a copy. Keep the trait named, change the trait named.

## Counts (block counts, not de-duplicated)
| Category | Count | Note |
|---|---|---|
| Creatures | 362 | `op2=Attack` NPC blocks across all 116 `.npc` files. Includes the 148 attackable blocks of `_unpack/all.npc`; overlap with area files not checked. |
| Classes | 15 | skill folders in `data/src/scripts/`. No character classes in the data. |
| Weapons | 193 | name lines in `skill_combat/configs/melee/*.obj`. Includes armour, poisoned variants and trail sets. |
| Gear sets | 9 | name groups in `melee/trails.obj`: 3 faction sets plus black, adamant and rune trail sets, each in trim and gold-trim variants. |
| Zones | 32 | entries under `data/src/scripts/areas/` (30 `area_*`, `areas_heroes_guild`, `monastery`). |

Other totals (for planning): 1,869 item blocks across all `.obj`; 3,387 location blocks across `.loc`; 1,159 `.rs2` script files.

## 1. Creatures and beasts
Source of truth: `data/src/scripts/_unpack/all.npc` (179 NPC blocks, 148 attackable), plus per-area `.npc` files. Level and tier come from each block's level field. Drops escalate in `data/src/scripts/drop tables/scripts/*.rs2` (63 files) using 128-slot random rolls.

Families (names as data, with file refs):
- **Dragons:** baby, red, blue, green, black; a king black dragon boss. Refs: `_unpack/all.npc` blocks `[babydragon] [red_dragon] [blue_dragon] [green_dragon] [black_dragon]`; `areas/area_wilderness/configs/king_dragon.npc` `[king_dragon]`; `drop tables/scripts/red_dragon.rs2` (drop tiers in 128 slots).
- **Demons:** lesser, greater, black. Refs: `_unpack/all.npc` `[lesser_demon] [greater_demon] [black_demon]`.
- **Undead:** skeletons (unarmed, armed, giant, mage), zombies (four blocks), ghosts, mummy, summoned zombie. Refs: `_unpack/all.npc` `[skeleton_*] [zombie_*] [summonedzombie] [ghost]`; `drop tables/scripts/skeleton.rs2`, `zombie.rs2`.
- **Giants:** giant, moss, ice, fire; cyclops, jogre. Refs: `_unpack/all.npc` `[giant] [mossgiant] [icegiant] [firegiant] [cyclops] [jogre]`.
- **Spiders:** giant (two), jungle, deadly red, ice, shadow, poison (dungeon). Refs: `_unpack/all.npc` `[spider] [giantspider1] [giantspider2] [jungle_spider] [deadly_red_spider] [ice_spider] [shadow_spider] [dungeonspider]`.
- **Scorpions:** scorpion, poison, pit, king. Ref: `_unpack/all.npc` `[scorpion] [poison_scorpion] [smallscorpion] [kingscorpion]`.
- **Canines:** wolf, big wolf, white wolf, guard dog, hellhound. Ref: `_unpack/all.npc` `[wolf] [wolfpack_leader_whiter] [pack_wolf_whiter] [whitewolf] [guarddog] [hellhound]`.
- **Bears, unicorns, vermin, flyers, constructs, ice warriors:** Refs in `_unpack/all.npc` (blocks `[brownbear] [darkbear]`, `[unicorn] [black_unicorn]`, `[rat] [giantrat] [dungeon_rat]`, `[bat] [oomlie_bird]`, `[golem] [suit_of_armour] [magicaxe]`, `[icewarrior] [icewarrior_queen] [ice_queen]`).
- **Humanoid factions:** goblins, hobgoblins, orcs, Zamorak monks, pirates, black knights, dark wizards, barbarians, guards. Ref: `_unpack/all.npc` `category=` lines.
- **Critters and livestock:** chicken, duck, cow, penguin, monkey, snake, yeti, mammoth.

Escalation: each family has tiers by level field (for example a zombie ladder of four blocks and a skeleton ladder of four). The dragon and demon blocks read sit near the top of the level field.

Boss pattern: `areas/area_wilderness/scripts/king_black_dragon.rs2` (386 lines; read 1-141) has a random attack pick each tick (`kbd_random_attack`, line 112), a directional breath chosen by quadrant (`kbd_dragonfire_far`, line 124 onward), and its own drop table branch (lines 26-71). Named elites in the NPC data: Thrantax, Ice Queen, Invrigar the Necromancer, Gunthor the Brave, a Zamorak wizard (`[trail_hard]`), and Salarin (drop script only).

Top 8 striking (our own labels, category-level):
1. **Dusk-scaled wyrm king (boss).** Why: a size field of 5 and a 160 resize on both axes (the only such pair checked), a directional breath chosen by the player's quadrant, and a random pick between attacks each tick. Keep: oversized scale; breath aimed at the player's side; attack pick at random. Change: palette and wing silhouette; a visible wind-up before breath; our own name and drop table. Ref: `areas/area_wilderness/configs/king_dragon.npc [king_dragon]`; `scripts/king_black_dragon.rs2` lines 112-141.
2. **Ember hound (single high-tier hound).** Why: a high-tier hound; the name sets a fire mood. Model, speed and animation not viewed. Keep: quadruped, fire mood, high placement. Change: bony plating and a split tail; our own sound. Ref: `_unpack/all.npc [hellhound]`.
3. **Rift stalker (three tiers).** Why: three demon blocks in one level-stepped ladder, with a portal effect in the effects table. The visual step between tiers was not viewed. Keep: three-tier ladder; portal arrival. Change: crystal shards not horns; our own portal colour; our own size step. Ref: `_unpack/all.npc [lesser_demon] [greater_demon] [black_demon]`; `_unpack/all.spotanim [portal]` (line 21).
4. **Region-dyed spider brood.** Why: several spider blocks share a family in different tiers and regions. The models were not checked to be shared. Keep: family of named variants; poison and ice tiers. Change: silk as a traversal hazard; leg count; our own palettes. Ref: `_unpack/all.npc [spider] [jungle_spider] [deadly_red_spider] [ice_spider] [shadow_spider]`.
5. **Bone guard (armed ladder).** Why: undead in four states by name; the armed state is its own block. Silhouette not viewed. Keep: armed versus unarmed as separate states; giant step; caster variant. Change: the mage carries a floating orb, not a staff; a bone palette of our own. Ref: `_unpack/all.npc [skeleton_unarmed] [skeleton_armed] [giantskeleton] [skeletonmage]`; `drop tables/scripts/skeleton.rs2`.
6. **Scorpion king ladder.** Why: four named tiers, small to king, by level field. Body shape not viewed. Keep: ladder from small to king; poison as a separate variant. Change: tail shape and claw count; our own palette. Ref: `_unpack/all.npc [scorpion] [poison_scorpion] [smallscorpion] [kingscorpion]`.
7. **Frost queen (elite).** Why: a named ice-tier elite on a warrior base. Keep: named elite on a warrior base; frost mood. Change: crown or cape silhouette of our own; our own frost palette. Ref: `_unpack/all.npc [icewarrior_queen] [ice_queen]`.
8. **Grave caller (summoner).** Why: a caster with a named summoned creature; a summon gives a clear tell. Keep: summon-an-ally pattern. Change: summoned type and cue; our own hood and staff. Ref: `_unpack/all.npc [necromancer] [invrigar_the_necromancer] [summonedzombie]`. Summon logic not read.

Sound: AU002 reports one sound folder per creature under `data/src/synth/npc/` (for example `bat/`). Not re-checked in this pass; no synth file was decoded.

## 2. Classes, races and factions
- **Skill tracks (15):** agility, combat, cooking, crafting, firemaking, fishing, fletching, herblore, magic, mining, prayer, runecraft, smithing, thieving, woodcutting. Each has a configs and scripts folder. Levels gate items and actions (`levelrequire` folder). No character class in the data.
- **Combat styles:** six damage types (stab, slash, crush, ranged, magic, melee); nine stances (accurate, aggressive, defensive, controlled for melee; rapid and long-range for ranged; normal and defensive for magic). Refs: `skill_combat/configs/combat_damagetypes.constant`, `combat_damagestyles.constant`, `combat.dbtable`.
- **Prayers (15):** strength and reflex boosts; rapid restore and heal; item protection; protection from magic, missiles and melee. Ref: `skill_prayer/configs/prayers.constant`.
- **Races and factions (from NPC categories):** human citizens, guards, barbarians, pirates, Zamorak monks, black knights, dark wizards, ice warriors, chaos dwarves, gnomes (`areas/area_gnome/`) and ogres (names only).

## 3. Weapons
Families (`skill_combat/configs/melee/*.obj`, `ranged/*.obj`, `magic/*.obj`):
- **Melee:** 2h sword, longsword, scimitar, dagger (plus poisoned variant), mace, battleaxe, spear.
- **Shields and helms:** wooden, square, kiteshield, dragonfire shield; full and medium helm.
- **Bows and crossbows:** longbow and shortbow in oak, willow, maple, yew and magic tiers; ogre bow; crossbow.
- **Ammunition and throwing:** arrows (bronze to rune, plus fire arrows), bolts, darts, javelins, knives, thrown axes.
- **Elemental staves:** fire, water, air and earth battlestaves; mystic staves; plain staves.

Tier distinctness: each tier has a name and its own model and sprite fields, but the visual step between tiers was not viewed.

Top 5 striking:
1. **Fire arrows.** Why: elemental ammo with its own travel effect. Keep: per-tier travel and launch pair. Change: fire palette and our own element. Ref: `skill_combat/configs/ranged/arrows.obj` (fire arrow rows); `_unpack/all.spotanim [fire_arrow_travel] [fire_arrow_launch]`.
2. **Dragonfire shield.** Why: a named special shield in `shields.obj`. Mechanic not read. Keep: special named top shield. Change: ember ring look of our own. Ref: `skill_combat/configs/melee/shields.obj` line 226.
3. **Elemental battlestaff.** Why: a staff per element with its own tip look. Keep: one element per staff. Change: element set and glow of our own. Ref: `skill_combat/configs/magic/battlestaves.obj` (line 34, fire battlestaff); `mysticstaves.obj` (line 3).
4. **Poisoned dagger line.** Why: a poisoned variant as its own item in each tier, with a poison param on the weapon. Keep: poisoned as a separate item. Change: a visible poison sheen, not a label. Ref: `skill_combat/configs/melee/daggers.obj` line 588; `skill_combat/configs/weapon_poison.param`.
5. **Ogre bow.** Why: a big bow with its own ogre arrow effect. Keep: oversized bow tied to its arrow effect. Change: materials and palette of our own. Ref: `skill_combat/configs/ranged/bows.obj` line 343; `_unpack/all.spotanim [ogre_arrow_travel] [ogre_arrow_launch]`.

## 4. Armour and gear
- **Metal ladder:** bronze, iron, steel, black, mithril, adamant, rune, dragon (dragon on a few slots only). Ref: `skill_combat/configs/melee/*.obj`.
- **Trim and gold-trim variants:** black, adamant and rune trail sets each come in a trim variant `(t)` and a gold-trim variant `(g)`. Descriptions say so: "with trim" and "with gold trim". Ref: `skill_combat/configs/melee/trails.obj` (names `Black platebody (t)` and `(g)`).
- **Faction sets:** Zamorak, Saradomin and Guthix full sets (four pieces each). Descriptions read "in the colours of", over a rune-tier shape with palette swaps. Ref: `melee/trails.obj`.
- **Robes:** druid, monk, black. Ref: `skill_prayer/configs/robes.obj`.
- **Leather:** a crafting set of 22 item blocks. Ref: `skill_crafting/configs/leather/leather_gear.obj`.

How the game shows tiers: name, model, palette swap (`recol` pairs) and 2D inventory fields. No glow or aura field was found in the item blocks read (a search of all `.obj` for glow, aura, shine, shimmer, sparkle, glint, gold, metal, crystal hit only names and descriptions). The "gold" hits are gold bars and gold-trim descriptions.

Top 5 striking:
1. **Trim ladder.** Why: each top metal tier has two variants, trim and gold trim. Keep: two variants per tier. Change: gold trim as a rim-light shader, not a palette. Ref: `melee/trails.obj`.
2. **Faction plate sets.** Why: three four-piece sets from one shape, coloured by faction. Keep: one shape, palette per faction, four pieces each. Change: our own factions, colours, and a shoulder mark. Ref: `melee/trails.obj` (`Zamorak full helm`, `Saradomin plate`, `Guthix platebody`).
3. **Dragon top tier.** Why: dragon on a few slots as the top of the metal ladder. Keep: dragon as a rare top tier on a short list of slots. Change: our own top-tier metal, not the donor name. Ref: `melee/longswords.obj`, `battleaxes.obj`, `medhelms.obj`.
4. **Robe set.** Why: three named cloth robes (druid, monk, black) as a separate material from metal. Keep: cloth as its own material line. Change: our own robe colours and trims. Ref: `skill_prayer/configs/robes.obj`.
5. **Glowing elemental orb.** Why: described as a magic glowing orb (fire, water, air). Keep: a glowing orb per element. Change: the glow colour and pulse. Ref: `skill_magic/configs/orbs.obj` `[fire_orb]` (line 18).

## 5. Zones and dungeons
Biomes (from `data/src/scripts/areas/` names and files): desert, Karamja, White Wolf Mountain, Entrana island, fishing platform, monastery, Mage Arena, Lost City, Brimhaven dungeon, Taverly dungeon, Ardougne east and west, Varrock, Falador, Camelot, Catherby, Seers, gnome area, Heroes' Guild, combat training.

Dungeon archetypes: underground wilderness (`area_wilderness/configs/wilderness_zones.dbrow` pair with a comment naming an Edgeville dungeon wilderness zone; `wilderness_levels.constant` underground warning line), lava maze (wilderness). Brimhaven and Taverly are area folders only; their dungeon nature was not checked.

Hazards and features (names from `_unpack/all.loc`, counts from block names): rockslide (24), web and cave web, fire and fire remains, ice column, ice light, ice throne, obelisks of fire and water, magic portal.

Top 5 striking:
1. **Wilderness depth bands.** Why: danger level steps every 8 tiles from a start line. Keep: depth bands with a warning line. Change: band names and perks. Ref: `area_wilderness/scripts/wilderness_levels.rs2` lines 2-4; `configs/wilderness_levels.constant`; `configs/wilderness_zones.dbrow`.
2. **Lava maze.** Why: a maze with a locked chest that needs a key item. Keep: key item gates the chest. Change: maze shape and reward. Ref: `area_wilderness/scripts/lava_maze.rs2`.
3. **Trail routes (easy, medium, hard).** Why: three tiered routes, each with its own item list. Keep: tier ladder of routes. Change: our own route names and rewards. Ref: `minigames/game_trail/configs/trail_easy.obj`, `trail_medium.obj`, `trail_hard.obj`.
4. **Ice cave props.** Why: ice throne, column and light set a frost mood from location names alone. Area not verified. Keep: frost prop set. Change: our own props. Ref: `_unpack/all.loc` (names only).
5. **Rockslide hazard.** Why: a common hazard object, 24 instances in the location dump. Script not read. Keep: a readable hazard object. Change: its trigger and warning. Ref: `_unpack/all.loc` (name only).

## 6. Item and effect looks worth recreating
Source: `data/src/scripts/_unpack/all.spotanim` (1,779 lines, effect table), `data/src/scripts/skill_magic/configs/orbs.obj`.
1. **Tiered projectile effect pairs.** Each ammo tier has a travel and a launch effect. Ref: `_unpack/all.spotanim` blocks `[bronze_arrow_travel]`, `[iron_arrow_launch]`, `[fire_arrow_travel]`, `[ogre_arrow_travel]`.
2. **Palette-swapped effects on one model.** One effect model in several colourways through palette pairs. Ref: `_unpack/all.spotanim` `[shooting_star]`, `[bookofbinding_effect]`, `[lavasplash]`.
3. **Scaled effects.** Resize fields stretch an effect on both axes: a huge smoke puff and a tall flame wall. Ref: `_unpack/all.spotanim` `[smokepuff_huge]`, `[nezik_flamestrike]`.
4. **Per-effect lighting.** Ambient and contrast fields set the lighting on one effect. Ref: `_unpack/all.spotanim` `[enchant_ring]`, `[stunned]`.
5. **Breath effects with named animation.** Single fire, triple fire, ice and acid, each a model and animation pair. Ref: `_unpack/all.spotanim` lines 1-20: `[firebreath_attack]`, `[triple_firebreath_attack]`, `[icebreath_attack]`, `[acidbreath_attack]`.
6. **Portal and whirlpool.** Portal, portal end and whirlpool are alpha-blended model and animation pairs. Ref: `_unpack/all.spotanim` `[portal]` (line 21), `[portalend]`, `[whirlpool]` (line 332).
7. **Hit feedback types.** Three hit-mark types: block, damage, poison. Ref: `skill_combat/configs/hitmark.constant`.

## 7. Inspiration for Frankendom (originals, 5-10)
1. **Cinder Tyrant.** A boss a head taller than the zone; its breath turns to whoever is closest on its side, with a wind-up that tells the player where it fires. Keep: oversized scale; breath by quadrant; random attack pick. Change: ember and slate palette; wing shape; a wind-up tell; our own name and drop table.
2. **Rift Stalkers.** Three demon tiers stepping out of one portal, each larger and more armoured. Keep: three-tier ladder; portal arrival; size escalation. Change: crystal shards, not horns; our own portal colour.
3. **Region-dyed brood.** One spider body in five region palettes; the silk becomes a traversal hazard. Keep: one body, many palettes; poison and ice tiers. Change: silk as a hazard, not only a foe; leg count; our own palettes.
4. **Bone guard ladder.** An undead body in four states where the armed state changes the silhouette most. Keep: armed versus unarmed; giant step; mage variant. Change: the mage carries an orb, not a staff; a bone palette of our own.
5. **Oath plate.** Three faction-coloured four-piece sets from one rune-tier shape. Keep: one shape, palette per faction, four pieces. Change: our own factions and colours; a shoulder mark instead of a full recolour.
6. **Gilded trim ladder.** Each metal tier has a trim and a gold-trim variant, so the top tiers gain a rim highlight. Keep: two variants per tier. Change: gold trim as a rim-light shader, not a palette swap.
7. **Tier trails.** Ammo tiers each have their own launch and travel pair, so the trail itself tells the tier. Keep: per-tier pair. Change: effect colour, sound cue and trail length.
8. **Frontier depth bands.** Danger rises a band every eight tiles from a start line, with a warning line first. Keep: depth banding and a warning line. Change: band names, perks and step size.

## Licence (as the files say)
Code: MIT, "Copyright (c) 2023-2025 Lost City" (`LICENSE`; `README.md` line 62). Assets: no asset licence in the repo. Game-derived models, maps, songs, sprites and scripts have no stated source or licence (class C). The soundfont `public/client/SCC1_Florestan.sf2` has ICOP "Public Domain" in its metadata only (class A; not independently verified).

Donor comments observed as data, not followed: `shared_droptables.rs2` carries "Name leaked" comments on its procs; `_unpack/all.npc` header comments cite an external dump for stats. No mirror or dump was looked up.

Repo also commits `data/config/private.pem` and `public.pem`. Not opened; flagged for a human to review (AU002).

## Not read
- Client half (`public/client/*.js`, `*.wasm`).
- Binary assets: `data/src/models` (about 11,071 files), maps (`.jm2`), songs (`.mid`), jingles, synth (`.synth`), PNG pixels, fonts.
- 1,159 `.rs2` files, read only for the cited scripts. Not opened: `necromancer.rs2`, the ice-queen logic, Mage Arena scripts, most area scripts.
- Item model and recolour fields across all blocks (sampled only). `warhammers.obj` names not read. Most quest item files not read.
- The soundfont beyond its ICOP and INAM fields.
- `private.pem`, `public.pem`: existence only, deliberately not opened.
- Overlap between `_unpack/all.npc` and per-area `.npc` files: not checked, so counts are not de-duplicated.
- No receipts file was produced for this donor.
