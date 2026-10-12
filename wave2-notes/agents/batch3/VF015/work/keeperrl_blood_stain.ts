// clean-room sketch: a flesh death counts down nearby stain pools; a pool that runs out becomes a stain
// and wakes its neighbouring pools one step later. Licence of donor: GPL-2.0-or-later. Written from the
// described mechanism, not a line-by-line translation.

export interface Pos { x: number; y: number; }

export interface StainParams {
  initialCountdown: number; // donor furniture.txt:2492 WATER bloodCountdown = 30
  radius: number;           // donor creature.cpp:2066 Rectangle::centered(4)
  ringDelay: number;        // donor furniture.cpp:483 "+ 1_visible" (value of one visible unit not read); ticks here
}

interface Pool {
  countdown: number | null; // null = no countdown (cannot stain) or already stained
  stained: boolean;
  ringAt: number | null;    // pending ring time, null when no ring is pending
}

const key = (p: Pos): string => `${p.x},${p.y}`;

function neighbours4(p: Pos): Pos[] {
  return [
    { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 },
    { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y },
  ];
}

function square(p: Pos, r: number): Pos[] {
  const out: Pos[] = [];
  for (let y = p.y - r; y <= p.y + r; y++)
    for (let x = p.x - r; x <= p.x + r; x++)
      out.push({ x, y });
  return out;
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

export class StainField {
  private pools = new Map<string, Pool>();
  private pending = new Map<string, Pos>(); // FIX: only pools with a pending ring are visited each tick

  constructor(private p: StainParams, private rnd: () => number) {}

  addPool(pos: Pos, countdown: number | null): void {
    this.pools.set(key(pos), { countdown, stained: false, ringAt: null });
  }

  isStained(pos: Pos): boolean {
    return this.pools.get(key(pos))?.stained ?? false;
  }

  // Caller decides whether the death bleeds (flesh body, full drops, not frozen): donor creature.cpp:2037-2056.
  onDeath(pos: Pos, bleeds: boolean, now: number): void {
    if (!bleeds) return;
    if (this.countDown(pos, now)) return;
    // donor creature.cpp:2066-2068: every other cell in the square is tried in random order until one stains
    const cells = shuffle(
      square(pos, this.p.radius).filter(c => !(c.x === pos.x && c.y === pos.y)),
      this.rnd,
    );
    for (const c of cells)
      if (this.countDown(c, now)) break;
  }

  // Donor furniture.cpp:464-469 (onBloodNear): decrement, and report true when it reaches zero.
  private countDown(pos: Pos, now: number): boolean {
    const pool = this.pools.get(key(pos));
    if (!pool || pool.countdown === null) return false;
    pool.countdown -= 1;
    if (pool.countdown !== 0) return false;
    this.stain(pos, now);
    return true;
  }

  // Donor furniture.cpp:475-487 (spreadBlood): stain this pool, schedule the stained neighbours' rings.
  private stain(pos: Pos, now: number): void {
    const pool = this.pools.get(key(pos));
    if (!pool) return;
    pool.countdown = null;
    pool.stained = true;
    for (const n of neighbours4(pos)) {
      const np = this.pools.get(key(n));
      if (np && np.countdown !== null) {
        np.ringAt = now + this.p.ringDelay;
        this.pending.set(key(n), n);
      }
    }
  }

  // Donor furniture.cpp:276-277 (updateFire), driven each level tick by level.cpp:600-602.
  tick(now: number): void {
    for (const [k, pos] of [...this.pending]) {
      const pool = this.pools.get(k);
      if (!pool || pool.ringAt === null || pool.ringAt > now) continue;
      pool.ringAt = null;
      this.pending.delete(k); // FIX: the donor never removes the entry, so it is visited every tick forever
      this.stain(pos, now);
    }
  }

  pendingCount(): number {
    return this.pending.size;
  }
}

export {};
