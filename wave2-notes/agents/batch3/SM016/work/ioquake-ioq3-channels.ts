// Donor licence: GPL-2.0-or-later (per snd_dma.c header: "either version 2 of the License, or (at your option) any later version"). Clean-room sketch of the shape of the mechanism, not a translation of the donor lines.
// clean-room
export interface Vec2 { x: number; y: number; }
export interface Listener { id: number; pos: Vec2; facing: number; } // facing in radians

export interface Channel {
  sound: string | null;   // null = free
  entity: number;
  allocMs: number;
  announcer: boolean;
}

export class ChannelPool {
  readonly ch: Channel[];

  constructor(size: number, private readonly listenerId: number) {
    this.ch = Array.from({ length: size }, () => ({ sound: null, entity: -1, allocMs: 0, announcer: false }));
  }

  // Returns the channel index, or -1 when the sound is refused.
  // capPerSource: the most copies of one sound one source may have in play. Fix: the donor tests inplay > allowed (snd_dma.c:586),
  // so with allowed 4 it lets a 5th copy start; this sketch uses >= so the cap is a true cap (pass 4, or 8 for the listener).
  start(sound: string, entity: number, now: number, capPerSource: number, announcer = false): number {
    let inPlay = 0;
    for (const c of this.ch) {
      if (c.sound === sound && c.entity === entity) {
        if (now - c.allocMs < 50) return -1; // double start of the same sound from the same source
        inPlay++;
      }
    }
    if (inPlay >= capPerSource) return -1;

    let idx = this.ch.findIndex((c) => c.sound === null);
    if (idx < 0) {
      idx = this.steal(entity, now);
      if (idx < 0) return -1;
    }
    this.ch[idx] = { sound, entity, allocMs: now, announcer };
    return idx;
  }

  // Donor order: the oldest channel of the same source first, then the oldest of any source.
  // Fix: the player's own channels and announcer channels are never stolen. The donor's last
  // fallback can take the listener's channel, gated on channel 0 belonging to the listener.
  private steal(entity: number, now: number): number {
    let best = -1;
    let oldest = now;
    for (let i = 0; i < this.ch.length; i++) {
      const c = this.ch[i];
      if (c.entity === this.listenerId || c.announcer) continue;
      if (c.entity === entity && c.allocMs < oldest) {
        oldest = c.allocMs;
        best = i;
      }
    }
    if (best >= 0) return best;

    oldest = now;
    for (let i = 0; i < this.ch.length; i++) {
      const c = this.ch[i];
      if (c.entity === this.listenerId || c.announcer) continue;
      if (c.allocMs < oldest) {
        oldest = c.allocMs;
        best = i;
      }
    }
    return best; // -1: refuse the sound
  }
}

// Left and right gains from the side term; attenuation starts after a full-volume radius.
// simplified: the donor's left and right gain formulas are reproduced in shape; the sign of the side axis is this sketch's convention.
export function spatialize(origin: Vec2, l: Listener, master: number, fullRadius = 80, attenuate = 0.0008): { left: number; right: number } {
  const dx = origin.x - l.pos.x;
  const dy = origin.y - l.pos.y;
  const dist = Math.hypot(dx, dy);
  const falloff = Math.max(0, dist - fullRadius) * attenuate;

  const right = dx * Math.sin(l.facing) - dy * Math.cos(l.facing);
  const side = dist > 0 ? right / dist : 0;
  const rGain = Math.max(0, 0.5 * (1 + side));
  const lGain = Math.max(0, 0.5 * (1 - side));
  const scale = Math.max(0, 1 - falloff);

  return { left: Math.round(master * scale * lGain), right: Math.round(master * scale * rGain) };
}

export interface Loop {
  sound: string;
  origin: Vec2;
  kill: boolean;   // true: re-declared each frame (3D loop); false: stays until stopped
  frame: number;   // frame it was last declared
}

// Loops declared this frame are summed per sound into one voice, clamped at 255.
export function mergeLoops(loops: Loop[], l: Listener, frame: number): Map<string, { left: number; right: number }> {
  const out = new Map<string, { left: number; right: number }>();
  for (const loop of loops) {
    if (loop.kill && loop.frame !== frame) continue; // persistent loops (kill = false) stay live without re-declaring
    const master = loop.kill ? 127 : 90;
    const g = spatialize(loop.origin, l, master);
    const cur = out.get(loop.sound) ?? { left: 0, right: 0 };
    cur.left = Math.min(255, cur.left + g.left);
    cur.right = Math.min(255, cur.right + g.right);
    out.set(loop.sound, cur);
  }
  for (const [sound, v] of out) {
    if (v.left === 0 && v.right === 0) out.delete(sound);
  }
  return out;
}

export {};
