# shnok-l2-unity (design catalogue, reader DC049)

Donor: /mnt/frankendom-donors/shnok-l2-unity (VPS, read-only). File paths below are relative to that donor root (the Unity project is under l2-unity/Assets). Scope for inspiration only. Dom's rule: recreate as a clearly distinct original, never a copy. Name the trait KEPT and the trait CHANGED in every brief. Donor is class C (game data is proprietary, unclear licence): looks and names stay category-level, no instance-level looks, no copied names or lore text.
I am not a lawyer. This is not a legal claim.

Licence (as the files say): the repo has no LICENSE, COPYING or NOTICE file outside plugin folders, and the README has no licence section. Code: no licence stated, so treat as all rights reserved; use the shape of the mechanisms only. Game content: README.md:3 calls it "a basic playable demo of Lineage2 on Unity" and lists importing the game's world (README.md:56); the repo does not name a rights holder. Plugin licences present: FMOD EULA (Plugins/FMOD/LICENSE.TXT), Newtonsoft.Json under MIT (Plugins/NuGet/LICENSE), Animancer under the Unity Asset Store EULA (Plugins/Animancer/License.txt).

Which half was read:
- CLIENT (Unity): read. Scripts/Game (skills, effects, spawners, combat), Scripts/Camera, Scripts/Audio, Scripts/Rendering, Scripts/Input, Scripts/Tools/Terrain (builders), Scripts/Networking (packet field reads only), Scripts/Enum. 552 C# files in Scripts; about 40 read in part.
- DATA PACK (StreamingAssets/Data/Meta, LineageEffects, Resources/Data/Maps Meta): read for headers, field names, counts and distributions, plus a few rows.
- SERVER half: NOT in this box. The README links separate gameserver and loginserver repos, which are not in the donor tree. Never read. The authoritative spawn, damage and skill rules are therefore not in the box.

Counts (method stated; none hand-checked beyond the stated rows):
| count | value | method |
|---|---|---|
| NPC/monster records (Classic) | 5,660 | grep npc_begin in Npcgrp_Classic.txt |
| distinct NPC class names | 972 | grep class_name, unique |
| monster-class rows (prefix LineageMonster, 2, 3) | about 3,406 | prefix count |
| NPC-class rows (prefix LineageNPC, 2, 4) | about 1,866 | prefix count |
| Interlude NPC records | 6,519 | grep npc_begin, Npcgrp_Interlude.txt, not read |
| item-armour records | 4,463 | grep item_begin, Armorgrp_Classic.txt |
| item-weapon records | 1,677 | grep item_begin, Weapongrp_Classic.txt |
| skill records | 34,679 (8,264 distinct skill_id) | grep skill_begin, Skillgrp_Classic.txt |
| character group records | 15 Classic, 17 Freya, 17 Lindvior | grep Char_begin |
| map tiles with ambient data | 4 (16_24, 16_25, 17_24, 17_25) | ls Resources/Data/Maps |
| ambient sound rows | 4,158 | python count over the four JSON files |

## 1. Creatures and beasts

How the client sorts them: EntityTypeParser (Scripts/Enum/Entity/EntityType.cs:14-23) makes a record an NPC when the class prefix contains "lineagenpc", and a Monster otherwise. The npc_type field is a separate field (distribution below). Data: Npcgrp_Classic.txt (one record per line, tab-separated key=value).

Families (the class name, a shared mesh set and many spawn rows):
- Undead and grave: zombie, skeleton, skeleton archer, dark horror family (zombie 15, skeleton 22, dark horror 25 in the table).
- Beasts and spiders: werewolf (12), giant spider (28), poison spider, wererat, grizzly, onyx beast family.
- Constructs and elementals: stone golem (16), sylph, dryad, walking fungus.
- Lizard and insect families: virud lizardman (warrior variants), ant, ant larva (75), lesser basilisk (70).
- Floating and magical: monster eye (55), mana vampire (37), succubus (48).
- Orc and human fighters, archers and mages: orc family, orc archer, ol mahum family with champion tier.
- Boss marks: deco effects in the records. A boss halo effect appears on 7 rows and a snow event on 6 (count from grep).

Escalation with level and tier: the client NPC record has no level or tier field. The summon_sort, summon_grade and Silhouette fields are 0 on every row that has them (5,649 of 5,660 records). Real tiers and stats sit in the server half, which is not in the box.

