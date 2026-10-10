// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ClipDef {
  firstFrame: number;    // first frame index in the model's frame list
  numFrames: number;     // frames in the clip
  loopFrames: number;    // 0 = plays once and holds; else the last loopFrames frames repeat
  fps: number;           // from the clip table; per-frame time = 1000 / fps ms
}

export interface Clock {
  clip: ClipDef | null;
  frame: number;          // current frame index
  oldFrame: number;       // frame the blend starts from
  frameTime: number;      // ms: when `frame` should be exactly on screen
  oldFrameTime: number;   // ms: when `oldFrame` was exactly on screen
  animationTime: number;  // ms: when the new clip's first frame is exact
  backlerp: number;       // 0 = show `frame`; 1 = show `oldFrame`
}

export interface Pose { frame: number; oldFrame: number; backlerp: number; }

// Switching clip: the new clip's first frame is reached after one frame of delay.
export function startClip(c: Clock, clip: ClipDef): void {
  c.clip = clip;
  c.animationTime = c.frameTime + 1000 / clip.fps;
}

// One call per rendered frame. `now` is the server clock in ms.
export function advance(c: Clock, now: number, speedScale: number): Pose {
  const clip = c.clip;
  if (clip === null) throw new Error("no clip started");
  const frameLerp = 1000 / clip.fps;

  if (now >= c.frameTime) {
    // move at most one frame per call, scheduled from the previous frame time
    c.oldFrame = c.frame;
    c.oldFrameTime = c.frameTime;
    c.frameTime = now < c.animationTime ? c.animationTime : c.oldFrameTime + frameLerp;

    let f = Math.trunc((c.frameTime - c.animationTime) / frameLerp);
    f = Math.trunc(f * speedScale);

    const numFrames = clip.numFrames;
    if (f >= numFrames) {
      f -= numFrames;
      if (clip.loopFrames > 0) {
        f = (f % clip.loopFrames) + (numFrames - clip.loopFrames);
      } else {
        f = numFrames - 1;     // hold on the last frame
        c.frameTime = now;     // and let the next clip start at once
      }
    }
    c.frame = clip.firstFrame + f;

    if (now > c.frameTime) c.frameTime = now;   // catch-up: never schedule in the past
  }

  if (c.frameTime > now + 200) c.frameTime = now;   // guard: schedule ahead of now by >200 ms
  if (c.oldFrameTime > now) c.oldFrameTime = now;

  c.backlerp = c.frameTime === c.oldFrameTime
    ? 0
    : 1 - (now - c.oldFrameTime) / (c.frameTime - c.oldFrameTime);
  return { frame: c.frame, oldFrame: c.oldFrame, backlerp: c.backlerp };
}

export type Quat = [number, number, number, number];
export interface JointPose { t: [number, number, number]; r: Quat; }

// Shortest-path slerp, as in the donor's QuatSlerp; `f` is the weight on `b`.
function slerp(a: Quat, b: Quat, f: number): Quat {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = cos < 0 ? -1 : 1;
  cos = Math.abs(cos);
  const bb: Quat = [sign * b[0], sign * b[1], sign * b[2], sign * b[3]];
  let wa: number;
  let wb: number;
  if (cos < 0.999999) {
    const angle = Math.acos(cos);
    const s = Math.sin(angle);
    wa = Math.sin((1 - f) * angle) / s;
    wb = Math.sin(f * angle) / s;
  } else {
    wa = 1 - f;
    wb = f;
  }
  return [
    a[0] * wa + bb[0] * wb,
    a[1] * wa + bb[1] * wb,
    a[2] * wa + bb[2] * wb,
    a[3] * wa + bb[3] * wb,
  ];
}

// Blend one joint: `backlerp` weights the OLD pose, the rest the NEW pose.
export function blendJoint(oldP: JointPose, newP: JointPose, backlerp: number): JointPose {
  const lerp = 1 - backlerp;
  return {
    t: [
      oldP.t[0] * backlerp + newP.t[0] * lerp,
      oldP.t[1] * backlerp + newP.t[1] * lerp,
      oldP.t[2] * backlerp + newP.t[2] * lerp,
    ],
    r: slerp(oldP.r, newP.r, lerp),
  };
}

// Linear blend skinning for one point: sum of weight * (bone matrix applied to offset).
// mats[j] is a row-major 3x4 matrix as 12 numbers (row i = m[4i..4i+3]).
export interface Influence { joint: number; weight: number; offset: [number, number, number]; }
export function skinPoint(mats: number[][], infl: Influence[]): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (const w of infl) {
    const m = mats[w.joint];
    for (let i = 0; i < 3; i++) {
      out[i] += w.weight * (m[4 * i] * w.offset[0] + m[4 * i + 1] * w.offset[1] + m[4 * i + 2] * w.offset[2] + m[4 * i + 3]);
    }
  }
  return out;
}
export {}
