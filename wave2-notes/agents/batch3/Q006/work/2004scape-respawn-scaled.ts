// Licence: MIT (donor, 2004Scape-Server, Lost City 2023-2025). Shape adapted; written here from the described mechanism.
interface NpcSlot {
  baseType: number;        // type to return to on respawn
  active: boolean;         // false while waiting to respawn
  lifecycleTick: number;   // ticks left until the next lifecycle event; -1 = no timer
}

const TICK_MS = 600;       // one world tick (donor TICKRATE, World.ts 120)
const PLAYER_CAP = 2000;   // donor clamps the count here (World.ts 1775)

// Respawn duration in ticks, shrinking with live population: full rate at 0 players,
// half rate at the cap. The donor works in integer ticks (truncated).
function scaleByPlayers(rateTicks: number, players: number): number {
  const p = Math.min(players, PLAYER_CAP);
  return Math.trunc(((4000 - p) * rateTicks) / 4000);
}

// Death: the NPC leaves play and a countdown starts. The duration is fixed here, at death,
// and is not re-read when the population changes later.
function onDeath(n: NpcSlot, typeRespawnRateTicks: number, players: number): void {
  n.active = false;
  n.lifecycleTick = scaleByPlayers(typeRespawnRateTicks, players);
}

// Once per world tick, for every NPC still in the world's list (active or waiting).
function turnNpc(n: NpcSlot, respawn: (n: NpcSlot) => void): void {
  if (n.lifecycleTick < 0) return;                       // no timer running
  if (--n.lifecycleTick !== 0) return;                   // still counting down
  if (!n.active) {
    n.active = true;                                     // back on its start tile...
    respawn(n);                                          // ...as its base type
  }
  n.lifecycleTick = -1;
}

// Fixed-step world loop: every NPC gets one turn per tick.
function worldTick(npcs: NpcSlot[], respawn: (n: NpcSlot) => void): void {
  for (const n of npcs) turnNpc(n, respawn);
}

export { TICK_MS, onDeath, worldTick, scaleByPlayers };
