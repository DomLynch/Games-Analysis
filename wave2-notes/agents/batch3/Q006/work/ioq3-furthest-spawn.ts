// Licence: GPL-2.0-or-later (donor, ioquake-ioq3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type V3 = { x: number; y: number; z: number };
interface Spot extends V3 { noBots: boolean; noHumans: boolean; }

const RESPAWN_LOCK_MS = 1700;   // no respawn until the death animation is done
const FORCE_RESPAWN_S = 20;     // forced respawn window after the lock (default)

const dist = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// A living player inside the player-sized box at the spot blocks it.
function blocked(s: Spot, occupied: V3[]): boolean {
  return occupied.some(o =>
    Math.abs(o.x - s.x) <= 15 && Math.abs(o.y - s.y) <= 15 && o.z - s.z >= -24 && o.z - s.z <= 32);
}

// Rank usable spots by distance from the respawning player's own last position, furthest first,
// then pick uniformly among the top half of the ranking.
function pickSpawn(lastPos: V3, spots: Spot[], occupied: V3[], isBot: boolean, rnd: () => number): Spot | undefined {
  const usable = spots.filter(s => !(s.noBots && isBot) && !(s.noHumans && !isBot) && !blocked(s, occupied));
  if (usable.length === 0) return spots[0];                 // fallback: first spot, not checked for blocking
  const ranked = usable.map(s => ({ s, d: dist(s, lastPos) })).sort((a, b) => b.d - a.d);
  const half = Math.floor(usable.length / 2);               // integer half of the ranking
  return ranked[Math.floor(rnd() * half)]?.s;               // one index in [0, half)
}

// Death sets the lock; a respawn is accepted only after it.
function respawnTimeAtDeath(now: number): number { return now + RESPAWN_LOCK_MS; }

// Checked in the client think while dead (donor g_active.c 997-1012): after the lock, a forced respawn
// fires once the window has passed; before that, attack or use respawns the player.
function mayRespawn(now: number, respawnTime: number, buttonPressed: boolean): boolean {
  if (now <= respawnTime) return false;
  if (FORCE_RESPAWN_S > 0 && now - respawnTime > FORCE_RESPAWN_S * 1000) return true;
  return buttonPressed;
}

export { pickSpawn, respawnTimeAtDeath, mayRespawn };
export {};
