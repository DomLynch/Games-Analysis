// Licence: GPL-2.0-or-later (donor header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec3 = { x: number; y: number; z: number };

// Per-cue data (donor: one track entry with a volume 0-100 and an audible radius).
interface CueData {
  id: string;
  audibleRadius: number;   // world units; donor reads it per track
  volume: number;          // 0-100 scale, as in the donor data
  cooldownMs: number;      // 0 = no repeat cooldown
}

interface Voice {
  cue: string;
  pos: Vec3;
  volume: number;          // 0-1 (volume / 100)
  gain: number;            // last computed gain, 0-1
}

const MAX_SAME = 2;        // donor MAX_SAME_SAMPLES: refuse when the count of same-cue sources in radius exceeds this
const ATTENUATION = 0.0003; // donor ATTENUATION_FACTOR per world unit; gain reaches 0 at 1 / 0.0003 units

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz); // floats here: the donor's int math overflows for large offsets
}

function gainAt(d: number, volume: number): number {
  let g = (1 - d * ATTENUATION) * volume;
  if (g > 1) g = 1;
  if (g < 0) g = 0;
  return g;
}

class VoicePool {
  private voices: Voice[] = [];
  private lastPlayed = new Map<string, number>();

  constructor(private cues: Map<string, CueData>) {}

  // Drop policy: a refused cue is never queued and never evicts an older voice.
  tryPlay(cueId: string, pos: Vec3, listener: Vec3, now: number): boolean {
    const cue = this.cues.get(cueId);
    if (!cue) return false;

    // Optional repeat cooldown (donor: audio_PlayBuildFailedOnce).
    if (cue.cooldownMs > 0) {
      const last = this.lastPlayed.get(cueId);
      if (last !== undefined && now - last < cue.cooldownMs) return false;
    }

    // Voice cap: count same-cue sources already inside this cue's radius of the new source.
    let count = 0;
    for (const v of this.voices) {
      if (v.cue !== cueId) continue;
      if (dist(v.pos, pos) < cue.audibleRadius) {
        count++;
        if (count > MAX_SAME) return false;
      }
    }

    // Inaudible at the listener: do not add it (donor: gain == 0 returns false).
    const vol = cue.volume / 100;
    const gain = gainAt(dist(pos, listener), vol);
    if (gain === 0) return false;

    this.voices.push({ cue: cueId, pos, volume: vol, gain });
    this.lastPlayed.set(cueId, now);
    return true;
  }

  // Per frame: recompute gains and cull voices that reach zero (donor: sound_Update).
  update(listener: Vec3): void {
    this.voices = this.voices.filter(v => {
      v.gain = gainAt(dist(v.pos, listener), v.volume);
      return v.gain > 0;
    });
  }

  activeCount(): number {
    return this.voices.length;
  }
}

export {};
