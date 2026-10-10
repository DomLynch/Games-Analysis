// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface TickWorld {
  drainEvents(): void;            // synchronous intake: queued client messages reach their handlers
  stepPhysics(ticks: number): void;
  advanceClock(ticks: number): void;
}

export interface ServerTickConfig {
  physicsFps: number;             // 120 in the donor's data file, read as data
}

export class FixedStepLoop {
  private leftOver = 0;           // seconds not yet simulated, carried to the next pass
  private readonly dt: number;

  constructor(private readonly cfg: ServerTickConfig, private readonly world: TickWorld) {
    this.dt = 1 / cfg.physicsFps;
  }

  // elapsedSeconds is the real time since the last pass. It is NOT clamped:
  // after a stall the loop runs every missed step (catch-up).
  pump(elapsedSeconds: number): number {
    this.leftOver += elapsedSeconds;
    const steps = Math.trunc(this.leftOver * this.cfg.physicsFps);
    this.leftOver -= steps * this.dt;
    for (let i = 0; i < steps; i++) {
      this.world.drainEvents();   // intake first, so this tick's input is seen by the step
      this.world.stepPhysics(1);
      this.world.advanceClock(1);
    }
    return steps;
  }
}

export {};
