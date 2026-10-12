# Anuken-Mindustry (input-touch-controls, cell 2)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/input/MobileInput.java` (1121 lines; read in the sections named below) | Licence: GNU GPL version 3 (`LICENSE` line 1: "GNU GENERAL PUBLIC LICENSE"; line 2: "Version 3, 29 June 2007") | Java (arc/Mindustry) | symbols `MobileInput.tap`, `MobileInput.longPress`, `MobileInput.pan`, `MobileInput.zoom`, `MobileInput.autoPan`, `MobileInput.updateMovement`, `MobileInput.checkTargets`

Checked: read `MobileInput.java` 32-62 (fields), 88-108 (`checkTargets`), 606-742 (`longPress`, `tap`), 772-835 (`update`, keyboard camera move), 914-1007 (`autoPan`, `pan`, `zoom`), 1008-1121 (`updateMovement`, unit steering, auto-target, aim). The bodies of `touchDown` (518) and `touchUp` (558) were NOT read; only their signatures were seen. `LICENSE` read. Searched `core/src/mindustry/input/` for portrait, landscape, orientation and gamepad: none found. Camera scope: not applicable (input cell); the pan and anchor mechanisms are described because they bear on the owner's camera ruling. Confidence: high on tap snap, auto-target, anchor steering and edge pan (read end to end). Not read: the bodies of `Units.closestEnemy`, `Units.closestTarget` and `Units.invalidateTarget` (only their call sites), `Predict.intercept`, `approachDelta`, the `touchUp` body (558-605), `Call.tileTap`, `renderer.setScale` clamping, and `DesktopInput.java`. Confidence in the description of the arrive and turn rules: high, they are in one function.

Best transferable idea: a tap snaps to the nearest live enemy inside a small radius so the finger need not be exact, and the unit keeps that target (or the nearest enemy in weapon range when none was tapped) until it dies or leaves range.

Decision (proposed): adapt. Keep the tap snap (radius as a data field tuned at 375 wide, donor 20 units) and the auto-target fallback, both in `src/fight/target.ts` so the engine chooses the target and the server verifies the engage. Reject the camera-anchored steering: the unit here is pulled to the camera centre (`MobileInput.java:1025-1066`), which makes movement read the client camera, and our rule is that the engine never reads the camera.

Acceptance: on a 375-wide phone, a tap within the snap radius of an enemy locks it and a tap farther away locks nothing; a server test asserts that an engage on the tapped enemy is accepted and an engage on a farther enemy from the same tap is rejected.

## 1. Mechanism

Touch input in this donor is a set of gesture callbacks (tap, long press, pan, zoom) that set state, and a per-frame `update` that reads that state.

- **Tap = pick a target, then act.** `tap` ignores taps on menus, in line mode and when locked (`:677`), maps the tap to a tile (`:682`), and calls `checkTargets` with the tap's world position (`:692`). `checkTargets` takes the nearest live enemy unit within 20 world units (`:93`, body of `Units.closestEnemy` not read); if the unit can attack, it becomes `target` (`:95-97`). Otherwise it takes an enemy building under the tap, or a damaged friendly building if the unit can heal (`:101-102`). A tap also clears mining (`:96`).
- **Gesture counts.** The same tap callback handles one, two and three taps (`count`). Three taps send a ping when networked (`:709`). Two taps take control of a unit or building that was tapped first, or run a config tap or mine (`:713-728`). One tap in place mode, or on a valid tile, queues a build plan (`:696-703`).
- **Long press.** When no build mode is active, a long press enables manual fire aimed at the finger and clears the target (`:645`, same for payload units at `:640`). When building, a long press starts line mode from the tile (`:658-662`). In command mode it starts a rectangle select (`:618-621`).
- **Pan.** `pan` ignores the call while a dialog is open or while locked (`:945`), and does nothing unless a finger is down (`:957`). It converts finger delta to world units with `camera.width / graphics.width` (`:947-949`) and moves the camera by that delta (`:978-979`, the `Core.camera.position.x -= deltaX` lines). The camera is clamped to the world plus a quarter screen margin on each side (`:983`).
- **Pinch zoom.** `zoom` captures `lastZoom` at the start of the gesture, then sets scale to `distance / initialDistance * lastZoom` (`:1001`). No clamp is visible in `zoom` itself.
- **Edge auto-pan.** `autoPan` takes the finger's position; within 60 px of an edge (`edgePan = Scl.scl(60f)`, `:36`; tests at `:919-933`), it sets a pan vector proportional to the depth into the margin (`:919-933`), scaled to world units (`:935`) and capped at 1.3 (`:936`). It adds the vector to the camera position once per call (`:939`). It is called during schematic or rebuild select (`:871`) and during line mode while a finger is down (`:884-886`).
- **Anchor steering (the unit follows the camera centre).** Each `updateMovement` takes the camera centre as the target point (`:1025`). The desired velocity is the offset to that point, limited to the unit's speed (`:1066`). The desired heading turns toward the unit's current velocity by 0.05 per call (`:1067`). If the unit is within 15 units of the point, the desired velocity is zero and the real velocity is decayed (`:1027`, `:1069-1070`). The unit is set to boost when more than 85 units from the point or when it overlaps a solid tile (`:1077`).
- **Auto-target and aim.** A held target is dropped when `Units.invalidateTarget` says so (`:1021`). With no target and the autotarget setting on (`:1090`), the unit takes the nearest target within weapon range (`:1092`); healers take the nearest damaged friendly building within range (`:1095-1100`, body of the healer branch read at call sites only). With no target the guns aim at the cursor (`:1105`). With a target, `Predict.intercept` gives a lead point when a weapon predicts (`:1107`, body not read).

