# keldaanCommunity-pokemonAutoChess (camera, cell 14)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/scenes/game-scene.ts` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | TypeScript (Phaser 3 scene) | symbol `setupCamera`

Checked: Symbol `setupCamera` is at game-scene.ts 217-247 (read in full). Its one caller, `startGame`, calls it at 143 (read 138-146). The wheel, drag, lock and shake code was read in full (game-scene.ts 225-244, 311-315, 1014-1020; preferences.ts 75-76 and 90; abilities-animations.ts 826-832 and 1471; pokemon-sprite.ts 352-398 for the tooltip edge clamp). Confidence high on the rules listed. Not read: the Phaser library code for `pan`, `shake` and tween easing (I state Phaser behaviour only where marked), and the `clamp` helper's source. Confidence medium that this is a "fight camera" in the sense Frankendom means: it is a board-view camera, and only its rules transfer.

## 1. Mechanism

- A Phaser main camera with three player controls and one effect. Wheel: zoom in or out. Left-drag: pan while zoomed. Lock key `L`: freezes both. Effect: a screen shake, called by ability animations.
- Setup (`setupCamera`, 217-247): scroll bounds are set once to the map size times 2 (218-223). Two input handlers are registered, the wheel handler (225-238) and the pointer-move handler (240-246).
- Wheel order of steps (225-238): (a) if the player's `cameraLocked` preference is on, return (226); (b) zoom = clamp(zoom - sign(deltaY) x 0.1, 1, 2) (227-230). Only the sign of `deltaY` counts, so a big and a small wheel tick move zoom the same 0.1; (c) if `deltaY < 0` (wheel up, which is zoom in), pan the camera to the pointer's world position over 400 ms with ease `Power2` (233-235); (d) otherwise, if zoom is now exactly 1, pan back to (0, 0) over 400 ms (236).
- Drag order of steps (240-246): the handler exits unless the pointer is down and no item or Pokemon drag is in progress (241). It exits again if zoom is 1 or the lock is on (242-243). Otherwise it moves scroll by the pointer's screen delta divided by zoom (244-245). Dividing by zoom makes a screen pixel move the same visual distance at any zoom.
- Lock (311-315, in `registerKeys`): the keydown for the bound key flips the `cameraLocked` preference and saves it.
- Shake (`shakeCamera`, 1014-1020): does nothing when the `disableCameraShake` preference is on (1015). Otherwise it calls Phaser's `shake` with duration `options.duration` defaulting to 250 (1017) and intensity `options.intensity` defaulting to 0.01 (1018). The only caller in this donor that goes through `shakeCamera` is the ability-animation maker (abilities-animations.ts 826-832). Ability timings use it with per-ability values, for example 400 ms and 0.01 (1471) and 300 ms and 0.015 (1475).
- Defaults: shake is OFF by default (preferences.ts 75, `disableCameraShake: true`). Lock is off by default (76). The lock key is `L` (90).
- Tick: none. The camera is event-driven: wheel and pointer events change the state, and the Phaser tween runs the 400 ms pans. There is no per-frame camera loop in the file.

## 2. Key functions

