// Licence: GPL-3.0-or-later (ScummVM header on the files; the HPL1 header has no licence text). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ClipState {
  active: boolean;
  time: number;          // clip time, caller's unit
  length: number;
  weight: number;        // 0..1 contribution of this clip to the pose
  fadeStep: number;      // +1/fadeTime while fading in, -1/fadeTime while fading out, 0 otherwise
  speed: number;         // set each frame from movement (see animSpeed)
  loop: boolean;
}

interface Bone { angle: number; trans: number; }             // scalar pose: one rotation angle and one offset per bone
interface TrackSample { angle: number; trans: number; }      // a bone's key value at a clip time

function isOver(s: ClipState): boolean {
  if (s.loop) return false;
  return s.time >= s.length;
}

// Fade start: weight changes by 1/|fadeTime| per unit of time.
function fadeIn(s: ClipState, fadeTime: number): void { s.fadeStep = 1 / Math.abs(fadeTime); }
function fadeOut(s: ClipState, fadeTime: number): void { s.fadeStep = -1 / Math.abs(fadeTime); }

// Advance a clip's time and fade by dt. Called after its bones have been written for this frame.
function advance(s: ClipState, dt: number): void {
  if (!s.active) return;
  s.time += dt * s.speed;
  if (s.loop) s.time = ((s.time % s.length) + s.length) % s.length;   // standard wrap, cMath::Wrap body not read
  else s.time = Math.min(Math.max(s.time, 0), s.length);

  if (s.fadeStep !== 0) {
    s.weight += s.fadeStep * dt;
    if (s.fadeStep < 0 && s.weight <= 0) { s.weight = 0; s.active = false; s.fadeStep = 0; }
    else if (s.fadeStep > 0 && s.weight >= 1) { s.weight = 1; s.fadeStep = 0; }
  }
}

// Switch to a new clip. Returns the clip that is now current.
function playAnim(prev: ClipState | null, next: ClipState, fadeTime: number, loop: boolean, syncPhase: boolean): ClipState {
  if (prev === next && next.active && !isOver(next)) return next;   // already playing: keep it running
  next.active = true;
  if (prev && prev !== next) {
    fadeOut(prev, fadeTime);
    if (next.fadeStep === 0) next.weight = 0;                       // start from nothing unless already fading
    fadeIn(next, fadeTime);
  } else {
    next.weight = 1;
  }
  next.loop = loop;
  if (syncPhase && prev) next.time = (prev.time / prev.length) * next.length;   // keep the phase of the old clip
  else next.time = 0;
  return next;
}

// Move-speed to clip-speed rule: fall back to turn speed (x2) below a small dead zone.
function animSpeed(fSpeed: number, fTurnSpeed: number, mul: number): number {
  return Math.abs(fSpeed) > 0.05 ? Math.abs(fSpeed) * mul : Math.abs(fTurnSpeed) * mul * 2;
}

// One frame: bones are reset, every active clip adds its weighted sample, then each clip advances.
// Sketch choice: the add is a scalar sum (exact when all clips rotate about one axis); the donor composes quaternions in order.
function tick(states: ClipState[], bones: Bone[], sampleAt: (s: ClipState, bone: number) => TrackSample, dt: number): void {
  for (const b of bones) { b.angle = 0; b.trans = 0; }
  for (const s of states) {
    if (!s.active) continue;
    for (let i = 0; i < bones.length; i++) {
      const v = sampleAt(s, i);
      bones[i].angle += v.angle * s.weight;     // donor: slerp(weight, identity, q) then add
      bones[i].trans += v.trans * s.weight;     // donor: translation scaled by weight, then add
    }
    advance(s, dt);                              // donor: Update runs after the tracks are applied
  }
}

export {};
