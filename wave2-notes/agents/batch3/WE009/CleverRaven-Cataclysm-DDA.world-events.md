# CleverRaven-Cataclysm-DDA (world-events, WE009)

Donor: /mnt/frankendom-donors/CleverRaven-Cataclysm-DDA (VPS, read-only). Licence: Creative Commons Attribution-ShareAlike 3.0 Unported (LICENSE.txt line 1). Shape only: no donor numbers are copied into our design (donor_value null in the JSON). Depth: full. Half read: both (engine src/ for the cited paths, data json/monstergroups, effects, missions, scenarios). Client/UI not read.

Checked: opened src/timed_event.h and src/timed_event.cpp in full; src/horde_map.cpp (signal_sm, spawn_entity); src/overmap.cpp (move_hordes, move_nemesis, signal_hordes, process_mongroups, mongroup::wander, place_nemesis, spawn_mon_group path); src/overmapbuffer.cpp (move_hordes, fix_nemesis, despawn_monster); src/sounds.cpp (get_signal_for_hordes); src/map.cpp spawn-on-load (group.horde branch); src/do_turn.cpp scheduling; src/suffer.cpp; src/monattack.cpp; src/computer_session.cpp; src/game.cpp (DIM); src/iexamine.cpp (temple scheduling); src/mission.cpp and src/mission_start.cpp; data/json/monstergroups/zombies.json, monsters/zed_misc.json, effects.json, starting_missions.json, scenarios.json, mutations/supernatural.json. Confidence: high on the code paths cited (read line by line); the "no caller" claims come from a grep over src/. Nothing was executed. Some numbers below are computed from the formulas and are marked as such.

Best transferable idea: a loud sound pulls every group within reach toward its source for a time that shrinks with distance, a louder sound only ever extends the pull, and one hunter that re-targets the player and escalates on each kill gives the world a clock without a spawn director.

## 1. What the player sees and feels
Most of the world stands still. Then a gunshot, a generator or a loud fight sends a signal out across the map. Groups in the nearby districts start moving toward the noise, one tile per tick at their speed, and keep going for a limited count of ticks; the pull is strongest close to the noise and fades with distance. Nothing announces it. A second, separate threat is a single hunter tied to the "Hunted" trait (three scenarios force the trait). It never teleports and never gives up: it re-targets the player's current area about every two minutes, walks faster on roads than through forest, and when it dies the next one returns tougher. A third layer is scripted reveals on a timer: an altar sinks and a temple opens, water creeps one step every two or three turns, the sky dims for 50 turns and relights. These are real timed sequences, not text.
Phone note: the donor UI was not read, so what a 375-wide screen shows for hordes and the hunter is not verified here.

## 2. Why it works / is striking
- Readable at 375 wide: the hunter has its own glyph and colour in the data (zed_misc.json line 295 id, glyph H, light blue), so the same silhouette returns each time. Horde groups on the overworld are not readable at phone scale unless the UI shows them (not read).
- One signature behaviour: the hunter always knows where you are. The donor retargets it by a per-turn roll (suffer.cpp line 519), so the chase is a fact of the world, not a dice fight.
- One signature sound: the hunter has a LOUDMOVES flag (zed_misc.json, flags list near line 331). Its sound output was not read.
- Could be made ours at 20-30 percent resemblance: yes. "A pursuer that is slower off-road, re-targets every few minutes, and comes back tougher each time" transfers directly to a Pit or zone boss that is one per character.

