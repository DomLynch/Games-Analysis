# Warzone 2100 (RTS, boss-staging, depth full)

Donor: Warzone2100-warzone2100 at /mnt/frankendom-donors/Warzone2100-warzone2100 (VPS). Licence: GPL-2.0-or-later for source and data (COPYING:2; COPYING.README:14-16), videos and music not covered, some art CC BY-SA 3.0 or CC0 (COPYING.NONGPL:6, :45). Shape only. Nothing copied.

Checked: campaign mission scripts data/base/script/campaign/cam2-2.js, cam3-1.js, cam1-3.js, cam1-1s.js (comment only); libcampaign_includes/nexus.js, misc.js, video.js, tactics.js (line 20); stats data/base/stats/brain.json, data/mp/stats/brain.json, data/mp/stats/research.json (lines 33, 38), data/base/stats/weapons.json (21 VTOL weapons); C++ src/cmddroid.cpp, src/droid.cpp (getDroidLevel, getDroidEffectiveLevel, droidWithinCommanderRange, getNumAttackRuns, vtolHappy, updateVtolAttackRun), src/wzapi.cpp:2703-2709 (getMissionTime), src/quickjs_backend.cpp:1545. Decision: adapt (idea), defects fixed in the sketch list below. Confidence high on the rules listed. Best transferable idea: a boss with a small escort that turns and runs only on one half of its route when hit, heals, then returns; its doom clock is a cue list the server drops when late.

## 1. What the player sees and feels (375 wide)
- Escape and return. The enemy commander walks a set route. When it reaches the second zone, a sound plays ("enemy escaping", cam2-2.js:92) and nearby weapon units are told to defend a point with radius 10 (donor units) and repair at 67% health (cam2-2.js:89). If the player hits the commander after it has left the top third of the map, it turns back to a defend point (radius 6, repair 67%) and its escort regroups (cam2-2.js:188-206). If it reaches the exit zone, the mission fails 0.3 s later (cam2-2.js:183-185).
- Doom clock. One mission timer drives a fixed list of sound cues at remaining times: 60 minutes down to 1 minute, then 25 s, 11 s, 2 s (launch list, 15 entries, cam3-1.js:340-354). When all four silos fall, the list is swapped for a detonation list of 14 entries (cam3-1.js:257, 357-370). At 375 wide the equivalent is a large number with a beep at fixed marks.
- Hack-takeover boss (Nexus). The first attack targets the HQ while the last-attack time is still zero (nexus.js:172-175). Later attacks pick a unit (20% of attempts, 40% after the first research step, nexus.js:178) or a building. A unit that is picked is taken over 70% of the time and destroyed 30% of the time (nexus.js:78; the neutralise branch queues a laugh at nexus.js:136).
- Reinforcements by transporter drop. The insane spawns send a minimum of 6 units (ground) or 8 (transporter) with a random extra of 5 or 2 (cam2-2.js insaneReinforcementSpawn, insaneTransporterAttack). The mission script gates its insane timer with camAllowInsaneSpawns() (cam3-1.js:239-242; the gate itself is misc.js:331-340).

## 2. Why it works, or is striking
- Readable beat: one state change (run, regroup, heal, return) that the player can see in one glance. My judgement, not measured: an escort of 1 to 3 units reads at 375 wide; the donor's escort of up to 6 (MP command limit, see section 3) would not.
- One signature behaviour: the turn-back only fires on part of the route (cam2-2.js:203, comment "only if the commander is escaping to the south"). A boss that only runs when hit in its exit half feels like a plan, not a bug.
- One signature sound: the escape cue, and the countdown cue ladder.
- Could be made ours at 20 to 30% resemblance: a boss with one or two escorts that runs to a shelter on one route half when hit, heals to 67%, and returns; a 60 s enrage clock with cue marks.

