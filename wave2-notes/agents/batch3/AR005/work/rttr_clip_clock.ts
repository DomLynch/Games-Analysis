// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One clock per clip: time in, frame index and a 0..1 part of the next frame out. Repeat modes and a finish call that either jumps or plays out.

type Repeat = "none" | "repeat" | "oscillate" | "oscillateOnce";
type Skip = "frames" | "time";
interface Pose { frame: number; part: number; }

class ClipClock {
  private frame = 0;
  private up = true;                  // counting up or down (oscillate)
  private last: number | null = null; // clock time (ms) at which the current frame was due
  repeat: Repeat;
  skip: Skip = "frames";

  constructor(private numFrames: number, private frameMs: number, repeat: Repeat) {
    this.repeat = repeat;
  }

  // Advance to clock time t (ms). Frames never run ahead of the clock.
  update(t: number): Pose {
    if (this.finished()) return this.report(0);                // donor never ticks a finished clip
    if (this.last === null) { this.last = t; this.frame = 0; this.up = true; return this.report(0); }
    const passed = t - this.last;
    if (passed < this.frameMs) return this.report(passed);      // next frame not due yet
    const steps = Math.floor(passed / this.frameMs);
    if (steps > 1 && this.skip === "time") {
      this.last += passed - this.frameMs + 1;                   // play one frame, drop the rest of the time
      this.advance();
    } else {
      this.last += steps * this.frameMs;                        // keep the remainder for the part
      const n = steps > 1 ? this.capSteps(steps) : 1;
      for (let i = 0; i < n; i++) this.advance();
    }
    return this.report(t - this.last);
  }

  // Immediate: jump to the end pose (or the start pose for ping-pong). Play-out: let the clip run to its end.
  finish(immediate: boolean): Pose {
    if (this.repeat === "repeat") this.repeat = "none";
    else if (this.repeat === "oscillate") this.repeat = "oscillateOnce";
    if (this.repeat === "oscillateOnce" && this.frame === 0) this.up = false;
    if (!immediate || this.finished()) return this.report(0);
    if (this.repeat === "none") this.frame = this.numFrames - 1;
    else { this.frame = 0; this.up = false; }
    return this.report(0);
  }

  finished(): boolean {
    if (this.repeat === "none") return this.isLast();
    if (this.repeat === "oscillateOnce") return !this.up && this.frame === 0;
    return false;
  }

  // Position across the whole clip, 0..1, for tweens that span the clip.
  fraction(part: number): number {
    return (this.frame + (this.up ? part : -part)) / (this.numFrames - 1);
  }

  private isLast(): boolean {
    return (this.up && this.frame + 1 >= this.numFrames) || (!this.up && this.frame === 0);
  }

  private report(rem: number): Pose {
    // Hold the last frame (no overshoot) unless the clip oscillates.
    const hold = this.isLast() && this.repeat !== "oscillate" && (this.repeat !== "oscillateOnce" || !this.up);
    return { frame: this.frame, part: hold ? 0 : rem / this.frameMs };
  }

  private capSteps(steps: number): number {
    switch (this.repeat) {
      case "none": return Math.min(steps, this.numFrames - 1 - this.frame);
      case "repeat": return steps % this.numFrames;
      case "oscillate": return steps % (this.numFrames * 2 - 2);
      case "oscillateOnce": return Math.min(steps, this.up ? this.numFrames * 2 - 2 - this.frame : this.frame);
    }
  }

  private advance(): void {
    this.frame += this.up ? 1 : -1;
    if (this.up && this.frame >= this.numFrames) this.frame = 0;   // plain repeat wraps
    if (this.repeat === "oscillate" && this.isLast()) this.up = !this.up;
    if (this.repeat === "oscillateOnce" && this.frame + 1 >= this.numFrames) this.up = !this.up;
  }
}

export {};
