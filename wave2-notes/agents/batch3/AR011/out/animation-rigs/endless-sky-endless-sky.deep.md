# endless-sky-endless-sky (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Hardpoint.cpp` (with `Hardpoint.h`, `Armament.cpp`, `FireCommand.cpp`, `AI.cpp`, `Ship.cpp`, `Engine.cpp`, `ship/ShipAttributeCache.cpp`, `main.cpp`) | Licence: GPL-3.0-or-later (source headers, e.g. `source/Animate.h` lines 5-6; `copyright` file line 9 says `License: GPL-3+`; `license.txt` line 1 is the GPL v3 text) | C++ | symbols `Hardpoint::Aim`, `Hardpoint::TurnRate`, `Hardpoint::UpdateArc`, `Hardpoint::Fire`, `AI::AimTurrets`

Checked: No skeleton, skinning, bone, blend-tree, state-machine or ragdoll code exists in this donor. A case-insensitive grep of `source/` for those words found only sprite frames, UI scroll animation and blend modes (not read line by line). The closest real mechanism is the ship weapon mount: an attachment point with an arc, a turn rate and an aim command. Read in full: `Hardpoint::TurnRate`, `Hardpoint::Aim`, `Hardpoint::Step`, `Hardpoint::Fire` (both overloads), `Hardpoint::UpdateArc`, `Hardpoint::IsReady`, `Hardpoint::IsBlind`, `Armament::Aim`, `Armament::Step`, `FireCommand::Aim`, `FireCommand::SetAim`, `AI::AimTurrets` lines 3885-4041 and its callers (`AI.cpp` 909, 4929), `Ship::Move` aim call (2123), draw-layer loops (2292-2308), `Engine` calls (1919, 1990), `main.cpp` frame timer (315-316). Not read: `AI::AimTurrets` lines 3820-3884 (decoration and opportunistic branch), `Hardpoint::Install`, `Jam`, the anti-missile and tractor-beam functions. Confidence: high for the aim, arc, turn-rate and fire-origin path; the harmonization function (`HarmonizedAngle`, 119-135) is read but its callers were not searched. camera_scope: not a camera cell.

Best transferable idea: Cap a joint's turn speed per step, clamp it to its arc so it never passes the limit, and pick the target by time-to-turn plus time-to-hit, so one look-at constraint serves a creature head, a hero arm or a weapon mount.
Decision (proposed): adapt — the rate-capped, arc-clamped look-at fits creature heads and hero weapon arms as client-only cosmetics; the ship-turret parts (blind spots, idle sweep, harmonization) do not fit a biped and are not taken.
Acceptance: In the Pit a creature turns its head toward its current target at its data turn rate and stops at its neck limit; a client test asserts the head changes by no more than rate x dt per frame and never leaves its arc, and a server test asserts the same exchange resolves identically with the head aim forced to 0 and to 90 degrees.

## 1. Mechanism

- A mount (`Hardpoint`) is an attachment point on the hull. Its data: an offset `point` from the ship centre (rotated with the hull), a `baseAngle` (fire direction for a gun, idle direction for a turret), a `minArc`/`maxArc` range, a flag for turret vs gun, an `isOmnidirectional` flag, a draw layer `side` (OVER / UNDER / INSIDE), and a per-mount `turnMultiplier` (`Hardpoint.h` 53-60, 150-165).
- The effective arc is set by `UpdateArc` (523-568), which runs in the constructor (Hardpoint.cpp 55) and on install and uninstall (389, 426). The weapon's own arc (`Arc()`) can narrow the mount's arc. The narrowed arc is centred on `baseAngle` as far as the mount allows (the centring rule is at 554-566). A newly built mount is not narrowed (weapon arc treated as 360, 545).
- Turn rate: `TurnRate(ship) = weapon TurretTurn x (ship multiplier + mount turnMultiplier)` (139-145). The ship multiplier is `1 + "turret turn multiplier"` attribute (`ShipAttributeCache.cpp` 318). The per-mount term is added to the ship multiplier, not multiplied by it (144). A mount can aim only when `TurnRate` is non-zero (`CanAim`, 198-200).
- Aim step: `Ship::Move` calls `armament.Aim(*this, firingCommands)` (Ship.cpp 2123), which calls `Hardpoint::Aim(ship, amount)` for every mount (Armament.cpp 230-233). `amount` is the command, stored as a `signed char` and read back as `/127` (FireCommand.h 69; FireCommand.cpp 136, 156), clamped to [-1, 1] on write. `Aim` adds `TurnRate x amount` (271). An omnidirectional mount adds it with no limit (272-273). A limited mount: if the add would cross an arc end, the angle is set to that end (277-280); otherwise it adds (282). So the joint never leaves its arc, and it stops at the limit rather than overshooting.
- The AI writes the command. `AI::AimTurrets` (3820) is called from `AI::Step` (909, in `AI.cpp` 732) and from a second site at 4929 (enclosing function not confirmed). With targets present (3930-4041), each mount that can aim scores each candidate:
  - angle to the aim point, clamped to the arc; if the point is outside the arc, add 2 shot lifetimes to its rendezvous time and aim at the nearer arc edge (4007-4023, penalty 4013);
  - rendezvous time minus one shot lifetime, floored at zero (3995);
  - turn time = |degrees| / TurnRate (4025);
  - score = turn time + (180 / TurnRate) x rendezvous time (4027).
  The lowest score wins. The command is `bestAngle / TurnRate` (4036), which `SetAim` clamps to [-1, 1]. If the target is in range and within 1 degree, the mount is flagged on target (4039-4040).
