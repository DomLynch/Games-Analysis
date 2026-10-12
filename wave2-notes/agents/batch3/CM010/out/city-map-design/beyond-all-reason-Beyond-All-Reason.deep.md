# beyond-all-reason-Beyond-All-Reason (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/common/lib_startpoint_guesser.lua` (entry `GuessStartSpot`, 397-420; caller `luarules/gadgets/game_initial_spawn.lua` 655-700) | Licence: GPL v2 (`/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/LICENSE.md` line 2: "BAR game code is released under the GPL v2 licence"; per-file licences are declared in wupget:GetInfo, and this file has no licence header of its own) | Lua | symbol `GuessStartSpot`

Checked: Hint was INFERRED (no hint file), so I grepped the donor for landmark, signpost, signage, startbox and minimap in `*.lua`. Read: `common/lib_startpoint_guesser.lua` 1-25, 31-39, 87-112, 113-144, 145-310, 311-396, 397-420 (the whole placement path; lines 40-86 not read); `luarules/gadgets/game_initial_spawn.lua` 655-700 (the caller loop); `LICENSE.md` line 2. Named but NOT read: `luaui/Include/minimap_utils.lua` and `luaui/Widgets/gui_minimap.lua` (minimap); `luarules/gadgets/include/startbox_utilities.lua`; `common/upgets/api_resource_spot_finder.lua` (where the metal spot list comes from); `StartboxSamples` (46-86) and `PolygonLib.PointInStartbox`; the second caller in `luaui/Widgets/map_startbox.lua` 1522. Files opened: 3 (the guesser, the caller, LICENSE.md); the grep hits for the other topic words were not read. Confidence: high on placement order and numbers; medium on the spot input, which is an RTS metal-spot list and is not read. camera_scope: n/a. Depth: full for the placement path (not the spot source). The game is an RTS: the "claim" is about metal, not about city buildings. The mechanism is the hub spacing rule, not the economy.

## 1. Mechanism

- Hubs are team start points, and they are placed one at a time. `GuessStartSpot` guesses one team's point, writes it into the shared `startPointTable`, and returns (`lib_startpoint_guesser.lua` 404-406, 410-412, 417-418). Later teams see earlier hubs as claims. The caller loops over teams with `pairs(teams)` (`game_initial_spawn.lua` 685, 696, 700).
- Step 1, `GuessOne` (145-309). Each metal spot is "free" when no existing start point claims it. A start point claims a spot when the spot is inside the claim radius (575 units, from `250 * 2.3`, line 3) and within 300 units of height (line 5). The loop runs over every existing start point, enemies included (169-178). Free spots inside the team's box are kept. Free spots outside the box, within 750 units of it (line 6), are kept as walkable.
- Scoring (225-261). Each free in-box spot sums a score over every other free spot and every walkable spot: 10 if the pair is inside the claim radius and height, otherwise `r ^ (-1/2)`, the inverse square root of the distance (236-240). The highest score wins, and ties go to the later index (264-268).
- Placement (272-306). The hub stands 120 units (`disp`, line 298) from the best spot, toward the nearest other free spot. If that point is steep (`IsSteep`, line 303), the hub stands on the spot itself.
- Step 1b, no free in-box spot (191-210). The code loops over the walkable spots, takes each one's nearest in-box point, and keeps a point if it is not steep. The "nearest" test never updates its distance, so the kept point is the last eligible one, not the nearest. See defect 1 in section 6.
- Step 2, `GuessTwo` (311-395), when step 1 gives nothing. It lays a grid over the box, counts unclaimed metal within 375 units (`250 * 1.5`, line 4) and 300 units of height for each grid point, and returns the grid point with the most metal (378-390).
- Step 3, the middle of the box (417). Steepness, `IsSteep` (117-143): it samples ground height 5 units away in four directions (120-137) and compares the slope with `mtta`, which is `mathAcos(1.0 - 0.41221) - 0.02` (line 113). Worked out by hand, not run: about 0.92 rad (about 53 degrees).

## 2. Key functions