## 3. The rule behind it
- Escape state machine. Triggers: (a) boss enters escape zone, (b) hit while in the escape half, (c) state RETREAT to a point with a radius, (d) heal to a threshold, then return. Donor values: radius 6, repair threshold 67 (cam2-2.js:193); defend radius 10 for the nearby escort (cam2-2.js:84-92). Trigger is camCallOnce, so the retreat fires once (cam2-2.js:206).
- Repair threshold meaning, read in tactics.js:20: a health percentage at which the unit falls back to repair.
- Cue ladder. An ordered list of (time, sound). Each server poll (0.4 s, cam3-1.js:465) it looks at the head of the list only. If remaining time is at or below the cue time, it plays the cue, unless the clock is more than 2 s past it (then it drops the cue silently). Either way it removes the head and stops for this poll (cam3-1.js:262-282). So one cue per poll and a late window.
- Timer scaling by difficulty, not counts. camChangeOnDiff multiplies timers (misc.js:298-318): SUPEREASY 2.0, EASY 1.5, MEDIUM 1.0, HARD 0.85, INSANE 0.70, result floored. Counts are fixed.
- Commander escort rules (MP): capacity = 6 + 2 per rank index (mp brain.json:8-9, cmddroid.cpp:195), rank index from kill thresholds 0, 12, 24, 36, 48, 60, 72, 84, 96 (mp brain.json:14), produced commanders capped at 36 kills (mp brain.json:11, droid.cpp:1064-1070), so a new command unit leads 12 at most.

Data fields (our proposal, donor value null because the donor is GPL):
- boss_escape_radius_tiles (tiles), proposal 4 to 6
- boss_heal_threshold_pct (% HP), proposal 67
- escort_max (units), proposal 3, equal to MAX_ATTACKERS
- escort_rank_bonus (ranks), proposal +1 while attached
- doom_cue_window_s (s), proposal 2
- doom_cue_marks_s (s list), proposal 60, 30, 10, 5, 3, 1
- timer_mult_by_tier (x), proposal shape kept: normal 1.0, hard 0.85, insane 0.70

Defects in the donor, with fixes (keep the idea, fix the defect):
- video.js:68 waits a fixed 3.2 s after a sound before the next video, whatever the clip length. Fix: the client reports clip end and the server advances. No guessed durations.
- wzapi.cpp:2705-2707 returns -1 when no mission timer is active, and cam3-1.js:262 feeds that straight into the cue math. The cue list then drains silently one item per poll. Fix: guard the clock; never drain a cue list when the clock reads "no clock".
- getMissionTime returns whole seconds (wzapi.cpp:2709). Fix: keep the 2 s window; do not compare sub-second times.

