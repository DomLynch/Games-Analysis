# 00-Evan-shattered-pixel-dungeon (camera, cell 14)

Donor: /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Camera.java | Licence: GPL-3 | Java | symbol Camera.update / shake / panFollow

Symbol check (opened on the VPS, 2026-10-09): update 175-226, shift 236, setCenterOffset 241, snapTo 251, panTo 261, panFollow 267, setFollowDeadzone 276, updateMatrix 300, shake 317.

## 1. Mechanism
- A 2D follow camera, run once per frame from update() (Game.elapsed is the frame time). Its scroll position is what the view draws.
- Follow: if a follow target is set and visible, the pan point (panTarget) is its centre plus the camera's centre offset, and the dead zone is width x followDeadzone / 2 (height likewise; default 0). If there is no visible follow target the dead zone is 0 and the camera pans to the last panTarget (this is how panTo works). The camera pans toward that point, but only by the part of the gap that lies outside a dead zone (a fraction of the screen size, on each axis). Inside the dead zone it does not move.
- The pan only runs when panIntensity > 0. The pan step per frame is the gap minus the dead zone, multiplied by min(1, elapsed time x pan intensity). So the camera closes the gap a fraction at a time, and stops once it is inside the dead zone.
- Shake: a timer runs down. While it runs, each frame's shake offset is a random value in plus or minus the magnitude on each axis, scaled by remaining time over duration (linear fade). When the timer ends, the offset is zero.
- Other entry points: panFollow(target, intensity) sets follow mode; panTo(point, intensity) sets a fixed pan point and clears follow; snapTo jumps and clears follow and pan; shift moves the scroll once and clears pan intensity. snapTo also adds the centre offset; setCenterOffset moves scroll and panTarget by the change in offset.
- Inputs: follow target, pan intensity, dead zone, shake magnitude and duration, frame time. Output: scroll and shake offsets, then a matrix update.
- Runs per frame. No simulation.

## 2. Key functions
- Camera.update (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Camera.java | 175-226 | per-frame follow pan with dead zone and shake offset.
- Camera.panFollow (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Camera.java | 267-270 | sets follow target and pan intensity.
- Camera.shake (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Camera.java | 317-320 | sets shake magnitude and duration.
- Camera.panTo and snapTo (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Camera.java | 251-265 | fixed pan point, or a hard jump.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Dead-zone follow: move only the part of the gap outside a zone, a fraction per frame | Dead zone as a fraction of screen size (theirs, set by the caller) |
| Frame-rate-scaled pan step, capped at 1 | Pan intensity value (theirs, set per call) |
| Shake: random offset, linearly damped over its duration | Shake magnitude and duration (theirs, set per call) |
| Snap versus pan versus shift as three entry points | Entry points named panTo, panFollow, snapTo, shift (theirs) |

## 4. TypeScript sketch
simplified: the sketch omits the follow target's visibility check, the centre offset (so snapTo ignores it), the panTarget point (panTo and the stale-target pan; here the pan only runs while a target exists), the panIntensity > 0 gate (an intensity of 0 gives k = 0, same effect), panTo, shift, setCenterOffset and the matrix update. Target is a plain point, not a sprite centre.
```ts
// Licence: GPL-3 (00-Evan-shattered-pixel-dungeon). CLEAN-ROOM: from the mechanism only.
interface Cam { x: number; y: number; target?: { x: number; y: number }; intensity: number;
  deadFrac: number; viewW: number; viewH: number; shakeMag: number; shakeLeft: number; shakeDur: number;
  shakeX: number; shakeY: number; }

function step(c: Cam, dt: number, rnd: () => number): void {
  if (c.target) {
    const dx = c.target.x - (c.x + c.viewW / 2);
    const dy = c.target.y - (c.y + c.viewH / 2);
    const deadX = (c.viewW * c.deadFrac) / 2, deadY = (c.viewH * c.deadFrac) / 2;
    const px = Math.abs(dx) > deadX ? dx - Math.sign(dx) * deadX : 0;
    const py = Math.abs(dy) > deadY ? dy - Math.sign(dy) * deadY : 0;
    const k = Math.min(1, dt * c.intensity);
    c.x += px * k; c.y += py * k;
  }
  if (c.shakeLeft > 0) {
    c.shakeLeft -= dt;
    const damp = c.shakeLeft / c.shakeDur;
    c.shakeX = (rnd() * 2 - 1) * c.shakeMag * damp;
    c.shakeY = (rnd() * 2 - 1) * c.shakeMag * damp;
  } else { c.shakeX = 0; c.shakeY = 0; }
}

function panFollow(c: Cam, target: { x: number; y: number }, intensity: number): void {
  c.target = target; c.intensity = intensity;
}

function snapTo(c: Cam, x: number, y: number): void {
  c.x = x - c.viewW / 2; c.y = y - c.viewH / 2; c.intensity = 0; c.target = undefined;
}

function shake(c: Cam, magnitude: number, duration: number): void {
  c.shakeMag = magnitude; c.shakeLeft = c.shakeDur = duration;
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (new module; today: src/camera* (moving), slice K4). Dead-zone follow and shake are candidates for the fight camera's framing; the camera-kick part of row 11 could use the shake.
- Parity-checklist row: 11 (fight camera, camera kick, standoff).
- Reuse tag: rewrite-from-idea (GPL-3; the dead-zone follow and damped shake are the idea)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- A 2D camera for a tile map. Frankendom's fight camera is 3D or a fixed chase, so only the follow and shake ideas transfer.
- Shake is random and uses the donor's random source; Frankendom needs a seeded or cosmetic-only source so it cannot affect the server.
- Snap and pan clear each other's state in a specific order. Frankendom should define that order explicitly.
- Donor is GPL-3, so only the mechanism is described here.
