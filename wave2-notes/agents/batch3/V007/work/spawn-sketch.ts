// Licence: copyleft (AAEmu LICENSE.GPL is GPL-3.0; README "Licensing information" header is LGPL-3.0).
// clean-room: written from the described mechanism, not a translation of the donor lines.
type Seconds = number;

interface SpawnPoint {
  maxPopulation: number;   // zone data (donor default 1)
  inList: number;          // living plus dead members still held by the spawn point
  corpses: number;         // dead members still held (they block replacement)
  reservedRespawns: number;// respawns queued and not yet filled
  othersInGroup: number;   // members of other spawn points in the same group (donor: usually 0)
}

// Presence gate: the caller only ticks a spawn point while a player is inside its test radius.
// The donor caches that answer for 10 s, so a change is seen up to 10 s late.
class PresenceCache {
  private at: Seconds = Number.NEGATIVE_INFINITY;
  private value = false;
  constructor(private readonly ttl: Seconds = 10) {}

  test(now: Seconds, probe: () => boolean): boolean {
    if (now - this.at >= this.ttl) {
      this.value = probe();
      this.at = now;
    }
    return this.value;
  }
}

// Target = one per nearby player, never above the zone cap, never below one.
function targetCount(playersNear: number, maxPopulation: number): number {
  return Math.min(Math.max(playersNear, 1), maxPopulation);
}

// One tick. Returns how many members to add (0 when blocked). membersPerPass is the
// number of member lines in the spawn point; the donor adds all of them in one pass.
function spawnTick(p: SpawnPoint, playersNear: number, membersPerPass: number): number {
  if (p.corpses > 0) return 0;                          // a corpse blocks replacement
  if (p.inList + p.othersInGroup >= targetCount(playersNear, p.maxPopulation)) return 0;
  return membersPerPass;                                // cap is checked once, before the pass
}

// Record that a fill happened (reservations are consumed by spawns).
function onSpawn(p: SpawnPoint, added: number): void {
  p.inList += added;
  p.reservedRespawns = Math.max(0, p.reservedRespawns - added);
}

// Death: the body stays in the list until removeAt. A respawn is queued only if the
// zone still has room after counting queued respawns.
function onDeath(p: SpawnPoint, now: Seconds, corpseHold: Seconds, lootHold: Seconds, hasLoot: boolean): { queued: boolean; removeAt: Seconds } {
  p.corpses += 1;
  const queued = p.reservedRespawns + p.othersInGroup < p.maxPopulation;
  if (queued) p.reservedRespawns += 1;
  return { queued, removeAt: now + corpseHold + (hasLoot ? lootHold : 0) };
}

// Corpse removal at removeAt: the member leaves the list, which re-opens the gate.
function onCorpseRemoved(p: SpawnPoint): void {
  p.corpses = Math.max(0, p.corpses - 1);
  p.inList = Math.max(0, p.inList - 1);
}

export {};
