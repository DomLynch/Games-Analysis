# PixelGuys-Cubyz (camera, cell 14)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/physics.zig` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Zig | symbol `calculateEyeMovement`

Checked: camera_scope: world camera (first-person eye in an open voxel world, not a third-person follow; the spring transfers to the follow offset only). Read end to end: `calculateEyeMovement` (physics.zig:420-512), `calculateVerticalCollisionEyeMovement` (physics.zig:593-614), the client update block that drives the eye (game.zig:621, crouch 762-793, eye spring call 809, landing call 824, clamp 830), the camera struct and rotation (game.zig:30-46), the render point (game.zig:140-143), mouse averaging (Window.zig:552-581, 809-815), and the main loop timing (main.zig:476-496). Confidence: high on the spring and step-kick math (I transcribed the donor's complex-number solver in plain JS on the VPS and it matched the sketch for underdamped and overdamped inputs; see section 6); medium on the crouch, landing and mouse parts (read, not run). Not read: `calculateWallCollision` past line 535, `collision.collideOrStep`, `steppingHeight()`, the `vec.Complex` type, the renderer's crosshair ray beyond its call at renderer.zig:240, the server side of the eye. Cubyz was not run.

Best transferable idea: a follow point driven by an exact closed-form damped spring, stepped by the real frame delta, with a velocity kick on step-up and on landing, so curbs and ledges move the camera smoothly without a fixed-step loop.
Decision (proposed): adapt - take the exact-step spring and the step-up/landing kicks for a third-person follow point; reject the first-person eye itself, because a third-person camera needs a shoulder offset, wall pull-in and lock-on framing that this donor does not have.
Acceptance: a client unit test asserts that one step of 1/30 s equals two steps of 1/60 s within 1e-9, and that a 0.1 m vertical offset with no kick returns to within 1 mm of rest in about 0.35 s (the z constants in section 3); aim rays stay on the unsprung pivot.

## 1. Mechanism

- The render point is `eye.pos + super.pos + eye.desiredPos` (game.zig:143). `super.pos` is the body. `eye.pos` is a 3D offset from the body, and `eye.desiredPos` is the crouch-blended rest height (game.zig:79, 793).
- Each client frame, `update(deltaTime)` (game.zig:621) runs in this order: crouch and box update (762-793); body motion and wall collision, which returns `stepAmount` (around 805-809); `calculateEyeMovement` (809); the vertical collision and landing eye rules (814-825); clamp of the eye into its box (830); coyote timer count-down (831).
- Inside `calculateEyeMovement` (physics.zig:420), the spring block runs only when `getBlockWithSide` returns a value for the body's cell (421). What `null` means there is not read. For each axis:
  - (a) The spring force is `-400 * pos / extent`, with extent = box max minus min (437-442). So the spring constant is k = 400 / extent, and the damping coefficient is 30 (432-436, 440).
  - (b) Step state: if `eye.step[i]` is set and `newPos * sign(vel)` is still at most -0.1 (for a rising eye, still at least 0.1 below rest), the eye moves at constant velocity and the spring is skipped (450-458).
  - (c) The z spring is skipped while the ledge coyote lock is active (460-461).
  - (d) Otherwise the eye is advanced by the closed-form solution of the damped spring over the real frame delta, for position and velocity (482-495). The constant `a` is `-k * pos` at the start of the frame, so the solution is exact for x'' + lambda x' + k x = 0 with the rest point at zero offset (checked, section 6).
- Step-up (499-511): when `stepAmount > 0` and the coyote lock is off, the z velocity becomes `max(1.5 * body speed, eye z velocity, 4)`. If the body is moving up, the z velocity is set to the body's vertical velocity and the step flag is cleared. With the coyote lock on, the kick is skipped and the lock is cleared (508). In both cases `eye.pos.z -= stepAmount` runs (510). This is after the spring in the same frame.
- Landing (physics.zig:593-614): when the body lands after being airborne, the eye's z velocity takes the previous fall speed, and the eye z offset absorbs the snap so the eye's world height stays continuous (597-598). When a vertical collision happens with a non-zero vertical velocity, the eye z velocity doubles (602-604). Walking off a ledge sets a coyote lock of `sqrt(2 * stepHeight / g) + dt` seconds; while it is active the eye z is held against the body's vertical motion (605-612), and the z spring is skipped (460).
- Crouch (game.zig:762-793): crouch when the mouse is grabbed and the key is pressed and the player is not flying (762). The crouch percentage changes by `dt * 10` per frame only while on the ground (770), is clamped to 0-1 (774), and is blended with smoothstep `3t^2 - 2t^3` (777). The outer box and the eye box are interpolated (779-792), and the eye's rest height moves from 1.7 to 1.3 (793). The change applies only when a head-room test passes (764).
- Mouse look (Window.zig:552-581): raw mouse delta times `mouseSensitivity` is added to the current slot of a 3-slot circular buffer. Each frame (`handleEvents`, Window.zig:809-814) the three slots are summed and divided by 3, applied with the scale 0.0089 (579), and the next slot is zeroed (581). Each event therefore counts in three consecutive frames at one third each, so the total is conserved and the look lags by about one frame (derived).
- Pitch is clamped to `+/- (pi/2 - 0.001)` (game.zig:37-38). Yaw (`rotation[2]`) is not clamped (game.zig:39-40, read). The view matrix is rebuilt each render from pitch and yaw only (game.zig:45; renderer.zig:203).
- Timing: `main.zig:481` takes the real time since the last frame. `game.update(deltaTime)` runs once per frame (490), and rendering uses `getEyePosBlocking()` (496). This is a variable step. The lines read (476-500) show no clamp on the client delta. The server does clamp its own update delta to 0.3 s (server/world.zig:1106-1108), but that is the server loop.
- Tick: per rendered frame. There is no accumulator and no fixed step on the camera.

## 2. Key functions

- `calculateEyeMovement`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/physics.zig` 420-512 (spring, step state, closed-form solve, step-up). It has one caller: `game.zig:809`, with `.client` side.
- `calculateVerticalCollisionEyeMovement`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/physics.zig` 593-614 (landing kick, ledge coyote lock).
- Eye drive and crouch, inside `update`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/game.zig` 621 onward; crouch 762-793; eye spring call 809; landing call 824; clamp 830.
- Camera struct and rotation: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/game.zig` 30-46.
- Mouse averaging: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/graphics/Window.zig` 552-581 (buffer, sum, scale), 809-815 (`handleEvents` calls the apply each frame).
- Frame loop: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/main.zig` 481-496.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damped spring pulls the eye offset to zero, solved in closed form over the real frame delta, so splitting a frame into two half-steps gives the same result | Force multiplier 400 (theirs, physics.zig:428-430); damping 30 (theirs, 433-435); k = 400 / extent per axis (derived) |
| Extent comes from the eye box, which is set from the outer body box on each frame where the head-room test passes (game.zig:764-792) | Standing outer extent 0.3 / 0.3 / 0.9 (theirs, game.zig:107); eye box z from -(0.9 - 0.2) = -0.7 to 0.9 - 0.05 = 0.85 (theirs, game.zig:790-791, derived extent 1.55); so k_x = k_y = 400 / 0.12 = 3333 and k_z = 400 / 1.55 = 258 (derived) |
| Per axis, with damping 30: x/y underdamped, damping ratio about 0.26, about 8.9 Hz (derived by hand); z underdamped but nearly critical, ratio about 0.93, about 0.9 Hz (derived by hand) | none beyond the constants above |
| Settling time, 0.1 m offset to within 1 mm, no kick: x about 0.146 s, z about 0.354 s (sketch run on the VPS with these k and damping 30; not measured in Cubyz) | none |
| Step-up: drop the eye by the step height and give it a velocity of max(1.5 x body speed, current, 4) | 1.5 (theirs, physics.zig:501); floor 4 (theirs, 501) |
| Landing: eye z velocity takes the fall speed; doubled on a vertical collision | Doubling factor 2.0 (theirs, physics.zig:603) |
| Ledge coyote lock: `sqrt(2 * stepHeight / g) + dt` | Gravity constant 30 (theirs, physics.zig:14); the lock length uses this value |
| Crouch percentage: +/- dt * 10 per frame, clamped 0-1, smoothstep | Rate 10 per second (theirs, game.zig:770); eye rest height 1.7 standing (theirs, game.zig:79) and 1.3 crouched (theirs, game.zig:793) |
| Pitch clamp, yaw free | pi/2 - 0.001 (theirs, game.zig:37) |
| Mouse averaging, total conserved | 3 slots (theirs, Window.zig:552); 0.0089 per unit of delta (theirs, 579); sensitivity 1 (theirs, settings.zig:27) |
| Field of view for the render | 70 degrees (theirs, settings.zig:25) |

The derived values are my arithmetic on the constants shown. The settle times came from running the sketch in section 4 on the VPS. They are not Cubyz measurements.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (the springs integrate first, then the step-up kick is applied to z) and writes the three real solution cases out, instead of the donor's complex-number form. It omits the `eye.step` linear-move state, the ledge coyote lock that skips the z spring, the landing and ledge rules, the clamp of the eye into its box, the block-present guard, and the crouch head-room test. The crouch helpers are separate functions and `eyeFrame` does not call them.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Spring { pos: number; vel: number; k: number; lambda: number; }

// Exact closed-form step of x'' + lambda*x' + k*x = 0 over dt. Three real cases are written out.
function stepSpring(s: Spring, dt: number): void {
  const a = s.lambda / 2;
  const disc = a * a - s.k;            // negative when underdamped
  const x0 = s.pos, v0 = s.vel;
  if (disc < -1e-12) {                 // underdamped: decaying oscillation
    const w = Math.sqrt(-disc);
    const e = Math.exp(-a * dt), c = Math.cos(w * dt), sn = Math.sin(w * dt);
    const B = (v0 + a * x0) / w;
    s.pos = e * (x0 * c + B * sn);
    s.vel = e * (v0 * c - (a * B + w * x0) * sn);
  } else if (disc > 1e-12) {           // overdamped: two real roots
    const q = Math.sqrt(disc);
    const r1 = -a + q, r2 = -a - q;
    const C1 = (v0 - r2 * x0) / (r1 - r2), C2 = x0 - C1;
    const e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt);
    s.pos = C1 * e1 + C2 * e2;
    s.vel = C1 * r1 * e1 + C2 * r2 * e2;
  } else {                             // critically damped
    const e = Math.exp(-a * dt), B = v0 + a * x0;
    s.pos = e * (x0 + B * dt);
    s.vel = e * (v0 - a * B * dt);
  }
}

