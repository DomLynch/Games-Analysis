// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Ms = number;

interface Npc { id: number; type: string; group: number; engaged: boolean; }
interface Entry { type: string; chance: number; typeCap: number; } // typeCap 0 = no cap
interface Point {
  group: number;
  groupCap: number;   // 0 = no cap
  respawnS: number;
  varianceS: number;  // rolled as +/- varianceS / 2
  despawnS: number;   // 0 = an alive NPC is never removed by the point
  entries: Entry[];
  npc: Npc | null;
  dueAt: Ms;          // 0 = nothing scheduled
}

const MIN_TIMER_MS = 100;
const TICK_MS = 1000; // zone pass interval (fixed step); the caller runs passPoint for every point each pass

function rollMs(seconds: number, varianceS: number, rng: () => number): Ms {
  const base = seconds * 1000;
  if (varianceS === 0) return base;
  const half = (varianceS * 1000) / 2;
  return Math.max(MIN_TIMER_MS, Math.round(base - half + rng() * 2 * half));
}

function countLive(world: Npc[], pred: (n: Npc) => boolean): number {
  let c = 0;
  for (const n of world) if (pred(n)) c++;
  return c;
}

function removeNpc(world: Npc[], npc: Npc): void {
  const i = world.indexOf(npc);
  if (i >= 0) world.splice(i, 1);
}

// Weighted pick among entries whose type is still under its cap.
function pickType(p: Point, world: Npc[], rng: () => number): string | null {
  const open = p.entries.filter(e => e.typeCap === 0 || countLive(world, n => n.type === e.type) < e.typeCap);
  const total = open.reduce((s, e) => s + e.chance, 0);
  if (total <= 0) return null;
  let roll = Math.floor(rng() * total);
  for (const e of open) {
    if (roll < e.chance) return e.type;
    roll -= e.chance;
  }
  return null;
}

// Called on the NPC's death: the point forgets it and rearms its respawn timer.
function onDeath(p: Point, world: Npc[], now: Ms, rng: () => number): void {
  if (p.npc) removeNpc(world, p.npc);
  p.npc = null;
  p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
}

// One pass per point. `spawn` creates the NPC and adds it to `world`.
function passPoint(p: Point, world: Npc[], now: Ms, rng: () => number, spawn: (type: string, group: number) => Npc): void {
  if (p.dueAt === 0 || now < p.dueAt) return;
  p.dueAt = 0;

  if (p.npc !== null) {
    // The despawn timer ran out while the NPC is still alive.
    if (p.npc.engaged) { p.dueAt = now + p.despawnS * 1000; return; } // fight in progress: keep it, check again later
    removeNpc(world, p.npc);                                          // unengaged: remove it, respawn later, no spawn this pass
    p.npc = null;
    p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
    return;
  }

  if (p.groupCap > 0 && countLive(world, n => n.group === p.group) >= p.groupCap) {
    p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
    return;
  }
  const type = pickType(p, world, rng);
  if (type === null) {
    p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
    return;
  }
  p.npc = spawn(type, p.group);
  p.dueAt = p.despawnS > 0 ? now + p.despawnS * 1000 : 0;
}

export {};
