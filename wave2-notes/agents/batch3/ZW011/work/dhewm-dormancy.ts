// Licence: GPL-3.0-or-later with id additional terms (donor). Clean-room sketch of the shape only, written from the described order of tests, not a translation.
const DORMANT_GRACE_MS = 3000;   // donor: DELAY_DORMANT_TIME (zone-independent engine constant)

// Zone graph: zones are nodes; a gate (door) joins two zones and is open or shut.
interface ZoneGate { to: number; open: boolean; }
interface ZoneGraph { neighbours(zone: number): ZoneGate[]; }

interface Npc {
  zone: number;            // zone the NPC stands in
  graceStart: number;      // 0 = not timing a shut-off (donor dormantStart)
  awakened: boolean;       // has been awake once (donor fl.hasAwakened)
  dormant: boolean;
}

// Zones reachable from any player zone through OPEN gates only.
// Same result as the donor's BFS over portals that do not block view, merged across players.
function connectedZones(graph: ZoneGraph, playerZones: number[]): Set<number> {
  const seen = new Set<number>(playerZones);
  const queue = [...playerZones];
  for (let i = 0; i < queue.length; i++) {
    for (const g of graph.neighbours(queue[i])) {
      if (!g.open || seen.has(g.to)) continue;
      seen.add(g.to);
      queue.push(g.to);
    }
  }
  return seen;
}

// Spawn offset from the donor: the grace window is almost used up, so a closed-off NPC goes dormant within about 5 frames.
function spawnNpc(zone: number, now: number, frameMs: number): Npc {
  return { zone, graceStart: now - DORMANT_GRACE_MS + 5 * frameMs, awakened: false, dormant: false };
}

// Order of tests, as the donor's DoDormantTests:
// 1. not connected to a player: start the grace timer; dormant only after it runs out.
// 2. connected, never awake: stay dormant until a player can see the NPC (merged view test).
// 3. otherwise: clear the timer, mark awake, run.
function dormantTest(n: Npc, now: number, connected: Set<number>, inPlayerView: (n: Npc) => boolean): boolean {
  if (!connected.has(n.zone)) {
    if (n.graceStart === 0) n.graceStart = now;
    return now - n.graceStart >= DORMANT_GRACE_MS;
  }
  if (!n.awakened && !inPlayerView(n)) return true;
  n.graceStart = 0;
  n.awakened = true;
  return false;
}

// Donor CheckDormant: call at the top of the NPC's think; skip the brain when dormant.
function checkDormant(n: Npc, now: number, connected: Set<number>, inPlayerView: (n: Npc) => boolean): boolean {
  const d = dormantTest(n, now, connected, inPlayerView);
  n.dormant = d;               // donor calls DormantBegin / DormantEnd on the change; omitted here
  return d;
}

export {};
