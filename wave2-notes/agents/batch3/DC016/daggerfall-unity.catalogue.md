# daggerfall-unity (design catalogue, DC016)

Donor: /mnt/frankendom-donors/daggerfall-unity (read-only, VPS). Fan reimplementation client. Art, quest text and the DOS data pack are NOT in the box.
Licence (as the files state): code MIT (root LICENSE line 1 and line 3, "Copyright (c) 2009-2023 Daggerfall Workshop"). Assets/Licenses/Daggerfall Unity.txt line 3 names a different holder and range (2014-2022, MIT). Game-like text, tables, fonts and textures are class C per AU013. Inspiration here stays CATEGORY-LEVEL. Dom's rule: recreate as a clearly distinct original, never a copy. Keep the idea, change the look and the numbers.

Halves: client half READ (Assets/Scripts, Assets/Shaders, data tables as text). Data-pack half NOT in the box (the repo's GameFiles readme says the user supplies it). Server half not applicable (single-player client).

Counts (from code enums and tables, not from the data pack):
- creatures: 42 usable monster IDs (0-42, ID 39 unused). The same table also holds 19 human/guard rows (IDs 128-146), which I count as NPCs, not creatures.
- classes: 18 class careers. Races: 11 (eight playable peoples plus vampire, werewolf and wereboar as state races; EntityEnums.cs line 32).
- weapons: 18 weapon items plus arrow as ammo. 17 weapon-type families (10 base, 7 with a magic variant).
- gear_sets: 0. No set-bonus system found (grep hits were character-creation bonuses).
- zones: 19 dungeon archetypes, 15 location types, 4 climate bases x 3 seasons.

## 1. Creatures and beasts

Families come from the MobileAffinity and MobileBehaviour enums (Assets/Scripts/DaggerfallUnityEnums.cs lines 233-262) and from the per-ID rows in Assets/Scripts/Utility/EnemyBasics.cs (line 234 onward).

Families (affinity groups): animal, darkness-kin, daylight-kin, undead, daedra, golem, water-kin, human. Behaviour groups: ground, flying, aquatic, spectral (flying and see-through), guard.

Escalation with level: each row has a level, a health range and a damage range that generally widen as the level rises. The top band (levels 16-21) is where the metal gates reach Mithril, and the armour value goes negative. (Class-enemy health, a different path, is a base of 10 plus one random step per level: FormulaHelper.cs line 1756.)

Gates: many rows set a minimum metal to be hit. The gates run from Dwarven through Silver to Mithril. Silver sits on the low and mid rows (ID 9 at EnemyBasics.cs line 543). Mithril sits on the top rows, for example ID 22 at line 983 and ID 25 at line 1086. A gated target takes zero damage from a weaker metal (FormulaHelper.cs line 576).

Signature abilities (one line each):
- Spectral pair: flying, see-through, silver gate, high damage band.
- Water rows: aquatic, cannot leave water.
- Golem quartet: four golems of one tier, one per element.
- Guard row: behaviour "guard", halts rather than fights.
- Human ranged rows: two attack slots on some rows (ranged 1 and 2).
- Bosses: no boss flag seen in the enums or the EnemyBasics rows (not searched further). Single named foes come from quest records (Assets/Scripts/Game/Questing/Actions/CreateFoe.cs), whose content is in the data pack.

Animation vocabulary (EnemyBasics.cs lines 30-38 and DaggerfallUnityEnums.cs lines 217-231): move 6 fps, fly 10 fps, attack 10 fps, hurt 4 fps, idle 4 fps. Flying and swimming rows reuse the move set as their idle. Some rows have no idle set and reuse move. Frost and ice daedra have a special idle set.

### Top 8 striking creatures (category labels, our own)

1. Silver-bound wraith (spectral rows ID 18 and ID 23; EnemyBasics.cs lines 830-843 and 1002-1015). Why: a see-through flyer that only takes silver-tier hits; readable as "not like the others". Keep: flying see-through movement and the metal gate. Change: our own silhouette, a clear telegraph before each hit, damage tuned to our duel step.
2. Gate brute (daedra row ID 25; EnemyBasics.cs lines 1073-1086). Why: a tier-gated melee brute, the rule is the threat. Keep: gate that refuses weak metal. Change: show the gate as a rune flash and sound, not a text popup.
3. Reef lurker (aquatic row, EnemyBasics.cs ids 11, 41, 42). Why: water-bound, a zone-edge threat. Keep: cannot leave water. Change: our own ambush cue and look.
4. Sky whelp (daylight flyer, EnemyBasics.cs ids 34 and 40). Why: a fast flyer with a distinct silhouette. Keep: flying swoop idea. Change: our own shape and colour.
5. Golem quartet (EnemyBasics.cs ids 35-38). Why: one tier, four element variants; the family reads as a set. Keep: same stats, element swap. Change: our own palette per element.
6. Crypt sovereign (top undead, EnemyBasics.cs ids 32-33). Why: top-tier undead with a negative armour value; "armour that goes below zero". Keep: negative armour at the top. Change: our numbers and a readable aura.
7. Ranged sentry (human rows 128-145, two attack slots on 130 and 133). Why: a human ranged unit with a second attack. Keep: two attack slots as a mode switch. Change: our own weapons and cue.
8. Town guard (row 146, EnemyBasics.cs line 2198). Why: a non-hostile behaviour that halts rather than fights. Keep: "halt" as a town rule. Change: our own guard look and call.

Silhouette at 375 wide, sound and effect: NOT verifiable here. The sprite and sound art is in the data pack, not the box. Marked (not read).

## 2. Classes, races, factions

Classes (18 careers, EntityEnums.cs line 51): mage, spellsword, battlemage, sorcerer, healer, nightblade, bard, burglar, rogue, acrobat, thief, assassin, monk, archer, ranger, barbarian, warrior, knight. Signature mechanic and progression live in the career records (data pack, not in the box). Code side: DFCareer.cs defines the career fields (not read per class).
Progression shape (code): player level = floor((skill sum - start + 28) / 15) (FormulaHelper.cs line 336). Skill uses to advance grow by 1.04 per level (FormulaHelper.cs line 325). Hit points per level-up roll inside the career's range, plus endurance modifier (FormulaHelper.cs line 348 seeds from render frame, see defects).

Races (11, EntityEnums.cs line 32): breton, redguard, nord, dark elf, high elf, wood elf, khajiit, argonian, plus vampire, werewolf, wereboar as state races. Racial bonuses in FormulaHelper.cs CalculateRacialModifiers (not read in full). The vampire and lycanthrope states set a silver gate (VampirismEffect.cs line 125; LycanthropyEffect.cs line 198).

Factions (guild classes, Assets/Scripts/Game/Guilds/): fighters, mages, thieves, dark brotherhood, temple, knightly order, non-member. Seven guild classes. Faction names in Quests-Factions.txt (469 lines, names only, not read further).

## 3. Weapons

Families (ItemEnums.cs lines 210-231 and DaggerfallUnityEnums.cs WeaponTypes): long blade, staff, dagger, mace, flail, warhammer, battleaxe, bow, melee, werecreature claws. Seven of these have a magic variant (long blade, staff, dagger, mace, flail, warhammer, battleaxe). An enchanted weapon takes the magic variant (ItemHelper.cs line 918 onward).

Material tiers (ItemEnums.cs line 64): iron, steel, silver, elven, dwarven, mithril, adamantium, ebony, orcish, daedric. Ten metal tiers. Silver and the high metals are the gates above.

Elements for resistances and enchants (DFCareer.cs line 493): fire, frost, disease or poison, shock, magic. Enchant effects (Assets/Scripts/Game/MagicAndEffects/Effects/Enchanting/, 24 files). Example: potent-vs and low-damage-vs key on affinity (PotentVs.cs line 86).

Tier look: one art per weapon, recoloured by metal (see section 6). Steel is the file default.

Top 5 striking (category level):
1. Metal ladder on one weapon shape: ten tiers from one sprite (FPSWeapon.cs line 701-704; ImageProcessing.cs line 457).
2. Magic variant swap on enchant: a plain blade becomes a glowing variant when enchanted (ItemHelper.cs line 918).
3. Affinity-keyed bane: damage up against one affinity group (PotentVs.cs line 86).
4. On-hit spell and leech: HealthLeech.cs line 23 and CastWhenStrikes.cs (names only).
5. Unique items: 23 artifacts (ItemEnums.cs line 238), stats in MAGIC.DEF (not in the box, not read).

## 4. Armour and gear

Slots (ItemEnums.cs line 195): cuirass, gauntlets, greaves, left and right pauldron, helm, boots, and four shield types (buckler, round, kite, tower).

Material roll on loot (FormulaHelper.cs lines 2118-2162): leather 70 percent; chain 20 percent; metal plate 10 percent. Plate metal comes from the same ladder as weapons, rolled by player level. The level modifier doubles above level 10 and quadruples below it (lines 2124-2129). A bucket table (ItemBuilder.cs line 42) walks the roll into the ten tiers.

Material look: a metal dye per tier remaps a 16-index palette band (ImageProcessing.cs lines 427-457). Steel uses the file's default, so no remap.

Set bonuses: none. Gear tiers are the only progression.

Top 5 striking:
1. Level-weighted material roll: low-level players rarely see the top metals (FormulaHelper.cs line 2129).
2. Palette band remap for all tiers from one art (ImageProcessing.cs line 457).
3. Shield family as four slot types (ItemEnums.cs line 195 onward).
4. Armour roll with a plate tail: 10 percent metal plate (FormulaHelper.cs line 2162).
5. Gate by metal: armour and weapons both obey the metal ladder (FormulaHelper.cs line 576).

## 5. Zones and dungeons

Dungeon archetypes (19, DFRegion.cs line 171): crypt, orc stronghold, human stronghold, prison, desecrated temple, mine, natural cave, coven, vampire haunt, laboratory, harpy nest, ruined castle, spider nest, giant stronghold, dragon's den, barbarian stronghold, volcanic caves, scorpion nest, cemetery.

Location types (15, DFRegion.cs line 66): settlements (city, hamlet, village), farms, labyrinth, temple, tavern, keep, homes (wealthy, poor, farm, ship), cult, ruin, graveyard, coven.

Outdoor climate bases (4, DaggerfallUnityEnums.cs line 66): desert, mountain, temperate, swamp. Seasons (3): summer, winter, rain.

Hazards: diseases and poisons (23 files across Effects/Diseases and Effects/Poisons), lycanthropy and vampirism states (DaggerfallUnityEnums.cs LycanthropyTypes line 660). Hazard tables in Quests-Diseases.txt (20 lines, names only).

Dungeon lighting: room lights are culled by distance and polled every 0.4 s (DungeonLightHandler.cs lines 25-26).

Top 5 striking:
1. Crypt and cemetery as separate archetypes (DFRegion.cs lines 173, 191).
2. Swamp and desert as climate bases with their own texture sets (DaggerfallUnityEnums.cs line 66).
3. Volcanic caves and dragon's den (DFRegion.cs line 171 list).
4. Coven and vampire haunt as two archetypes (DFRegion.cs line 171 list).
5. Ship home as a location type (DFRegion.cs line 66 list, last entry).

## 6. Item and effect looks worth recreating

- Metal dye by palette band (technique: remap a 16-index band per tier). Ref: Assets/Scripts/Utility/ImageProcessing.cs lines 427, 457, 610; Assets/Scripts/Game/FPSWeapon.cs lines 701-704.
- Ghost shader (technique: alpha cut-out plus emission map; the albedo has the emission subtracted, and the code comment says that is so other lights do not add to it). Ref: Assets/Shaders/GhostShader.shader lines 1, 45 (read).
- One-shot billboard FX at 10 fps (blood splash, sparkles, from one archive). Ref: Assets/Scripts/Game/EnemyBlood.cs lines 37, 52.
- Retro palettization and posterization (name only, body not read). Ref: Assets/Shaders/DaggerfallRetroPalettization.shader, DaggerfallRetroPosterization.shader.
- Billboard batch (name only). Ref: Assets/Shaders/DaggerfallBillboardBatch.shader.
- Paper-doll gear preview (name only). Ref: Assets/Shaders/DaggerfallPaperDoll.shader.
- Automap ink reveal (name only). Ref: Assets/Shaders/DaggerfallAutomap.shader; Assets/Scripts/Game/AutomapModel.cs (not read).

## 7. Inspiration for Frankendom (category level, our originals)

1. Silver-bound wraith: a see-through flyer that only takes top-metal hits. Keep: flight, see-through, the gate. Change: our silhouette, a telegraph, our own cue.
2. Gate brute: a tier-gated brute. Keep: refuse weak metal. Change: rune flash and sound instead of a text popup; one gate per zone.
3. Reef lurker: water-bound ambusher. Keep: cannot leave water. Change: our look and ambush cue.
4. Four-element golem set: one tier, four element variants. Keep: family and stats. Change: our palette per element.
5. Metal ladder gear: ten tiers from one art. Keep: palette band remap. Change: our ramp colours and a glint on the top two tiers.
6. Level-weighted loot roll: low-level players rarely see top metal. Keep: the shape of the roll. Change: our numbers, server-side random source (see defects).
7. Spawn ring placement: pick a point in a distance band from the player, outside view, ground probe and overlap check. Keep: the ray and separation. Change: a bounded number of tries, then widen the band or skip.
8. Attract call with a random delay: ambient bark within a radius, delay 3-9 s, 80 percent bark, 20 percent move sound, dampened when blocked (EnemySounds.cs lines 26-27, 110, 213). Keep: cadence and dampening. Change: our own calls.

## Defects found (keep the idea, fix the defect)

- HP per level-up is seeded from the render frame count (FormulaHelper.cs line 348). Idea kept: roll per level-up. Fix: take the roll from the server random source and record it. Server-verified kills need this.
- Foe spawn placement has no attempt cap (FoeSpawner.cs lines 119-200; retried each frame from line 76). Idea kept: ring placement. Fix: cap tries per spawn (for example 8), then widen the band or give up with a log.
- Dungeon light polls at 0.4 s (DungeonLightHandler.cs line 26), so lights pop in up to 0.4 s late. Fix: check on player cell change or on a shorter poll.
- Material bucket sum is 259 but the roll is clamped to 256 (ItemBuilder.cs line 42; FormulaHelper.cs RandomMaterial). The last bucket is only reachable at the top two values. Check it is intended; if not, make the sum 256.
- Enemy spawn "return" on a bad ray (FoeSpawner.cs line 175 and 197) is a silent retry, not a failure. Log it.

## Not read
- Data-pack half (not in the box): sprites, sounds, MAGIC.DEF artifacts, CLASSES career records, monster art and sound tables.
- Quest scripts (265 .txt), BIOG questionnaires, Text (113 files), Tables beyond the header and first lines (Quests-Foes 78 lines names only; Quests-Items 137 lines names only; Quests-Places 188; Quests-Factions 469; Quests-Diseases 20).
- Shader bodies except GhostShader (names only for the rest).
- RaceTemplate.cs (37 public members, not read), DungeonTextureTables.cs (not read beyond structure), CastWhenStrikes.cs, most enchant effects.
- Standard Assets water, TMP and font assets, soundfont, Editor, Packages, ProjectSettings.
- MapChance and Weight fields in EnemyBasics.cs (meaning not read).
