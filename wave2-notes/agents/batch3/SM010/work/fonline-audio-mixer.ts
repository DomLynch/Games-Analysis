// Licence: MIT (donor, Source/Client/AudioManager.h lines 11-13). Clean-room sketch written from the described mechanism.
export interface Voice {
  id: number;
  attenuation: number; // 0..1, set by the caller; can be rewritten while the voice plays
  pan: number;         // -1..1 balance
  isMusic: boolean;
  pos: number;         // frames already produced
  length: number;      // frames in the decoded clip
  repeatMs: number;    // 0 = play once
  nextPlayAt: number;  // wall-clock ms when a repeat restarts, 0 = none pending
}

export interface Mixer {
  nextId: number;
  voices: Voice[];     // no limit: the donor's list is unbounded
  soundVolume: number; // 0..100
  musicVolume: number; // 0..100
}

// Donor: a sound with attenuation <= 0 is culled before any read or decode; zero sound volume plays nothing.
export function playSound(m: Mixer, length: number, attenuation: number, pan: number): number {
  if (m.soundVolume === 0 || attenuation <= 0) return 0;
  m.nextId += 1;
  m.voices.push({ id: m.nextId, attenuation, pan, isMusic: false, pos: 0, length, repeatMs: 0, nextPlayAt: 0 });
  return m.nextId;
}

// Donor: one music slot. Starting music stops the old track first (a hard cut, no overlap).
export function playMusic(m: Mixer, length: number, repeatMs: number): number {
  m.voices = m.voices.filter((v) => !v.isMusic);
  m.nextId += 1;
  m.voices.push({ id: m.nextId, attenuation: 1, pan: 0, isMusic: true, pos: 0, length, repeatMs, nextPlayAt: 0 });
  return m.nextId;
}

// Donor: a live voice is re-positioned by its source; false once the voice has ended.
export function updateSound(m: Mixer, id: number, attenuation: number, pan: number): boolean {
  const v = m.voices.find((x) => x.id === id);
  if (!v) return false;
  v.attenuation = attenuation;
  v.pan = pan;
  return true;
}

// Donor: volume is the channel volume times attenuation, rounded.
export function volumeFor(v: Voice, m: Mixer): number {
  const base = v.isMusic ? m.musicVolume : m.soundVolume;
  return Math.round(base * v.attenuation);
}

// Donor: balance, not constant power. The near side keeps unity gain, the far side is lowered.
export function panGains(pan: number): { left: number; right: number } {
  return { left: pan > 0 ? 1 - pan : 1, right: pan < 0 ? 1 + pan : 1 };
}

// Donor: produce up to `frames` frames. After the clip ends, a repeating voice waits repeatMs (wall clock), then rewinds.
export function advance(v: Voice, frames: number, nowMs: number): number {
  if (v.pos < v.length) {
    const take = Math.min(frames, v.length - v.pos);
    v.pos += take;
    return take;
  }
  if (v.repeatMs > 0) {
    if (v.nextPlayAt === 0) {
      v.nextPlayAt = nowMs + (v.repeatMs > 1 ? v.repeatMs : 0);
    }
    if (nowMs >= v.nextPlayAt) {
      v.pos = 0;
      v.nextPlayAt = 0;
      return advance(v, frames, nowMs);
    }
  }
  return 0;
}

// Donor: a voice that has ended and does not repeat is dropped from the list.
export function dropEnded(m: Mixer): void {
  m.voices = m.voices.filter((v) => v.pos < v.length || v.repeatMs > 0);
}
