// Licence of donor: MIT (LICENSE). Clean-room sketch from the described mechanism; the donor's touch handlers are not translated.
type Mode = "none" | "armed" | "grab" | "pinch";

export class TouchArbiter {
  private mode: Mode = "none";
  private armedAt: { x: number; y: number } | null = null;

  // Called on each touchstart. fingers = number of fingers now down. tool = what a single touch does.
  start(fingers: number, x: number, y: number, tool: "place" | "grab"): { releaseGrab: boolean } {
    if (fingers >= 2) {
      // Two or more fingers is a camera gesture. A held node is released now, through the same
      // snap-and-overlap rule as a normal release, and a pending placement is cancelled.
      const releaseGrab = this.mode === "grab";
      this.armedAt = null;
      this.mode = "pinch";
      return { releaseGrab };
    }
    if (this.mode === "pinch") return { releaseGrab: false };
    this.mode = tool === "grab" ? "grab" : "armed";
    this.armedAt = tool === "place" ? { x, y } : null;
    return { releaseGrab: false };
  }

  // Called on each touchend. remaining = fingers still down after this lift.
  end(remaining: number): { placeAt?: { x: number; y: number }; snapGrab: boolean } {
    if (remaining > 0) return { snapGrab: false };
    const out: { placeAt?: { x: number; y: number }; snapGrab: boolean } = { snapGrab: this.mode === "grab" };
    if (this.mode === "armed" && this.armedAt) out.placeAt = this.armedAt;
    this.mode = "none";
    this.armedAt = null;
    return out;
  }
}

export {};
