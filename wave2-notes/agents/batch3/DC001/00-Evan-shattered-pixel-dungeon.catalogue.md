# 00-Evan-shattered-pixel-dungeon (design catalogue, DC001)

Donor tree: /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/ (read over ssh only, nothing copied or run).
Asset audit used first: AU001 (`/private/tmp/p2/wave2-haiku/batch3/AU001/00-Evan-shattered-pixel-dungeon.assets.md`). Not repeated here.
Licence note: code is GPL v3 (LICENSE.txt). Art, music and sounds are credited by name in AboutScene.java; the repo has no asset licence file (per AU001). Use for inspiration only: we recreate originals.
Receipts: `receipts.tsv` in this folder (26 quotes, all verified).

## Counts (from file listings and class fields)
- creatures: 71 .java files directly in `core/.../actors/mobs/`. This includes base and helper classes (Mob.java, MobSpawner.java), so it is an upper bound on creature types. NPCs (16 files in `actors/mobs/npcs/`) not counted.
- classes: 6 hero classes, each with 2 subclasses (12 subclasses).
- weapons: 32 melee weapon types (`items/weapon/melee/`, base class excluded), plus 17 missile files.
- gear_sets: 11 armour types (5 tier armours, 6 class armours), 13 glyph files, 8 curse files.
- zones: 5 main depth zones plus a final level and side branches.

## 1. Creatures and beasts
Families (grouped by file name; class-level stats read where cited):
- Vermin and small beasts: rat, albino, fetid rat, bat, swarm, crabs (crab, great crab, hermit crab), piranhas, snake, scorpion, bee.
- Slimes: slime, caustic slime, acidic slime, plus the Goo boss.
- Gnoll raiders: gnoll, trickster, guard, sapper, geomancer, exile.
- Undead: skeleton, ghoul, wraith, necromancer, spectral necromancer, tormented spirit, rot heart, rot lasher.
- Demons and imps: imp, succubus, warlock, ripper demon, demon spawner, DM-100, DM-200, DM-201, DM-300.
- Crystal caves: crystal guardian, crystal mimic, crystal spire, crystal wisp.
- Fungal: fungal core, sentry, spinner.
- Mimics: mimic, golden mimic, ebony mimic, crystal mimic.
- Elementals and constructs: elemental, golem, statue, armoured statue, armoured brute.
- Humans and casters: bandit, thief, monk, shaman, guard, dwarf king, eye, tengu.
- Final-boss family: a multi-phase demon lord with helper hands (not read beyond class names).

How they escalate (from stat lines):
- Early creatures are weak: rat 8 HP and defence 2 (Rat.java:36-37). Bat 30 HP, defence 15 (Bat.java:38-39).
- Mid creatures 45-120 HP: ghoul 45 (Ghoul.java:48), golem 120 (Golem.java:45), scorpion 110 (Scorpio.java:44), monk 70 with defence 30 (Monk.java:42-43).
- Mimics scale with level: HP = (1 + level) * 6 (Mimic.java:265).
- Elemental defence scales with region: 5 * regionScale (Elemental.java:106).
- Bosses: 100-1000 HP. A "stronger bosses" challenge raises boss HP, for example Goo 100 to 120 (Goo.java:54).
- Boss patterns: HP floors that drop by phase (YogDzewa.java:400), a half-life reset (DwarfKing.java:496), HP brackets that teleport (Tengu.java:148), and a summoner that heals its minion (Necromancer.java:180).

