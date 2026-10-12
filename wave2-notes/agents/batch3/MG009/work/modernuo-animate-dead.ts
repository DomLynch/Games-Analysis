// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type Kind = string;
// Highest requirement first, as the donor orders its entries.
interface Tier { requirement: number; kinds: Kind[]; }

const TIERS: Tier[] = [
  { requirement: 18000, kinds: ["lord"] },
  { requirement: 10000, kinds: ["golem"] },
  { requirement: 5000, kinds: ["lich"] },
  { requirement: 3000, kinds: ["knight", "bone-knight"] },
  { requirement: 2000, kinds: ["mummy"] },
  { requirement: 1000, kinds: ["mage", "bone-mage"] },
  { requirement: 0, kinds: ["skeleton"] },
];

const MAX_RAISED_PER_CASTER = 3;  // a 4th raise evicts the oldest
const DRAIN_EVERY_MS = 1650;      // one hit point lost per interval
const DRAIN_STEP = 1;

export interface Corpse { ownerFame: number; eligible: boolean; spent: boolean; }
export interface Raised { id: string; hp: number; nextDrainMs: number; }

// Donor: skill points as trunc(necro*30) + trunc(spirit*70), then (score / 10) * 18, capped at the victim's fame.
// Defect fixed: the donor divides by 10 before the x18, which drops up to 9 points; this multiplies first.
export function tierScore(necro: number, spirit: number, ownerFame: number): number {
  const raw = Math.trunc(necro * 30) + Math.trunc(spirit * 70);
  const scaled = Math.floor((raw * 18) / 10);
  return Math.max(0, Math.min(scaled, ownerFame));
}

// First tier whose requirement the score meets; one kind chosen at random from that tier.
export function pickKind(score: number, rnd: () => number): Kind | null {
  for (const t of TIERS) {
    if (score < t.requirement) continue;
    return t.kinds[Math.floor(rnd() * t.kinds.length)];
  }
  return null;
}

export function canRaise(c: Corpse): boolean {
  return c.eligible && !c.spent && c.ownerFame >= 100;
}

export function resolveRaise(
  caster: { necro: number; spirit: number }, corpse: Corpse, rnd: () => number,
): Kind | null {
  if (!canRaise(corpse)) return null;
  return pickKind(tierScore(caster.necro, caster.spirit, corpse.ownerFame), rnd);
}

// Per-caster list, oldest first. Returns the evicted creatures so the caller removes them.
export function addRaised(list: Raised[], r: Raised): Raised[] {
  list.push(r);
  const evicted: Raised[] = [];
  while (list.length > MAX_RAISED_PER_CASTER) {
    evicted.push(list.shift() as Raised);
  }
  return evicted;
}

export function spawnRaised(id: string, maxHp: number, nowMs: number): Raised {
  return { id, hp: maxHp, nextDrainMs: nowMs + DRAIN_EVERY_MS };
}

// One call per server tick for each raised creature, no per-creature timer.
// Donor order: while hp > 0 lose one point; a tick that finds hp at 0 kills.
export function drainTick(r: Raised, nowMs: number): "alive" | "dead" {
  if (nowMs < r.nextDrainMs) return "alive";
  r.nextDrainMs += DRAIN_EVERY_MS;
  if (r.hp > 0) {
    r.hp -= DRAIN_STEP;
    return "alive";
  }
  return "dead";
}

export {};