- Idle with no targets: a focused turret or mount returns to its idle angle (3892-3903; the command is `offset / TurnRate` at 3900, so it runs at full rate when far and lands exactly when near). An opportunistic one sweeps: a stationary mount starts moving with probability 1/60 (`Random::Int(60)`, 3914), then its command is a random walk of step 0.1 with a bias toward the idle angle (3924).
- Fire: the projectile overload of `Hardpoint::Fire` (291-319) sets the aim as the hull facing plus the mount angle (302). The muzzle is the hull-rotated mount point (299) plus the weapon's own `HardpointOffset` rotated by the aim (303). Inaccuracy is added last (307). Then the projectile is created at that start point (312).
- Gates: `IsReady` requires the burst reload to be at zero, a burst count left, and not being in a blind spot unless the weapon is special (206-209). A blind spot is an angle range from the mount's `blindspots` list, added to `baseAngle` (214-221).
- Counters: `Hardpoint::Step` counts `reload` and `burstReload` down by 1 per call; when `reload` reaches zero, `burstCount` is reset (243-260). `Armament::Step` calls it for every mount (Armament.cpp 288-291), and `Ship::Fire` ends with `armament.Step(*this)` (Ship.cpp 2763). `Engine::MoveShip` (Engine.cpp 1904) calls `ship->Move` (1919) and `ship->Fire` (1990); its caller is in the engine step (not read), and the engine frame timer targets 60 (main.cpp 315-316). So every counter and every aim step counts calls, which are frames, not seconds.
- Draw layers: `UNDER` mounts are drawn before the hull, `OVER` mounts after it (Ship.cpp 2292-2294 and 2306-2308). The mount's `side` value is set from data (`over`, `inside`, `under`, Ship.cpp 643-648).
- Tick: each step is a frame. No dt. Turn speed per frame is the `TurnRate` value; a frame that is slow turns a mount less far.

## 2. Key functions

