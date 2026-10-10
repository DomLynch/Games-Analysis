// Licence: MIT as read (L2Dn LICENSE.txt, Copyright (c) 2024-2025 Grymyr, L2Dn Server Project).
// Provenance flag: README says the code began as a port of L2J (Java); L2J licence not read. Clean-room: shape only.
// Respawn queue for one spawn point: count down on corpse decay, respawn after a random delay, capped.

export const MIN_RESPAWN_MS = 10_000; // donor: floor on the min and max delay (Spawn.cs 458-459)

export interface SpawnPoint {
  maximum: number;   // cap: alive plus queued must stay below this to queue another respawn
  alive: number;     // donor: _currentCount
  queued: number;    // donor: _scheduledCount
  respawnOn: boolean;
  minDelayMs: number;
  maxDelayMs: number;
}

export interface Pending { sp: SpawnPoint; dueAt: number; }

// Donor: setRespawnDelay(delay, randomInterval): band is delay +/- random, each end floored at 10 s.
export function setDelay(sp: SpawnPoint, delayMs: number, randomMs: number): void {
  sp.minDelayMs = Math.max(MIN_RESPAWN_MS, delayMs - randomMs);
  sp.maxDelayMs = Math.max(MIN_RESPAWN_MS, delayMs + randomMs);
}

// Donor: init() fills to the cap, then turns respawn on only if the min delay is above zero.
export function init(sp: SpawnPoint, spawnOne: (sp: SpawnPoint) => void): void {
  while (sp.alive < sp.maximum) {
    spawnOne(sp);
  }
  sp.respawnOn = sp.minDelayMs > 0;
}

// Donor: Npc.onDecay calls decreaseCount when the corpse decays, not at the killing blow.
export function onDecay(sp: SpawnPoint, queue: Pending[], now: number, rand: () => number): void {
  if (sp.alive <= 0) return;
  sp.alive -= 1;
  if (sp.respawnOn && sp.queued + sp.alive < sp.maximum) {
    sp.queued += 1;
    const band = sp.maxDelayMs - sp.minDelayMs;
    const delay = band > 0 ? sp.minDelayMs + rand() * band : sp.minDelayMs;
    queue.push({ sp, dueAt: now + delay });
  }
}

// Donor: RespawnTaskManager runs once a second. Due entries respawn, then the queued count drops.
export function sweep(queue: Pending[], now: number, spawnOne: (sp: SpawnPoint) => void): Pending[] {
  const remaining: Pending[] = [];
  for (const p of queue) {
    if (now > p.dueAt) {
      if (p.sp.respawnOn) spawnOne(p.sp);
      p.sp.queued -= 1;
    } else {
      remaining.push(p);
    }
  }
  return remaining;
}

export {}
