# flareteam-flare-engine (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityBehavior.cpp` | Licence: GPL-3.0-or-later (EntityBehavior.cpp header: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL version 3) | C++ | symbol `EntityBehavior::findTarget`, `checkMove`, `checkMoveStateStance`, `checkMoveStateMove`

Checked: The hint file src/EnemyGroupManager.h was opened and is spawn-group data (random enemy by category and level), not AI, so it is not the mechanism. Read in full: logic 82-107, findTarget 136-367, checkMove 443-620, checkMoveStateStance 622-651, checkMoveStateMove 653-710. updateState 752-990 read only at its start (animation and power switch; no target or move decision found there). Defaults and data: StatBlock.cpp 139-160, 799-808, 830, 847-848, 870-872, 1130 (inside StatBlock::logic at 1074; the rest of that function not read). Hero stealth: GameStatePlay.cpp 891-892, EntityManager.cpp 365. encounter_dist: Settings.cpp 260-262 (both branches visible, only the first is one of the two view-size formulas shown). Callers of EntityBehavior::logic: Entity.cpp 102 and EntityManager.cpp 367 (both read as call sites, their enclosing functions not read). Not read: checkPower 373-442 (attack-power choice), updateState body, the frame loop, Timer, Math::percentChanceF and percentChance, Utils::calcDist, the collider line-of-sight and path code, PATH_FOUND_FAIL_THRESHOLD, and the ally warp and blocking code. camera_scope not applicable. Confidence: high on the engage, leave, flee and chase order as written; medium on the time units (the timers are frame-based, the conversion to seconds was not read).

## 1. Mechanism

- Each enemy's `logic()` (82) does nothing until the hero comes within `encounter_dist` once; the `encountered` flag then stays set (91-96). The order per call is: doUpkeep, findTarget, checkPower, checkMove, updateState (99-103), then `fleeing` is cleared (105).
- Target (findTarget, 136-197). The hero is the default target and the distance is measured to it (158-161). The target is recomputed on every call, not held. An enemy looks at living hero allies (183): it takes the first one when there is no target (185-190) and then switches to any ally that is closer than the current target (191-195). A hero ally looks at non-allies that are in combat (183). This is not sticky, unlike the Evan donor.
- Line of sight is only checked inside threat_range (208-211), and the cooldown_los timer is reset whenever sight is seen (214).
- Join combat (222-256). The hero is compared with the stealth-scaled range `stealth_threat_range = threat_range * (100 - hero_stealth) / 100` (154, 224); other targets with threat_range (226). Join needs alive, not in combat, line of sight, close, and a combat style below passive (228). On join: a beacon power for non-allies (242-246), then the join-combat AI power (249-254), `in_combat = true` (235), and the join flag is cleared (256).
- Leave combat (258-275). A creature that is not aggressive leaves when the target is beyond threat_range_far (261-262), or when cooldown_los has been set and has run out (264-265). Either side dying also leaves (274-275). Pursuit target is the target's position (278), or the next waypoint when not in combat (287-292). A creature out of combat therefore goes back to its patrol route; that is the closest thing the donor has to a leash.
- Flee decision (313-328). Fear forces fleeing (313). Otherwise: in combat, in stance, not already moving to a safe distance, target inside flee_range, at or beyond melee_range, a chance_flee roll passes, and flee_cooldown has ended (316-326) starts a move to a safe distance.
- Flee direction (330-366). Five directions centred on the direction away from the target (335-339). Valid ones are kept (340-350); if the current facing is one of them it is taken alone (341-346). Otherwise a random valid one is picked (359-360). With no valid direction the flee is cancelled (353-357). The flee timer is armed only if it had ended (362-364).
- Movement (checkMove, 443-620). Not in combat: only patrol movement, and a moving creature drops to stance (460-467). In combat: the path is recalculated on a 5% chance per call that grows by 5 each call (504-506, 515-520 for the other reasons), then the creature faces the target (574) and runs checkMoveStateStance (stance, 584-586) or checkMoveStateMove (moving, 588-591). The flee and flee-cooldown timers tick here (580-581).
- Stance (checkMoveStateStance, 622-651). A flee-capable creature (chance_flee > 0) holds still when the target is at flee_range or beyond and it has no waypoints (625). Otherwise it starts moving when in combat and either beyond melee_range with a chance_pursue roll passing, or within melee range without line of sight (631). Fleeing also moves (633).
- Moving (checkMoveStateMove, 653-710). If the flee timer has ended, a chance_flee roll decides whether to keep fleeing: the stop condition is the roll failing, with the cooldown ability required (669). The timer is re-armed to one call while the roll keeps passing (671-676). The creature returns to stance when it is in melee with line of sight and not fleeing (680), or when it is fleeing and beyond flee_range (680), or when fleeing stops (680, and the flee cooldown is reset at 682). Otherwise it keeps moving; blocked moves try the next best angle (690-707).