Distributions in the data:
- npc_type: hide 3,692; monster_normal 1,415; citizen_normal 468; citizen_warehouse_keeper 42; citizen_gatekeeper 21; citizen_teleport_device 11 (meaning of "hide" not read in code).
- monster_normal org_hp: minimum 55, median about 1,397, 95th percentile about 55,088, maximum about 2.24 million. The top end is an outlier and needs checking before any use.
- drawscale ranges from -1.0 to 15.0 (23 distinct values).
- attack_effect is one shared value on 5,659 rows, so the attack look is not per monster.
- sound_random is 30 on 4,938 rows, 10 on 598, 5 on 69 (semantic not read).

Top 8 most striking (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance). Behaviour is not in the client; the picks below rest on the data signal named.

1. label: Layered-hit brute. why: a big, slow body whose record carries its own attack, defense and damage sound fields, so each monster sounds like its body. keep: a big, slow silhouette; per-record hit sound fields. change: our own sound set keyed to armour, a moss and crystal body, a ground-crack telegraph (not read in code). ref: Npcgrp_Classic.txt:16 (stone golem).
2. label: Web-spinner brood. why: two spider rows share one family, giant and poison variants with separate stats. keep: one family, several sizes and venoms. change: a glowing venom sac in place of a palette swap; a web-spit in place of a bite. ref: Npcgrp_Classic.txt:28 and the poison spider rows.
3. label: Watcher orb. why: a floating single-eye silhouette is readable at distance. keep: the hovering eye-led silhouette. change: three smaller eyes in a ring, a slow spin telegraph, no beam. ref: Npcgrp_Classic.txt:55 (monster eye).
4. label: Mana-drinking shade. why: a drain monster with its own class family, so a drain reads as a family trait. keep: drain as a family trait. change: our own drain visual (a thread, not a glow), a different body. ref: Npcgrp_Classic.txt:37 (mana vampire).
5. label: Halo-marked boss. why: the data marks a few rows with a boss halo effect, so a boss reads at a distance through a halo, not through size alone. keep: the halo as the boss marker. change: our own halo shape and colour, tied to phase, not a fixed effect. ref: Npcgrp_Classic.txt (rows with deco_effect boss halo, 7 rows, grep).
6. label: Crawling larva swarm. why: a larva family with its own class name, a cheap way to fill a corner with small threats. keep: small swarm family. change: our own swarm count cap and a burrow-out intro. ref: Npcgrp_Classic.txt:75 (ant larva).
7. label: Basilisk-type lizard. why: a low, long silhouette with one class family for the whole type. keep: low wide body. change: our own head and tail, a stare telegraph in place of a gaze. ref: Npcgrp_Classic.txt:70 (lesser basilisk).
8. label: Gaunt spirit (succubus type). why: a family that reads as a tempter, a different mood from the undead. keep: a distinct family silhouette. change: our own look, our own voice line, no copied shape. ref: Npcgrp_Classic.txt:48 (succubus).

Defect checks in the creature data path (keep the idea, fix the defect):
- The NPC and monster split is a prefix test on the class name (EntityType.cs:16). fix: an explicit type field in the data row, so a rename cannot flip a type.
- Spawner placeholder: a missing model falls back to a fixed placeholder and logs (NpcSpawner.cs:85-92). Keep the fallback; fix the duplicate title branch (NpcSpawner.cs:59-64, the same assignment in both arms).

## 2. Classes, races and factions

Layout: a character group table per chapter (Chargrp_Classic, Freya and Lindvior groups) with face, hair, body, attack and voice fields (chargrp.txt; Chargrp_Freya.txt; Chargrp_Lindvior.txt). The Lindvior group holds class_id, class_type and race fields (class_type takes 0, 1 or -1 on the rows checked; meaning not read).
Body-type columns in the armour table: eight race families, each with male and female columns (plus an _add column each), and two later-race columns (Armorgrp_Classic.txt header). The README feature list says the client has two playable races, with a few armour sets for each. Factions: not in the client data.

Progression shape (client view; the server holds the rules):
- Skill records: 34,679 rows for 8,264 distinct skill ids, levels to 85, one sublevel value. Skill records carry cast range, cast style (six values), hit time, cool time, reuse delay, MP and HP cost, a debuff flag (6,706 rows) and an operate type. Data only, not run.
- Skill visuals are a separate spec per skill id (section 6).

One line each (roles are not in the client; only the data shape is visible):
- Player races: two playable races in the client (README feature list).
- Body-type families: human, dark elf, dwarf, elf, orc and others by column name (Armorgrp header).
- Skill-driven progression: 8,264 skill ids with level tiers up to 85 (Skillgrp_Classic.txt).

