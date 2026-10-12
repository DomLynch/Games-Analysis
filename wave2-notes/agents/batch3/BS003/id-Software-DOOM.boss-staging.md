# id-Software-DOOM (boss-staging, feel note, with MG011 dragons and boss abilities)

Donor: /mnt/frankendom-donors/id-Software-DOOM (VPS, read-only). Code read: linuxdoom-1.10/.
Licence: LICENSE.TXT in the tree is GPL v2. README says the source is released "for your non-profit use" and that real game data is needed. Treat as GPL: shape only, no code copied.

Checked: linuxdoom-1.10/p_enemy.c (A_KeenDie 566; A_BossDeath 1609-1756; A_BrainAwake 1813-1841; A_BrainScream 1849-1873; A_BrainDie 1896-1899; A_BrainSpit 1901-1925; A_SpawnSound and A_SpawnFly 1930-1988; fat attacks 1349-1417; cyber, spider and bruiser attacks 865-980), p_map.c 1165-1180 (radius damage immunity), p_spec.c 1045-1060 (E1M8-style floor damage), p_inter.c 845-870 (armour absorb), info.c (mobjinfo and state table for bruiser, spider, cyberdemon, brain, brain spit, spawn shot, cube; states 663-690, 912-937, 1498-1860), doomdef.h (TICRATE 35), m_random.c (P_Random). Candidates opened: 8 files. Confidence: high on the code I quote; medium on how the numbers feel, since I have not played it.
Not read: the WAD data (not in the donor, so map layouts, boss-spot placement and map scripts are unknown); the renderer; f_finale.c and wi_stuff.c beyond the boss references; sounds.c beyond names; state tics for the spider and cyberdemon attack chains (cited only where quoted).

Half read: both. Logic in p_enemy.c, p_map.c, p_inter.c, p_spec.c, plus the data tables in info.c. The matching level data half (WAD) is not in the donor box, so map-by-map boss counts are not read.

## 1. What the player sees and feels (375 wide)
A brain-type boss sits still in its lair until it notices you. Its wake is a single sound, then a short hold of about five seconds before its first spit. Every spit is a visible cube that flies at a marked spot in the room, so you see the warning travel. When the cube lands, a puff of teleport fog appears and a random minion from a weighted list steps out and charges. A plated fat boss fires two-shot fan volleys, so the threat reads as a wedge, not a stream. When the brain dies, a row of blast puffs rolls across the room for about 3.4 seconds before the level ends. Metallic footfalls play on the walk frames of the big walkers, so you hear them before you see them.

## 2. Why it works, or is striking
- Readable beat at 375 wide: the cube is the warning. Its flight time is known at launch (computed from distance), so the phone player can see when it lands.
- One signature behaviour: the cube-then-spawn chain, where the boss's attack is a delayed reinforcement at a visible spot.
- One signature sound: a wake sound, a travel sound on each cube frame, and a footfall on each walk frame of the walkers.
- Could be made ours at 20-30 percent resemblance: a lair with three marked spit spots, cubes that spawn minions at those spots, and a cap of three alive at once (our MAX_ATTACKERS rule).
- Death chain ordering: the scream row, two quiet holds, then the exit. The loss or win is staged, not instant.

## 3. The rule behind it
Order of operations, with the numbers.

Wake: A_BrainAwake (p_enemy.c:1813-1841) scans every thinker once and collects each boss-target spot into a fixed array of 32 (p_enemy.c:1834 with no bound check), then plays the wake sound. The wake state holds 181 tics before the spit loop starts (info.c:921).

Spit: the spit state runs A_BrainSpit every 150 tics (info.c:922). A_BrainSpit picks the next spot in a round-robin (p_enemy.c:1914), launches a spawn-shot missile aimed at that spot (speed 10 map units per tic, info.c:1852), and sets the cube's flight length to (dy / momy) divided by 3 (p_enemy.c:1919-1920). Because dy / momy equals distance / speed, the flight length in animation frames is the true distance over speed, over 3 tics per frame.

