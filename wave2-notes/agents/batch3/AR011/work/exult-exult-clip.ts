// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Clip playback for one sprite clip, a swing's windup timing, and a short hit flash. Units: milliseconds.

type LoopMode = "loop" | "hold" | "random" | "timesynced";

interface ClipSpec {
  frames: number;       // frames in this clip (>= 1)
  frameMs: number;      // time each frame is shown (ms)
  mode: LoopMode;
  startChance: number;  // 0..1: chance that the first frame advances (1 = never holds)
  tailLoop: number;     // on wrap, replay only the last tailLoop frames (0 = whole clip)
}

class ClipPlayer {
  private pos = 0;

  constructor(private readonly spec: ClipSpec) {}

  // Call once per frameMs. Returns the frame index to show.
  tick(nowMs: number, rand: () => number): number {
    const s = this.spec;
    switch (s.mode) {
      case "timesynced":
        this.pos = Math.floor(nowMs / s.frameMs) % s.frames;
        break;
      case "hold":
        this.pos = Math.min(this.pos + 1, s.frames - 1);
        break;
      case "random":
        this.pos = Math.floor(rand() * s.frames);
        break;
      case "loop":
        if (this.pos !== 0 || rand() < s.startChance) {
          this.pos = (this.pos + 1) % s.frames;
          if (this.pos === 0 && s.tailLoop > 0 && s.tailLoop <= s.frames) {
            this.pos = s.frames - s.tailLoop;
          }
        }
        break;
    }
    return this.pos;
  }
}

type SwingStyle = "reach" | "raise" | "fastSwing" | "slowSwing";

// Pose frames shown for each swing style, one-handed weapon.
const SWING_POSES: Record<SwingStyle, number[]> = {
  reach: [3, 6],
  raise: [3, 4, 6],
  fastSwing: [3, 5, 6],
  slowSwing: [3, 4, 5, 6],
};

// Time from the start of a swing until the strike resolves. The poses play at frameMs each,
// then one more frame gap passes before the strike step runs. Hit time comes from the frame count,
// not from any pose.
function windupHitMs(style: SwingStyle, frameMs: number): number {
  return (SWING_POSES[style].length + 1) * frameMs;
}

const HIT_FLASH_MS = 200; // red outline on the hit actor after a hit (donor: Clear_hit at +200 ms)

function flashUntilMs(nowMs: number): number {
  return nowMs + HIT_FLASH_MS;
}
