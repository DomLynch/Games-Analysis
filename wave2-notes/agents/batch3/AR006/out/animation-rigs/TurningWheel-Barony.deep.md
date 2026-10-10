# TurningWheel-Barony (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/actmonster.cpp` (limb stepper, dispatch), `/mnt/frankendom-donors/TurningWheel-Barony/src/monster_g.cpp` (gremlin body-part mover), `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` (walk cycle, windup strike) | Licence: BSD-2-Clause (`LICENSE.txt` line 3: "licensed under the BSD 2-Clause License:"; code may be adapted) | C++ | symbol `limbAnimateToLimit`

Checked: Read in full: `limbAnimateToLimit` (actmonster.cpp 10935-11107, pitch branch in full, other axes skimmed), `limbAngleWithinRange` (11109-11127), `humanoidAnimateWalk` (entity.cpp 22175-22338), the chop branch of `handleWeaponArmAttack` (entity.cpp 21638-21709, MELEE_WINDUP1 and chop only), the monster branch of `Entity::attack` (entity.cpp 10175-10198), the per-tick counter at the end of `monsterGMoveBodyparts` (monster_g.cpp 1493-1500), the body-part loop (monster_g.cpp 674-700), the dispatch (actmonster.cpp 2595-2635, 10263-10275). The hint file `entity.cpp` was only partly right: the windup and walk are there, the stepper is in `actmonster.cpp`. Callers: I read the gremlin callers of `humanoidAnimateWalk` (monster_g.cpp 700, 833) and `handleWeaponArmAttack` (monster_g.cpp 824); other races are listed by grep but not read. Confidence: high on the stepper, the walk and the windup gate; medium on the server/client sync. Not read: `limbAnimateWithOvershoot` (actmonster.cpp 10754), the shake details, the other attack branches (entity.cpp 21727-21951), the strike resolution inside `attack(1)`, `serverUpdateEntitySkill` (how often the counter is re-sent), `setHumanoidLimbOffset` beyond its gremlin case (entity.cpp 28595). The `MONSTER_POSE_MAGIC_CAST3` value is not read.

Best transferable idea: Step each creature joint toward its windup target by a fixed rate per tick with snap-on-arrival, count the windup in ticks, and let only the server fire the strike when the count reaches the windup length.
Decision (proposed): adapt - the stepper and the tick-counted windup fit row 7 (creature clips), but the donor's per-limb sprites and the client-side counter do not; Frankendom keeps the strike as a server tick number and drives skeletal bones from the same clip data.
Acceptance: A creature in its windup pose holds the raised arm for the windup length (9 server ticks, 180 ms at 50 ticks per second) and the server test asserts exactly one strike event on tick windup_ticks after the windup pose is set, with no strike on any client tick.

## 1. Mechanism

- Each monster think, `actMonster` (actmonster.cpp 2652; its caller is not read, so "per tick" is inferred from the 50-per-second tick rate) computes the monster's speed `dist = sqrt(vel_x^2 + vel_y^2)` (actmonster.cpp 10267) and calls `monsterAnimate` (10274). `monsterAnimate` dispatches by race (2595-2635); the gremlin case calls `monsterGMoveBodyparts` (2635).
- The body-part mover walks the children list. The list index is the body part id (monster_g.cpp 674; `LIMB_HUMANOID_*` ids in monster.hpp 1106-1110). For each child it copies `x`, `y`, `z` and `yaw` from the parent (monster_g.cpp 687-697, yaw at 696). Legs and the other arm call `humanoidAnimateWalk(..., dist, 0.4)` (700, 833). The weapon arm calls `handleWeaponArmAttack` when an attack pose is active (824).
- Joint tween, `limbAnimateToLimit` (actmonster.cpp 10935). Each call: (a) the rate is scaled by `monsterGlobalAnimationMultiplier / 10` if it is not 10 (10944-10947); (b) the angle is wrapped into 0..2PI (10989-10995 for pitch); (c) if the angle is within one rate step of the setpoint (`limbAngleWithinRange`, 10998 and 11109-11113), it is set exactly to the setpoint and the call returns 1 (11000, 10983); (d) otherwise the angle is advanced by `rate` and the call returns 0 (11021). The sign of `rate` is chosen by the caller and decides the direction around the circle. Because of the wrap, a negative rate from angle 0 travels through 2PI.
- Attack pose. The AI calls `attack(pose)`. For a monster and a windup pose (entity.cpp 10175), `attack` only sets `monsterAttack = pose` (10180), resets the counter to 0 (10182), sends pose (skill 8) and counter (skill 9) to clients on the server (10193-10195), and returns (10198). No hit happens here.
- Counter. At the end of the body-part mover (monster_g.cpp 1493-1500): while the pose is in 1..MAGIC_CAST3 the counter `MONSTER_ATTACKTIME` (skill 9, monster.hpp 737) increments once per tick; pose 0 resets it to 0; any other value holds it.
- Chop windup and strike (entity.cpp 21670-21676). Each tick the arm tweens toward 5PI/4 at -0.25 per tick. When the counter reaches `ANIMATE_DURATION_WINDUP / (multiplier/10)` (9 at multiplier 10) and the code is not a client (21674), it calls `attack(1, 0, nullptr)` (21676). That call is the strike. The strike is therefore decided by the counter, and the counter is driven by the per-tick mover.
- Chop recovery. Forward to PI/3 at +0.4 per tick (21691), then back to 7PI/4 at -0.25 (21698), then `monsterAttack = 0` (21705). Setting the pose to 0 resets the counter on the next tick (monster_g.cpp 1497-1499).
- Walk cycle, `humanoidAnimateWalk` (entity.cpp 22175-22338). Leg branch, moving (`dist > 0.1`): the pitch decreases by `dist * walkSpeed` (22200) until it passes -PI/4 (22201), then the phase flips and it increases by the same step (22231) until it passes +PI/4 (22232). The phase of the right leg is read from the left leg's flag (22181, 22198). Stopped: the pitch eases toward 0 by `1 / max(dist * 0.1, 10)` per tick (22266 and 22274). Arm branch: same shape, with `armMoveSpeed = 0.5` when a ranged weapon is in the attack state (22290-22293) and the amplitude scaled to PI * armMoveSpeed / 4 (22299, 22308). The right arm is frozen while `monsterAttack == 0 && monsterAttackTime == 0` is false (22285).

