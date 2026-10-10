// Licence: GPL-3.0 (donor COPYING.txt). Clean-room sketch of the mechanism only: respawn gate and pickup respawn timer.
interface DeathState {
  minAt: number; // ms: the earliest moment an attack press may respawn the player
  maxAt: number; // ms: forced respawn moment, whatever the input
}

const RESPAWN_WINDOW_MS = 10000; // forced release this long after the minimum

// Armed at death. delayS is per-character data (donor: spawnArgs "respawn_delay").
function armRespawn(nowMs: number, delayS: number): DeathState {
  const minAt = nowMs + Math.trunc(delayS * 1000);
  return { minAt, maxAt: minAt + RESPAWN_WINDOW_MS };
}

// Checked every tick while dead. True when the player should respawn now.
function respawnDue(state: DeathState, nowMs: number, attackPressed: boolean): boolean {
  if (nowMs > state.minAt && attackPressed) return true;
  return nowMs > state.maxAt;
}

// Pickup respawn timer.
interface PickupDef { respawnS: number; dropped: boolean; noRespawn: boolean; }
type PickupAfter =
  | { kind: "respawn"; afterS: number }
  | { kind: "remove"; afterMs: number }
  | { kind: "keep" };

const MP_DEFAULT_RESPAWN_S = 20;

function pickupAfter(def: PickupDef, isMultiplayer: boolean): PickupAfter {
  let respawnS = def.respawnS;
  if (isMultiplayer && respawnS === 0) respawnS = MP_DEFAULT_RESPAWN_S;
  if (respawnS !== 0 && !def.dropped && !def.noRespawn) return { kind: "respawn", afterS: respawnS };
  if (!def.noRespawn) return { kind: "remove", afterMs: 5000 };
  return { kind: "keep" };
}

export {}
