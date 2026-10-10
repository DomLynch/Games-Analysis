// Licence: restricted (as read: LICENSE file = GNU GPL v3; package.json "license": "BSD-3-Clause"; conflict). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Unit {
  id: string;
  side: number;
  x: number;
  y: number;
  hp: number;
  shield: number;
  range: number;        // attack range, Chebyshev cells
  untargetable: boolean;
  pokedoll: boolean;    // holds the tie-break item
}

export interface Memory {
  targetId: string | null; // last chosen target
  tx: number;              // cell the target was on when chosen
  ty: number;
}

export interface Rng { next(): number } // [0,1), injected so a server can replay it

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

const cheb = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Same rule as the donor's isTargettableBy: enemies always; allies only for a merciless attacker and only at hp <= 10.
export function canTarget(me: Unit, t: Unit, merciless: boolean): boolean {
  if (t.untargetable || t.id === me.id) return false;
  if (t.side !== me.side) return true;
  return merciless && t.hp <= 10;
}

// Nearest targettable unit inside attack range. Ties: pokedoll holders first, then a random pick.
export function nearestInRange(me: Unit, all: Unit[], rng: Rng): Unit | undefined {
  let best = Infinity;
  let pool: Unit[] = [];
  for (const t of all) {
    if (!canTarget(me, t, false)) continue;
    const d = cheb(me.x, me.y, t.x, t.y);
    if (d > me.range) continue;
    if (d < best) { best = d; pool = [t]; } else if (d === best) pool.push(t);
  }
  if (pool.length === 0) return undefined;
  const dolls = pool.filter((t) => t.pokedoll);
  const list = dolls.length > 0 ? dolls : pool;
  return list[Math.floor(rng.next() * list.length)];
}

// Keep the previous target while it is still on the remembered cell; if it moved, keep it only while
// targettable and in range; otherwise pick the nearest in range again.
export function keepOrRetarget(me: Unit, mem: Memory, all: Unit[], rng: Rng): Unit | undefined {
  const prev = all.find((u) => u.id === mem.targetId);
  const occupant = all.find((u) => u.x === mem.tx && u.y === mem.ty);
  if (occupant && prev && occupant.id === prev.id) {
    return canTarget(me, prev, false) ? prev : nearestInRange(me, all, rng);
  }
  if (prev && canTarget(me, prev, false) && cheb(me.x, me.y, prev.x, prev.y) <= me.range) return prev;
  return nearestInRange(me, all, rng);
}

// Merciless (caller checks pp < maxPP): lowest hp + shield among targettables in range; first in scan order wins ties.
export function mercilessPick(me: Unit, all: Unit[]): Unit | undefined {
  const inRange = all.filter((t) => canTarget(me, t, true) && cheb(me.x, me.y, t.x, t.y) <= me.range);
  if (inRange.length === 0) return undefined;
  let pick = inRange[0];
  for (const t of inRange) if (t.hp + t.shield < pick.hp + pick.shield) pick = t;
  return pick;
}

// One chase step toward the goal: BFS over 8 neighbours to the nearest free cell within range of the goal.
// Returns the first cell of that path, or undefined when no such cell is reachable.
export function chaseStep(me: Unit, goal: Unit, all: Unit[], cols: number, rows: number): { x: number; y: number } | undefined {
  const key = (x: number, y: number) => `${x},${y}`;
  const occupied = new Set(all.map((u) => key(u.x, u.y)));
  const ring = new Set<string>();
  for (let y = goal.y - me.range; y <= goal.y + me.range; y++) {
    for (let x = goal.x - me.range; x <= goal.x + me.range; x++) {
      if ((x === goal.x && y === goal.y) || x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (!occupied.has(key(x, y))) ring.add(key(x, y));
    }
  }
  const start = key(me.x, me.y);
  const parent = new Map<string, string | null>([[start, null]]);
  const queue: [number, number][] = [[me.x, me.y]];
  let found: string | undefined;
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy] = queue[i];
    const k = key(cx, cy);
    if (k !== start && ring.has(k)) { found = k; break; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (parent.has(nk) || occupied.has(nk)) continue;
      parent.set(nk, k);
      queue.push([nx, ny]);
    }
  }
  if (found === undefined) return undefined;
  let step = found;
  let k: string | null = found;
  while (k !== null && k !== start) { step = k; k = parent.get(k) ?? null; }
  const [sx, sy] = step.split(",").map(Number);
  return { x: sx, y: sy };
}

// Cooldowns as in the donor: move = round(500 / (0.5 + speed/100)); attack = round(1000 / (0.4 + speed*0.007)).
// Paralysis halves speed before either formula.
export function moveCooldownMs(speed: number, paralysed: boolean): number {
  const s = paralysed ? speed / 2 : speed;
  return Math.round(500 / (0.5 + s / 100));
}

export function attackCooldownMs(speed: number, paralysed: boolean): number {
  const s = paralysed ? speed / 2 : speed;
  return Math.round(1000 / (0.4 + s * 0.007));
}

export {};
