// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rand = (lo: number, hi: number) => number; // inclusive integer draw

interface Entry { npcType: number; chance: number; filter: number; cap: number; } // cap 0 = no cap
interface Point { baseS: number; varianceS: number; pathWhenIdle: boolean; entries: Entry[]; }

// Respawn delay in ms: base +/- variance/2, never under 100 ms.
export function respawnDelayMs(p: Point, rand: Rand): number {
  const base = p.baseS * 1000;
  if (p.varianceS === 0) return base;
  const half = (p.varianceS * 1000) / 2;
  return Math.max(100, rand(Math.floor(base - half), Math.floor(base + half)));
}

// Weighted pick among entries that match the filter and are under their cap. 0 = nothing to spawn.
export function pickEntry(entries: Entry[], filter: number, countOf: (npcType: number) => number, rand: Rand): number {
  const open = entries.filter(e => e.filter === filter && (e.cap < 1 || countOf(e.npcType) < e.cap));
  const total = open.reduce((s, e) => s + e.chance, 0);
  if (total === 0) return 0;
  let roll = rand(0, total - 1);
  for (const e of open) {
    if (roll < e.chance) return e.npcType;
    roll -= e.chance;
  }
  return 0;
}

// Zone idle gate: a grace period after the last client leaves, then mobs stop stepping.
export type Phase = 'active' | 'settling' | 'idle';

export class IdleGate {
  private phase: Phase = 'idle';
  private prevClients = 0;
  private settleEnd = 0;

  constructor(private readonly idleWhenEmpty: boolean, private readonly graceMs: number) {}

  // Call once per tick, before the mob loop.
  tick(clients: number, now: number): Phase {
    if (!this.idleWhenEmpty) { this.phase = 'active'; }
    else if (clients > 0) { this.phase = 'active'; }
    else if (this.prevClients > 0 && this.graceMs > 0) { this.phase = 'settling'; this.settleEnd = now + this.graceMs; }
    else if (this.prevClients > 0) { this.phase = 'idle'; }
    else if (this.phase === 'settling' && now >= this.settleEnd) { this.phase = 'idle'; }
    this.prevClients = clients;
    return this.phase;
  }

  // Mobs step in active and settling phases; in idle only points flagged pathWhenIdle step.
  shouldStep(p: Point): boolean {
    return this.phase !== 'idle' || p.pathWhenIdle;
  }
}

export {};
