// Licence: MIT (donor). Adapted from the described mechanism; MIT allows adaptation.
interface Rng { next(): number } // 0..1, seeded in Frankendom

interface SlotConfig {
  cap: number;            // zone data field: max live creatures
  respawnSec: number;     // zone data field; 0 = never respawn
  respawnJitterSec: number;
  minRespawnSec: number;  // floor (donor uses 10)
}

interface Creature { id: number }

interface Slot {
  cfg: SlotConfig;
  live: Creature[];
  pending: number;            // respawns booked, not yet fired
  enabled: boolean;
}

interface PendingRespawn { slot: Slot; dueTick: number }

const TICK_HZ = 20;
const pendingList: PendingRespawn[] = [];

function respawnDelayTicks(cfg: SlotConfig, rng: Rng): number {
  const lo = Math.max(cfg.minRespawnSec, cfg.respawnSec - cfg.respawnJitterSec);
  const hi = Math.max(cfg.minRespawnSec, cfg.respawnSec + cfg.respawnJitterSec);
  const sec = lo === hi ? lo : lo + rng.next() * (hi - lo);
  return Math.round(sec * TICK_HZ);
}

function initialFill(slot: Slot, make: () => Creature): void {
  while (slot.live.length < slot.cfg.cap) slot.live.push(make());
  slot.enabled = slot.cfg.respawnSec > 0;
}

// Called once the corpse has been removed (not at the moment of death).
function onRemoved(slot: Slot, dead: Creature, nowTick: number, rng: Rng): void {
  const i = slot.live.indexOf(dead);
  if (i < 0) return;
  slot.live.splice(i, 1);
  if (slot.enabled && slot.pending + slot.live.length < slot.cfg.cap) {
    slot.pending++;
    pendingList.push({ slot, dueTick: nowTick + respawnDelayTicks(slot.cfg, rng) });
  }
}

// Run on a coarse cadence (donor: once per second), not every sim tick.
function sweep(nowTick: number, make: () => Creature): void {
  for (let i = pendingList.length - 1; i >= 0; i--) {
    const p = pendingList[i];
    if (nowTick <= p.dueTick) continue;
    pendingList.splice(i, 1);
    if (p.slot.enabled) p.slot.live.push(make());
    p.slot.pending--;
  }
}

function despawnZone(slot: Slot): void {
  slot.enabled = false;          // first, so removal books nothing
  slot.live.length = 0;
}
export {};
