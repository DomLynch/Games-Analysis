# widelands-widelands (design catalogue, DC060)

Donor: /mnt/frankendom-donors/widelands-widelands/ (Widelands: C++ engine in src/, Lua and PNG/OGG data in data/).
Halves read: DATA pack (data/tribes soldier, training sites and wares; data/world critters and terrains; data/music LICENSE; debian/copyright). Engine slice (src/logic/map_objects/tribes/soldier.cc line 228; src/logic/map_objects/world/critter.cc lines 103, 127; src/logic/map.cc lines 104-105). The server and network half in src/ was NOT read. No other donor is paired; the box holds data and engine together.
Licence: code GPL v2 (COPYING). README line 16 says GPL v2+ with some assets under various Creative Commons licences per folder. Music: data/music/LICENSE.txt tags three tracks CC-BY-SA 3.0 and one CC-BY 4.0 (AU057, lines 3-6). Tribe PNGs are GPL-2+ per debian/copyright lines 206-208. The README (line 173, per AU057) states a policy against AI-generated content. Not a legal reading.
Dom's rule for every item below: recreate as a clearly distinct original, never a copy. Mood only, about 20-30 percent resemblance. Each brief names the trait KEPT and the trait CHANGED.

Counts (from folder listings and grep of data files; not hand-counted):
- 16 critter types (data/world/critters), all wildlife. No hostile creature families found in the data read.
- 5 soldier types, one per tribe with a combat unit: barbarians, empire, atlanteans, amazons, frisians.
- 22 weapon wares in four families (ax 6, sword 4, spear 7, trident 5).
- 25 gear wares (armour 5, helmet 5, shield 2, tabard 2, fur garment 4, boots 3, padded, vest, warrior's coat and tunic 4). These are wares, not sets.
- 69 terrain types across four world sets (desert 17, summer 18, wasteland 17, winter 17).

## 1. Creatures and beasts

Families: the 16 critters are wildlife, not enemies. Their combat-facing data is small, but they drive a food web. Data fields per critter (data/world/critters/<name>/init.lua): size, reproduction_rate, appetite, carnivore flag, spritesheets (idle, eating, walk) and a sound on idle.
- Carnivore-flagged (6): badger, brownbear, fox, lynx, marten, wolf.
- Not carnivore-flagged (10): bunny, chamois, deer, duck, moose, reindeer, sheep, stag, wildboar, wisent.
- Values (size / reproduction / appetite): badger 4/70/50; brownbear 10/60/90; bunny 1/100/-; chamois 5/60/20; deer 4/40/70; duck 1/10/-; fox 4/80/70; lynx 2/30/10; marten 2/50/20; moose 10/30/50; reindeer 4/60/60; sheep 3/40/90; stag 7/30/30; wildboar 8/10/20; wisent 10/20/50; wolf 5/80/100.

Engine side (partly read): reproduction_rate is validated to the range 1 to 100 at load and throws outside it (critter.cc lines 110-112); an appetite on a critter that is neither carnivore nor herbivore throws at load (critter.cc lines 122-125); map.cc lines 104-105 classify carnivore and herbivore for the food web.

Idle and walk vocabulary: idle is 10 fps, walk is 20 fps and directional with six directions (east, north-east, north-west, south-east, south-west, west), plus a menu icon, per critter folder (wolf/init.lua spritesheet blocks at lines 20-44).

Top 8 most striking (labels are mine):

1. Label: pack hunter (wolf).
   Why: highest appetite among carnivores (100) and high reproduction (80). Its idle has its own sound effect at priority 3 percent (wolf/init.lua lines 20-23).
   Keep: the food-web numbers as a balance dial.
   Change: no bark; a low warning call and a stalking walk.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/wolf/init.lua lines 14-16, 20-23.

2. Label: den bear (brownbear).
   Why: size 10, carnivore, appetite 90. Large silhouette at 375 px.
   Keep: size as a silhouette cue.
   Change: a den in the terrain instead of roaming.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/brownbear/init.lua (fields not individually line-verified).

3. Label: shaggy plains bison (wisent).
   Why: size 10 with reproduction 20, a rare large grazer.
   Keep: rarity from low reproduction.
   Change: herds move as a group of three.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/wisent/init.lua (fields not individually line-verified).

4. Label: tusk boar (wildboar).
   Why: size 8, reproduction 10, appetite 20: the rarest large animal in the set.
   Keep: low reproduction as a scarcity signal.
   Change: boars charge when approached, a short telegraph first.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/wildboar/init.lua line 14 (reproduction_rate = 10, confirmed).

5. Label: antler stag (stag).
   Why: size 7, reproduction 30, appetite 30. A mid-size grazer with a clear antler silhouette.
   Keep: mid size with low appetite.
   Change: antler clash sound when two meet.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/stag/init.lua (fields not individually line-verified).

6. Label: great moose (moose).
   Why: size 10, reproduction 30, appetite 50. The second largest body in the set.
   Keep: size tier for large grazers.
   Change: a frost-breath idle instead of plain idle.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/moose/init.lua (fields not individually line-verified).

7. Label: small hunter (lynx).
   Why: size 2 but carnivore, with appetite 10. A predator that rarely eats, so it is cheap to keep alive.
   Keep: a predator with a low appetite as a light balance.
   Change: a short ambush walk into cover.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/lynx/init.lua (fields not individually line-verified).

8. Label: field badger (badger).
   Why: size 4, reproduction 70, appetite 50, carnivore. A mid-size predator with high breeding.
   Keep: a predator that breeds fast enough to be seen often.
   Change: digs a burrow the player can see from the walk path.
   Ref: /mnt/frankendom-donors/widelands-widelands/data/world/critters/badger/init.lua (fields not individually line-verified).

Not found: any boss, elite or spawn director for critters in the data read.

## 2. Classes, races and factions

One line each (role, signature mechanic, progression shape). Barbarian, empire, atlanteans, amazons, frisians are the five soldier types. Each soldier has four battle tracks (health, attack, defense, evade), each with a base, a step per level and a max level (soldier/init.lua of each tribe).

- Barbarians: health max 3 (base 13000, step 3000), attack max 5 (base 1200, step 850, maximum 1600), defense max 0, evade max 2 (base 25, step 16). Signature: attack-heavy; no defense training. Trained at the training camp (attack and health) and the battle arena (evade).
- Empire: health max 4 (base 13000, step 2100), attack max 4 (base 1300, step 920), defense max 0, evade max 2 (base 30, step 16). Signature: the most health levels of any tribe. Trained at the training camp (attack and health) and the arena and colosseum (evade).
- Atlanteans: health max 1 (base 13500, step 4000), attack max 4 (base 1200, step 920), defense max 2 (base 6, step 8), evade max 2 (base 30, step 17). Signature: one health level, a trident line for attack, and a defense shield line. Trained at the labyrinth (defense, health, evade) and the dungeon (attack, tridents).
- Amazons: health max 3 (base 13000, step 2025), attack max 2 (base 1200, step 800), defense max 2 (base 5, step 10), evade max 3 (base 30, step 15). Signature: the most evade levels. Trained at the training glade (evade, boots) and the warriors' gathering (attack, spears).
- Frisians: health max 2 (base 12250, step 2955), attack max 6 (base 1300, step 1006), defense max 2 (base 4, step 16), evade max 0 (base 35). Signature: the most attack levels, with no evade training. Trained at the training camp and the training arena (attack and defense).

Shape: each tribe trains a different subset of the four tracks. Barbarians and empire have no defense track; frisians have no evade track. Class identity comes from which tracks a class can train.

## 3. Weapons

Families: four weapon families of wares, each a training chain consumed at the training site, one ware per level.
- Ax (6 wares): ax_sharp, ax_broad, ax_bronze, ax_battle, ax_warriors (barbarian attack chain). The barbarian training camp consumes one per attack level 1 to 5 (trainingcamp lines 96, 110, 124, 138, 152).
- Sword (4 wares): sword_short, sword_long, sword_broad, sword_double. Frisian chain: sword_long, sword_broad, sword_double at training camp lines 102, 119, 136; the training arena uses the same names for levels 4 to 6 (lines 104, 120, 138).
- Spear (7 wares): spear, spear_advanced, spear_heavy, spear_war (empire attack chain, trainingcamp lines 85, 99, 113, 127). Amazon chain: spear_stone_tipped then spear_hardened (warriors_gathering lines 87, 102). spear_wooden is in the ware folder list; its use was not traced.
- Trident (5 wares): trident_long, trident_steel, trident_double, trident_heavy_double. Atlantean dungeon consumes them in order at lines 237, 251, 265, 279.

Visual tiers: the soldier shows a level ladder icon, one picture per level: health_level0 to health_level3 and attack_level0 to attack_level5 (barbarians/soldier/init.lua lines 119 and 126 load them by pattern). The weapon itself is not drawn per tier in the data read.

Top 5 striking:
1. Warrior's ax (ax_warriors; barbarian attack top step, trainingcamp line 152): the final ax of the chain, consumed with two bread.
2. Gilded armour (see section 4).
3. Atlantean trident chain (dungeon lines 237-279): four tiers, one per level, in one line.
4. Frisian sword chain (training camp lines 102-136, arena 104-138): six attack levels from three swords.
5. Amazon stone-tipped spear (warriors_gathering line 87): the first amazon attack step is a simple stone-tipped spear.

## 4. Armour and gear

Gear families (wares): armour (armor, armor_wooden, armor_helmet, armor_chain, armor_gilded), helmet (helmet, helmet_wooden, helmet_mask, helmet_warhelm, helmet_golden), shield (shield_steel, shield_advanced), tabard (tabard, tabard_golden), fur garment (fur_garment, fur_garment_old, fur_garment_studded, fur_garment_golden), boots (boots_sturdy, boots_swift, boots_hero), and padded or cloth pieces (protector_padded, vest_padded, warriors_coat, tunic).

Gear tiers by stat:
- Health (barbarians): helmet, then helmet_mask, then helmet_warhelm (trainingcamp lines 165, 179, 193).
- Health (empire): armor_helmet, then armor, then armor_chain, then armor_gilded (empire trainingcamp lines 140, 154, 168, 182).
- Defense (atlanteans): shield_steel, then shield_advanced (labyrinth lines 78, 92). Health: tabard_golden (labyrinth line 105).
- Evade (amazons): boots_sturdy, then boots_swift, then boots_hero (training glade lines 93, 107, 122).
- Defense (frisians): fur_garment_golden at a defense step (training arena, line 155 area).

Materials: gold-plated and golden items are the top tiers: armor_gilded (descname "Gilded Armor", armor_gilded/init.lua line 8), helmet_golden, tabard_golden, fur_garment_golden. Each has an idle.png (names only, art not opened).

Top 5 striking:
1. Gilded armour (empire top health step, consume=armor_gilded empire_bread:2 fish,meat:2, trainingcamp line 182): the top tier costs double food. Ref: /mnt/frankendom-donors/widelands-widelands/data/tribes/buildings/trainingsites/empire/trainingcamp/init.lua line 182.
2. Warrior's helmet chain (helmet_mask, helmet_warhelm): the barbarian health ladder with a mask and a war-helm.
3. Golden tabard (atlanteans labyrinth line 105): a single golden item is a whole health step.
4. Padded and warrior's coat pieces (amazon glade inputs, lines 65-67): cloth tier shown as a training input.
5. Boots ladder (amazon glade, lines 93-122): evade tier made from footwear, three steps.

Note: gear is consumed by training, not worn. Visual gear dressing on the soldier is not read.

## 5. Zones and dungeons

Biome sets (data/world/terrains): desert (17 types), summer (18), wasteland (17), winter (17). Each type has an is class: walkable, arable, mineable, unwalkable, unreachable, water.

Notable types:
- Summer lava (data/world/terrains/summer/lava/init.lua): is unreachable (line 6), temperature 1273 (line 13), six textures cycling at fps 4 (lines 10-12), dither layer 30 (line 11), no valid resources (line 7).
- Summer snow: unreachable. Summer swamp: unwalkable. Summer mountains (mountain1 to 4) and forested mountains: mineable.
- Wasteland lava stone (lava_stone1, lava_stone2): unreachable. Wasteland hardlava: arable. Wasteland ashes (ashes1, ashes2): arable.
- Winter ice: walkable. Winter ice floes (ice_floes, ice_floes2): water.
- Desert mountains and mountain meadow: mineable and arable.

Dungeon archetypes: none in the terrain data. Maps and campaigns (data/maps 661 files, data/campaigns 672 files) were listed but not read.

Top 5 striking:
1. Lava field (summer/lava): unreachable ground with a cycling glow texture, dither blend at the rim (lines 6, 10-12).
2. Hard lava (wasteland/hardlava): arable volcanic ground that can be farmed next to lava stone.
3. Ice and floes (winter): walkable ice next to water floes, a frozen sea where the surface is safe.
4. Summer swamp: unwalkable marsh as a barrier.
5. Mineable mountains (mountain1 to 4 in all four sets): the mineable class marks resource ground.

Zone population (spawn caps, respawn, walk density): not in the data read. Event and spawn logic was not read in campaigns.

## 6. Item and effect looks worth recreating

- Player-colour twin frames: each soldier frame has a _pc.png twin (idle_1_pc.png, atk_ok_w_1_pc.png, die_e_1_pc.png in barbarians/soldier). Technique: a second frame set for player tint. Ref: /mnt/frankendom-donors/widelands-widelands/data/tribes/workers/barbarians/soldier/.
- Result-specific battle clips: separate success and failure clips per direction for attack and evade, plus die clips (barbarians/soldier/init.lua lines 142-170). The clip is chosen by logic random among clips that match the soldier's level (soldier.cc line 228). Ref: same init.lua; soldier.cc.
- Level ladder icons: health_level0-3 and attack_level0-5 pictures on the soldier (init.lua lines 119, 126).
- Lava texture cycle: six frames at 4 fps, dither layer 30 (summer/lava/init.lua lines 10-12).
- Critter animation sets: idle at 10 fps, walk at 20 fps and directional, menu icon (wolf/init.lua lines 25-44).
- Critter idle sound with a play chance: sound_effect with priority 3 percent (wolf/init.lua lines 20-23).
- Gilded ware: idle.png per ware (armor_gilded/idle.png) and a golden-named family.

## 7. Inspiration for Frankendom (originals, not copies)

1. Name: Four-Track Veteran. Idea: a soldier with four tracks, each with a base, a per-level step and an icon ladder. Keep: four tracks and icon ladders above the unit. Change: our tracks are guard, stamina, crit and reach, with rune-ladder icons and a glow rim for veterans.
2. Name: Gear-Fed Training. Idea: each level consumes one gear piece plus food at a training site. Keep: one gear piece and food per level. Change: gear comes from loot drops (row 18), not a workshop chain.
3. Name: Gilded Top Tier. Idea: the top gear step costs double food. Keep: top tier costs double. Change: gold shows as an edge glow and a short stinger, not a metal colour.
4. Name: Result Clip. Idea: separate success and failure clips per direction so the result reads without a number. Keep: result reads from the clip. Change: one clip with a result glyph, hitstop on the hit frame, and a dust curl on a miss (rows 10 and 12).
5. Name: Food-Web Critters. Idea: size, reproduction and appetite numbers plus a carnivore flag define predator and prey. Keep: numeric food web. Change: predators raid field edges, not herds.
6. Name: Lava Rim. Idea: an unreachable lava ring with a six-frame glow and dither blend. Keep: dither blend and a slow cycle. Change: heat shimmer distortion instead of a flat cycle.
7. Name: Scarred Ground. Idea: volcanic ground that is arable beside lava stone. Keep: lava-derived ground that can be used. Change: lower yield but fire-hardened, so it reads as a different biome.
8. Name: Track Subsets. Idea: each class trains a different subset of tracks. Keep: class identity from which tracks a class trains. Change: every class gets one unique track that no other class has.

Licence note: code GPL v2; assets are mixed per folder (see Licence line). Ideas here are clean-room shapes from the data. Do not reuse names, art or sound. The README AI-content policy (line 173, per AU057) is noted; this catalogue only uses data shapes.

Brief rule served: recreate as a clearly distinct original, never a copy. Each item names the trait kept and the trait changed.

## 8. Not read

Engine half: most of src/ (battle roll resolution, the battle outcome code, and the server and network half). Only soldier.cc line 228, critter.cc lines 103-127 and map.cc lines 104-105 were read. Campaigns (data/campaigns, 672 files) and maps (data/maps, 661 files): listed, not read. Locale and string tables (data/i18n, 1,803 files, 53 locale entries per AU057): NOT opened, so no string grammar is described. Critter Lua for all 16 except wolf and duck field lines: fields listed from grep, lines not individually verified. Sprite and sound files (114 OGG). The 48 rows of the sound csv were tallied by AU057, not read one by one. Other tribes' non-combat workers and their Lua. Scripting (data/scripting), templates, shaders and AI scripts.
