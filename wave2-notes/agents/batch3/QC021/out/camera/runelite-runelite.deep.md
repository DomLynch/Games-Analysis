# runelite-runelite (camera, cell 14)

Donor: `/mnt/frankendom-donors/runelite-runelite/runelite-api/src/main/java/net/runelite/api/Perspective.java` (with `runelite-api/.../Client.java` and `runelite-client/.../plugins/camera/CameraPlugin.java`) | Licence: BSD 2-Clause (per `LICENSE` line 1: "BSD 2-Clause License"; Java headers agree) | Java | symbol `localToCanvasCpu`

Checked: camera_scope: world camera. Confidence: high on the projection (read in full: `localToCanvasCpu` 214-244 and the CPU model path `modelToCanvasCpu` 442-507); high that the donor does NOT contain camera motion (see Checked below). Read in full: `CameraPlugin.java` 1-569 (every camera setter it calls), the camera getters and docs in `Client.java` (1410-1470, 1760-1808, 2439-2445), `CameraConfig` limits (36-41, 130-132). Read in part: `localToMinimap` (519-548, in part), `Perspective` lines 1-111 (tables), `GpuPlugin` camera read at 866 only. Not read: `localToCanvasGpu` (252-290), `modelToCanvasGpu` (377-441), the game client that actually moves the camera (not in this repo). Searched (run): `lerp`, `cameraSmooth`, `smoothCamera`, `setCameraX`, `setCameraY`, `setCameraYaw`, `setCameraPitch(` over `runelite-api` and the camera plugin gave no hits; `follow` in the camera plugin files matches only the BSD licence text. The setters `setCameraYawTarget`, `setCameraPitchTarget` and `setCameraFocalPointX/Y/Z` are declared in `Client.java` (1439, 1446, 1782, 1795, 1808) with no implementation here. So the follow, easing, pitch limits and collision live in the game client, which is not in this repo. Callers: `localToCanvasCpu` is called from two places, the `localToCanvas(client, x, y, z)` overload (180) and the `worldId` overload (211), each choosing `localToCanvasGpu` when `client.isGpu()` is true (checked by grep). I read the CPU branch, not the GPU branch.

Best transferable idea: a world-to-screen projection with a near-plane reject (a point too close to the camera gets no screen position) gives a cheap way to fit several targets on screen, which a many-on-one fight camera needs.
Decision (proposed): adapt - the projection itself duplicates what the renderer already does, and this donor has no follow or shoulder camera, so take only the near-plane rule and a fit-to-box helper for framing several enemies, not the camera motion.
Acceptance: with three hostiles around the hero the camera backs off until all three sit inside 80% of the view; a target behind the camera (depth under 50 units) is left out of the fit rather than pinned to the screen edge.

## 1. Mechanism

- The repo does not contain camera motion. Follow, easing, the pitch limit and wall handling are inside the game client, which this repo calls through `Client` (the API). The plugin here (`CameraPlugin`) only writes settings: camera speed (196), the pitch relaxer (197), invert yaw and pitch, shake off, mouse buttons, and zoom limits through VarC values (215 and nearby). The API says the target yaw and pitch come from player input and the actual yaw and pitch are what the camera uses, which cutscenes may override (`Client.java` 1415-1422); the focus is normally the player and may be another point in cutscenes or free camera (1773); `getCameraFocusEntity` names the entity whose focus point is used (2445).
- The one self-contained mechanism is the projection `localToCanvasCpu` (214-244). In order: (a) subtract the camera position from the point (219-221); (b) rotate by camera yaw: x1 = x cos + y sin, y1 = y cos - x sin (232-233); (c) rotate by camera pitch: y2 = z cos - y1 sin, depth z1 = y1 cos + z sin (234-235); (d) if z1 is below 50 the point is not on screen and the function returns null (237, and the return of null after the block); (e) screen x = viewport width / 2 + x1 x scale / z1, screen y = viewport height / 2 + y2 x scale / z1 (240-241), then the viewport offsets are added.
- Angle scale. The sine and cosine tables are indexed by camera pitch and yaw in 14-bit units: `SINE14[i] = sin(i x pi/8192)`, so 16384 units per turn (57, 92). The batched model path uses the same camera tables (`SINEF14[cameraPitch]`, 449) but its model rotation uses the 2048-unit tables (`SINEF[rotate]`, in `modelToCanvasCpu` 442-507). The donor mixes two angle scales.
- The batched model path (`modelToCanvasCpu`, 442-507) runs the same steps for many points at once and writes a sentinel (`Integer.MIN_VALUE`) for points with z1 below 50 (493-494), instead of returning null.

## 2. Key functions

