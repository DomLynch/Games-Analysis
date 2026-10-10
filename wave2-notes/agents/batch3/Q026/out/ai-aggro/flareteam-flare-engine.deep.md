# flareteam-flare-engine (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityBehavior.cpp` | Licence: GPL-3.0-or-later (EntityBehavior.cpp header: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL version 3) | C++ | symbol `EntityBehavior::findTarget`, `checkMove`, `checkMoveStateStance`, `checkMoveStateMove`

Checked: The hint file src/EnemyGroupManager.h was opened and is spawn-group data (random enemy by category and level), not AI, so it is not the mechanism. Read in full: logic 82-107, findTarget 136-367, checkMove 443-620, checkMoveStateStance 622-651, checkMoveStateMove 653-710. updateState 752-990 read only at its start (animation and power switch; no target or move decision found there). Defaults and data: StatBlock.cpp 139-160, 799-808, 830, 847-848, 870-872, 1130 (inside StatBlock::logic at 1074; the rest of that function not read). Hero stealth: GameStatePlay.cpp 891-892, EntityManager.cpp 365. encounter_dist: Settings.cpp 260 and 262 (the branch condition at 259 not read). Caller of EntityBehavior::logic: Entity.cpp 102 (behavior->logic()); EntityManager.cpp 367 calls each entity's logic (Entity::logic body not read). Not read: checkPower 373-442 (attack-power choice), updateState body, the frame loop, Timer, Math::percentChanceF and percentChance, Utils::calcDist, the collider line-of-sight and path code, PATH_FOUND_FAIL_THRESHOLD, and the ally warp and blocking code. camera_scope not applicable. Confidence: high on the engage, leave, flee and chase order as written; medium on the time units (the timers are frame-based, the conversion to seconds was not read).

## 1. Mechanism

- Each enemy's `logic()` (82) does nothing until the hero comes within `encounter_dist` once; the `encountered` flag then stays set (91-96). The order per call is: doUpkeep, findTarget, checkPower, checkMove, updateState (99-103), then `fleeing` is cleared (105).
- Target (findTarget, 136-197). The hero is the default target and the distance is measured to it (158-161). The target is recomputed on every call, not held. An enemy looks at living hero allies (183): it takes the first one when there is no target (185-190) and then switches to any ally that is closer than the current target (191-195). A hero ally looks at non-allies that are in combat (183). This is not sticky, unlike the Evan donor.
- Line of sight is only checked inside threat_range (208-211), and the cooldown_los timer is reset whenever sight is seen (214).
- Join combat (222-256). The hero is compared with the stealth-scaled range `stealth_threat_range = threat_range * (100 - hero_stealth) / 100` (154, 224); other targets with threat_range (226). Join needs alive, not in combat, line of sight, close, and a combat style below passive (228). On join: a beacon power for non-allies (242-246), then the join-combat AI power (249-254), `in_combat = true` (235), and the join flag is cleared (256).
- Leave combat (258-275). A creature that is not aggressive leaves when the target is beyond threat_range_far (261-262), or when cooldown_los has been set and has run out (264-265). Either side dying also leaves (274-275). Pursuit target is the target's position (278), or the next waypoint when not in combat (287-292). A creature out of combat therefore goes back to its patrol route; that is the closest thing the donor has to a leash.
- Flee decision (313-328). Fear forces fleeing (313). Otherwise: in combat, in stance, not already moving to a safe distance, target inside flee_range, at or beyond melee_range, a chance_flee roll passes, and flee_cooldown has ended (316-326) starts a move to a safe distance.
- Flee direction (330-366). Five directions centred on the direction away from the target (335-339). Valid ones are kept (340-350); if the current facing is one of them it is taken alone (341-346). Otherwise a random valid one is picked (359-360). With no valid direction the flee is cancelled (353-357). The flee timer is armed only if it had ended (362-364).
- Movement (checkMove, 443-620). Not in combat: only patrol movement, and a moving creature drops to stance (460-467). In combat: the path-recalculation chance accumulates by 5 per call (504), with a roll (506), and is reset to -100 after a recalculation (534, 541); a recalculation is also forced when the creature collided, has no path, or the target moved more than one tile (511-520), then the creature faces the target (574) and runs checkMoveStateStance (stance, 584-586) or checkMoveStateMove (moving, 588-591). The flee and flee-cooldown timers tick here (580-581).
- Stance (checkMoveStateStance, 622-651). A flee-capable creature (chance_flee > 0) holds still when the target is at flee_range or beyond and it has no waypoints (625). Otherwise it starts moving when in combat and either beyond melee_range with a chance_pursue roll passing, or within melee range without line of sight (631). Fleeing also moves (633).
- Moving (checkMoveStateMove, 653-710). If the flee timer has ended, a chance_flee roll decides whether to keep fleeing: the stop condition is the roll failing, and an attack power must be off cooldown (can_attack, 654-667; stop_fleeing, 669). The timer is re-armed to one call while the roll keeps passing (671-676). The creature returns to stance when it is in melee with line of sight and not fleeing (680), or when it is fleeing and beyond flee_range (680), or when fleeing stops (680, and the flee cooldown is reset at 682). Otherwise it keeps moving; blocked moves try the next best angle (690-707).

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

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Threat {
  threatRange: number;     // engage radius in tiles
  threatRangeFar: number;  // disengage radius (donor default: 2x threatRange)
  fleeRange: number;       // flee radius (donor default: threatRange / 2)
  meleeRange: number;      // attack distance in tiles (donor default 1)
  chancePursue: number;    // percent per tick, stance -> move, beyond melee range
  chanceFlee: number;      // percent per tick, start and continue a flee
  losCooldown: number;     // seconds without line of sight before leaving combat
  fleeCooldown: number;    // seconds before a new flee may start
  fleeDuration: number;    // minimum seconds of a flee
}

