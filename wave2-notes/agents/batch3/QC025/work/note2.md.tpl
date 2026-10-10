# esponges-daoc-web (camera, cell 14)

Donor: `/mnt/frankendom-donors/esponges-daoc-web/web/viewer.js` | Licence: MIT (`LICENSE`: "MIT License", Copyright (c) 2026 Fernando González Tostado; code may be adapted with the copyright notice kept) | JavaScript (WebGL2 viewer) | symbol `frame` (the chase camera block, "place the camera", 956-998)

Checked: camera_scope: world camera. Read end to end: the chase camera block (viewer.js 956-998, inside `frame` from 864), its state (626-703, the `orbit` and `cam` objects at 668 and 670), the input for drag, wheel and the C toggle (736-811), the per-frame character update that feeds it (864-909), and the constants (33-74). Also read: `groundAt` (440-447), and combat.js 1-20 and 44-110 for the Tab target ranking, which uses the camera yaw. Also read: LICENSE lines 1-6, and the key help in web/index.html line 104. Not read: combat.js 110-298 (the fight itself), the rest of viewer.js from 1000 on (the draw passes that use the camera basis for cards, sky and grass at 1041-1084), and the sky and character model files. Confidence: high on the orbit maths, the recentre rule and the floor lift; the floor lift depends on `groundAt`, which I read. Verified by arithmetic, not by running: the decay comparison in section 3.

Best transferable idea: Keep the eye on a sphere around a look-at point at a fixed fraction of the character's height, lift it only upward when it would sink into the ground, and let a swung camera ease back behind the character only while the character is moving.
Decision (proposed): adapt - the sphere geometry, the look-at height, the recentre-while-moving rule and the wheel zoom fit our world camera; the floor lift is not a pull-in, so we must replace it with a pull-in toward the character before we take it.
Acceptance: Standing still after a right-drag keeps the swung view; walking forward it is back within 5 percent of behind in about one second, and on a slope or behind a wall the eye is pulled in toward the character rather than passing through it (a unit test asserts the eye never ends below ground plus clearance and never sits behind a blocking surface along the sight line).

## 1. Mechanism

Order per redraw frame (viewer.js `frame`, 864 on). `dt` is wall-clock time capped at 0.1 s (865). The character moves first: A and D turn the character by `TURN * dt` (874, TURN 2.8 rad/s at 61); W/S/Q/E move it on the ground (877-895). Only on a frame when the character moves, the swung offset decays by a factor `max(0, 1 - CAM_RETURN * dt)` (896-897, CAM_RETURN 3 at 65). Every frame the offset is wrapped to -pi..pi (901) and the camera heading is set (902). Then combat and animation run (909-945), the ground under the character is sampled (947), and the camera is placed from those values (960-972).

- Look-at point: `target = [x, groundY + height * scale * 0.62, z]` (963). The fraction 0.62 is the donor's choice, a little above the middle of the model.
- Look direction: `[sin(yaw) * cos(p), -sin(p), -cos(yaw) * cos(p)]` (962), with `yaw = player.yaw + orbit.off` and `p = orbit.pitch`.
- Eye: `target - look * orbit.dist` on each axis (964-968). A true sphere of radius `dist` around the look-at point, with the pitch carried by the sine term.
- Floor lift: `floor = groundAt(eye x, eye z) + 40`; if the eye is below it, the eye's height is raised to the floor (969-971). This is a vertical lift only. It does not move the eye toward the character, so the sphere distance is not kept when it fires. It also tests only the ground under the eye, not the sight line.
- Projection: vertical FOV pi/3 (57), near 15 in follow mode and 20 in free fly (996), far 160000 (995), `lookAt(eye, target, up = y)` (997).
- Input in follow mode: a right-button drag (764) swings the offset by `-movementX * 0.005` (797) and changes the pitch by `movementY * 0.004` clamped to -0.35 .. 1.25 (798). Wheel: `dist *= 1.12` on a wheel-down step, `dist *= 0.89` otherwise, clamped to 90 .. 4000 (806). The C key toggles to a free-fly camera (745-754). Left-button drags only look around in free fly (764).
- Start values: `orbit = { yaw: pi, off: 0, pitch: 0.30, dist: 320 }` (668).
- Tab target: `targetNext` (combat.js 79-91) ranks living NPCs within 3000 units (45) by distance, multiplied by 4 when the NPC is more than 90 degrees off the camera yaw (85). The camera yaw is passed in as `orbit.yaw` (viewer.js 740-743).

## 2. Key functions