- `localToCanvasCpu`: `/mnt/frankendom-donors/runelite-runelite/runelite-api/src/main/java/net/runelite/api/Perspective.java` 214-244. One world point to one screen point; the whole projection.
- `modelToCanvasCpu`: same file, 442-507. The same projection for an array of points, with the near-plane sentinel.
- `CameraPlugin.copyConfigs` and `applyConfigs`: `/mnt/frankendom-donors/runelite-runelite/runelite-client/src/main/java/net/runelite/client/plugins/camera/CameraPlugin.java` (copyConfigs at 185; applyConfigs at 213). Pushes config into the game client. Not camera math.
- `onScriptCallbackEvent` zoom remap: same file, 225-267. Exponent 2 mapping for the zoom slider (231, 251).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Subtract camera, rotate by yaw then pitch, divide by depth | Angle tables 14-bit: 16384 units per turn (57, 92) |
| Near plane: no screen point closer than the plane | 50 units (237, 493) |
| Screen position is centre plus offset times scale over depth | Viewport centre (240-241); `scale` is `client.getScale()` (239; the value is set by the game and was not read) |
| Zoom slider mapped by a power curve | Exponent 2 (231); value = (v / range)^2 x range (251) |
| Zoom limits as data | Inner zoom limit 1400 (CameraConfig 41); outer limit offset between -400 and 400 (36, plus the max beside it) |
| Camera speed as a multiplier | Default 1 (132) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (camera subtract, yaw, pitch, near-plane reject, perspective divide). It computes sine and cosine directly from the angle instead of the precomputed 14-bit table, does not round to integers as the donor's int arithmetic does, and drops the GPU path, the batched model path, the minimap, the world-view transform, and the free-camera and cutscene overrides. The `frameBox` and `fitFactor` helpers are ADDED here and are not in the donor: the donor has no framing at all. Targets behind the near plane are counted and dropped, not clamped to the edge.

```ts
// Licence: BSD 2-Clause (donor LICENSE, "BSD 2-Clause License"). Clean-room sketch of the projection steps, not a line translation.
const ANGLE_FULL = 16384;  // donor: camera yaw and pitch use 14-bit tables (16384 units per turn)
const NEAR_Z = 50;         // donor: points with depth z1 below 50 get no screen point

const toRad = (a: number): number => (a * 2 * Math.PI) / ANGLE_FULL;

interface View { x: number; y: number; z: number; yaw: number; pitch: number; scale: number; viewW: number; viewH: number; }
interface Pt { x: number; y: number; z: number; }
interface Screen { x: number; y: number; }

// World point to screen point, or null when the point is at or behind the near plane (donor: z1 >= 50 test).
function project(v: View, p: Pt): Screen | null {
  const dx = p.x - v.x;
  const dy = p.y - v.y;
  const dz = p.z - v.z;
  const cy = Math.cos(toRad(v.yaw));
  const sy = Math.sin(toRad(v.yaw));
  const cp = Math.cos(toRad(v.pitch));
  const sp = Math.sin(toRad(v.pitch));
  const x1 = dx * cy + dy * sy;   // yaw
  const y1 = dy * cy - dx * sy;   // yaw
  const y2 = dz * cp - y1 * sp;   // pitch
  const z1 = y1 * cp + dz * sp;   // pitch: depth
  if (z1 < NEAR_Z) return null;
  return { x: v.viewW / 2 + (x1 * v.scale) / z1, y: v.viewH / 2 + (y2 * v.scale) / z1 };
}

interface Box { minX: number; minY: number; maxX: number; maxY: number; dropped: number; }

// ADDED (not in donor): screen box of the targets that are in front of the camera; counts the ones dropped.
function frameBox(v: View, targets: Pt[]): Box | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, dropped = 0;
  for (const t of targets) {
    const s = project(v, t);
    if (s === null) { dropped++; continue; }
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, dropped };
}

// ADDED: factor to multiply the camera scale by so the box fits inside `safe` (0..1) of the view.
// Screen offsets from the view centre are linear in scale, so the half-extents scale by the same factor.
function fitFactor(box: Box, v: View, safe: number): number {
  const cx = v.viewW / 2;
  const cy = v.viewH / 2;
  const halfW = Math.max(Math.abs(box.minX - cx), Math.abs(box.maxX - cx));
  const halfH = Math.max(Math.abs(box.minY - cy), Math.abs(box.maxY - cy));
  const fx = halfW > 0 ? (safe * cx) / halfW : Infinity;
  const fy = halfH > 0 ? (safe * cy) / halfH : Infinity;
  return Math.min(fx, fy);
}
```

## 5. Lands in

- TARGET `src/fight/worldCamera.ts` (proposed; the same module as the LostCity note). Client-only: framing reads positions and never writes game state; the engine never reads the camera. Parity-checklist row 11 (fight camera) is the nearest row; Lead should confirm.
- today: the world camera in Frankendom (not read in this pass).
- Reuse tag: adapt (BSD 2-Clause: code may be adapted; the sketch is clean-room in any case)
- Brief rule served: client-only camera (addendum: camera is client-only; the engine never reads camera pose); rules 7-9 n/a

## 6. Gaps and risks

- No camera motion in this donor. Follow, easing, shoulder offset, wall collision and recentring are all absent from the repo, so this donor cannot answer the owner's over-the-shoulder question. The motion has to come from the LostCity note or from our own design.
- Duplicate of the renderer. Frankendom's renderer already projects points; use the donor's near-plane rule and the fit helper only, never a second projection path that could disagree with the renderer.
- Two angle scales in one donor (14-bit camera, 2048-unit model rotation, Perspective 57 and 92 against 442-507). Frankendom must pick one scale; the sketch uses 16384 to match the camera tables.
- The zoom value (`client.getScale()`) was not read, so the donor's zoom range in pixels is unknown. The fit helper works in relative terms and does not need it.
- Zoom curve and inner limit (CameraPlugin 231, 251; CameraConfig 41) are a player's zoom preference, not a duel rule. Keep them out of the fight camera's defaults.
- Free camera and cutscene overrides exist in the API (1760-1808) but nothing here implements them. Do not copy the names as behaviour.
- Mouse remap (right-click to rotate, middle-click menu) is UI input, not camera logic; reject for the duel.
- Client-only rule: the fit must never feed a hit check, a target lock or any server message, in line with the camera being client-only.
