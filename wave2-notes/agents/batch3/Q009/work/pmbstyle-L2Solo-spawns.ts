// Donor licence: Apache-2.0 (LICENSE read). Clean-room sketch written from the mechanism read in
// SpawnNpcs.js, RemoveNpc.js, DayNightSpawnManager.js and NpcAggro.js, not a translation.
type Period = 'always' | 'day' | 'night';
type Mode = 'day' | 'night';

interface Point { x: number; y: number; }

interface SpawnSlot {
  total: number;      // copies placed at boot and refilled after a period change
  points: Point[];    // listed points; each copy picks one at random
  respawnS: number;   // seconds from death to replacement (0 = no respawn)
  biasS: number;      // +/- jitter in seconds
  period: Period;
}

interface Mob {
  slot: SpawnSlot;
  at: Point;
  aggroEligibleAt: number;
}

interface DueRespawn { at: number; slot: SpawnSlot; revisionAtDeath: number; }

const SPAWN_AGGRO_DELAY_MS = 10000;

function isActive(period: Period, mode: Mode): boolean {
  return period === 'always' || period === mode;
}

function respawnDelayMs(slot: SpawnSlot, random: () => number): number {
  const seconds = Math.max(0, slot.respawnS);
  const bias = Math.max(0, slot.biasS);
  return Math.round((seconds - bias + random() * bias * 2) * 1000);
}

export class ZoneSpawner {
  private mode: Mode = 'day';
  private revision = 0;
  private mobs: Mob[] = [];
  private due: DueRespawn[] = [];

  constructor(private readonly slots: SpawnSlot[], private readonly random: () => number = Math.random) {}

  boot(now: number): void {
    for (const slot of this.slots) {
      for (let i = 0; i < slot.total; i++) this.spawn(slot, now);
    }
  }

  private spawn(slot: SpawnSlot, now: number): Mob | null {
    if (!isActive(slot.period, this.mode)) return null;
    const pick = slot.points[Math.floor(this.random() * slot.points.length)];
    const mob: Mob = { slot, at: { x: pick.x, y: pick.y }, aggroEligibleAt: now + SPAWN_AGGRO_DELAY_MS };
    this.mobs.push(mob);
    return mob;
  }

  kill(mob: Mob, now: number): void {
    const index = this.mobs.indexOf(mob);
    if (index < 0) return;
    this.mobs.splice(index, 1);
    if (mob.slot.respawnS > 0) {
      this.due.push({ at: now + respawnDelayMs(mob.slot, this.random), slot: mob.slot, revisionAtDeath: this.revision });
    }
  }

  // The donor uses one setTimeout per death; this sketch polls a due list once per server tick.
  tick(now: number): void {
    const ready = this.due.filter((d) => d.at <= now);
    this.due = this.due.filter((d) => d.at > now);
    for (const d of ready) {
      const periodic = d.slot.period !== 'always';
      if (periodic && (d.revisionAtDeath !== this.revision || !isActive(d.slot.period, this.mode))) continue;
      this.spawn(d.slot, now);
    }
  }

  setMode(next: Mode, now: number): void {
    if (next === this.mode) return;
    this.mode = next;
    this.revision += 1;
    this.mobs = this.mobs.filter((m) => m.slot.period === 'always' || isActive(m.slot.period, next));
    for (const slot of this.slots) {
      if (!isActive(slot.period, next)) continue;
      let present = this.mobs.filter((m) => m.slot === slot).length;
      while (present < slot.total) {
        this.spawn(slot, now);
        present += 1;
      }
    }
  }
}

export {};
