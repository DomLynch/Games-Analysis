// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const MAX_LEVEL = 27;            // skills stop at 27
const SPEND_CAP = 10 * 265;      // one raise spends at most this much XP
const COST_BY_COST_LEVEL = [1, 2, 3, 4, 5, 7, 8, 9, 13, 22, 37, 48, 73, 98, 125,
  145, 170, 190, 212, 225, 240, 255, 260, 265, 265, 265, 265];   // cost level 1..27

interface Skill {
  id: string;
  points: number;                // skill points banked
  train: 0 | 1 | 2;              // 0 off, 1 normal, 2 focus
  weight: number;                // training share, percent, from the practice queue
  apt: number;                   // aptitude; 0 = neutral, higher = cheaper
}

// Total XP threshold to reach level lev (not the cost of one step).
function thresholdXp(lev: number, apt: number): number {
  const modulo = (l: number) => 25 * l * (l + 1);
  let t = modulo(lev);
  for (const bp of [9, 18, 26]) {
    if (lev <= bp) break;
    t += modulo(lev - bp) / 2;
  }
  return Math.floor(t * Math.pow(2, -apt / 4));
}

interface Rng {
  shuffle<T>(a: T[]): T[];
  weighted(w: number[]): number;  // index, or -1 when all weights are zero
}

// Splits one XP pool across skills. Phase 1 gives each trained skill its weight
// share of the pool (random order); phase 2 spends what is left by weighted draw.
// Returns points gained per skill id and mutates skill.points / skill.train.
// simplified: the caller passes only the XP up to the next cost level (donor train_skills).
// Omitted: training targets, manuals, crosstraining, distributed-training and innate-caster modes,
// and the second practice queue (exercises_all). The donor's point-spend also has a target cap; here none.
function spendPool(pool: number, costLevel: number, skills: Skill[], rng: Rng): Map<string, number> {
  const cost = COST_BY_COST_LEVEL[costLevel - 1];
  const gained = new Map<string, number>();
  let left = pool;

  // Buys as many points as the budget allows (capped at SPEND_CAP per raise). Returns XP spent.
  const bump = (s: Skill, budget: number): number => {
    const n = Math.floor(Math.min(SPEND_CAP, budget) / cost);
    if (n <= 0) return 0;
    s.points += n;
    gained.set(s.id, (gained.get(s.id) ?? 0) + n);
    if (s.points >= thresholdXp(MAX_LEVEL, s.apt)) s.train = 0;   // stop at 27
    return n * cost;
  };
  const live = (s: Skill) => s.train !== 0 && s.weight > 0;

  const shares = new Map<Skill, number>();
  let skipPhase1 = false;
  for (const s of skills) {
    if (!live(s)) continue;
    const x = Math.floor((s.weight * pool) / 100);
    if (x < cost) { skipPhase1 = true; break; }   // donor: one short share skips phase 1 entirely
    shares.set(s, x);
  }

  if (!skipPhase1) {
    for (const s of rng.shuffle([...shares.keys()])) {
      let budget = shares.get(s) ?? 0;
      while (budget >= cost && live(s)) {
        const spent = bump(s, budget);
        if (spent === 0) break;
        budget -= spent;
        left -= spent;
      }
      shares.set(s, budget);     // unspent share stays in play for phase 2
    }
  }

  // Phase 2: weighted draw over leftover shares; if none, over training weights.
  while (left >= cost) {
    const live2 = skills.filter(live);
    const leftWeights = skipPhase1 ? [] : live2.map(s => shares.get(s) ?? 0);
    let s: Skill | undefined = undefined;
    if (!skipPhase1) {
      const idx = rng.weighted(leftWeights);
      if (idx >= 0) s = live2[idx];
    }
    if (!s) {
      const idx = rng.weighted(skills.map(x => (live(x) ? x.weight : 0)));
      s = idx >= 0 ? skills[idx] : undefined;
    }
    if (!s) break;
    const spent = bump(s, left);
    if (spent === 0) break;
    left -= spent;
    shares.set(s, 0);
  }
  return gained;
}

// Practice queue -> training weights. Each event adds its train value (1 normal, 2 focus).
// A focus skill under 20 gets 5 * (5 - w/4) added (donor reset_training). Then scale to 100
// so the weights sum to exactly 100. Donor _scale_array (skills.cc 629) gives the +1 to the
// SMALLEST remainders first (ascending sort); this sketch fixes that: LARGEST remainders first.
// simplified: the second queue (exercises_all, max with the first) is omitted.
function weightsFromQueue(queue: { id: string; train: 1 | 2 }[], ids: string[], focus: Set<string>): Map<string, number> {
  const raw = new Map<string, number>(ids.map(id => [id, 0]));
  for (const e of queue) raw.set(e.id, (raw.get(e.id) ?? 0) + e.train);
  for (const id of focus) {
    const w = raw.get(id) ?? 0;
    if (w < 20) raw.set(id, w + 5 * (5 - Math.floor(w / 4)));
  }
  const total = [...raw.values()].reduce((a, b) => a + b, 0);
  const out = new Map<string, number>(ids.map(id => [id, 0]));
  if (total === 0) return out;
  const rests: [string, number][] = [];
  let sum = 0;
  for (const [id, v] of raw) {
    if (v <= 0) continue;
    out.set(id, Math.floor((v * 100) / total));
    sum += Math.floor((v * 100) / total);
    rests.push([id, (v * 100) % total]);
  }
  rests.sort((a, b) => b[1] - a[1]);
  for (const [id] of rests) { if (sum >= 100) break; out.set(id, (out.get(id) ?? 0) + 1); sum++; }
  return out;
}
