// clean-room sketch: portal room visibility with a per-room screen rect, and frame split into fixed steps.
// Written from the mechanism in XProger/OpenLara (BSD-2-Clause). Not a translation of the donor.
type Vec3 = [number, number, number];
type Clip4 = [number, number, number, number]; // clip-space x, y, z, w

interface Rect { x0: number; y0: number; x1: number; y1: number } // NDC, -1..1
interface Portal { to: number; corners: [Vec3, Vec3, Vec3, Vec3]; normal: Vec3 }
interface RoomNode { portals: Portal[] }
interface Viewport { x: number; y: number; w: number; h: number } // pixels
interface VisibleRoom { room: number; clip: Rect }
interface VisibleResult { rooms: VisibleRoom[]; truncated: boolean }
interface VisOptions { maxRooms: number; maxDepth: number; project: (p: Vec3) => Clip4 }

const FULL: Rect = { x0: -1, y0: -1, x1: 1, y1: 1 };
const TICK_S = 1 / 30;
const EPS = 1e-6; // donor uses an EPS constant (value not read)

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function intersect(a: Rect, b: Rect): Rect | null {
  const r = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
  return r.x0 > r.x1 || r.y0 > r.y1 ? null : r;
}

function union(a: Rect, b: Rect): Rect {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

function contains(outer: Rect, inner: Rect): boolean {
  return outer.x0 <= inner.x0 && outer.y0 <= inner.y0 && outer.x1 >= inner.x1 && outer.y1 >= inner.y1;
}

// Facing test, then project the four corners and bound them. Reject if off the parent rect.
// simplified: a portal with any corner behind the eye plane gets the full rect (conservative, so it culls less);
// the donor works out per-edge extents from the sign of each crossing edge (level.h 2507-2553).
function portalClip(eye: Vec3, portal: Portal, parent: Rect, project: (p: Vec3) => Clip4): Rect | null {
  const c0 = portal.corners[0];
  if (dot(portal.normal, [eye[0] - c0[0], eye[1] - c0[1], eye[2] - c0[2]]) <= 0) return null;

  let bounds: Rect = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let behind = 0;
  for (const c of portal.corners) {
    const [x, y, , w] = project(c);
    if (w > 0) {
      const px = x / w;
      const py = y / w;
      bounds = { x0: Math.min(bounds.x0, px), y0: Math.min(bounds.y0, py), x1: Math.max(bounds.x1, px), y1: Math.max(bounds.y1, py) };
    } else {
      behind++;
    }
  }
  if (behind === 4) return null;
  if (behind > 0) bounds = FULL;
  return intersect(bounds, parent);
}

// Walk the portal graph from the start room. Each room gets one entry (union of the rects that reach it).
// Donor appends one entry per path (level.h 2578) and returns silently at the caps.
function visibleRooms(rooms: RoomNode[], start: number, eye: Vec3, vis: VisOptions): VisibleResult {
  const seen = new Map<number, Rect>();
  let truncated = false;

  const visit = (room: number, from: number, clip: Rect, depth: number): void => {
    if (depth > vis.maxDepth) { truncated = true; return; } // donor: count > 16 returns, no flag
    const prev = seen.get(room);
    if (prev) {
      if (contains(prev, clip)) return; // this path adds no new screen area
      seen.set(room, union(prev, clip));
    } else {
      if (seen.size >= vis.maxRooms) { truncated = true; return; } // donor: roomsCount >= 255
      seen.set(room, clip);
    }
    for (const portal of rooms[room].portals) {
      if (portal.to === from) continue; // donor: skip the portal we came through
      const next = portalClip(eye, portal, clip, vis.project);
      if (next) visit(portal.to, room, next, depth + 1);
    }
  };

  visit(start, -1, FULL, 0);
  const out: VisibleRoom[] = [];
  seen.forEach((clip, room) => { out.push({ room, clip }); });
  return { rooms: out, truncated };
}

// Donor getPortalRect: NDC rect to a pixel scissor, grown by pad px, clamped to the parent viewport.
function toScissor(clip: Rect, vp: Viewport, pad: number): Viewport {
  let x0 = Math.floor((clip.x0 * 0.5 + 0.5) * vp.w) + vp.x - pad;
  let y0 = Math.floor((clip.y0 * 0.5 + 0.5) * vp.h) + vp.y - pad;
  let x1 = Math.floor((clip.x1 * 0.5 + 0.5) * vp.w) + vp.x + pad;
  let y1 = Math.floor((clip.y1 * 0.5 + 0.5) * vp.h) + vp.y + pad;
  x0 = Math.max(x0, vp.x);
  y0 = Math.max(y0, vp.y);
  x1 = Math.min(x1, vp.x + vp.w);
  y1 = Math.min(y1, vp.y + vp.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Donor game.h update(): frame delta clamped to 0.2 s, then fixed 1/30 s steps with a shorter last step.
// fix: the donor skips the 0.2 s clamp on cutscene levels, so one long stall runs unbounded steps. Clamp everywhere.
function splitFrame(frameDelta: number): number[] {
  let delta = Math.min(0.2, frameDelta);
  const dts: number[] = [];
  while (delta > EPS) {
    const dt = Math.min(delta, TICK_S);
    dts.push(dt);
    delta -= dt;
  }
  return dts;
}

export {};
