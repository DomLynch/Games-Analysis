// Licence: GPL v2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Phase = "orders" | "movement" | "combat" | "effects" | "advance";

interface Seat {
  id: string;
  isNpc: boolean;     // NPC brains are always awaited; humans are skipped after the deadline
  eliminated: boolean;
  ready: boolean;
  pending: unknown[]; // orders buffered for this step
}

class StepGate {
  expired = false;
  step = 0;
  private processing = false;
  constructor(
    private seats: Map<string, Seat>,
    private deadlineMs: number, // 0 = no timer
    private fixedInterval: boolean,
    private runPhase: (p: Phase, step: number) => void,
  ) {}

  // Intake: only the seat's own orders; marks it ready, then re-checks the gate.
  submit(seatId: string, orders: { seat: string }[]): boolean {
    const s = this.seats.get(seatId);
    if (!s || s.eliminated || this.processing) return false;
    if (orders.some((o) => o.seat !== seatId)) return false; // wrong-seat orders rejected whole
    s.pending = orders;
    s.ready = true;
    this.check();
    return true;
  }

  // Timer callback: flag expiry, then re-check (the timer never advances the step itself).
  onDeadline(): void {
    this.expired = true;
    this.check();
  }

  private allIn(): boolean {
    for (const s of this.seats.values()) {
      if (s.eliminated || s.ready) continue;
      if (!s.isNpc && this.expired) continue; // humans may be skipped after the deadline
      return false;                           // an unready NPC (or a human before expiry) blocks
    }
    return true;
  }

  check(): void {
    if (this.processing) return; // events during processing are dropped
    if (this.allIn() && (this.expired || !this.fixedInterval)) this.advance();
  }

  private advance(): void {
    this.processing = true;
    try {
      for (const p of ["orders", "movement", "combat", "effects", "advance"] as Phase[]) {
        this.runPhase(p, this.step);
      }
      this.step += 1;
      for (const s of this.seats.values()) { s.ready = false; s.pending = []; }
      this.expired = false;
    } finally {
      this.processing = false;
    }
  }
}
export {};