export interface Foe {
  dist: number;   // tiles from the creature
  los: boolean;   // line of sight, only meaningful inside threatRange
  alive: boolean;
}

export interface AiState {
  inCombat: boolean;
  stance: boolean;      // true = standing, false = moving
  fleeing: boolean;
  losTimer: number;     // seconds since last line of sight
  fleeTimer: number;    // seconds left of the minimum flee
  fleeCooldown: number; // seconds left before the next flee
}

// Engage distance shrinks with the hero's stealth percent (0 to 100).
export function engageRange(t: Threat, heroStealthPct: number): number {
  const s = Math.min(100, Math.max(0, heroStealthPct)); // sketch adds the lower clamp
  return (t.threatRange * (100 - s)) / 100;
}

// Join and leave combat. Called once per tick with dt in seconds.
export function updateCombat(st: AiState, t: Threat, foe: Foe, heroStealthPct: number, dt: number): void {
  const los = foe.alive && foe.dist < t.threatRange && foe.los;
  st.losTimer = los ? 0 : st.losTimer + dt;
  st.fleeTimer = Math.max(0, st.fleeTimer - dt);
  st.fleeCooldown = Math.max(0, st.fleeCooldown - dt);

  if (!st.inCombat) {
    if (los && foe.dist < engageRange(t, heroStealthPct)) st.inCombat = true;
    return;
  }
  if (!foe.alive || foe.dist > t.threatRangeFar || st.losTimer >= t.losCooldown) {
    st.inCombat = false;
    st.fleeing = false;
  }
}

// Start a flee: standing, in combat, inside flee range but not in melee, roll passes, cooldown done.
export function maybeStartFlee(st: AiState, t: Threat, foe: Foe, rand: () => number): void {
  if (!st.inCombat || !st.stance || st.fleeing) return;
  if (foe.dist < t.fleeRange && foe.dist >= t.meleeRange && rand() * 100 < t.chanceFlee && st.fleeCooldown <= 0) {
    st.fleeing = true;
    st.fleeTimer = t.fleeDuration;
  }
}

// Keep fleeing past the minimum duration only while the per-tick roll passes; otherwise stand and start the cooldown.
export function checkStopFlee(st: AiState, t: Threat, rand: () => number): void {
  if (!st.fleeing || st.fleeTimer > 0) return;
  if (rand() * 100 < t.chanceFlee) return;
  st.fleeing = false;
  st.stance = true;
  st.fleeCooldown = t.fleeCooldown;
}

// Movement decision for the tick: hold, move toward the foe, or attack (in melee with line of sight).
export function movement(st: AiState, t: Threat, foe: Foe, rand: () => number): "hold" | "move" | "attack" {
  if (!st.inCombat) return "hold";
  if (st.stance) {
    // fleeing always moves (donor 631 'fleeing ||' clause)
    if (st.fleeing) {
      st.stance = false;
      return "move";
    }
    // a flee-capable creature holds position beyond flee range (donor 625)
    if (foe.dist >= t.fleeRange && t.chanceFlee > 0) return "hold";
    const pursue = foe.dist > t.meleeRange && rand() * 100 < t.chancePursue;
    const reposition = foe.dist <= t.meleeRange && !foe.los;
    if (pursue || reposition) {
      st.stance = false;
      return "move";
    }
    return foe.dist <= t.meleeRange && foe.los ? "attack" : "hold";
  }
  // already moving: stop only in melee with line of sight, not while fleeing
  if (foe.dist < t.meleeRange && !st.fleeing && foe.los) {
    st.stance = true;
    return "attack";
  }
  return "move";
}
export {};
```

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

Best transferable idea: Engage and leave use two radii (a shorter one to start combat, about twice that to stop it), and a creature drops combat only after it has lost line of sight for a set time, which gives zone creatures a stable aggro band that does not flicker.
Decision (proposed): adapt - take the two-radius engage and leave rule and the sight-loss timer for zone creatures, and keep the flee band as data, but run every roll as a seeded server rule per tick rather than a per-frame client roll.
Acceptance: A zone server test: a creature starts combat when the hero enters its engage radius with line of sight, stays in combat until the hero is beyond the stop radius or sight has been gone for the cooldown, and the same seed gives the same engage tick on replay.
Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (engage and leave are engine rules, not client); zones as data for the radii and timers