Top 3 striking: (1) the per-skill level ladder up to 85, which makes progression a data table; (2) the two-state race body columns, one body family per race and gender; (3) the cast-style field, which sets how a skill is cast.

## 3. Weapons

Families (Weapongrp_Classic.txt, 1,677 records, weapon_type field):
- two-hand sword 442, sword 422, buster 177, dagger 174, staff 133, blunt 131, two-hand blunt 96, fist 77.
- handness values run from 1 to 14 on the rows (hand-type code, meaning not read).

Materials: fine steel 630, steel 399, wood 151, oriharukon 87, bone 68, bronze 66, blood steel 59, adamantaite 54.

Tiers: crystal grade (crystal_type): none 450, d 477, c 387, b 185, a 165, s 13. Magic weapons: 433 rows (is_magic_weapon=1).

Special properties in the data:
- Augment (variation) effect: variation_effect_type holds an effect code list. Most rows are -1 (none, 397). Codes 2 to 8 appear in the first slot, some rows have a second slot (for example {4;4;0;0;0;0}, 114 rows).
- Ensoul slots: 357 rows with one slot on each side, 1,317 with none.
- The client does NOT draw augments: AbstractItemPacket.cs:37 reads the augment id and discards it; PlayerInfoPacket.cs:97 and :104 do the same for both hands. So the data exists and the look is not built.

Top 5 striking:
1. Two-hand sword family (largest weapon family): a long silhouette for the two-hand stance. keep: the two-hand readability. change: our own blade shape and a per-swing trail.
2. Buster type (177 rows): a weapon family with its own silhouette in the data. keep: a distinct family read. change: a shockwave ring on impact, our own shape (silhouette not checked in the client).
3. Staff type (133 rows): a caster family with a tip. keep: a readable tip. change: a tip glow in our own colour, shape and sound.
4. Fist: a short, bare-hand style (77 rows). keep: a distinct stance for unarmed fighters. change: our own knuckle shape and a sound of our own.
5. Augment code families: the augment codes 2 to 8 form about seven repeatable variants on one weapon line. keep: a code per variant. change: our own colours and shimmer, built on our own augment ids.

## 4. Armour and gear

Armour table (Armorgrp_Classic.txt, 4,463 records):
- armor_type: none 3,704; heavy 306; light 225; magic 224; sigil 4.
- material_type: wood 893, gold 816, silver 781, leather 763, cloth 587, mithril 130, crystal 120, steel 113.
- crystal_type (grade): none 3,444; b 311; c 242; a 218; d 208; s 34; r 4; s80 2.
- color index 1 on 4,158 rows, 2 to 5 on the rest (colour meaning not read).
- drop_anim_type: 3 on 2,924 rows, 0 on 1,432, 1 on 99 (the drop ceremony code).
- body_part values include artifact slots, jewel slots and deco slots (artifact_a1 399 rows, artifact_a2 251, artifact_a3 278).

Tiers as the game shows them (client view): material name plus grade letter, plus a colour index. Hair and deco parts are separate slots, so cosmetic and armour are split in the table.

Top 5 striking:
1. Mithril and crystal armour tier (130 and 120 rows): a light, bright material name at a high grade. keep: the material name as a tier. change: our own material set and palette.
2. Gold-plated tier (816 rows, the second most common material): gold reads as a rank. keep: gold as a tier signal. change: a gilt edge with our own metal, not the game's gold.
3. Drop ceremony type 3 (2,924 rows): one drop motion for most gear. keep: a single drop motion for common items. change: our own drop motion, with a rarer motion for higher grades.
4. Magic armour type (224 rows): a class of armour kept apart from heavy and light. keep: a separate magic armour class. change: our own silhouette and glow.
5. Sigil armour (4 rows): a rare type with few rows. keep: a few rare pieces as a tier above normal. change: our own sigil mark.

Defect check: the client builds the defense sound without the armour type (HumanoidAudioHandler.cs:55, a TODO). The armour type is in the data, so the hit sound could follow it.

## 5. Zones and dungeons

