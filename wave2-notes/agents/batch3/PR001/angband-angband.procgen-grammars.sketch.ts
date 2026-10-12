// Licence: Angband is GPL-2 or the "Angband licence" (donor). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
export {};

interface Species { name: string; level: number; }
interface Slot { dx: number; dy: number; tier: number; }
interface Profile { name: string; alloc: number; minLevel: number; }

// Slot list for an 11 x 5 interior (dx -5..5, dy -2..2). Tier 0 is the weakest ring, tier 7 the centre leader.
// Written in the donor's order so the same cells collide the same way.
function tierSlots(): Slot[] {
  const s: Slot[] = [];
  const put = (dx: number, dy: number, tier: number): void => { s.push({ dx, dy, tier }); };
  for (let dx = -3; dx <= 3; dx++) { put(dx, -2, 0); put(dx, 2, 0); }
  for (const dx of [-5, -4, 4, 5]) { put(dx, -2, 1); put(dx, 2, 1); }
  for (let dy = -1; dy <= 1; dy++) {
    put(-5, dy, 0); put(5, dy, 0);
    put(-4, dy, 1); put(4, dy, 1);
    put(-3, dy, 2); put(3, dy, 2);
    put(-2, dy, 3); put(2, dy, 3);
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(dx, dy, 4);
  for (let dx = -1; dx <= 1; dx++) { put(dx, -1, 5); put(dx, 1, 5); }
  put(-1, 0, 6); put(1, 0, 6);
  put(0, 0, 7);
  return s;
}

// Draw 16 species, sort by level, keep every other one (8 tiers), then fill slots.
// Occupied slots are refused and reported instead of silently dropped.
function buildPit(draw: () => Species | null): { placed: Map<string, Species>; refused: string[] } | null {
  const pool: Species[] = [];
  for (let i = 0; i < 16; i++) {
    const s = draw();
    if (s === null) return null; // any failed draw means no pit
    pool.push(s);
  }
  pool.sort((a, b) => a.level - b.level);
  const tiers: Species[] = [];
  for (let i = 0; i < 8; i++) tiers.push(pool[i * 2]);
  const placed = new Map<string, Species>();
  const refused: string[] = [];
  for (const slot of tierSlots()) {
    const key = `${slot.dx},${slot.dy}`;
    if (placed.has(key)) { refused.push(key); continue; }
    placed.set(key, tiers[slot.tier]);
  }
  return { placed, refused };
}

// One pass, no list: each eligible profile takes over the pick with chance alloc / running total.
// rnd(n) returns an integer in [0, n).
function pickProfile(depth: number, profiles: Profile[], rnd: (n: number) => number): Profile | null {
  let total = 0;
  let chosen: Profile | null = null;
  for (const p of profiles) {
    if (p.alloc <= 0 || depth < p.minLevel) continue;
    total += p.alloc;
    if (rnd(total) < p.alloc) chosen = p;
  }
  return chosen;
}