- `setupCamera`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/scenes/game-scene.ts` 217-247. Bounds, the wheel zoom rule, and the drag pan.
- The wheel handler, inside `setupCamera`: same file 225-238. Lock check, clamp, pan-to-pointer on zoom-in, pan-to-origin on return to zoom 1.
- The drag handler, inside `setupCamera`: same file 240-246. Exits at zoom 1 or when locked; divides the screen delta by zoom.
- `shakeCamera`: same file 1014-1020. Preference gate, then the defaults 250 ms and 0.01.
- Lock toggle, inside `registerKeys`: same file 311-315.
- Tooltip edge clamp (a separate use of the camera view, not part of the camera rules): `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 361 reads `cameras.main.worldView`, and 383-388 push the tooltip back inside the top and bottom view edges by 10 px. Read but not part of the sketch.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zoom in fixed steps per wheel event, sign only, clamped to a range | Zoom range 1 to 2 (theirs, game-scene.ts 229-230; the lines hold only `1,` and `2`, too short for a receipt under the 15-character rule); step 0.1 (theirs, 228) |
| Zoom-in re-centres on the pointer, zoom-out to fit re-centres on the origin | Pan time 400 ms, ease `Power2` (theirs, 234 and 236) |
| Drag pan = screen delta / zoom, disabled at fit zoom or when locked | Gate at zoom exactly 1 (theirs, 243) |
| Shake gated by a player preference, defaulting off | Default off (theirs, preferences.ts 75); shake defaults 250 ms and 0.01 (theirs, 1017-1018) |
| Lock as a toggle key that freezes the view | Key `L` (theirs, preferences.ts 90) |
| Scroll bounds from the map size | Map size x 2, fallbacks 1200 x 768 (theirs, 218-223); the reason for the x 2 is not in this file (not read elsewhere) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rule order (lock check first, then the zoom clamp, then the pan choice, and the drag gate), but returns the pan as a target instead of running a 400 ms Power2 tween. It omits the scroll bounds (map size x 2), the pointer-down and item or Pokemon drag guards, the cursor-to-world conversion, the tooltip edge placement, the lock key registration, and the Phaser `shake` call. Shake returns the requested values instead of playing them.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface CamState {
  zoom: number;        // 1 = fit, MAX_ZOOM = closest
  scrollX: number;     // view top-left, world units
  scrollY: number;
  locked: boolean;     // player lock: wheel and drag are ignored
  shakeOff: boolean;   // player preference; shake is off unless the player turns it on
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const PAN_MS = 400;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

interface Pan { x: number; y: number; ms: number }

// One wheel event: only the sign of deltaY counts, not its size.
// Wheel up (negative) zooms in and asks for a pan to the pointer.
// A wheel-down that leaves zoom at MIN_ZOOM asks for a pan back to the origin.
function onWheel(cam: CamState, deltaY: number, pointer: { x: number; y: number }): Pan | null {
  if (cam.locked) return null;
  cam.zoom = clamp(cam.zoom - Math.sign(deltaY) * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
  if (deltaY < 0) return { x: pointer.x, y: pointer.y, ms: PAN_MS };
  if (cam.zoom === MIN_ZOOM) return { x: 0, y: 0, ms: PAN_MS };
  return null;
}

// Drag: a held pointer moves the view by its screen delta divided by zoom.
// Ignored at MIN_ZOOM and while locked.
function onDrag(cam: CamState, dxScreen: number, dyScreen: number): void {
  if (cam.locked || cam.zoom === MIN_ZOOM) return;
  cam.scrollX -= dxScreen / cam.zoom;
  cam.scrollY -= dyScreen / cam.zoom;
}

// The lock key toggles the lock.
function toggleLock(cam: CamState): void {
  cam.locked = !cam.locked;
}

// Shake request: null when the player has shake off; otherwise the defaults are 250 ms and 0.01.
function shake(cam: CamState, opts?: { durationMs?: number; intensity?: number }): { durationMs: number; intensity: number } | null {
  if (cam.shakeOff) return null;
  return { durationMs: opts?.durationMs ?? 250, intensity: opts?.intensity ?? 0.01 };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (new client-only module; fight camera, parity-checklist row 11). It reads engine state and never writes it. The sketch is pure state logic, so a Phaser or other renderer can call it.
- today: no camera rules in Frankendom's source (not read here; the target is the planned home).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: client-only camera (Frankendom ruling: camera, HUD and sound are client-only; the Pit is a client). Rules 7-9 n/a.
- Best transferable idea: a view camera whose wheel zoom steps are clamped, whose drag speed is divided by zoom, and whose shake is gated by a player preference that defaults off.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The donor's zoom-in is a pan to the pointer, not a zoom that keeps the point under the cursor fixed. If Frankendom wants the anchored zoom, it must be added; the donor does not have it.
- The donor compares `zoom === 1` after a float step of 0.1. I did not run this, so I do not know whether a float step can leave zoom just above 1 and skip the origin pan. Frankendom should test its own version.
- The x 2 on the scroll bounds is not explained in this file. Do not copy it without a reason.
- Shake defaults OFF in the donor. For Frankendom's fight camera the default must be a Lead or Pit decision; the sketch makes it a parameter and does not assume a default.
- Camera state must never feed the fight result. Kills are server-verified, so a locked or zoomed view changes nothing about the outcome. The sketch holds no combat state.
- The donor is a board view with a fixed grid, not a fight camera. Only the rules transfer: zoom bounds, drag gating, shake gate. The look does not transfer.
- Phaser's `pan` and `shake` internals were not read; the 400 ms and the Power2 ease are the donor's arguments, not a measured behaviour.
