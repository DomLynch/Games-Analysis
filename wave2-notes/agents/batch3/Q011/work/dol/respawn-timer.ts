// Licence: GPL-2.0-or-later (donor, Dawn of Light). Clean-room: written from the described mechanism, not translated.

export interface RespawnProfile {
  baseMinMinutes: number;      // donor: NPC_MIN_RESPAWN_INTERVAL (default 5)
  spreadMinutes: number;       // donor: random band width (5)
  namedBonusMinutes: number;   // donor: +5 when the name has a capital letter
  levelCap: number;            // donor: 65
  realmMinMs: number;          // donor: 5 minutes
  realmMaxMs: number;          // donor: 10 minutes
  isRealm: boolean;
  level: number;
  named: boolean;
  explicitMs: number;          // >0 fixed, <0 never respawn, 0 = derive (donor m_respawnInterval)
}

// randInt(lo, hi) is inclusive on both ends (donor Util.Random(min, max)).
export function respawnIntervalMs(p: RespawnProfile, randInt: (lo: number, hi: number) => number): number {
  if (p.explicitMs !== 0) return p.explicitMs;
  let minutes = randInt(p.baseMinMinutes, p.baseMinMinutes + p.spreadMinutes);
  if (p.named) minutes += p.namedBonusMinutes;
  if (!p.isRealm && p.level <= p.levelCap) return minutes * 60000;
  if (p.isRealm) return randInt(p.realmMinMs, p.realmMaxMs);
  const add = (p.level - p.levelCap) + p.baseMinMinutes;
  return (minutes + add) * 60000;
}

export interface RespawnEntry { id: string; dueAtMs: number; }

// Region registry of pending respawns (donor: MobsRespawning plus one timer per mob).
export class RespawnRegistry {
  private pending = new Map<string, RespawnEntry>();

  start(id: string, nowMs: number, intervalMs: number): void {
    if (intervalMs <= 0) return;                       // never respawn (donor: respawnInt > 0 check)
    this.pending.set(id, { id, dueAtMs: nowMs + intervalMs });
  }

  // Returns ids whose timer is due and removes them (donor: Spawn removes its registry entry).
  due(nowMs: number): string[] {
    const out: string[] = [];
    for (const e of this.pending.values()) if (e.dueAtMs <= nowMs) out.push(e.id);
    for (const id of out) this.pending.delete(id);
    return out;
  }

  // Donor resync: every pending respawn is started again (not with the remaining time). The donor's StartRespawn re-reads
  // RespawnInterval, so a derived-interval mob gets a fresh draw but an explicit-interval mob restarts with its full stored
  // interval; the caller's drawMs must do the same (return the explicit value when there is one).
  resync(nowMs: number, drawMs: (id: string) => number): void {
    for (const id of [...this.pending.keys()]) this.start(id, nowMs, drawMs(id));
  }
}

// Donor Spawn guard: refuse when alive or already active; otherwise restore to the spawn point.
export function spawnBack(
  alive: boolean,
  active: boolean,
  spawnPos: { x: number; y: number },
  maxHp: number,
): { hp: number; pos: { x: number; y: number } } | null {
  if (alive || active) return null;
  return { hp: maxHp, pos: spawnPos };
}

export {};