Landing: A_SpawnFly (p_enemy.c:1936-1988) counts the cube's flight frames down (p_enemy.c:1944). On arrival it spawns fog at the spot, plays the teleport sound, picks a monster from an 11-entry weighted table (p_enemy.c:1958-1979, weights summing to 256), turns it to its see state if a player is found, telefrags anything in the spot (p_enemy.c:1986), and removes the cube.

Death chain: S_BRAIN_DIE1 holds 100 tics and runs A_BrainScream, which spawns 65 blast puffs in a row, 512 map units wide, 320 units in front of the brain, each with a random tic shave of 0-7 (p_enemy.c:1856). Then two 10-tic holds, then A_BrainDie calls G_ExitLevel (p_enemy.c:1898; info.c:916-919). Total: 120 tics, about 3.4 seconds.

Boss-death gate: A_BossDeath (p_enemy.c:1609) is tiered by episode, map and boss type. It returns early if no player is alive (no victory with nobody left). It then scans every mobj thinker for another alive boss of the same type (p_enemy.c:1702). If one is alive, it stops. If none, it runs the map's tagged event (sector 666 floor lower, sector 667 floor raise, or door 666) or exits the level. Note: the scan is per type, not per group. On the commercial map 7 each boss type fires its own event when its last member dies.

Keen rule (the smaller version): A_KeenDie (p_enemy.c:566) runs the same "all of this type dead" scan and then opens tag 666.

Immunity: Cyberdemon and Spider take no radius (splash) damage (p_map.c:1173-1176).

Fan volley: FATSPREAD is ANG90/8, which is 11.25 degrees (p_enemy.c:1349). A_FatAttack1 fires a missile at the target and one at +11.25 degrees. A_FatAttack2 fires one at the target and one at -22.5 degrees. A_FatAttack3 fires two at -5.625 and +5.625 degrees. Each attack is two missiles.

Ordering inside one spit: aim is chosen (the spot), then the cube is launched, then the flight counts down, then fog, then spawn, then cube removal. Each step is a separate state, so the order is fixed by the state table.

Data fields (names, unit; donor value null because the donor is GPL):
- wake_hold_s: seconds from sight to first spit. Donor 181 tics = 5.17 s at 35 tics per second. Donor value: null.
- spit_cadence_s: seconds between spits. Donor 150 tics = 4.29 s. Donor value: null.
- cube_speed_units_per_s: map units per second. Donor 10 units per tic = 350 units per second. Donor value: null.
- cube_flight_s: derived as distance / cube speed. Unit: seconds. Donor value: null.
- spit_spot_count: number of spit spots per lair. Donor cap 32. Donor value: null.
- spawn_weights_of_256: one weight per minion type, 11 entries (50, 40, 30, 10, 30, 2, 10, 20, 30, 24, 10). Donor value: null.
- death_scream_s: 100 tics = 2.86 s. Donor value: null.
- death_hold_s: 2 x 10 tics = 0.57 s. Donor value: null.
- death_puff_count: 65 puffs. Donor value: null.
- death_row_width_units: 512 map units. Donor value: null.
- boss_hp: cyberdemon 4000, spider 3000, bruiser 1000, brain 250. Donor value: null.
- boss_pain_chance_of_256: cyberdemon 20, spider 40, bruiser 50, brain 255. Donor value: null.
- fan_spread_deg: 11.25. Donor value: null.
- splash_immune: true for cyberdemon and spider. Donor value: null.

