# id-Software-Quake-2 (design catalogue, DC029)

Donor: /mnt/frankendom-donors/id-Software-Quake-2 (Quake 2 v3.19 code: game/, ctf/, client/, server/, qcommon/, ref_gl/, ref_soft/ and platform folders).

Halves: the **server-side game half is read** (game/*.c, ctf/*.c). The **client and engine half** (client/, server/, qcommon/, ref_gl/, ref_soft/) is listed but not read. The **data pack is absent**: baseq2/ holds only config.cfg and save/, with no .pak, .md2, .sp2, .wal or .bsp file (AU025). The paired donor is not in the box; the Quake 1 folder is a separate game and its data is absent too.

Licence: GPL. readme.txt line 6 says the code is GPL. readme.txt line 19 says the Q2 data files remain copyrighted and cannot be redistributed. Clean-room, shape only. Recreate every idea below as a clearly distinct original, never a copy, at roughly 20-30 percent resemblance in mood.

Checked: game/g_spawn.c (spawn table), 22 creature files (game/m_*.c, all but m_flash.c and m_move.c), game/g_combat.c (damage, armour, power armour), game/g_weapon.c (projectiles, dodge, rail, BFG), game/p_weapon.c (fire functions and damage constants), game/g_items.c (item table, armour, powerups, max-health items), game/p_client.c (obituary strings), ctf/g_items.c (rune names), ctf/g_ctf.c (rune effect function names). Confidence: high for the spawn table, creature health and gib values, damage order and weapon constants. Medium for individual creature behaviours (read at function and frame level, not every frame table).

## 1. Creatures / beasts

Families (from the spawn table, game/g_spawn.c 149-266, 22 distinct creature types, plus one alias):
- Grunt line: infantry (100 HP, gib -40), gunner (175 HP, gib -70), and the soldier trio (light 20 HP, soldier 30 HP, SS 40 HP, all gib -30). The soldier trio is one model with three skins (m_soldier.c 1200-1299).
- Heavy and brawler: gladiator (400, gib -175), berserk (240, gib -60), mutant (300, gib -120, leaping attack), medic (300, gib -130).
- Armour walkers: tank (750, gib -200) and tank commander (1000, gib -225), the commander is the same class with skin 2 and more HP (m_tank.c 823-841). Supertank (1500, gib -500).
- Flyers and hovers: flyer (50 HP, no gib threshold set), flipper (50, gib -30), floater (200, gib -80), hover (240, gib -100).
- Strogg organics: chick (175, gib -70), parasite (175, gib -50), brain (300, gib -150), insane (100, gib -50, spawned only by misc_insane).
- Bosses: boss2 (2000, gib -200), jorg (3000, gib -2000), makron (3000, gib -2000). Boss gib thresholds sit far below zero, so a boss only gibs after taking several times its HP in damage.

Escalation: by family tier (soldier light to SS), and by skill. Skill changes monster reactions: soldier dodge choice is duck only at skill 0, 67 percent duck and 33 percent counter-attack at skill 1, and 34 percent duck and 66 percent counter at skill 2 and 3 (m_soldier.c 845-868). Single-player damage is halved on skill 0 (g_combat.c 405-407). Pain is debounced 5 s on skill 3 (g_combat.c T_Damage).

Signature abilities (one line each, from function names and read bodies):
- Medic: revives a dead ally with a cable (m_medic.c 576-628, ED_CallSpawn at 621).
- Parasite: latches on and drains; damage is gated to animation frames (5 on drain03, 2 on drain04; m_parasite.c 316-345).
- Brain: ducks into a guard before attacks; its dodge pauses for time-to-impact plus 0.5 s (m_brain.c 352-360, dodge set at 660).
- Hover: takeoff and landing chains for close attacks (AU025 cites m_hover.c 127, 226, 232, 352; not re-read here).
- Mutant: a take-off then touch-jump (mutant_jump_takeoff and mutant_jump_touch; line numbers not receipted).
- Jorg: a BFG shot and firebullet bursts (jorgBFG, jorg_firebullet in m_boss31.c).
- Makron: a pre-railgun wind-up, railgun, BFG and a spawn call (makron_prerailgun, MakronRailgun, makronBFG, MakronSpawn in m_boss32.c).
- Dodge reaction (all monsters with a dodge hook: brain, chick, gunner, infantry, medic, soldier): see section 7.

Top 8 striking (silhouette, one signature behaviour, one sound or effect, could be ours at 20-30 percent):
1. Medic, corpse-tether healer. Why: it revives a fallen enemy by tethering the corpse. Keep: the frame-gated channel, reach limit of 256 and the pitch gate of 45 degrees (m_medic.c 576-628). Change: the revive comes back at partial HP after a visible wind-up, with a rope of light instead of a cable. Ref: m_medic.c 576-628.
2. Parasite, latch leech. Why: it holds the player and drains, so the threat is a state as well as damage. Keep: the latch and the frame-gated drain ticks (5 then 2). Change: silhouette and the drain cue (a crystal hum). Ref: m_parasite.c 316-345, 476, 532-533.
3. Brain, guard-stance brute. Why: a visible guard pose before attacks is a readable telegraph. Keep: the duck telegraph and the dodge pause of time-to-impact plus 0.5 s. Change: the guard flashes a shield, not a head shape. Ref: m_brain.c 352-360, 660.
4. Soldier trio, three-tier grunt. Why: three tiers from one model and skin, with HP steps of 20, 30 and 40. Keep: tier as skin variant and HP step, shared gib threshold of -30, skill-driven response. Change: tier shows as armour plate tint and a different sidearm. Ref: m_soldier.c 1238-1299, 845-868.
5. Jorg, halo colossus. Why: a 3000 HP boss with a BFG and firebullet bursts. Keep: the BFG as a big slow shot and the boss gib threshold far below zero (finisher-only death). Change: the ranged signature (sweep arcs, not a plain volley). Ref: m_boss31.c 696-729.
6. Makron, twin-gun warlord. Why: a visible railgun wind-up then BFG. Keep: the wind-up as the telegraph and the -2000 gib finisher. Change: no respawn call; a stance change at half HP. Ref: m_boss32.c 830-847.
7. Tank commander, armoured walker pair. Why: an elite is the same model with a different skin and more HP (1000 against 750). Keep: elite as data change (HP, gib threshold, skin). Change: a shield plate and a colour-coded readability ring. Ref: m_tank.c 792-849 (HP and gib at 823-831).
8. Mutant, leaping brute. Why: a take-off then a touch-jump is a readable telegraph. Keep: take-off then jump-touch. Change: a landing shockwave in place of the claw. Ref: m_mutant.c (function names read; line numbers not receipted).

Counts: creatures 22 distinct monster spawns (23 monster_ names, one alias: monster_tank_commander uses SP_monster_tank). Two of them, boss3_stand and commander_body, are not roaming creatures by name and were not read beyond the spawn row, so the roaming count is 20 (unverified split).

## 2. Classes / races / factions

- Player classes: none in the code read. The player is one class (game/p_client.c, p_weapon.c). No race system.
- Factions: enemy Strogg (monsters) against the player. CTF teams (red and blue) live in ctf/ (g_ctf.c, CTF module, two teams).
- Progression (max-health and carry items, from game/g_items.c):
  - Adrenaline: +1 max health outside deathmatch, heals to max (g_items.c 197-209, line 200).
  - Ancient Head: +2 max health (g_items.c 211-219, line 213).
  - Bandolier: raises ammo caps to 250 bullets, 150 shells, 250 cells, 75 slugs (g_items.c 221-235).
  - Backpack and ammo caps: not read beyond the bandolier.

Counts: classes 0 player classes; 2 CTF teams.

## 3. Weapons

Families: 11 weapon think functions in game/p_weapon.c (Weapon_Grenade, Weapon_GrenadeLauncher, Weapon_RocketLauncher, Weapon_Blaster, Weapon_HyperBlaster, Weapon_Machinegun, Weapon_Chaingun, Weapon_Shotgun, Weapon_SuperShotgun, Weapon_Railgun, Weapon_BFG). Ammo items: bullets, shells, grenades, rockets, cells, slugs.

Damage constants read (p_weapon.c):
- Hand grenade 125, radius 165 from damage plus 40 (551-566).
- Grenade launcher 120 (714-728).
- Rocket 100 plus random 0 to 19, radius damage 120 (764-783).
- Blaster 15 in deathmatch, 10 otherwise (p_weapon.c 852-855); hyperblaster 15 in deathmatch, 20 otherwise (904-907).
- Machinegun 8 (959); chaingun 6 in deathmatch, 8 otherwise (1059-1061).
- Shotgun: pellets at 4 each (1189-1215). Super shotgun: pellets at 6 each (1245-1269).
- Railgun 150 (100 in deathmatch), kick 250 (200) (1312-1317).
- BFG: 200 in deathmatch, 500 otherwise, radius 1000 (1372-1377).
- Quad multiplies damage by 4 at fire time (p_weapon.c 558, 719, and the others).

Top 5 striking:
1. BFG sweep (g_weapon.c 804-881). After impact the ball lays a short laser every tick at each target within 256 units, 10 damage per tick (5 in deathmatch), through monsters until a wall. Keep: the per-tick pulse and pierce. Change: the sweep is a fan of arcs, not straight lines.
2. Railgun pierce (g_weapon.c 658-718, fire_rail). The beam passes through monsters and players, stops at walls, and passes water and lava. Keep: penetration stops at walls. Change: a bent beam that bends around cover.
3. Grenade throw power (p_weapon.c 556-566). Speed scales with how long the button is held (weapon_grenade_fire). Keep: hold-to-throw power. Change: a visible arc preview.
4. Rocket with random damage (p_weapon.c 764-783). Damage is 100 plus up to 19, so each hit reads a little different. Keep: small random spread. Change: a visible charge ring.
5. Shotgun spread (g_weapon.c 290-305, fire_shotgun). Pellets are spread by horizontal and vertical spread values. Keep: the spread values as data. Change: a double-barrel cone.

Counts: weapons 11.

## 4. Armour / gear

- Armour tiers (game/g_items.c 39-41): jacket (base 25, max 50, normal protection 30 percent, energy 0 percent); combat (50, 100, 60 percent, 30 percent); body (100, 200, 80 percent, 60 percent). Each tier has its own pickup model (models/items/armor/<tier>/tris.md2) with EF_ROTATE spin (g_items.c 1153).
- Armour shard: small pickup (g_items.c, item_armor_shard).
- Absorb (game/g_combat.c 282-287): save = ceil(protection times damage), capped at the pool. Energy damage uses the energy protection value.
- Power screen (g_combat.c 223-243): only blocks hits from the front arc (dot above 0.3 with the facing vector). Absorbs damage divided by 3 and costs one cell per point of save.
- Power shield (g_combat.c 232-237): blocks from every direction, costs two cells per point of save, absorbs two thirds of the damage.
- Quad damage (g_items.c 355-360): picking up another quad adds time to the running timer. Quad damage is 4x at fire time.
- Invulnerability: stops damage, with a 2 s sound throttle on the protected target (g_combat.c T_Damage).

Top 5 striking:
1. Power screen front arc (g_combat.c 223). Keep: a block only from the front arc, tested by a dot product. Change: a visible arc shield in the HUD.
2. Power shield cost model (g_combat.c 232-237). Keep: power shield costs cells per point. Change: cost shown as a meter.
3. Quad time stacking (g_items.c 355-360). Keep: a second quad adds to the timer. Change: visible stacking as a ribbon of time.
4. Three armour models as distinct shapes (g_items.c 1153). Keep: each tier is a different model. Change: not jacket, combat and body but three of our own shapes.
5. Max-health items (g_items.c 197-219): adrenaline and ancient head grow the cap. Keep: permanent cap growth. Change: a visible growth cue.

Counts: gear_sets 6 (jacket, combat, body, shard, power screen, power shield); 8 powerup and carry items listed in g_items.c.

## 5. Zones / dungeons

- Maps absent (baseq2 holds no maps). Zone archetypes are the entity vocabulary in game/g_spawn.c 149-266 (108 spawn rows by grep; 107 accounted for by category, one row not resolved):
  - func_ (17): plat, button, door, rotating, train, water, conveyor, clock, explosive, killbox, areaportal and others.
  - trigger_ (11): always, once, multiple, relay, push, hurt, key, counter, elevator, gravity, monsterjump.
  - target_ (18): earthquake, lightramp, laser, spawner, secret, goal and others.
  - misc_ (19): teleporter, blackhole, viper, strogg_ship, satellite_dish, banner, explobox and others.
  - turret_ (3): breach, base, driver.
- Hazards and liquids read: lava and slime are content types that the railgun passes (g_weapon.c 658-690). Liquid volumes are func_water and conveyors (names only). Gravity and elevator triggers are names only.
- Not read: where any zone entity sits, how func_water or func_conveyor behave, misc_blackhole and misc_viper logic.

Top 5 striking:
1. Railgun passes slime and lava (g_weapon.c 658-690): the beam switches to a mask that ignores liquid. Keep: a per-hazard mask rule. Change: a visible shimmer.
2. misc_blackhole (name only, not read). Keep: a pull zone idea. Change: pull is a gentle lean.
3. misc_viper and misc_bigviper (name only, not read). Keep: a flyover event as set dressing. Change: a live event with a timer.
4. target_earthquake (name only, not read). Keep: a shake target. Change: shake tied to a fight beat.
5. func_water and func_conveyor (name only, not read). Keep: liquid volumes and moving floors as zone data. Change: visual water tint per zone.

Counts: zones 0 maps; 108 spawn rows as zone vocabulary.

## 6. Item / effect looks worth recreating

- BFG laser sweep: TE_BFG_LASER and TE_LASER_SPARKS (g_weapon.c 816-881).
- Railgun trail: TE_RAILTRAIL, with a second trail if the beam crossed water (g_weapon.c 694-713).
- Power armour sparks: TE_SCREEN_SPARKS for the screen and TE_SHIELD_SPARKS for the shield (g_combat.c 223-237).
- Medic cable: TE_MEDIC_CABLE_ATTACK sent from the medic to its target (m_medic.c, around the cable attack at 576-628).
- Parasite drain beam: TE_PARASITE_ATTACK sent on the drain frame (m_parasite.c 343-365).
- Spin on pickups: EF_ROTATE on every pickup model (g_items.c 1153 and the other pickup rows).
- Death messages: 40 obituary message strings in game/p_client.c (lines 231-383), including "almost dodged" (line 348) for a dodge kill. Good for death presentation.
- CTF runes: four rune pickups (ctf/g_items.c): Disruptor Shield, Power Amplifier, Time Accel, AutoDoc. Effect functions present in ctf/g_ctf.c 1992-2090: CTFApplyResistance, CTFApplyStrength, CTFApplyHaste and CTFApplyRegeneration. The rune-to-function mapping was not verified.

Defects found (keep the idea, fix the defect):
- Quad radius (p_weapon.c 556-558 and 717-719): radius = damage + 40 is computed before the quad multiply, so a quadded grenade keeps the base radius with 4x damage. Fix: either recompute radius after the multiply or document that quad does not grow the blast. Keep the damage-plus-40 rule.
- Power shield rounding (g_combat.c 237-241): power_used = save / damagePerCell truncates, so an odd save under-charges by up to one cell. Fix: round up with ceil. Keep the cost model.
- Two dodge hooks are commented out (m_float.c 647, m_hover.c 609). Intent unknown; record as a decision.

Counts: none (looks list).

## 7. Dodge reaction, read in full (a mechanism worth keeping)

check_dodge (game/g_weapon.c 32-52): every projectile (bolt, rocket, BFG) traces forward and, if a monster with a dodge hook is in the line and in front of the shooter, computes time-to-impact (distance minus half the monster's width, divided by speed, line 50) and calls the monster's dodge hook with that time. On easy skill only one shot in four is checked. The hooks roll 25 percent, then react with a pause equal to time-to-impact plus a fixed margin (soldier 0.3 s, brain 0.5 s) and a duck or a counter.

## 8. Inspiration for Frankendom (originals, clearly distinct)

1. Halo bombard: a slow orb that, each tick, lays a short laser sweep at every target within a radius, pierce through the first target. Keep: per-tick pulse, radius gate, pierce. Change: a fan of arcs and a charge-up sound.
2. Front-arc shield: blocks hits only from the front arc (dot above 0.3), costs one charge per point. Keep: the arc test and the charge cost. Change: the cost is a shield meter and the arc is drawn.
3. Revival tether: a support enemy channels a revive on a fallen ally within reach and a pitch gate. Keep: frame-gated channel, reach limit and pitch gate. Change: revive at 40 percent HP after a 4 s wind-up.
4. Latch leech: a small enemy holds the player and drains on fixed ticks. Keep: the latch state and frame-gated drain. Change: the silhouette and a crystal hum.
5. Guard-stance brute: a visible guard before its attacks, with a dodge pause sized to the incoming projectile. Keep: telegraph and time-to-impact pause. Change: the guard is a flashing shield.
6. Gib threshold as data: each creature stores its overkill value. Bosses sit far below zero, so they die by finisher. Keep: threshold as a field. Change: gibs become armour plates and sparks.
7. Dodge by time-to-impact: a 25 percent roll, then a pause sized to the projectile and a choice of duck or counter by difficulty. Keep: the time-to-impact pause and the difficulty-driven choice. Change: a sidestep, and the choice weighted more toward counter.
8. Three-tier grunt: one model with three skins and HP steps of 20, 30 and 40. Keep: tier as skin variant and HP step. Change: tier shows as an armour plate tint.

Licence note: GPL (readme.txt line 6); data copyrighted and not redistributable (readme.txt line 19). Shape and mechanism only.

## Not read
- Data pack (absent): maps, models, sounds, textures, help GIF contents.
- Client, server, qcommon and renderers (ref_gl, ref_soft) and platform folders.
- Full frame tables of each monster; only the functions and values named above.
- Hover and mutant line numbers (AU025 cites hover; mutant names only).
- misc_blackhole, misc_viper, target_earthquake, func_water, func_conveyor and the trigger_gravity and trigger_elevator logic (names only).
- ctf/layout.txt beyond what AU025 recorded; ctf/g_ctf.c effect bodies beyond the names.
