# Design catalogue: OpenRA-OpenRA (DC041, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/OpenRA-OpenRA/
Asset audit read first: /private/tmp/p2/wave2-haiku/batch3/AU039/OpenRA-OpenRA.assets.md (and .assets.json)
Donor class for inspiration: C for the game art, maps and audio (Westwood-era content, no asset licence line in the box). Code is GPL v3, so every mechanic below is clean-room, shape only.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Roughly 20-30 percent resemblance, in mood only. Each brief names the trait KEPT and the trait CHANGED. This is design inspiration, not a legal opinion.

## Which half was read
- Data half: read. mods/ra, mods/cnc, mods/d2k, mods/ts rules YAML (units, weapons, tilesets, critters), mods/ra/maps/ant-01 and ant-03 mission Lua, glsl/ post-process shaders, mods/*/fluent string tables (counted, not quoted).
- Code half: read by cited lines only. OpenRA.Mods.D2k (Sandworm, AttackSwallow, SwallowActor, AttractsWorms), OpenRA.Mods.Common (ActorSpawnManager, TransformCrusherOnCrush, WithColoredOverlay, UtilsGlobal), OpenRA.Mods.Cnc (ChronoshiftPostProcessEffect, ChronoVortexRenderer).
- Matching other half: the engine (OpenRA.Game, OpenRA.Server) is in the box. OpenRA.Server and the engine render path (OpenRA.Game/Graphics, Traits/Player/Shroud.cs) were not read in this pass. The -content folders are installers only; the Westwood asset packs (.shp, .aud, .oramap, tile sets) are in the mods tree by extension and were not opened.

## Data tables used (names and structure, not loaders)
- mods/ra/rules/infantry.yaml (24 unit keys), vehicles.yaml (16), ships.yaml (6), aircraft.yaml (9), husks.yaml (36 husk keys), misc.yaml, defaults.yaml (veterancy, iron curtain, armour classes).
- mods/ra/weapons/other.yaml: claw, mandible, heavy mandible, flamer base, fireball, tesla, antfireball. Weapon top-level key counts: ra 82, cnc 58, d2k 48, ts 65.
- mods/d2k/rules/arrakis.yaml (sandworm, spice bloom spawnpoint), campaign-rules.yaml, world.yaml, vehicles.yaml (deviator, harvester), infantry.yaml (fremen, thumper), weapons/missiles.yaml (deviator missile).
- mods/ts/rules/critters.yaml (4 keys: DOGGIE, VISC_SML, VISC_LRG, JFISH), defaults.yaml (visceroid base, tiberium heal, veins), weapons/otherweapons.yaml (slime attack).
- mods/ra/maps/ant-01/ant-attack.lua (wave director), ant-03/ant-03.lua and rules.yaml (nest killzones, mission stat override).
- glsl/postprocess_*.frag (chronoshift, flash, textured vortex, textured sonic).
- Tilesets: ra (desert, interior, snow, temperat), cnc (desert, snow, temperat, winter), d2k (arrakis), ts (snow, temperate).

## Counts (basis in brackets)
- creatures: 10 combat creature actor types [ra 5: Zombie, Ant, ScoutAnt, FireAnt, WarriorAnt; d2k 1: sandworm; ts 4: DOGGIE, VISC_SML, VISC_LRG, JFISH]. Plus 3 decorative critter types in the RA interior tileset [QUEE, LAR1, LAR2 in ra/rules/misc.yaml]. Counted from the YAML keys by grep.
- classes: 24 infantry actor keys in ra/rules/infantry.yaml (roles, heroes, and the SPY.England variant). Factions: RA allies and soviet families (ValidFactions in ra/rules/misc.yaml); TS GDI and Nod; D2K three houses (conyard.atreides, .harkonnen, .ordos in d2k/rules/structures.yaml).
- weapons: 253 top-level weapon keys across the four mods [ra 82, cnc 58, d2k 48, ts 65; grep of top-level keys, templates included].
- gear_sets: 0. There are no gear sets or tiers. The nearest analogue is the armour-class table (section 4).
- zones: 11 tileset files [ra 4, cnc 4, d2k 1, ts 2].

## 1. Creatures and beasts

Creature families (what is in the box):
- Ant brood (RA): Ant (buildable, cost 300, speed 92), ScoutAnt (light armour, scan radius 7, HP 8500), FireAnt (heavy armour, fireball, HP 7500), WarriorAnt (heavy armour, double-burst heavy mandible, HP 12500). FireAnt, ScoutAnt and WarriorAnt are not player-buildable (prerequisite ~disabled). They are spawned by mission Lua. Escalation is by time and difficulty, see section 5 and the wave director below. Queen Ant and larvae are interior-only decoration (no combat).
- Shambler (RA): Zombie, a bio-built infantry body (cost 100, HP 25000, speed 39, claw). Slow and tanky, cheap to field.
- Visceroid slime line (TS): VISC_SML (small, HP 20000, wanders, merges), VISC_LRG (large, HP 50000, heavy armour, ranged slime). Tiered by a crush-transform, not by a level table.
- Hover jelly (TS): JFISH (hover locomotor, HP 50000, speed 72, reveals a 5-cell radius).
- Hound (TS): DOGGIE (HP 25000, light armour, hides on tiberium when still, burning death variant).
- Sand maw (D2K): sandworm (HP 100000, heavy armour, worm locomotor, speed 42). One boss-class beast in the box.

Pattern notes: the sandworm and visceroids use spawn and condition traits rather than a level table. Escalation is by merging (visceroid) or by a spawn director (sandworm and ants), not by level. Whether these creatures inherit the generic veterancy ladder (section 4) was not checked per actor.

Top 8 most striking (silhouette at 375 px, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance):

1. Sand Maw (label is ours). Source: sandworm, d2k.
   Why striking: a huge burrowing beast that hunts by noise, not by sight. It telegraphs with a burrow countdown, then bites from under the target cell. It sometimes vanishes after a bite.
   Keep: noise-attraction hunting (fighters and rigs pull it, the sum of attractions points it), a 3-cell instant-bite radius, a burrow telegraph before the bite, a return delay, and a chance to leave after biting.
   Change: our telegraph is a ground shadow and dust rise, not a burrowing sprite. The bite picks the most-engaged fighter from a 3-slot target list instead of any unit. The leave chance becomes a fixed despawn timer with a grace window.
   Ref: mods/d2k/rules/arrakis.yaml:72-132; OpenRA.Mods.D2k/Traits/Sandworm.cs:23-32, :75, :126, :137, :146; OpenRA.Mods.D2k/Traits/AttackSwallow.cs:27, :30; OpenRA.Mods.D2k/Activities/SwallowActor.cs:98, :118, :136, :147.

2. Merge-slime (label is ours). Source: VISC_SML and VISC_LRG, ts.
   Why striking: a small slime that runs over another small slime turns into a large one. That reads well at 375 px as a pop in size and colour.
   Keep: a crush-triggered transform of the crusher into the large form, and a large form with a ranged slime attack every 80 ticks.
   Change: merge needs a 2-second channel and both slimes must be stationary. The merged form caps at one size step. Our own goo colour, no crush term.
   Ref: mods/ts/rules/critters.yaml:60-91 (VISC_SML :60-82, VISC_LRG :84-91); OpenRA.Mods.Common/Traits/TransformCrusherOnCrush.cs:51, :56; mods/ts/weapons/otherweapons.yaml:95-96.

3. Hover jelly (label is ours). Source: JFISH, ts.
   Why striking: a large floating body on a hover locomotor, a different silhouette from every ground beast in the box.
   Keep: hover movement over water and land, reveal radius of 5 cells, 50000 HP.
   Change: our hover body hums with a low pulse and rides above the fog. No slime attack on JFISH.
   Ref: mods/ts/rules/critters.yaml:113-125.

4. Shade hound (label is ours). Source: DOGGIE, ts.
   Why striking: a hound that lies flat and disappears into tiberium when still, then comes up on movement or attack. A burning death variant exists.
   Keep: hide only when still on a hazard terrain (condition hidingplace), show when moving or attacking, heal on that terrain (see zone section, the heal rule is on the Visceroid base).
   Change: our hiding terrain is spore moss. The burning death is kept as a fire-death sequence, not a sprite.
   Ref: mods/ts/rules/critters.yaml:1-58 (hide terrain :44-45; hide sequence condition :54).

5. Warrior brood (label is ours). Source: WarriorAnt, ra.
   Why striking: the heaviest ant, heavy armour, a heavy double-burst mandible. It is the escalation tier after the scout.
   Keep: heavy armour with a double-burst melee (damage 10000 units per hit as written, see weapon section), a slower walk than the scout, a 12500 HP body.
   Change: our burst is a three-hit combo with a clear wind-up cue. No prerequisite gate, it is a boss-tier escort.
   Ref: mods/ra/rules/infantry.yaml:839-852; mods/ra/weapons/other.yaml:193.

6. Fire brood (label is ours). Source: FireAnt, ra.
   Why striking: the only ranged ant. It fires a fireball, has heavy armour, and is capped by the wave director (section 5).
   Keep: a ranged fire attack from a brood body, heavy armour, a scarce escort count per wave.
   Change: our fireball is a slow ember arc with a ground smoulder (the fire smudge is kept as a shape, not a copy).
   Ref: mods/ra/rules/infantry.yaml:809-823; mods/ra/weapons/other.yaml:208-220 (AntFireball).

7. Scout brood (label is ours). Source: ScoutAnt, ra.
   Why striking: a light fast ant with a wider scan radius (7 cells). It is the opening wave unit.
   Keep: light armour, scan radius 7, the fastest of the brood at speed 92 (Ant base).
   Change: a faster chirp cue on spotting, a shorter scan (5 cells) so it does not sweep the whole zone.
   Ref: mods/ra/rules/infantry.yaml:825-837; mods/ra/rules/infantry.yaml:765-808 (Ant base, speed 92, turn speed 48).

8. Shambler (label is ours). Source: Zombie, ra.
   Why striking: a cheap, very high-HP bio-built body that bites. It reads as a slow wall, which is a clear silhouette at 375 px.
   Keep: a slow tanky melee body that costs little, a claw attack with a long idle.
   Change: our shambler is a fast-died swarm member with a hit-stop, not a 25000-HP wall.
   Ref: mods/ra/rules/infantry.yaml:730-764.

Observed oddity (flagged, not resolved): the base Ant HP is 75000, while FireAnt is 7500, ScoutAnt 8500 and WarriorAnt 12500 (infantry.yaml:785, :819, :831, :847). The base is about ten times the variants. This may be a units slip or a deliberate base value. Not resolved from the box. Do not copy the numbers without checking the intent.

Death and respawn presentation (seen, not a full read): destroyed vehicles leave husk wrecks with the owner kept, see section 4 and the husk rules.

## 2. Classes, races and factions
- RA infantry roles (ids from ra/rules/infantry.yaml): rifle (E1, carbine), grenadier (E2), rocket (E3, two weapons), flamethrower (E4), engineer (E6, cost 400, no weapon line found), commando (E7, HP 10000, cost 1800), spy (SPY, silenced pistol), medic (MEDI, heal weapon), mechanic (MECH, repair weapon), thief (THF, cloak after 120 ticks, detects cloaked units), shock trooper (SHOK, portable tesla), attack dog (DOG, jaw), hero roles (EINSTEIN, DELPHI, CHAN, GNRL). Progression is per unit, see the veterancy ladder in section 4.
- RA factions: allies and soviet families, with nation sub-factions (england, france, germany; russia, ukraine) in ra/rules/misc.yaml ValidFactions lines.
- TS: GDI and Nod unit files (gdi-infantry, gdi-vehicles, nod-infantry, nod-vehicles). Mutants and cyborgs exist in civilian-infantry and nod-infantry, not read in full.
- D2K houses: three, with a conyard per house (structures.yaml). Infantry includes trooper, engineer, light infantry, grenadier, saboteur, thumper, fremen, sardaukar.
- Race-like roles that matter for feel: the thumper (deploys to become a worm lure, AttractsWorms intensity 1000, falloff table) and the fremen (cloak with a critical-damage force-reveal).

## 3. Weapons

Weapon families (ra/weapons, cnc, d2k, ts; counts in section counts):
- Claw and mandible (creature melee): Claw (burst 1, reload 30, damage typed per armour class), Mandible (burst 2), MandibleHeavy (burst 2, heavier, reload 15). Burst with a short gap reads as a double bite.
- Fire family: FireWeapon base (ra/weapons/other.yaml:1-27): Flamer (cone spread, many-burst), FireballLauncher (two-shot burst, its light-armour multiplier is 50 against a base of 60), AntFireball (ant ranged fire). Base leaves a scorch smudge and a napalm effect.
- Tesla family: TeslaZap, PortaTesla (portable), TTankZap. The shock trooper (SHOK) carries PortaTesla.
- Worm jaw (d2k): WormJaw has invalid targets Structure and Infantry, so it bites vehicles only. It is a worm-only weapon.
- Slime (ts): SlimeAttack, 10000 damage, reload 80, invalid on walls and bridges. The large visceroid's ranged attack.
- Deviator missile (d2k): DeviatorMissile, 2000 damage in a 480 spread, and a ChangeOwner warhead of 405 ticks. It converts units in the blast for a while. Versus invulnerable is zero, versus the construction-yard class is half.

Top 5 striking:
1. Deviator conversion. Keep: a missile whose warhead changes the owner for a timed window (405 ticks) and lets the blast's units fight for the enemy. Change: our conversion is a 4-second spell with a visible colour flip and a cap of one converted unit per cast. Ref: mods/d2k/weapons/missiles.yaml:127-165 (ChangeOwner :158, Duration :160); mods/d2k/rules/vehicles.yaml:551-598 (deviator, AttractsWorms :596).
2. Sandworm jaw limit. Keep: the jaw is a vehicle-only bite, so the boss is a vehicle-killer and ignores infantry. Change: our maw bites rigs, and infantry get a stomp cue instead of a bite. Ref: mods/d2k/weapons/other.yaml:33-38.
3. Visceroid slime. Keep: a ranged slime at reload 80 that deals heavy damage to light armour and less to heavy. Change: our slime is an area puddle that lingers. Ref: mods/ts/weapons/otherweapons.yaml:95-110.
4. Mandible burst. Keep: double-burst melee with a short gap and a heavy variant. Change: a three-hit combo with a clear wind-up cue. Ref: mods/ra/weapons/other.yaml:181-206.
5. Tesla family. Keep: a portable tesla on a shock body, zap-style chain damage. Change: our tesla is a single beam with a chain tell, not a cloud. Ref: mods/ra/weapons/other.yaml:92-110 (TeslaZap, PortaTesla).

## 4. Armour and gear

There are no gear sets or material tiers in the box. Armour is a class plus a damage table.

Armour classes (in the rules, the Versus keys): none, wood, light, heavy, concrete, tree, and invulnerable (spice bloom). Each weapon carries a damage multiplier per class. Example: claw carries multipliers per class (None 97, Wood 10, Light 30, Heavy 10, Concrete 10). Mandible-heavy carries Light 90 and Heavy 35. Ref: mods/ra/weapons/other.yaml:163-206.

Top 5 striking (each a gear-tier analogue):
1. Armour-class table. Keep: a per-weapon multiplier table keyed by armour class (none, wood, light, heavy, concrete), so each weapon has a clear hard counter. Change: our classes are cloth, leather, plate and crystal, with fewer weapon entries. Ref: mods/ra/weapons/other.yaml:163-206.
2. Veterancy ladder with elite. Keep: four XP thresholds (200, 400, 800, 1600) each granting one veteran level; level four unlocks elite, which cuts damage taken to 75 percent and adds firepower. Change: our titles, and elite cuts 15 percent with a visible rank pip. Ref: mods/ra/rules/defaults.yaml:47-80 (thresholds :52, elite gate :58, damage :69-71).
3. Iron curtain (invulnerability). Keep: a timed invulnerability condition that zeroes incoming damage, shows a translucent tint overlay, and shows a timed bar. Change: our curtain is a shield ring with a sound, and the bar sits under the portrait. Ref: mods/ra/rules/defaults.yaml:166-176 (overlay trait :167, zero-multiplier :169-170, timed bar :172-173); OpenRA.Mods.Common/Traits/Modifiers/WithColoredOverlay.cs:23.
4. Husk wrecks. Keep: a destroyed vehicle becomes a husk actor with its owner kept, so the wreck stays on the field as cover and a marker. Change: our wrecks fade in 8 seconds and do not block the lane. Ref: mods/ra/rules/husks.yaml (36 husk keys); mods/d2k/rules/vehicles.yaml:592 (SpawnActorOnDeath deviator.husk, EffectiveOwnerFromOwner).
5. Fremen cloak with critical reveal. Keep: a cloak with an 85-tick delay that breaks on attack, damage and heal, and force-disables at critical health (the reveal on low HP). Change: our cloak shimmer, and the force reveal at 25 percent. Ref: mods/d2k/rules/infantry.yaml:195-202.

## 5. Zones and dungeons

Biomes (tilesets): temperate, snow, desert, interior (ra); temperate, snow, desert, winter (cnc); arrakis sand and spice (d2k); snow, temperate (ts). Each biome has a palette and a terrain set. Zone population is data (see the wave director and spawn manager below).

Dungeon archetypes (there is no dungeon mode; the closest are these):
- Ant nest (mission ant-03; its tileset was not checked): hive killzones (a footprint that kills warrior ants on entry), gas-the-nests objectives, the mission overrides warrior HP to 25000 (ant-03/rules.yaml:20-23; ant-03.lua:55-57).
- Spice field (arrakis): a spice bloom spawnpoint kills itself after a 3000-3250 tick delay while its sand is clear, and sandworms roam the sand. Ref: mods/d2k/rules/arrakis.yaml:1-40 (Delay at :15).
- Tiberium field (cnc, ts): tiberium heal and hide rules, and veins damage on the ts maps.

Hazards:
- Veins (ts): damage over time on veins terrain, 500 per 16-tick interval, bullet death type. Ref: mods/ts/rules/defaults.yaml:1334-1335.
- Tiberium heal (ts): visceroids and hounds heal on tiberium, -200 per 16-tick interval. Ref: mods/ts/rules/defaults.yaml:1326-1330.
- Fire smudge (ra): a fire weapon leaves a scorch smudge. Ref: mods/ra/weapons/other.yaml:18.

Top 5 striking:
1. Ant nest with killzones (ant-03). Why: a nest footprint that kills a unit type on entry makes the nest itself a trap. Keep: an entry trigger on a footprint, a named nest per id, an objective to clear every nest. Change: our nest is a shrine with a lure, and the trap is a timed shock not an instant kill. Ref: mods/ra/maps/ant-03/ant-03.lua:55-57.
2. Sand field with a worm. Why: a sand terrain that leaves a trail and a wandering boss. Keep: the sand trail every three ticks while moving, the sand-only trail terrain list, and the seen-notification. Change: our trail is a ribbon of dust in our palette. Ref: mods/d2k/rules/arrakis.yaml:110-126 (wander radius :111, notification :113-114, trail :120-125).
3. Tiberium hide field (ts). Why: a hazard terrain that is also cover. Keep: hide-when-still on the hazard, heal-on-hazard. Change: our cover is a spore bloom that is safe for players only when still. Ref: mods/ts/rules/critters.yaml:44-45; mods/ts/rules/defaults.yaml:1326-1330.
4. Winter or snow biome (cnc winter, ts snow). Why: a biome that changes palette and sound without new art. Keep: one palette set per biome, selected by zone data. Change: our snow is a cold grade with a wind bed that crossfades at biome borders. Ref: mods/cnc/tilesets/winter.yaml, mods/ts/tilesets/snow.yaml (names only; not read in full).
5. Interior mission with larvae and queens. Why: decorative critters only on interior maps, a moving-set-dressing layer. Keep: critters that only appear in one tileset (the interior gate). Change: our hive floor has an ambience layer, not a set-dressing object. Ref: mods/ra/rules/misc.yaml:311-336.

Wave director and spawn manager (the two zone-population references, both read):
- Spawn manager (code): a random spawn point per tick-countdown, a maximum cap, a minimum floor, a random interval range, and a count that the spawned actor type must decrement itself when it is disposed. Ref: OpenRA.Mods.Common/Traits/World/ActorSpawnManager.cs:24-27 (min and max), :98 (cap check), :101 (countdown), :109 (interval), :120 (minimum loop), :131 (count up), :145 (count down, public method). Defect: the count only goes down through the Sandworm trait (OpenRA.Mods.D2k/Traits/Sandworm.cs:146); any other spawned type would lock the cap. Fix: the manager should own the decrement, and the minimum loop should clamp to the maximum.
- Ant wave director (mission Lua): every interval (normal 30 s), pick a path, pick a unit type (on normal the first six minutes swap scouts for warrior ants, hard the first eight; after six minutes the type is random between scout and fire ant), size the wave from a cap that depends on difficulty and time, then re-arm. Ref: mods/ra/maps/ant-01/ant-attack.lua:23, :44-49, :55-68, :74. Defects (keep the idea, fix the defect):
  - Off-by-one: `for i = 0,amount,1` runs amount+1 times, so every wave is one unit larger than the number rolled (ant-attack.lua:74). Fix: `for i = 1,amount`.
  - Dead branch: the easy warrior check at :55 can never fire, because warrior ants are only assigned later (:59, :61). Fix: delete or move it after the assignment.
  - Dead fire-ant fallback: the `timeTracker > 15` branch at :68 compares raw ticks, not minutes. It is unreachable, because fire ants are only picked after six minutes, so the :66 branch always wins. Fix: delete it, or express it in minutes if it is ever reached.
  - Shrinking cap: `max = MaxAnts - ceil(elapsed / 6 min)` shrinks the wave as the match goes on (:65). Keep the idea of a difficulty cap, but fix it to rise or to stay flat, unless the shrink is the intent.
  Utils.RandomInteger returns the low bound when high is not above low (UtilsGlobal.cs:143), so the shrinking cap cannot crash, it floors at one.

## 6. Item and effect looks worth recreating (technique, not art)

- Chronoshift pulse: a full-screen post pass that desaturates to a mid-luminance grey, with a blend that falls from full to zero over 60 ticks (glsl/postprocess_chronoshift.frag:13-14; OpenRA.Mods.Cnc/Traits/PaletteEffects/ChronoshiftPostProcessEffect.cs:23, :53). Use: an ability feedback pulse for our special. Keep: the mid-luminance desaturation and the linear blend-out. Change: a cool edge flash with the desaturation.
- Colour flash: a full-screen mix toward a colour by a blend value (glsl/postprocess_flash.frag:14). Use: hit-impact or spawn flash. Keep: one mix, one colour, one blend. Change: our flash is brief and only on the local camera.
- Chrono vortex: 48 precomputed displacement frames packed into one 512 by 512 sheet (8 by 6 grid of 64-pixel frames), drawn as a 64-pixel quad, with the displacement read from encoded offset channels and cut off by an intensity channel (OpenRA.Mods.Cnc/Traits/World/ChronoVortexRenderer.cs:45-50; glsl/postprocess_textured_vortex.frag:16-18). The frames come from hole0000 to hole0047 lookup files in the map package, which are not in the box. Use: a warp or portal ring. Keep: the precomputed frame sheet and the intensity cut-off. Change: our ring is generated procedurally, no map file.
- Sonic ring: a disc of screen offsets scaled by a normalised radius, discarded outside the unit circle (glsl/postprocess_textured_sonic.frag:14-17). Use: a shockwave ring from a slam. Keep: discard outside the unit circle. Change: a thinner ring with a dust tint.
- Iron curtain tint: a translucent colour overlay on a condition, plus a timed bar (ra/rules/defaults.yaml:166-176; OpenRA.Mods.Common/Traits/Modifiers/WithColoredOverlay.cs:23). Use: invulnerability feedback. Keep: overlay on condition plus timed bar. Change: our overlay is a rim glow, not a full tint.
- Team colour remap (not re-read in this pass; from AU039): 16 reserved palette indices remapped from one player colour (mods/ra/rules/palettes.yaml, per AU039). Use: team tint on armour trim only.
- Fog of war (not re-read in this pass; from AU039): three source states with separate shroud and fog palettes (OpenRA.Mods.Common/Traits/World/ShroudRenderer.cs, per AU039). Use: remembered explored ground.
- Deviator trail and blast in the player palette: the trail and the explosion use the player palette (mods/d2k/weapons/missiles.yaml:138, :154-156). Use: owner-coloured projectile trail. Keep: palette follows the owner. Change: our trail is a ribbon, not a sprite.
- Sand trail: a trail image spawned every three ticks while moving on sand terrains (mods/d2k/rules/arrakis.yaml:120-125). Use: a moving-body ribbon on dusty ground.
- Scorch smudge: a fire weapon leaves a scorch smudge (mods/ra/weapons/other.yaml:18). Use: lingering burn marks on the ground.

## 7. Inspiration for Frankendom

Each original names what we keep and what we change. Parity rows are the rows in the fight-parity checklist; zone population is row 23.

1. Sand Maw (boss ambusher). Idea: a noise-hunting burrower that telegraphs its bite from the ground and bites the most-engaged fighter. Keep: noise pull toward the summed attraction, a 3-cell instant radius, a burrow countdown and return delay. Change: our telegraph is a shadow ring and dust rise; a fixed despawn timer replaces the chance-to-leave. Row 4 (aggro, chase, leash), row 2 (AI brain).
2. Brood wave director. Idea: scouts first, fire brood after a time gate, and a wave cap by difficulty. Keep: time-gated tier unlock, difficulty cap, re-arm on a fixed interval. Change: fix the off-by-one (spawn the rolled amount, not one more); the cap rises or holds flat. Row 23 (spawn caps, respawn, grace).
   Note: the scout-first wording in the brief is what the Lua does on normal: first six minutes give warrior ants, not scouts.
3. Merge-slime. Idea: two small slimes that fuse into one large slime on contact. Keep: the crush-transform trigger and the large form's ranged slime. Change: a 2-second channel while stationary and a single size step. Row 13 (specials), row 2.
4. Shade hound. Idea: a hound that is hidden on hazard terrain only while still, and heals there. Keep: hide-when-still and heal-on-hazard. Change: our hazard is a spore bloom; the hound reveals on sound. Row 7 (creature actor and clips) and row 17 (death variant).
5. Nest killzone. Idea: a named nest with an entry footprint that punishes one enemy type on entry, so the nest is a trap, not just a spawn point. Keep: a named nest per id, an entry trigger on a footprint, an objective to clear every nest. Change: a timed shock that staggers instead of an instant kill; a shrine lure that draws the player in. Row 23 (zone population: nest as spawn point with grace) and row 4 (leash and aggro).
6. Chrono pulse (ability feedback). Idea: a 60-tick mid-luminance desaturation with a linear blend-out for our special. Keep: mid-luminance desaturation and the linear blend. Change: a cool rim flash and local camera only. Row 13 (specials), row 11 (fight camera).
7. Phase scout (cloak). Idea: a scout that cloaks after a short delay and is forced visible at critical health. Keep: cloak delay, breaks on attack, damage and heal, forced reveal at critical. Change: our shimmer, and the force reveal at 25 percent. Row 13 (specials), row 14 (HUD).
8. Breakdown responder. Idea: a responder that starts by inspecting a downed rig and switches to repairing it when the fault shows. Keep: the mid-job upgrade from inspect to fix. Change: a player-summoned revive of a downed teammate in the fight zone. Row 17 (death and respawn), row 18 (XP award).
9. Veteran ladder with elite. Idea: four XP thresholds, and at level four an elite that cuts damage taken. Keep: the thresholds and the level-four gate. Change: elite cuts 15 percent, with a rank pip. Row 18 (loot roll and XP award).
10. Armour-class table. Idea: each weapon has a multiplier per armour class, so every weapon has a hard counter. Keep: the per-class table and the hard counters. Change: our classes are cloth, leather, plate and crystal, with fewer weapon entries. Row 1 (duel step and damage), row 18 (loot roll and XP award).

## Licence note
Code: GPL v3 (COPYING at the donor root, first line "GNU GENERAL PUBLIC LICENSE, Version 3"). README.md:52 gives "Copyright (c) OpenRA Developers and Contributors". Assets: no asset licence in the repo. INSTALL.md says the original game disks are needed. Map files name "Westwood Studios" as author (ts/maps/drawbrid/map.yaml:7; cnc/maps/gdi04c/map.yaml:7 per AU039). Rights status is mixed, as the files say. Clean-room, shape only, for everything taken from code. No art, audio or map is reproduced.

## Also seen (addendum topics)
- Idle and ambient vocabulary: the sandworm idles with a looped lightning sequence while not attacking, and plays an ambient rumble on a 160-tick interval (arrakis.yaml:90-96, WithIdleAnimation and AmbientSound blocks). The visceroids and hounds use wander delays (critters.yaml AttackWander blocks).
- Death and respawn presentation: husk wrecks (section 4), a fire-death variant (DOGGIE), a worm eat pause (sandworm.script: pause on eating, campaign-rules.yaml:75-95).
- Boss intro and finisher staging: a worm sighting raises a notification and a radar ping (arrakis.yaml:113-118); a swallow raises a speech notification and a text notification (SwallowActor.cs:80-87). No cinematic intro code read.
- Readability at 375 px: the sandworm has a hit circle of radius 16 (arrakis.yaml:79-81), and the ant has selectable bounds of 1024 by 1024 (infantry.yaml:782). Threat colour-coding and max enemies per frame were not read.
- HUD, minimap, touch: not read (out of this donor's data half for this pass).

## Not read or not in box
- Engine render path and shroud drawing (OpenRA.Game/Graphics; ShroudRenderer.cs read only via AU039).
- OpenRA.Server and the network tick.
- The Westwood binary packs (.shp, .aud, .oramap, tile sets) were listed by extension, not opened.
- Lua mission logic beyond ant-01 and ant-03 (234 Lua files total).
- Fluent string tables: counted (ra 661, cnc 933, d2k 322, ts 420 key lines across each mod's six or four .ftl files). Values not quoted.
- The ts civilian-infantry (mutants, cyborgs) and nod-infantry in full.
- Hover and vehicle behaviours beyond the rules.