## 4. For Frankendom
- 700 zones as data: the boss-death gate becomes a zone-tag event ("all bosses of this type in this zone are dead"). The server decides it and the client only plays the presentation. Maps carry the tag, not the code.
- 100 Pit characters reused: the cube's spawn table is a weighted list of existing Pit character IDs with per-zone weights. No new code per zone.
- Many-vs-one: cubes must not add unlimited minions. Cap alive spawns at three (MAX_ATTACKERS). Each spawn must land on a fight spot, not on the player.
- Keep: the telegraph (cube in flight, flight time computed at launch); round-robin spit spots; the per-type gate; the death chain order (event, one-second visual, then the result).
- Change: keep all toggle state (the easy-skill skip, the target list) in the engine, not in a static global. Guard the divide by momy and the modulo by zero. Cap the target list at build time and warn. Telefrag becomes "push aside" so a spawn never kills a player on a phone. The exit is a server event with a grace timer, not a call from an animation frame.
- Engine rows: row 13 (specials) for the spit and cube; row 7 (creature actor and clips) for the death chain and walk-frame sounds; row 17 (death and respawn) for the boss death; row 18 (loot roll and XP award) for the boss-death event; row 23 (zone population) for spawn caps, since cube spawns count toward the cap. Server tick: fixed step, input intake, per-tick NPC budget.

## 5. Five-minute look test (Dom, on his phone)
Build one lair in the Pit arena behind the current boss. Three marked spit spots. The boss wakes with one sound and a 1-second hold, then spits every 2.5 seconds. Cubes fly 1.5-2.5 seconds, then fog for 0.3 seconds and one minion spawns. Cap three alive. Boss death: a 1.2-second staggered puff row, then the reward. Compare it with today's boss at 375 wide: is the cube readable as the next threat? Target file: src/fight/ (a new spit module, not in place yet), row 13 (specials).