- The chase camera: `/mnt/frankendom-donors/esponges-daoc-web/web/viewer.js` 956-998 (placement, floor lift, projection). Its inputs are in the same file: `frame` 864-909 (dt, turn, recentre), the mouse drag 794-803, the wheel 804-811, and the state at 668-674.
- `groundAt`: same file 440-447. Samples the height grid, splitting each cell into two triangles.
- `targetNext`: `/mnt/frankendom-donors/esponges-daoc-web/web/combat.js` 79-91 (camera-aware target ranking; the rest of combat.js not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Eye on a sphere of set distance around a look-at point; pitch and heading set the eye | Look-at height 0.62 of model height (theirs, 963); start distance 320 units (theirs, 668) |
| Heading = character yaw + free offset; the offset is the only thing the mouse changes | Right-drag 0.005 rad per pixel (theirs, 797); pitch 0.004 rad per pixel, -0.35 .. 1.25 rad (theirs, 798) |
| Wheel scales distance by a fixed ratio and clamps | Ratio 1.12 out and 0.89 in; clamp 90 .. 4000 units (theirs, 806) |
| Swung offset decays only while the character moves | Rate 3 per second (theirs, 65); step is `1 - rate*dt` per frame (theirs, 897) |
| Floor lift on the eye | Clearance 40 units above `groundAt` under the eye (theirs, 970) |
| Frame dt cap | 0.1 s (theirs, 865) |
| Projection | FOV pi/3 vertical (theirs, 57); near 15, far 160000 (theirs, 995-996) |

Decay check (my arithmetic, not run): the donor's per-frame factor `1 - 3*dt` at 60 frames a second gives 0.95 per frame, so after one second `0.95^60` is about 0.046. The exact exponential `exp(-3)` is about 0.050. The donor's rule is close but frame-rate dependent. A rewrite should use `exp(-rate*dt)`.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's maths: look-at point from ground and model height, look direction from yaw and pitch, eye on the sphere, the upward-only floor lift, the drag rules, the wheel clamp and the recentre-while-moving rule. It omits the free-fly camera, the model matrix and the bob, the projection, the Tab and click picking, the sky and fog, and the frame loop. It wraps the offset inside `dragCamera` and `recentre` instead of every frame. It uses the donor's per-frame linear decay, so it keeps the frame-rate dependence noted in section 3; it adds no pull-in, so the floor lift is still the only protection on slopes.

```ts
@@SKETCH@@
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (new, client-only: eye, drag, zoom and recentre; the engine never reads it). Parity-checklist row 11 (fight camera). The world camera has no row of its own in the addendum list; this note asks Lead to decide whether row 11 covers the world camera.
- Reuse tag: rewrite-from-idea (MIT: adaptation is allowed with the copyright notice kept; this note's sketch is clean-room)
- Brief rule served: camera is client-only (the donor's camera reads no game state beyond the player's pose, and the Tab ranking is client-side only, so it does not decide hits); zones as data (the distance limits can differ per zone)

## 6. Gaps and risks

- No pull-in. The floor lift is upward only and checks only the ground under the eye. A camera behind a wall, or on the far side of a hill from the character, is not handled. Our camera needs a sight-line test from the look-at point to the eye, and a pull-in to the first blocking surface.
- Sphere distance is broken when the lift fires (section 1). Tests must allow it, or the pull-in must replace it.
- Linear decay (section 3) makes the recentre speed depend on frame rate. Use an exponential.
- No shoulder offset: the offset is about the character's yaw and the look-at point is on the centreline. The owner's over-the-shoulder request needs a lateral offset this donor does not have.
- No lock-on framing, no FOV change in combat, no shake or impact kick. The Tab ranking (combat.js 85) uses the camera yaw to choose a target but does not frame it. A grep of web, internal and cmd for shake, impact, recoil, lock-on, framing, hitstop and kick found nothing. FOV is one constant (viewer.js 57) passed to the projection and to the sky (sky.js 145-152).
- Standing still keeps a swung view swung, by design. In a fight this means the camera may stay off-axis while the character turns to face a target. Decide the rule for our fight camera (rows 4 and 11).
- Frankendom rulings: the Tab ranking is client-side. Server-verified kills must stay on the server; the camera and the ranking must not decide hits. MAX_ATTACKERS = 3 does not apply to this camera. I did not read how NPCs take turns in combat.js 110-298, so I cannot say how this donor would frame several enemies.
- MIT: if code is copied, the copyright notice must be kept. This note's sketch is clean-room.
- Not verified: no test run and no browser run of the donor.

