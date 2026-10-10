// Licence: unclear (donor source headers cite the DOOM Source Code License; the donor README and LICENSE.TXT say GPL-2.0). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnPoint { x: number; y: number; kind: string; }

const TIC_RATE = 35;                      // tics per second
const ITEM_RING = 128;                    // ring slots; one slot is always kept free, so 127 entries
const ITEM_DELAY = 30 * TIC_RATE;         // tics an item waits before it may respawn
const CORPSE_DELAY = 12 * TIC_RATE;       // tics a corpse waits before it may respawn
const CORPSE_CHECK_MASK = 31;             // corpses are checked every 32 tics

interface Removed { at: SpawnPoint; removedTic: number; }

// FIFO of removed pickups. Oldest entries are dropped when the ring is full.
export class ItemRespawnQueue {
  private q: Removed[] = [];

  push(at: SpawnPoint, nowTic: number): void {
    this.q.push({ at, removedTic: nowTic });
    if (this.q.length > ITEM_RING - 1) this.q.shift();   // drop oldest
  }

  // Called once per tic. Respawns at most one item: the oldest, and only once it has waited long enough.
  tick(nowTic: number, spawn: (at: SpawnPoint) => void): void {
    const oldest = this.q[0];
    if (!oldest) return;
    if (nowTic - oldest.removedTic < ITEM_DELAY) return;
    this.q.shift();
    spawn(oldest.at);
  }
}

export interface Corpse {
  spawn: SpawnPoint;
  countsAsKill: boolean;
  waitedTics: number;      // grows each tic while the corpse lies dead
}

// Per-tic check for one dead monster. roll() returns 0..255. Returns true when the monster should come back now.
export function corpseRespawnDue(
  c: Corpse,
  nowTic: number,
  respawnOn: boolean,
  spotFree: (s: SpawnPoint) => boolean,
  roll: () => number,
): boolean {
  if (!c.countsAsKill || !respawnOn) return false;
  c.waitedTics += 1;
  if (c.waitedTics < CORPSE_DELAY) return false;
  if ((nowTic & CORPSE_CHECK_MASK) !== 0) return false;
  if (roll() > 4) return false;            // about 6 of 256 table entries pass
  return spotFree(c.spawn);                // occupied: stay dead, try again at the next check
}

// Difficulty tiers: five skill levels share three spawn flags (1 easy, 2 normal, 4 hard).
export function spawnsAt(thingBits: number, skill: 0 | 1 | 2 | 3 | 4, netgame: boolean): boolean {
  if (!netgame && (thingBits & 16) !== 0) return false;   // multiplayer-only thing
  const bit = skill === 0 ? 1 : skill === 4 ? 4 : 1 << (skill - 1);
  return (thingBits & bit) !== 0;
}

export {};