- `Hardpoint::TurnRate`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Hardpoint.cpp` 139-145 (turn rate = weapon turn x (ship multiplier + mount term)).
- `Hardpoint::Aim`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Hardpoint.cpp` 266-284 (per-step move, arc clamp at the ends, omnidirectional branch).
- `Hardpoint::UpdateArc`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Hardpoint.cpp` 523-568 (arc narrowed by the installed weapon, centred on base angle).
- `Hardpoint::Fire` (projectile overload): `/mnt/frankendom-donors/endless-sky-endless-sky/source/Hardpoint.cpp` 291-319 (muzzle position and aim chain). Counter overload `Fire(ship, start, aim)`: 492-518.
- `Hardpoint::Step`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Hardpoint.cpp` 243-260 (frame-count reload and burst).
- `AI::AimTurrets`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/AI.cpp` 3820 (header), target scoring 3929-4041 (read), idle and sweep 3892-3927 (read).
- `Armament::Aim` and `Armament::Step`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Armament.cpp` 230-234 and 288-300.
- `FireCommand::SetAim` and `FireCommand::Aim`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/FireCommand.cpp` 136 and 152-157 (clamp to [-1, 1], 127 steps; storage `FireCommand.h` 69).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where it lives) |
|---|---|
| Joint turns at most `rate x dt` per step, and snaps onto the target when it is in reach | `add = TurnRate x amount` (Hardpoint.cpp 271); the AI sets `amount = bestAngle / TurnRate` (AI.cpp 4036), so the joint moves full speed when far and exactly when near |
| Clamp to the arc, do not overshoot | Arc ends (Hardpoint.cpp 277-280); arc per mount from data, intersected with the weapon's arc (545-566) |
| Speed = base x (ship multiplier + mount bonus) | Ship multiplier base 1 (ShipAttributeCache.cpp 318); mount term added, not multiplied (Hardpoint.cpp 144); the base `turret turn` value is per weapon data (values not read in context) |
| Score = turn time + weighted hit time | Weight 180 degrees per rendezvous unit (AI.cpp 4027) |
| Out-of-arc penalty | 2 x shot lifetime (AI.cpp 4013) |
| Subtract one shot lifetime from hit time | 1 x lifetime, floored at zero (AI.cpp 3995) |
| Stationary sweep starts with probability 1/60 | `Random::Int(60)` (AI.cpp 3914) |
| Command resolution | 127 steps per unit (FireCommand.cpp 136, 156) |
| Frame rate used for all timers | 60 (main.cpp 315) |

## 4. TypeScript sketch

simplified: the sketch uses seconds and degrees (the donor counts frames and uses its own per-frame turn value). It takes the candidate list as input (the donor builds it from bodies and their velocities, and handles the beam case and the no-intersection fallback `max(distance / speed, 2 x lifetime)` at AI.cpp 3985-3986, none of which is in the sketch). It omits the harmonization angle, blind spots, the omnidirectional mount in `pickTarget`, the idle return and random sweep, the on-target flag, and the 1/127 command quantisation. The arc clamp is applied to the target before the rate step, so the joint stops at the arc end as the donor does (Hardpoint.cpp 277-280); the two are not step-for-step identical.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One rig joint (a head, an arm, a turret barrel) that turns toward a target at a capped rate, inside an arc.
// Units here are seconds and degrees; the donor counts frames.

interface AimJoint {
  yawDeg: number;             // current yaw of the joint, relative to its parent (degrees)
  turnRateDegPerSec: number;  // base turn speed, from creature or weapon data (degrees per second)
  turnMultiplier: number;     // 1 + creature-wide bonus, plus this joint's own bonus (ratio)
  minArcDeg: number;          // lower limit, relative to the parent
  maxArcDeg: number;          // upper limit, relative to the parent
  omnidirectional: boolean;   // true = no limits (a free-spinning mount)
}

interface Candidate {
  angleDeg: number;           // signed angle from the current yaw to the aim point
  inArc: boolean;             // true if the aim point lies inside the joint's arc
  rendezvousSec: number;      // time for a shot to reach the aim point (seconds)
}

// Degrees the joint may turn in one step of dt seconds.
function maxTurnDeg(j: AimJoint, dt: number): number {
  return j.turnRateDegPerSec * j.turnMultiplier * dt;
}

// Move the joint toward a target yaw, at most its turn rate per step, never past its arc.
// Snaps exactly onto the clamped target when it is within reach.
function stepAim(j: AimJoint, targetDeg: number, dt: number): number {
  const goal = j.omnidirectional
    ? targetDeg
    : Math.min(j.maxArcDeg, Math.max(j.minArcDeg, targetDeg));
  const delta = goal - j.yawDeg;
  const limit = maxTurnDeg(j, dt);
  j.yawDeg += Math.max(-limit, Math.min(limit, delta));
  return j.yawDeg;
}

// Choose the aim point. Score = time to turn + weighted time to hit. A target outside the
// arc gets a penalty of 2 shot lifetimes. The 180-degree weight converts turn time into hit time.
function pickTarget(j: AimJoint, cands: Candidate[], lifetimeSec: number): Candidate | undefined {
  const rate = maxTurnDeg(j, 1); // degrees per second
  if (rate <= 0) return undefined;
  let best: Candidate | undefined;
  let bestScore = Infinity;
  for (const c of cands) {
    let rendezvous = Math.max(0, c.rendezvousSec - lifetimeSec);
    if (!c.inArc) rendezvous += 2 * lifetimeSec;
    const turnTime = Math.abs(c.angleDeg) / rate;
    const score = turnTime + (180 / rate) * rendezvous;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
```

## 5. Lands in

- TARGET `src/fight/aim.ts` (new, client-only pure helper; the creature actor and the hero actor call it to turn a head, an arm or a weapon mount toward the current target). It is not a fight rule: it never reads or writes health, hit results or kills.
- Parity-checklist row 7 (creature actor/clips). Row 6 (hero actor) would also fit the head-look use, but the first consumer is creatures, so row 7 is the one named.
- today: the Frankendom repo was not read; no current aim or look-at code is claimed.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape taken, no lines copied)
- Brief rule served: one engine (the aim is a client helper, hit decisions stay in the fight step); zones as data (turn rate, arc and multiplier come from creature data); MAX_ATTACKERS = 3 (the candidate list is bounded by the attackers that are engaged).

## 6. Gaps and risks

- The donor counts frames. `Hardpoint::Step` decrements by 1 per call and `Aim` adds the turn rate per call, with a 60 frame target (main.cpp 315-316). A slow frame therefore turns a mount less far and holds a reload longer. Frankendom must use elapsed time (`dt`) in the client helper so 30 fps and 60 fps look alike. The frame timer code (`FrameTimer`) was not read.
- Aim is cosmetic here and must stay that way. In the donor, a mount's aim decides where a projectile starts and goes, and the projectile then decides the hit. In Frankendom, kills are server-verified and the server must not read the joint angle. The acceptance test above is the guard.
- The donor's rendezvous time uses projectile speed and shot lifetime (AI.cpp 3952-3996). Frankendom's close-range fight is not a projectile sim; the rendezvous term is only useful for ranged creatures and must be fed by whatever ranged rule the fight engine uses, not invented in the helper.
- The 180-degree weight and the 2-lifetime penalty are donor heuristics, not measured values. Frankendom should keep them as engine constants (a rule of the helper), not zone data, and tune them with a test.
- Turn rates and arcs are data per creature and per weapon. The donor's values were not read in context (the key `turret turn` appears in data files; only the key name was grepped). Frankendom needs its own numbers.
- The idle random sweep (AI.cpp 3914-3924) is an AI behaviour, not a rig rule. It belongs to the AI brain (row 2), not to this helper.
- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
