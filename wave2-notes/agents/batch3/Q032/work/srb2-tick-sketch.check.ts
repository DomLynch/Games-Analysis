// Licence: GPL-2.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor code.
export const TICRATE = 35;              // ticks per second (engine constant)
export const LAG_TICS_BEFORE_SKIP = 5;  // server: a stall longer than this makes one tic and forgets the rest

export interface Cmd { move: number; aim: number; received: boolean; }

// Fixed-step clock: wall time accumulates; each full step is one tick.
export class TickClock {
  private acc = 0;
  private lastSec: number;
  tick = 0;
  fraction = 0; // 0..1 into the next tick, for render interpolation

  constructor(nowSec: number, private rate: number = TICRATE) {
    this.lastSec = nowSec;
  }

  advance(nowSec: number): void {
    this.acc += nowSec - this.lastSec;
    this.lastSec = nowSec;
    const step = 1 / this.rate;
    while (this.acc >= step) {
      this.acc -= step;
      this.tick++;
    }
    this.fraction = this.acc / step;
  }
}

// One tic: a player whose input did not arrive repeats the previous tic's input, marked not received.
// A quit player gets zero movement but keeps the last aim.
export function makeTic(
  prev: Cmd[],
  inputFor: (player: number, k: number) => Cmd | undefined,
  quit: (player: number) => boolean,
  k: number
): Cmd[] {
  return prev.map((p, i) => {
    const got = inputFor(i, k);
    if (got !== undefined) return { ...got, received: true };
    if (quit(i)) return { move: 0, aim: p.aim, received: true };
    return { ...p, received: false };
  });
}

export class ServerTickLoop {
  private lastTick = 0;
  private prev: Cmd[];

  constructor(players: number) {
    this.prev = Array.from({ length: players }, () => ({ move: 0, aim: 0, received: false }));
  }

  // Produce the tics owed since the last update. A stall of more than 5 ticks makes one tic and forgets the lost time.
  update(
    nowTick: number,
    inputFor: (player: number, k: number) => Cmd | undefined,
    quit: (player: number) => boolean,
    run: (tic: Cmd[]) => void
  ): number {
    let lag = nowTick - this.lastTick;
    if (lag <= 0) return 0;
    if (lag > LAG_TICS_BEFORE_SKIP) lag = 1;
    this.lastTick = nowTick;
    for (let k = 0; k < lag; k++) {
      this.prev = makeTic(this.prev, inputFor, quit, k);
      run(this.prev);
    }
    return lag;
  }
}

export {};
