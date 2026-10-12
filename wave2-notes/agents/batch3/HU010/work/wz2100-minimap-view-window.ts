// Minimap viewing window (the camera footprint on the map), shape only (clean-room, GPL-2.0-or-later).
// Returns the four corners in minimap pixels, centred on the player's dot and turned by the view yaw.
type Pt = { x: number; y: number };

const MAX_DISTANCE = 5000;   // theirs: display.h:238 (MAXDISTANCE)
const PITCH_NEAR = 1;        // theirs: display.h:234 (MAX_PLAYER_X_ANGLE -1): 1 degree below horizon
const PITCH_FAR = 88;        // theirs: display.h:235 (MIN_PLAYER_X_ANGLE -88): 88 degrees below horizon
const VISIBLE_TILES = 64;    // theirs: display3ddef.h:29-30

// theirs: radar.cpp:63 RADAR_FRAME_SKIP = 10 (frames, not seconds). Fixed here to a time step.
const REFRESH_S = 0.1;

export interface ViewInput {
  viewDistance: number;       // world units (theirs: getViewDistance, display3d.cpp:2516-2519)
  pitchBelowHorizon: number;  // degrees, 1..88 (theirs: 360 - r.x, radar.cpp:716; r.x clamped to 272..359, display.cpp:1562)
  yawRad: number;             // view yaw in radians (donor uses a fixed-point angle; RotateVector2D, radar.cpp:682-705)
  pixPerTile: number;         // minimap pixels per tile (theirs: CalcRadarPixelSize, radar.cpp:324-328)
  playerPx: Pt;               // the player's dot on the minimap, in pixels
}

// Float maths throughout. The donor divides by 100, 6, 4 and 3 with int math (radar.cpp:711, 744-747): fixed here.
export function viewingWindow(v: ViewInput): Pt[] {
  const distAdjust = Math.max(MAX_DISTANCE - v.viewDistance, 0) / 100;
  const lenAdjust = Math.min(Math.max(v.pitchBelowHorizon - PITCH_NEAR, 0), PITCH_FAR - PITCH_NEAR) / 2;

  const shortHalf = (VISIBLE_TILES / 4 - distAdjust / 6) * v.pixPerTile; // near edge half-width
  const longHalf = (VISIBLE_TILES / 2 - distAdjust / 4) * v.pixPerTile;  // far edge half-width
  const reach = (VISIBLE_TILES / 2 - lenAdjust / 3) * v.pixPerTile;      // up to the far edge, down to the near edge

  // Donor order: far right, far left, near left, near right (radar.cpp:749-759). Far edge is up (negative y).
  const local: Pt[] = [
    { x: longHalf, y: -reach },
    { x: -longHalf, y: -reach },
    { x: shortHalf, y: reach },
    { x: -shortHalf, y: reach },
  ];

  // Same rotation as RotateVector2D (radar.cpp:700-701): x' = x*c + y*s, y' = y*c - x*s.
  const c = Math.cos(v.yawRad);
  const s = Math.sin(v.yawRad);
  return local.map((p) => ({
    x: p.x * c + p.y * s + v.playerPx.x,
    y: p.y * c - p.x * s + v.playerPx.y,
  }));
}

// Refresh the static tile layer on a timer; the window itself is recomputed every frame.
export function shouldRefreshTiles(nowS: number, lastRefreshS: number): boolean {
  return nowS - lastRefreshS >= REFRESH_S;
}

// Touch and mouse: a press becomes a drag only after it moves more than 5 px (theirs: radar.cpp:844, 862-863).
// On release without a drag, the action uses the press position, not the release position (theirs: radar.cpp:930-934, 952-955).
export interface Press { startX: number; startY: number; dragging: boolean }

export function pointerMove(p: Press, x: number, y: number): "pan" | "wait" {
  if (!p.dragging && (Math.abs(x - p.startX) > 5 || Math.abs(y - p.startY) > 5)) {
    p.dragging = true;
  }
  return p.dragging ? "pan" : "wait";
}

export type Release = { action: "none" | "jump" | "pan-to"; x: number; y: number };

export function pointerUp(p: Press, jumpInstant: boolean): Release {
  if (p.dragging) return { action: "none", x: p.startX, y: p.startY };
  return { action: jumpInstant ? "jump" : "pan-to", x: p.startX, y: p.startY };
}

// Example: a 64-tile window at a 60 degree pitch, player at the centre of a 128 px map.
export function demo(): Pt[] {
  return viewingWindow({ viewDistance: 4000, pitchBelowHorizon: 60, yawRad: 0, pixPerTile: 2, playerPx: { x: 64, y: 64 } });
}

export {};
