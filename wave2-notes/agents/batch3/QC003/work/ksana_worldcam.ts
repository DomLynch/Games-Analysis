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
