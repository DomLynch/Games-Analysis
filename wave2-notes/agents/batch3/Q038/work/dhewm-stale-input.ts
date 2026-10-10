// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const FRAME_MS = 16;          // server frame step (donor USERCMD_MSEC, integer 1000 / 60)
const MAX_DUPLICATES = 25;    // repeats of a stale command before decay starts (donor MAX_USERCMD_DUPLICATION)
const MAX_CLAMP_MS = 100;     // elapsed time counted per clock update (donor UpdateTime clamp)

interface Cmd {
  move: number[];             // [forward, right, up] as small integers
  attack: boolean;
  frame: number;
  dup: number;                // how many frames this command has been repeated
}

class ServerInput {
  private last: Cmd = { move: [0, 0, 0], attack: false, frame: -1, dup: 0 };

  // A fresh command from the client resets its repeat count.
  receive(cmd: Cmd): void {
    this.last = { ...cmd, dup: 0 };
  }

  // Called once per server frame when no new command arrived for that frame.
  // Repeats the previous command; past the limit, drops the attack and halves big move axes.
  duplicate(frame: number): Cmd {
    const next: Cmd = { ...this.last, move: [...this.last.move], frame, dup: this.last.dup + 1 };
    if (next.dup > MAX_DUPLICATES) {
      next.attack = false;
      next.move = next.move.map(v => (Math.abs(v) > 2 ? v >> 1 : v));
    }
    this.last = next;
    return next;
  }
}

// Server clock: add elapsed time (clamped), then run one frame per FRAME_MS of residual. No cap per call.
class ServerClock {
  residual = 0;

  advance(elapsedMs: number, runFrame: () => void): number {
    this.residual += Math.min(Math.max(elapsedMs, 0), MAX_CLAMP_MS);
    let ran = 0;
    while (this.residual >= FRAME_MS) {
      runFrame();
      this.residual -= FRAME_MS;
      ran++;
    }
    return ran;
  }
}

export {};
