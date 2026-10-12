# nkzw-tech-athena-crisis (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/generator/MapGenerator.tsx` | Licence: MIT for the source code (LICENSE.md line 3); LICENSE.md line 29 says branding, game content, art and sound assets are under separate terms | TypeScript | symbol `generateBuildings` (line 56)

Checked: the hint file hera/Mask.tsx (1-40) is a touch-target mask for the UI, so it is the wrong file. The real generator was found by grep for generateBuildings. Read in full: athena/generator/MapGenerator.tsx 56-259 (generateBuildings) and 368-414 (generateRandomMap, generatePlainMap). Read the head of generateSea (262-300) only. Also read hera/campaign/Level.tsx MiniMap (from line 445, to just before RewardDetail at 492): it is a scaled map preview for a campaign level, not a world minimap, so it has no city-layout mechanism. Callers: hera/editor/MapEditor.tsx (276, the editor's random-map action) and two test files (tests/__tests__/MapGenerator.test.tsx, tests/__tests__/HaltingProblem.test.tsx). Not read: getMovementPath, moveable and isAccessible (lib and Radius files), indexToVector, validateMap, convertBiome, the ConstructionSite, barrier and HQ definitions, expandStar, and @nkzw/core random (the code assumes inclusive bounds; not confirmed). Confidence: high on the order of steps and the numbers in generateBuildings; medium on what the path helper returns (which end of the street gets dropped). camera_scope: n/a.

Best transferable idea: pair two hubs, route one street between them, cut a river across the middle of that street with bridges where they meet (half carry a barrier), then fill each hub's ring with capped services and plots.

Decision (proposed): adapt. Keep the order (street first, then the river cut, then bridges as chokepoints) and the per-hub caps, because a generated zone gets one readable road and one chokepoint from small data. Adapt it to run on the server from zone data, use Frankendom's own movement pathing, and fix the two factory-counter defects in section 6. Owner ids come from the server ledger, not from the map.

Acceptance: a player sees one road between the two hubs with a river across its middle and a bridge where they cross; a server test asserts that every street tile crossing the river is a bridge, barriers appear only on bridges, and each hub has at most two factory-type buildings.

## 1. Mechanism

- Hub pair (56-77): a random seed picks a start index in the first 40 percent of the tiles (61), then the code scans forward (62) for the first tile that is not on the edge. The second hub is the point mirror of the first, with a jitter of about two tiles either way (64-65); both must be on the map and not on the edge. The loop breaks on the first success (77).
- Street (81-95): the movement radius is twice the map diagonal (81). A walkable path between the two hubs is found with the engine's movement pathing (87-92), its last tile is dropped (92), and each remaining tile becomes Street (95). Path semantics not read.
- Centre (98-99): the centre is the middle of the street, off by one either way (98). It needs a street at least three tiles long (99).
- River (102-170): the centre's four neighbours that are not street are shuffled (102-107). If two or more exist (108), the first two are the river's sides (109). From the first side, the code picks the nearest map edge and the opposite edge, with each edge point jittered by plus or minus 3 along the edge (110-113). It then paths from each edge point to its side (with cost 1, avoiding street and buildings) and marks the path plus both sides as River (170). Because the two sides are on opposite sides of the centre, the river crosses the street at the centre.
- Centre plots (175-185): the four diagonal neighbours of the centre that are not street or river are shuffled; all but the first two (the .slice(2) at 183) become ConstructionSite (185).
- Bridges (188-207): every street tile is checked. A tile with River above and below and Street left and right becomes River plus Bridge (203), the vertical case likewise. On a bridge, a coin flip (204) places a barrier building (207, HorizontalBarrier or VerticalBarrier, owner 0).
- Hub fill (216-256), run for each player (player 1 at the first hub, player 2 at the second): the candidate tiles are the neighbours of the hub's four neighbours (flatMap of expandStar, slice(1); the exact set depends on expandStar, which was not read), deduplicated, filtered to on-map, not the hub, not edge, not street or river (218-229). Eight are considered (230). Each becomes ConstructionSite (238). A coin flip (239-240) makes it a factory-type candidate: the factory count goes up (241) and is capped at two (215, 244). The first factory-type is Barracks or Factory by a second coin (245). Only candidates with index 0 to 5 get a building (250); the others are plots only.
- Finish (258-259): convertBiome with a random biome from the list, then validateMap; if validation returns nothing, the unvalidated map is kept.

## 2. Key functions

- `generateBuildings`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/generator/MapGenerator.tsx` 56-259. Hub pair 61-77; street and centre 81-99; river 102-170; plots 175-185; bridges and barriers 188-207; hub fill 216-256.
- `generateRandomMap`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/generator/MapGenerator.tsx` 368-395 (terrain weights 374-379, seed capital 390). The map is random terrain first, then generateBuildings runs on it (terrain list starts at 374).
- `generatePlainMap`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/generator/MapGenerator.tsx` 397-414 (read; a flat map with the same config).
- Editor caller: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/editor/MapEditor.tsx` 275-279 (generateSea wraps generateBuildings wraps generateRandomMap).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Random start in the first 40 percent, scan forward | `length / 2.5` (61) |
| Mirror the first hub, jitter it | `random(-2, 2)` on both axes (65) |
| Movement radius scale | twice the map diagonal (81) |
| Street centre off by one | `random(0, 1)` (98) |
| Minimum street length | 3 (99) |
| River edge jitter | plus or minus 3 (110-113) |
| Centre plots reserved | keep 2 of 4 diagonals, 2 become ConstructionSite (183-185) |
| Barrier chance on a bridge | a coin flip, 50 percent (204) |
| Candidates per hub | 8 (230) |
| Hub buildings | first 6 candidates (250) |
| Factory cap per hub | 2 (215) |
| Random map terrain | 28 plain, 6 forest, 3 forest 2, 4 mountain, 1 ruins, out of 42 entries (374) |
| Starting money on random maps | 500 (390) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: hub pair, street, centre, river from two centre sides out to the edges, two diagonal plots kept back and two reserved, bridges with a 50 percent barrier, then a ring of eight candidate plots per hub with six buildings and at most two factory-type buildings. It differs in these ways. It uses a plain breadth-first search where the donor uses the engine's movement pathing with a unit radius. It walks straight out from each side tile to the edge, where the donor picks the nearest edge and jitters by plus or minus 3. It omits the jitter, the river fill along the diagonal, the isAccessible rule, the barrier owner, the meaning of ConstructionSite, validateMap and convertBiome. It assumes the donor's random(lo, hi) is inclusive, which is not confirmed. It fixes two donor defects (section 6): the factory counter counts only placed buildings, and the Barracks check happens before the increment. The ring is tiles two steps from the hub, which is an assumption about expandStar. Typechecked on the VPS with tsc --strict, exit 0.

```ts
// Licence: MIT (donor: athena/generator/MapGenerator.tsx; LICENSE.md). Adapted in shape; written fresh from the described mechanism, not copied line by line.
type Pt = { x: number; y: number };
type Kind = 'plain' | 'street' | 'river' | 'bridge' | 'plot' | 'barracks' | 'factory' | 'house';
type Grid = { w: number; h: number; cells: Kind[] };

// 1-based coordinates, as in the donor (edges are x or y equal to 1 or the size).
const idx = (g: Grid, p: Pt): number => (p.y - 1) * g.w + (p.x - 1);
const inside = (g: Grid, p: Pt): boolean => p.x >= 1 && p.y >= 1 && p.x <= g.w && p.y <= g.h;
const onEdge = (g: Grid, p: Pt): boolean => p.x === 1 || p.y === 1 || p.x === g.w || p.y === g.h;
const kindAt = (g: Grid, p: Pt): Kind | null => (inside(g, p) ? g.cells[idx(g, p)] : null);
const put = (g: Grid, p: Pt, k: Kind): void => { g.cells[idx(g, p)] = k; };

// Inclusive integer range, the assumed meaning of the donor random(lo, hi).
const pickInt = (rand: () => number, lo: number, hi: number): number =>
  lo + Math.floor(rand() * (hi - lo + 1));

function shuffle<T>(rand: () => number, items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pair of HQs: a random seed in the first 40 percent, scan forward, mirror the first valid tile with jitter.
function placeHqPair(g: Grid, rand: () => number): [Pt, Pt] | null {
  const length = g.w * g.h;
  const seed = Math.floor(rand() * (length / 2.5));
  for (let j = seed; j < length; j++) {
    const a: Pt = { x: (j % g.w) + 1, y: Math.floor(j / g.w) + 1 };
    const b: Pt = {
      x: g.w - a.x + 1 + pickInt(rand, -2, 2),
      y: g.h - a.y + 1 + pickInt(rand, -2, 2),
    };
    if (inside(g, b) && (b.x !== a.x || b.y !== a.y) && !onEdge(g, a) && !onEdge(g, b)) {
      return [a, b];
    }
  }
  return null;
}

// Breadth-first path over cells that pass ok (the target is always allowed).
function bfs(g: Grid, from: Pt, to: Pt, ok: (p: Pt) => boolean): Pt[] | null {
  const prev = new Map<number, Pt>();
  const seen = new Set<number>([idx(g, from)]);
  const queue: Pt[] = [from];
  while (queue.length > 0) {
    const p = queue.shift() as Pt;
    if (p.x === to.x && p.y === to.y) {
      const path: Pt[] = [p];
      let back = prev.get(idx(g, p));
      while (back !== undefined) {
        path.push(back);
        back = prev.get(idx(g, back));
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q: Pt = { x: p.x + dx, y: p.y + dy };
      const isTarget = q.x === to.x && q.y === to.y;
      if (!inside(g, q) || seen.has(idx(g, q)) || !(isTarget || ok(q))) continue;
      seen.add(idx(g, q));
      prev.set(idx(g, q), p);
      queue.push(q);
    }
  }
  return null;
}

// Walk from p in direction (dx, dy) until the map edge.
function edgeFrom(g: Grid, p: Pt, dx: number, dy: number): Pt {
  let e = p;
  while (!onEdge(g, e)) e = { x: e.x + dx, y: e.y + dy };
  return e;
}

// Street between the HQs, a river crossing the middle of the street, bridges where they meet.
function buildRoad(g: Grid, hq1: Pt, hq2: Pt, rand: () => number): { bridges: Pt[]; barriers: Pt[] } {
  const none = { bridges: [] as Pt[], barriers: [] as Pt[] };
  const street = bfs(g, hq1, hq2, (p) => kindAt(g, p) === 'plain');
  if (street === null || street.length < 3) return none;
  street.forEach((p) => put(g, p, 'street'));

  // centre: middle of the street, off by one either way
  const center = street[Math.floor(street.length / 2) - 1 + pickInt(rand, 0, 1)];
  const sides = shuffle(
    rand,
    [
      { x: center.x, y: center.y - 1 },
      { x: center.x + 1, y: center.y },
      { x: center.x, y: center.y + 1 },
      { x: center.x - 1, y: center.y },
    ].filter((p) => inside(g, p) && kindAt(g, p) !== 'street'),
  );
  if (sides.length < 2) return none;

  // river: from the first two sides out to the map edge on the far side of each
  const [a, b] = sides;
  const edgeA = edgeFrom(g, a, a.x - center.x, a.y - center.y);
  const edgeB = edgeFrom(g, b, b.x - center.x, b.y - center.y);
  const notStreet = (p: Pt): boolean => kindAt(g, p) === 'plain';
  const pathA = bfs(g, edgeA, a, notStreet);
  const pathB = bfs(g, edgeB, b, notStreet);
  if (pathA === null || pathB === null) return none;
  [...pathA, ...pathB].forEach((p) => {
    if (kindAt(g, p) !== 'street') put(g, p, 'river');
  });

  // corners of the centre: keep two, reserve the other two as plots
  const corners = shuffle(
    rand,
    [
      { x: center.x - 1, y: center.y - 1 },
      { x: center.x + 1, y: center.y - 1 },
      { x: center.x - 1, y: center.y + 1 },
      { x: center.x + 1, y: center.y + 1 },
    ].filter((p) => inside(g, p) && kindAt(g, p) !== 'street' && kindAt(g, p) !== 'river'),
  );
  corners.slice(2).forEach((p) => put(g, p, 'plot'));

  // bridges where the street crosses the river; half get a barrier
  const bridges: Pt[] = [];
  const barriers: Pt[] = [];
  for (const p of street) {
    const up = kindAt(g, { x: p.x, y: p.y - 1 });
    const down = kindAt(g, { x: p.x, y: p.y + 1 });
    const left = kindAt(g, { x: p.x - 1, y: p.y });
    const right = kindAt(g, { x: p.x + 1, y: p.y });
    const crossesH = up === 'river' && down === 'river' && left === 'street' && right === 'street';
    const crossesV = left === 'river' && right === 'river' && up === 'street' && down === 'street';
    if (crossesH || crossesV) {
      put(g, p, 'bridge');
      bridges.push(p);
      if (rand() < 0.5) barriers.push(p);
    }
  }
  return { bridges, barriers };
}

// Each HQ gets up to eight plots in its ring; the first six get a building; at most two factory-type buildings.
function fillHub(g: Grid, hq: Pt, rand: () => number): void {
  const maxFactories = 2;
  const ring: Pt[] = [];
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 2) ring.push({ x: hq.x + dx, y: hq.y + dy }); // tiles two steps from the HQ
    }
  const candidates = shuffle(rand, ring).filter(
    (p) => inside(g, p) && !onEdge(g, p) && kindAt(g, p) === 'plain',
  );
  let factories = 0;
  candidates.slice(0, 8).forEach((p, i) => {
    put(g, p, 'plot');
    const wantsFactory = rand() < 0.5;
    if (i > 5) return; // only the first six candidates get a building
    if (wantsFactory && factories < maxFactories) {
      // count the factory only once it is placed; the first one is a barracks
      put(g, p, factories === 0 || rand() < 0.5 ? 'barracks' : 'factory');
      factories++;
    } else {
      put(g, p, 'house');
    }
  });
}

export function generateTown(w: number, h: number, rand: () => number): Grid | null {
  const g: Grid = { w, h, cells: new Array<Kind>(w * h).fill('plain') };
  const pair = placeHqPair(g, rand);
  if (pair === null) return null;
  const [hq1, hq2] = pair;
  put(g, hq1, 'house');
  put(g, hq2, 'house');
  buildRoad(g, hq1, hq2, rand);
  fillHub(g, hq1, rand);
  fillHub(g, hq2, rand);
  return g;
}
```

## 5. Lands in

- TARGET `origins/world/zone-roads.ts` (new, proposed): the zone-side generator for the street, river, bridges and hub plots. Server-side, so the client only draws the result; its pathing uses the one engine's walkable rule, not a separate search.
- Parity row 23 (zone population). This is the nearest row. Hub plots and factory caps are not population counts, so this is a stretch: Lead to confirm the row.
- Reuse tag: rewrite-from-idea (MIT; adapted in shape, Athena Crisis names and art not used)
- Brief rule served: 1 (one engine: generation on the server); zones as data (street, river, bridge chance, caps and plot counts are zone fields)

## 6. Gaps and risks

- MIT: adaptation is allowed. Athena Crisis content (its unit and building names, art, sounds, branding) is under separate terms (LICENSE.md 29); Frankendom uses its own names and assets.
- Defect, factory counter: the factory count goes up for every factory-type coin, including candidates that never get a building (241 with the index test at 250). So fewer factories get built than the cap allows. fix: count only placed buildings (the sketch does this).
- Defect, dead branch: at 241 the count is already at least one, so `factories === 0 ||` at 245 is never true and the first factory-type is a plain coin flip. fix: test before the increment, or make the first one explicit (the sketch does this).
- Defect, hub search: the scan starts at a random index in the first 40 percent and does not wrap (61-62), so the first hub is biased toward the later part of that index range. fix: wrap around, or sample random tiles and retry; check the map looks even across seeds.
- Random helper: the code relies on @nkzw/core random(lo, hi) being inclusive (it is used as a coin flip at 204, 240 and 245). Not confirmed in the repo. fix: write an explicit inclusive helper in Frankendom and test it.
- Street pathing: which end of the path gets dropped (92) was not read. fix: test that the street reaches both hubs.
- Owners: the map sets owner ids (player 1 and 2) on hub buildings. In Frankendom the owner lives in the server ledger; the layout returns positions and types only.
- Chokepoint idea: a bridge is one tile wide in this donor, so a bridge is a natural place for few attackers at a time. Frankendom's MAX_ATTACKERS = 3 may fit this, but that is a design idea of ours, not something the donor shows (barrier blocking was not read).
- Frankendom rulings: the zone fields (street, river, bridge chance, plot count, caps) are data; the engine owns generation; the client never decides where a hub or a bridge sits.
- Not transferred: terrain weights of Athena Crisis, its biome conversion, and its unit and building set.

Reuse tag: rewrite-from-idea (MIT; adapted in shape)
Brief rule served: 1 (one engine); zones as data