Order per frame: `update` (`:772`) calls `updateMovement` for the player's unit (`:833`, per the call site). Input callbacks run between frames. Keyboard camera movement is scaled by `Time.delta` (`:815`), but the touch path is not (see Gaps).

## 2. Key functions

- `checkTargets`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/input/MobileInput.java` 88-108.
- `tap`: same file 676-742. `longPress`: same file 606-675.
- `pan`: same file 944-988. `zoom`: same file 995-1002.
- `autoPan`: same file 914-942. Its call sites: 871 and 885.
- `updateMovement`: same file 1008-1111 (anchor steering 1025-1077, auto-target 1090-1105, aim 1105-1110).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Tap snaps to nearest live enemy inside a radius | Radius 20 world units (`MobileInput.java:93`) |
| Tap on a building: enemy, or damaged friendly for healers | Rule only (`:101-102`) |
| Edge pan from depth into a margin, capped | Margin 60 px (`:36`); cap 1.3 (`:34`, `:936`); scale = camera width / screen width (`:935`) |
| Pinch zoom relative to gesture start | Ratio `distance / initialDistance` (`:1001`) |
| Anchor steering: desired speed capped, arrive radius, heading turn per call | Arrive 15 units (`:1027`); boost beyond 85 units (`:1077`); turn 0.05 per call (`:1067`) |
| Nearest target within range, dropped when invalid | Range = weapon range (`:1092`); setting gate `autotarget` (`:1090`) |
| Camera clamp to world plus margin | Quarter screen (`:983`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's tap snap (nearest live enemy inside a radius), the auto-target fallback, the drop-on-invalid rule, the edge-pan formula and the pinch ratio. It makes the heading turn frame-rate independent (the donor applies 0.05 once per call). It omits the building branch, the healer branch, the line and rectangle modes, `Predict.intercept`, the solid-overlap boost condition, and the donor's network calls. The `closestEnemy` and `closestTarget` bodies were not read, so "nearest within radius" is an assumption from the name and arguments. The arrive bleed rate is an assumed linear decay (the `approachDelta` body was not read). The anchor steering is shown only as the rejected-for-movement idea; it is kept in the sketch so the typecheck covers the shape.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism, not a translation.
export interface V2 { x: number; y: number }
export interface Foe { id: number; pos: V2; dead: boolean }

// Tap snap: the nearest live enemy within a radius of the tap (donor: 20 world units).
// simplified: the donor's Units.closestEnemy body was NOT read; "nearest within radius" is assumed from its name and arguments.
export function tapTarget(tap: V2, foes: Foe[], snapRadius = 20): Foe | undefined {
  let best: Foe | undefined;
  let bestD = snapRadius;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.pos.x - tap.x, f.pos.y - tap.y);
    if (d <= bestD) { best = f; bestD = d; }
  }
  return best;
}

// Auto target when nothing was tapped: nearest live enemy within weapon range (donor: Units.closestTarget, body not read).
export function autoTarget(unitPos: V2, range: number, foes: Foe[]): Foe | undefined {
  let best: Foe | undefined;
  let bestD = range;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.pos.x - unitPos.x, f.pos.y - unitPos.y);
    if (d <= bestD) { best = f; bestD = d; }
  }
  return best;
}

// A target is dropped when it dies or leaves range (donor: Units.invalidateTarget, body not read).
export function keepTarget(t: Foe | undefined, unitPos: V2, range: number): Foe | undefined {
  if (t === undefined || t.dead) return undefined;
  return Math.hypot(t.pos.x - unitPos.x, t.pos.y - unitPos.y) <= range ? t : undefined;
}

export interface Hull { pos: V2; vel: V2 }

const TURN_PER_FRAME = 0.05; // donor constant, applied once per 60 Hz frame

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

// Anchor steering (donor: the unit is pulled toward the camera centre).
// Outside arriveRadius the desired velocity has length min(speed, dist) and its angle turns toward the
// current velocity angle by TURN_PER_FRAME per 60 Hz frame (we convert it to a dt term; donor is per frame).
// Inside arriveRadius the desired velocity is zero and the real velocity bleeds off by decelPerSecond * speed.
// simplified: the donor's approachDelta body was NOT read; the bleed rate here is an assumed linear decay.
export function steerToAnchor(
  hull: Hull,
  anchor: V2,
  speed: number,
  dtSeconds: number,
  arriveRadius = 15,
  decelPerSecond = 0.5,
): { desired: V2; vel: V2; boosting: boolean } {
  const dx = anchor.x - hull.pos.x;
  const dy = anchor.y - hull.pos.y;
  const dist = Math.hypot(dx, dy);
  const boosting = dist > 85;

  if (dist <= arriveRadius) {
    const bleed = decelPerSecond * speed * dtSeconds;
    const m = Math.hypot(hull.vel.x, hull.vel.y);
    const vel = m <= bleed || m === 0 ? { x: 0, y: 0 } : { x: hull.vel.x * (1 - bleed / m), y: hull.vel.y * (1 - bleed / m) };
    return { desired: { x: 0, y: 0 }, vel, boosting };
  }

  const mag = Math.min(speed, dist);
  const offAngle = Math.atan2(dy, dx);
  const velAngle = Math.atan2(hull.vel.y, hull.vel.x);
  const f = 1 - Math.pow(1 - TURN_PER_FRAME, dtSeconds * 60);
  const ang = offAngle + wrapAngle(velAngle - offAngle) * f;
  return { desired: { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag }, vel: hull.vel, boosting };
}

// Edge pan: depth into a 60 px margin, scaled to world units, capped in speed (donor: maxPanSpeed 1.3).
export function edgePan(screen: V2, screenSize: V2, worldPerPx: number, marginPx = 60, maxSpeed = 1.3): V2 {
  let px = 0;
  let py = 0;
  if (screen.x <= marginPx) px = -(marginPx - screen.x);
  if (screen.x >= screenSize.x - marginPx) px = screen.x - screenSize.x + marginPx;
  if (screen.y <= marginPx) py = -(marginPx - screen.y);
  if (screen.y >= screenSize.y - marginPx) py = screen.y - screenSize.y + marginPx;
  let v = { x: px * worldPerPx, y: py * worldPerPx };
  const m = Math.hypot(v.x, v.y);
  if (m > maxSpeed) v = { x: (v.x * maxSpeed) / m, y: (v.y * maxSpeed) / m };
  return v;
}

// Pinch zoom: scale relative to the scale captured when the pinch began.
export function pinchScale(initialDistance: number, distance: number, startScale: number): number {
  return (distance / initialDistance) * startScale;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/IN002-Mindustry-touch-tap-steer.ts`), exit 0.

