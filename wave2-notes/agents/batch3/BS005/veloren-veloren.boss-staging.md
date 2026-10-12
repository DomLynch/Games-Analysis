# veloren-veloren (boss-staging, cell 2)

Donor: veloren-veloren (VPS /mnt/frankendom-donors/veloren-veloren). Licence: GPL-3 (LICENSE file opens "GNU GENERAL PUBLIC LICENSE Version 3"). Clean-room, shape only: no code is copied. Every number below is what the donor uses, shown as a donor observation; the Frankendom values are ours.

Checked: read server/agent/src/attack.rs: handle_minotaur_attack 4781-4950 (frenzy, pillar cheese, hallway chase), handle_frostgigas_attack 5832-6010 (summon ladder, forced ability chain, bonk, cheese), handle_firegigas_attack 6210-6480 (overheat cap, weighted attack tables, special timer, parry punish). common/src/comp/agent.rs 270-460 (per-species psyche: sight, pursuit). server/src/rtsim/tick.rs 415-435 (boss spawn mapping). server/src/sys/agent/behavior_tree/mod.rs 1000-1006 (world-boss awareness). voxygen/src/audio/channel.rs 40-60 (music tags). Data: assets/common/entity/world/world_bosses (gigas_frost, gigas_fire, summons), assets/common/abilities/custom/gigas_frost (10 files), gigas_fire (13 files), gigas_fire/overheat.ron, frost_summons.ron, ashen_summons.ron, assets/common/abilities/ability_set_manifest.ron 983-1025, assets/common/loot_tables/world/world_bosses, assets/common/items/npc_armor/biped_large/gigas_frost.ron, assets/common/entity/dungeon/myrmidon/minotaur.ron (entry only). Confidence: high on the gigas thresholds and timers (read the arithmetic). Medium on the mapping from Ability(n) to ability name: it matches the manifest order and the code's own comments for both sets, but the InputKind mapping itself was not read. Not read: the minotaur ability files and loot table, the rtsim spawn scheduler, basic_summon.rs state logic, pets.rs, client code. Voxygen boss HUD: grep only (hud/mod.rs 183-184 holds quality-colour comments and no boss-specific HUD was found).

Half read: server (agent and rtsim) and data (RON). Client half: grep only.

## 1. What the player sees and feels (375 wide)
The frost giant (Gigas Frost) is a large biped. Its sight range is 200 where normal monsters have 100, and it never gives up a chase on its own. As its health drops it calls minions: the first summon comes at about 87 percent health, then at 75, 62, 50, 37, 25 and 12 percent. Each summon is a 1.75 s wind-up, 1.5 s cast and 0.75 s recover, so about 4 s of telegraph. The frost giant mixes melee, a leap shockwave, ice volleys and ice spikes, and each melee hit is followed by a "bonk" every 7 to 10 s.

The fire giant (Gigas Fire) swings a blade in fast and slow pairs, sometimes a whirlwind or a vertical strike, and every so often a 3-second flame beam that stops itself. It leaps to close distance after a while, and when a player stands on it from above it throws fire pillars at them.

The minotaur (a dungeon boss in the Myrmidon set) goes into one frenzy at half health. If the player stands on its central pillar for more than 4 s, it stops melee and throws things from range, and walks itself to a point 25 units off the pillar to reposition.

## 2. Why it works / is striking
- Readable tell: a 1.75 s wind-up before every summon. At 375 wide, a visible wind-up is the warning; the 1.5 s cast is the window to hit it.
- One signature behaviour: a boss that stops itself. The fire giant's beam is capped at 3.0 s and then forced off, so the player gets an opening. Strong.
- One signature sound or effect: not read (ability effect files are data; sound not checked).
- Could be made ours at 20-30 percent resemblance: yes. The ladder of summons at health steps and the self-capped beam are both small rules.
- Readability at 375 wide: not measured on a device.

