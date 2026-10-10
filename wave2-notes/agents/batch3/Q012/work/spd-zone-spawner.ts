// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnMob { enemy: boolean; miniboss: boolean; weight: number; }
export interface SpawnCell { passable: boolean; inView: boolean; occupied: boolean; pathDist: number; }
export interface ZoneSpawn {
  cap: () => number;        // re-evaluated on every check (the donor re-rolls it each call)
  baseCooldownS: number;    // seconds after a successful spawn
  dark: boolean;            // dark zone flag
  darkFactor: number;       // cooldown multiplier for a dark zone
  retryS: number;           // delay after a failed placement
  minPathDist: number;      // minimum walking distance from the player
  attempts: number;         // outer placement tries
  rotation: string[];       // zone monster kinds, drawn from a shuffled bag
}

function shuffle<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class ZoneSpawner {
  private bag: string[] = [];
  constructor(private z: ZoneSpawn, private rng: () => number) {}

  population(mobs: SpawnMob[]): number {
    let c = 0;
    for (const m of mobs) if (m.enemy && !m.miniboss) c += m.weight;
    return Math.round(c);
  }

  cooldownS(): number {
    return this.z.baseCooldownS * (this.z.dark ? this.z.darkFactor : 1);
  }

  private nextKind(): string {
    if (this.bag.length === 0) this.bag = shuffle(this.z.rotation.slice(), this.rng);
    return this.bag.shift() as string; // taken before placement, so a failed placement consumes it
  }

  private placeCell(cells: SpawnCell[]): number {
    for (let outer = 0; outer < this.z.attempts; outer++) {
      let cell = -1;
      for (let inner = 0; inner < 30; inner++) {
        const i = Math.floor(this.rng() * cells.length);
        const c = cells[i];
        if (c.passable && !c.inView && !c.occupied) { cell = i; break; }
      }
      if (cell !== -1 && cells[cell].pathDist >= this.z.minPathDist) return cell;
    }
    return -1;
  }

  // One timer fire. Returns the placed cell (or -1) and the delay until the next fire.
  fire(mobs: SpawnMob[], cells: SpawnCell[]): { cell: number; kind: string | null; sleepS: number } {
    if (this.population(mobs) >= this.z.cap()) {
      return { cell: -1, kind: null, sleepS: this.cooldownS() };
    }
    const kind = this.nextKind();
    const cell = this.placeCell(cells);
    if (cell === -1) return { cell, kind: null, sleepS: this.z.retryS };
    return { cell, kind, sleepS: this.cooldownS() };
  }
}

export {};
