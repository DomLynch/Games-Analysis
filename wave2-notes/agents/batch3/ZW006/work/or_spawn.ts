// Licence: GPL-3.0-or-later (donor, OpenRA). Clean-room sketch written from the described mechanism, not a translation.
interface SpawnPoint { x: number; y: number; types: string[]; }

interface SpawnDirectorConfig {
  minimum: number;              // zone data, count
  maximum: number;              // zone data, count
  initialDelay: number;         // zone data, ticks
  spawnInterval: [number] | [number, number]; // zone data, ticks: fixed, or a range
  spawnTable: string[];         // zone data: picked uniformly
  types: string[];              // zone data: which spawn points this director uses
}

class SpawnDirector {
  private initialDelay: number;
  private countdown = 0;
  private present = 0;

  constructor(
    private cfg: SpawnDirectorConfig,
    private points: SpawnPoint[],
    private rand: () => number,   // 0 <= r < 1
    private spawnAt: (name: string, p: SpawnPoint) => void,
  ) {
    this.initialDelay = cfg.initialDelay;
  }

  // Donor order: initial delay, maximum gate, countdown gate, pick point, reset countdown, burst to minimum.
  tick(): void {
    if (--this.initialDelay > 0) return;
    if (this.cfg.maximum < 1 || this.present >= this.cfg.maximum) return;
    if (--this.countdown > 0 && this.present >= this.cfg.minimum) return;

    let point = this.pickPoint();
    if (point === undefined) return; // countdown is not reset, so the next tick tries again

    this.countdown = this.randomInterval();
    do {
      this.spawn(point);
      point = this.pickPoint() as SpawnPoint; // list is unchanged within this tick, so defined
    } while (this.present < this.cfg.minimum);
  }

  // Called by whatever removes a spawned actor. In the donor only one actor type calls it.
  onRemoved(): void {
    this.present--;
  }

  private spawn(p: SpawnPoint): void {
    const name = this.cfg.spawnTable[Math.floor(this.rand() * this.cfg.spawnTable.length)];
    this.present++; // counted now; the actor is created later in the donor (frame end)
    this.spawnAt(name, p);
  }

  private pickPoint(): SpawnPoint | undefined {
    const eligible = this.points.filter(
      (p) => this.cfg.types.some((t) => p.types.includes(t)) || p.types.length === 0,
    );
    if (eligible.length === 0) return undefined;
    return eligible[Math.floor(this.rand() * eligible.length)];
  }

  private randomInterval(): number {
    const r = this.cfg.spawnInterval;
    if (r.length === 1) return r[0];
    return r[0] + Math.floor(this.rand() * (r[1] - r[0])); // upper bound exclusive, as donor Next(min, max) is assumed to be
  }
}

export {};