- `GuessStartSpot`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/common/lib_startpoint_guesser.lua` 397-420. Tries GuessOne, then GuessTwo, then the middle of the box. Writes the hub into `startPointTable[teamID]` at each success.
- `GuessOne`: same file, 145-309. Free test (168-178), scoring (213-261), best and nearest (263-286), offset and steep fallback (294-306), walkable branch (191-210).
- `GuessTwo`: same file, 311-395. The metal-map grid fallback.
- `IsSteep`: same file, 117-143. Four-sample slope test.
- Caller: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_initial_spawn.lua` 655-700 (`spawnRegularly` at 667; `gadget:GameStart` loop at 685-700).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers |
|---|---|
| Claim cylinder: a hub blocks spots within radius AND height | radius 575 = 250 x 2.3 (`lib_startpoint_guesser.lua` 3); height 300 (line 5) |
| Walkable ring outside the box | 750 = 250 x 3 (line 6) |
| Coarse fallback claim radius | 375 = 250 x 1.5 (line 4) |
| Pair score inside the claim cylinder | 10 (line 237) |
| Pair score outside | 1 / sqrt(distance) (line 239) |
| Hub offset from best spot | 120 units (line 298) |
| Steep test | 4 samples at 5 units (line 120); threshold acos(1 - 0.41221) - 0.02 (line 113) |
| Last resort | middle of the start box (line 417) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the in-box path only: free test by claim cylinder, pair scores (10 inside, 1/sqrt(r) outside), best spot, nearest other free spot, offset, steep fallback. It omits the walkable ring outside the box, the walkable branch (step 1b), the metal-map grid fallback (GuessTwo), and the middle-of-box last resort, which returns null here. It fixes the donor's fallback direction (lines 289-291: `or` and `nz = bx + 1`) so the direction uses z and is unit length. It takes ground heights as given. It places hubs in an explicit order (the donor uses `pairs`). Anchors are generic "spots", not metal.

```ts
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
```

Typecheck: copied to the VPS as `/tmp/CM010-bar-hub-placer.ts`, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0. Local copy: `/private/tmp/p2/wave2-haiku/batch3/CM010/work/bar-hub-placer.ts`.

## 5. Lands in

- TARGET `origins/world/hub-placement.ts` (new, proposed): places town or service hubs one at a time inside a zone, with the claim cylinder as the spacing rule. Parity-checklist row 23 (zone population; the brief's hint). The claim radius, height and offset are zone data. Row 23 is the closest row; the hub layout itself is zone generation, not population.
- Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
- Brief rule served: zones as data (one runtime; the layout numbers are per-zone data); server-verified placement (the layout is decided once on the server, and clients only render it).

## 6. Gaps and risks

- GPL v2: clean-room only. The sketch is written from the mechanism, not translated.
- Defect 1, walkable branch never updates its best distance: `bestDist` is set once (line 198) and compared at line 204 (`dist < bestDist`) but never assigned from `dist`. The code therefore returns the last eligible walkable spot, not the nearest. Fix: set `bestDist = dist` when a closer one is found.
- Defect 2, fallback direction: line 289 uses `or` (any shared coordinate triggers the fallback), and lines 290-291 set `nz = bx + 1` (z taken from x). Fix: fall back only when there is no other spot or it is the same point; set z from `bz`; normalise the direction. The sketch does this. (Lines 290-291 are too short to receipt, so the verbatim text is quoted here: `nx = bx + 1`, `nz = bx + 1`.)
- Defect 3, placement order: the caller iterates `pairs(teams)` (`game_initial_spawn.lua` 685). The first team placed gets first pick of the free spots, and Lua gives no order guarantee for `pairs`. Fix: an explicit, seeded order.
- Defect 4, cost: `GuessTwo` recomputes ground height per start point per grid sample (line 350); the author's own note says it takes 1-2 s (line 311). Fix: precompute heights once per cell.
- Gap, input: the anchors are metal spots from an RTS resource finder (not read). Frankendom must supply landmark or resource anchors as zone data.
- Gap, scoring: the donor says all metal spots are of equal value ("Assumes all metal spots are of equal production value", line 235). Frankendom anchors will differ in value, so the score needs a weight field per anchor.
- Gap, clip to footprint: the donor places hubs only inside a team's box, with a walkable ring outside it. A town layout needs the same clip to the zone footprint (the zone tile list in our data).
- The minimap and the signage questions for this cell are not answered by this donor (minimap files named, not read).
- Frankendom rulings: the hub order must be server-side and deterministic, so the test can assert the same layout on every run.

Best transferable idea: place hubs one at a time: each new hub must stay outside the claim cylinder of every hub already placed, is scored against the free anchors that remain, and then stands a fixed offset from the best anchor toward its nearest neighbour.
Decision (proposed): adapt. Keep the claim-then-place order and the claim cylinder (radius and height) as the spacing rule for town or service hubs; drop the equal-value metal score and the walkable branch until the fixes are in; replace metal spots with landmark or resource anchors from zone data.
Acceptance: on a generated zone, no second hub is placed inside the first hub's claim cylinder; a server test places four hubs in a fixed order and asserts the same layout on every run.

Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
Brief rule served: zones as data; server-verified, deterministic placement; the client only renders the layout.
