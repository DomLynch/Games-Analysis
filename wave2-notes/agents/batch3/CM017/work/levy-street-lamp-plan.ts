// Licence: MIT (donor repo LICENSE, "MIT License Copyright (c) 2026 Levy Street"). Adapted shape of planStreetlamps.
export interface Pt { x: number; z: number; }
export interface Hub extends Pt { radius: number; }
export interface Probes {
  groundAt(x: number, z: number): number;   // terrain height at a world XZ
  blocked(x: number, z: number): boolean;   // a prop or collider already owns this spot
  roadClear(x: number, z: number): number;  // distance to the painted road centre
}
export interface PlanOpts {
  spacingInTown: number;  // donor default 26 (units)
  spacingOpen: number;    // donor default 64
  reachScale: number;     // donor default 1.6
  reachPad: number;       // donor default 60
  offset: number;         // donor default 3.8
  clearMin: number;       // donor default 3.0
  clearMax: number;       // donor default 5.6
  nudgeStep: number;      // donor default 0.45
  maxNudges: number;      // donor default 8
  minSeparation: number;  // donor default 18
  minGroundY: number;     // donor default -3
}
export interface Site { x: number; z: number; y: number; roadYaw: number; }

// simplified: keeps the donor order (walk road by cumulative arc length, pick the town or open step at the sample,
// offset to the alternate side, nudge into the clearance band, reject on crowding, ground, then blocked) and fixes one
// donor defect: the side is taken from the count of PLACED lamps on the road (placedOnRoad), not from every sample,
// so a rejected spot no longer flips the side parity. Omitted: areaAt identity, the authored-chord clearance check
// (authoredRoadDistance), styleStreetlampSites and lampFixtureYaw, and the caller's collider planting.
export function planRoadLamps(roads: readonly (readonly Pt[])[], hubs: readonly Hub[], p: Probes, o: PlanOpts): Site[] {
  const reachSq = hubs.map((h) => { const r = h.radius * o.reachScale + o.reachPad; return r * r; });
  const inTownReach = (x: number, z: number): boolean =>
    hubs.some((h, i) => (x - h.x) ** 2 + (z - h.z) ** 2 <= reachSq[i]);

  const sites: Site[] = [];
  // spatial hash: cell size = minSeparation, so only the 3x3 block around a candidate can conflict
  const buckets = new Map<string, number[]>();
  const cellOf = (v: number): number => Math.floor(v / o.minSeparation);
  const keyOf = (cx: number, cz: number): string => `${cx},${cz}`;
  const tooClose = (x: number, z: number): boolean => {
    const cx = cellOf(x);
    const cz = cellOf(z);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const i of buckets.get(keyOf(cx + dx, cz + dz)) ?? []) {
          const sx = sites[i].x - x;
          const sz = sites[i].z - z;
          if (sx * sx + sz * sz < o.minSeparation * o.minSeparation) return true;
        }
      }
    }
    return false;
  };
  const remember = (i: number): void => {
    const k = keyOf(cellOf(sites[i].x), cellOf(sites[i].z));
    const b = buckets.get(k);
    if (b) b.push(i);
    else buckets.set(k, [i]);
  };
  // downhill of the clearance probe = direction from the post toward the road
  const roadYawAt = (x: number, z: number, fx: number, fz: number): number => {
    const gx = p.roadClear(x + 0.5, z) - p.roadClear(x - 0.5, z);
    const gz = p.roadClear(x, z + 0.5) - p.roadClear(x, z - 0.5);
    if (Number.isFinite(gx) && Number.isFinite(gz) && Math.hypot(gx, gz) > 1e-6) {
      return Math.atan2(-gx, -gz);
    }
    return Math.hypot(fx, fz) > 1e-6 ? Math.atan2(fx, fz) : 0;
  };

  for (const road of roads) {
    if (road.length < 2) continue;
    let placedOnRoad = 0;                 // FIX: parity counts placed lamps, restarts per road
    let carried = o.spacingInTown * 0.5;  // distance still owed before the first lamp
    for (let i = 0; i + 1 < road.length; i++) {
      const a = road[i];
      const b = road[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len <= 1e-6) continue;
      const ux = (b.x - a.x) / len;
      const uz = (b.z - a.z) / len;
      const nx = -uz;                     // roadside normal
      const nz = ux;
      let d = carried;
      while (d < len) {
        const onX = a.x + ux * d;
        const onZ = a.z + uz * d;
        const side = placedOnRoad % 2 === 0 ? 1 : -1;
        d += inTownReach(onX, onZ) ? o.spacingInTown : o.spacingOpen;
        let x = onX + nx * side * o.offset;
        let z = onZ + nz * side * o.offset;
        let clear = p.roadClear(x, z);
        for (let n = 0; (clear < o.clearMin || clear > o.clearMax) && n < o.maxNudges; n++) {
          const s = clear < o.clearMin ? o.nudgeStep : -o.nudgeStep;
          x += nx * side * s;
          z += nz * side * s;
          clear = p.roadClear(x, z);
        }
        if (clear < o.clearMin || clear > o.clearMax) continue;
        if (tooClose(x, z)) continue;
        const y = p.groundAt(x, z);
        if (y < o.minGroundY) continue;
        if (p.blocked(x, z)) continue;
        sites.push({ x, z, y, roadYaw: roadYawAt(x, z, onX - x, onZ - z) });
        remember(sites.length - 1);
        placedOnRoad++;
      }
      carried = d - len;
    }
  }
  return sites;
}

export {};
