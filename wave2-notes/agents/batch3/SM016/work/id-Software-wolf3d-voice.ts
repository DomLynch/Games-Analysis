// Donor licence: restricted (id Software LIMITED USE SOFTWARE LICENSE AGREEMENT). Clean-room sketch of the shape of the mechanism, not a translation of the donor lines.
// clean-room
export type CueId = string;

export interface Cue {
  id: CueId;
  priority: number;      // higher wins; the donor reads it from the sound chunk header
  lengthMs: number;      // clip length; the voice is freed after it
  cooldownMs?: number;   // fix: same cue inside this window does not restart the voice
}

export interface Point { x: number; y: number; }

export interface Listener extends Point { facing: number; } // facing in radians

export interface Pan { left: number; right: number; }      // gains 0..1

interface Voice {
  cue: Cue;
  startedAt: number;     // ms
  source?: () => Point;  // live world point of a positioned cue (fix: a getter, so a moving source is re-read every frame)
}

// One slot per channel kind (the donor has one digitised slot and one synth slot).
export class VoiceSlot {
  private playing: Voice | null = null;
  private lastId: CueId | null = null;
  private lastStart = -Infinity;

  // A cue plays only if its priority is at least the priority of the voice now playing.
  // Equal priority replaces the voice, as the donor's "<" test does, unless the same cue
  // started inside its cooldown window.
  tryPlay(cue: Cue, now: number, source?: () => Point): boolean {
    this.release(now);
    if (this.playing) {
      if (cue.priority < this.playing.cue.priority) return false;
      if (cue.id === this.lastId && now - this.lastStart < (cue.cooldownMs ?? 0)) return false;
    }
    this.playing = { cue, startedAt: now, source };
    this.lastId = cue.id;
    this.lastStart = now;
    return true;
  }

  // The donor clears the priority when the last segment of the clip finishes.
  release(now: number): void {
    if (this.playing && now - this.playing.startedAt >= this.playing.cue.lengthMs) {
      this.playing = null;
    }
  }

  current(): Voice | null {
    return this.playing;
  }
}

// Equal-power pan from the listener's facing. Keeps the sign of the lateral term.
export function panFor(listener: Listener, src: Point): Pan {
  const dx = src.x - listener.x;
  const dy = src.y - listener.y;
  const dist = Math.hypot(dx, dy);
  const right = dx * Math.sin(listener.facing) - dy * Math.cos(listener.facing); // +ve = source on the right
  const side = dist > 0 ? Math.max(-1, Math.min(1, right / dist)) : 0;
  const atten = Math.max(0, 1 - dist / 15);  // 15 tiles, like the donor's ATABLEMAX
  const t = ((side + 1) / 2) * (Math.PI / 2);
  return { left: atten * Math.cos(t), right: atten * Math.sin(t) };
}

// Once per frame: re-pan the playing positioned voice from its stored source.
export function repan(slot: VoiceSlot, listener: Listener): Pan | null {
  const v = slot.current();
  if (!v || !v.source) return null;
  return panFor(listener, v.source());
}

export {};
