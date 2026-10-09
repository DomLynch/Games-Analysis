# flareteam-flare-engine (camera, cell 14)

Donor: /mnt/frankendom-donors/flareteam-flare-engine/src/Camera.cpp | Licence: GPL-3 | C++ | symbol Camera::logic / setTarget / warpTo
Symbol check: Camera::logic (49), setTarget (125) and warpTo (129) confirmed. Camera::logic is the per-frame step; setTarget only stores the goal.

## 1. Mechanism
- A 2D camera that eases toward a target point each frame. The target is set by setTarget (store only). warpTo (129-134) sets the camera position, shake point, target and previous target to the point, ends the shake timer (reset to END) and zeroes the speed memory.
- Per frame, logic() computes the distance from the camera position to the target, and the per-axis distances divided by a camera-speed setting. That gives the step size on each axis.
- Speed memory: if the target did not change this frame, and the camera is still or moving faster than a threshold, the step is stored as the new speed memory. If the camera is slow (within the threshold), it keeps the remembered speed when the new step is lower, or otherwise recomputes a minimum-speed step along the line to the target. When the target changes, the memory resets to zero.
- The camera moves toward the target on each axis by the step, and clamps at the target so it does not overshoot.
- Shake: each logic() call ticks shake_timer first (Timer::tick, Utils.cpp 212-220: decrement if above zero), then checks isEnd (current == 0). If ended, the shake point equals the camera position; otherwise each axis adds ((rand() % (2*shake_strength)) - shake_strength) * 0.0078125 (1/128), i.e. an integer in [-strength, strength-1] over 128. A timer set to N frames therefore shakes for N-1 calls. Shake is started elsewhere by setDuration: a crit inside Entity::takeHit (Entity.cpp 319; crit block 474-493; duration max_frames_per_sec/2, only when the entity that was hit is not the hero) and the SHAKYCAM event in EventManager.cpp 1140.
- Constants in the constructor (Camera.cpp 34-44): cam_threshold = camera_speed / LOGIC_FPS / 50 (line 41), shake_strength = 8 (line 42).
- The minimum-speed branch (lines 70-80) uses acos/cos/sin of the angle to the target: the step components are threshold times |dx|/delta and |dy|/delta, divided by camera_speed; it only updates the memory and does not change this frame's step.
- Inputs: target, camera position, camera speed setting, shake timer and strength. Output: camera position and shake point. Called once per MapRenderer logic pass (MapRenderer.cpp line 328, at the end of the pass); the threshold is derived from LOGIC_FPS, so it is tied to the logic tick rate.

## 2. Key functions
- Camera::logic (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/Camera.cpp | 49-123 | eases the camera toward the target with a speed memory, clamps overshoot, applies shake.
- Camera::setTarget (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/Camera.cpp | 125-127 | stores the target point only.
- Camera::warpTo (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/Camera.cpp | 129-134 | instant jump and reset of the speed memory.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Per-axis ease toward a target with step = distance / speed setting | camera_speed from the engine settings, eset->misc.camera_speed (theirs; Camera.cpp 53-54) |
| Speed memory: keep the faster step while the target is still, to avoid a stall | cam_threshold = camera_speed / LOGIC_FPS / 50 (theirs; Camera.cpp 41) |
| Clamp at the target to prevent overshoot | none (algorithm) |
| Random integer shake offset in [-strength, strength-1], times 1/128 | shake_strength = 8 (theirs; line 42) and the 0.0078125 scale (theirs; lines 120-121) |

## 4. TypeScript sketch
simplified: pos/target are plain objects (donor uses FPoint and a Timer class); rnd stands in for rand(); shake start (setDuration) is omitted; the donor's acos/cos/sin min-step is written as the equivalent |dx|/delta, |dy|/delta; the unreachable `else if (cam_delta < threshold)` test is folded into else.

```ts
// Licence: GPL-3 (flareteam-flare-engine). CLEAN-ROOM: from the mechanism, no donor lines.
interface P { x: number; y: number; }
interface Cam { pos: P; target: P; prevTarget: P; prevStep: P; threshold: number; speed: number;
  shakeLeft: number; shakeStrength: number; shake: P; }

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const toward = (p: number, t: number, s: number) =>
  p < t ? Math.min(p + s, t) : p > t ? Math.max(p - s, t) : p;

function step(c: Cam, rnd: () => number): void {
  const delta = dist(c.pos, c.target);
  let dx = dist({ x: c.pos.x, y: c.target.y }, c.target) / c.speed;
  let dy = dist({ x: c.target.x, y: c.pos.y }, c.target) / c.speed;
  const same = c.prevTarget.x === c.target.x && c.prevTarget.y === c.target.y;
  if (!same) {
    c.prevTarget = { ...c.target };                  // target changed: reset memory
    c.prevStep = { x: 0, y: 0 };
  } else if (delta === 0 || delta >= c.threshold) {
    c.prevStep = { x: dx, y: dy };                   // still or fast: remember the step
  } else if (dx < c.prevStep.x || dy < c.prevStep.y) {
    dx = c.prevStep.x; dy = c.prevStep.y;            // keep the remembered speed
  } else {
    // slow and not yet sped up: remember a minimum step of length `threshold` along the line to the
    // target (used on later frames); this frame's step is unchanged
    c.prevStep = {
      x: (c.threshold * Math.abs(c.pos.x - c.target.x) / delta) / c.speed,
      y: (c.threshold * Math.abs(c.pos.y - c.target.y) / delta) / c.speed,
    };
  }
  c.pos = { x: toward(c.pos.x, c.target.x, dx), y: toward(c.pos.y, c.target.y, dy) };
  if (c.shakeLeft > 0) c.shakeLeft -= 1;                // tick first, as the donor does
  if (c.shakeLeft > 0) {
    const r = () => Math.floor(rnd() * 2 * c.shakeStrength - c.shakeStrength) * 0.0078125; // theirs scale
    c.shake = { x: c.pos.x + r(), y: c.pos.y + r() };
  } else {
    c.shake = { ...c.pos };
  }
}

function warpTo(c: Cam, t: P): void {
  c.pos = { ...t }; c.shake = { ...t }; c.target = { ...t }; c.prevTarget = { ...t };
  c.prevStep = { x: 0, y: 0 }; c.shakeLeft = 0;
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (today: src/camera* (moving)). Speed-memory and clamp-at-target are candidates for a 2D or top-down framing, if Frankendom uses one.
- Parity-checklist row: 11 (fight camera, camera kick, standoff); the shake trigger on crit also touches row 10 (hit impact).
- Reuse tag: rewrite-from-idea (GPL-3; the ease with a speed memory is the idea)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- 2D only. Frankendom's fight camera needs a 3D or chase model, so the per-axis step is a 2D shortcut.
- Shake uses an unseeded rand(). Frankendom ruling: server-verified kills and fight record/replay (row 19) must never read camera or shake state; shake stays client-only cosmetic, driven by hit events from the shared engine.
- The threshold and shake timer are per logic tick (LOGIC_FPS), not dt. Frankendom's engine steps at 60 Hz, so the constants can be kept per tick only if the camera is stepped inside the same fixed loop; otherwise convert to dt.
- One engine, zones as data: Zone 1 currently has its own follow cam (checklist row 11, "no"); this pattern would live in the shared src/fight/camera.ts and be used by the Pit client and zones alike, with no per-zone copy.
- The donor camera follows one target; it has no standoff framing for up to MAX_ATTACKERS = 3 attackers around the hero.
- Donor is GPL-3, so only the mechanism is described here.
