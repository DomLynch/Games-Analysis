// Licence: MIT (donor). Shape re-expressed from sim/prng.ts, sim/battle.ts (speedSort, commitChoices, inputLog) and sim/state.ts. Not a line-by-line port.
type Seed = string; // "xs32,<8 hex digits>": algorithm name first, so an old log keeps its algorithm
interface Rng { s: number } // the whole generator state: one non-zero u32

function parseSeed(seed: Seed): Rng {
  const [algo, hex = ''] = seed.split(',');
  if (algo !== 'xs32') throw new Error(`unknown rng algo: ${algo}`);
  const s = parseInt(hex, 16) >>> 0;
  if (!s) throw new Error('xs32 state must be non-zero');
  return { s };
}
const seedOf = (r: Rng): Seed => `xs32,${r.s.toString(16).padStart(8, '0')}`;

// One draw (xorshift32). The state is the only thing that advances, so saving the state saves the stream position.
function next(r: Rng): number {
  let x = r.s;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  r.s = x;
  return x;
}

// randInt(r, n) in [0, n); randInt(r, m, n) in [m, n). Same mapping as PRNG.random: floor(u32 * width / 2^32).
function randInt(r: Rng, a: number, b?: number): number {
  const u = next(r);
  if (b === undefined) return Math.floor((u * a) / 2 ** 32);
  return Math.floor((u * (b - a)) / 2 ** 32) + a;
}

// Fisher-Yates on [lo, hi), drawing from the SAME stream, as the battle's shuffle does.
function shuffleRange<T>(r: Rng, items: T[], lo: number, hi: number): void {
  for (let i = lo; i < hi - 1; i++) {
    const j = randInt(r, i, hi);
    if (j !== i) [items[i], items[j]] = [items[j], items[i]];
  }
}

// Order by one numeric key, highest first. Donor-style selection: find the top tie group, swap it to the front,
// then shuffle that group with the same stream. Each tie group costs (group size - 1) draws.
function speedSort<T>(r: Rng, list: T[], key: (x: T) => number): void {
  let sorted = 0;
  while (sorted + 1 < list.length) {
    let top = key(list[sorted]);
    let idx: number[] = [sorted];
    for (let i = sorted + 1; i < list.length; i++) {
      const k = key(list[i]);
      if (k > top) { top = k; idx = [i]; } else if (k === top) idx.push(i);
    }
    for (let i = 0; i < idx.length; i++) {
      const from = idx[i];
      if (from !== sorted + i) [list[sorted + i], list[from]] = [list[from], list[sorted + i]];
    }
    if (idx.length > 1) shuffleRange(r, list, sorted, sorted + idx.length);
    sorted += idx.length;
  }
}

interface Choice { side: string; choice: string; speed: number }
type Line =
  | { kind: 'start'; seed: Seed }
  | { kind: 'choice'; side: string; choice: string }
  | { kind: 'reseed'; seed: Seed };

class Fight {
  rng: Rng;
  readonly startSeed: Seed;
  log: Line[];
  constructor(seed: Seed) {
    this.rng = parseSeed(seed);
    this.startSeed = seed;
    this.log = [{ kind: 'start', seed }];
  }
  // Order of work: log the choices first, then sort the turn (as commitChoices does).
  commitTurn(choices: Choice[]): Choice[] {
    for (const c of choices) this.log.push({ kind: 'choice', side: c.side, choice: c.choice });
    return this.orderTurn(choices);
  }
  orderTurn(choices: Choice[]): Choice[] {
    const order = choices.slice();
    speedSort(this.rng, order, c => c.speed);
    return order;
  }
  reseed(seed: Seed): void {
    this.rng = parseSeed(seed);
    this.log.push({ kind: 'reseed', seed });
  }
  // Save: the start seed, the current stream state and the record. Enough to resume exactly.
  save(): string {
    return JSON.stringify({ startSeed: this.startSeed, rng: seedOf(this.rng), log: this.log });
  }
  static load(text: string): Fight {
    const o = JSON.parse(text) as { startSeed: Seed; rng: Seed; log: Line[] };
    const f = new Fight(o.startSeed);
    f.rng = parseSeed(o.rng);
    f.log = o.log;
    return f;
  }
}

// Replay a record. The record has no turn markers: a turn ends when every side has one choice.
function replay(lines: Line[], sides: number, speedOf: (side: string) => number): Choice[][] {
  const turns: Choice[][] = [];
  let fight: Fight | null = null;
  let pending: Choice[] = [];
  for (const line of lines) {
    if (line.kind === 'start') { fight = new Fight(line.seed); continue; }
    if (!fight) throw new Error('a record must start with a start line');
    if (line.kind === 'reseed') { fight.reseed(line.seed); continue; }
    pending.push({ side: line.side, choice: line.choice, speed: speedOf(line.side) });
    if (pending.length === sides) {
      turns.push(fight.orderTurn(pending));
      pending = [];
    }
  }
  return turns;
}
