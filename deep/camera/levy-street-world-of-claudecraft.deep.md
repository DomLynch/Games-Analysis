# levy-street-world-of-claudecraft (camera, cell 14)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/action_cam_core.ts | Licence: MIT | TypeScript | symbol stepActionCam / actionCamOffset / ActionCamRig
Symbol check: stepActionCam (105), actionCamOffset (166) and ActionCamRig (201) confirmed. stepActionCamBob (126) and setActionCamTarget (86) are read as part of the mechanism. The file is 221 lines and read whole.

## 1. Mechanism
- An opt-in over-the-shoulder framing for a chase camera. It does not move the camera, change its distance or hide anything. It shifts the look pivot sideways (right or left shoulder), drops the aim a little toward shoulder height, and widens the field of view. The shift is added to both the camera and its aim point.
- State (ActionCamState, 24-42): a requested mode (on or off), a requested shoulder (-1 left to +1 right, clamped, non-finite becomes 1; lines 20-22), a primed flag (the first request snaps weight and shoulder; 86-94), a blend weight (0 classic to 1 full), a smoothed shoulder, a bob phase, a bob strength and the last display height.
- stepActionCam, once per frame: the weight eases toward 1 or 0 at a fixed rate. The shoulder eases toward the requested side at a second rate while the weight is at least 1e-3; below that it simply sits on the requested side, so turning the mode back on never sweeps across the avatar (line 115). Values within 1e-4 of the target are then snapped onto it (116-117). dt is clamped to 0..MAX_STEP. A reduced-motion flag snaps both weight and shoulder to the target.
- stepActionCamBob, once per frame: the stride bob uses horizontal speed and display height. The vertical speed is derived inside the function from the change in the display height over the clamped dt (lines 134-135), and the body counts as airborne when its absolute value exceeds 2 yards per second. If the still flag is set (swimming, dead, or reduced motion) the amplitude is set to zero at once, with no easing, and the phase is left alone (136-139). Otherwise the target is zero while airborne, or speed over RUN_SPEED capped at 1, and the amplitude eases toward it (values under 1e-4 snap to 0). The phase advances by min(speed, 1.4 x RUN_SPEED) x rate x dt, so a stop freezes it mid-step.
- actionCamOffset, once per frame: lateral shift = min(cap, base + per-distance x zoom distance) x weight x shoulder, plus a sway at stride rate and a dip at step rate, both scaled by bob amplitude. It returns a world-space x and z shift, the aim drop, and the FOV widen (all scaled by weight).
- ActionCamRig (201-221) is the glue: step (blend, then bob with horizontal speed = hypot of the two velocity components, still = reduced-motion or still), then offset per frame, writing into one reused output object. Inputs: toggle, shoulder, dt, reduced-motion, still flag, velocity, height, camera yaw and distance. Outputs: the offset. RUN_SPEED comes from ../sim/types (line 15).