Map tiles: four tiles with region data (16_24, 16_25, 17_24, 17_25), plus one combined ambient file (TalkingIslandAmbientSounds.json) and static mesh lists. The README feature list names the Talking Island region as the one world imported. No dungeon archetype data is in the box.
Ambient rows: 4,158 in total (day 1,547, night 1,440, always 1,171). Sound names: 33 in tile 16_24 alone.
Biomes by ground material: nine external PBR ground sets (grass patchy, sandy soil, swamp soil, a slate rock set and others; 90 files and no licence key in their JSON, per the asset audit).
Clock: a full day is 240 minutes by default (WorldClock.cs:32); the server minute of the day maps onto the clock (WorldClock.cs:101). Day is the window from a quarter to three quarters of the cycle (WorldClock.cs:7-8).
Hazards: none in the client data read (no lava, water or storm code).

Top 5 striking:
1. Day and night ambience split by tile: the same tile holds day, night and always rows (1,547, 1,440, 1,171). keep: the day and night split per place. change: our own clock, our own sound beds per biome.
2. Ambient emitter by distance: a sphere trigger and a max-distance cut (section 6). keep: sound that fades with distance. change: our own radius rule.
3. Swamp and sand ground sets: ground material as a biome cue. keep: ground material per biome. change: our own palettes.
4. Global height-fog prefab in the map data: one fog volume for the tile set. keep: one fog layer for the area. change: our own fog density by zone.
5. Geodata layer (13 MB): collision and walk data kept apart from the visible mesh. keep: a separate walk layer. change: none; use as a shape for our zone data.

## 6. Item and effect looks worth recreating

Category-level only (class C). Reference paths for a human to look at, not to copy.

- Skill effect spec: one JSON per skill with cast, shot and explosion lists (31 files; LineageEffects/3.json:3-5). Each emitter names an attach node (for example AM_RH for the right hand, AM_Trail for a trail), a multi-target flag, a spawn-on-target flag, a scale, and a simple variant class (3.json:3-4). Technique: a spell as three data slots; a low-detail variant per emitter.
- Projectile flight: the shot is a lerp over wall-clock start and hit time, and re-aims at the live target each frame (ProjectileManager.cs:68, :118). A miss lands on the ground and skids with a random spin (ProjectileManager.cs:98-100). An arrow sticks into the target's root bone on a hit (ProjectileManager.cs:89).
- Hit layers: damage sound always on a hit; crit and soulshot layers on top; a defense sound only when there is no soulshot or crit (Combat.cs:101-120).
- Hit particle tiers: a pool per soulshot grade and crit state (ParticleManager.cs:597); the grade picks a colour tier.
- Pawn light: each skill effect may carry a light (type, effect type, colour string, radius, coordinate system) (EffectPawnLightParam.cs:9-21).
- Light LOD: a light is enabled only inside distance bands measured in squared distance, and shadows follow the band; bands refresh on a timer (LightLOD.cs:73, :103).
- Cursor affordance: hover over a monster shows an attack cursor, over an NPC a talk cursor, over a pickup a pickup cursor (ClickManager.cs:93-106).
- Click-to-move marker: a base effect and a reached effect as two states of one marker (ClickManager.cs:40-45).
- Boss halo: a deco effect on a few boss rows (Npcgrp_Classic.txt, grep for ra_boss_halo; 7 rows).

Shaders, textures and particle files are not in the box, so no shader technique is claimed.

## 7. Inspiration for Frankendom

Each is a clearly distinct original. Keep the mechanism, change the look, numbers and names.

1. Name: Two-state waypoint. Idea: a destination marker with a travelling state and a reached state. Keep: two states on one marker. Change: our own marker shape and colour. Row 5 (controls and input).
2. Name: Layered hit. Idea: the hit sound is layered, a base hit always, then crit and soulshot layers on top, a defence cue only when the hit is plain. Keep: layers from flags. Change: our own layers and sound set. Row 10 (hit impact) and row 12 (combat sound cues).
3. Name: Homing bolt with ground miss. Idea: a bolt re-aims at the live target each frame; a miss lands and skids. Keep: live re-aim and the miss skid. Change: our own flight curve and skid. Row 10 and row 11 (fight camera). Server stays authoritative for the hit (the client resolves the hit on arrival here, which must not carry over).
4. Name: Three-stage spell. Idea: a spell as cast on the hand, a shot with a trail, an optional blast, each a data slot. Keep: three slots and a low-detail variant. Change: our own attach nodes and blast ring. Row 13 (specials) and row 20 (catalogue as runtime source).
5. Name: Distance-banded light. Idea: a spell light enabled only inside distance bands, refreshed on a timer. Keep: squared-distance bands and a timed refresh. Change: our own bands, our own lights. Row 16 (colour grade and quality).
6. Name: Day-and-night ambience beds. Idea: ambience beds per place, split into day, night and always, with a distance cut and a random chance per loop. Keep: the day, night and always split; distance cut. Change: our own clock (zone data) and sound. Row 23 (zone population, for the time window) and the sound-music fold-in.
7. Name: Augment shimmer. Idea: a weapon line carries augment codes, each a repeatable visual variant. Keep: a code per variant, a small set of variants. Change: our own codes, colours and shimmer; built on our data, not on theirs. Row 15 (gear dressing).
8. Name: Boss halo. Idea: a halo marks a boss row so it reads at a distance. Keep: the halo as the marker. Change: our own halo, tied to phase. Rows 14 (HUD, boss bar) and 19 (fight record) carry it.

