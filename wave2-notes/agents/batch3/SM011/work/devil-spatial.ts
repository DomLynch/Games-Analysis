// Licence: Sustainable Use License 1.0 (donor; non-commercial use only). Clean-room: shape only, written from the described mechanism.
// Located sound: volume falls with distance and cuts off, pan follows the listener's right-hand offset, and one-instance-per-effect with a retrigger guard.

export interface Pt { x: number; z: number; } // distances in tiles (the donor's unit); the caller converts world metres

export const ATTENUATION_FLOOR = -6400;  // donor ATTENUATION_MIN, log units
export const PAN_LIMIT = 6400;           // donor PAN_MIN / PAN_MAX
export const VOLUME_PER_TILE = -64;      // donor: distance x -64
export const PAN_PER_TILE = 256;         // donor: offset x 256
export const RETRIGGER_MS = 80;          // donor snd_play_snd guard

export interface Located { volume: number; pan: number; }

// Donor CalculateSoundPosition: pan from the offset along the listener's right, volume from distance; no start at or below the floor.
export function locate(listener: Pt, source: Pt, right: Pt): Located | null {
  const dx = source.x - listener.x;
  const dz = source.z - listener.z;
  const side = dx * right.x + dz * right.z;           // offset along the listener's right (donor: dx - dy on the isometric grid)
  const dist = Math.hypot(dx, dz);                    // fix: exact distance (the donor's integer approximation is within about 5 percent)
  const volume = Math.round(dist * VOLUME_PER_TILE);
  if (volume <= ATTENUATION_FLOOR) return null;       // out of range: do not start the sound
  const pan = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, Math.round(side * PAN_PER_TILE)));
  return { volume, pan };
}

export interface Effect { lastStartMs: number; }

// Donor: a non-misc effect that is already playing is skipped; a restart inside the guard is skipped; a misc effect still sounding gets a duplicate voice.
// Fix: duplicates are capped at maxVoices (the donor has no cap).
export function gate(e: Effect, nowMs: number, activeVoices: number, misc: boolean, maxVoices: number): 'play' | 'duplicate' | 'skip' {
  if (activeVoices > 0 && !misc) return 'skip';
  if (nowMs - e.lastStartMs < RETRIGGER_MS) return 'skip';
  if (activeVoices >= maxVoices) return 'skip';
  e.lastStartMs = nowMs;
  return activeVoices > 0 ? 'duplicate' : 'play';
}

export {};
