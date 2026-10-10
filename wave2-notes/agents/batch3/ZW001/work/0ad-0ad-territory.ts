// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Influence {
  owner: number;   // player id; the donor ignores 0 and ids above 31
  tx: number;      // tile x of the entity (donor: nearest tile of its position)
  tz: number;      // tile z
  weight: number;  // template Weight (u16 in the donor)
  radius: number;  // template Radius, in world units (1 navcell = 1 unit)
  root: boolean;   // civic-centre style root: its owned, connected tiles are flagged
}

interface TileGrid {
  w: number;
  h: number;
  cost: number[];        // per tile: 1 passable, impassableCost on blocked tiles, 255 off the map
  impassableCost: number; // donor: 4, from territorymanager.xml
}

interface Ownership {
  owner: number[];                  // 0 = unclaimed
  connected: boolean[];             // reachable from a root of the same owner
  countByOwner: Map<number, number>; // connected passable tiles per owner
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1],
];
const TILE_NAVCELLS = 8; // donor NAVCELLS_PER_TERRITORY_TILE

function computeOwnership(g: TileGrid, infl: Influence[]): Ownership {
  const n = g.w * g.h;
  const owner: number[] = new Array<number>(n).fill(0);
  const best: number[] = new Array<number>(n).fill(0);

  const byPlayer = new Map<number, Influence[]>();
  for (const e of infl) {
    if (e.owner <= 0 || e.owner > 31 || e.weight === 0 || e.radius === 0) continue;
    const list = byPlayer.get(e.owner) ?? [];
    list.push(e);
    byPlayer.set(e.owner, list);
  }
  // Players in ascending id order, as the donor's std::map gives; equal totals keep the earlier owner.
  const players = [...byPlayer.keys()].sort((a, b) => a - b);

  for (const p of players) {
    const total: number[] = new Array<number>(n).fill(0); // summed weight of all of p's entities
    for (const e of byPlayer.get(p) ?? []) {
      const entity: number[] = new Array<number>(n).fill(0); // this entity's own weight per tile
      const fall = Math.floor((e.weight * TILE_NAVCELLS) / e.radius); // weight lost per tile of cost 1
      const origin = e.tz * g.w + e.tx;

      entity[origin] = e.weight;
      total[origin] += e.weight;
      if (total[origin] > best[origin]) { best[origin] = total[origin]; owner[origin] = p; }

      const queue: number[] = [origin];
      for (let head = 0; head < queue.length; head++) {
        const cur = queue[head];
        const cx = cur % g.w;
        const cz = Math.floor(cur / g.w);
        for (const [dx, dz] of NEIGHBOURS) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= g.w || nz >= g.h) continue;
          const ni = nz * g.w + nx;
          const perTile = fall * g.cost[ni];
          const diagonal = dx !== 0 && dz !== 0;
          const falloff = diagonal ? Math.floor((perTile * 362) / 256) : perTile; // about sqrt(2) on diagonals
          // Expand only if this step improves the tile for this entity.
          if (entity[cur] <= entity[ni] + falloff) continue;
          const w = entity[cur] - falloff;
          const sum = w + total[ni] - entity[ni];
          total[ni] = sum;
          entity[ni] = w;
          if (sum > best[ni]) { best[ni] = sum; owner[ni] = p; }
          queue.push(ni);
        }
      }
    }
  }

  // Connectivity: flood from each root through tiles its own owner holds.
  const connected: boolean[] = new Array<boolean>(n).fill(false);
  const countByOwner = new Map<number, number>();
  const bump = (o: number): void => { countByOwner.set(o, (countByOwner.get(o) ?? 0) + 1); };
  for (const r of infl) {
    if (!r.root) continue;
    const start = r.tz * g.w + r.tx;
    const q: number[] = [];
    const mark = (i: number): void => {
      if (owner[i] !== r.owner || connected[i]) return;
      connected[i] = true;
      if (g.cost[i] < g.impassableCost) bump(r.owner);
      q.push(i);
    };
    mark(start);
    for (let head = 0; head < q.length; head++) {
      const cur = q[head];
      const cx = cur % g.w;
      const cz = Math.floor(cur / g.w);
      for (const [dx, dz] of NEIGHBOURS) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= g.w || nz >= g.h) continue;
        mark(nz * g.w + nx);
      }
    }
  }

  return { owner, connected, countByOwner };
}
