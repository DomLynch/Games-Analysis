# Open-RSC-Core-Framework (design catalogue, DC042)

Donor: /mnt/frankendom-donors/Open-RSC-Core-Framework/ (VPS, read only)
Halves: DATA PACK read (server/conf/server/defs: NpcDefs, NpcDefsCustom, ItemDefs, ItemDefsCustom, extras/CombatOdyssey.json, extras/Object*.xml, SpellDef.xml, PrayerDef.xml, locs/ placement packs). The matching server code (server/src, server/plugins) is in the box but NOT read, so ability and effect logic is unknown. Client: Client_Base/Cache audio names listed; one line of Client_Base/src/orsc/mudclient.java checked (line 6362). Binary sprite, landscape and map packs not opened.
Licence: code is GNU AGPL-3.0 (LICENSE line 1). No asset licence in the box, so every asset group is class C. Any reuse is shape and mood only.
Rule for every brief below: recreate as a clearly distinct original, never a copy; about 20-30 percent resemblance in mood only. Kept and changed traits are named per item. Not legal advice.

Counts: creatures 794 base NPC entries plus 42 custom (581 unique base names); classes 0 (three account modes listed in section 2); weapon families 8 (material ladders); gear sets 11 (8 material ladders and 3 mode sets); zones 10 placement packs.

## 1. Creatures and beasts

Families (word-boundary name match in NpcDefs.json; counts and max combat level):
- Dragons 6, max 245 (baby, blue, red, black and the apex dragon).
- Ogres 16, max 100. Giants 8, max 109. Goblins 6, max 48.
- Skeletons 8, max 83. Zombies 8, max 83. Ghosts 6, max 83.
- Demons 5, max 175. Spiders 10, max 64. Wolves 5, max 64. Scorpions 9, max 46.
- Warriors 9, max 64. Knights 7, max 146. Mages 6, max 52. Druids 3, max 44. Bears 3, max 26. Rats 7, max 16.
- Town guards 38 (max 96). Most are non-combat or town NPCs; treat as noise.

Escalation by combat level (base list, 794): 0-9: 257; 10-19: 165; 20-29: 132; 30-39: 64; 40-49: 35; 50-59: 48; 60-69: 18; 70-79: 38; 80-89: 9; 90-99: 5; 100 and up: 23. The shape is a dense base of about 420 creatures under level 20, then a thin tail. The top is 8 creatures at 140 and up.

Respawn: respawnTime runs from 1 to 362 across all NPCs (units as stored; the audit assumed seconds, not verified here). Aggressive flag on 102 of 794. Attackable on 276 of 794.

Abilities: the defs hold stats, aggression, respawn, sprite slots, camera and model ids, but no ability fields. Signature abilities are therefore not in the box (server code not read).

Boss pattern: the combat ladder (extras/CombatOdyssey.json, 14 tiers and 101 tasks) ends in one apex task with one kill. The apex and the black dragon are aggressive with respawnTime 75 and 73. The black demon at level 175 has respawnTime 30, so rarity is not only about the top. There is also a high non-aggressive tier: three creatures at levels 146 to 172 that do not start fights.

Top 8 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect; sound per creature was NOT checked, the defs do not name it):

1. Apex dragon (King Black Dragon, NpcDefs.json line 18607, respawn line 18620, aggressive line 18619). Why: top base level (245) and the last step of the kill ladder. Keep: a single apex at the top of the ladder that is aggressive by default and shares its sprite slot (165) with the black dragon. Change: its silhouette and palette, and add a visible wind-up before its big attack. Gate its spawn with a zone grace timer.
2. Glass-cannon demon (Chronozon, NpcDefs.json line 12289; attack line 12293 is 183, hits line 12295 is 60, respawn line 12302 is 75). Why: stat skew, very high attack with low hit points, so a short fight that hurts. Keep: the skew and the short fight. Change: a three-hit telegraph pattern and its own sound.
3. Waiting boulder (Rock of ages, NpcDefs.json line 27500 description, aggressive line 27511 is 0). Why: a high-level creature that never starts a fight, so it reads as a landmark. Keep: non-aggressive high-level stand-still. Change: it wakes only when the player enters a marked circle in a gated room.
4. Gate titan (Black Knight titan, NpcDefs.json line 15643). Why: a non-aggressive gatekeeper at level 146. Keep: it does not chase. Change: it opens by a condition (a kill count or a key item) rather than by standing still.
5. Ancient demon (Nezikchened, NpcDefs.json line 29995). Why: non-aggressive top-tier demon at level 172 with respawnTime 30. Keep: a non-aggressive top-tier demon. Change: its trigger is a sealed-zone entry, not an attack.
6. Two-tier demon (Black Demon, NpcDefs.json line 22156 at level 175 with respawn 30; line 11314 at level 156 with respawn 73). Why: one silhouette in two tiers, with respawn as the rarity lever. Keep: same silhouette, rarity by respawn time. Change: the higher tier gets a new ability, not a bigger number.
7. Add-on boss (Balrog, NpcDefsCustom.json line 604, combat level 217, aggressive, respawn 73). Why: the donor added a boss above the base ladder. Keep: a custom top tier that sits above the base list. Change: silhouette, sound and ability.
8. Dragon ladder (Red Dragon at NpcDefs.json line 7843; Black Dragon at line 11353). Why: one family in tiers that shares sprite slots. Keep: tiered family with one slot. Change: each tier gets its own element colour and silhouette step.