## 3. The rule behind it
A. Sound becomes a horde signal (src/sounds.cpp 447-470). Volume minus weather attenuation. Below the volume floor (min_vol_cap, line 452) the signal is zero. Otherwise power = ceil(volume / 12) (hordes_sig_div = SEEX, line 454), floored at 8 and capped at 180 (lines 455-456). Underground the volume is divided by depth (line 453).
B. Each group within reach reacts (src/horde_map.cpp 179-210). eff_power = power minus submap distance (line 186). If positive, the group's destination becomes the noise origin and its tracking becomes eff_power times 12 (lines 190, 196). Re-signalling a group that is already tracking only raises tracking (line 203), it never lowers it. Groups that are not tracking are moved into the active map.
C. Movement (src/overmap.cpp 1576-1599). Each turn a tracking group loses one tracking tick (line 1577), gains energy equal to its speed (line 1578), and spends 100 energy per tile step (line 1599). It stops when tracking reaches zero or when it reaches the destination. When a step enters loaded space the entity is placed as a real monster on that tile's neighbour (overmap.cpp 1617-1621, placed_monster->wander_to). The spawn-on-load path gives its monsters a wander target near the group's target too (src/map.cpp 10158). A blocked group keeps losing tracking but does not move.
D. Idle groups never move. mongroup::wander (src/overmap.cpp line 1443, the roam and city behaviours) has no caller in src/. alert_entity (src/overmap.cpp 1791) has no caller in src/. So the only overworld motion is the signal pull in C. Roaming is a dead path in this tree.
E. The hunter steps (src/overmap.cpp 1655-1725). move_nemesis runs every 2.5 minutes (do_turn.cpp line 588). Each run makes one attempt. The chance of a step is one_in(m) times rng(0,200) below the group's average speed (line 1688). The divisor m is 1 on road (line 1676), 3 on field (line 1678), 6 on forest, swamp or bridge (line 1682), 10 on river (line 1684), and 25 elsewhere (line 1674). A step moves one king-move toward the target. Computed, not simulated: at speed 95 (the hunter's speed), a step succeeds about 0.47 of attempts, so the per-attempt step chance is about 0.47 on road, 0.16 on field, 0.08 in forest, 0.05 on river and 0.02 elsewhere. On open ground that is roughly 53 attempts, or about 2.2 game hours, per step.
F. Retarget. Each turn there is a one-in-120 roll (suffer.cpp 519) that points the hunter at the player's current area (signal_nemesis, overmapbuffer.cpp 675-681).
G. Escalation per death (zed_misc.json 326 and 338-340; effects.json 586-606). The hunter's death increments a global Nemesis_iteration counter. While the buff is active (1000 s, effects.json line 590; applied at spawn, monster.cpp 3722-3723), each hit on the hunter is reduced by the counter for bash, stab, cut and bullet (effects.json line 599), and its speed is scaled by about 1 percent per counter (line 604). How the enchantment is combined in the engine was not read.
H. Recurrence. The kill variant of the Hunted mission sets monster_kill_goal to 1 and ends the trait (starting_missions.json 614-617). The survive variant has no kill goal, so each death starts a new hunter (mission.cpp 264 "Recurring nemesis"): a random field tile 40-80 overmap tiles away, with up to three tries that widen the range by 1.0, 1.5 and 2.0 times (mission_start.cpp line 77). A player death removes the hunter (do_turn.cpp 120-122).
I. Group decay. Each day, groups marked dying lose one fifth of their population with integer division (overmap.cpp 1303-1304), and are deleted at zero. From 4 that is 4, 3, 2, 1, 0: gone in four days.
J. Timed-event queue (src/timed_event.cpp; processed every turn from do_turn.cpp 556). An entry is (type, due turn, place, strength, key). Each turn it runs a per_turn hook, then actualize when due (lines 402-404). Patterns in the donor:
  - Hold until the condition holds (intended): SPAWN_WYRMS per_turn is meant to keep the event waiting while the player is above ground. The code moves the due turn with a minus sign (line 356, "when -= 1_turns"), which brings it closer, so the event is consumed above ground without effect. See defect 7.
  - Telegraph before the reveal: TEMPLE_OPEN shows a rumble message every two to three seconds while pending (line 389 text), then reveals.
  - Self-rescheduling spread: TEMPLE_FLOOD spreads water one step and reschedules itself in 2-3 turns (line 284) until nothing changes.
  - Chained delays: the AMIGARA log schedules a whisper event five minutes later (computer_session.cpp 897); the start schedules a shake event ten seconds later (computer_session.cpp 943).
  - Sky envelope: DIM lasts 50 turns: dims for the first 25, relights for the last 25 (game.cpp 3637 comment and 3634-3643).