## 2. Key functions

- `EntityBehavior::logic`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityBehavior.cpp` 82-107.
- `EntityBehavior::findTarget`: same file 136-367 (target 153-197, join 221-257, leave 258-275, flee decision 315-328, flee direction 330-366).
- `EntityBehavior::checkMove`: same file 443-620.
- `EntityBehavior::checkMoveStateStance`: same file 622-651.
- `EntityBehavior::checkMoveStateMove`: same file 653-710.
- Defaults and data: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 139-160, 799-808, 847-848, 870-872.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Engage radius shrinks with the hero's stealth: threat x (100 - stealth) / 100 | Stealth is a percent; copied from the hero each frame and capped at 100 (GameStatePlay.cpp 891); the donor applies it to the hero only (224 vs 226) |
| Two radii: engage at threat_range, stop at threat_range_far | threat_range_far defaults to 2 x threat_range (StatBlock.cpp 807); threat_range from creature data (801) |
| Line-of-sight grace: out of combat after the sight-loss timer runs out | cooldown_los is creature data (848), ticked in StatBlock::logic (1130); unit not read |
| Flee band between melee range and flee_range, with a per-call roll | flee_range defaults to threat_range / 2 (871); chance_flee defaults to 0 (140) |
| Flee cooldown after a flee stops | Default is settings->max_frames_per_sec (159), so the cooldown is in frames |
| Chase roll each call from stance, beyond melee range | chance_pursue defaults to 0 (139), a percent |
| Melee distance | melee_range defaults to 1.0 (145) |
| Path recalculation chance grows 5 per call | 5 (504) |
| Encounter gate: enemies sleep until the hero is near | encounter_dist from the view size (Settings.cpp 260-262) |

## 4. TypeScript sketch

simplified: the sketch keeps the engage and leave rules (two radii, the sight timer), the flee band with its roll and cooldown, the stop-flee roll, and the stance and moving decision including hold beyond flee range for a flee-capable creature. It applies the stealth-scaled engage range to every target (the donor applies it to the hero only) and adds a lower clamp on stealth that the donor does not have. It omits: the target choice among allies (findTarget 178-197), the beacon and join powers, the waypoint condition on the hold (625 also needs no waypoints), the can_attack condition on stopping a flee (669), the five-direction flee choice and the trapped cancel (330-357), the fear and effect flags, the path finding and collision, and power use. It uses seconds for all timers; the donor counts frames.

@@SKETCH@@

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module, proposed): the engage, leave and flee rules for a creature. Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism and was not translated line by line.
- Rolls per call: chance_pursue, chance_flee and the path-recalculation chance are rolled on every call of a frame loop, so their effect depends on the frame rate. Frankendom's server tick is fixed step, so every roll must be per server tick with a seeded RNG, or replays diverge (parity row 19, fight record).
- The target is re-chosen every call here. For many-on-one, Frankendom needs MAX_ATTACKERS = 3 applied after the choice. The donor has no attacker cap; its only rule is the nearest-ally switch (191-195).
- The flee band is a movement behaviour. A duel is a state change (addendum ruling), so a duel should not flee by moving; the flee rule belongs to zone creatures, or to the duel as a state with a server-side timer.
- The hero's stealth comes from a stat copied each frame (891-892). Frankendom would need that stat on the server, so the engage check is server-verified and not read from the client.
- No home leash: after leaving combat the donor returns to its waypoints (287-292). If Frankendom zones need a leash, the home point has to be zone data.
- Time units: the donor timers count frames. Frankendom's data should use seconds converted to server ticks, and the conversion must be tested.

@@BEST@@
