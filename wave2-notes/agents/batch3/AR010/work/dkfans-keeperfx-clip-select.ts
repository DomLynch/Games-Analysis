// Licence: GPL-2.0-or-later (donor headers; LICENSE file is version 2). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Clip = 'stand' | 'walk' | 'drag' | 'hitReact' | 'slapped' | 'roar' | 'sleep' | 'dropDead' | 'chickenStand' | 'chickenWalk';

export interface Body {
  sizeChanging: boolean;   // a size change is pending: no clip choice this tick
  chicken: boolean;        // chicken spell: overrides the other states
  hitReacting: boolean;    // frozen on hit, dying, or frozen by a spell
  slapped: boolean;
  roaring: boolean;
  unconscious: boolean;
  asleep: boolean;
  grounded: boolean;       // touching the floor
  dragged: boolean;
  moveDist: number;        // signed distance moved this tick (negative = moved backward)
}

export interface Pick { clip: Clip; speed: number; animateOnce: boolean; }

// Speeds are 8.8 fixed point: 256 = one frame per tick.
// Returns null when the donor would make no clip choice this tick.
export function pickClip(b: Body, walkDivisor: number, fixedSpeed: boolean): Pick | null {
  const distSpeed = Math.trunc((b.moveDist * 256) / (walkDivisor + 1));
  if (b.sizeChanging) return null;
  if (b.chicken) {
    if (b.moveDist === 0 || !b.grounded) return { clip: 'chickenStand', speed: 256, animateOnce: false };
    return { clip: 'chickenWalk', speed: fixedSpeed ? 256 : distSpeed, animateOnce: false };
  }
  if (b.hitReacting) return { clip: 'hitReact', speed: 256, animateOnce: false };
  if (b.slapped) return { clip: 'slapped', speed: 256, animateOnce: false };
  if (b.roaring) return { clip: 'roar', speed: 128, animateOnce: false };
  if (b.unconscious) return { clip: 'dropDead', speed: 64, animateOnce: true };
  if (b.asleep) return { clip: 'sleep', speed: 128, animateOnce: false };
  if (b.moveDist === 0) return { clip: 'stand', speed: walkDivisor, animateOnce: false };
  if (!b.grounded) return { clip: 'stand', speed: distSpeed, animateOnce: false };
  if (b.dragged) return { clip: 'drag', speed: distSpeed, animateOnce: false };
  if (fixedSpeed) return { clip: 'walk', speed: 256, animateOnce: false };
  return { clip: 'walk', speed: distSpeed, animateOnce: false };
}

export interface Anim { clip: Clip | null; frames: number; time: number; speed: number; animateOnce: boolean; }

// A clip change restarts the phase at frame 0; a speed-only change keeps the phase.
export function applyPick(a: Anim, p: Pick, framesOf: (c: Clip) => number): void {
  if (p.clip !== a.clip) {
    a.clip = p.clip;
    a.frames = framesOf(p.clip);
    a.time = 0;
  }
  a.speed = p.speed;
  a.animateOnce = p.animateOnce;
}

// One tick of playback. Returns the current frame index.
export function advance(a: Anim): number {
  if (a.speed !== 0 && a.frames !== 0) {
    a.time += a.speed;
    const cycle = a.frames * 256;
    while (a.time < 0) a.time += cycle;            // a backward walk wraps the cycle the other way
    if (a.time > cycle - 1) {
      if (a.animateOnce) { a.speed = 0; a.time = cycle - 1; }   // hold the last frame
      else a.time %= cycle;
    }
  }
  return a.time >> 8;
}

export {};
