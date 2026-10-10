# Anuken-Mindustry: design catalogue (DC006)

Donor: /mnt/frankendom-donors/Anuken-Mindustry (VPS, read-only). Asset audit read first: AU004/Anuken-Mindustry.assets.md (no PNG, OGG, MSAV or map was opened there, and none here).

Dom's rule for every brief below: recreate as a clearly distinct original, never a copy. Inspiration only, about 20-30 percent resemblance in mood. Names and labels here are our own. Not legal advice.

## Halves read
- READ: core half (shared game logic and content): core/src/mindustry/content/*.java, core/src/mindustry/game/Team.java, core/assets/bundles/bundle.properties (names), core/assets/shaders (two files opened: shield.frag, unitarmor.frag).
- Matching other half in the box: server/ (dedicated server module). NOT read; only its existence is known.
- Launchers android/, desktop/, ios/: NOT read.
- Data format note: unit, block, item and status content is Java source (UnitTypes.java and friends), not XML or JSON. Display names are in bundle.properties. Stat numbers are not repeated here.

## Counts (what the files say)
- Creatures: 60 unit name keys in bundle.properties (62 UnitType declarations in UnitTypes.java, which include a placeholder "block", a "dummy" test unit and inline missile types).
- Classes: 0 (no player classes). Unit roles and team factions are listed below instead.
- Weapons: 28 weapon-class turrets (18 Serpulo, 10 Erekir) in Blocks.java. Repair blocks and build-tower are not counted.
- Gear sets: 0. No armour items exist. Unit armour is a shader effect only (unitarmor.frag).
- Zones: 46 sector presets in SectorPresets.java (29 Serpulo, 17 Erekir), 4 planet entries in Planets.java.

## 1. Creatures / beasts (families and tiers)
Source: core/src/mindustry/content/UnitTypes.java (declarations; names in core/assets/bundles/bundle.properties).
- Serpulo ground mech line, 5 tiers: dagger (l.100), mace (l.121), fortress (l.153), scepter (l.190), reign (l.291). Escalation is mostly size; scepter adds a shield-regen field (l.206) and reign declares no ability.
- Serpulo boost-mech line, 5 tiers: nova (l.357), pulsar (l.397), quasar (l.452), vela (l.498), corvus (l.585). Boosting (canBoost) appears from nova up to vela (l.358, l.398, l.457, l.518). Force field added at quasar (l.473).
- Serpulo legged crawler line, 5 tiers: crawler (l.661), atrax (l.701), spiroct (l.744), arkyid (l.810), toxopid (l.914). Leg count rises: atrax 4 (l.714), spiroct 6 (l.750), arkyid 6 (l.819), toxopid 8 (l.926). Hovering flag set from atrax on.
- Serpulo air line, 5 tiers: flare (l.1047), horizon (l.1091), zenith (l.1140), antumbra (l.1187), eclipse (l.1263). Low-altitude flag on several tiers.
- Serpulo support and builder line, 5 tiers: mono (l.1345), poly (l.1364), mega (l.1422), quad (l.1473), oct (l.1547). Mining and build tiers rise. Repair and force-field abilities at poly (l.1383) and oct (l.1569, l.1571).
- Serpulo naval gunship line, 5 tiers: risso (l.1577), minke (l.1638), bryde (l.1700), sei (l.1798), omura (l.1892). Shield regen at bryde (l.1719).
- Serpulo naval support line, 5 tiers: retusa (l.1943), oxynoe (l.2051), cyerce (l.2132), aegires (l.2273), navanax (l.2325). Overclock field at oxynoe (l.2070), energy field at aegires (l.2300), suppression field at navanax (l.2481).
- Core units, 3: alpha (l.2494), beta (l.2545), gamma (l.2596).
- Erekir tank line, 5 tiers: stell (l.2654), locus (l.2700), precept (l.2783), vanquish (l.2857), conquer (l.2969). Crush damage on vanquish (l.2864) and conquer (l.2975).
- Erekir legged and hover line, 5 tiers: merui (l.3153), cleroi (l.3239), anthicus (l.3349), tecta (l.3507), collaris (l.3615). Shield arc at tecta (l.3526). Missile spawn unit at anthicus (l.3465).
- Erekir fast-flyer line, 5 tiers: elude (l.3789), avert (l.3858), obviate (l.3923), quell (l.4044), disrupt (l.4149). Movement trail at elude (l.3812). Suppression fields at quell (l.4068) and disrupt (l.4173, l.4183). Missile spawns at quell (l.4115) and disrupt (l.4236).
- Erekir neoplasm spawners: renale (l.4309), latum (l.4329). Latum spawns renale on death (l.4346).
- Erekir support line, 3: evoke (l.4354), incite (l.4420), emanate (l.4499).
- Utility: manifold (l.4582), assembly-drone (l.4609). Placeholders: block (l.4572), dummy (l.4635).

Boss pattern: no dedicated boss class. The "boss" status effect (core/src/mindustry/content/StatusEffects.java l.178-184) is permanent, tinted to the crux team colour, and multiplies health and damage. Any unit can take it.

## Top 8 striking creatures
Criteria used: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect (sound not heard here; only the declared effect is noted), could be ours at 20-30 percent resemblance.

1. Label: Legged crawler walker (own label: hex-leg burrower). Why: leg count is the escalation signal, so the silhouette grows tier by tier. Ref: core/src/mindustry/content/UnitTypes.java l.701-926. Keep: legged gait that rises by leg count, ground-only walking. Change: leg rig, body shape, and drop the acid and creep identity.
2. Label: Crush-tread bulwark (own). Why: tank line that damages what it runs over, so the crush is the signature. Ref: UnitTypes.java l.2857-2975 (crushDamage l.2864, l.2975). Keep: crush on contact. Change: tread design and a bulwark role instead of a rolling wall.
3. Label: Bubble carrier (own). Why: a slow hovering support whose shield bubble makes others hide behind it. Ref: UnitTypes.java l.1547-1571 (force field l.1569, repair field l.1571). Keep: bubble aura plus repair pulse. Change: dome shape and the bubble shader (ours, not the hex field).
4. Label: Suppression leviathan (own). Why: a naval capital whose field suppresses nearby enemies, very readable from far away. Ref: UnitTypes.java l.2325-2494 (suppression field l.2481). Keep: field that disables enemies in an area. Change: the field rule, the colour and the silhouette.
5. Label: Heavy titan mech (own). Why: the largest Serpulo ground mech, readable at a distance. Ref: UnitTypes.java l.291 (reign). Keep: large walking mech as top tier. Change: give it our own signature ability, since none is declared on reign.
6. Label: Boost-hop mech line (own). Why: a walker that hops over obstacles and gains a force field as it grows. Ref: UnitTypes.java l.357-585 (canBoost l.358, l.398, l.457, l.518; force field l.473). Keep: hop over obstacles when blocked. Change: hop trigger, and a different field.
7. Label: Death-brood husk (own). Why: the dying unit releases a small brood, so the death is a second event. Ref: UnitTypes.java l.4329-4346 (SpawnDeathAbility l.4346). Keep: death spawns a timed brood. Change: brood type and count rule.
8. Label: Rebuilder drone (own). Why: a small support that repairs nearby allies and structures in an area. Ref: UnitTypes.java l.1364-1383 (repair field l.1383). Keep: area repair pulse. Change: our own visual and repair rule.

## 2. Classes, roles and factions
- Classes: none. Roles by movement and purpose (from the unit lines above): ground mech, boost mech, legged walker, air, support and builder, naval gunship, naval support, core unit, Erekir tank, Erekir legged and hover, Erekir fast flyer, neoplasm spawner.
- Factions: 7 named teams in core/src/mindustry/game/Team.java (l.33-41): derelict (0), sharded (1), crux (2), malis (3), green (4), blue (5), neoplastic (6). Only the crux team colour is traced to a game effect (boss status, StatusEffects.java l.178-184).
- Progression shape: each line steps up one tier at a time, five tiers deep, with the newest tier adding one ability or a larger body.

## 3. Weapons
Sources: core/src/mindustry/content/Blocks.java (turret declarations and ammo), core/src/mindustry/content/Items.java (ammo items), core/src/mindustry/content/StatusEffects.java.
- Families (by bullet class found in ammo wiring): basic, artillery, flak, shrapnel, missile, rail, and plain bullet. 20 ammo blocks in Blocks.java.
- Serpulo turrets (18): duo (l.3276), scatter (l.3351), scorch (l.3437), hail (l.3481), wave (l.3547), lancer (l.3579), arc (l.3620), parallax (l.3662), swarmer (l.3677), salvo (l.3753), segment (l.3858), tsunami (l.3872), fuse (l.3937), ripple (l.3977), cyclone (l.4110), foreshadow (l.4228), spectre (l.4273), meltdown (l.4341).
- Erekir turrets (10): breach (l.4378), diffuse (l.4490), sublimate (l.4580), titan (l.4666), disperse (l.4873), afflict (l.5057), lustre (l.5180), scathe (l.5245), smite (l.5689), malign (l.5959). Erekir turrets share a reinforced drawer setup.
- Ammo tiers: copper, lead, scrap and graphite and silicon at the bottom; thorium, pyratite, blast compound and surge alloy higher; plastanium, phase fabric, oxide, carbide, tungsten and beryllium further out. Ammo wiring is the only tier signal read here (turret skins not opened).
- Status on hit (from `status = StatusEffects.X` in Blocks.java, UnitTypes.java, Bullets.java): burning, wet, blasted, shocked, melting, tarred, slow, muddy, freezing, corroded. Each status is a visible effect.
- Visual distinctness of turret tiers: not read (drawer code not opened).

Top 5 striking weapons:
1. Foreshadow rail shot with surge alloy ammo (Blocks.java l.4228; RailBulletType at l.4233). Why: a long, single, readable beam. Keep: charged long shot. Change: charge sound and shot shape.
2. Shrapnel spread on thorium and titanium (Blocks.java l.3959, l.3966). Why: a fan of short lines, readable at 375 wide. Keep: fan spread. Change: count and colour.
3. Flak burst on metaglass and surge alloy (Blocks.java l.3379, l.4113, l.4174). Why: airburst cloud that hits groups. Keep: burst on range. Change: burst look.
4. Missile on blast compound and surge alloy (Blocks.java l.3680, l.3709). Why: homing shot with a visible trail. Keep: homing trail. Change: trail effect.
5. Arc and lancer power turrets (Blocks.java l.3579, l.3620). Why: power-only weapons with a clear charge cue. Keep: power-only, no ammo. Change: arc and lightning look.

## 4. Armour and gear
- Gear sets: none. Tiers are by core block and by material, not by armour.
- Core tiers (Blocks.java l.3145-3225): core-shard, core-foundation, core-nucleus, core-bastion, core-citadel, core-acropolis (6 tiers). Names at bundle.properties l.1942 and l.2283.
- Materials (Items.java, 22 items): copper, lead, metaglass, graphite, sand, coal, titanium, thorium, scrap, silicon, plastanium, phase-fabric, surge-alloy, spore-pod, blast-compound, pyratite, beryllium, tungsten, oxide, carbide, fissile-matter, dormant-cyst. The high end (surge-alloy, phase-fabric, plastanium, fissile-matter, dormant-cyst) reads as the mythic tier.
- Look of materials: not read (sprites not opened).
- Unit armour look: core/assets/shaders/unitarmor.frag (progress reveal, banded mask). This is the only "armour" look in the donor.

Top 5 striking gear looks:
1. Banded build-in reveal on a unit (unitarmor.frag l.17-18). Keep: unit appears in bands as it is built. Change: band rate and direction.
2. Forcefield with wobble and edge glow (shield.frag l.19, l.24-28, l.32). Keep: wobble plus edge glow. Change: shape (ours is a dome, not a hex field).
3. Team-tinted boss status (StatusEffects.java l.178-184). Keep: permanent boss tint. Change: colour and the tint method.
4. Core tier ladder of six (Blocks.java l.3145-3225). Keep: a six-step base upgrade. Change: names and footprint.
5. Surge-alloy and plastanium ammo tier (Items.java). Keep: rare top material. Change: the material name and look.

## 5. Zones and dungeons
- Planets (Planets.java): serpulo (l.123), erekir (l.46), sun (l.29), tantros (l.107). Sector presets were read for serpulo and erekir; sun and tantros were not read further.
- Biomes (from preset names in SectorPresets.java; Serpulo l.22-156): frozen forest, craters, tainted woods, biomass facility, ruinous shores, windswept islands, stained mountains, tar fields, fungal pass, overgrowth, nuclear ruins, desolate rift, impact site, coastline, naval fortress, sunken pier, mycelial bastion, infested canyons, atolls, littoral shipyard, planetary terminal and others.
- Erekir presets (SectorPresets.java l.166-236): onset, aegis, lake, intersect, atlas, split, basin, marsh, peaks, ravine, caldera, stronghold, crevice, siege, crossroads, karst, origin.
- Weather and hazard types (Weathers.java): snow, rain, sandstorm, sporestorm, fog, suspended particles.
- Hazard liquids and surfaces (shaders): tar.frag, mud.frag, slag.frag, cryofluid.frag, caustics.frag. Not opened.
- Dungeon archetypes from presets: capture-by-waves (captureWave, SectorPresets.java l.25) and waves-then-attack (attackAfterWaves, l.182). Maps: 114 files in core/assets/maps (97 Serpulo and default, 17 Erekir), binary, not read.

Top 5 striking zones:
1. Tar fields (preset tarFields, SectorPresets.java l.132). The tarred and muddy status effects exist (StatusEffects.java) and are used as ammo effects in Blocks.java. Linking them to this preset is our inference, not something the files state. Keep: slow, sticky ground idea. Change: map layout and hazard tuning.
2. Spore storm (Weathers.java sporestorm). Keep: weather that limits sight. Change: particle style.
3. Naval fortress and coastline (SectorPresets.java, navalFortress l.99, coastline l.89). Keep: sea-edge fights. Change: layout and naval unit set.
4. Desolate rift (preset desolateRift l.142). Keep: a single harsh arena with waves. Change: the hazard and the rules.
5. Erekir neoplasm sites (renale and latum units, UnitTypes.java l.4309, l.4329). Keep: a spreading enemy in a zone. Change: spread rule and look.

## 6. Looks worth recreating (with reference files)
- Banded build-in reveal: core/assets/shaders/unitarmor.frag (l.17-18). Technique: alpha times progress times a sine band mask on sprite height.
- Forcefield with wobble and edge glow: core/assets/shaders/shield.frag (l.19 wobble, l.24-28 edge from four neighbour samples, l.32 diagonal sparkle from modulo on screen coordinates).
- Permanent boss tint and stat multipliers: core/src/mindustry/content/StatusEffects.java l.178-184. Technique: team-coloured status effect.
- Planet with atmosphere shell: core/assets/shaders/planet.frag, atmosphere.vert (names only, not opened).
- Animated hazard surfaces: slag.frag, tar.frag, mud.frag, cryofluid.frag, caustics.frag (names only, not opened).

## Inspiration for Frankendom
Each item is an original. Keep and change are stated per item.
1. Hex-stride siege walker: a legged siege unit whose leg count rises tier by tier. Keep: leg-count escalation, ground-only. Change: rig, body, sound, no acid identity.
2. Crush-tread bulwark: tank tier that damages what it rolls over. Keep: crush on contact. Change: tread, role, silhouette.
3. Bubble carrier: a hovering support carrier that shields and repairs an area. Keep: bubble plus repair. Change: dome bubble shader, shape and colour.
4. Brood husk: a unit whose death releases a timed brood. Keep: death spawn. Change: brood type, count, timing.
5. Rebuilder drone: small support that repairs nearby allies and blocks. Keep: area repair pulse. Change: visual and rules.
6. Banded build-in reveal: units appear in bands as they finish building. Keep: band reveal. Change: rate and direction.
7. Permanent boss tint: a boss status that tints and multiplies, with our own colour rule. Keep: permanent boss mark. Change: colour, multipliers, tint method.

## licence_note
Code: GNU GPL v3 (LICENSE, full FSF text). Assets: no asset licence statement found (grep over core/assets, core/assets-raw, README and CONTRIBUTING found none). The only licence is the GPL-3.0 text. Credits string names the author. Class C for assets, B for shaders as source text. Inspiration is kept at category level for this donor because the asset licence is unclear. This is what the files say, not a legal reading.

## not_read
- Images, audio, maps (msav), music and sounds: not opened or listened to.
- Blocks.java drawer and rendering code for turret tiers: not read.
- Fx.java (2993 lines) effects: not read.
- Shaders other than shield.frag and unitarmor.frag: not read.
- Weapon behaviour per turret beyond ammo wiring: not read.
- server/ module and launchers (android, desktop, ios): not read.
- Per-unit numbers (health, speed, cost): deliberately not recorded.
