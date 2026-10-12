// Licence: donor GPL-3.0 (OpenRA). Clean-room sketch of the mechanism shape only, written from the described steps.
// Integer-only state and replay; no donor code is translated.
interface Entity { id: number; x: number; y: number; hp: number; }
interface SimState { entities: Entity[]; rng: number; rngLast: number; }
interface Order { actor: number; dx: number; dy: number; }
interface ReplayFrame { tick: number; orders: Order[]; hash: number; }
interface Replay { seed: number; frames: ReplayFrame[]; }

// xorshift32 stands in for the donor's MT19937. Integer only; the state never leaves integer math.
function nextRng(state: number): number {
  let x = (state | 0) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x | 0;
}

// Position-weighted sum over entities in ascending id order, plus the RNG output AND the RNG state.
// Mirrors the shape of the donor's SyncHash; the donor folds only the last output (defect fixed here).
function syncHash(s: SimState): number {
  const sorted = [...s.entities].sort((a, b) => a.id - b.id);
  let n = 0;
  let ret = 0;
  for (const e of sorted) {
    const h = ((e.x * 5) ^ (e.y * 3) ^ (e.hp * 7)) | 0;
    const weight = Math.imul(n, 1 + e.id);
    ret = (ret + Math.imul(weight, h)) | 0;
    n++;
  }
  return (ret + s.rngLast + Math.imul(s.rng, 0x9e3779b1)) | 0;
}

// One fixed simulation step: apply this tick's orders, then advance the RNG once.
function step(s: SimState, orders: Order[]): void {
  for (const o of orders) {
    const e = s.entities.find((en) => en.id === o.actor);
    if (e !== undefined) {
      e.x = (e.x + o.dx) | 0;
      e.y = (e.y + o.dy) | 0;
    }
  }
  s.rng = nextRng(s.rng);
  s.rngLast = s.rng;
}

// Replay check: rebuild from the seed, re-run the recorded orders, compare the hash each tick.
// Returns the first tick whose hash differs, or null when the whole replay matches.
function firstDesyncTick(rep: Replay, initial: Entity[]): number | null {
  const s: SimState = {
    entities: initial.map((e) => ({ ...e })),
    rng: rep.seed | 0,
    rngLast: 0,
  };
  for (const f of rep.frames) {
    step(s, f.orders);
    if (syncHash(s) !== f.hash) return f.tick;
  }
  return null;
}

export {};
