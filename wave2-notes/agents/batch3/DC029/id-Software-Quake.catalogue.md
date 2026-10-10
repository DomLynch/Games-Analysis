# id-Software-Quake (design catalogue, DC029)

Donor: /mnt/frankendom-donors/id-Software-Quake (QuakeWorld QuakeC source, WinQuake engine, readme and GPL text).

Halves: the **data pack is absent** (no .bsp, .mdl, .wav, .pak in the box, per AU025). I read the **game-logic half** as QuakeC source (/mnt/frankendom-donors/id-Software-Quake/qw-qc/*.qc; QW/progs/*.qc differs by about 25 lines per file, mostly the GPL header block, by diff line count only; not compared line by line, so the cited lines are from qw-qc). I read the **engine half** only in WinQuake/r_part.c (the particle system of the single-player engine). The QuakeWorld server (QW/server/*.c) and client (QW/client/*.c) were listed but not read. No monster AI exists in the box (see section 1).

Licence: GPL. readme.txt line 16 says the code is GPL; readme.txt line 38 says the Quake data files remain copyrighted and not redistributable. Clean-room, shape only. Every idea below is to be recreated as a clearly distinct original, never a copy, at roughly 20-30 percent resemblance in mood.

Checked: weapons.qc (fire, selection, pickup, multi-damage), combat.qc (damage, armour, radius, CanDamage), items.qc (health, armour, ammo, powerups, pickup and respawn), player.qc (death, gibs), client.qc (water, lava, slime, powerup glow and warning), misc.qc (lava balls, traps, ambience), triggers.qc (hurt, push), server.qc (monster stubs, movetarget), defs.qc (effect flags), WinQuake/r_part.c (particles). Confidence: high for weapons, combat and items (read in full sections). Medium for player death and water (read in parts). Low for anything in the engine beyond r_part.c.

## 1. Creatures / beasts

- Families (names only): 15 monster classnames are declared in qw-qc/server.qc lines 28-42. Each one is a stub that calls remove(self), so the QuakeWorld server never runs them. The names are ogre, demon, shambler, knight, army, wizard, dog, zombie, boss, tarbaby, hell knight, fish, shalrath, enforcer, oldone.
- Not in the box: monster AI, monster models, sounds, frames, tiers, escalation, signature abilities. No ogre.qc or similar file exists, and progs.src (qw-qc/progs.src) lists no monster file. Only the movement hooks survive: path_corner and monster_movetarget (server.qc lines 50-123), with an ogre drag-sound special case at server.qc line 86.
- Boss or elite pattern: not readable.
- Top 8 creatures: none. There is nothing in the box to describe a creature's look, tier or ability, so I did not invent one. The closest creature-like hazards are in section 5 (lava ball, spike trap).

Counts: creatures 15 names, 0 behaviours read.

## 2. Classes / races / factions

- Player classes: none. One player model and one playable class (qw-qc/player.qc). No race or class system.
- Factions: none. Friendly-fire is governed by a teamplay setting in combat.qc (T_Damage team-avoidance block, teamplay values 1 and 3). Teams are key-based (infokey "team"), not a faction system.
- Progression: none in the single-player sense. Deathmatch powerups and weapon ranks only (items.qc RankForWeapon 511-526).

Counts: classes 0.

## 3. Weapons

Families: 8 weapon states (qw-qc/weapons.qc W_SetCurrentAmmo, lines 894-960): axe (melee, no ammo), shotgun, super shotgun, nailgun, super nailgun, grenade launcher, rocket launcher, lightning gun. Ammo types: shells, nails, rockets, cells.

Order of operations (W_Attack, weapons.qc 1023-1091): check ammo (W_CheckNoAmmo drops to the best weapon when empty), wake monsters (show_hostile = time + 1), then fire. Cooldown is set in attack_finished per weapon: axe 0.5 s, shotgun 0.5 s, super shotgun 0.7 s, grenade launcher 0.6 s, rocket launcher 0.8 s, lightning 0.1 s. Nailgun cadence is set in the animation frames and was not read.

Auto-switch (W_BestWeapon, weapons.qc 963-989): lightning (if waterlevel <= 1 and cells >= 1), then super nailgun, super shotgun, nailgun, shotgun, else axe. The rocket and grenade branches are inside a commented-out block (line 981).

Damage constants read: shotgun 6 pellets at 4 each via FireBullets (weapons.qc 290-321, 323-343); super shotgun 14 pellets at 2 shells, dropping to the shotgun at 1 shell (345-373); spike hit 9, super spike 18 (822, 869); lightning 30 per trace per tick, three traces (485-543); rocket and grenade radius damage 120 (422, 625).

Top 5 striking (readable at 375 wide: a lightning arc, a sawn-off spread, a bouncing grenade, a fast rocket, a random axe swing):
1. Lightning gun, three parallel traces give the beam its width (weapons.qc 544-616, LightningDamage 502-543). Keep the three-trace width. Change to a branching crackle. The offset is buggy (see section 6).
2. Super shotgun, 14 pellets gathered into a single damage call per target (weapons.qc 345-373, batching 185-258). Keep the batching. Change the cone to a visible double-barrel pattern.
3. Grenade with a bounce sound and explode-on-damageable rule (weapons.qc 637-655 GrenadeTouch, explosion 618-635). Keep the bounce-then-detonate rule. Change the bounce to a spark.
4. Rocket aimed at 1000 speed with a 5-second self-remove (weapons.qc 444-483). Keep the timed self-remove. Change the trail to a shard ribbon.
5. Axe, four random swing frames chosen by random() (weapons.qc 1023-1091). Keep the random variety. Change the swing to an arc with a visible hit window.

Counts: weapons 8.

## 4. Armour / gear

- Armour tiers (items.qc 395-453): green = absorbs 30 percent, pool 100; yellow = 60 percent, pool 150; red = 80 percent, pool 200. A pickup replaces the current armour only if its effective strength (fraction times pool) is higher (items.qc 428-432).
- Absorb rule (combat.qc 160-175): save = ceil(fraction times damage), capped at the remaining pool. When the pool is spent, the armour type resets.
- Tier look: all three tiers share one armour model with skins 0, 1 and 2 (items.qc 454-487). The tier shows by skin colour only.
- Material tiers: none beyond armour. No metallic, gold or glow materials on gear. The only colour-coded keys are gold and silver key models (item_key1/2).
- Health: normal box 25, rotten box 15, megahealth 100 which rots 1 point per second back to max (items.qc 265-300, 365-375). Overheal ceiling of 250 in T_Heal (items.qc 234-249).
- Timed powerups (items.qc 1311-1460): invulnerability, environment suit, invisibility, and quad damage. Each lasts 30 s. Invulnerability and invisibility respawn after 5 minutes; the others after 60 s.
- Warning: the last 3 seconds of quad flash the screen and sound once per second (client.qc 1078-1125). Invulnerability has no warning in the code read (client.qc 1040-1060 only stops it).
- Death drop: a quad or ring on a dying player drops as a world item that keeps the time left and removes itself when that time runs out (player.qc 580-600; items.qc 99-122).

Top 5 striking:
1. Quad drop with a carried clock: the item keeps the time left and vanishes on the same clock (items.qc 99-122). Keep the carried timer. Change the drop to a glowing shard that shows its timer.
2. Armour swap by effective strength (items.qc 428). Keep the compare. Change the tiers to three distinct plate types, not green, yellow and red.
3. Megahealth overheal that rots back to max one point per second (items.qc 315-375). Keep the decay. Change the decay to a visible bleed of light.
4. Armour absorbs a fraction of each hit until its pool empties (combat.qc 160-175). Keep the fraction and the pool. Change the pool to a shield meter.
5. Glow from effect flags: blue for quad and red for invulnerability, plus a dim light (items.qc 1395, 1458; client.qc 1051-1057 and 1102-1108). Keep the flag-driven glow. Change the glow to an orbiting ring.

Counts: gear_sets 3 armour tiers and 4 timed artifacts (7 entries).

## 5. Zones / dungeons

- Maps: absent (no .bsp). Zone archetypes are recovered from the entity definitions. There are 80 QUAKED entity headers across the qw-qc source (grep count).
- Biomes and hazard families (from entity definitions and code):
  - Liquids: water (drowning: 12 s of air, then damage that starts at 2 and grows by 2 a second, client.qc 800-830), slime (4 damage per water level per second, client.qc 854-860), lava (10 damage per water level every 0.2 s, client.qc 842-852; the radiation suit slows it to 1 s).
  - Hurt triggers: trigger_hurt, default damage 5 (triggers.qc 587-597).
  - Traps: trap_shooter and trap_spikeshooter, with a laser variant (misc.qc 380-449).
  - Lava balls: misc_fireball (misc.qc 191-226).
  - Moving parts: func_plat, func_train, func_door, func_door_secret, func_button, func_wall, func_illusionary.
  - Progress gates: sigils, gold and silver keys, episode gates (func_episodegate E1 to E4, func_bossgate).
  - Teleport: trigger_teleport with info_teleport_destination.
  - Ambience entities: nine ambient_* types (misc.qc 655-716): suck wind, drone, fluorescent buzz, drip, computer hum, thunder, light buzz, two swamp beds.
- Not read: map layouts, spawn balancing (none in the QW progs source), where hazards sit in a level.

Top 5 striking:
1. Lava ball: a hidden emitter throws a ball on a random 3 to 8 second timer (misc.qc 191-226). Keep the random interval. Change the arc and the warning. Defect: launch speed never set (see section 6).
2. Spike trap with a laser variant, fired on trigger (misc.qc 380-449). Keep the trigger-fired hazard. Change to a timed sweep.
3. Drowning breath counter with escalating damage (client.qc 800-830). Keep the countdown. Change the ramp to a cap, not a reset.
4. Swamp and cave ambience beds (misc.qc 655-716). Keep one ambience entity per area. Change to a crossfade between biomes.
5. Sigil-gated boss door (func_bossgate, misc.qc 639-650). Keep the gate that opens on collecting a set. Change to a progression ring.

Counts: zones 0 maps; 7 hazard families.

## 6. Item / effect looks worth recreating

- Glow by effect flag: EF_BLUE and EF_RED with a dim light (defs.qc 420-421 values not quoted; use items.qc 1395 and 1458, client.qc 1051-1057 and 1102-1108).
- Particle explosion (WinQuake/r_part.c 277-320): 1024 particles drawn from a fixed pool, colour from an 8-step ramp that advances each frame, life 5 s. Velocity grows by a factor each second (r_part.c 682, 754), so the burst accelerates outward. Keep the ramp and the frame-rate-independent timing.
- Blob explosion (r_part.c 355-399): two particle types, 1024 particles, 1 s to about 1.4 s life.
- Teleport splash (r_part.c 501-536): a grid of 896 short-lived particles pushed radially from the centre (grid loop at 508). Keep the grid. Change the palette.
- Particle budget: MAX_PARTICLES 2048 with a minimum of 512 (r_part.c 24-26). The pool exhausts silently and then drops spawns, which is the per-tick budget idea.
- Blood as a visible-only temp-entity event (weapons.qc 151-158).
- Gib and death: health below -40 gibs (player.qc 624); otherwise one of five death animation chains is chosen (player.qc 643). Note: the choice is biased, because value 5 and 6 both map to the fifth chain (player.qc 643-656).

Defects found (keep the idea, fix the defect):
- Lightning beam offset (weapons.qc 509-510): f_x is set to -f_y, then f_y is set to the new f_x, so the offset is (-fy, -fy), not a perpendicular. A ray along +x gets zero beam width. Fix: swap through a temp: x = -y, y = old x. Keep the three-trace idea. (Read by eye; the 14-character line does not meet the receipt length rule.)
- Multi-damage batching (weapons.qc 209-218): the pending target flushes only when the target changes. A hit order of A, B, A splits into three applications, so per-hit rules fire three times. Fix: a small per-target list flushed once per shot. Keep the batching.
- Blood origin (weapons.qc 245): the blood multicast uses puff_org, not blood_org. Fix: send at blood_org. Keep the event.
- Copy-paste field (weapons.qc 612, 620, 628): hadammo is read from ammo_rockets in the nail and shotgun branches, and the value is never used. Fix: delete it or read the right field.
- Latent tautology (items.qc 689): deathmatch != 3 || deathmatch != 5 is always true. It is harmless only because the leave early-return already runs. Fix: use &&.
- Expired quad drop (player.qc 580): the check is super_damage_finished > 0, with no time test, so an expired quad drops with negative seconds in the message. Fix: compare against time.
- Invulnerability cue throttle (combat.qc 212-214): the timestamp is stored on self (the caller), not on the protected target. Fix: store it on targ. Keep the throttle.
- Lava ball speed (misc.qc 205, 218): self.speed == 1000 is a comparison, not an assignment, so speed stays 0. The launch z is then 0 to 200, not the intended lob. Fix: self.speed = 1000. Keep the timed lob.
- Rotten health comment (items.qc, rotten box): comment says 5 to 10 points; code sets 15. Fix: align the comment or the value.
- Rocket auto-switch (weapons.qc 981): commented out. Intent unknown. Record it as a decision.

Counts: none (looks list).

## 7. Inspiration for Frankendom (originals, clearly distinct)

1. Carry-the-clock buff: a buff dropped on death keeps the time it had left and vanishes when that time ends. Keep: carried timer and matching despawn. Change: the drop is a glowing shard that shows its countdown, and it sits on the ground rather than tossing.
2. Effective-strength gear swap: new armour replaces old only when absorb times pool is higher. Keep: the compare. Change: three plate types with their own silhouettes, not green, yellow and red.
3. Three-strand arc gun: three parallel traces give a beam its width (fixed offset). Keep: the width trick. Change: a branching arc that jumps to a second target.
4. Pellet bundle: multi-pellet damage sums into one damage call per target (fixed flush). Keep: the bundle. Change: a double-barrel spread.
5. Ember burst: explosion from a colour ramp that accelerates outward, timed in seconds not frames. Keep: ramp and timing. Change: our own palette.
6. Drowning clock: a breath counter, then rising damage that caps. Keep: the countdown. Change: the cap instead of the reset.
7. Lava lob: a vent throws a timed arc on a random 3 to 8 second clock. Keep: the random clock. Change: the fixed launch speed and a visible ember trail.

Licence note: GPL (readme.txt line 16); data copyrighted and not redistributable (readme.txt line 38). Shape and mechanism only.

## Not read
- Data pack (absent): maps, models, sounds, textures.
- Monster AI (absent): no creature frames, tiers or abilities.
- QW/server and QW/client C code; WinQuake engine files other than r_part.c.
- Nailgun cadence and spike-hit timing beyond the damage lines.
- Rocket direct-hit damage in T_MissileTouch (weapons.qc 375-443, partly read).
- Player death animation bodies beyond the choice logic.
