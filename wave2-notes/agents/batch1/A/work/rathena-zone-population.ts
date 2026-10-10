// Licence: GPL-3.0 (donor, rAthena LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SpawnLine { id: string; count: number; }
interface Mob { lineId: string; hp: number; maxHp: number; isMvp: boolean; respawnPending: boolean; }

class ZonePopulation {
  private users = 0;
  private live: Mob[] = [];
  private sweepAt: number | null = null; // pending sweep time, like the map's removal timer

  constructor(
    private cache: SpawnLine[],                 // spawn lines are data; they are kept even while the zone is empty
    private graceMs: number,                    // how long an empty zone keeps its mobs
    private removeDamaged: boolean,
    private spawnOne: (line: SpawnLine) => Mob, // creates one mob for a line
  ) {}

  playerEnter(): void {
    this.users += 1;
    if (this.users !== 1) return;
    if (this.sweepAt !== null) { this.sweepAt = null; return; } // mobs are still here: cancel the sweep
    for (const line of this.cache) {
      let have = this.live.filter(m => m.lineId === line.id).length;
      while (have < line.count) { this.live.push(this.spawnOne(line)); have += 1; }
    }
  }

  playerLeave(now: number): void {
    this.users -= 1;
    if (this.users === 0) this.sweepAt = now + this.graceMs; // arm the sweep; do not remove yet
  }

  // Called from the server loop. Sweeps only if the zone is still empty when the grace period ends.
  tick(now: number): void {
    if (this.sweepAt === null || now < this.sweepAt) return;
    this.sweepAt = null;
    if (this.users > 0) return; // someone came back before the timer fired
    this.live = this.live.filter(m => this.shouldKeep(m));
  }

  private shouldKeep(m: Mob): boolean {
    if (m.isMvp) return true;
    if (m.respawnPending) return true;
    if (!this.removeDamaged && m.hp < m.maxHp) return true;
    return false;
  }
}

export {};