// Stiffness from the eye box extent: k = 400 / (max - min), damping lambda = 30 (per axis).
function eyeSpring(extent: number): Spring {
  return { pos: 0, vel: 0, k: 400 / extent, lambda: 30 };
}

// One client frame, in the donor order: springs integrate first, then a step-up drops the eye and kicks it.
function eyeFrame(eye: Spring[], dt: number, stepUp: number, bodySpeed: number): void {
  for (const s of eye) stepSpring(s, dt);
  if (stepUp > 0) {
    eye[2].vel = Math.max(1.5 * bodySpeed, eye[2].vel, 4);
    eye[2].pos -= stepUp;
  }
}

// Crouch blend: the percentage moves at 10 per second while on the ground, then smoothstep.
function crouchPercStep(perc: number, crouching: boolean, onGround: boolean, dt: number): number {
  if (!onGround) return perc;
  const next = perc + (crouching ? dt * 10 : -dt * 10);
  return Math.min(1, Math.max(0, next));
}
function crouchSmooth(perc: number): number {
  const t = Math.min(1, Math.max(0, perc));
  return t * t * (3 - 2 * t);
}
```

Checks run on the VPS (Node, transcribed formulas, not Cubyz): the sketch's underdamped and overdamped steps match a plain-JS transcription of the donor's complex-number formula (physics.zig:487-495) to the printed digits, for k = 3333.33, 258.06 and 100 at several dt. At critical damping (k = 225 with damping 30), the donor's formula gives NaN because it divides by c_3, which is zero there (physics.zig:488). The sketch uses its own critical branch. The one-step versus two-step test gave a difference below 1e-16 for all four stiffness values tried (3333.33, 258.06, 225 and 175, the last two being the critical and overdamped cases respectively).

## 5. Lands in

- TARGET `src/fight/camera.ts` (new client-only module: follow-point spring, step-up and landing kicks, crouch blend; reads the player's position, never writes it, and never feeds hit tests). Parity-checklist row 11 (fight camera). The current Frankendom camera code was not opened for this note.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: the camera is client-only (the engine never reads it); fight camera is row 11

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. The constants are tuning values and are not copied as code.
- First-person, not third-person. The eye is the camera. The donor has no shoulder offset, no follow distance, no pitch limit tuned for over-the-shoulder, no wall pull-in toward the character, no lock-on framing, no FOV change in combat, and no shake. `renderer.zig:155` has an open `// TODO: player bobbing`. I searched the camera, eye, fov and bobbing names and found nothing more; the search covered the Zig source only.
- No horizontal lag. The spring force is only `-k * pos`. Body velocity does not enter the spring; it enters only the step-up kick (physics.zig:501). Look lag for a third-person camera must be added with a new forcing term, which is ours to design.
- Aim versus camera. The client sends its camera pitch and yaw to the server (`network/protocols.zig:436-438`). Frankendom's kills are server-verified, so the server must not trust that aim. The crosshair ray is taken from the view matrix (renderer.zig:240). Whether the hit test uses the spring offset was not read. Frankendom must keep the aim ray on the unsprung pivot.
- Critical-damping hazard: the donor's solver divides by c_3 (physics.zig:488), which is zero at critical damping. Tuning stiffness to exactly damping squared over four gives NaN in the donor's form. The sketch's critical branch avoids it.
- Mouse averaging adds one frame of look lag (about 17 ms at 60 fps, derived) in exchange for a conserved total. If Frankendom wants crisp aim, the averaging should be a setting, not a fixed rule.
- Frame delta: the client path has no clamp in the lines read (main.zig:476-496). A long frame gives a large step. The spring solution itself stays stable for any dt, because it is exact, but the step-up and landing kicks use the body speed at that instant.
- Tunable data versus engine constants: all the numbers in section 3 are client tuning (spring multiplier, damping, kick factors, crouch rate, mouse scale, FOV) except the body box, which comes from the engine. None of them are zone data in the donor. Gravity (30) is an engine constant that the coyote lock uses.
- `calculateWallCollision` was read only to line 535, so the exact value of `stepAmount` (how far the step is) is not confirmed. The kick uses it as given.
- The donor never reads the camera on the server. `calculateEyeMovement` has a single caller, `game.zig:809`, on the client side.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: the camera is client-only; fight camera row 11; camera_scope world camera



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None. Verified physics.zig 420-512 (force 400, friction 30, k = 400/extent, step state -0.1 test, coyote z skip, closed-form complex solve 487-495, step kick max(1.5|vel|, vel_z, 4) and eye.pos.z -= step), 593-614 landing/doubling/coyote sqrt(2h/g)+dt, baseGravity 30, game.zig 762-793 crouch (dt*10, smoothstep, 1.7->1.3, eye box 0.2/0.05), 809/824/830, eye render sum 143, pitch clamp pi/2-0.001, Window.zig 3-slot averaging 0.0089 (552-581, 809-815), main.zig frame delta unclamped client side, server delta clamp 0.3 (server/world.zig 1106-1108), fov 70, sens 1, renderer TODO bobbing, protocols.zig 436-438 sends rotation, GPL v3.

**Missed:** None.
