// Licence: GPL-2.0 (repo LICENSE.md; the donor file itself has no licence header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Spot = { x: number; z: number; h: number };
type Pt = { x: number; z: number };

// Zone data: the numbers a designer would tune per map or per town layout.
interface PlaceParams {
  claimRadius: number;   // a hub claims spots this close (donor: 250 * 2.3 = 575 units)
  claimHeight: number;   // ...and this near in height (donor: 300)
  hubOffset: number;     // the hub stands this far from the best spot (donor: 120 units)
}

const dist2 = (ax: number, az: number, bx: number, bz: number): number =>
  (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

// Spots that no existing hub claims (claimed = inside claimRadius AND within claimHeight).
export function freeSpots(all: Spot[], hubs: Spot[], p: PlaceParams): Spot[] {
  return all.filter((s) =>
    hubs.every((h) => !(dist2(s.x, s.z, h.x, h.z) <= p.claimRadius * p.claimRadius && Math.abs(s.h - h.h) <= p.claimHeight)),
  );
}

// Place ONE hub from the free spots. Score: a neighbour inside the claim cylinder is worth 10,
// any other neighbour is worth 1 / sqrt(distance). Best score wins; the hub stands hubOffset
// from the best spot, toward its nearest other free spot.
export function placeHub(free: Spot[], p: PlaceParams, isSteep: (x: number, z: number) => boolean): Pt | null {
  if (free.length === 0) return null; // simplified: the walkable-outside-box branch and the metal-map grid fallback are omitted

  const scores: number[] = free.map(() => 0);
  for (let i = 0; i < free.length; i++) {
    for (let j = 0; j < free.length; j++) {
      const a = free[i];
      const b = free[j];
      if (a.x === b.x && a.z === b.z) continue;
      const r = Math.sqrt(dist2(a.x, a.z, b.x, b.z));
      const within = r <= p.claimRadius && Math.abs(a.h - b.h) <= p.claimHeight;
      scores[i] += within ? 10 : 1 / Math.sqrt(r);
    }
  }

  let best = 0;
  for (let i = 1; i < free.length; i++) {
    if (scores[i] >= scores[best]) best = i; // donor: ties go to the later spot
  }
  const b = free[best];

  let near: Spot | null = null;
  let nearD = Infinity;
  for (let i = 0; i < free.length; i++) {
    if (i === best) continue;
    const d = dist2(b.x, b.z, free[i].x, free[i].z);
    if (d < nearD) {
      nearD = d;
      near = free[i];
    }
  }

  // Donor lines 289-291 use `or` and `bx + 1` for z. Fixed here: fall back only when there is
  // no other spot or it is the same point, and use the z coordinate for z.
  let dx: number;
  let dz: number;
  if (near === null || (near.x === b.x && near.z === b.z)) {
    dx = Math.SQRT1_2;
    dz = Math.SQRT1_2;
  } else {
    const norm = Math.sqrt(nearD);
    dx = (near.x - b.x) / norm;
    dz = (near.z - b.z) / norm;
  }

  let x = b.x + p.hubOffset * dx;
  let z = b.z + p.hubOffset * dz;
  if (isSteep(x, z)) {
    x = b.x; // steep ground: stand on the spot itself
    z = b.z;
  }
  return { x, z };
}

// One hub at a time, in an explicit order. Each placed hub is claimed before the next is placed.
export function placeAll(
  order: string[],
  spots: Spot[],
  p: PlaceParams,
  isSteep: (x: number, z: number) => boolean,
  heightAt: (x: number, z: number) => number,
): Map<string, Pt> {
  const hubs: Spot[] = [];
  const out = new Map<string, Pt>();
  for (const team of order) {
    const at = placeHub(freeSpots(spots, hubs, p), p, isSteep);
    if (at === null) continue; // simplified: the donor falls back to GuessTwo, then the middle of the box
    hubs.push({ x: at.x, z: at.z, h: heightAt(at.x, at.z) });
    out.set(team, at);
  }
  return out;
}
