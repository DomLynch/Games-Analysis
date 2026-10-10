# KsanaDock-Microverse (camera, cell 14)

Donor: `/mnt/frankendom-donors/KsanaDock-Microverse/script/CameraController.gd` | Licence: MIT (`LICENSE`: "MIT License", "Copyright (c) 2025 KsanaDock"; code may be adapted) | GDScript (Godot 4 style `Camera2D`) | symbol `CameraController` (`_process`, `_input`, `zoom_camera`, `restore_view`, `follow_character`)

Checked: camera_scope: world camera. `CameraController.gd` read in full (1-112). Callers checked: `follow_character` is called from `CharacterManager.gd` 103 (select) and 87 (deselect), both read; `restore_view` and `zoom_camera` have no caller outside this file (grep over `.gd` and `.tscn`). The camera node is `MainCamera`, a `Camera2D` with this script, in `scene/maps/Office.tscn` (16876; script at 21; grep only). Confidence: high on the mode logic, the lerp and the drag maths. Medium on whether this is STRONG: the donor is a 2D top-down camera, and only its mode logic (not the screen-to-world maths) transfers to a 3D third-person camera. Not read: the rest of the project (only the camera files and their two call sites). Not read: the Godot version's `Vector2.lerp` (the weight semantics were taken as the usual Godot lerp, `a + (b - a) * w`).

## 1. Mechanism

- One `Camera2D` with three modes, chosen by two flags and one target: follow (a target is set), map (no target), and manual (`is_manual_mode`, set by a drag). Each `_process(delta)` moves the position and zoom toward the goal for the current mode with the same weight, `follow_speed * delta` (`CameraController.gd` 30-43):
  - manual: position toward `manual_position` (33) and zoom toward `manual_zoom` (34);
  - follow: position toward `target.position` (37) and zoom toward `character_zoom` (39);
  - map: position toward `original_position` (42) and zoom toward `zoom_level` (43).
  The weight is not clamped. With `follow_speed` 5.0, a frame longer than 0.2 s makes the weight exceed 1, so the lerp overshoots the goal (`Vector2.lerp` extrapolates for weights above 1). This is a real gap in the donor, not a tested failure.
- Right-button drag (`_input`, 47-66): the press stores `camera_start_position` (53) and `manual_zoom = zoom.x` (55). While held, `world_delta = mouse_delta / zoom.x * drag_speed` (64) and `manual_position = camera_start_position - world_delta` (65); manual mode is on (66). The release only clears `is_dragging` (57-58); manual mode stays on.
- Wheel (69-75): `zoom_camera(±zoom_speed)` (72, 75). `zoom_camera` (81-94) clamps the new zoom to 0.5-2.0 (84) and stores it in the slot for the current mode: `manual_zoom` if manual (86-88), `character_zoom` if a target is set (89-91), else `zoom_level` (92-94).
- Space (78-79): `restore_view()`. It clears manual mode (98). With a target it calls `follow_character(target)` (99-101), which keeps the zoom memory and eases back. With no target it snaps the position to `original_position` and the zoom to `zoom_level` (102-105, instant).
- `follow_character(character)` (107-112): with a character, the target is set and manual mode is cleared (109-110). With `null`, only the target is cleared (111-112); manual mode is left as it was. `CharacterManager.gd` calls it with the character on select (103) and with `null` on deselect (87).

Quirk (checked by reading 107-112): deselecting while in manual mode keeps manual mode on, so the camera holds the dragged point until Space is pressed.

## 2. Key functions