## 2. Classes, races and factions

- No class or race system in the defs (0 entries). Item gating uses a skill id field with values 0, 1, 4 and 6; the skill names are not mapped in the box (code not read).
- Account modes (custom NPC entries 799 to 801 in NpcDefsCustom.json; custom gear sets marked untradable): Standard, Ironman, Ultimate Ironman, Hardcore Ironman. Progression shape: the same material ladder, but the mode kit cannot be traded.
- Prayers (PrayerDef.xml, 14 entries): a defence and strength buff line, for example the Thick skin entry at line 5 and the Steel skin entry at line 59, with a stepped tier per skin.
- Spells (SpellDef.xml, 48 entries): four-rung elemental ladders (strike, bolt, blast, wave) per element, plus utility spells such as teleports and alchemy.
- Factions: none in the defs. Guild and region membership is in server code (not read).

## 3. Weapons

Families: 8 material ladders. Level gates from ItemDefs.json: Bronze 1, Iron 1, Steel 5, Black 10, Mithril 20, Adamantite 30, Rune 40, Dragon 60.

Long sword power (weaponPowerBonus, ItemDefs.json) rises from 7 (Bronze) to 10, 16, 16, 22, 31 and 49 (Rune). Dragon weapons sit at level 60: Dragon axe power 75 (ItemDefs.json line 13667); Dragon 2-handed sword power 99 (ItemDefsCustom.json line 1293), the highest weapon power in the data.

Specials: each metal has a poisoned variant (name pattern, for example a poisoned steel dagger). Four battlestaves (fire, water, air, earth) each give 20 magic bonus and share one appearance id. Dragonstone amulets carry small magic and prayer bonuses.

Tier look: each tier gets its own sprite (appearance id), not in tier order. The long sword ids run Bronze 48, Iron 49, Steel 50, Mithril 51, Adamantite 52, Rune 53, Black 54.

Top 5 striking:
1. Material ladder with one sprite per tier (keep: eight readable steps; change: silhouette per step, not just colour).
2. Poisoned variant per metal (keep: a second look for every tier; change: a glow instead of a tint).
3. Battlestaff family of four sharing one sprite id (keep: palette-swap family; change: each element gets its own tip shape).
4. Dragon 2-handed sword, power 99, the highest weapon power across ItemDefs and ItemDefsCustom (keep: the top weapon as a rare two-hander; change: the reach and its swing sound).
5. Mode-locked kit (keep: untradable, a self-imposed rule set; change: unlock it at character creation, not by a level).

## 4. Armour and gear

Sets: 8 material ladders (plate, chain and shield pieces per metal), 3 mode sets (Ironman, Ultimate and Hardcore; helm armour 6, plate armour 20, legs armour 10, all untradable), and Dragon Scale and Dragon Plate sets (custom: Dragon Plate Mail Body armour 125, Dragon Scale Mail Body armour 95).

Plate body armour by tier (armourBonus): Bronze 14, Iron 20, Steel 31, Black 40, Mithril 44, Adamantite 63, Rune 80, Dragon 125. Plate sprite ids: Bronze 28, Iron 29, Steel 30, Black 33, Mithril 31, Adamantite 32, Rune 34. Again not in tier order.

Rings: six ring types (recoil, splendor, forging, life, wealth, avarice). Their defs carry no stats, so the effects live in server code (not read).

Masks: wolf and unicorn masks come in four colours each (white, blood, black, pink). Each colour is its own appearance id; the wolf set runs 291 to 294.

Shared art: the gold necklace and the dragonstone necklace share appearance id 81.

Top 5 striking:
1. Plate body ladder with eight steps and a fixed sprite per step (keep: readable silhouette per tier; change: add a material sheen per tier).
2. Ironman sets (keep: a kit that is locked to a mode; change: its look, make it dull and grey on purpose).
3. Wolf and unicorn mask colour variants (keep: one mask, four colourways; change: colour by a rarity signal, not by a random pick).
4. Dragon Scale Mail (keep: a dragon-leather armour that is lighter than plate; change: its scales animate on a hit).
5. Ring set with no stats in the data (keep: a ring family as a readable set; change: each ring has one visible effect in the HUD).

## 5. Zones and dungeons

Zones: 10 named placement packs in defs/locs (Auction, CustomQuest, Discontinued, Harvesting, Ironman, ModRoom, OpenPk, Other, PkBots, Runecraft). Base packs: NpcLocs.json has 3,608 NPC placements; SceneryLocs.json has 26,814 scenery placements; GroundItems.json has 1,019 ground items; BoundaryLocs.json has 967 boundaries.