K. Dead path: ROBOT_ATTACK. An eyebot queues a reinforcement call 15-30 turns ahead (monattack.cpp 2703). The call is capped: at most three per six hours (effects.json 550-554, the assisted effect) and ten per eyebot (effects.json 560-562, depleted, added permanent at monattack.cpp 2706). But timed_event::actualize has no case for ROBOT_ATTACK (the only branch that runs is the default at timed_event.cpp line 344), and grep of src/ finds the queue call and a debug label only. So the call fires into nothing. WANTED is in the enum (timed_event.h line 20) and is never queued.
L. Clock units. calendar.h line 231-232: seconds map one to one onto turns, and minutes are sixty turns (line 236). once_every (calendar.cpp 758) is an exact modulo test on the turn counter, so a loop that jumps the counter past a multiple skips that tick. Not tested.

Counts (from grep and reads):
- Timed-event types: 20 (NONE through EXPLOSION). 12 have an actualize case (HELP prints a disabled message). Without an actualize case: NONE, WANTED, ROBOT_ATTACK, AMIGARA_WHISPERS (per_turn only), ARTIFACT_LIGHT, CUSTOM_LIGHT_LEVEL, OVERRIDE_PLACE, DIM (read by the light code).
- Monster groups: 369 monstergroup entries in 27 files (data/json/monstergroups). One nemesis group (GROUP_NEMESIS, zombies.json line 241).
- Overmap spawn blocks: about 103 "spawns" entries across data/json (group, population min and max, radius, chance). Use of the chance field was not read.
- Hunted trait: three scenarios force it (scenarios.json lines 226, 278, 1172).

Data fields (designer-tunable; all donor_value null because the donor is CC BY-SA):
- sound_min_volume: unit volume; the floor is 60.
- signal_divisor_per_submap: unit volume per signal; 12.
- signal_min and signal_max: unit signal; 8 and 180.
- underground_volume_divisor_per_depth: unit divisor; 2.
- tracking_ticks_per_signal: ticks per signal unit per submap; 12.
- step_energy_cost: energy per tile; 100.
- hunter_step_interval: game minutes; 2.5.
- hunter_retarget_chance: one in N per tick; 120.
- terrain_step_divisor: per ground type; road 1, field 3, forest-swamp-bridge 6, river 10, other 25.
- hunter_escalation_per_death: count; 1.
- hunter_hit_reduction_per_iteration: damage per hit per type; 1.
- hunter_speed_bonus_per_iteration: percent; 1.
- hunter_buff_duration: seconds; 1000.
- respawn_distance: overmap tiles; 40 to 80 with retries at 1.0, 1.5 and 2.0 times.
- dying_group_keep_fraction: fraction per day; 4/5 (integer).
- eyebot_call_delay: ticks; 15 to 30.
- eyebot_calls_per_window: count per six hours; 3. eyebot_calls_total: count; 10.
- temple_flood_step_interval: ticks; 2 to 3.
- dim_envelope: ticks; 50 (25 down, 25 up).
- amigara_whisper_delay: minutes; 5. amigara_shake_delay: seconds; 10.

Known defects (keep the idea, fix the defect):
1. ROBOT_ATTACK has no actualize case, so the reinforcement call does nothing. fix: add a case that spawns up to three units within two tiles of the player, respecting the existing caps.
2. Hunter wounds are lost on despawn. overmapbuffer.cpp line 2201 writes a fresh one-person group (overmap.cpp 3651) instead of keeping the monster like the other hordes do in the else branch. fix: store the monster (monster_data) with its hit points, or keep the design and say that the hunter heals on leaving the area.
3. Stalled groups bank energy. In move_hordes the energy is added every tick (line 1578), but a blocked group skips the spend (the stuck branch leaves moves untouched). On release the group takes a step every tick until the bank drains. fix: clamp the bank to one step (100) when blocked.
4. Groups that walk onto an overmap that is not in memory are dropped with a debug message (overmap.cpp 1643, the node is destroyed). fix: keep the group on the nearest loaded overmap or return it to idle.
5. Dead path: wander and alert_entity have no callers, so the roam and city behaviours never run. fix: either wire wander into an idle tick (per-group interest and a home) or delete both functions.
6. Timed-event handler lookups are linear (timed_event_manager::get walks the list). Not a defect at current counts; noted.
7. The wait-until-underground hold for SPAWN_WYRMS uses the wrong sign (timed_event.cpp line 356, "when -= 1_turns"). Each above-ground turn moves the due turn closer, so the event comes due sooner and actualize returns early above ground (the event is removed with no effect). fix: use "when += 1_turns" so the gap to due stays fixed while above ground, then the event fires on the first underground turn. Check with a test that toggles depth.

