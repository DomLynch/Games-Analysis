// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type Stance = "awake" | "ready" | "damage" | "attack" | "die" | "dead";

// Stance entered when a one-shot clip reaches its end (the donor sets these per stance).
const NEXT_AFTER_ONE_SHOT: Partial<Record<Stance, Stance>> = {
  damage: "ready",
  attack: "ready",
  die: "dead",
};

interface Clip {
  frameCount: number;
  fps: number;        // per clip; donor default 15
  once: boolean;      // one-shot: hold the last frame and report end
  frameIdx: number;
  endReached: boolean;
  frozen: boolean;    // game paused or time stopped
}

interface ClockState {
  startMs: number;
  lastMs: number;
  paused: boolean;
}

// Advance one clip from the render clock. Whole frames are caught up at once; the sub-frame remainder is dropped.
function advanceClip(c: Clip, clk: ClockState, nowMs: number): void {
  let t: number;
  if (c.frozen) {
    t = clk.lastMs;
    clk.paused = true;
  } else {
    t = nowMs;
    if (clk.paused) {            // resume: shift the start so the pause does not skip frames
      clk.paused = false;
      clk.startMs += t - clk.lastMs;
    }
    clk.lastMs = t;
  }

  const deltaMs = Math.floor(1000 / c.fps);
  if (t - clk.startMs >= deltaMs) {
    const inc = Math.floor((t - clk.startMs) / deltaMs);
    c.frameIdx += inc;
    clk.startMs = t;            // remainder dropped
  }
  if (c.frameIdx >= c.frameCount) {
    if (c.once) {
      c.frameIdx = c.frameCount - 1;
      c.endReached = true;
    } else {
      c.frameIdx %= c.frameCount;
      c.endReached = false;      // looping clips never report an end
    }
  }
}

interface Layer {
  clip: Clip;
  clk: ClockState;
}

interface Pose {
  layers: Layer[];            // layers[0] is the master clock (body)
  drawOrder: number[] | null; // per facing: which layer is drawn in which slot
}

// Master clock drives the pose; every other layer copies the master's frame position.
function advancePose(p: Pose, nowMs: number, immobile: boolean): number[] {
  const master = p.layers[0];
  if (!immobile) advanceClip(master.clip, master.clk, nowMs); // immobile: hold the current frame
  for (let i = 1; i < p.layers.length; i++) {
    const l = p.layers[i].clip;
    l.frameIdx = master.clip.frameIdx % l.frameCount;
    l.endReached = master.clip.endReached;
  }
  return p.drawOrder ?? p.layers.map((_, i) => i);
}

interface Actor {
  stance: Stance;
  immobile: boolean;
  reallyDied: boolean;
}

function setStance(a: Actor, next: Stance): void {
  // A dead actor cannot leave death for anything but the held dead pose.
  if ((a.stance === "die" || a.stance === "dead") && next !== "dead" && a.reallyDied) return;
  a.stance = next;
}

// Hit reaction: flinch unless immobile, already dead, or this hit kills.
function onHit(a: Actor, killingBlow: boolean): void {
  if (!a.immobile && !a.reallyDied && !killingBlow) setStance(a, "damage");
}

// Called when the one-shot clip ends. The donor also has idle and ready-to-awake branches (not in this sketch).
function onClipEnd(a: Actor): void {
  const next = NEXT_AFTER_ONE_SHOT[a.stance];
  if (next !== undefined) setStance(a, next);
}

// Attack release frame: frame 8 of a long clip, half the frame count of a short one.
function releaseFrame(frameCount: number): number {
  return frameCount > 8 ? 8 : Math.floor(frameCount / 2);
}

// Fires when the clock crosses the release frame in this step, not only when it lands on it.
// Assumes a one-shot clip (no wrap).
function crossedRelease(prevIdx: number, nowIdx: number, frameCount: number): boolean {
  const r = releaseFrame(frameCount);
  return prevIdx < r && nowIdx >= r;
}

export {};
