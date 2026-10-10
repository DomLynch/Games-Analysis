# Card-Forge-forge (adventure mode: creatures, heroes, items, zones; cell DC010)

Donor: /mnt/frankendom-donors/Card-Forge-forge/ (VPS, read-only, reached over ssh).
Licence (from the files): code is GPL v3 (LICENSE at repo root; forge-gui/LICENSE.txt). Assets are mixed per the repo's own credit files: Kevin MacLeod music CC BY 3.0, Particle Park effects CC BY 4.0, dock-bar icons CC BY 3.0 per docs; sprites and tiles carry per-artist licences not in the repo; card art is not in the repo; sounds, fonts and skins have no licence line. Asset audit read first: AU008/Card-Forge-forge.assets.md.
Rule for use: recreate as clearly distinct originals, never a copy. Mechanisms are taken as shape only (GPL code, clean-room). Art stays at category level (a "five-palette hero family", not the donor's sprites). Card names and card rules text are not reused. This is design inspiration, not a legal opinion.

## Halves read

- DATA half (read): forge-gui/res/adventure/common/world/ (enemies.json, items.json, heroes.json, points_of_interest.json). Counts below were computed by parsing these JSON files on the VPS.
- CLIENT half (read): forge-gui-mobile/src/forge/adventure/ (stage/WorldStage, MapStage, GameHUD, GameStage; character/EnemySprite, RewardSprite; data/BiomeData, EnemyData, EffectData; scene/DuelScene; world/World; util/RewardActor, ShaderDrawable; forge/util/Shaders.java, ShaderUtil).
- Listing only (names and counts): common/particle_effects/ (86 entries; the audit counts 51 .p emitters), sprites/enemy/ (14 families), common/maps/map/ folder names.
- SERVER/RULES half (not read): the duel engine (forge-game, forge-ai) and forge-gui/src. I did not open these; the donor's engine is what runs the card duels.
- Paired donor in the box: none identified for the adventure data. Not checked beyond this donor.
- Not read: quests.json, shops.json, cardprices.txt, the .tmx maps beyond their names, the sprite pixels, the sound and music files, and the rule-effect description code.

## Counts (from the data, not from the readme)

| counts | value | basis |
|---|---|---|
| creatures | 464 | enemy entries in enemies.json |
| classes | 16 | hero race/avatar sets in heroes.json (no class stat table) |
| weapons | 23 | items whose name or icon matches a weapon word (approximate, by name) |
| gear_sets | 5 | three-piece material sets (body, boots, shield): iron, steel, mithril, gold, dark |
| zones | 8 | zone archetypes in points_of_interest.json (cave, dungeon, town, capital, castle, side-boss easy/moderate/hard) over 263 typed points |

## 1. Creatures and beasts

Families (enemy entries per sprite family, from the sprite path in enemies.json): humanoid 163, beast 72, aberration 45, undead 41, monstrosity 28, fiend 27, elemental 20, construct 18, giant 12, plant 10, celestial 9, fey 9, dragon 8, ooze 2. Total 464.

Sprite folders under sprites/enemy/ (top-level atlas counts): undead 37, monstrosity 30, fiend 29, elemental 25, aberration 24, construct 19, giant 15, fey 10, plant 10, celestial 9, dragon 8, ooze 3, humanoid 5. The beast and humanoid folders have nested subfolders, so their top-level counts understate them.

Tiers and escalation (what the data says):
- Escalation is by player rank, not by zone. Each enemy has a difficulty value; a creature is eligible only when difficulty is at or below the player's rank (BiomeData.java:106-109). Difficulty 0.1 covers 354 entries; 11 entries have no difficulty value.
- Spawn weight: spawnRate is a roulette weight among eligible creatures (326 entries at 1, 56 at 0.5, others lower).
- Stats: life runs 8 to 100; speed 1 to 80. Several boss entries use speed 1, which reads as near-stationary; the movement code that gives speed meaning was not read, so treat this as likely, not checked.
- Scale is a per-entry multiplier from about 0.5 to 3.5 on the sprite size (EnemySprite.java:108-112).
- Boss pattern: 40 entries carry boss true; 26 set gamesPerMatch 3 (a best-of-three duel); 11 have a boss intro line and 11 a boss insult line; 7 award one named relic item as equipment.
- Rewards per creature: a list of weighted reward rows (deck cards 834 rows, card 536, gold 452, shards 123, random card 32, item 28, life 20), each with a probability, a count range and an optional rarity gate.
- Signature behaviour: a creature is a deck plus an AI flag; 2 entries are 'reckless' and the rest use the default AI. Flying is a flag on 79 entries.

Top 8 striking creatures (own labels; no donor names used):

1. Three-Match Sky Warden (boss, scale 3, flying). Why: one of the largest silhouettes among the bosses (only one boss is larger); three games per encounter plus an intro line make it an event. Keep: multi-game boss, intro line, flying. Change: one fight per visit with our own rhythm; relic is our own item. Ref: enemies.json:697 (entry), :766 (gamesPerMatch 3), :753 (equipment list).
2. Rimescale Wyrm (dragon family, scale 1.6, life 18, speed 20, flying). Why: a big dragon that is fragile; the silhouette promises power and the life total breaks the promise. Keep: large scale with low life. Change: our own wing and head shape and our own weak point. Ref: enemies.json:965.
3. Void Tide Colossus (aberration boss, scale 1.5, life 100, flying, relic reward). Why: highest life in the data; a lone big target a fast duel can wear down. Keep: highest life as a boss tier. Change: our own colour and shape; relic reward becomes an original. Ref: enemies.json:10249.
4. Hive Anchor (aberration boss, speed 1, life 50, three games, relic). Why: a boss that barely moves, so it reads as a landmark you approach rather than one that chases you. Keep: a near-fixed boss in a zone. Change: our own minion spawns while it stands. Ref: enemies.json:26500.
5. Stoneback Hulk (monstrosity, scale 3.5, speed 1, life 40, intro line, three games). Why: the largest scale among the boss entries, with a near-fixed body: a large target to read at 375 wide. Keep: large scale on a slow body. Change: our own plating and a visible glow on its weak point. Ref: enemies.json:19790.
6. Brass Sentinel (construct boss, scale 2.5, life 25, speed 20, three games). Why: big but low life; the size and the fragility contrast reads at a glance. Keep: big body with low life. Change: a visible weak point, our own material. Ref: enemies.json:21659.
7. Splintered Stalker (aberration variant, life 28, no speed value). Why: a weakened variant of a family, which shows how one sprite family can give several enemies. Keep: variant rows that reuse one family. Change: our own name, stats and damage cue. Ref: enemies.json:31177.
8. Pit Marauder (fiend, difficulty 2, spawnRate 1, reward rows gated by rarity). Why: a mid-tier enemy whose loot shape (probability, count, rarity gate) is the point, not its looks. Keep: per-creature reward rows with rarity gates. Change: our own loot table and rarity names. Ref: enemies.json:3 (entry), :10 (difficulty), :9 (spawnRate).

## 2. Classes, races and factions

- Hero avatars: 16 race/avatar sets (heroes.json). Each has a male and a female sprite atlas. Five are dragon-kin sets. Mechanical role: none in the data; the hero is a cosmetic avatar.
- Class-like identity is the deck colours the player brings. Enemies carry colour identity tags (questTags: black 160, green 136, red 128, blue 98, white 87; multi-colour tags on a few more).
- Faction-like tags on enemies include Territorial (93), Wild (63), Undead (33) and Leader (34). Quest code uses these tags; the quest code was not read.
- Progression: rank (wins) is the only progression gate seen in the read code (BiomeData.java:106-109). No talent tree or level-up table was seen in heroes.json.
- Item effects change the start of a duel: extra starting life, moveSpeed on the map, a card on the battlefield or in the command area, a larger starting hand, a shop discount, bonus card rewards (capped at 3 in the comment), and an enemy colour view (EffectData.java:20-29; items.json effect entries).

## 3. Weapons

Families (name match in items.json; left-hand slot 35 items, right-hand 37 including shields): swords (bronze, steel, flame), an axe, a bow, a sling, a dagger, and staffs including one per colour (white, black, blue, red, green staffs). Weapons carry no damage numbers in this data; their effect is a card or life bonus.

Special properties: the effect vocabulary across 130 item effects is startBattleWithCard (75), lifeModifier (43), startBattleWithCardInCommandZone (26), moveSpeed (10), changeStartCards (7), cardRewardBonus (3), goldModifier (1), colorView (1). No set-bonus key was seen.

Tier visibility: the donor shows tier by material icon (wood bow, bronze sword, steel sword and axe), not by a colour or glow. Prices do not follow the material order cleanly (see section 4).

Top 5 striking:
1. Colour staffs (white, black, blue, red, green): one staff silhouette, five colours, each tied to a colour identity. Keep: one shape in five colours. Change: our own shapes and elemental palette. Ref: items.json:1670 (White Staff), :1685 (Black Staff).
2. Heart-Piercer (named bladed item; slot not checked). Why: a named unique with its own icon; a unique look for a single rare drop. Keep: one unique per tier. Change: our own name and shape. Ref: items.json:1079.
3. Unerring Sling (ranged by name; slot not checked). Why: a ranged silhouette adds a read against the melee set. Keep: a ranged silhouette. Change: our own projectile trail (see looks). Ref: items.json:1389.
4. Flame Sword (fire-themed by name). Why: a fire tier that should read as hot at 375 wide (not measured). Keep: one fire tier. Change: our own palette and a heat shimmer. Ref: items.json:917.
5. Dagger (light melee by name). Why: the quick end of the melee range. Keep: a light, quick weapon as a contrast. Change: our own speed and cue. Ref: items.json:806.

## 4. Armour and gear

Gear sets (three pieces each: body, boots, shield): iron (Iron Armor 3000, Iron Boots 2000, Iron Shield 6500), steel (Steel Armor 5000, Steel Boots 4500, Steel Shield 6500), mithril (Mithril Armor 15000, Mithril Boots 10000, Mithril Shield 6500), gold (Gold Armor 15000, Gold Boots 10000, Gold Shield 13000), dark (set exists; costs not compared). Also single pieces: leather boots, jungle shield, mirror shield, kite shield, angelic greaves, robes, Slime-Covered Boots (boots, 6000).

Slot counts: body 10, boots 13, neck 25 (amulets, charms), ability1 5, ability2 6, left 35, right 37. 69 items have no slot (consumables, runes, teleports).

Tier ladder by material name and icon: wood, bronze, iron, steel, mithril, gold (silver only on a challenge coin). Price is not a clean tier signal: the mithril and iron shields are both 6500, while the gold shield is 13000. Keep the material order; fix the prices so they rise with the tier.

Materials and looks: item icons are named by material (iconName). Atlas files items.atlas and gold.atlas exist in sprites/, but the icon-to-atlas mapping was not checked. Of the five files that use shaders (grep), none is a gear shader; the metallic read presumably comes from the sprite art, which was not opened.

Top 5 striking:
1. Gold set (Gold Armor, Gold Boots, Gold Shield). Why: the top tier reads as gold at a glance. Keep: gold as the top material name. Change: our own gold and a rim sheen that the shader can drive. Ref: items.json:1189 (Gold Armor), :1180 (Gold Shield), :1170 (Gold Boots).
2. Mithril set (Mithril Armor, Mithril Boots, Mithril Shield). Why: a second top tier with its own cool read. Keep: a material name as a tier. Change: our own metal and colour. Ref: items.json:885 (Mithril Armor), :863 (Mithril Boots), :873 (Mithril Shield).
3. Steel armour (Steel Armor). Why: a mid tier that reads as heavy; the steel set is the most-used mid tier. Keep: a heavy mid tier. Change: our own heavy look. Ref: items.json:755.
4. Golden Egg (a left-hand gold item, 2000). Why: a gold look on a non-armour item; a readable 'rare' cue on a small icon. Keep: gold cue on a small icon. Change: our own rare cue. Ref: items.json:1044.
5. Slime-Covered Boots (boots, 6000). Why: a texture-led look (slime) in the boots slot; a surface cue rather than a metal. Keep: surface cue on a boot. Change: our own surface and shape. Ref: items.json:1770.

## 5. Zones and dungeons

Overworld biomes by colour (GameHUD.java, updateBGM, the non-map branch): white, blue, black, red, green and colourless ('waste'). Each has its own music playlist. Town and capital, castle and cave tiles have their own playlists in the map branch of the same method.

Backdrop biome names (skin folder, from AU008): cave, castle, dungeon, forest, island, mountain, plains, swamp, waste, match. Not opened.

Archetypes and counts (points_of_interest.json types): cave 105, dungeon 103, town 25, side-boss moderate 9, side-boss easy 6, castle 6, capital 6, side-boss hard 3. 263 typed points (one untyped).

Dungeon map set (names only): aerie, barbariancamp, catlair, demontower, djinnpalace, factory, fort, graveyard_crypt, hostiletown, lavaforge, magetower, main_story. Cave map set (names only): cave, cave_multilevel, cave_multilevel_2, cave_multilevel_3, evilgrove, grove, merfolkpool, nest, skullcave. Side-boss arenas: grove, monastery, vampirecastle (hard); camelboss, minibosses (easy); fort, garruk, grolnok, jacetower, nahiri, skep, tibalt, zedruu (moderate).

Hazards and rules:
- Dungeon rule effect: entering a duel from a map applies an effect to the duel unless the enemy sets ignoreDungeonEffect (MapStage.java:1210-1211; EnemySprite.java:87). The effect's source was not read.
- Road tiles: a tile with no biome index is treated as road. Road tiles spawn nothing and give a 1.5x move speed (WorldStage.java:291-292).
- Encounter density off-road: one spawn attempt every 4 to 8 seconds of walking (WorldStage.java:45, 301). That is 2.5 to 5 attempts per 20 s of walking, mean about 3.75. When a quest extra exists, 50 percent of attempts spawn a regular and a quest creature, 30 percent only the quest creature, and 20 percent only the regular one (WorldStage.java:311).

Top 5 striking zones:
1. Dungeon with a rule effect: every duel inside gets the zone's rule change. Keep: zone as rule data. Change: effects are zone data fields with visible readouts. Ref: MapStage.java:1210-1211.
2. Road lane: safe, fast travel with no encounters. Keep: a safe lane. Change: a visible road ribbon with its own ambience. Ref: WorldStage.java:291-292.
3. Multi-level caves (cave_multilevel, _2, _3). Keep: multi-floor caves as one place. Change: our own floor transitions. Ref: maps/map/cave folder names (not opened).
4. Side-boss shrines (grove, monastery, vampirecastle): hard side bosses in dedicated arenas. Keep: arena per boss tier. Change: our own arena layout. Ref: points_of_interest.json:2362 (type sidebosshard).
5. Colour biome overworld: five colour biomes plus waste, each with a playlist. Keep: biome-coded music. Change: crossfades at borders. Ref: GameHUD.java:605-622.

Biome placement (client code, not the data): each biome is a blob around an anchor point; a tile is in the biome when noise times noiseWeight plus distance times distWeight is under 1 (World.java:395). Biomes may overlap (a bit mask per tile), and a second noise field sets terrain bands (World.java:372-412).

## 6. Item and effect looks worth recreating

1. Foil sheen on rare reward cards. Technique: a fragment shader with a tilt uniform drives streak lines and a hue spread across the card; a fixed strength (0.85) mixes the sheen in, and low-luminance pixels are desaturated first. Applied only when the card is foil and loaded. Ref: forge-gui-mobile/src/forge/util/Shaders.java:197-297 (fragCardShaderHolo; uniform at :217, strength at :220); forge-gui-mobile/src/forge/adventure/util/RewardActor.java:1285-1314.
2. Rounded card mask. Technique: an edge test with an edge radius computed from the image aspect ratio when the UI mask is Full. Ref: Shaders.java:187-190; RewardActor.java:1285-1300.
3. Particle emitter library: bursts, trails and glows as separate .p files (fireball, explosion, smoke trail, starlight, pentagram, rain, snow, glass, blood). Technique: emitter files layered over sprites so one sprite can take a burst without new frames. Ref: forge-gui/res/adventure/common/particle_effects/ (listing only; CC BY 4.0 for the Particle Park set).
4. Encounter contact beat. Sequence: a block sound and a haptic pulse (200 ms, or 400 ms for a boss), a freeze, a pause for the longer attack animation, a mana-burn sound, then a transition screen made from a screenshot with both avatar names. Ref: MapStage.java:1182-1211 (beginDuel); haptic at :1191.
5. Death beat. Sequence: death animation with a blood effect for 0.5 s, then the defeat badge dialog, then a cover-screen transition to the spawn point with an autosave. Ref: GameStage.java resetPlayerLocation; boss-defeat variant at :733-743.
6. Boss intro and insult dialog. Intro and insult are read from the locale file. The insult shows on a boss loss (and in one other case, copyPlayerDeck, that the code also checks). Ref: DuelScene.java:561-582 (intro), :195-227 (insult); forge-gui/res/languages/en-US.properties (AdvBossIntro and AdvBossInsult keys: about 35 intro and 44 insult lines by grep count).
7. Scale variation. Sprite size multiplied per entry (0.5 to 3.5). Ref: EnemySprite.java:108-112.
8. Minimap player marker. Ref: GameHUD.java:139.

Idle and ambient vocabulary: the character animation types seen in CharacterSprite include Idle, Attack, Hit and Death (CharacterSprite.java:70, :175, :326). Creatures idle with their sprite's idle frames; no ambient creature behaviour beyond the steering code was read.

## 7. Frankendom parity notes (rulings and rows)

- Row 23 (zone population): WorldStage.java:278-345 spawns on a timer while walking, picks by weight after a rank gate, and despawns on a walking-time lifetime (WorldStage.java:85, 89; EnemySprite.java:638). No population cap or per-zone budget was seen in the path read. Our row 23 needs the cap and the grace timer.
- Row 4 (fight loop, aggro, leash): EnemySprite.java:350-392 has a threat range that starts pursuit, a flee range, an aggro flag, and a leash that drops aggro past pursueRange.
- Row 18 (loot and reward): RewardSprite.java (getRewards) builds rewards from the weighted rows in the data (enemies.json rewards: probability, count, rarity gate).
- Row 17 (death and respawn): GameStage.java (resetPlayerLocation, defeatedFromBoss); MapStage.java:1008 (a defeated enemy is deleted from the save when respawn is off or the enemy is a boss).
- Row 16 (colour grade): the foil shader in section 6.

## 8. Inspiration for Frankendom (originals, not copies)

1. Walk Watch (encounter director). Idea: a creature may appear about every 4 to 8 s of off-road walking, drawn by weight after a rank gate; it leaves after 20 s or more of walking time. Keep: walking-time clock; weighted draw behind a gate; walking-time despawn. Change: zone population cap and a grace timer on empty zones (row 23); fix the ignored parameter (defect A below).
2. Warden Duel (multi-game boss). Idea: a boss fight is a best-of-three with an intro line, a boss music swap and a relic on the last game. Keep: three games, intro line, boss music. Change: each game is server-verified; our own relic; no deck-building dependency.
3. Shrine Rules (zone rule modifier). Idea: a dungeon applies one rule change to every duel inside it (extra starting life, faster movement, one card in the command area). Keep: zone as data. Change: a visible rule readout and caps on stacking.
4. Glint Card (foil reward). Idea: rare drops show a sheen whose streaks and hue follow a tilt value. Keep: tilt-driven streaks and hue spread; sheen only on rare drops. Change: our own ember glint; reveal under 0.4 s on phones.
5. Six-Metal Ladder (gear tiers). Idea: wood, bronze, iron, steel, mithril and gold as tiers; three-piece sets; the tier is read from the icon. Keep: material names as the tier language and three-piece sets. Change: prices that rise with tier; our own metals and colours.
6. Road Breath (safe lane). Idea: road tiles have no encounters and a 50 percent speed bonus. Keep: a safe lane. Change: a visible ribbon with its own ambience bed and a zone-data speed value.
7. Blob Biomes (biome placement). Idea: noise-warped blobs around anchors decide biome, with a second noise field for terrain bands. Keep: noise plus distance. Change: one biome per tile with a crossfade band at borders, instead of overlapping bits.
8. Hold Still (post-defeat). Idea: after a loss the enemy freezes until the player is far enough away, so the player is not re-engaged at once. Keep: the hold-still rule. Change: a visible grace indicator and a time limit.
9. Contact Beat (encounter start). Idea: block sound, haptic, a short pause, then a transition with both names. Keep: the beat order. Change: our own sounds and haptic pattern; a readout of the threat level at 375 wide.

## Defects seen (keep the idea, fix the defect)

- A. BiomeData.getEnemy overwrites its parameter difficultyFactor with the player's rank (BiomeData.java:106). The caller passes 1.0, so the argument is ignored. Fix: use the argument as zone difficulty and the rank as the cap.
- B. The fallback when no creature is eligible draws uniformly from the whole list (BiomeData.java:116), ignoring weights and including zero-weight copies of every world creature (BiomeData.java:52-64). Fix: fall back to the lowest-difficulty entries of this zone only.
- C. WorldStage.dieTimer (line 48) is declared with a todo and has no other use in the two files read. Fix: remove it or make it a zone data field (row 23).
- D. A spawn that finds no free ring spot after 100 tries returns false and the timer is already reset (WorldStage.java:301, :327-348). Fix: retry on the next tick, not after a full interval.
- E. defeatedFromBoss returns with no defeat dialog when the player has no equipped item (GameStage.java:733). A loss then has no beat. Fix: always show the defeat beat.

## Fold-ins

- hud-ui: a minimap player marker (GameHUD.java:139). Touch UX, input buffer and lock-on: not read in full; the lock-on grep found no relevant code.
- sound-music: playlists per biome, town, cave, castle, boss and match (GameHUD.java:584-622; DuelScene.java:564). Border crossfades and ambience beds: not found in the code read.
- progression: rank (wins) gates creature eligibility (BiomeData.java:106-109). No talent tree or achievement table seen.
- loot: reward rows with probability, count and rarity gates (enemies.json rewards; RewardSprite.java). Card-flip sound on reveal (RewardActor.java:1027).
- spawns and encounters: walk density, 2.5 to 5 attempts per 20 s off-road (section 5).
- death and respawn: death beat and spawn-point respawn (section 6, item 5).
- boss intro and finisher staging: intro dialogue, boss music, insult on loss (section 6, item 6).
- readability at 375 wide: not measured in code; scale range 0.5 to 3.5 and boss flags are the only size data.

## Licence and use

Code is GPL v3, so the mechanisms are reused as shape only, clean-room. Art follows the per-group licences above, so recreate from scratch. Card names, card rules text and character names are not used in any original.
