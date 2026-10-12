// Clean-room sketch. Donor: OpenRCT2 (GPL version 3, file header). Written from the described mechanism, not a translation.
type Kind = "entrance" | "edge" | "track" | "queuePath" | "plainPath";
interface Probe { dir: number; kind: Kind; ride: number | null; entrance: number | null; queueEdges: number; canSteal: boolean }
interface Neighbour { order: number; dir: number; kind: Kind; ride: number | null; entrance: number | null }
interface Tile { isQueue: boolean; edges: number } // edges: 4-bit mask, one bit per side

// Priority numbers as the donor pushes them. Higher is connected first.
const ORDER = { entrance: 8, edge: 7, track: 1, queuePath: 4, steal: 3, plainPath: 2 } as const;

function popcount4(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
}

// Query pass: one candidate per probed side, with the donor's priority numbers.
function collect(probes: Probe[], initiatorIsQueue: boolean, sandbox: boolean): Neighbour[] {
  const out: Neighbour[] = [];
  for (const p of probes) {
    let order: number;
    if (p.kind === "edge") {
      if (!sandbox) continue;
      order = ORDER.edge;
    } else if (p.kind === "queuePath") {
      if (popcount4(p.queueEdges) < 2) order = ORDER.queuePath;
      else if (initiatorIsQueue && p.canSteal) order = ORDER.steal;
      else continue;
    } else if (p.kind === "entrance") {
      order = ORDER.entrance;
    } else if (p.kind === "track") {
      order = ORDER.track;
    } else {
      order = ORDER.plainPath;
    }
    out.push({ order, dir: p.dir, kind: p.kind, ride: p.ride, entrance: p.entrance });
  }
  return out;
}

// Higher order first; equal order goes to the lower direction first.
function sortNeighbours(list: Neighbour[]): Neighbour[] {
  return [...list].sort((a, b) => b.order - a.order || a.dir - b.dir);
}

// Queue tiles: keep the ride of the first ride-bearing neighbour, drop other rides and other entrances
// of that ride, then cap at two. Builds a new list (the donor removes by index inside a counting loop,
// which skips the item that moves into the removed slot; that is the defect fixed here).
function queueFilter(sorted: Neighbour[]): Neighbour[] {
  let ride: number | null = null;
  let entrance: number | null = null;
  const kept: Neighbour[] = [];
  for (const n of sorted) {
    if (n.ride !== null) {
      if (ride === null) {
        ride = n.ride;
        entrance = n.entrance;
      } else if (n.ride !== ride) {
        continue;
      } else if (n.entrance !== null && n.entrance !== entrance) {
        continue;
      }
    }
    kept.push(n);
  }
  return kept.slice(0, 2);
}

// Connect pass in list order. The initiating tile sets its edge bit toward every accepted neighbour
// (path, ride track, entrance, edge). The reverse bit on a path neighbour is set on that neighbour's own
// tile and is not modelled here. Queue side effects (disconnecting a full queue) are not modelled.
function connectEdges(tile: Tile, probes: Probe[], sandbox: boolean): { edges: number; links: Neighbour[] } {
  let list = sortNeighbours(collect(probes, tile.isQueue, sandbox));
  if (tile.isQueue) list = queueFilter(list);
  let edges = tile.edges;
  for (const n of list) edges |= 1 << n.dir;
  return { edges, links: list };
}

export {};
