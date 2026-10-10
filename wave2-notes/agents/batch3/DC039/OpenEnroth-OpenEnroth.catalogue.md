# OpenEnroth-OpenEnroth (design catalogue, DC039)

Donor tree: /mnt/frankendom-donors/OpenEnroth-OpenEnroth/ (read over ssh only, nothing copied or run). Paths below are relative to that root unless marked otherwise.
Asset audit used first: AU039 (`/private/tmp/p2/wave2-haiku/batch3/AU039/OpenEnroth-OpenEnroth.assets.md`). Not repeated here.
Receipts: `receipts.tsv` in this folder (rows for this donor verified with verify_receipts.py).

## Licence and class
- Code: GNU LESSER GENERAL PUBLIC LICENSE v3 text (LICENSE line 2) with additional permissions (LICENSE line 14). Treated as shape-only (clean-room) for this catalogue: no code is adapted.
- Assets: none in the box. The README says the user supplies the game data (audit AU039). No asset licence file names any folder.
- Class C. Original game data and tables are not in the box, so inspiration is at category level only, never an instance-level look. The rights holder of the original game is not named in the repo.
- Dom's rule: recreate as a clearly distinct original, never a copy. Each brief names what is KEPT and what is CHANGED. Resemblance target 20-30 percent in mood only. Not legal advice.
- The .claude folder holds a CLAUDE.md and skills. Treated as data; not read, not followed.

