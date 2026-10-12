# levy-street-world-of-claudecraft (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/streetlamp_layout.ts` | Licence: MIT License, Copyright (c) 2026 Levy Street (repo `LICENSE` lines 1, 3, 5; adaptation allowed) | TypeScript | symbol `planStreetlamps`

Checked: Read `planStreetlamps` (185-331) end to end, plus the header and option defaults (1-122), `authoredRoadDistance` (123-145) and `lampFixtureYaw` (158-161). Production caller read: `src/sim/colliders.ts` `buildStreetlampPlacements` (1620-1641) and `addStreetlampColliders` (1658-1690, read in part). Tests read in part: `tests/streetlamp_layout.test.ts` 20-60 and 95-136 (not run). Not read: `styleStreetlampSites`, `resolvePosition`, `roadDistance`, `terrainHeight`, the road densifier in `src/sim/world.ts`, `src/render/streetlamps.ts`. Confidence high on the placement loop (all of it read); medium on how the caller's probes behave, since those bodies were not read. Not a camera cell.

Best transferable idea: Place street furniture one candidate at a time while walking each road by arc length, choose the spacing from the hub reach at each sample, and reject any candidate that crowds an already placed one through a grid, instead of hand-placing every post.

Decision (proposed): adapt — the pure, deterministic, probe-driven planner, with one list feeding both the collider and the draw, fits zones-as-data and the one-ledger ruling; the spacing numbers become zone data and the side parity gets the fix in section 4.

Acceptance: A player walking a zone road sees posts about every 26 units inside a hub's reach and every 64 units outside it, alternating sides, none within 18 units of another, and cannot walk into a post; a zone test asserts that the collider list and the drawn list are the same array.

## 1. Mechanism

- Inputs: road polylines (sparse waypoints; the donor densifies them in `world.ts`, not read), a list of hubs `{x, z, radius}` (one per zone, from `zone.hub`), and four probes: `groundAt`, `blocked`, `roadClear` (distance to the painted road centre), and an optional `areaAt`. Output: sites `{x, y, z, roadYaw}`.
- Walk, per road in array order: a cursor moves along each chord by cumulative arc length. `carried` starts at half a town step (279) and the unspent remainder carries into the next chord (327). A waypoint never restarts the step.
- At each sample point, in order: (a) side = +1 on even `stepIndex`, -1 on odd (297, then `stepIndex++` at 298); (b) the step to the NEXT sample is 26 if the sample is inside any hub's reach, else 64 (301). Reach is `radius x 1.6 + 60` (205-206) tested as a squared distance (213).
- Candidate post: offset 3.8 along the roadside normal, on the chosen side (95). If `roadClear` is outside [3.0, 5.6] (96-97), it slides along that normal in steps of 0.45 (98) toward the band, at most 8 steps (99, 309). Still outside: rejected (316).
- Then, in order: the authored-chord floor `authoredRoadDistance` (317; only active when the caller sets `authoredClearMin`, which the production caller does); the crowding test (318) against every lamp already placed, through a spatial grid whose cell equals `minSeparation` 18 (104, 224), so only the 3x3 block around the candidate is checked; the ground floor, which drops sites below -3 (105, 320); the `blocked` probe (321).
- Accept: `roadYaw` is the direction from the post to the road, from the central difference of `roadClear` with step 0.5 (118). `atan2(-gx, -gz)` (270). If the gradient is flat, it falls back to the direction from the post to the chord sample it came from (`onX - x`, `onZ - z`). The site is pushed and indexed (322).
- Order of operations as a sequence: sample, side, advance the cursor by the tier, offset, nudge, band, authored floor, crowding, ground, blocked, push. Rejections are silent: the cursor has already moved on, so a rejected spot leaves a gap of one step.
- Caller (all callers checked: one production caller, `buildStreetlampPlacements`; the tests call it directly): every zone hub is passed as a town (1624). `roadClear` is the world's `roadDistance` (1634). `blocked` asks `resolvePosition` with the lamp clearance (1628). `authoredClearMin` is `MAX_BODY_RADIUS` plus the largest lamp collider radius (1638). The result goes through `styleStreetlampSites` (1641). Forgefather fortress lamps are appended after planning (1659). A collider is planted on each site, except where the site stands on an NPC spot, so the post you see is the post you walk into.

## 2. Key functions