Proposed phone numbers (ours, not the donor's): spit cadence 2.5 s, cube flight 1.5-2.5 s, death hold 1.2 s, alive spawn cap 3.

## 6. Licence and IP
GPL v2. Shape only. No code copied. Creature and boss designs belong to the donor, so keep this at category level: a brain-in-a-lair boss that spits telegraphed cubes; a tall rocket-armed walker with metallic footfalls; a plated fat boss firing paired fans. Keep the trait (the telegraph, the round-robin spit, the per-type gate, the death chain order). Change the trait: our own names, our own tables, spawns drawn from our Pit roster, a three-alive cap, and server-decided events.

## 7. Gaps
- Not read: the WAD (so no map-by-map boss spot counts, no real walk density), the renderer and sprite data, f_finale.c and wi_stuff.c beyond the boss references, sounds.c beyond names, the state tics for the spider and cyberdemon attack chains.
- Half read: both (logic and info.c tables). The level-data half is absent from the donor box.
- Absent from this donor, checked by grep over linuxdoom-1.10 *.c and *.h for dragon, breath, tame, mount, saddle, bond, summon, pet: no hits for dragons, breath, taming, mounts, saddles, bonding or summoning. Only the spit cube is a summon, and it has no upkeep, leash or cap.
- Idle behaviours: the bruiser holds two standing frames at 10 tics each (info.c:663-664). The brain's eye loops a look state at 10 tics (info.c:920). The brain body has no animation (S_BRAIN, -1 tics).
- Death and respawn: no respawn for bosses. The death chain is the presentation of a loss and the exit is immediate.
- Loot reveal: none in this code (map pickups only).
- Walk density: not in code (WAD data).
- Readability at 375 wide: first-person sprites; no threat colour coding in this code; no cap on how many monsters a cube spawn may add (the spit cadence bounds the rate, not the total).

## MG011 table: dragons and boss abilities

| name | effect | formula | number ranges | cost | cooldown or cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Fan volley, first form | two missiles: aim, and aim +11.25 deg | offset FATSPREAD = ANG90/8 | 11.25 deg | none | state tics (not read) | none | p_enemy.c:1351-1373 |
| Fan volley, second form | two missiles: aim, and aim -22.5 deg | offset FATSPREAD*2 | 22.5 deg | none | state tics (not read) | none | p_enemy.c:1375-1390 |
| Fan volley, third form | two missiles at -5.625 and +5.625 deg | FATSPREAD/2 each side | 5.625 deg | none | state tics (not read) | none | p_enemy.c:1392-1416 |
| Telegraphed cube spit | one cube per spit at the next spot in a ring | speed 10 units/tic; flight frames = (dy/momy)/3 | spit every 150 tics (4.3 s); ring of up to 32 | none | 150 tics | 32 spots, no check | p_enemy.c:1901-1925; info.c:922; info.c:1852 |
| Cube landing spawn | fog, weighted monster spawn, see state if a player is found, telefrag | weights of 256 | 11 types, weights 2 to 50 | none | flight frames | none on alive count | p_enemy.c:1936-1988 |
| Brain death show | 65 blast puffs in a row, then two holds, then exit | puff loop from -196 to +316 units, 8 per step | 100 + 10 + 10 tics = 3.4 s | none | 120 tics | none | p_enemy.c:1849-1873; info.c:916-919 |
| Splash immunity | radius damage skipped for cyberdemon and spider | none | 100 percent immune | none | none | per type | p_map.c:1173-1176 |
| Pain chance per boss | chance to enter pain on a hit | pain chance out of 256 | cyberdemon 20, spider 40, bruiser 50, brain 255 | none | none | per type | info.c mobjinfo blocks (not receipted: tab-aligned) |
| Boss HP and speed | how much each boss takes and how fast it moves | none | cyberdemon 4000 hp, speed 16; spider 3000, speed 12; bruiser 1000, speed 8; brain 250, speed 0 | none | none | none | info.c mobjinfo blocks (not receipted: tab-aligned) |
| Player armour | absorbs damage by type, until points run out | save = damage/3 (type 1) or damage/2 (type 2) | two armour types | none | none | armour points | p_inter.c:857-859 |
| Phases | none keyed to health; state chain and pain chance only | none | none | none | none | none | p_enemy.c:1896-1925 |
| Dragons, breath cones (beyond the fan), flight phases, taming, mounts | none in this donor | none | none | none | none | none | grep over linuxdoom-1.10 |
| Resource pools (mana, focus, stamina) | none; health only | none | health per mobjinfo | none | none | none | info.c mobjinfo blocks |

Which numbers suit a fast mobile fight (ours): cube flight 1.5-2.5 s; spit cadence about 2.5 s; fan volley wedge of about 11 degrees for two shots; death chain no more than 1.5 s; three alive at most.

Best transferable idea: a telegraph projectile whose landing time is computed at launch and whose landing spawns the reinforcement at a visible spot, with a three-alive cap.

Reuse tag: boss-staging and dragons/boss-abilities. Brief rule served: staging order (telegraph, spawn, death chain), per-type boss gate, plus the MG011 boss-ability table.

Decision: adapt (idea). Defects to fix in our version (keep the idea):
- A_BrainSpit divides by the number of spit spots (modulo) with no check. Fix: return early if the count is 0, and log it.
- A_BrainSpit divides by momy, which is zero when the spot lies exactly on the brain's east-west line. Fix: flight time = distance / speed, using the approximate distance helper.
- A_BrainAwake writes into a fixed 32-entry array with no bound check. Fix: cap at 32 spots at build time and warn.
- A_BrainSpit's easy-skill skip uses a static global toggle that spans all brains and all levels. Fix: a per-boss counter, reset on wake.
- A_FatAttack1 and A_FatAttack2 change the boss's own facing before the missile is spawned, but the spawn resets the missile angle to the aim, so the nudge is lost for the first shot. Fix: set the offset on each missile's own angle and momentum, as the second shot already does.
- Unbounded spawns: cubes spawn with no alive cap. Fix: cap alive spawns at three (MAX_ATTACKERS).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: none found; checked A_BrainAwake/Spit/Scream/Die, A_SpawnFly weights (sum 256), FATSPREAD forms, A_BossDeath per-type scan and map-7 tags, A_KeenDie, p_map 1173-1176 immunity, p_inter armour 1/3 and 1/2, info.c states 181/150/100/10/10 and hp/pain/speed values, TICRATE 35, licence GPL v2 plus README non-profit line
Missed: A_BossDeath non-commercial tiers (ep1 floor 666, ep4 map6 door, ep4 map8 floor, else exit) only partly described; A_BrainExplode (p_enemy.c ~1880) unmentioned; p_spec case 11 floor damage 20 per 32 tics cited but not described
