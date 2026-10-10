// Licence: GPL v2 (donor, beyond-all-reason). Clean-room sketch of the mechanism shape only; not a translation.
type Pt = { x: number; z: number };
type Poly = Pt[];

// Zone data: for each team count, one list of polygons per ally team (index = ally team id).
type Layouts = Map<number, Poly[][]>;
type Layout = { perAllyTeam: Poly[][]; source: "override" | "set" };

// 1. Pick the layout for this team count: override, then exact, then nearest larger, then nearest smaller.
function pickLayout(layouts: Layouts, teams: number, override?: Poly[][]): Layout | null {
  if (override && override.length >= teams) return { perAllyTeam: override, source: "override" };
  const exact = layouts.get(teams);
  if (exact) return { perAllyTeam: exact, source: "set" };
  let larger: number | undefined;
  let smaller: number | undefined;
  for (const k of layouts.keys()) {
    if (k > teams && (larger === undefined || k < larger)) larger = k;
    if (k < teams && (smaller === undefined || k > smaller)) smaller = k;
  }
  if (larger !== undefined) return { perAllyTeam: layouts.get(larger)!, source: "set" };
  if (smaller !== undefined) return { perAllyTeam: layouts.get(smaller)!, source: "set" };
  return null; // caller falls back to a default split of the map
}

// 2. Ray-casting point-in-polygon (crossing number). Concave shapes are fine.
function inPoly(x: number, z: number, poly: Poly): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  let j = poly.length - 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.z > z) !== (b.z > z)) {
      const xHit = b.x + ((z - b.z) * (a.x - b.x)) / (a.z - b.z);
      if (x < xHit) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function inZone(x: number, z: number, polys: Poly[]): boolean {
  return polys.some((p) => inPoly(x, z, p));
}

// 3. One draw per call inside the bounding box, clipped to the map. Accept only if the point and its four
//    cardinal offsets at distance `inset` are all inside, so the item keeps clear of the edge.
function drawInZone(
  polys: Poly[],
  mapX: number,
  mapZ: number,
  inset: number,
  rnd: () => number,
): Pt | null {
  let xmin = Infinity, zmin = Infinity, xmax = -Infinity, zmax = -Infinity;
  for (const p of polys) for (const v of p) {
    xmin = Math.min(xmin, v.x); zmin = Math.min(zmin, v.z);
    xmax = Math.max(xmax, v.x); zmax = Math.max(zmax, v.z);
  }
  xmin = Math.max(xmin + inset, 0); zmin = Math.max(zmin + inset, 0);
  xmax = Math.min(xmax - inset, mapX); zmax = Math.min(zmax - inset, mapZ);
  if (xmin > xmax || zmin > zmax) return null;

  const x = xmin + Math.floor(rnd() * (xmax - xmin + 1));
  const z = zmin + Math.floor(rnd() * (zmax - zmin + 1));
  const ok =
    inZone(x, z, polys) &&
    (inset === 0 ||
      (inZone(x - inset, z, polys) && inZone(x + inset, z, polys) &&
        inZone(x, z - inset, polys) && inZone(x, z + inset, polys)));
  return ok ? { x, z } : null;
}

// 4. A point outside the zone is pulled to the nearest point on any edge of any polygon.
function closestOnZone(x: number, z: number, polys: Poly[]): Pt {
  if (inZone(x, z, polys)) return { x, z };
  let best: Pt = { x, z };
  let bestD = Infinity;
  for (const poly of polys) {
    const n = poly.length;
    for (let j = 0; j < n; j++) {
      const a = poly[j];
      const b = poly[(j + 1) % n];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const lenSq = ex * ex + ez * ez;
      const t = lenSq > 0 ? Math.min(1, Math.max(0, ((x - a.x) * ex + (z - a.z) * ez) / lenSq)) : 0;
      const px = a.x + ex * t;
      const pz = a.z + ez * t;
      const d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < bestD) { bestD = d; best = { x: px, z: pz }; }
    }
  }
  return best;
}

export {};