Top 8 striking (labels are my own):
1. "Gel Warden": the Goo slime boss. Striking because it is a big, sprayed, particle-burst slime. Keep: a telegraphed burst attack. Change: silhouette (crowned dome), palette, no spit.
2. "Clockwork Brute": the DM-300 construct. Striking because it charges with sparks and resets its HP to a set threshold at a phase change (DM300.java:84-86, 504). Keep: heavy construct with a charge-up spark telegraph. Change: head and limb design, rivets, colour.
3. "Fallen Sovereign": the final-boss demon lord. Striking because its HP floor drops 300 per phase (YogDzewa.java:72, 400). Keep: phased final boss with floors. Change: concept art (chained, not hanging), helper form.
4. "Second-Wind Warlord": the dwarf king. Striking because it returns to a low HP value at a threshold (DwarfKing.java:85, 496). Keep: one second life at half HP. Change: armour break scene, mantle, throne.
5. "Mask Trickster": the tengu. Striking because its HP is split into brackets and it relocates on a threshold (Tengu.java:90, 148). Keep: bracketed HP that triggers an ambush move. Change: mask and silhouette.
6. "Bone Shepherd": the necromancer. Striking because it heals its own summoned minion by a fifth of max HP (Necromancer.java:180). Keep: summoner heals minion. Change: minion type, staff, cloak.
7. "Crystal Keeper": the crystal guardian. Striking because it regenerates 5 HP per tick (CrystalGuardian.java:78). Keep: steady regen construct. Change: floating shard ring instead of a body.
8. "Coin Lurker": the mimic family. Striking because HP scales with depth (Mimic.java:265). Keep: depth-scaled HP formula. Change: lantern or coffer disguise, reveal animation.

## 2. Classes, races and factions
- Warrior: Berserker, Gladiator. Ability folder `actors/hero/abilities/warrior/`. Signature mechanic: not read.
- Mage: Battlemage, Warlock. Folder `abilities/mage/`. Mechanic: not read.
- Rogue: Assassin, Freerunner. Folder `abilities/rogue/`. Mechanic: not read.
- Huntress: Sniper, Warden. Folder `abilities/huntress/`. Mechanic: not read.
- Duelist: Champion, Monk. Folder `abilities/duelist/`. Mechanic: not read.
- Cleric: Priest, Paladin. Folder `abilities/cleric/`. Mechanic: not read.
- Races: none found in the hero code (not read beyond the enum).
- Factions: none as a formal system. There are shopkeepers, a blacksmith, a wandmaker, ghosts and a rat king (`actors/mobs/npcs/`), and quest vaults (`actors/mobs/quest/`).
- Progression shape: each hero picks a subclass (HeroClass.java lists the pair). Unlock level not read.

## 3. Weapons
- Families: blades (sword, longsword, rapier, katana, scimitar, shortsword, dagger, dirk, sai, sickle); blunt (mace, war hammer, cudgel, flail, quarterstaff); heavy (greataxe, greatsword, battle axe, war scythe); shields (round, greatshield); gauntlets and gloves; mage staff; ranged (crossbow, spirit bow, 17 missiles).
- Tiers: a `tier` field from 1 to 5. Dagger tier 1 (Dagger.java:50), Sword tier 3 (Sword.java:47), Greatsword tier 5 (Greatsword.java:37), War Hammer tier 5 (WarHammer.java:36).
- Special properties: 17 runic enchantment files in `items/weapon/enchantments/` (for example blazing, chilling, shocking, vampiric, vorpal), plus a curses folder (not counted).
- Visual distinction: the tier is not obviously shown on the weapon sprite (not read). The visible difference is the enchant glow (Weapon.java glowing(), line 507-512).

Top 5 striking:
1. Crystal enchant: blue glow with three stepped states (LIGHT_BLUE, FLAW, CRACK) at different pulse periods (Crystal.java:46-48). Strong idea for an item that "cracks" as it wears.
2. Shocking enchant: white glow at half the pulse period (Shocking.java:41).
3. Vorpal enchant: a muted red glow (Vorpal.java:34, 70).
4. Blazing enchant: an orange glow (Blazing.java:36).
5. Fifth: not read (other enchant files, for example Unstable and Grim, match the glow grep but their colours are not read).

## 4. Armour and gear
- Tiers (super() argument in each class): Cloth 1 (ClothArmor.java:35), Leather 2, Mail 3, Scale 4, Plate 5 (PlateArmor.java:33). Class armours (six files) use tier 5 (ClassArmor.java:68).
- Materials: no metal or gold shader in the code. Metallic and gold looks come from art (see AU001). Tiers are not separate sets; each armour has its own sprite.
- How tiers show: the hero avatar uses one tier film strip, with one frame per armour tier (HeroSprite.java:73).
- Glyphs (13 files) add glow colours: holy (a bright yellow glow constant, Armor.java:780; when it is used not read), swiftness (yellow), viscosity (purple, Viscosity.java), anti-magic (teal), camouflage (green), affection (pink), flow (blue), stone (dark grey).
- Curses (8 files) use a black glow to signal a bad item (for example Bulk, Corrosion).

