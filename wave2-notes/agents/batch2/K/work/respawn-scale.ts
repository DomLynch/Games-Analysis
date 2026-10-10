// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism, not a translation.
// clean-room
interface ZoneData {
  respawnRate: number;      // players the zone is "sized for"; 1 = scaling off (donor default)
  minScaledSec: number;     // floor for scaled delays (donor default 10)
  corpseSec: number;
  groupActive: boolean;
}

interface DeadSlot { slotId: number; zoneId: number; baseRespawnSec: number; exempt: boolean }
interface Due { dueSec: number; slotId: number }

const queue: Due[] = [];           // keep sorted by dueSec
const playersInZone = new Map<number, number>();

function scaledDelay(z: ZoneData, slot: DeadSlot): number {
  if (z.respawnRate === 1 || slot.exempt) return slot.baseRespawnSec;
  const players = playersInZone.get(slot.zoneId) ?? 0;
  if (players === 0) return slot.baseRespawnSec;
  const factor = z.respawnRate / players;
  if (factor >= 1) return slot.baseRespawnSec;
  if (slot.baseRespawnSec <= z.minScaledSec) return slot.baseRespawnSec;
  return Math.max(Math.ceil(slot.baseRespawnSec * factor), z.minScaledSec);
}

function enqueue(d: Due): void {
  let i = queue.length;
  while (i > 0 && queue[i - 1].dueSec > d.dueSec) i--;
  queue.splice(i, 0, d);
}

// Server-verified death only. Delay is read at the moment of death.
function onDeath(z: ZoneData, slot: DeadSlot, nowSec: number): void {
  enqueue({ dueSec: nowSec + scaledDelay(z, slot) + z.corpseSec, slotId: slot.slotId });
}

// Coarse sweep (donor: every 5 s). Drain due entries in order; gated ones are pushed 5 s out.
function sweep(nowSec: number, zoneOf: (slotId: number) => ZoneData, spawn: (slotId: number) => void, isAlive: (slotId: number) => boolean): void {
  while (queue.length > 0 && queue[0].dueSec <= nowSec) {
    const d = queue.shift() as Due;
    if (!zoneOf(d.slotId).groupActive) { enqueue({ dueSec: nowSec + 5, slotId: d.slotId }); continue; }
    if (isAlive(d.slotId)) continue;
    spawn(d.slotId);
  }
}
export {};
