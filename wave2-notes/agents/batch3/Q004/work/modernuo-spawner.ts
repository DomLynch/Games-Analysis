// Clean-room sketch from the described mechanism (donor is GPL-3.0-or-later; no lines translated).
type Ms = number;

interface EntryDef { name: string; weight: number; maxCount: number; }

interface SpawnerDef {
  cap: number;          // whole-spawner cap (donor: _count, IsFull)
  minDelayMs: number;   // donor: _minDelay
  maxDelayMs: number;   // donor: _maxDelay
  entries: EntryDef[];
}

export class ZoneSpawner {
  private alive = new Map<number, number>(); // mob id -> entry index
  private perEntry: number[];
  private nextAt: Ms | null = null;          // null = timer not running
  private cooldownUntil: Ms = 0;             // presence mode only
  private running = true;

  constructor(private def: SpawnerDef, private rand: () => number = Math.random) {
    this.perEntry = def.entries.map(() => 0);
  }

  get full(): boolean { return this.alive.size >= this.def.cap; }
  get empty(): boolean { return this.alive.size === 0; }

  private randomDelay(): Ms {
    const span = this.def.maxDelayMs - this.def.minDelayMs;
    return this.def.minDelayMs + Math.floor(this.rand() * (span + 1));
  }

  // Donor DoTimer(): always records the next time, but the timer only runs while not full.
  private arm(now: Ms): void {
    if (!this.running) return;
    this.nextAt = this.full ? null : now + this.randomDelay();
  }

  // Donor Spawn(): weighted pick among entries that are not at their own max.
  private spawnOne(place: (entry: number) => number | null): void {
    if (this.full) return;
    const open = this.def.entries.map((e, i) => (this.perEntry[i] < e.maxCount ? e.weight : 0));
    const total = open.reduce((s, w) => s + w, 0);
    if (total <= 0) return;
    let roll = 1 + Math.floor(this.rand() * total); // 1..total, as RandomMinMax(1, probsum)
    for (let i = 0; i < open.length; i++) {
      if (open[i] === 0) continue;
      if (roll <= open[i]) {
        const id = place(i);                          // one attempt; no retry on failure
        if (id !== null) { this.alive.set(id, i); this.perEntry[i]++; }
        return;
      }
      roll -= open[i];
    }
  }

  // Donor OnTick(): fires only when the timer is running; one spawn per fire, then re-arm.
  tick(now: Ms, place: (entry: number) => number | null): void {
    if (this.nextAt === null || now < this.nextAt) return;
    this.nextAt = null;
    this.spawnOne(place);
    this.arm(now);
  }

  // Donor Remove(): drop the record; re-arm only if not full and no timer is running.
  remove(id: number, now: Ms): void {
    const entry = this.alive.get(id);
    if (entry === undefined) return;
    this.alive.delete(id);
    this.perEntry[entry]--;
    if (!this.full && this.nextAt === null) this.arm(now);
  }

  // Donor ProximitySpawner: trigger only when empty, cooldown elapsed, a real step in range.
  onStep(
    playerInRange: boolean, movedThisStep: boolean, validPlayer: boolean,
    now: Ms, place: (entry: number) => number | null,
  ): void {
    if (!this.running || !this.empty || now < this.cooldownUntil) return;
    if (!playerInRange || !movedThisStep || !validPlayer) return;
    this.cooldownUntil = now + this.randomDelay(); // cooldown starts at the trigger, not at the death
    this.spawnOne(place);
  }
}

export {};
