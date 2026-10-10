// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ClipData {
  frames: number[];   // frame ids of one animation type
  offsets: number[];  // per-frame x offset for the same frames (missing entries count as 0)
}

// Inclusive range, like the donor's Rand::Get(from, to).
export type Rng = (from: number, to: number) => number;

export class IdleScheduler {
  private queue: { frame: number; offset: number }[] = [];
  public frame = 0;
  public offset = 0;

  constructor(
    private readonly clips: Map<string, ClipData>,
    private readonly valid: string[],   // duplicates act as weights
    private readonly isFlyer: boolean,
    private readonly rng: Rng,
  ) {
    this.increment();
  }

  // Show the next frame. When the queue is empty, queue a new phrase picked from the valid list.
  increment(): void {
    if (this.queue.length === 0) {
      this.queuePhrase(this.valid[this.rng(0, this.valid.length - 1)]);
    }
    this.take();
  }

  // Back to the static pose.
  reset(): void {
    this.queue = [];
    this.pushClip('STATIC');
    this.take();
  }

  private take(): void {
    const next = this.queue.shift();
    if (next !== undefined) {
      this.frame = next.frame;
      this.offset = next.offset;
    }
  }

  private pushClip(name: string): void {
    const clip = this.clips.get(name);
    if (clip === undefined) return;
    for (let i = 0; i < clip.frames.length; i++) {
      this.queue.push({ frame: clip.frames[i], offset: clip.offsets[i] ?? 0 });
    }
  }

  private queuePhrase(move: string): void {
    if (move === 'STATIC') {
      const n = this.rng(10, 20);               // repeat the static clip 10 to 20 times
      for (let i = 0; i < n; i++) this.pushClip('STATIC');
    } else if (move === 'MOVING') {
      this.pushClip(this.isFlyer ? 'FLY_UP' : 'MOVE_START');
      const n = this.rng(3, 5);                 // 3 to 5 walk cycles
      for (let i = 0; i < n; i++) this.pushClip('MOVING');
      this.pushClip(this.isFlyer ? 'FLY_LAND' : 'MOVE_END');
    } else if (move === 'IDLE' || move === 'WNCE' || move === 'KILL') {
      this.pushClip(move);
    } else {
      this.pushClip(move);                      // attack: the strike, then its end part
      this.pushClip(move + '_END');
    }
    this.pushClip('STATIC');                    // every phrase ends on the static clip
  }
}

export {};
