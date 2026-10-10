// clean-room: written from the described mechanism, not a translation of the donor lines
// Time-scaled targets. t is game minutes; players is the number of active players.
export const ccWaveCount = (t: number): number => Math.min(20, Math.max(0, Math.round(t * 1.5)));
export const shipTarget = (t: number, players: number): number =>
  Math.max(2, Math.round(Math.min(1.5, t / 10) * players));
export const attackersPerShip = (t: number): number => Math.min(30, Math.round(t * 2));

// Refill as the donor's loop is written: spawns while alive < (target - alive).
export function refillAsWritten(alive: number, target: number, spawnOne: () => void): number {
  const toSpawn = target - alive;
  while (alive < toSpawn) { spawnOne(); alive += 1; }
  return alive;
}

// Refill to the target the donor's own comment describes: spawns while alive < target.
export function refillToTarget(alive: number, target: number, spawnOne: () => void): number {
  while (alive < target) { spawnOne(); alive += 1; }
  return alive;
}

// Respawn delay in milliseconds for a wave, given a uniform random number u in [0, 1).
export function respawnDelayMs(minMinutes: number, maxMinutes: number, u: number): number {
  return (minMinutes + (maxMinutes - minMinutes) * u) * 60 * 1000;
}

export {};
