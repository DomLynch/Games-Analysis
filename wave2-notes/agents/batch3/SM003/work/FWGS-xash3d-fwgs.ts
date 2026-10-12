// Licence: GPL-3.0-or-later (donor header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Ambience beds: a fixed number of looping slots. Each slot's gain ramps toward the target for the listener's zone.
export const AMBIENT_SLOTS = 4;
export const LEVEL_MAX = 255; // zone levels and the master level are 0..255 (byte-like)

export interface BedSlot {
  sfx: string | null; // loop name for this slot, null = unused
  gain: number;       // current gain 0..1, kept as a float (never rounded)
}

export interface Zone {
  bedLevels: readonly number[]; // length AMBIENT_SLOTS, each 0..255 (zone data)
}

// One client frame. dt is wall-clock seconds for this frame. fadePerSec is in level units per second (0..255 scale).
export function stepBeds(
  slots: BedSlot[],
  zone: Zone | null,
  masterVolume: number,
  fadePerSec: number,
  dt: number,
): void {
  for (let i = 0; i < AMBIENT_SLOTS; i++) {
    const slot = slots[i];
    if (!slot.sfx) {
      slot.gain = 0;
      continue;
    }
    const level = zone ? zone.bedLevels[i] : 0;
    const target = Math.min(1, Math.max(0, (masterVolume * level) / LEVEL_MAX));
    // Fractional step: a slow fade never rounds to zero, so it always reaches its target.
    const step = (fadePerSec * dt) / LEVEL_MAX;
    if (slot.gain < target) slot.gain = Math.min(target, slot.gain + step);
    else if (slot.gain > target) slot.gain = Math.max(target, slot.gain - step);
  }
}

// Voice pool: pick a voice for a new sound.
export interface Voice {
  owner: number;     // entity id that made the sound
  channel: number;   // sound channel on that entity
  rate: number;      // sample rate in Hz (donor keeps 11025, 22050, 44100 native)
  samples: number;   // total samples in the clip
  pos: number;       // samples already played
  playing: boolean;
  stream: boolean;   // long streamed sounds (music, speech) are never stolen
  isPlayer: boolean; // the local player's own sounds
}

// Time left in seconds, so clips at different sample rates compare fairly.
export function secondsLeft(v: Voice): number {
  if (!v.playing) return 0;
  return Math.max(0, (v.samples - v.pos) / v.rate);
}

// Returns the voice index to use, or -1 when every voice in range is protected.
export function pickVoice(
  voices: Voice[],
  start: number,
  end: number,
  owner: number,
  channel: number,
  autoChannel: boolean,
  incomingIsPlayer: boolean,
): number {
  let best = -1;
  let bestLeft = Number.POSITIVE_INFINITY;
  for (let i = start; i < end; i++) {
    const v = voices[i];
    if (v.playing && v.stream) continue; // never steal a stream
    if (!autoChannel && v.owner === owner && (v.channel === channel || channel === -1)) return i; // same owner and channel: override
    if (v.playing && v.isPlayer && !incomingIsPlayer) continue; // non-player sounds never steal player sounds
    const left = secondsLeft(v);
    if (left < bestLeft) {
      bestLeft = left;
      best = i;
    }
  }
  return best;
}

export {};