## 3. The rule behind it
A. Summon ladder (frost attack.rs:5878-5895; fire attack.rs:6328, 6390):
1. At the first combat tick the counter is set to 1 minus the step, 1 - 1/8 = 0.875 (frost line 5878 area, fire line 6328).
2. Each tick: if health fraction < counter, push the summon input (frost Ability(3) = frost_summons; fire ASHEN_SUMMONS = Ability(9) = ashen_summons). This check is first in the chain, so it pre-empts other attacks.
3. When that summon reaches recover, counter -= step (frost attack.rs:5900-5901; fire attack.rs:6395-6396).
4. Result: summons at 87.5, 75, 62.5, 50, 37.5, 25, 12.5 percent. That is 7 summons, then the counter reaches 0 and the ladder is spent.
5. Catch-up: the check has no cooldown and one decrement per completed summon. A hit from 88 percent straight to 40 percent queues four summons back to back (counter 0.875, 0.75, 0.625, 0.5 are all above 0.40).
6. Summons: frost summons 2 boreal minions at 5-10 units (frost_summons.ron:6-7). Fire summons 4 ashen minions at 5-15 units (ashen_summons.ron:6-7). Both have has_health: true; duration: None (no timed despawn set in the file).

B. Fire overheat beam (attack.rs:6366-6377; overheat.ron):
1. Timer "Overheat" counts up only while the beam is being cast (line 6366 resets it to 0 otherwise).
2. The beam is recast only while the timer is under OVERHEAT_DUR = 3.0 s (line 6223, 6377). After 3.0 s the boss stops, so the beam is hard capped.
3. Beam data (overheat.ron): buildup 1.675, beam 1.0, recover 0.3, damage 9.0, tick_rate 4.0, range 35.0, max_angle 65.0, burning buff 5.0 s at strength 0.5. Units are not defined in the file (not read further).

C. Fire weighted tables and special timer (attack.rs:6266-6300, 6426-6443):
1. damage_fraction = 1 - health fraction.
2. Basic melee: fast slash 2, fast thrust 2, slow slash 1 + damage_fraction, slow thrust 1 + damage_fraction (line 6267-6271).
3. Specials: whirlwind 6, vertical strike 6, overheat 6, explosive strike 1, lava leap 1, fire pillars 1 (lines 6277-6283). The special fires when the special timer passes 10 s (line 6426).
4. After a special, the timer is reset to random(0, 3 + 5 x damage_fraction) (line 6443). Higher damage starts the timer higher, so the next special comes sooner. At 0 percent damage the average gap is about 8.5 s; at 100 percent damage, about 6 s (our arithmetic from the formula).

D. Frost chase rules (attack.rs:5883-6000 area): attack-change timer cycles back to 0 after 6 s; melee range uses the Secondary strike after 5 s or when the target is behind (angle over 90), and a whirlwind when the target is more than 120 degrees behind; spikes within 16 while timer under 2; flashfreeze within 30 while timer under 4; leap within 50 when timer over 3; ice bombs within 70 when timer under 3; otherwise remote spikes. A "cheese" check (target above by a normalised z over 0.6 and distance over 5) fires remote spikes or ice bombs at about 0.2 per second.

E. Minotaur (attack.rs:4789-4943):
1. Frenzy: counter starts at 0.5 when health is above 0.5 (line 4789 constant). Below 0.5 it self-buffs with Ability(1) and the counter is set to 0 when the buff recovers (line 4901 onward). One frenzy only.
2. Pillar cheese: centre = home + (50, 75) (line 4815). Cheese if the player or the boss is within 16 units of the centre and the cheese timer is over 4 s (line 4820). Cheese mode throws (Ability(2) or Ability(3)) and walks the boss to a point 25 units from centre, chosen by a 5 s bin of a 20 s reposition timer.
3. Hallway chase: within 3 to 18 units above home, the boss always chases (lines 4942-4943), the comment calls it the hallway to the boss chamber.

