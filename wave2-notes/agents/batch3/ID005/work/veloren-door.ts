// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Vec3 { x: number; y: number; z: number; }
type PlayerState = "idle" | "wielding" | "sit" | "dance" | "busy";
interface Player { id: number; pos: Vec3; state: PlayerState; }
interface Door { id: number; pos: Vec3; radius: number; buildupS: number; requiresNoAggro: boolean; target: Vec3; }
interface Foe { targetPlayerId: number | null; aggroOn: boolean; pos: Vec3; }
interface Companion { ownerId: number; pos: Vec3; }
interface Channel { doorId: number; endsAt: number; }
interface World {
  players: Map<number, Player>;
  doors: Map<number, Door>;
  foes: Foe[];
  companions: Companion[];
  channels: Map<number, Channel>; // one running channel per player
}

const AGGRO_RANGE = 200;  // data: an aggroed foe this close (xy circle) blocks a no-aggro door
const ESCORT_RANGE = 20;  // data: companions this close to the owner come along

function dist2(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x; const dy = a.y - b.y; const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
function dist2Xy(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// Step 1 (on use press): start a channel only if the player stands in range and has none running.
export function startChannel(w: World, playerId: number, doorId: number, now: number): boolean {
  const p = w.players.get(playerId);
  const d = w.doors.get(doorId);
  if (!p || !d || w.channels.has(playerId)) return false;
  if (dist2(p.pos, d.pos) > d.radius * d.radius) return false;
  w.channels.set(playerId, { doorId, endsAt: now + d.buildupS });
  return true;
}

// True if any foe currently has this player as its aggro target, within the xy circle.
function aggroNear(w: World, p: Player): boolean {
  return w.foes.some(f =>
    f.targetPlayerId === p.id && f.aggroOn && dist2Xy(f.pos, p.pos) <= AGGRO_RANGE * AGGRO_RANGE);
}

// Step 2 (once per server tick, game clock `now` in seconds): cancel on any failed rule, else fire when time is up.
export function tickChannels(w: World, now: number): void {
  for (const [playerId, ch] of Array.from(w.channels.entries())) {
    const p = w.players.get(playerId);
    const d = w.doors.get(ch.doorId);
    if (!p || !d) { w.channels.delete(playerId); continue; }

    const out = dist2(p.pos, d.pos) > d.radius * d.radius;
    const blocked = d.requiresNoAggro && aggroNear(w, p);
    const allowed = p.state === "idle" || p.state === "wielding" || p.state === "sit" || p.state === "dance";
    if (out || blocked || !allowed) { w.channels.delete(playerId); continue; }
    if (now < ch.endsAt) continue;

    // Fire: owner and companions within ESCORT_RANGE go to the door target together.
    for (const c of w.companions) {
      if (c.ownerId === p.id && dist2Xy(c.pos, p.pos) <= ESCORT_RANGE * ESCORT_RANGE) c.pos = { ...d.target };
    }
    p.pos = { ...d.target };
    w.channels.delete(playerId);
  }
}

export {};