## 2. Key functions
- setActionCamTarget (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/action_cam_core.ts | 86-94 | records the toggle and side; the first call snaps.
- stepActionCam (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/action_cam_core.ts | 105-118 | eases the weight and the shoulder; snaps under reduced motion.
- stepActionCamBob (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/action_cam_core.ts | 126-148 | stride bob amplitude and phase from speed and airborne check.
- actionCamOffset (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/action_cam_core.ts | 166-197 | the pivot shift, aim drop and FOV for this frame.
- ActionCamRig (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/action_cam_core.ts | 201-221 | owns the state and calls step then offset.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Blend weight toward on or off at a rate, so enabling is smooth | Blend rate 5 per second (theirs; line 55) |
| Side eases after the weight, so a swap never crosses the avatar | Swap rate 7 per second (theirs; line 57) |
| Lateral shift grows with camera distance, then caps | Base 0.6 yards, per-distance 0.085, cap 1.8 yards (theirs; lines 45, 47, 49) |
| Aim drop and FOV widen scaled by the blend | Drop 0.5 yards, FOV 5 degrees (theirs; lines 51, 53) |
| Stride bob from speed over run speed, zero while airborne | Bob height 0.07, sway 0.05, 2.5 footfalls per second at run, speed cap 1.4 x RUN_SPEED, airborne threshold 2 yards per second, ease 6 per second (theirs; lines 59, 61, 63, 65, 67, 69) |
| Frame step capped so a hitch does not jump | MAX_STEP 0.25 seconds (theirs; line 70) |

## 4. TypeScript sketch
simplified: the primed/first-call snap, clampSide, the 1e-4 settle snaps (lines 116-117, 144) and the still flag (zeroes bobAmp at once) are omitted; the airborne flag is passed in, whereas the donor derives it from the change in display height (bobLastY) inside stepActionCamBob; stepBob also omits the still branch; the output object is returned fresh instead of written into a reused `out`.

```ts
// Licence: MIT (levy-street-world-of-claudecraft). Logic lifted from
// src/render/action_cam_core.ts (stepActionCam, stepActionCamBob, actionCamOffset)
// and rewritten in TS with local types. Constants are theirs.
interface ActionCam { enabled: boolean; targetSide: number; weight: number; side: number; bobPhase: number; bobAmp: number; }
const approach = (cur: number, tgt: number, rate: number, dt: number) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
const MAX_STEP = 0.25;  // theirs

function stepBlend(s: ActionCam, dt: number, snap: boolean): void {
  const target = s.enabled ? 1 : 0;
  if (snap) { s.weight = target; s.side = s.targetSide; return; }
  const h = Math.min(Math.max(0, dt), MAX_STEP);
  s.weight = approach(s.weight, target, 5, h);                      // theirs
  s.side = s.weight < 1e-3 ? s.targetSide : approach(s.side, s.targetSide, 7, h); // theirs
}

function stepBob(s: ActionCam, speed: number, airborne: boolean, runSpeed: number, dt: number): void {
  const h = Math.min(Math.max(0, dt), MAX_STEP);
  const target = airborne ? 0 : Math.min(1, speed / runSpeed);
  s.bobAmp = approach(s.bobAmp, target, 6, h);                      // theirs
  s.bobPhase = (s.bobPhase + Math.min(speed, runSpeed * 1.4) * (2.5 * Math.PI / runSpeed) * h) % (2 * Math.PI);
}

interface Offset { x: number; z: number; drop: number; fov: number; }
function offset(s: ActionCam, yaw: number, dist: number): Offset {
  const w = s.weight;
  if (w <= 0) return { x: 0, z: 0, drop: 0, fov: 0 };
  const lateral = Math.min(1.8, 0.6 + 0.085 * Math.max(0, dist)) * w * s.side; // theirs
  const bob = s.bobAmp * w;
  const sway = 0.05 * bob * Math.sin(s.bobPhase);                  // theirs
  const dip = 0.07 * bob * (1 - Math.abs(Math.sin(s.bobPhase)));   // theirs
  return { x: -Math.cos(yaw) * (lateral + sway), z: Math.sin(yaw) * (lateral + sway),
           drop: 0.5 * w + dip, fov: 5 * w };                       // theirs
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (today: src/camera* (moving)). The shoulder-offset and blend pattern is a candidate for a fight-camera option. The stride bob is a candidate for the hero's animation feel (row 6, src/fight) but is camera-side here.
- Parity-checklist row: 11 (fight camera, camera kick, standoff); row 6 for the bob.
- Reuse tag: adapt (MIT, the logic can be lifted; the numbers are Levy's and need Frankendom's own tuning)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Written for an open-world chase camera with yards as units. Frankendom's fight camera units and distance rule must be checked before reuse.
- It is client-only and does not change state (the file header says pure math, no Three or DOM, line 13), which fits the server-verified kills rule: camera and bob state must never feed the sim or the fight record (row 19).
- One engine, zones as data: one shared src/fight/camera.ts for the Pit client and every zone; Zone 1's own follow cam (row 11) is replaced, not copied. The donor already keeps the offset as a separate pivot shift on top of a chase camera, which suits that layering.
- The donor's own comment says it never changes the camera distance (lines 6-7, a graphics pin). Frankendom's fight camera needs a zoom/standoff rule of its own, e.g. framing for up to MAX_ATTACKERS = 3 attackers; a fixed shoulder offset does not do that.
- The sketch takes run speed as an argument; the donor reads RUN_SPEED from its sim types, which Frankendom must supply.