## 4. For Frankendom
- 700 zones as data: the escape route, the shelter point and the escort gather point are zone data, one boss template reused across zones; the 100 Pit characters get a boss flag and a rank, not new models.
- Many-vs-one: escort_max 3 (MAX_ATTACKERS). The donor's 6-unit escort is too many for 375 wide. Rank bonus +1 on attach is kept.
- Server-verified: the retreat, the heal threshold and the clock are server state. The client plays the run animation, the cues and the camera (row 7 creature clips, row 11 fight camera, row 12 cues). The server sends state changes with server time; the client plays a cue only inside the 2 s window.
- Parity rows: row 4 fight loop (leash state for the retreat), row 23 zone population (escort respawn and despawn with grace timer), row 18 loot and XP (escort kills feed the boss rank, donor cmdDroidUpdateExperience cmddroid.cpp:199-206; server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" for one cue per poll), row 14 HUD (clock), row 17 death and respawn (boss death not read in donor).
- Keep: escape only on one route half; one cue per tick; late-window drop; heal-then-return.
- Change: escort max 3 not 6; fix the -1 clock sentinel; replace the fixed 3.2 s gap with client ack; the flee must be server state, not client-only.

## 5. Five-minute look test (Dom's phone)
- Build: one arena, one boss with 2 escorts, one health bar, one 60 s clock with cue marks at 60, 30, 10, 5 s. Style flag only, no release rows, published to the preview folder.
- Two variants on the same arena: (A) boss runs to a shelter when hit on its exit half, heals to 67%, returns; (B) boss stands and fights. Plus the clock on both.
- Judge at 375 wide: can you spot the boss within 2 s; does the run read as a plan; does the 10 s and 5 s beep make you move; does A make you chase or ignore it.
- Target file: src/fight/<module>.ts (module name not chosen; not read). One parity row: row 4 (leash).

## 6. Licence and IP
- GPL-2.0-or-later source and data (COPYING:2; COPYING.README:14-16), with a stated exception at COPYING.README:22. Not a legal conclusion. Videos and music are not part of the GPL release. Some art is CC BY-SA 3.0 or CC0 (COPYING.NONGPL).
- Shape only. Recreate as an original: our boss name, our route, our numbers. Keep the trait (escape on one half, heal then return); change the trait (escort 3 not 6, no guessed clip length, no clock sentinel).

## 7. Gaps
- Half read: both (mission scripts and stats data, plus C++ rules for commanders and VTOL). Not read: renderer, audio mixing, the MP skirmish scripts beyond grep, the three other campaign trees in data/mods/campaign/*, and most of the 52 cam*.js mission scripts (six sampled).
- Grep for "boss" found one hit in the donor (a chat script), so the word is not used; the donor calls the same role "commander".
- Idle and ambient behaviour, loot reveal, walk density: not applicable (RTS). Death presentation: commander exit is a mission fail with a 0.3 s delay; the death of a boss unit is not read.
- Readability at 375 wide: not applicable as shipped (RTS UI).

## MG011: dragons and boss abilities (table rows)
Rows give the donor structure, numbers as read, and our proposal in the last column. Mana and focus: none in this donor.

| name | effect | formula | number ranges (donor, read) | cost | cooldown or cast | caps | file:line |
|---|---|---|---|---|---|---|---|
| VTOL attack-run cycle (the only flight model) | each run spends one ammo; at the limit the unit must return to a pad | runs = numAttackRuns; salvo runs = numRounds x numAttackRuns | numAttackRuns: bombs 1, rockets and missiles 2 to 3, cannons and MG and rail 4 to 6 | ammo | rearm wait (timing not read) | cannot leave pad until ammo full and undamaged | droid.cpp:3343-3353, :3405-3406, :3358-3380; weapons.json:769, 939, 1064, 2323, 3010, 4058 |
| Command capacity | a commander leads a fixed count of units | 6 + 2 x rank index | rank index 0 to 8; capacity 6 to 22 | none | none | production cap at 36 kills (rank 3, so 12) | cmddroid.cpp:195; mp brain.json:8-9, 11, 14 |
| Attach rank bonus | attached unit's effective rank = max(own + 1, commander rank) | +1 flat while attached | autoRewardRankFromAttach true | none | none | none | droid.cpp:2547-2549; mp brain.json:3 |
| Escort XP to commander | escort kills add XP to the commander when inside range | squared distance check | range list only on the null fallback brain; command brain has an empty list | none | none | none | cmddroid.cpp:199-206; droid.cpp:1074-1098; brain.json (ZNULLBRAIN) |
| Hack ladder (mind-like takeover) | attempts pick a unit or building; units filtered by rank | unit chance 20 or 40; rank gate by research step; constructors 20, 50, 66 percent safe per step | kill thresholds 256, 64, 16 per step; step 4 safe in non-classic | none | attempt timer not read | final mission: static fail chance | nexus.js:78, 172-199, 207, 215, 223 |
| Dragons, breath cones, taming, mounts, armour per body part | none in this donor | n/a | n/a | n/a | n/a | n/a | grep src and data: no hits for dragon, breath, taming, dismount; no hit-location code |

Resource pools as data: the command unit has 500 hit points (mp brain.json:6). No mana, no stamina, no focus.

Proposal for a fast mobile fight (ours): the VTOL cycle becomes a flying boss with 3 runs, 2 to 3 s per run, then a 10 to 15 s perch rearm, with a cue on each run. Capacity: escort 3. Takeover: no mind-control on player units in PvP; a boss can take a building, not a player's hero.

## Reuse tag
Idea adapt; no code.

## Brief rule served
FEEL boss-staging; MG011 (dragons and boss abilities).
