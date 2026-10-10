// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Ent {
  id: string;
  zone: string;
  x: number;
  y: number;
  alive: boolean;
  active: boolean;
  stealthed: boolean;
  immune: boolean;   // donor: necromancer shade is skipped, not removed
}

const MAX_TARGET_DIST = 3600;  // donor constant MAX_AGGRO_DISTANCE
const MAX_TABLE_DIST = 6000;   // donor constant MAX_AGGRO_LIST_DISTANCE
const FULL_SCORE_DIST = 500;   // donor distance factor 500.0

type Table = Map<string, number>;

const dist = (a: Ent, b: Ent): number => Math.hypot(a.x - b.x, a.y - b.y);

// Add threat. A new entry starts at the amount (or 1 if not positive). An existing entry never drops below 1.
function addThreat(table: Table, id: string, amount: number): void {
  const cur = table.get(id);
  if (cur === undefined) {
    table.set(id, amount > 0 ? amount : 1);
    return;
  }
  table.set(id, Math.max(1, cur + amount));
}

// Damage threat is damage plus crit. A pet hands 25% to its owner and keeps 75%.
function onDamage(table: Table, source: string, damage: number, crit: number, ownerOf?: string): void {
  let aggro = damage + crit;
  if (ownerOf !== undefined) {
    addThreat(table, ownerOf, Math.max(1, Math.trunc(aggro * 0.25)));
    aggro = Math.max(1, Math.trunc(aggro * 0.75));
  }
  addThreat(table, source, aggro);
}

// Target pick: drop invalid entries, score each live entry in range, keep the best.
// Score = threat * min(FULL_SCORE_DIST / distance, 1). Clear the table when nobody qualifies.
function pickTarget(table: Table, mob: Ent, world: Map<string, Ent>): Ent | null {
  const removable: string[] = [];
  let best: Ent | null = null;
  let bestScore = 0;
  for (const [id, amount] of table) {
    const e = world.get(id);
    const d = e === undefined ? Infinity : dist(mob, e);
    if (e === undefined || !e.alive || !e.active || e.stealthed || d > MAX_TABLE_DIST) {
      removable.push(id);
      continue;
    }
    if (e.immune || e.zone !== mob.zone || d > MAX_TARGET_DIST) {
      continue;
    }
    const score = amount * Math.min(FULL_SCORE_DIST / d, 1);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  for (const id of removable) {
    table.delete(id);
  }
  if (best === null) {
    table.clear();
  }
  return best;
}

// Think interval: more threat, faster thinking, never faster than 1.5 s. Unit read as ms from the 1500 floor.
function thinkDelayMs(aggroLevel: number): number {
  return Math.max(1500, 10000 - aggroLevel * 100);
}

interface MobState {
  table: Table;
  attacking: boolean;
  aggroLevel: number;    // 0..100
  aggroRange: number;
  outOfTether: boolean;
  inCombat: boolean;
}

// One think tick, in donor order: leash, then new-target scan (only when not attacking and the table is empty), then pick.
function think(mob: Ent, s: MobState, world: Map<string, Ent>): { next: "walkHome" | "attack" | "idle"; target: Ent | null; thinkMs: number } {
  const thinkMs = thinkDelayMs(s.aggroLevel);
  if (s.outOfTether && !s.inCombat) {
    return { next: "walkHome", target: null, thinkMs };
  }
  if (!s.attacking && s.aggroLevel > 0 && s.table.size === 0) {
    for (const e of world.values()) {
      if (e.id === mob.id || !e.alive || !e.active || e.zone !== mob.zone) continue;
      if (dist(mob, e) <= s.aggroRange) {
        addThreat(s.table, e.id, 1);
      }
    }
  }
  if (s.table.size === 0) {
    return { next: "idle", target: null, thinkMs };
  }
  const target = pickTarget(s.table, mob, world);
  return { next: target === null ? "idle" : "attack", target, thinkMs };
}
export {};
