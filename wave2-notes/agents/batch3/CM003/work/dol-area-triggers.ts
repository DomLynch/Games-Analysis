// Licence: GPL-2.0-or-later (donor, Dawn of Light). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Pt = { x: number; y: number };
type Shape =
  | { kind: "circle"; x: number; y: number; z: number; radius: number }
  | { kind: "polygon"; points: Pt[] };

interface ZoneArea {
  id: number;
  name: string;        // shown as "entered X" in the client HUD
  shape: Shape;
  soundId: number;     // 0 = silent
  announce: boolean;
  losCheck: boolean;   // while inside, targeted spells and arrows need line of sight
}

// Donor MustCheckLOS: any current area with the flag turns the LOS rule on for that living.
export function mustCheckLos(current: ZoneArea[]): boolean {
  return current.some((a) => a.losCheck);
}

interface Spot { x: number; y: number; z: number }

// Engine rule (donor: AbstractArea.cs 80): a zone can hold at most this many areas.
const MAX_AREAS_PER_ZONE = 50;

// Fail at load time, not mid-way through a loop (donor has no check; see Gaps).
export function loadZoneAreas(areas: ZoneArea[]): ZoneArea[] {
  if (areas.length > MAX_AREAS_PER_ZONE) {
    throw new Error(`zone has ${areas.length} areas, cap is ${MAX_AREAS_PER_ZONE}`);
  }
  return areas;
}

function inCircle(p: Spot, c: Extract<Shape, { kind: "circle" }>, ignoreZ: boolean): boolean {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  // square pre-check on both sides (donor checks only the positive side, then relies on the distance test)
  if (dx > c.radius || dx < -c.radius || dy > c.radius || dy < -c.radius) return false;
  let d2 = dx * dx + dy * dy;
  // height only counts when both sides carry a height and the caller wants it
  if (c.z !== 0 && p.z !== 0 && !ignoreZ) {
    const dz = p.z - c.z;
    d2 += dz * dz;
  }
  return d2 <= c.radius * c.radius;
}

// Even-odd ray test, same edge ordering as the donor. Ignores height, as the donor does.
function inPolygon(p: Pt, pts: Pt[]): boolean {
  if (pts.length < 3) return false;
  let inside = false;
  let prev = pts[pts.length - 1];
  for (const cur of pts) {
    const [a, b] = cur.x > prev.x ? [prev, cur] : [cur, prev];
    if ((cur.x < p.x) === (p.x <= prev.x) && (p.y - a.y) * (b.x - a.x) < (b.y - a.y) * (p.x - a.x)) {
      inside = !inside;
    }
    prev = cur;
  }
  return inside;
}

export function contains(p: Spot, area: ZoneArea, ignoreZ = false): boolean {
  return area.shape.kind === "circle"
    ? inCircle(p, area.shape, ignoreZ)
    : inPolygon(p, area.shape.points);
}

// Membership diff for one player. Donor runs this only every 2000 ms (see Gaps); here it runs on every position tick.
export function updateMembership(
  prev: Map<number, ZoneArea>,
  candidates: ZoneArea[],
  p: Spot,
): { next: Map<number, ZoneArea>; entered: ZoneArea[]; left: ZoneArea[] } {
  const next = new Map<number, ZoneArea>();
  for (const a of candidates) {
    if (contains(p, a)) next.set(a.id, a);
  }
  const entered = candidates.filter((a) => next.has(a.id) && !prev.has(a.id));
  // leave is computed from the previous set, so areas that belong to a zone we just left are also reported
  const left = [...prev.values()].filter((a) => !next.has(a.id));
  return { next, entered, left };
}
