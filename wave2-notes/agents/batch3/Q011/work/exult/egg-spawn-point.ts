// Licence: GPL-2.0-or-later (donor, Exult). Clean-room: written from the described mechanism, not translated.

export interface Tile { x: number; y: number; }

export interface SpawnPoint {
  x: number;
  y: number;
  radius: number;         // trigger square half-size in tiles (donor: distance field)
  chancePct: number;      // 0..100 per entry (donor: probability)
  nightOnly: boolean;     // donor: nocturnal, not active from hour 5 to 20
  once: boolean;          // donor: removed after a successful hatch
  rearm: boolean;         // donor: auto_reset, may hatch again after re-entry
  hatched: boolean;
  removed: boolean;
  groupMax: number;       // donor: cnt; group is 1 + roll below cnt when cnt > 1
  placeRadius: number;    // donor: find_spot radius 5 for monster eggs
}

const inside = (sp: SpawnPoint, t: Tile): boolean =>
  Math.abs(t.x - sp.x) <= sp.radius && Math.abs(t.y - sp.y) <= sp.radius;

// Edge trigger: the player steps from outside the square to inside it.
export function isTriggered(sp: SpawnPoint, hour: number, from: Tile, to: Tile, isPlayer: boolean): boolean {
  if (sp.removed) return false;
  if (sp.hatched && !sp.rearm) return false;
  const night = hour >= 21 || hour <= 4;
  if (sp.nightOnly && !night) return false;
  if (!isPlayer) return false;
  return inside(sp, to) && !inside(sp, from);
}

// Hatch: one percentage roll per trigger; on success spawn a group, then apply once-removal.
// rollBelow(n) returns an integer in [0, n); placeFree(x, y, r) returns a free tile or null.
export function hatch(
  sp: SpawnPoint,
  rollBelow: (n: number) => number,
  placeFree: (x: number, y: number, r: number) => Tile | null,
): Tile[] {
  const spawned: Tile[] = [];
  const roll = 1 + rollBelow(100);                  // 1..100
  if (roll <= sp.chancePct) {
    let n = sp.groupMax;
    if (n > 1) n = 1 + rollBelow(n);                // group of 1..cnt
    for (let i = 0; i < n; i++) {
      const t = placeFree(sp.x, sp.y, sp.placeRadius);
      if (t !== null) spawned.push(t);
    }
    if (sp.once) sp.removed = true;
  }
  sp.hatched = true;
  return spawned;
}