## 4. For Frankendom
- 700 zones as data: each zone gets a spawn block like the donor's (group, population min and max, radius). Hearing becomes zone-graph distance in hops, not submap distance. The donor's per-zone tables already have the shape (about 103 spawn blocks).
- One engine, many-vs-one: a group that reaches the player becomes an arriving crowd; cap engaged attackers at MAX_ATTACKERS = 3 and queue the rest. The donor has no cap; the arrival step of C is where the cap goes.
- Server-verified: the pull, the tracking budget and the hunter step all run on the server tick. The donor's own TODO (overmap.cpp line 1561, "throttle processing of monsters") says the per-tick budget is missing. Frankendom's server tick must have that budget from day one: row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget".
- One ledger: Nemesis_iteration belongs to the character, not to the zone, so it lives on the one character ledger and moves with them.
- Keep: distance-scaled pull; a louder signal extends but never shortens a pull; hunter speed by ground type; re-target by roll; escalation per death; hold-until-condition events; a telegraph before every reveal; self-rescheduling spread events.
- Change: hop-based zone distance; a per-tick budget; no integer decay (use time-based decay); cap the per-kill hit reduction so the hunter never becomes unkillable; fix defects 1-4 above; the reinforcement call becomes a server event with three attackers max.
- Rulings mapped: row 4 (fight loop: aggro, chase, leash) for the hunter and horde chase; row 23 (zone population: spawn caps, respawn, despawn with grace) for the spawn blocks and the decay; row 17 (death and respawn presentation) for the hunter's return; row 19 (fight record) for the kill counter.

## 5. A 5-minute look test
Target file: src/fight/pursuit.ts (new module for the hunter step and the signal pull). Row: 4 (fight loop: aggro, chase, leash).
On a phone-width zone map (3 by 3 zones: a road cross, fields, a forest block):
1. Place the hunter token in one corner and the player in another. Tap "advance 2.5 minutes" forty times. Watch the hunter stay still on dirt, creep on fields, and sprint along the road cross. Judge: does it feel like it always comes and never teleports?
2. Tap "shout" with the player at a distance. Six idle tokens wake only inside the pull radius, count down their tracking (distance-scaled, shown as a bar), then stop. Shout again from closer: the bar extends, never shrinks. Compare a second build where every token moves the full time regardless of distance.
3. Kill the hunter in the test, watch it return with one point less damage per hit and a little more speed. Judge whether the return feels fair or like a wall.
Pass when: the hunter reads from a single glance at 375 wide; the shout reads as a pull; a repeat kill reads as harder without a wall of numbers.

## 6. Licence and IP
Code and content: CC BY-SA 3.0 Unported (LICENSE.txt line 1; the project README also states this per the prior audit). Share-alike applies to anything copied; this note copies no data, text or art. Shape only: the pull, the escalation and the terrain-weighted hunter are mechanisms; their values are ours. Recreate as a clearly distinct original: name the pursuer ours (not "nemesis" or "hulk"), keep the terrain-weighted chase and the distance-scaled pull, change the escalation curve and the reinforcement rule. No legal conclusion is drawn.

## 7. Gaps
- Not read: src/event.cpp, src/event_bus.cpp and src/event_statistics.cpp beyond the event-type count (about 120 typed events in src/event.h; memorial logger subscribes); the UI for overmap and horde markers (overmap_ui.cpp, panels.cpp); the faction camp and mission_companion raids (scavenger and hospital raids); monster.cpp will_join_horde (line 4206); the body of the spawn-on-load path beyond the cited lines; the sound/ and gfx/ folders; mapgen; the full horde monster data.
- Not confirmed: whether any other system acts on ROBOT_ATTACK (grep says no in src/); how the enchantment combines the buff; the chance field of spawn blocks.
- Half read: both halves for the cited paths; client and UI not read.
- Idle and ambient behaviour, death presentation, loot reveal, walk density and 375-wide readability: not seen in the reads above beyond what the mechanics imply.
- Pairing: the donor is one folder with engine and data together; no second donor used.