- `_process`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/CameraController.gd` 30-43. The three-mode ease.
- `_input`: `CameraController.gd` 45-79. Right-drag pan, wheel zoom, Space restore.
- `zoom_camera`: `CameraController.gd` 81-94. Clamp and per-mode memory.
- `restore_view`: `CameraController.gd` 96-105. Leave manual mode; follow or snap to the map.
- `follow_character`: `CameraController.gd` 107-112. Set or clear the target.
- Call sites: `/mnt/frankendom-donors/KsanaDock-Microverse/script/CharacterManager.gd` 87 and 103.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (2D units, px and zoom factor) |
|---|---|
| Ease toward the goal for the current mode | Weight `follow_speed * delta` with follow_speed 5.0 (`CameraController.gd` 3); no clamp (33-43) |
| Distance memory per mode | Follow zoom 1.5 (`character_zoom`, line 5); map zoom 0.8 (`zoom_level`, line 4); free-look zoom starts at 0.8 (`manual_zoom`, line 18) |
| Drag pan scaled by zoom | `drag_speed` 1.0 (line 6); world delta = pixels / zoom (64) |
| Wheel step and clamp | Step 0.1 (`zoom_speed`, line 7); range 0.5 to 2.0 (lines 8-9, clamp 84) |
| Map start point | (576, 320) px (line 22), map specific |
| Restore | Instant snap on the map (102-105); eased back on a target (99-101) |

## 4. TypeScript sketch

simplified: the donor is 2D, so the sketch maps it onto a 3D focus point on the ground plane with one distance in place of zoom (the donor's zoom factor is 1 over distance). The drag moves the held focus on the ground plane (donor: screen pixels over zoom). The sketch clamps the follow weight to 1, which the donor does not do. It omits the map centre constant and the Camera2D screen-to-world conversion. It has no yaw or pitch control: this donor has none, so a third-person camera's own yaw and pitch input must come from elsewhere. It keeps the donor's quirk that `setHero(null)` leaves the mode unchanged.

```ts
// Licence: MIT (KsanaDock-Microverse LICENSE, "Copyright (c) 2025 KsanaDock"). Shape adapted from the donor's CameraController.gd (MIT: code may be adapted), written as a 3D sketch.
// camera_scope: world camera
export interface V3 { x: number; y: number; z: number; }

export type Mode = "follow" | "free" | "none";

// Tuning values are client settings; the donor exposes them as @export vars.
export interface Tuning {
  followRate: number;   // donor follow_speed (5.0)
  dragSpeed: number;    // donor drag_speed (1.0)
  minDist: number;      // donor min_zoom (0.5), here a distance
  maxDist: number;      // donor max_zoom (2.0), here a distance
  zoomStep: number;     // donor zoom_speed (0.1)
}

export interface Rig {
  focus: V3;            // eased focus point (donor position)
  dist: number;         // eased distance behind the focus (donor zoom, inverted)
  mode: Mode;
  hero: V3 | null;      // followed character (donor target)
  origin: V3;           // map centre (donor original_position)
  followDist: number;   // remembered distance while following (donor character_zoom)
  idleDist: number;     // remembered distance on the map (donor zoom_level)
  freeDist: number;     // remembered distance while free-looking (donor manual_zoom)
  freeFocus: V3;        // held focus while free-looking (donor manual_position)
  dragStart: V3 | null; // focus when the drag began (donor camera_start_position)
}

// simplified: the donor's lerp weight is follow_speed * delta with no clamp; here it is clamped to 1 so a long frame cannot overshoot.
function weight(rate: number, dt: number): number {
  return Math.min(1, rate * dt);
}

function lerp3(a: V3, b: V3, w: number): V3 {
  return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, z: a.z + (b.z - a.z) * w };
}

// One frame: pick the goal for the current mode and ease toward it (donor _process).
export function step(r: Rig, t: Tuning, dt: number): void {
  if (dt <= 0) return;
  const w = weight(t.followRate, dt);
  let goalPos: V3;
  let goalDist: number;
  if (r.mode === "free") {
    goalPos = r.freeFocus;
    goalDist = r.freeDist;
  } else if (r.hero) {
    goalPos = r.hero;
    goalDist = r.followDist;
  } else {
    goalPos = r.origin;
    goalDist = r.idleDist;
  }
  r.focus = lerp3(r.focus, goalPos, w);
  r.dist = r.dist + (goalDist - r.dist) * w;
}

