// Licence: MIT (donor). Sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Hex { q: number; r: number }
interface Pt extends Hex { value: number; centre: boolean } // value 0-255

export interface FogInput {
  enabled: boolean;
  origin: Hex | null;                                       // null = no origin, nothing drawn
  lookDistance: number;                                     // origin's look distance (0 for a fixed-origin layer)
  extraLength: number;                                      // added to lookDistance when radius is 0
  radius: number;                                           // 0 = derive from lookDistance + extraLength
  reach: number;                                            // traced reach in hexes; 0 = derive (fix)
  traced: boolean;
  blockHex: (from: Hex, to: Hex, maxDist: number) => Hex;   // first blocking hex on the line, or `to` if clear
  durationMs: number;
}

// Six axial hex directions. The rim walk starts at dist * DIRS[0] and walks sides in DIRS[(side + 2) % 6] order.
const DIRS: Hex[] = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

function hexDist(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Rim points, a centre point after every second rim point (so the strip reads r r c r r c ...).
export function buildFan(input: FogInput): Pt[] {
  if (!input.enabled || input.origin === null) return [];
  const origin = input.origin;
  const dist = Math.max(input.radius > 0 ? input.radius : input.lookDistance + input.extraLength, 0);
  if (dist <= 0) return [];
  const reach = input.reach > 0 ? input.reach : dist; // fix (donor defect): donor used 0 literally, giving a 1-hex overlay

  // Seek corner (appended once), then six sides of dist steps each. The walk closes on the corner.
  const rim: Hex[] = [];
  let cur: Hex = { q: origin.q + dist * DIRS[0].q, r: origin.r + dist * DIRS[0].r };
  rim.push(cur);
  for (let side = 0; side < 6; side++) {
    const d = DIRS[(side + 2) % 6];
    for (let s = 0; s < dist; s++) {
      cur = { q: cur.q + d.q, r: cur.r + d.r };
      rim.push(cur);
    }
  }

  const out: Pt[] = [];
  let added = 0;
  for (const hex of rim) {
    added++;
    const targetDist = hexDist(origin, hex);
    if (input.traced) {
      const maxDist = Math.max(Math.min(targetDist, reach), 0) + 1;
      const block = input.blockHex(origin, hex, maxDist);
      const resultDist = hexDist(origin, block);
      const value = Math.floor((Math.max(maxDist - resultDist, 0) * 255) / maxDist);
      out.push({ q: block.q, r: block.r, value, centre: false });
    } else {
      out.push({ q: hex.q, r: hex.r, value: Math.floor((targetDist * 255) / dist), centre: false });
    }
    if (added % 2 === 0) {
      out.push({ q: origin.q, r: origin.r, value: input.traced ? 255 : 0, centre: true });
    }
  }
  return out;
}

function collapsePoint(points: Pt[]): Pt {
  if (points.length === 0) return { q: 0, r: 0, value: 0, centre: true };
  return points.length >= 3 ? points[2] : points[0];
}

// Collapse every point's position to the centre; keep each point's own value so the fan keeps its edge fade.
function collapseTo(points: Pt[]): Pt[] {
  const c = collapsePoint(points);
  return points.map(p => ({ ...p, q: c.q, r: c.r }));
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { q: a.q + (b.q - a.q) * t, r: a.r + (b.r - a.r) * t, value: a.value + (b.value - a.value) * t, centre: b.centre };
}

// Edge slot to array index: skip every third slot (the centre), so edge 0 -> 0, 1 -> 1, 2 -> 3, 3 -> 4 ...
function sampleEdge(points: Pt[], edgeCount: number, idx: number, sampleCount: number, fallback: Pt): Pt {
  if (edgeCount === 0) return fallback;
  if (sampleCount <= 1) return points[0];
  const src = Math.min(Math.floor((idx * (edgeCount - 1) + Math.floor((sampleCount - 1) / 2)) / (sampleCount - 1)), edgeCount - 1);
  const arr = 3 * Math.floor(src / 2) + (src % 2);
  return arr < points.length ? points[arr] : fallback;
}

function interpolate(from: Pt[], to: Pt[], t: number): Pt[] {
  const n = Math.max(from.length, to.length);
  if (n === 0) return [];
  const fromCentre = collapsePoint(from);
  const toCentre = collapsePoint(to);
  const fallback = to.length > 0 ? toCentre : fromCentre;
  const fromEdges = from.length - Math.floor(from.length / 3);
  const toEdges = to.length - Math.floor(to.length / 3);
  const edges = n - Math.floor(n / 3);
  const out: Pt[] = [];
  let edge = 0;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) {
      out.push(lerpPt(fromCentre, toCentre, t));
    } else {
      const a = sampleEdge(from, fromEdges, edge, edges, fallback);
      const b = sampleEdge(to, toEdges, edge, edges, fallback);
      out.push(lerpPt(a, b, t));
      edge++;
    }
  }
  return out;
}

export class FogLayer {
  points: Pt[] = [];
  private from: Pt[] = [];
  private target: Pt[] = [];
  private t0 = 0;
  private duration = 0;
  private active = false;
  private collapsing = false;
  private lastKey = "";

  prepare(input: FogInput, nowMs: number): void {
    // fix (donor defect): the donor's change check omitted ExtraLength, so changing it alone did not rebuild.
    const key = JSON.stringify([input.enabled, input.origin, input.lookDistance, input.extraLength, input.radius, input.reach, input.traced]);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.startTransition(buildFan(input), nowMs, input.durationMs);
    }
    this.update(nowMs);
  }

  private startTransition(points: Pt[], nowMs: number, durationMs: number): void {
    this.duration = Math.max(durationMs, 0);
    if (points.length === 0) {
      // Disappear: shrink the current fan to its centre, then clear.
      if (this.collapsing || this.points.length === 0) return;
      this.collapsing = true;
      if (this.duration > 0) {
        this.from = this.points;
        this.target = collapseTo(this.points);
        this.t0 = nowMs;
        this.active = true;
      } else {
        this.points = [];
        this.active = false;
      }
      return;
    }
    this.collapsing = false;
    if (this.duration === 0) {
      this.points = points;
      this.active = false;
      return;
    }
    if (this.points.length === 0) this.points = collapseTo(points);
    this.from = this.points;
    this.target = points;
    this.t0 = nowMs;
    this.active = true;
  }

  private update(nowMs: number): void {
    if (!this.active) return;
    const t = this.duration === 0 ? 1 : Math.min(Math.max((nowMs - this.t0) / this.duration, 0), 1);
    this.points = interpolate(this.from, this.target, t);
    if (t >= 1) {
      this.points = this.target;
      this.active = false;
      if (this.collapsing) {
        this.points = [];
        this.collapsing = false;
      }
    }
  }
}
