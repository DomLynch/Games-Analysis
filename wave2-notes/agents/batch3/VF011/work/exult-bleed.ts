// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1), injected instead of rand()

const BLEED_MIN_MS = 60_000;        // donor: 60000 + rand() % 120000
const BLEED_SPAN_MS = 120_000;
const BLEED_FIRST_TICK_MS = 5_000;  // donor: timer base delay 5000
const TICK_MIN_MS = 500;            // donor: 500 + rand() % 500
const TICK_SPAN_MS = 500;
const POOL_LAST_STAGE = 3;          // donor: last_blood_frame = 3
const POOL_START_SPAN = 2;          // donor: num_frames capped at 2 (new pool is stage 0 or 1)
const POOL_NEIGHBOUR_LIMIT = 2;     // donor: fewer than 2 pools in the 3x3 area

interface Pool { stage: number; flip: boolean; }

interface Victim {
  x: number;
  y: number;
  noBleed: boolean;        // donor cant_bleed flag
  dead: boolean;
  bleedUntil?: number;     // ms on the caller's clock; undefined = not bleeding
  nextTickAt?: number;
}

interface Decals {
  pools: Map<string, Pool>; // one pool per tile
}

const key = (x: number, y: number): string => `${x},${y}`;

function neighbourPools(d: Decals, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (d.pools.has(key(x + dx, y + dy))) n++;
    }
  }
  return n;
}

// Donor bleed(): if a pool is already on this tile, grow it one stage; otherwise start a new one.
function placePool(d: Decals, x: number, y: number, rng: Rng): void {
  const k = key(x, y);
  const p = d.pools.get(k);
  if (p) {
    if (p.stage < POOL_LAST_STAGE) {
      p.stage += 1;
      p.flip = rng() < 0.5;   // donor reads frame % 32 and re-rolls the flip bit
    }
    return;
  }
  d.pools.set(k, { stage: Math.floor(rng() * POOL_START_SPAN), flip: rng() < 0.5 });
}

// Donor set_type_flag(tf_bleeding): a new start replaces the old timer, so the clock restarts.
function startBleed(d: Decals, v: Victim, nowMs: number, rng: Rng): void {
  v.bleedUntil = nowMs + BLEED_MIN_MS + rng() * BLEED_SPAN_MS;
  v.nextTickAt = nowMs + BLEED_FIRST_TICK_MS;
  placePool(d, v.x, v.y, rng);   // donor: the timer constructor drips once at once
}

// Donor reduce_health(): normal damage only; delta doubled for vulnerable targets;
// roll delta/10 (capped at 1); and only if fewer than 2 pools are in the 3x3 area.
export function onHit(
  d: Decals, v: Victim, rawDamage: number, kind: "normal" | "other",
  vulnerable: boolean, nowMs: number, rng: Rng,
): void {
  if (kind !== "normal" || v.noBleed || v.dead) return;
  const delta = vulnerable ? rawDamage * 2 : rawDamage;
  if (Math.floor(rng() * 10) >= delta) return;   // donor: rand() % 10 < delta
  if (neighbourPools(d, v.x, v.y) >= POOL_NEIGHBOUR_LIMIT) return;
  startBleed(d, v, nowMs, rng);
}

// Donor Npc_bleed_timer::handle_event: stop on time or death; otherwise drip and re-arm.
export function bleedTick(d: Decals, v: Victim, nowMs: number, rng: Rng): void {
  if (v.bleedUntil === undefined || v.nextTickAt === undefined || nowMs < v.nextTickAt) return;
  if (nowMs >= v.bleedUntil || v.dead) {
    v.bleedUntil = undefined;
    v.nextTickAt = undefined;
    return;
  }
  placePool(d, v.x, v.y, rng);
  v.nextTickAt = nowMs + TICK_MIN_MS + rng() * TICK_SPAN_MS;
}

// Donor: a health rise (set_property), mend_wounds or death clears the flag.
// The donor timer stops on its next tick; this sketch stops at once.
export function clearBleed(v: Victim): void {
  v.bleedUntil = undefined;
  v.nextTickAt = undefined;
}

export {};