- `planStreetlamps`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/streetlamp_layout.ts` 185-331. The whole pipeline: tiers, band nudge, crowding, ground and blocked gates, yaw, push.
- Crowding grid, `tooClose` and `remember`: same file, 224-245. Cell = `minSeparation`; buckets keyed by the cell pair.
- `roadYawAt`: same file, 262-271. Central difference of the clearance probe, `FACING_PROBE_STEP` 0.5 (118).
- `authoredRoadDistance`: same file, 123-145. Distance from a point to every raw authored chord (the second clearance contract, used only when `authoredClearMin > 0`).
- `buildStreetlampPlacements`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/colliders.ts` 1620-1641. The single caller.
- `addStreetlampColliders`: same file, 1658-1683. Plants a full-height circle per site, no `moveTopY`, so a jump does not clear it.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Walk by arc length; leftover distance carries into the next chord | Start at half the town step (279); no other constant (mechanism) |
| Step chosen at the sample by hub reach | Town step 26 (91), open step 64 (92); the caller passes no overrides, so these are the shipped values |
| Hub reach disc | Radius x 1.6 (93) + 60 units (94); the hub radius itself is zone data |
| Clearance band around the painted road | Offset 3.8 (95); band 3.0 to 5.6 (96-97) |
| Nudge into the band | Step 0.45 (98), at most 8 steps (99): a correction of at most 3.6 units (computed, 0.45 x 8) |
| Crowding floor | 18 units (104); grid cell is the same 18 |
| Ground floor | -3 (105) |
| Facing gradient | Probe step 0.5 (118) |
| Authored-chord floor | MAX_BODY_RADIUS plus the largest lamp collider radius (colliders.ts 1638); the value of MAX_BODY_RADIUS not read |

## 4. TypeScript sketch

simplified: keeps the donor order (sample, side, cursor advance by tier, offset, nudge into the band, crowding, ground, blocked, push) and fixes one donor defect: the side is taken from the count of PLACED lamps on the road (`placedOnRoad`), not from every sample. In the donor the sample counter also advances on rejected spots (297-298 with the `continue` lines 316-321), so one rejected spot can put two placed lamps on the same side. Omitted: `areaAt` identity, the `authoredRoadDistance` floor (317), `styleStreetlampSites`, `lampFixtureYaw`, the collider planting, and the NPC-spot exception. The sketch takes roads and hubs as plain arrays and probes as an interface, so a test can drive it with flat ground.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/cm017-levy-street-lamp-plan.ts`). Not run: the sketch is not executed against the donor's tests.

## 5. Lands in

- TARGET `origins/world/streetlamp-layout.ts` (proposed path; not checked against the Frankendom tree): a pure planner run once per zone at load, fed by the zone's roads and hubs (zone data), returning one list that the collider and the client draw both read. Parity-checklist row 23 (zone population and placement as zone data: caps, spacing, clearance, separation as zone fields). Row 23 is the nearest row; no row covers road furniture exactly.
- today: no Frankendom lamp or road-furniture planner has been read; this note assumes none exists.
- Reuse tag: adapt-from-MIT (code may be adapted; say "adapted from Levy Street, MIT")
- Brief rule served: zones as data on one runtime (the spacing and clearance values are zone fields, not constants); one list read by server collision and client draw (one ledger for placed furniture); clearance is checked before placement, not by hand.

## 6. Gaps and risks

- The donor passes no per-zone overrides: all zones use 26, 64, 1.6, 60 and 18. Frankendom should make spacing and reach zone data fields, not engine constants, so a dense town and an open moor can differ.
- Defect, fixed in the sketch: side parity counts every sample (297-298) and the rejected spots advance it (316-321). Fix: count placed lamps per road (`placedOnRoad`). Keep the stated intent "sides alternate down the run" as the test.
- Trait, not fixed: the crowding test is first-come across roads in array order (275, 318), so the lamp that survives depends on the order of the road list. Fix if it matters: sort roads by id before planning, or keep the candidate nearer its own road centre. The sketch keeps first-come.
- Fortress lamps are appended after planning with no crowding check (colliders.ts 1659). Frankendom must run the same 18-unit floor across every source, or it will allow a double post at a fortress gate.
- The donor needs the authored-chord floor (317) because its painted road meanders off the raw chord; Frankendom's roads may be authored exactly, in which case the floor can go. The sketch leaves it out for that reason.
- Probes are the donor's world: `roadDistance`, `resolvePosition`, `terrainHeight` (not read). Frankendom needs its own equivalents. Cost: `authoredRoadDistance` scans every chord for every candidate (`authoredRoadDistance` 123-145, called at 317); this is startup work in the donor (the caller runs it once), not per frame. Cost not measured.
- The hub reach is a disc per hub. A zone with a long, narrow town will get the wrong tier at its ends (reasoned from the code; not tested).
- Not a fight mechanism: it changes no combat rule, no hate, no targeting, and does not touch MAX_ATTACKERS = 3. It is zone layout, and it is relevant to the walk because a lit road is how a player finds a hub.
- The NPC-spot exception (lamps standing on an NPC spot lose their collider; colliders.ts 1665-1666) is a rule worth copying: a town's furniture must never wall off the person you must walk up to.
- The minimap and map-marker code (`src/ui/minimap_painter.ts`, `src/ui/minimap_markers.ts`) was not read. This note says nothing about minimap, signage text, or building grammars.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
