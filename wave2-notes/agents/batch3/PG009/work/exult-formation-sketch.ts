// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Tile = { x: number; y: number };
const MAX_COST = 10000;
const DIR8: Tile[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
];                                                  // sketch's own numbering: 0 = north, clockwise
const DELTADIR = [0, 1, 7, 2, 6, 3, 5];             // straight, then 45s, then 90s; 4 (reverse) is never tried
// Behind-left and behind-right slot offsets per 4-way facing (0 N, 1 E, 2 S, 3 W).
const LEFT: Tile[] = [{ x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }];
const RIGHT: Tile[] = [{ x: 2, y: 2 }, { x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: -2 }];
// Child ids per member; row 0 is the leader (id -1), then members 0..7. -1 = no child.
const CHILDREN: [number, number][] = [[0, 1], [2, 3], [-1, 4], [7, -1], [5, 6], [-1, 8], [-1, -1], [-1, -1], [-1, -1]];

const clampStep = (d: number): number => Math.max(-1, Math.min(1, d));

// Cost of a tile: blocked is huge; otherwise the squared distance from the leader.
function tileCost(to: Tile, leader: Tile, blocked: (t: Tile) => boolean): number {
  if (blocked(to)) return MAX_COST;
  const dx = to.x - leader.x;
  const dy = to.y - leader.y;
  return dx * dx + dy * dy;
}

// Try the seven usable directions around dir8; keep the cheapest (the first one wins ties).
function bestStep(pos: Tile, leader: Tile, dir8: number, blocked: (t: Tile) => boolean): Tile | null {
  let best: Tile | null = null;
  let bestCost = MAX_COST + 8;
  for (const i of DELTADIR) {
    const d = DIR8[(dir8 + i) % 8];
    const to = { x: pos.x + d.x, y: pos.y + d.y };
    const c = tileCost(to, leader, blocked);
    if (c < bestCost) { bestCost = c; best = to; }
  }
  return bestCost >= MAX_COST ? null : best;
}

// One follower: one tile per axis toward its slot; if that tile is blocked, take the best neighbour.
function stepFollower(pos: Tile, slot: Tile, leader: Tile, dir8: number, blocked: (t: Tile) => boolean): Tile | null {
  const want = { x: pos.x + clampStep(slot.x - pos.x), y: pos.y + clampStep(slot.y - pos.y) };
  if (want.x === pos.x && want.y === pos.y) return pos;     // already in its slot
  if (!blocked(want)) return want;
  return bestStep(pos, leader, dir8, blocked);
}

// Walk the tree: each child steps toward its slot beside its parent's tile, then its own children follow.
function moveFollowers(leaderId: number, leaderPos: Tile, dir8: number,
                       positions: Map<number, Tile>, blocked: (t: Tile) => boolean): void {
  const dir4 = Math.floor(dir8 / 2);                        // as the donor: 8-way facing / 2 picks the slot row
  const [l, r] = CHILDREN[leaderId + 1];
  const sides: [number, Tile][] = [[l, LEFT[dir4]], [r, RIGHT[dir4]]];
  for (const [child, off] of sides) {
    if (child < 0) continue;
    const pos = positions.get(child);
    if (pos === undefined) continue;
    const slot = { x: leaderPos.x + off.x, y: leaderPos.y + off.y };
    const next = stepFollower(pos, slot, leaderPos, dir8, blocked);
    let childDir = dir8;                                    // if it did not move, its children keep the leader's facing
    if (next !== null && (next.x !== pos.x || next.y !== pos.y)) {
      positions.set(child, next);
      childDir = DIR8.findIndex(d => d.x === clampStep(next.x - pos.x) && d.y === clampStep(next.y - pos.y));
    }
    moveFollowers(child, positions.get(child) ?? pos, childDir, positions, blocked);
  }
}