// Right-drag start: remember where the focus was and the current distance (donor _input, button pressed).
export function beginDrag(r: Rig): void {
  r.dragStart = { x: r.focus.x, y: r.focus.y, z: r.focus.z };
  r.freeDist = r.dist;
}

// Drag motion: switch to free mode and move the held focus by pixels scaled by distance (donor: pixels / zoom * drag_speed).
export function drag(r: Rig, t: Tuning, dxPx: number, dyPx: number): void {
  if (!r.dragStart) return;
  r.mode = "free";
  const k = t.dragSpeed / r.dist;
  r.freeFocus = { x: r.dragStart.x - dxPx * k, y: r.dragStart.y, z: r.dragStart.z - dyPx * k };
}

export function endDrag(r: Rig): void {
  r.dragStart = null; // the focus stays held in free mode until restore
}

// Wheel zoom: clamp, then store into the slot of the current mode (donor zoom_camera).
export function zoomBy(r: Rig, t: Tuning, dir: 1 | -1): void {
  const nd = Math.max(t.minDist, Math.min(t.maxDist, r.dist + dir * t.zoomStep));
  if (r.mode === "free") r.freeDist = nd;
  else if (r.hero) r.followDist = nd;
  else r.idleDist = nd;
}

// Restore key: leave free mode; follow the hero if one is set, otherwise snap to the map (donor restore_view).
export function restore(r: Rig): void {
  if (r.hero) {
    r.mode = "follow";
  } else {
    r.mode = "none";
    r.focus = { x: r.origin.x, y: r.origin.y, z: r.origin.z };
    r.dist = r.idleDist;
  }
}

// Selecting a hero switches to follow (donor follow_character with a character). A null hero clears the target and keeps the mode (donor quirk, see gaps).
export function setHero(r: Rig, hero: V3 | null): void {
  r.hero = hero;
  if (hero) r.mode = "follow";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/QC003_ksana_worldcam.ts`) exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client-only module; this reader did not read the Frankendom file). The mode logic only: follow, held free look and restore. No server write.
- Parity-checklist row 11 (fight camera). No row covers the world camera; row 11 is the nearest.
- today: not read (Frankendom camera location not read by this reader).
- Reuse tag: adapt-allowed (MIT: code may be adapted; this note adapts the shape only)
- Brief rule served: 1 (one engine; the camera is client-only, so the engine never reads it); rules 7-9 n/a
- Best transferable idea: keep one remembered distance per camera mode, let a held look override the follow target, and bring it back with one restore key.
- Decision (proposed): adapt — take the per-mode distance memory, the hold-to-look override and the one restore key for a free-look in the world; reject the 2D screen pan and the fixed map centre, because the owner's complaint is the over-the-shoulder framing, which this donor does not address.
- Acceptance: in a zone, holding the look key and moving the mouse turns the view; releasing and pressing restore eases back behind the hero within about half a second; a unit test shows the follow weight is 1 at a 0.5-second frame (no overshoot).

## 6. Gaps and risks

- The follow weight is unclamped in the donor (`CameraController.gd` 33-43). With follow_speed 5.0, any frame longer than 0.2 s overshoots. Frankendom must clamp it.
- Deselect while free-looking keeps free mode (107-112). Frankendom's selection and camera logic must clear the free look on deselect, or the camera holds a point with no hero.
- The drag maths divides by zoom (64). In 3D the equivalent is distance, and the screen-to-ground conversion needs a real ray test; the sketch's version is an approximation, not checked on a 3D map.
- The donor has no over-the-shoulder offset, no collision and no yaw or pitch. Almost all of the owner's complaint is outside this donor.
- Confidence that this is STRONG is medium: the mechanism is real and read in full, but it is a 2D top-down camera, and only the mode logic transfers.
- Zone data: the map centre (576, 320) and the zoom values are scene data for this 2D map; Frankendom should take the mode logic, not the constants.
