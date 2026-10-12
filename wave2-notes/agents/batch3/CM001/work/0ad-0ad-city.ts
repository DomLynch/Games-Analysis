// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Template {
  name: string;
  priority: number;   // higher is tried first; donor has no priority (list order is shuffled per candidate)
  maxCount: number;   // quota per district (donor: maxCount, line 13)
  margin: number;     // clearance in tiles around the footprint (donor: margin, line 10)
}

export interface Hub {
  centre: string;                              // placed first
  ring: { name: string; count: number }[];     // one group per side, in order
  dist: number;                                // tiles from centre to each group (donor default 6, line 75)
  spacing: number;                             // tiles between members of a group (donor: space = 2, line 87)
}

export interface Placed { name: string; x: number; y: number; angle: number; }

// Seeded RNG (mulberry32) so server and client produce the same town from one seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// Own rotation helper for this sketch (the donor's Vector2D.rotate is not read).
function rot(x: number, y: number, a: number): [number, number] {
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

// Hub: centre first, then one centred group per side. Group j = 1..4 faces side orient - PI*(1 - j/2).
export function placeHub(
  hub: Hub,
  orient: number,
  cx: number,
  cy: number,
  put: (name: string, x: number, y: number, angle: number) => boolean,
): Placed[] {
  const out: Placed[] = [];
  if (put(hub.centre, cx, cy, orient)) out.push({ name: hub.centre, x: cx, y: cy, angle: orient });
  hub.ring.forEach((group, k) => {
    const side = orient - Math.PI * (1 - (k + 1) / 2);
    for (let num = 0; num < group.count; num++) {
      const [ax, ay] = rot(hub.dist, 0, -side);
      const [bx, by] = rot(hub.spacing * (-num + (group.count - 1) / 2), 0, side);
      const x = cx + ax + bx;
      const y = cy + ay + by;
      if (put(group.name, x, y, side)) out.push({ name: group.name, x, y, angle: side });
    }
  });
  return out;
}

function tryOrder(sorted: Template[], rnd: () => number): Template[] {
  const out: Template[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].priority === sorted[i].priority) j++;
    out.push(...shuffleInPlace(sorted.slice(i, j), rnd));   // shuffle only among equal priority
    i = j;
  }
  return out;
}

// District: greedy first-fit over candidate tiles. The caller supplies fits() (footprint free, zone
// constraints such as spacing from a class or nearness to a road) and commit(). Mutates `cells`.
export function placeDistrict(
  cells: { x: number; y: number }[],
  templates: Template[],
  baseAngle: number,
  fits: (t: Template, x: number, y: number) => boolean,
  commit: (t: Template, x: number, y: number) => void,
  rnd: () => number,
): Placed[] {
  const counts = new Map<string, number>();
  const placed: Placed[] = [];
  const order = [...templates].sort((a, b) => b.priority - a.priority);
  shuffleInPlace(cells, rnd);   // fix: donor scans x then y, so greedy placement always fills from the scan start
  for (const c of cells) {
    for (const t of tryOrder(order, rnd)) {
      if ((counts.get(t.name) ?? 0) >= t.maxCount) continue;
      if (!fits(t, c.x, c.y)) continue;
      commit(t, c.x, c.y);
      counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
      const angle = baseAngle + Math.floor(rnd() * 4) * (Math.PI / 2);   // aligned, 90-degree steps (donor line 59)
      placed.push({ name: t.name, x: c.x, y: c.y, angle });
      break;
    }
  }
  return placed;
}

export {};
