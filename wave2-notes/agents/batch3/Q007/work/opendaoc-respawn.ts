// Licence: GPL-3.0 (repo LICENSE file; README.md lines 41-42). Clean-room sketch of the mechanism, not a translation.
// clean-room
interface NpcSpec {
  storedMs: number;   // donor m_respawnInterval: >0 explicit ms, 0 random window, <0 no respawn
  level: number;
  realm: number;      // 0 = ordinary mob, non-zero = realm NPC
  named: boolean;     // donor: name is not all lowercase
}

interface RespawnRules {
  minMinutes: number; // donor: NPC_MIN_RESPAWN_INTERVAL, default 5
}

// Donor Util.Random(min, max): inclusive at both ends.
function randInt(min: number, max: number, rnd: () => number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

// Donor DB mapping: DB -1 means random (0 in memory); other DB values are seconds.
export function storedFromDb(dbSeconds: number): number {
  return dbSeconds === -1 ? 0 : dbSeconds * 1000;
}

// Respawn delay in ms. Same draw order as the donor: minutes first, then the named bonus, then the branch.
export function respawnDelayMs(npc: NpcSpec, rules: RespawnRules, rnd: () => number): number {
  if (npc.storedMs > 0 || npc.storedMs < 0) return npc.storedMs;   // explicit value (negative = no respawn)
  let minutes = randInt(rules.minMinutes, rules.minMinutes + 5, rnd);
  if (npc.named) minutes += 5;
  if (npc.level <= 65 && npc.realm === 0) return minutes * 60000;
  if (npc.realm !== 0) return randInt(5 * 60000, 10 * 60000, rnd);  // realm NPCs: flat 5 to 10 minutes
  const add = (npc.level - 65) + rules.minMinutes;                    // above 65: add a minute per level over 65
  return (minutes + add) * 60000;
}

// Death path: the body is removed first, then the timer starts. Returns the due time, or null for no respawn.
export function scheduleRespawn(npc: NpcSpec, now: number, rules: RespawnRules, rnd: () => number): number | null {
  const delay = respawnDelayMs(npc, rules, rnd);
  if (delay <= 0) return null;
  return now + delay;
}

export {};
