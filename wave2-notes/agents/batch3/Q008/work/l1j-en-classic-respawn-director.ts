// Licence of donor: GPL-2.0-or-later (source headers: "either version 2, or (at your option) any later version"). Clean-room sketch from the described mechanism, not a translation.
type Tile = { x: number; y: number };

interface SpawnRow {
  amount: number;                                             // slots kept filled (donor: _maximumCount)
  minDelayS: number;                                          // donor: min_respawn_delay, seconds
  maxDelayS: number;                                          // donor: max_respawn_delay, seconds
  area?: { x1: number; y1: number; x2: number; y2: number };  // donor: locx1..locy2
  home: Tile;                                                 // donor: getLocX / getLocY
}

interface World {
  isPassable(t: Tile): boolean;     // donor: in-map and passable
  playersSeeing(t: Tile): number;   // donor: getVisiblePlayer(mob).size()
  place(row: number, slot: number, t: Tile): void;
}

const LINGER_MS = 50_000;  // donor: NpcDeletionTime = 50 (config), corpse stays before the respawn timer starts
const RETRY_MS = 3_000;    // donor: retry delay when a player can see the chosen tile
const MAX_TRIES = 50;      // donor: while (tryCount <= 50)

interface Timer { row: number; slot: number; at: number; }

class SpawnDirector {
  private timers: Timer[] = [];

  constructor(
    private rows: SpawnRow[],
    private world: World,
    private now: () => number,
    private rand: () => number,   // uniform in [0, 1)
  ) {}

  onDeath(row: number, slot: number): void {
    const r = this.rows[row];
    const interval = r.maxDelayS - r.minDelayS;
    const extra = interval > 0 ? Math.floor(this.rand() * interval) : 0; // donor: nextInt(interval), so max itself is not reached
    this.timers.push({ row, slot, at: this.now() + LINGER_MS + (r.minDelayS + extra) * 1000 });
  }

  tick(): void {
    const t = this.now();
    const due = this.timers.filter(x => x.at <= t);
    this.timers = this.timers.filter(x => x.at > t);
    for (const x of due) this.attempt(x);
  }

  private attempt(x: Timer): void {
    const r = this.rows[x.row];
    for (let tries = 0; tries <= MAX_TRIES; tries++) {
      const c = this.candidate(r, tries);
      if (!this.world.isPassable(c)) continue;
      if (this.world.playersSeeing(c) > 0) {        // presence gate
        this.timers.push({ ...x, at: this.now() + RETRY_MS });
        return;
      }
      this.world.place(x.row, x.slot, c);
      return;
    }
    this.world.place(x.row, x.slot, r.home);        // donor: placed at home after the loop, no presence check
  }

  private candidate(r: SpawnRow, tries: number): Tile {
    if (!r.area || tries > 49) return r.home;       // donor: area rows use home after 49 failed tries; non-area rows use home
    return {
      x: r.area.x1 + Math.floor(this.rand() * (r.area.x2 - r.area.x1)),
      y: r.area.y1 + Math.floor(this.rand() * (r.area.y2 - r.area.y1)),
    };
  }
}

export {};
