# shadowofze-OfflineDAoC (design catalogue, reader DC049)

Donor: /mnt/frankendom-donors/shadowofze-OfflineDAoC (VPS, read-only). File paths below are relative to that donor root. Scope for inspiration only. Dom's rule: recreate as a clearly distinct original, never a copy. Name the trait KEPT and the trait CHANGED in every brief. Looks are category-level only (class D-ish donor: proprietary client, art not in box).

Licence (as the files say): LICENSE is GNU GPL v3 (LICENSE:1). THIRD_PARTY.md:3 says the server and navigation-builder roots keep GPL v3 texts and per-file notices. The proprietary game client is a binary dependency and is NOT in this copy (README.md:124). The GPL covers the server code; it does not license the client assets (THIRD_PARTY.md). Use: clean-room, shape and mechanism only. Do not port code.
I am not a lawyer. This is not a legal claim.

Which half was read:
- SERVER half: read (scripts/namedmobs/Dragons, ai/brain/Special, scripts/mobs, playerclasses, Managers/worldmanager/RegionWeather.cs, scripts/quests/Hibernia/SluaghbinderEpicArmor.cs, dbupdater/insert XML).
- DATA half: partly read. The client data tables are extracted catalogues under source/tools/observer-model-inspection/*.csv (monsters, items, spells, skins, moneffects, siege). Headers and row counts read; a few rows only.
- CLIENT half (models, sprites, shaders, sound): NOT in this box. Never read. Not "absent" in the sense of missing content; it is out of the copy by design.

Counts (method stated, not hand-checked):
| count | value | method |
|---|---|---|
| creatures (client export rows) | about 2,247 | wc -l monsters.csv minus 2 header rows |
| creatures (named/epic boss classes) | 199 classes in 167 files | grep of ": GameEpicBoss" (includes classes not checked for live use) |
| mob scripts | 268 files | find under scripts/mobs and scripts/namedmobs |
| classes | 63 files | 15 base archetypes + 16 Albion + 17 Hibernia + 15 Midgard (folder file counts) |
| weapons (server, hand-written) | 3 | epic set weapon pieces (mace, shield, scythe) |
| gear sets | 1 | Dubh Sluagh epic set, 10 pieces |
| zones | 473 zone rows, 344 region rows | grep of dbupdater/insert/Zones.xml and Regions.xml |

## 1. Creatures and beasts

Families (by folder and mechanism):
- Realm field mobs: scripts/mobs/AlbionMobs (21 files), HiberniaMobs (16), MidgardMobs (9), custom helpers (5). Mostly one-off named mobs with a small brain.
- Named and epic bosses: scripts/namedmobs (31 entries; Dragons 8 files, Fomor 4, Trollheim 5, DarknessFalls 10, plus realm and expansion folders). The dragon encounter is the richest pattern.
- Special AI creatures: ai/brain/Special (6 files): storm-scaled water elemental, storm-latched globule swarm, stealth ambusher, walk-away boss, alluvian spawner.
- Idle and atmosphere mobs: ShiveringPresence (idle pulse), Strangler (aura every 3 s), RainbowSprites (288 lines, not read), BotonidSeedling (102 lines, not read).
- Disguise mobs: Myling (ghost-flag disguise, reveal on first strike), Changeling (re-rolls look and size).
- Clock mobs: TimeDependentSpawnNpc with DaySpawn and NightSpawn.

Escalation with level and state (what the code does):
- Health steps: dragon breath fires at 90, 80 ... 10 percent health (AlbGolestandt.cs:736 to :792). Add summons unlock at 85, 70, 55, 40, 25, 10 percent (DragonEncounterAdds.cs:17, formula 85 - spawned x 15).
- Weather tiers: water elemental grows in three intensity tiers, size +50, +75, +125 percent and strength +5, +10, +15 percent (WaterElementalBrain.cs:18-20). Random storm intensity 30 to 110 (RegionWeather.cs:119), so the lowest storms hit tier 0 and the top tier needs 100 or more.
- One-time growth: globule grows to a fixed size 95 and level 10 or 11 the first time a storm passes (AlluvianGlobuleBrain.cs:136-139), then never shrinks back.
- Boss escalation through attack set: breath is a point-blank AoE with a 5 s debuff timer (AlbGolestandt.cs:739-741); throws lift players 712 units up (DragonCombatGeometry.cs:21).

Top 8 most striking (readable at 375 wide, one signature behaviour, one signature effect, could be ours at 20-30 percent resemblance):

1. label: Stepped sky boss (three mainland dragons). why: health-stepped breath ladder, capped and spaced add summons ringed around the target, a flight watchdog. Striking because the boss telegraphs its own phase changes. keep: health-stepped signature attacks; capped total summons (not concurrent); spacing; a ring placement. change: one cursor for the ladder, not nine flags; our own breath shape; no flight route in the fight. ref: scripts/namedmobs/Dragons/AlbGolestandt.cs, DragonEncounterAdds.cs, DragonFlightLanding.cs.
2. label: Storm-grown elemental. why: size and strength scale with a passing storm front; one signature sound (rain) and one effect repeated to nearby players. keep: intensity tiers driving size; the creature visibly reacts to the world. change: our own storm (zone data), our own tier table, a clamp on size. ref: ai/brain/Special/WaterElementalBrain.cs:18-20, :71-81.
3. label: Storm-latched globule swarm. why: a lake of small spheres that grow once when a storm crosses, then stay grown. keep: the latch as a one-time phase change. change: our own trigger (time or event, not a storm pass), our own size and level, a visible colour cue. ref: ai/brain/Special/AlluvianGlobuleBrain.cs:118-139, ai/brain/Special/AlluvianBrain.cs:17.
4. label: Ambusher hidden until first hit. why: stealthed creature that drops stealth on the first attack, so the player learns the rule from one hit. keep: reveal on attack. change: reveal by a ground ripple and a sound cue, not a flag flip. ref: ai/brain/Special/UrchinAmbusherBrain.cs:12-17, scripts/mobs/AlbionMobs/UrchinAmbusher.cs:12-15.
5. label: Ghost-cloaked veil shade. why: looks like a plain ghost until attacked, then shows a random shape from a short list; reverts when the fight stops. keep: disguise and reveal on attack; revert on disengage. change: our own shape list, no ghost flag, reveal as a short animation. ref: scripts/mobs/Myling.cs:20-47.
6. label: Re-rolling shapeshifter. why: changes model and size on a Util.Chance(10) roll per think (a 10 percent roll, Util.cs:48-51; think interval not read). keep: the look changes over time, the player never gets a stable read. change: roll only out of combat; our own size range; a telegraph before the change. ref: scripts/mobs/Changeling.cs:33-69.
7. label: Clock-bound creature. why: a creature that appears at day or at night, decided by the zone clock, and never flips while a fight is on. keep: visibility gated by a clock, flip out of combat only. change: our own visibility cue (a dim glint by day), zone data for the clock. ref: scripts/mobs/TimeDependentSpawnNpc.cs:45-86.
8. label: Haunting pulse. why: an idle creature that sends a small pulse effect to nearby players at a random 6 to 20 s gap, a cheap way to make a zone feel alive. keep: random idle beat, triangular timing. change: our own pulse shape and colour; a slower beat for big zones. ref: scripts/mobs/ShiveringPresence.cs:55-62, scripts/mobs/Strangler.cs:26-36.

Other shape worth noting: a walk-away boss that removes itself after 60 s out of combat (ai/brain/Special/SINeckBossBrain.cs:12-15). Keep the leash-to-despawn; fix the 5 s window (see defects).

Boss and elite pattern: named bosses are GameEpicBoss classes with add waves and phase steps. Epic encounter rules are switched off for bot raids through flags (scripts/namedmobs/EpicEncounterMechanics.cs:10-17).

Defects found (keep the idea, fix the defect):
- Dragon breath and add flags are static across boss instances (AlbGolestandt.cs:715 onward, :313 onward). fix: per-instance state on the brain, like EncounterAdds (AlbGolestandt.cs:323).
- Breath ladder: nine independent ifs can each fire in one think if several thresholds are crossed; the guard relies on IsCasting, which was not read. fix: one cursor, one breath per tick, as the add code does (DragonEncounterAdds.cs:74 comment).
- Storm-grown elemental: a storm with intensity below 1 falls through to the top tier (WaterElementalBrain.cs:126-138). Random storms cannot reach 0 (RegionWeather.cs:119), but the explicit setter accepts any value (WeatherManager.cs:106). fix: reject or clamp intensity below the first threshold.
- Storm-grown elemental: size math casts to byte with wrap; a base size above about 113 at the top tier wraps (arithmetic from the code, not run; checked/unchecked build not read). fix: clamp in int before the cast.
- Storm-grown elemental: the 1-in-6 send block (WaterElementalBrain.cs:59-65) sends the same effect as the unconditional loop (:66-70) on the same tick. fix: one send path.
- Globule: SwapRemoveAt inside a forward loop skips the element moved into the slot (AlluvianGlobuleBrain.cs:49-53). fix: iterate backwards or rebuild the list.
- Globule: global count is a static (AlluvianBrain.cs:17), so the cap is shared across zones. fix: per-zone count.
- Walk-away boss: the 60 to 65 s window is 5 s wide (SINeckBossBrain.cs:12), so it misses if the think interval is longer than the window (interval not read). fix: latch a flag on first out-of-combat tick after 60 s.
- Myling: StopAttack sets Flags = 0 (Myling.cs:28), which clears any other flags. fix: remove only the ghost bit.
- Changeling: re-rolls the look even in combat (Changeling.cs:65, no combat check). fix: gate on not in combat.
- Idle pulse: the timer is started in the constructor (ShiveringPresence.cs:52) and again in brain Start (:30). Possible double start, ECSGameTimerWrapperBase not read. fix: start once.
- Bainshee wraith: TurnOutOfWraith(bool forced) takes a forced flag that is not used (ClassBainshee.cs:152, body commented out at :157-161). fix: remove or use it.

Status of these defects: as read; not run.

## 2. Classes, races and factions

Layout (file counts): 15 base archetypes (playerclasses/base), then realm specialisations: Albion 16, Hibernia 17, Midgard 15. Realm specialisations derive from a base (for example Albion Armsman from Fighter, Hibernia Bainshee from Magician, Midgard Hunter from Rogue).

One line each, role and mechanic (from code, not run):
- Pet summoners (Sluaghbinder, Necromancer, Bonedancer families): pet or summon mechanics; ControlledMobBrain.
- Wraith-style caster (Bainshee): a 30 s form change that starts on an offensive cast and refreshes with each cast; reverts on zone-out or removal (ClassBainshee.cs:45, :95, :105-112). Race-specific model swap (elf, lurikeen, other: 1885, 1884, 1883).
- Ranger (153 lines), Hunter and Scout (148 lines each): spell lines and skills granted on training (not read in full).
- Shell subclasses (Necromancer and Theurgist at 30 lines, Thane at 37): little code of their own.
- Races: eRace enum (Enums/eRace.cs); 25 lines with a value, including Unknown; realm mapping not read.
- Factions: three realms, Albion, Hibernia, Midgard (folder split).

Progression shape: skills grant spell lines on training (Ranger, Hunter, Scout), a form or stance can be timed (Bainshee). Progression tables are in the data half (not read in full).

## 3. Weapons

Families: the server holds three epic-set weapons (mace, shield, scythe), plus pet weapons installed by tools/pet-art (README.md:31). The main weapon table is in the client data half (items.csv, about 2,848 rows, header only).

Damage types (eDamageType enum): physical Natural, Crush, Slash, Thrust (0 to 3), magic Body, Cold, Energy, Heat, Matter, Spirit (10 to 15) (Enums/eDamageType.cs:26-40). The epic shield uses the thrust type; the mace crush; the scythe slash and two hands.

Tier evidence: damage per armour point is 165 on the three weapons and 102 on the armour (SluaghbinderEpicArmor.cs:31, :53). Speed values run from 35 (shield) to 55 (scythe) (same file). No elemental set bonus found; no set-count bonus found (the set is a quest reward, see section 4).

Top 5 striking (criteria: silhouette, one signature behaviour, one signature sound/effect):
1. Scythe (two-hand, slash, long speed value). Striking silhouette. Trait kept: two-hand slow weapon with the highest speed value. Trait changed: our own blade shape and a per-stroke trail.
2. Mace (crush, heavy). Trait kept: heavy blunt feel. Changed: a shockwave ring on impact.
3. Shield with thrust type (aegis). Trait kept: a shield that deals damage in the thrust class. Changed: a pulse of light on block, our own.
4. Pet weapons (tools/pet-art/paint_pet_weapons.py, install_pet_weapons.py). Trait kept: paint variants per pet. Changed: our own palette per class.
5. Damage type as a visible tag (crush, slash, thrust, magic types). Trait kept: each type has a colour family, shown on the hit. Changed: our own tag colours.

## 4. Armour and gear

Sets:
- Dubh Sluagh epic set: ten pieces, one per armour slot plus cloak and four weapons or shield (SluaghbinderEpicArmor.cs:29-65). Quest reward; grant and re-claim are in SluaghbinderEpicQuests.cs (:161, :696).
- No set-count bonus found: the server file shows grant, dye refusal and bot equipping only (GamePlayerInventory.cs:1121-1123, BotEquipment.cs:72-81).
- Catacombs armour line: skins and tints per body variant (monsters.csv header "Cata" columns; pet-art README.md:50). Client tables not read in detail.
- Set items are built at level 51 (SluaghbinderEpicArmor.cs:92). The pet-art README calls the set a level 50 reward (README.md:32). Mismatch noted, not resolved.

Material tiers: cloth to plate and mythic metal tiers are in the client data half (not read beyond header). The server uses the stat budget per piece instead of a material name.

Stat-budget score (a useful balance tool): Utility() weights each stat (1 per point by default, 0.25 for max health, 2 for power pool and resist percent, 5 for shield skill) and sums per piece (SluaghbinderEpicArmor.cs:78-86). Keep for balancing gear across slots.

Tier display: the server shows tier through the item level and the damage-per-AF number. Visual tier is by model id per piece (not read in the client half).

Top 5 striking:
1. Helm, hauberk, vambraces, gauntlets, greaves, sabatons: one armour family, distinct model per slot. Trait kept: one family, six slot silhouettes. Trait changed: our own palette and slot shapes.
2. Mantle (magical, cloak slot, low AF). Trait kept: a light magical cloak that is not armour. Changed: a glow edge.
3. Dye refusal on set pieces (GamePlayerInventory.cs:1121). Trait kept: a set keeps its look. Changed: nothing, adopt as is.
4. Helm and pet armour "cairn" style buff overlay (pet-art README.md:30). Trait kept: buff shown as a tinted overlay. Changed: our own tint family.
5. Catacombs variant columns (monsters.csv header): alternate skin with eye and skin tint. Trait kept: alternate colour variant per model. Changed: our own variant set.

## 5. Zones and dungeons

Biome and zone types (from zone and region rows and folder names; not read beyond these):
- Zone rows: 473 (dbupdater/insert/Zones.xml). Lava flag on 7 zone rows (Zones.xml:710, :728, :1484, :1502, :1844, :2492, :2510).
- Realm, experience and water level are 0 in every zone row of this copy (Zones.xml:19 shape). So zone tuning is not in the box.
- Region rows: 344 (Regions.xml). Diving enabled on 27 regions, housing on 3, one frontier region, expansion field most often 3 (229 rows).
- Dungeon archetypes by folder: dragon lairs (AlbGolestandt, MidGjalpinulva, HibCuuldurach), Darkness Falls lords (10 files), Trollheim (5 files), Fomor (4), glacier (TuscarianGlacier, GlacierGiant), caverns (MarfachCaverns, HallOfTheCorrupt), summoners' hall, Avalon Isle lake (storm zone for globules and elementals).
- Weather fronts: a storm band sweeps a region at a set speed (RegionWeather.cs:117-119, :162, :174).
- Hazards: lava zones (7), a moving storm band that buffs storm-creatures, dragon lift throws, stealth ambushers, day and night spawns.

Top 5 striking:
1. Moving storm band. Trait kept: a timed band that crosses the zone at set speed and width; creatures inside react. Trait changed: our band is a visible fog wall on the minimap; zone data sets speed and width.
2. Dragon lair. Trait kept: a lair with a flight route and a landing watchdog. Changed: our own route (a fixed ledge), no flight in the fight.
3. Lake of globules. Trait kept: a water zone where spheres grow once a storm passes. Changed: our own trigger.
4. Lava zones (7). Trait kept: a lava flag on a zone row, so the hazard is data. Changed: our own lava look and damage tick.
5. Day and night spawns. Trait kept: creatures that exist in both states, shown by a clock. Changed: our own cues.

## 6. Item and effect looks worth recreating

Category-level only (class D-ish, proprietary art not in box). Reference paths are for a human to look at, not to copy.

- Storm pulse on creatures: effect sent to players every think inside a storm (WaterElementalBrain.cs:59-70, effect id 2976). Technique: a periodic animation event sent to nearby players, not a shader. Ref: ai/brain/Special/WaterElementalBrain.cs.
- Storm buff on globules: effect id 6053 with a one-in-five roll (AlluvianGlobuleBrain.cs:118-122). Technique: random small effect during a storm. Ref: ai/brain/Special/AlluvianGlobuleBrain.cs.
- Idle pulse: effect id 152 every 6 to 20 s (ShiveringPresence.cs:55-62). Technique: random beat. Ref: scripts/mobs/ShiveringPresence.cs.
- Aura every 3 s: effect id 5206 (Strangler.cs:26-36). Technique: periodic aura. Ref: scripts/mobs/Strangler.cs.
- Buff overlay: tinted overlay tied to an armour buff, with a note that it lacks a buildup halo and a pulse (tools/pet-art/install_blood_shield.py:290). Technique: overlay plus a readable pulse. Ref: tools/pet-art/install_blood_shield.py, tools/pet-art/README.md:30.
- Hand glow and burst for a summon: hand glow L and R, a hand burst and a target explosion (tools/pet-art/install_void_sun.py:1-25, speffects rows 628-631 named there). Technique: three-stage cast effect. Ref: tools/pet-art/install_void_sun.py.
- Timed wind-up phases: load start, load end, fire start, fire end, release point (source/tools/observer-model-inspection/siege.csv:2). Technique: named telegraph phases with a release point. Ref: source/tools/observer-model-inspection/siege.csv.
- Effect attach table: effect, attach node, max visible range, rate, axis, collide (source/tools/observer-model-inspection/moneffects.csv:1). Technique: effect spec per attach point. Ref: moneffects.csv.
- Model and size re-roll: look and size change in place (Changeling.cs:33-58). Technique: in-place model swap. Ref: scripts/mobs/Changeling.cs.
- Ghost-flag disguise: flag swap to hide (Myling.cs:44). Technique: flag-based disguise. Ref: scripts/mobs/Myling.cs.

Client shaders, particle files and textures are not in the box, so no shader technique is claimed.

## 7. Inspiration for Frankendom

Each is a clearly distinct original. Keep the mechanism, change the look, numbers and names.

1. Name: Moving storm band. Idea: a timed band of fog crosses a zone at a set speed and width; creatures inside grow or glow. Keep: timed moving band, creatures react inside it, zone data for speed and width. Change: our fog wall is a minimap sweep, our creatures are our own; no shared numbers. Row 23 (zone population) and row 18 (per-tick budget).
2. Name: Stepped sky warden. Idea: a boss with a breath at each 10 percent health step, one per tick. Keep: health-stepped signature attack. Change: one cursor for the ladder, our own breath, no flight. Row 4 (fight loop) and row 13 (specials).
3. Name: Capped brood ring. Idea: total summons capped per fight, spaced, placed in a ring around the player and validated against the floor. Keep: total budget and spacing, ring placement with floor check. Change: our own add roster, ring around the player. Row 23 and row 4.
4. Name: Veil shade. Idea: looks like a plain shape until first strike, then shows a random form from a short list. Keep: reveal on attack, revert on disengage. Change: our own forms list and a reveal animation. Row 13 and row 8 (wounds on reveal).
5. Name: Grow-once globule. Idea: a creature that grows one time when a trigger passes and stays grown. Keep: latched phase change. Change: our own trigger (event), size and colour. Row 23.
6. Name: Clock-bound stalker. Idea: a creature visible only in a time window, decided by zone data, changing only outside combat. Keep: visibility by clock, no flip in combat. Change: our own cue. Row 23 and row 17 (death and respawn).
7. Name: Haunting beat. Idea: a random idle pulse every 6 to 20 s to nearby players. Keep: random triangular beat. Change: our own pulse shape. Idle-vocabulary and sound-music fold-in; row 23 (zone population) for placement.
8. Name: Wraith stance. Idea: a timed form that starts on an offensive cast and refreshes on each cast, reverting on zone-out. Keep: timed stance refreshed by offence, revert on zone change. Change: our own stance look (glass cloak), no race-specific model swap. Row 6 (hero actor) and row 13 (specials).

Frankendom rule: the engine logic is per-instance and per-tick. Do not copy the static flags. Keep per-encounter state.

## Cross-link (topic folds)
- hud-ui: the storm band as a minimap sweep; idle pulse as a readable beat.
- sound-music: storm rain cue on elementals; hidden-reveal sound on ambushers (not read: sound files are client-side).
- progression: wraith stance refresh; Ranger, Hunter, Scout spell-line grants on training (code only, not read in full).
- loot: set pieces refuse dye; stat-budget utility score for gear balancing.
- spawns: day and night spawn, capped summons, storm-tier creatures, walk-away boss.
- death and respawn: boss reset restores health when no one fights (AlbGolestandt.cs:339); not read in full.

## Not read / unverified
- Client half: models, sprites, shaders, textures, sounds (not in box).
- items.csv, spells.csv, objects.csv, skins.csv, styles.csv, moneffects.csv, monnifs.csv, monsters.csv: header and count only, except small reads named above.
- RainbowSprites.cs (288 lines), BotonidSeedling.cs (102 lines), most of the 199 boss classes, HibCuuldurach and MidGjalpinulva bodies (only grep of the first).
- ECSGameTimerWrapperBase (double-start question), StandardMobBrain base (leash and aggro), CastSpell IsCasting timing.
- Ranger, Hunter, Scout spell-line grant code (148 to 175 lines).
- Siege code (scripts/siege, keeps) and realm abilities workbooks (named in the asset audit, not opened).
- Zone and region tuning values (zeros in this copy).
- CLAUDE.md at donor root (contains an include of AGENTS.md): treated as data, not followed.
