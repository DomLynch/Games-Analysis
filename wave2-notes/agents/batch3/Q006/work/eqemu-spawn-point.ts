// Licence: GPL-3.0 (donor, EQEmu). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Despawn = 0 | 1 | 2 | 3 | 4;
type Rng = () => number; // uniform in [0, 1)

interface Entry { npcType: number; chance: number; typeLimit: number; filter: number; }
interface Group { id: number; groupLimit: number; entries: Entry[]; despawn: Despawn; despawnTimerS: number; }

interface Point {
  respawnS: number;        // respawn time of this spawn point, seconds
  varianceS: number;       // spread, seconds (+/- half of it)
  group: Group;
  alive: number | null;    // npcType of the live NPC at this point, or null
  engaged: boolean;        // NPC has aggro (hate list not empty)
  dueAt: number | null;    // ms timestamp of the next action; null = no timer
}

interface Ledger { byType: Map<number, number>; byGroup: Map<number, number>; } // live NPC counts

const bump = (m: Map<number, number>, k: number, d: number): void => { m.set(k, (m.get(k) ?? 0) + d); };
const count = (m: Map<number, number>, k: number): number => m.get(k) ?? 0;

// Timer with variance: base +/- half the variance, never below 100 ms.
function jitterMs(baseS: number, varS: number, rnd: Rng): number {
  const base = baseS * 1000;
  if (varS === 0) return base;
  const half = Math.floor((varS * 1000) / 2);
  return Math.max(100, base - half + Math.floor(rnd() * (2 * half + 1)));
}

// Lifetime of a live NPC under the despawn rule: modes 1 and 3 use the respawn time, 2 and 4 use despawn_timer.
function lifetimeMs(p: Point, rnd: Rng): number {
  const g = p.group;
  const s = g.despawn === 2 || g.despawn === 4 ? g.despawnTimerS : p.respawnS;
  return jitterMs(s, p.varianceS, rnd);
}

// Weighted pick. A group at its cap picks nothing; a type at its cap or on the wrong filter is skipped.
function pickNpc(g: Group, led: Ledger, condValue: number, rnd: Rng): number {
  if (g.groupLimit >= 1 && count(led.byGroup, g.id) >= g.groupLimit) return 0;
  const open = g.entries.filter(e =>
    e.filter === condValue && (e.typeLimit < 1 || count(led.byType, e.npcType) < e.typeLimit));
  const total = open.reduce((s, e) => s + e.chance, 0);
  if (total === 0) return 0;
  let roll = Math.floor(rnd() * total);
  for (const e of open) {
    if (roll < e.chance) return e.npcType;
    roll -= e.chance;
  }
  return 0;
}

// The NPC died: it leaves the ledger and the point waits one respawn interval.
function onDeath(p: Point, led: Ledger, now: number, rnd: Rng): void {
  if (p.alive !== null) { bump(led.byType, p.alive, -1); bump(led.byGroup, p.group.id, -1); }
  p.alive = null;
  p.engaged = false;
  p.dueAt = now + jitterMs(p.respawnS, p.varianceS, rnd);
}

// Called once per second for every point. Returns the npcType spawned on this call, or 0.
function tick(p: Point, led: Ledger, now: number, rnd: Rng): number {
  const g = p.group;
  if (p.alive !== null && g.despawn === 0) return 0;      // a live NPC holds the point
  if (p.dueAt === null || now < p.dueAt) return 0;        // timer not due yet
  p.dueAt = null;

  if (p.alive !== null) {                                 // the point's despawn rule fires on a live NPC
    if (p.engaged) {                                      // simplified: skip the spawn while engaged (see note)
      p.dueAt = now + lifetimeMs(p, rnd);
      return 0;
    }
    bump(led.byType, p.alive, -1);
    bump(led.byGroup, g.id, -1);
    p.alive = null;
    if (g.despawn === 3 || g.despawn === 4) {             // depop only, then wait the respawn time
      p.dueAt = now + jitterMs(p.respawnS, p.varianceS, rnd);
      return 0;
    }
  }

  if (g.despawn !== 0) p.dueAt = now + lifetimeMs(p, rnd); // modes 1 and 2 restart the cycle before spawning
  const npcType = pickNpc(g, led, 1, rnd);                 // no spawn condition modelled: value 1
  if (npcType === 0) {                                     // nothing eligible: try again after one respawn interval
    p.dueAt = now + jitterMs(p.respawnS, p.varianceS, rnd);
    return 0;
  }
  p.alive = npcType;
  bump(led.byType, npcType, 1);
  bump(led.byGroup, g.id, 1);
  return npcType;
}
export {};