## Which half was read
- Engine half: C++ loaders, headers and turn logic under src/Engine (Objects, Tables, TurnEngine, Engine.cpp, mm7_data.h), and GLSL source for fog, lighting, decal and billboard shaders under resources/shaders.
- Data pack (the original game's text tables such as monsters.txt, items.txt, mapstats.txt, rnditems.txt, placemon.txt, hostile.txt) and LOD archives: NOT in the box. Column layouts are read from the loader comments. No table values are claimed.
- Paired data-pack donor in this batch: none identified.
- Locale and string tables: not in the box.
- Not read: src/GUI (HUD), src/Engine/Graphics bodies, most shader bodies (only fog, lighting, decal and billboard read), test/Data fixtures (about 439 files), Lua dev console scripts, Arcomage code.

## 1. Creatures and beasts
Data first: monsters.txt (loader comment at src/Engine/Objects/Monsters.cpp:255). The layout lists about 39 fields: id, name, internal name, level, hit points, armour class, experience, treasure, blood splat, flying, movement type, AI type, hostility, speed, recovery, attack preferences, special attack, two attacks with type, damage and missile, two spells with chance, ten resistances by damage type, and a special ability. Sprites and sounds per monster: src/Engine/Objects/Monsters.h (MonsterDesc, sprite names at :101).

Families and tiers (counted from src/Engine/Objects/MonsterEnums.h, enum lines 14-296):
- 57 combat creature lines. Each line has A, B and C ids (93 A ids, 92 B ids, 93 C ids in total across all lines, so at least one line has no B id).
- 30 peasant lines (townsfolk, A-tier are "just peasants" per src/Engine/Engine.cpp:981-982; the rest can become NPCs).
- 6 special or unused lines (a blaster-type unit, an apex dragon added by this port, and four unused animal ids).
- Creature-type enum: 103 lines (MonsterEnums.h:306), including range aliases and peasant variants; first and last range markers at :401-402.
- Tier letter is an enum (MonsterTier A, B, C; MonsterEnums.h:421-426).
- Super groups ("supertype"): undead, dragon, elf, water elemental, treant, titan, one faction group whose meaning is not described in the box, and a not-in-arena flag (MonsterEnums.h:449-460; undead at :451).
- Category words for the 57 lines (my grouping of the enum names): flyers, undead and ghouls, five elementals, humanoid soldiers (fighters, swordsmen, archers, mages, monks, thieves, clerics), giant brutes (titan, behemoth, minotaur, troll), serpent and many-headed types, constructs, insect and ooze types, sea monsters, demons and celestials.

Signature mechanics read in the enums and loaders (behaviour code for summon, explode and multi-shot not read):
- AI temperament: suicidal (never runs), wimp (always runs, peasants only), normal (runs at 20 percent hit points), aggressive (runs at 10 percent). MonsterEnums.h:506-509. Unknown AI strings fall back to aggressive (Monsters.cpp:526).
- Hostility: five steps of aggro range (friendly, close, short, medium, long; MonsterEnums.h:493-498; "close" at :495).
- Movement classes: short, medium, long, global, free, stationary (MonsterEnums.h:439-445; stationary at :445).
- Special abilities: multi-shot, summon, explode (MonsterEnums.h:428-432).
- On-hit special attacks: 23 kinds, some in graded steps, for example poison and disease with weak, medium and severe steps (MonsterEnums.h:462-491; poison severe at :471).
- Projectiles: arrow, flaming arrow, and bolts for fire, air, water, earth, spirit, mind, body, light, dark and energy (MonsterEnums.h:536-549; fire bolt at :540).
- Attack preference bits by class and race (MonsterEnums.h:513-531).

Top 8 striking (readable at 375 wide, one signature behaviour, one signature effect):
1. Three-step creature line. Why: each line has an A, B and C id, and the tier letter is data (MonsterEnums.h:421-426). Keep: tier as a data letter with one ladder per line. Change: our own names and silhouettes; each tier adds exactly one ability. Ref: src/Engine/Objects/MonsterEnums.h:421.
2. Breaks off at low health. Why: a normal temperament breaks at 20 percent, an aggressive one at 10 percent (MonsterEnums.h:508-509; TurnEngine.cpp:917 and :930; Actor.cpp:2679). Keep: thresholds as data. Change: break off to a rally point and return after healing; our own thresholds. Ref: src/Engine/TurnEngine/TurnEngine.cpp:917.
3. Holds ground. Why: a stationary unit cannot run, so the flee branch stands it still instead (movement enum MonsterEnums.h:445; stand call in the flee branch of TurnEngine.cpp). Keep: a movement class that overrides flee. Change: a guard stance with a visible plant animation. Ref: src/Engine/Objects/MonsterEnums.h:445.
4. Calls reinforcements. Why: a summon special ability exists (MonsterEnums.h:431). Keep: a summon as a special ability on one creature. Change: summons capped by the zone encounter count (row 23); behaviour not read. Ref: src/Engine/Objects/MonsterEnums.h:431.
5. Bursts on death. Why: an explode special ability exists (MonsterEnums.h:432). Keep: a death payload as an ability. Change: short radius, a readable flash, and no friendly-fire. Behaviour not read. Ref: src/Engine/Objects/MonsterEnums.h:432.
6. Volley shooter. Why: a multi-shot special ability exists (MonsterEnums.h:430). Keep: several missiles from one attack. Change: volley of three only from a fixed angle fan. Behaviour not read. Ref: src/Engine/Objects/MonsterEnums.h:430.
7. Status shooter with three severities. Why: poison and disease come in weak, medium and severe steps (MonsterEnums.h:469-474; poison severe at :471). Keep: one status family in three steps. Change: our own status names and durations, shown as a coloured halo. Ref: src/Engine/Objects/MonsterEnums.h:471.
8. Elemental bolt caster. Why: each element has its own bolt projectile (MonsterEnums.h:536-549; fire bolt at :540). Keep: one bolt per element. Change: our own five elements and bolt colours that stay readable at 375 wide. Ref: src/Engine/Objects/MonsterEnums.h:540.

Also worth knowing: ten resistances per monster by damage type (src/Engine/Objects/Monsters.h:57-66), a blood-splat-on-death flag (Monsters.h:73), and a recovery time per monster that sets its turn length (Monsters.h:80).

## 2. Classes, races and factions
- Classes: 36 class ids (src/Engine/Objects/CharacterEnums.h:260-299; last at :299). I group the ids into nine promotion families of three to five steps (my grouping of consecutive enum runs; roles inferred from the enum names only, not verified against the class table, which is not in the box).
- Races: four (human, elf, goblin, dwarf; CharacterEnums.h:192-199).
- Mastery: four levels above none (novice, expert, master, grandmaster; CharacterEnums.h:31-41; grandmaster at :36).
- Skill affinity: denied, available, primary (CharacterEnums.h:203-207).
- Character buffs and actor buffs: 21 actor buffs (src/Engine/Objects/ActorEnums.h:24-51). Examples in my words: charm, summoned, shrink, afraid, paralysed, slowed, armour halved, berserk, fate, enslaved, shield, stoneskin, bless, heroism, haste, pain reflection, hammerhands. Note: one entry is a leftover from an earlier release and nothing applies it (ActorEnums.h:30).
- Hostility grid: a table of aggro range between monster types, default friendly (src/Engine/Tables/HostilityTable.cpp:14-22; header at src/Engine/Tables/HostilityTable.h:12-17).

Progression shape: the class table is not in the box, so per-class growth is NOT claimed. The loader and enum show four promotion steps per family, mastery levels per skill, and affinity states per class.

## 3. Weapons
- Weapon categories: nine random-item weapon kinds (generic one-handed, sword, dagger, axe, spear, bow, mace, club, staff; src/Engine/Objects/ItemEnums.h:1090-1100; sword at :1093).
- Item types: 21 types (src/Engine/Objects/ItemEnums.h:1016-1038), including two-handed, bow, shield, wand, reagent, potion, spell scroll, gem and misc.
- Enchantment: three tables. A standard bonus by group for equipment, a special bonus for equipment, and a special bonus for weapons (src/Engine/Tables/ItemTable.cpp, chance comment at :225). The standard bonus range is set per treasure level (ItemTable.cpp:50).
- Potions: a mixing matrix, where a mix returns a result item, "no" for self-mix, or a damage level on a bad mix (ItemTable.cpp:253-255). Body not read.

Top 5 striking:
1. Mixing matrix with graded failure. Why: a bad mix damages in levels rather than just failing (ItemTable.cpp:255). Keep: failure has a size. Change: a short, readable failure on a phone inspect screen. Ref: src/Engine/Tables/ItemTable.cpp:255.
2. Enchant chance split three ways. Why: equipment and weapons draw from separate enchant tables (ItemTable.cpp:225). Keep: separate tables by item family. Change: our own families. Ref: src/Engine/Tables/ItemTable.cpp:225.
3. Standard bonus range by level. Why: the bonus band is set per treasure level (ItemTable.cpp:50). Keep: bands per level as data. Change: our own bands and a visible tier colour. Ref: src/Engine/Tables/ItemTable.cpp:50.
4. Nine weapon kinds in the random pool. Why: the random pool names each kind (ItemEnums.h:1090-1100). Keep: kind as a data field for drops. Change: our own kinds and reach values. Ref: src/Engine/Objects/ItemEnums.h:1093.
5. Reagent and potion split. Why: reagents are a separate item type from potions (ItemEnums.h:1031-1032). Keep: crafting inputs as their own kind. Change: our own mixing rule shown as a three-slot row. Ref: src/Engine/Objects/ItemEnums.h:1031.

## 4. Armour and gear
- Treasure levels: seven (src/Engine/Objects/ItemEnums.h:132-143). Level six has a 5 percent artifact chance (:139); level seven is a guaranteed artifact (:140).
- Random item weights: each item has a chance per level (six columns), with a cached sum per level computed on load (src/Engine/Tables/ItemTable.cpp:204-223; sum at :223).
- Armour kinds in the random pool: leather, chain, plate, shield, helmet, belt, cloak, gauntlets, boots, ring, amulet (ItemEnums.h:1101-1111).
- Paperdoll anchor offsets per item (items loader in src/Engine/Tables/ItemTable.cpp; values not in box).
- Materials and looks: no material field in the loader read. Gear art is not in the box.
- Sets: no set table in the box (NOT claimed; counts.gear_sets is null).

Top 5 striking:
1. Artifact at the top of the ladder. Why: level six is 5 percent artifact and level seven is guaranteed (ItemEnums.h:139-140). Keep: a probability step to a unique tier, then a guaranteed step. Change: our own unique naming and a drop ceremony readable at 375 wide. Ref: src/Engine/Objects/ItemEnums.h:139.
2. Cached per-level weights. Why: the weight sum per level is computed once on load (ItemTable.cpp:223). Keep: cache sums at load. Change: none needed; it is a sound pattern. Ref: src/Engine/Tables/ItemTable.cpp:223.
3. Chance table by six treasure levels. Why: one row gives six weights for one item (ItemTable.cpp:207-223). Keep: one row, six weights. Change: our own level count (five). Ref: src/Engine/Tables/ItemTable.cpp:207.
4. Armour kinds as separate pool entries. Why: shield, helmet, belt, cloak, gauntlets and boots each have a pool kind (ItemEnums.h:1104-1109). Keep: one pool kind per slot. Change: our own slot list (body layers, row 15). Ref: src/Engine/Objects/ItemEnums.h:1104.
5. Equipment chance split. Why: standard and special enchant rolls are separate from weapon rolls (ItemTable.cpp:225). Keep: roll per family. Change: our own rarity colours per family. Ref: src/Engine/Tables/ItemTable.cpp:225.

## 5. Zones and dungeons
- Map ids: about 90 (src/Engine/MapEnums.h:39; grep count 92 includes the invalid row and any alias rows).
- Per-map row (mapstats loader, src/Engine/Tables/MapTable.cpp:19 onward): file name, number of resets, first visit, perception difficulty, respawn interval in days (:71), alert days, stealing fine, disarm difficulty, trap damage dice, treasure level, encounter chances (:78), up to three encounter groups with a monster name, a difficulty gate and a min-max count (:83), a music id, and a reverb preset (:91).
- Reverb presets: a named list of 26 environments (indices 0 to 25) in a static map at the top of MapTable.cpp's Initialize, from generic and room types to cave, forest, city, mountain, quarry, plains, underwater and three altered-state presets. Default index on an unknown name is 26 (MapTable.cpp:91), which is outside the named list.
- Chests: eight chest types. All share one 9 by 9 size; the pivot offsets are hard-coded per type (src/Engine/Tables/ChestTable.cpp:5-9). Texture is the chest id plus one (:19). Traps are a chest flag (src/Engine/Objects/Chest.h).
- Dungeon archetypes, hazards and biome list: not in the box (map files and mapstats text absent). Not claimed.

Top 5 striking:
1. Encounter card per zone. Why: three groups, each with a chance, a monster, a min-max count and a difficulty gate (MapTable.cpp:78-91). Keep: one row per zone as data. Change: our own numbers, plus an alert counter that raises the chance after a fight (alert days exist as a field, MapTable.cpp:72). Ref: src/Engine/Tables/MapTable.cpp:78.
2. Respawn in days. Why: each map has a respawn interval in days (MapTable.cpp:71). Keep: respawn on a longer clock than a fight. Change: our own clock in minutes, tied to zone reset. Ref: src/Engine/Tables/MapTable.cpp:71.
3. Reverb per map. Why: each map picks one of about 26 named environments (MapTable.cpp:91). Keep: a reverb name per zone. Change: our own five presets. Ref: src/Engine/Tables/MapTable.cpp:91.
4. Trap and treasure per map. Why: a trap damage dice count and a treasure level per map (MapTable.cpp:19-91 layout). Keep: hazard strength as data per zone. Change: our own hazard types. Ref: src/Engine/Tables/MapTable.cpp:19.
5. Chest sizes fixed per type. Why: one size and pivot per chest type, so props stay aligned (ChestTable.cpp:5-9). Keep: pivot per prop type. Change: our own footprints. Ref: src/Engine/Tables/ChestTable.cpp:5.

## 6. Looks worth recreating
1. Three-band fog. Technique: density ramps weak to strong across one band, then to a clip distance where alpha goes to zero (resources/shaders/fog.glsl:21 onward; the struct gives weak and strong density, two distances and a clip distance). Keep: three bands. Change: our own fog colour and bands tuned for a 375 px fight camera. Ref: resources/shaders/fog.glsl:21.
2. Billboards fade to fog colour. Technique: mix toward the fog colour with the fog alpha (resources/shaders/glbillbshader.frag:32). Keep: billboards blend to the fog colour. Change: our own fog colour. Ref: resources/shaders/glbillbshader.frag:32.
3. Decal alpha cut. Technique: fog is skipped where the decal alpha is below 0.004 (resources/shaders/gldecalshader.frag:21). Keep: an alpha floor so transparent texels do not bleed. Change: our own threshold. Ref: resources/shaders/gldecalshader.frag:21.
4. Point light falloff. Technique: attenuation 1 minus squared distance over squared radius, clamped; no ambient term when facing away (resources/shaders/lighting.glsl:51 and :56). Keep: quadratic falloff with a radius. Change: our own radius per hero light. Ref: resources/shaders/lighting.glsl:51.
5. Per-monster tint and sprites. Technique: a tint colour per monster descriptor and one sprite name per animation state (src/Engine/Objects/Monsters.h:101 and the MonsterDesc struct above it). Keep: tint as data. Change: our own palette. Ref: src/Engine/Objects/Monsters.h:101.
6. Blood as a decal. Technique: a decal pass with vertex colour and alpha (resources/shaders/gldecalshader.frag; blood-splat flag at src/Engine/Objects/Monsters.h:73). Keep: decal blood, not a sprite. Change: our own splat shapes (row 8). Ref: src/Engine/Objects/Monsters.h:73.

## 7. Inspiration for Frankendom (originals, clearly distinct)
1. Tiered ambush line: a creature family in three steps where the tier letter is data and each step adds one ability. Keep: A, B and C tier ladder (MonsterEnums.h:421). Change: our own names, silhouettes and one ability per step. Ties to row 7 (creature actor).
2. Courage Break: a creature that breaks off at a low-health threshold to a rally point and returns after healing. Keep: thresholds as data (MonsterEnums.h:508-509). Change: our own numbers; break-off uses the leash (row 4).
3. Opening Tide: a three-speed roll decides who strikes first in an opening exchange, and a tie goes to the player. Keep: roll of 1, 3 or 5 plus a base, and the tie rule (TurnEngine.cpp:166-172). Change: our own speed values in milliseconds; for a fast duel, not a turn queue.
4. Zone Encounter Card: each zone row holds three groups with chance, monster, count range and a difficulty gate, plus an alert counter that raises the chance after a fight. Keep: the row as data (MapTable.cpp:78-91). Change: our own numbers and the alert counter. Ties to row 23 (zone population).
5. Hate Grid: a small aggro grid between creature groups, default friendly, five steps of range. Keep: default friendly and five steps (HostilityTable.cpp:14-22; MonsterEnums.h:493-498). Change: fewer groups; the grid feeds the hate list in the engine and MAX_ATTACKERS stays at 3.

## Fold-ins (from Strategy's topic list)
- hud-ui: not read (src/GUI).
- sound-music: per-map music id and reverb in one row (MapTable.cpp:90-91). Beds per biome and border crossfades: not read.
- progression: three to five promotion steps per family, mastery levels, affinity (section 2). Death penalty and achievements: not read.
- loot: weighted tiers, enchant split and a drop ceremony idea (section 4). Drop sound and rarity colour: not in the box.
- spawns: encounter card (section 5). Walk density: not in the box (placement table not in box).
- idle and ambient: sprite names per animation state (Monsters.h:101). AI states Standing, Fleeing and Fidgeting appear in SetAIRecoveryTimes (src/Engine/TurnEngine/TurnEngine.cpp).
- death and respawn: map respawn interval in days (MapTable.cpp:71) and resets (fields in the row). Presentation not read.
- progression note: each promotion family has three to five steps (section 2), not a fixed four.
- boss intro and finisher staging: unique monster names table (Monsters.h, uniqueNames) and unique ids. Staging not read.
- readability at 375 wide: not measured. Monster silhouette, threat colour and max enemies per frame not read.
- Turn queue, for reference: the donor is turn-based. Initiative and recovery are turn-queue ideas; the real-time parallel is row 18 and the turn queue is a reference, not a port target.

## Defects seen (keep the idea, fix the defect)
1. Recovery factor used in opposite directions. TurnEngine.cpp:93 divides initiative by the recovery constant (multiplies by about 0.469). TurnEngine.cpp:160 turns recovery into initiative by multiplying by 0.46875. TurnEngine.cpp:222 turns initiative back into recovery by multiplying by about 2.133. The inverse of :160 is :222, so :93 looks like the outlier. Not verified against the original binary. Fix: test against a known turn; likely multiply at :93.
2. Hostility table size mismatch. HostilityTable.cpp:19 zips 88 rows (Segment(0, 88)), while the header says the original was 89 by 89 (HostilityTable.h:17). The highest enum type, the apex dragon added by this port, is index 88 (MonsterEnums.h:395). Whether a row is dropped is not settled without hostile.txt. Fix: size the loop from the source row count and check the last row.
3. Hostility write order. HostilityTable.cpp:21 writes relations[col][row] while the read is by row then column. Orientation is not stated in the box. Fix: state the orientation in the header and add a symmetry test.
4. Decal fades to black. gldecalshader.frag:23 mixes toward vec4(0.0), while billboards (glbillbshader.frag:32) and forced-perspective (glforcepershader.frag:21) mix toward fog.color. A visible seam wherever the fog colour is not black. May be intentional for blood. Fix: fade to fog colour unless black is wanted.
5. Unknown map EAX falls back to an index outside the named list. MapTable.cpp:91 uses 26; the named list ends at 25 (MapTable.cpp:27-50). Fix: name the default.
6. Map lookup assert. GetMapInfo in MapTable.cpp asserts on a miss and returns the invalid id; the code comment says the caller and the assert disagree. Fix: decide one contract.

## Not verified and not read
- Every numeric value from the original text tables (monsters, items, maps, placements, hostility, enchants) is absent. Counts for gear sets are null; creature and zone counts are from enums only.
- Summon, explode and multi-shot behaviour code, potion mixing body, arena fight flow beyond the pool build, bounty hunt table body.
- HUD (src/GUI), graphics pipeline bodies, shaders other than fog, lighting, decal and billboard.
- test/Data (about 439 files), Lua scripts, the .claude folder (treated as data).
