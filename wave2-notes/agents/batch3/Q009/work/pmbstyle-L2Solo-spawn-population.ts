// Licence: Apache-2.0 (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Period = 'always' | 'day' | 'night';
type Mode = 'day' | 'night';

interface SpawnRow {
  id: number;
  total: number;      // members the row keeps alive in the zone (count)
  respawnS: number;   // seconds after a death before a member returns; 0 = never (s)
  biasS: number;      // uniform jitter, +/- seconds (s)
  period: Period;
}

interface Host {
  after(ms: number, fn: () => void): void; // timer
  spawnOne(rowId: number): boolean;        // false = the spawn failed, no member made
  rand(): number;                          // uniform in [0, 1)
}

class ZonePopulation {
  private mode: Mode = 'day';
  private revision = 0;
  private alive = new Map<number, number>();
  private rows = new Map<number, SpawnRow>();

  constructor(rows: SpawnRow[], private host: Host) {
    for (const r of rows) {
      this.rows.set(r.id, r);
      this.alive.set(r.id, 0);
    }
    for (const r of rows) this.fill(r, this.revision);
  }

  private isActive(row: SpawnRow): boolean {
    return row.period === 'always' || row.period === this.mode;
  }

  private count(id: number): number {
    return this.alive.get(id) ?? 0;
  }

  private delayMs(row: SpawnRow): number {
    const seconds = Math.max(0, row.respawnS);
    const bias = Math.max(0, row.biasS);
    return Math.max(0, Math.round((seconds - bias + this.host.rand() * bias * 2) * 1000));
  }

  // Tops a row up to its total. A failed spawn is retried after 1 s (a Frankendom addition;
  // the donor's ordinary respawn only logs the failure).
  private fill(row: SpawnRow, rev: number): void {
    while (this.isActive(row) && this.count(row.id) < row.total) {
      if (!this.host.spawnOne(row.id)) {
        this.host.after(1000, () => {
          if (rev === this.revision) this.fill(row, rev);
        });
        return;
      }
      this.alive.set(row.id, this.count(row.id) + 1);
    }
  }

  onDeath(rowId: number): void {
    const row = this.rows.get(rowId);
    if (!row) throw new Error(`unknown row ${rowId}`);
    this.alive.set(rowId, Math.max(0, this.count(rowId) - 1));
    if (row.respawnS <= 0) return; // respawn 0 = this row never respawns
    const rev = this.revision;
    this.host.after(this.delayMs(row), () => {
      // a periodic row's timer from an older period revision is dropped
      if (row.period !== 'always' && rev !== this.revision) return;
      if (!this.isActive(row)) return;
      this.fill(row, rev);
    });
  }

  // Day/night flip: bump the revision (invalidates pending periodic timers),
  // remove inactive periodic members, then refill every active row.
  flip(next: Mode): { removed: number; spawned: number } {
    if (next === this.mode) return { removed: 0, spawned: 0 };
    this.mode = next;
    this.revision += 1;
    let removed = 0;
    for (const row of this.rows.values()) {
      if (row.period !== 'always' && !this.isActive(row)) {
        removed += this.count(row.id);
        this.alive.set(row.id, 0);
      }
    }
    let spawned = 0;
    for (const row of this.rows.values()) {
      const before = this.count(row.id);
      this.fill(row, this.revision);
      spawned += this.count(row.id) - before;
    }
    return { removed, spawned };
  }

  aliveCount(rowId: number): number {
    return this.count(rowId);
  }
}

// Usage with a fake host, so the file exercises the types.
const pending: Array<() => void> = [];
const zone = new ZonePopulation(
  [
    { id: 1, total: 3, respawnS: 60, biasS: 10, period: 'always' },
    { id: 2, total: 2, respawnS: 120, biasS: 0, period: 'night' },
  ],
  { after: (_ms, fn) => { pending.push(fn); }, spawnOne: () => true, rand: () => 0.5 },
);
zone.onDeath(1);
zone.flip('night');
export {};
