# pmbstyle-L2Solo (design catalogue, DC045)

Donor/Licence: L2Solo, a Lineage II C4 server emulator in Node.js, Apache-2.0 for code (LICENSE; README line 290). Data under data/ has no separate licence and does not state its source. Crest art is from a third-party gallery whose licence is not stated. Class C: category-level inspiration only. Recreate as clearly distinct originals, never copies. Not legal advice.

Halves: server code (src/GameServer: class progression, bot population) and the server data pack (data/). The client is not in this donor (top-level listing shows server folders only). The named upstream fork, NodeL2-NodeL2, is in the box and was not opened.

Counts (rows, not unique creatures): creatures 3,119 (Monster 2,731, Boss 194, Summon 194; 179 raid-flagged). Classes 89 class ids. Weapons 861 rows. Gear 809 armour rows. Zones 41 spawn-set files.

Receipts: 68 checked by verify_receipts.py, 0 failed (DC045/receipts.tsv).

## 1. Creatures and beasts

- Families by race trait (data/Npcs/*.json): humanoid 904, undead 576, beast 256, construct 247, demonic 222, insect 205, animal 202, divine 92, spirit 87, plant 53, fairy 51, dragon 37, giant 14. 1,400 rows have no race trait.
- Escalation by 10-level band (median max HP of Monster rows): about 90 at levels 0 to 9, about 302 at 10 to 19, about 592 at 20 to 29, about 1,109 at 30 to 39, about 1,660 at 40 to 49, about 1,829 at 50 to 59, about 3,626 at 60 to 69, about 4,229 at 70 to 79, about 4,663 at 80 to 89. Median physical attack rises about 180x across the same bands (12 to 2,148). Shape only.
- Raid bosses: 179 raid-flagged rows, levels 20 to 67 (data/Npcs/c4_raid_bosses.json, c4_low_level_raid_bosses.json). Each boss has a linked minion list (284 rows keyed by bossId, data/Npcs/Minions/c4_raid_bosses.json).
- Summons: 194 Summon rows. data/Npcs/PHANTOM_SUMMONS.md describes three summoner families over 50 skill levels, each with its own behaviour.
- AI role tags: data/Npcs/ai.json (line 1) maps each NPC id to FIGHTER, ARCHER or BALANCED.

Top 8 striking (criteria: readable at 375 wide, one signature behaviour, one signature effect; silhouette and sound were NOT read because the donor has no art or audio):

1. **Corpse-burst husk** (Soulless family in the doc). Keep: corpse as a combat object, area burst from the body, a toxic smoke field. Change: our burst ring, art, name, sound. Ref: data/Npcs/PHANTOM_SUMMONS.md lines 27 and 33.
2. **Blood-drinking shade** (Silhouette family in the doc). Keep: heal-on-hit as the signature; the doc's runtime checks list 20% steal-blood absorption and 15% melee absorption. Change: our silhouette and drain visual; absorb values per zone. Ref: PHANTOM_SUMMONS.md lines 27 and 32.
3. **Warband warden** (raid boss with linked minions). Keep: boss plus a separate minion list keyed by boss id; the cold-combat code reads the same list. Change: boss silhouette, palette, minion roster, wave timing. Ref: data/Npcs/Minions/c4_raid_bosses.json line 3; src/GameServer/Bot/Population/ColdCombatProfile.js lines 12 and 702.
4. **Great wyrm tier** (dragon race rows, levels 34 to 85). Keep: dragons only in the top bands, a few per zone. Change: silhouette, element, sound. Ref: data/Npcs/c4_forge_of_the_gods.json line 1096 (level 85 dragon row); data/Npcs/c4_legacy_monsters.json (10 dragon rows).
5. **Colossus band** (giant race rows, 14, levels 61 to 65). Keep: few giants in one late band, large collision. Change: body, pose, attack. Ref: data/Npcs/npcs.json line 7822; c4_legacy_monsters.json.
6. **Hive swarm** (insect race rows, 205, levels 15 to 81). Keep: an insect family across many bands and many small bodies per encounter. Change: shapes, sounds, per-zone swarm cap. Ref: data/Npcs/c4_catacomb_of_the_witch.json, c4_devastated_castle.json, c4_devils_isle.json.
7. **Restless dead** (undead race rows, 576, levels 1 to 82). Keep: one theme across all bands with a tier per band. Change: silhouettes and tier cues. Ref: undead rows in data/Npcs/c4_catacomb_of_*.json, c4_devastated_castle.json, c4_devils_isle.json, c4_fields_of_silence_and_whispers.json.
8. **Sprite trickster** (fairy race rows, 51, levels 1 to 78). Keep: fast small body and trickster movement at the low bands. Change: silhouette, colour, sound. Ref: data/Npcs/npcs.json line 4.

## 2. Classes, races, factions

- **Root tier**: 9 root class ids with no parent. Each carries a skill tree of 9 to 37 skills (data/Skills/Tree/tree.json, 89 class entries). Role: not stated in the data. Progression: first promotion.
- **First-profession tier**: 18 ids, 1 to 3 per root (src/GameServer/ClassProgression.js line 35, firstProfMap). Mechanic: a new skill set on promotion.
- **Second-profession tier**: 31 ids (line 47, secondProfMap). Mechanic: second promotion with its own skills.
- **Third-class tier**: 31 ids (88 to 118). Each has a base combat-point cap and a per-level add (base about 1,049 to 2,756; per-level add about 21 to 57; one shared modifier of 0.22; line 2 is the first example). Lineage walk: line 94. Progression: points grow per level.
- **Races (player)**: not read. Race trait appears only on NPC rows (13 values, section 1).
- **NPC roles**: FIGHTER, ARCHER, BALANCED (data/Npcs/ai.json line 1).
- **Factions**: not read.

## 3. Weapons

- **Families** (861 rows in data/Items/Weapons): blunt 210, sword 136, dual 117, knife 95, pole 76, bow 64, dual-fist 52, misc 42, great sword 30, pet 30, fist 9.
- **Rank tiers** (field etc.rank): none 136, d 122, c 304, b 146, a 100, s 53.
- **Special abilities**: data/Items/weapon_sa.json lists 443 weapons and 36 proc definitions. Proc families: drain 7, poison 3, bleed 3, stun 2, silence 2, root 1, slow 1, others 17 (buffs, curses, magic holds).
- **Conditional bonuses**: 79 conditional stat entries in weapon_sa.json. The one read example is gated by minEnchantLevel 4. The test notes cover a +4 dual case (WEAPON_SA.md line 124).
- **Proc rules** (WEAPON_SA.md lines 24 to 26): critical procs fire on normal-attack impact after a landed critical, not on skills or misses; magic procs fire after a completed cast on its recipients; proc chance is separate from the effect resist roll (line 26).
- **Visual distinctness of tiers**: not read (no models in the donor).

Top 5 striking:
1. **Bleed-on-crit blade** (Critical Bleed proc, data/Items/weapon_sa.json line 4647). Keep: proc on critical only, separate from resist. Change: our proc name, DoT numbers, glow.
2. **Poison-on-crit blade** (Critical Poison, line 4612; its damage-over-time ticks sit in the semantic block for that level). Keep: damage over time as a readable tell. Change: our status and colour.
3. **Drain-on-crit blade** (flat heal per landed critical; the doc says values follow item text, WEAPON_SA.md line 46). Keep: heal on each landed critical. Change: our heal numbers, sound.
4. **Stage-ladder weapon** (soul crystal stage 0 to 13, 3 colours; install needs exact colour and stage; stage 13 terminal, SOUL_CRYSTALS.md line 26). Keep: exact match and terminal top. Change: stage names, colours, odds.
5. **Pole with range and angle** (76 pole rows; explicit pole range and angle preserved, WEAPON_SA.md line 13). Keep: reach and arc as the identity of the weapon. Change: our arc and reach.

## 4. Armour and gear

- **Armour kinds** (809 rows in data/Items/Armors): wear 366, jewel 113, fabric 87, shield 76, chain 71, leather 66, pet 30.
- **Rank tiers**: none 142, d 103, c 103, b 279, a 134, s 48.
- **Sealed and unsealed**: sealed-grade and unsealed sets (c4_sealed_a_grade 23 rows, c4_unsealed 38) plus per-grade files (a 9, b 24, s 20). An exchange recipe list (data/Items/c4_unseal.json) turns sealed pieces into unsealed ones. This is a state reveal, not a shader.
- **Soul-crystal ladder** on weapons: 3 colours, stages 0 to 13, 42 intact crystals plus broken remains (SOUL_CRYSTALS.md line 3). Growth 32%, break 10% per attempt (line 22).
- **How tiers show**: rank letters in data, sealed or unsealed state, crystal stage. Client rendering not read.

Top 5 striking:
1. **Sealed-to-open reveal** (c4_unseal.json). Keep: a sealed piece that opens by recipe. Change: our reveal moment and our item names.
2. **Stage-ladder relic** (crystal stage on weapons, see section 3). Keep: exact colour and stage match. Change: names, colours, odds.
3. **Jewel line** (jewel kind, 113 rows). Keep: a small jewel slot as its own gear kind. Change: art and effect; not read beyond counts.
4. **Shield tier** (76 shield rows across ranks). Keep: a shield tier separate from body armour. Change: our shield shape.
5. **Pet armour set** (30 pet rows). Keep: companion gear as its own kind. Change: our companion items.

## 5. Zones and dungeons

- **Catacomb-type dungeons**: 6 files (data/Npcs/c4_catacomb_of_*.json), each with a spawn set in data/Npcs/Spawns/ and a reward table in data/Npcs/Rewards/.
- **Necropolis chain**: 8 files (data/Npcs/c4_necropolis_of_*.json), a themed graveyard series.
- **Field and island zones**: about 25 files, for example c4_alligator_island.json, c4_swamp_of_screams.json, c4_fields_of_silence_and_whispers.json, c4_garden_of_beasts.json, c4_hot_springs.json, c4_valley_of_saints.json, c4_wall_of_argos.json, c4_maille_lizardmen.json.
- **Raid lairs**: c4_raid_bosses.json (174 rows) and c4_low_level_raid_bosses.json (5 rows), with minion lists.
- **Town and service**: town NPC files; ClanHallManager rows 50 across the Npcs files; teleport table of 34 entries (data/Teleports/teleports.json).
- **World spawn**: data/Npcs/Spawns/spawns.json holds 13,465 spawn groups covering 26,945 mobs. Respawn median 95 s; common values 15, 60, 240 and 10,800 s. The bias field takes 0, 15, 50, 120 and 180 (meaning not read). Respawn values of -1 and 950400 appear and are not explained in the files read.
- **Hazards**: no trap or hazard table in the donor; not read.

Top 5 striking:
1. **Catacomb series** (6 files). Keep: a stacked dungeon series with its own spawns and rewards per file. Change: our names, layout, theme.
2. **Necropolis chain** (8 files). Keep: a themed run of eight graveyard instances. Change: names, theme, ordering.
3. **Raid lair with minion pack** (boss plus 284-row minion list). Keep: boss and pack per lair. Change: arena, waves, names.
4. **Forge of the gods** (c4_forge_of_the_gods.json, dragon rows at level 85). Keep: a late-band dragon zone. Change: layout and boss.
5. **Reptile zones** (c4_maille_lizardmen.json and c4_alligator_island.json; theme taken from the file names only). Keep: a reptile-themed zone as its own spawn set. Change: fauna, layout, names.

## 6. Item and effect looks worth recreating

| Label | Technique | Ref |
|---|---|---|
| Pixel crest badges | Indexed-colour badges at small sizes: 8 x 12 (ally) and 16 x 12 (clan), 485 files. Reads well on a phone. | data/crests/ally, data/crests/clan; data/crests/README.md line 6 |
| Sealed-to-open reveal | A state change by recipe, not a shader. | data/Items/c4_unseal.json; data/Items/Armors/c4_unsealed.json |
| Summon corpse ring | Area burst on a corpse with smoke. Effect art not read (no client). | data/Npcs/PHANTOM_SUMMONS.md line 33 |
| Named proc effects | Critical procs show as named abilities (poison, bleed, drain, stun). Visual not in the server half. | data/Items/weapon_sa.json lines 4612, 4647 |

No glows, auras or shaders exist in the server half.

## 7. Inspiration for Frankendom (originals; keep and change named)

1. **Corpse Reliquary**: a summoner's servant that spends a corpse to burst outward in a ring, then leaves a short smoke field. Keep: corpse as a resource, one burst ring, a smoke field after. Change: our silhouette, element, ring art, sound; our own status instead of poison.
2. **Warband Standard**: a boss plants a standard and calls a linked wave, keyed by boss id. Keep: boss plus separate minion list; a timed wave. Change: boss body and palette, minion roster, wave timing, a visible standard. Maps to parity row 2 (AI brain) and row 17 (death/respawn of the wave).
3. **Tidewake Shade**: a drain servant that returns a share of damage as healing to its summoner. Keep: heal-on-hit; absorb numbers in data. Change: silhouette, drain tendril, per-zone caps.
4. **Ember Proc Blade**: critical hits roll a damage-over-time proc, separate from the target's resist roll. Keep: procs on critical only; proc chance separate from resist; nothing on skills or misses. Change: our proc names, effects, a glow per proc family. Maps to row 3 (guard, parry, stamina) for the resist side.
5. **Stage Ladder Relic**: a gear item that grows one stage at a time when fed the matching crystal, with a small break chance and a terminal top stage. Keep: exact match; growth and break odds; terminal stage. Change: our odds (the donor's are a compatibility baseline and not verified retail values), stage names, colours.
6. **Band Warden Pack**: a zone with a few top-band bosses in the far zone and cheap background actors elsewhere, promoted to full detail on approach. Keep: three tiers by distance; promotion on approach; budgets that tighten when a player is near. Change: tier names and distances; a fight-only tier that is always full. Maps to parity row 23 (zone population) and the row 18 sub-line "per-tick NPC budget".

## Defects to fix (keep the idea)

- **Magic Paralyze duration**: the donor states it has no effect body or duration in either C4 source and uses 15 seconds immediately (WEAPON_SA.md line 48). Fix: pin the duration in our data and mark it as a design value.
- **Soul-crystal odds**: the donor labels its 70% boss chance as an estimate and fixes an integer comparison that added a point. Fix: already fixed in the donor to exact 32% and 70% thresholds; keep the exact thresholds.
- **Respawn sentinels**: -1 and 950400 appear in spawn rows. Fix: map them to explicit "no respawn" and "long timer" fields before use.

## Fold-ins (Strategy coverage)

- **Spawns and encounters (walk density)**: the world file is a respawn-timer table, not a per-step roll. Density per walk is not read. Row 23 idea: respawn and cap per zone.
- **Progression**: class tree and CP per level (section 2). Death penalty, achievements, titles and cosmetic collections: not read.
- **Loot**: reward tables read as counts only (data/Npcs/Rewards/*.json: 3,128 NPC rows; median 0 reward groups per row, max 5; 1,046 rows carry a spoils list, median 1 item). Item chance entries (13,121): 458 under 0.1%, 1,971 from 0.1% to under 1%, 3,010 from 1% to under 10%, 4,783 from 10% to under 50%, 2,899 at 50% or more.
- **HUD, sound, accessibility, touch**: none in the donor (no client).
- **Idle animation, death presentation, boss intro, readability at 375 wide**: none read; no art or audio in the donor.

## Not read

See DC045/pmbstyle-L2Solo.catalogue.json, not_read. In short: most template values, the Items and Skills bodies, Html (337 files), the crest pack beyond one header, the Bot code beyond the population config and two lines of cold combat, the formulas that use the CP values, tests and scripts, and the upstream NodeL2-NodeL2 fork.
