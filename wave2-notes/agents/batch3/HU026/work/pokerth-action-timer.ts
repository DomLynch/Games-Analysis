// Licence of donor: GNU AGPL-3.0-or-later. Clean-room sketch from the described mechanism, not a translation of the donor lines.
export class ActionTimer {
  private cued = false;

  constructor(
    private readonly timeoutS: number,   // window length supplied by the server
    private readonly graceS = 3,         // hold before the bar starts to move
    private readonly minTimeoutS = 4,    // shorter windows get no bar
  ) {}

  // elapsedMs: time since the window opened, measured on the client clock
  view(elapsedMs: number): { phase: "none" | "hold" | "drain" | "done"; fraction: number; playCue: boolean } {
    if (this.timeoutS < this.minTimeoutS) return { phase: "none", fraction: 0, playCue: false };
    const totalMs = this.timeoutS * 1000;
    const graceMs = this.graceS * 1000;
    if (elapsedMs >= totalMs) return { phase: "done", fraction: 0, playCue: false };
    if (elapsedMs < graceMs) return { phase: "hold", fraction: 1, playCue: false };
    const drained = (elapsedMs - graceMs) / (totalMs - graceMs);
    const fraction = Math.min(1, Math.max(0, 1 - drained)); // clamped: no overshoot past the track
    const playCue = !this.cued;                              // one cue, at the start of the drain
    this.cued = true;
    return { phase: "drain", fraction, playCue };
  }
}

export {};