## Defects found (keep the idea, fix the defect)

- Hit particles are dropped: a hit effect is dequeued from ActiveHitEffects and only put back when expired; a young one is lost from tracking and never returned to the pool (ParticleManager.cs:179-197, enqueue at :541-554). fix: re-queue an effect that has not expired, and pool it only on expiry.
- Log reads the name before the null check (ParticleManager.cs:184). fix: check null first.
- A null hit effect is re-queued into the normal active queue (ParticleManager.cs:195). fix: re-queue into the hit queue or drop it.
- Only one effect per queue is retired each physics step (ParticleManager.cs:156). fix: budget per frame by count, not one per step.
- Every retirement writes a log line (ParticleManager.cs:161). fix: log only on error.
- Camera clip corners pass degrees to Mathf.Tan (CameraCollisionDetection.cs:30); the viewport points use the full field of view (:53). fix: half angle in radians, Mathf.Deg2Rad.
- The collision object is the last hit, not the nearest (CameraCollisionDetection.cs:89). fix: keep the object of the nearest hit.
- Mouse look adds per frame with no delta time (CameraController.cs:146); an earlier version used delta time (:143). fix: multiply by Time.deltaTime.
- Zoom pull-in divides by a 0.075 s constant with a plain step (CameraController.cs:169); above about 13 fps the step passes the target and overshoots. fix: exponential step, 1 - exp(-dt/tau), or clamp the factor to one.
- Music stays a single slot: PlayMusic sets the current event without stopping the old one (MusicManager.cs:43). fix: stop the old event when a new one starts.
- Music area stay handler re-plays when the current event differs (MusicAreaTrigger.cs:92-94), so two equal-priority areas can hand the slot back and forth every physics step and log each time. fix: switch on enter only, keep a set of active areas.
- Ambient loop stop uses a new enumerator, so the running loop is not stopped (AmbientSoundEmitter.cs:80 and :165). fix: keep the Coroutine handle and stop that. Each re-entry starts another loop.
- Night check is true for the first quarter of the day window (WorldClock.cs:107, the || dayRatio < 0.25 term). fix: night is nightRatio > 0 only.
- Projectile flight speed is 20 units per second (WorldCombat.cs:10) but the comment says 16 (WorldCombat.cs:487). fix: one value and one comment.
- The projectile impact sound is skipped when the skill has no explosion list (WorldCombat.cs:217-220 return before the sound at :233). Skill 3 has an empty explosion list (3.json:5), so its shot has no impact sound. fix: play the impact sound before the explosion check.
- A bad pawn-light radius throws (EffectPawnLightParam.cs:58). fix: log and skip that field.
- Armour type does not reach the defense sound (HumanoidAudioHandler.cs:55, TODO). fix: pick the defense list by armour_type.

Status: as read; nothing run.

## Not read / unverified
- Server half (not in box): authoritative combat, spawn, skill rules.
- Client half in the box: models, textures, shaders, audio banks (binary); only file names and sizes.
- Data: most of the 5,660 NPC rows, 1,677 weapon rows, 4,463 armour rows, 34,679 skill rows (headers and distributions only); Interlude files (count only); ItemName, SkillName, SysString (not read).
- Scripts not read: Networking (except the augment and enchant reads), Controller and state machine (PlayerController, PathFinderController), Tools/Terrain parsers beyond the ambient builder, DayNightCycle.cs (371 lines), NpcSpawner UpdateAction path, WorldSpawner grid logic, Combat/Gear dressing.
- Plugin folders (Animancer examples, Nature, Beautify, water shaders, ProBuilder, TextMesh Pro, ParrelSync): licence files only, per the audit.
- Meaning of npc_type "hide", color index, sound_random, class_type and handness: not read in code.
- The org_hp top end (about 2.24 million) is unverified and may be a placeholder.