Dungeon archetype: climb pairs in extras/ObjectTelePoints.xml link a surface point (about y 110) to an underground point (about y 3368), a drop of about 3,258 tiles in y (lines 1 to 10 of the file).

Resource zones: mining ore table (ObjectMining.xml, 24 entries, about 13 ore labels), woodcutting, fishing, runecraft altars (ObjectRunecraft.xml). Respawn per ore differs widely: respawnTime 4 for copper and 510 for bluerite (units not verified).

Hazards: PK packs (OpenPk, PkBots). Zone bounds were not read.

Top 5 striking:
1. Climb pair as a depth link (keep: one-to-one pair; change: a depth readout on screen).
2. Ore respawn spread from 4 to 510 (keep: rare ores come back slowly; change: show a timer on the node).
3. OpenPk and PkBots as separate PK packs (keep: PK as data in its own pack; change: each pack has a named arena).
4. CustomQuest pack, 50 NPC placements (keep: a quest zone as a placement pack; change: its own spawn cap).
5. Harvesting event pack, 10 NPCs and 169 scenery (keep: an event as a swap-in pack; change: rotate it on a schedule).

## 6. Item and effect looks worth recreating

- Sprite slots per NPC: up to 12 sprite slots and four colour fields (hair, top, bottom, skin). One art pool, many creatures. Ref: NpcDefs.json (keys sprites1 to sprites12, colour fields). Technique: slot plus palette swap.
- Shared sprite slot across tiers: the apex dragon and the black dragon both use slot 165. Ref: NpcDefs.json line 18621.
- Paired hit sounds: combat1a and 1b, 2a and 2b, 3a and 3b (names only; WAV not played). Ref: Client_Base/Cache/audio/.
- Custom art band: the client branches on animation id 230 and up when custom sprites are on. Ref: Client_Base/src/orsc/mudclient.java line 6362 (condition only).
- Glowing items by name: a glowing red crystal (ItemDefs.json line 1231) and a glowing dark dagger (line 1256). Rendering of the glow was not read.
- Death, victory and under-attack cues: death.wav, victory.wav, underattack.wav (names only).

## 7. Inspiration for Frankendom

Each original below is a clearly distinct design. Mood only, about 20-30 percent resemblance. Nothing copied.

1. Warden's Ledger (zone kill ladder). A 14-step ladder inside one zone, each step a group of 1 to 7 creature kinds with a kill count, ending in one apex kill. Keep: grouped tasks with rising counts and a single top kill. Change: each step is bound to one biome and one zone; each group has two dialogue lines.
2. Sentinel Stone (non-aggressive gate). A high-level stone that does not chase and wakes only in a marked circle. Keep: non-aggressive high-level blocker. Change: wakes on entry, and its respawn is a grace-timed respawn, not a fixed timer.
3. Glass Warlock (stat-skew caster). A short fight with very high attack and low hit points. Keep: the skew. Change: a three-hit telegraph and a unique cast sound.
4. Ember Stalker (two tiers, one silhouette). Same silhouette in a common tier and a rare tier; rarity set by respawn time. Keep: one silhouette, two tiers. Change: the rare tier gets one new ability.
5. Forge Ladder (eight material steps). Level gates 1, 1, 5, 10, 20, 30, 40, 60 with a power ramp and one sprite per step. Keep: the gates and the ramp. Change: each step changes silhouette, not just colour, and the names are ours.
6. Mode Kit (locked gear). A kit that cannot be traded and is chosen at creation. Keep: untradable and mode-locked. Change: the kit is earned by a mode choice, not a level.
7. Mastery Track (weapon XP). Three XP curves by weapon profession, a play cap at level 7 and visual-only mastery above. The idea is seen in the sibling donor opentibiabr-otclient (game_proficiency); it is not in this donor. Keep: the cap and visual mastery. Change: perk lanes per level differ per weapon.
8. Palette Family (slot plus palette). One sprite slot shared by a tier family, with colour-only variants for rare drops. Keep: slot reuse. Change: rare variants also change the silhouette by one step.

## Not read

- Server code: server/src and server/plugins (ability and drop logic, DropTable.java, ring effects).
- Binary packs: Client_Base/Cache/video (Authentic and Custom sprite and landscape packs, models, library, spritepacks), the map packs (land*.jag, content*) in server/conf/server/data/maps.
- WAV cues not played. Most JSON entries (counts and sampled fields only). CombatOdyssey dialogue arrays.
- Patch and retro files: NpcDefsPatch18.json, ItemDefsPatch18.json, SpellDefRetro.xml, extras/retro.
- Launchers, Android and PC client folders, Backups, Deployment_Scripts, third-party folders (Portable_Windows JDK, Ant, HeidiSQL).
- Per-creature sound and effect: not in the defs.