## 2. Key functions

- `limbAnimateToLimit`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actmonster.cpp` 10935-11107. Per-tick joint tween with snap on arrival. Axes: yaw, pitch, roll, z, weapon yaw (other axes not read in full).
- `limbAngleWithinRange`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actmonster.cpp` 11109-11127. The window test; the sign of `rate` selects the side.
- `monsterGMoveBodyparts` (gremlin): `/mnt/frankendom-donors/TurningWheel-Barony/src/monster_g.cpp` 550-1505. Body-part loop (674-700), per-tick windup counter (1493-1500).
- `humanoidAnimateWalk`: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 22175-22338. Walk cycle, paired-leg phase, stop easing.
- `handleWeaponArmAttack` (chop branch only): `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 21638-21709. Windup, server-only strike, recovery.
- `Entity::attack` (monster branch): `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 10175-10198. Enters the windup pose and returns without a hit.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Joint tween: step by a fixed rate per tick, snap exactly onto the target when within one step | Joint rates: chop windup -0.25 rad per tick (entity.cpp 21670), forward chop +0.4 (21691), return -0.25 (21698) |
| Speed scale on all tween rates | Global multiplier 10 = 1.0x (actmonster.cpp 221); a debug knob, not a per-creature value |
| Windup counted in ticks; strike when the count reaches it | Windup 9 ticks (monster.hpp 1118), about 180 ms at 50 ticks per second (game.hpp 389; comment monster.hpp 1117) |
| Special windup as a multiple of the base | Gremlin special: 4 x 9 = 36 ticks, about 0.72 s (monster_g.cpp 749) |
| Walk stride proportional to speed per tick | Gremlin stride 0.13 per unit of distance (monster_g.cpp 548); footstep distance threshold 0.4 (700) |
| Walk clamp and phase flip | Clamp PI/4 (entity.cpp 22201, 22232) |
| Stop easing shrinks with speed | 1 / max(dist * 0.1, 10) per tick (entity.cpp 22266) |
| Ranged arm slows while in attack state | 0.5 (entity.cpp 22293) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: the angle is wrapped, then tested against one rate step, then snapped or advanced; the attack counter ticks only in a pose range and resets at pose 0; the strike gate divides the windup by the speed multiplier; the walk flips at the clamp and eases to rest. It omits: the shake, overshoot and yaw/roll/z axes; the head return; the right-leg phase that the donor reads from the left leg (entity.cpp 22198), so each limb here has its own phase; the leg-only wrap case at 22264; footstep sounds; the ranged-arm slowdown; the server/client split (the sketch runs the strike on one machine, so it does not show the donor's `multiplayer != CLIENT` gate). The pose cap passed to `tickAttackTimer` stands for `MONSTER_POSE_MAGIC_CAST3`, whose value is not read.

```ts
// Licence: BSD-2-Clause (donor LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const PI = Math.PI;
const TICKS_PER_SECOND = 50;   // donor: TICKS_PER_SECOND 50 (game.hpp)
const WINDUP_TICKS = 9;        // donor: ANIMATE_DURATION_WINDUP = 9 (monster.hpp)
const TWO_PI = 2 * PI;

interface Step { angle: number; reached: boolean; }

// One fixed tick of a joint tween. The caller passes a rate whose sign points from angle toward setpoint.
// Within one rate step of the target, snap onto it and report reached; otherwise advance by rate.
function stepJoint(angle: number, rate: number, setpoint: number, speedMult: number): Step {
  let a = angle % TWO_PI;
  if (a < 0) a += TWO_PI;
  const r = rate * speedMult;
  const near = r > 0
    ? (a <= setpoint + r && a >= setpoint - r)
    : (a >= setpoint + r && a <= setpoint - r);
  if (near) return { angle: setpoint, reached: true };
  return { angle: a + r, reached: false };
}

// Attack timer for one monster. pose 0 = idle; counts up only while pose is in 1..maxTickedPose.
interface Attack { pose: number; ticks: number; }

function tickAttackTimer(a: Attack, maxTickedPose: number): void {
  if (a.pose > 0 && a.pose <= maxTickedPose) a.ticks += 1;
  else if (a.pose === 0) a.ticks = 0;
  // any other value: hold the counter
}

// The strike is due when the counter reaches the windup length, scaled by the global speed multiplier (10 = 1.0x).
function strikeDue(a: Attack, windupTicks: number, speedMult10: number): boolean {
  return a.ticks >= windupTicks / (speedMult10 / 10);
}

// Walk cycle for one limb. dist is the monster's speed this tick; stride is radians per unit of distance.
interface Walk { pitch: number; phase: 0 | 1; }
const WALK_CLAMP = PI / 4;

function walkTick(w: Walk, dist: number, stride: number): void {
  if (dist > 0.1) {
    if (w.phase === 0) {
      w.pitch -= dist * stride;
      if (w.pitch < -WALK_CLAMP) { w.pitch = -WALK_CLAMP; w.phase = 1; }
    } else {
      w.pitch += dist * stride;
      if (w.pitch > WALK_CLAMP) { w.pitch = WALK_CLAMP; w.phase = 0; }
    }
  } else {
    const ease = 1 / Math.max(dist * 0.1, 10);
    if (w.pitch < 0) w.pitch = Math.min(0, w.pitch + ease);
    else if (w.pitch > 0) w.pitch = Math.max(0, w.pitch - ease);
  }
}

// Demo: a chop windup of 9 ticks at 50 ticks/s, then the strike.
const atk: Attack = { pose: 4, ticks: 0 };
let arm = { pitch: 0 };
let fired = false;
for (let t = 0; t < 20 && !fired; t++) {
  tickAttackTimer(atk, 15);
  const s = stepJoint(arm.pitch, -0.25, 5 * PI / 4, 1);
  arm.pitch = s.angle;
  if (strikeDue(atk, WINDUP_TICKS, 10)) fired = true;
}
const w: Walk = { pitch: 0, phase: 0 };
walkTick(w, 0.5, 0.13);

export {};
```

## 5. Lands in

- TARGET `src/fight/creature-clips.ts` (new client module): joint tween by fixed tick, clip data per creature, and the walk phase. The strike gate stays in the engine, `src/fight/` (server-owned tick counter). Parity-checklist row 7 (creature actor/clips).
- today: no creature rig in `src/fight/`; creature motion is not yet defined there (not read in Frankendom code by this pass).
- Reuse tag: rewrite-from-idea (BSD-2-Clause: code could be adapted; this note is clean-room, written from the mechanism)
- Brief rule served: 1 (one engine: the strike is decided on the server by a tick counter, the tween is client-only); rule 6 (zones as data: the windup and stride are per-creature data, not constants in the function).

## 6. Gaps and risks

- The donor counts the windup on every machine (the mover runs on clients too) and only the server fires the strike. Between replications of skill 9 the client counts its own ticks, so the two counters can drift. Frankendom should make the strike a server tick number and send the strike tick, not a client counter. How often the donor re-sends skill 9 is not read.
- `limbAnimateToLimit` steps once per call, not per second. Frankendom must step clips on the fixed server tick (or on accumulated fixed steps), not on the render frame, or the windup will run at the device frame rate.
- The wrap to 0..2PI means a negative rate from 0 travels the long way around (read at actmonster.cpp 10989-10995 and 10998-11021). Frankendom should state the direction in the clip data, or store angles in (-PI, PI], or the arm can swing the wrong way.
- The right-leg phase is read from the left leg's flag (entity.cpp 22198). This hidden coupling should be an explicit gait phase in data.
- The donor's global multiplier is a debug knob (actmonster.cpp 221, menu.cpp 8839 reset). Frankendom should treat clip speed as data, not a global dial.
- Limbs are separate sprite entities positioned by per-race offsets (`setHumanoidLimbOffset`, entity.cpp 28595, gremlin case only read). A skeletal three.js rig replaces this; the offsets become the bind pose, which is not in this note.
- Not verified: whether the arm reaches the raised window before the 9-tick gate fires. This is a timing question for a test, not something this pass measured.
- The strike resolution inside `attack(1)` (entity.cpp 10097-10300, the damage branch) belongs to the combat-sim topic and was not read here.