## 5. Lands in

- TARGET `src/fight/target.ts` (new, engine): the tap pick (`tapTarget`) and auto-target (`autoTarget`, `keepTarget`) as pure functions over the engine's enemy list. The client sends the tap point; the engine returns the lock; the server checks the engage.
- Parity-checklist row 5 (controls/input). The per-call turn constant is the input-intake timing issue, so the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" applies (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only, shape only)
- Brief rule served: rule 1 (one engine; the engine chooses the target; the camera is not read by the engine) and row 5.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no line is translated.
- Frankendom ruling conflict: the donor's unit follows the camera centre (`MobileInput.java:1025-1066`). That makes movement depend on the client camera. Our rule is that the camera is client-only and the engine never reads it. Rejected for movement; the owner's over-the-shoulder complaint also means a camera-tied move would make the complaint worse.
- Defect 1, heading turn is applied once per call (`:1067`, constant 0.05), so the turn rate depends on frame rate. Fix: `f = 1 - (1 - 0.05)^(dt * 60)` (done in the sketch).
- Defect 2, edge pan adds the vector once per call (`:939`) with no delta time, so pan speed depends on frame rate. Fix: multiply the vector by `dt * 60`, the way the keyboard path uses `Time.delta` (`:815`).
- Gap, pinch zoom has no visible clamp in `zoom` (`:995-1002`); whether `renderer.setScale` clamps was not read. Fix: clamp to a min and max scale in our code.
- Gap, the tap is a client decision that the donor sends by network call (`Call.tileTap`, not read). Frankendom must make the engage a server state change and reject a target the server does not see in range.
- Gap, one target per unit with no hate list. With MAX_ATTACKERS = 3 the engine must choose among attackers by hate, not by nearest.
- Landscape vs portrait: no orientation handling was found in `core/src/mindustry/input/`. Not claimed.
- Gamepad: none found in `core/src/mindustry/input/`. Not claimed.
- Lock-on hold: the donor keeps `target` until `Units.invalidateTarget` says drop (`:1021`); the rule is in the update loop, not in the tap. We keep the same rule: the lock holds until death or leaving range, not until the next tap.
- Input buffering: none. Taps are handled in the gesture callback and the state is read each frame. No queue.

Reuse tag: rewrite-from-idea
Brief rule served: 1 (one engine; target choice in src/fight; engage server-verified; camera client-only) and row 5 (controls/input)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No false claims found. Verified: checkTargets radius 20 and canAttack/mineTile logic (MobileInput.java:88-108), tap guards and three-tap ping, longPress manualShooting, pan (:944-986), zoom with no clamp (:1001), autoPan margin and speed, updateMovement values, keyboard camera uses Time.delta (:815), LICENSE GPL v3.
- Missed (minor): pan() also returns early when the 'keyboard' setting is on or commandRect is active (:945) and when manualShooting is on (:957); the note lists only dialog, locked and finger-down.