Top 5 striking:
1. Plate armour at tier 5 (look not read).
2. Viscosity glyph: purple pulse, a "heavy" feel.
3. Anti-magic glyph: teal pulse, a "cold shield" feel.
4. Affection glyph: pink pulse, a "warm" feel.
5. Holy glow: a bright yellow pulse constant (Armor.java:780); the trigger was not read.

## 5. Zones and dungeons
- Depth zones (Dungeon.java switch): sewers 1-4 (boss at 5), prison 6-9 (boss at 10), caves 11-14 (boss at 15), city 16-19 (boss at 20), halls 21-24 (boss at 25), last level at 26. The boss depths are at Dungeon.java:442.
- Side branches: mining level (caves range), vault level (city range), dead end, last shop.
- Archetypes: regular rooms-and-corridors level (RegularLevel.java), boss arena per zone (*BossLevel.java), vault, mining.
- Hazards: `levels/traps/` and `levels/features/` folders (not read). Painters in `levels/painters/` (not read).
- Biome palette per zone: separate tile sheets per zone (AU001).

Top 5 striking:
1. Sewer boss arena (SewerBossLevel.java, not read).
2. Caves boss arena (CavesBossLevel.java, not read).
3. City boss arena (CityBossLevel.java, not read).
4. Halls boss arena (HallsBossLevel.java, not read).
5. Mining level (MiningLevel.java, not read): a side branch with its own rules.

## 6. Item and effect looks worth recreating
- Item glow pulse: the item sprite darkens the tint to about 0.4, then adds the glow colour by phase, with a period per item (ItemSprite.java:365-385). Technique: multiply tint plus additive colour in one shader step.
- Enchant reveal: a one-shot overlay with fade-in 0.2 s, hold 1.0 s, fade-out 0.4 s, alpha 0.6 (effects/Enchanting.java:35-39).
- Boss tint wave: the sprite tint wobbles with a cosine once per second (effects/GlowBlock.java:42).
- Boss particle bursts: GooSprite and DM300Sprite use emitters (AU001). Not re-read.
- Sparkle on phantom piranha: `sprites/PhantomPiranhaSprite.java` matches a shimmer/sparkle grep (not read).

## Inspiration for Frankendom (originals, own names)
1. Tide Warden: a phased slime boss whose spray burst is telegraphed by a particle burst. Keep: telegraph and phased HP. Change: crowned dome silhouette, palette, no spit.
2. Lantern Lurker: a container monster whose HP scales as (1 + level) times a base. Keep: depth-scaled HP formula. Change: lantern disguise and reveal pop.
3. Bone Shepherd: a summoner that heals its minion by a fraction of max HP per cast. Keep: heal-a-fraction rule. Change: minion type, staff, cloak.
4. Crystal Keeper: a regen construct that heals 5 per tick and stops when it is hit hard. Keep: steady regen. Change: floating shard ring.
5. Second-Wind Warlord: a boss that reverts to a low HP value once at half. Keep: one threshold reset. Change: armour break, mantle, throne.
6. Masked Trickster: a bracketed-HP ambusher that relocates on each bracket. Keep: bracket trigger. Change: mask and silhouette.
7. Stepped-crack blade: an item glow that changes state as the item wears (three glow states). Keep: stepped states with a shorter period. Change: colour and crystal form.
8. Pulse-glow armour: a glyph-style glow per effect (purple, teal, pink). Keep: one glow colour per effect. Change: our palette.
9. Tier strip avatar: one hero sprite sheet with a frame per armour tier. Keep: one sheet, frame by tier. Change: our own armour frames.

## Not read
- No image opened (AU001 rule). Art judgements come from names, sizes and code only.
- Subclass ability logic (`actors/hero/abilities/*`), traps, painters, most mob AI bodies beyond the stat lines cited.
- messages/*.properties (names and story text, protected). Not copied.
- Chain-of-phases logic for the final boss beyond the HP floor lines.
- Fifth top weapon, subclass unlock levels, mining and vault rules.
