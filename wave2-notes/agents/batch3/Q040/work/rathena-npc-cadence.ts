// Licence: GPL-3.0 (donor, rAthena). Clean-room: shape only, no line-by-line translation. Hot AI for NPCs near a player every 100 ms, cold pass every 1000 ms, with an active-time window after a player was last near.
export interface Npc { id: number; x: number; y: number; lastThinkMs: number; lastNearMs: number | null; }
export interface Player { x: number; y: number; }
type Think = (n: Npc, now: number) => void;

const AREA_CELLS = 14;          // view area (donor default area_size 14)
const ACTIVE_RANGE_CELLS = 4;   // extra range for hot AI (donor ACTIVE_AI_RANGE)
const HOT_MS = 100;             // hot pass interval (donor MIN_MOBTHINKTIME)
const COLD_MS = 1000;           // cold pass interval (donor MIN_MOBTHINKTIME * 10)
const RECENT_GUARD_MS = 2 * HOT_MS; // skip cold NPCs that thought recently (donor 2x guard)
const ACTIVE_WINDOW_MS = 5000;  // stays active after a player was near (donor code default; shipped config is 0 = off)

function near(n: Npc, p: Player, r: number): boolean {
  // simplified: square distance. The donor's range shape (map_foreachinallrange) was not read.
  return Math.max(Math.abs(n.x - p.x), Math.abs(n.y - p.y)) <= r;
}

// Every HOT_MS. Each NPC near any player thinks once per pass (donor runs once per player, no dedupe).
export function hotPass(npcs: Npc[], players: Player[], now: number, think: Think): number {
  let runs = 0;
  const radius = AREA_CELLS + ACTIVE_RANGE_CELLS;
  for (const n of npcs) {
    if (!players.some((p) => near(n, p, radius))) continue;
    n.lastNearMs = now;
    think(n, now);
    n.lastThinkMs = now;
    runs++;
  }
  return runs;
}

// Every COLD_MS. Window check comes first, then the 2x guard, as in the donor's lazy pass.
export function coldPass(npcs: Npc[], now: number, think: Think): number {
  let runs = 0;
  for (const n of npcs) {
    const active = n.lastNearMs !== null && now - n.lastNearMs < ACTIVE_WINDOW_MS;
    if (active && now > n.lastThinkMs) {
      think(n, now);
      n.lastThinkMs = now;
      runs++;
      continue;
    }
    if (n.lastNearMs !== null && !active) n.lastNearMs = null; // window expired
    if (now - n.lastThinkMs < RECENT_GUARD_MS) continue;
    // simplified: the donor's random walk and idle-skill rolls for distant mobs are omitted
  }
  return runs;
}