F. Pursuit (common/src/comp/agent.rs):
1. sight_dist 200 for Gigas Frost and Gigas Fire, 100 for other biped_large (agent.rs:437).
2. should_stop_pursuing is false for the two Gigas, true for other biped_large (agent.rs:449-456). A world boss never breaks off by health or distance in this code.
3. The behaviour tree sets maximum awareness for any agent whose should_stop_pursuing is false (server/src/sys/agent/behavior_tree/mod.rs:1003 area). The comment names world bosses and roaming entities; the two Gigas are among them.

G. Spawn and loot: rtsim maps Gigasfrost and Gigasfire to the world_bosses entity configs (server/src/rtsim/tick.rs:429-432). Loot: MultiDrop of 3 to 4 picks from a lottery of two entries (armour table or crafting ingredient) for each gigas (world_bosses/*/boss.ron:2-7). Frost chest armour: protection 140.0, poise resilience 25.0, energy max 150.0 (items/npc_armor/biped_large/gigas_frost.ron:7-11).

H. Music (voxygen/src/audio/channel.rs:44-50): the tag enum has TitleMusic, Exploration and Combat only. The comment says transitions such as Exploration to BossBattle "would transition more rapidly" in the future. So this donor has no boss music stage.

Designer-tunable data fields (donor values are GPL, so null):

| name | unit | donor_value_or_null |
|---|---|---|
| summon_ladder_step | fraction of max health | null |
| summon_first_fraction | fraction of max health | null |
| summon_count_frost | count | null |
| summon_count_fire | count | null |
| summon_wind_up_s | s | null |
| summon_cast_s | s | null |
| summon_recover_s | s | null |
| overheat_cap_s | s | null |
| special_gap_timer_s | s | null |
| special_timer_range_per_damage | s | null |
| bonk_interval_s | s | null |
| minotaur_frenzy_fraction | fraction | null |
| minotaur_cheese_radius | units | null |
| minotaur_cheese_delay_s | s | null |
| boss_sight_dist | units | null |
| default_sight_dist | units | null |

Our starting values (ours, not donor): step 0.125, first 0.875, summon 2 per cast, burst cap 1 per tick, overheat cap 3.0 s, wind-up 1.75 s.

## 4. For Frankendom
- Keep: the summon ladder as a counter keyed to server health; the cap on the beam; the weighted tables that shift toward slow, heavy moves as the boss weakens; the pillar-area guard as zone data.
- Change, rule 1: summons count against MAX_ATTACKERS = 3. A fire-style 4-minion summon breaks the cap. Use 2 per summon, or count summoned minions as attackers.
- Change, rule 2: add a burst cap (data field max_summons_per_burst) so a big hit does not queue four summons at once. This is our fix to the donor's catch-up behaviour.
- Server-verified fit: the ladder counter lives on the server with health, and it advances only when a summon completes. That is the right place (kills and health are server-verified).
- Phone fit: the wind-up (1.75 s) is the tell; a 4 s total telegraph is long for a fast duel, so keep wind-up as the tell and shorten cast and recover in our data.
- Pillar and hallway: store centre offset, radius and delay in zone data, not code.
- Pursuit: world-boss "never leash" is a data flag (boss_leash false) for roaming bosses only.
- Rows: summon ladder and beam cap are row 13 (specials); pursuit and sight are row 4 (fight loop, aggro, chase, leash); the server tick sub-line is "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) because the ladder counter and cooldown run per tick.

## 5. A 5-minute look test Dom can judge on his phone
In the Pit, one fire giant at full health, with the summon ladder shown as seven ticks on the health bar.
1. Let it fall to just under 88 percent: one wind-up with the 1.75 s tell, then 4 ashen minions. Judge whether the tell reads at phone size.
2. Do one big hit from 88 to about 40 percent: count the back-to-back summons. Then rerun with the burst cap at 1 and compare.
3. Let the beam fire: judge whether the 3 s cap reads as the boss tiring.

## 6. Licence and IP
GPL-3. Clean-room: no code is copied. The mechanism shape (counter ladder, timer cap, weighted table, pillar guard) is taken. Veloren names, lore and art are not used. Numbers in the look test are ours.

## 7. Gaps
- Not read: minotaur ability files and loot table, rtsim spawn scheduler, basic_summon.rs state logic, pets.rs, the client-side boss HUD and camera (grep only).
- Ability(n) to name mapping: inferred from the manifest order and the code's own comments, not from the InputKind code.
- Idle and ambient behaviour, death and respawn presentation, loot reveal ceremony, walk density: not in the code read.
- Music: no boss stage exists here (only a comment).
- Readability at 375 wide: not assessed on a device.

## Dragons and big creatures (MG011, fold-in)
Half read: server and data. Dragon data is a species only: the body type Reddragon (common/src/comp/body/dragon.rs:38) with Female and Male body types. No dragon entity config, no dragon ability set and no dragon AI were found (grep for reddragon in assets/common/entity, abilities and loot tables returned nothing). So dragons as bosses, mounts, flight and taming are NOT in this donor's code read.

| name | effect | formula | number ranges | cost | cooldown or cast | caps | file:line |
|---|---|---|---|---|---|---|---|
| Summon ladder (frost) | minions at health steps | counter starts 1 - 1/8, summon when health < counter, counter -= 1/8 per completed summon | 7 steps; 2 minions at 5-10 units | none | 1.75 + 1.5 + 0.75 s | 7 summons per boss | attack.rs:5878, 5895; frost_summons.ron:2-7 |
| Summon ladder (fire) | 4 ashen minions at health steps | as frost | 4 minions at 5-15 units | none | 4 s total | 7 summons | attack.rs:6328, 6390; ashen_summons.ron:6-7 |
| Overheat beam (fire) | 3 s flame beam, stops by itself | timer counts while casting, cap 3.0 s | beam 1.0 s, damage 9.0, tick 4.0, range 35, max angle 65 | energy regen 2, drain 0 (file) | buildup 1.675 s, recover 0.3 s | 3.0 s beam cap | attack.rs:6223, 6366-6377; overheat.ron:2-12 |
| Special timer (fire) | big moves with a random gap | timer = random(0, 3 + 5 x damage_fraction), fire at 10 s | gap about 6 to 8.5 s by our arithmetic | none | n/a | one special at a time | attack.rs:6426-6443 |
| Minotaur frenzy | one self-buff at half health | counter 0.5, buff once, then 0 | one use | none | buff cast | once per fight | attack.rs:4789, 4901-4907 |
| Minotaur pillar guard | leaves melee and throws from range if standing on its pillar | centre = home + (50,75), radius 16, delay 4 s | reposition 25 units from centre, 5 s bins | none | n/a | n/a | attack.rs:4815-4820, 4861 |
| Frost armour (chest) | boss drop | protection 140.0, poise 25.0, energy 150.0 | one chest piece | none | n/a | n/a | items/npc_armor/biped_large/gigas_frost.ron:7-11 |
| Dragon species | species data only | n/a | Female and Male | n/a | n/a | n/a | common/src/comp/body/dragon.rs:38 |

Read for our use: the summon ladder and the timed beam cap are the two boss-ability shapes worth the most. Dragons as mounts, taming and flight are not in this donor.

## Reuse tag
Reuse: shape only (GPL-3). Summon ladder, beam cap, weighted tables, pillar guard, world-boss pursuit flag.

## Brief rule served
Boss-staging feel: telegraphed wind-ups, phase ladder, self-capping beam. Served by the summon ladder and the beam cap rules.

## Best transferable idea
A boss sheds minions at fixed health steps, one per completed summon, with a telegraphed wind-up, and a burst cap so a big hit cannot queue them all at once.
