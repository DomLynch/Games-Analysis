// Licence: BSD-style (donor; full text not read). Sketch is our own code from the described mechanism.
interface SpawnPoint { at: number; wait?: boolean; spawn(): void }
interface Actor { x: number; alive: boolean }

export class Scroller {
  x = 0;
  pos = 0;
  waiting = false;
  goTimerMs = 0;
  next = 0;
  constructor(
    private screenW: number,
    private levelW: number,
    private points: SpawnPoint[],
    private speed = 1,
    private offsetX = 0,
    private groupMin = 0,
    private groupMax = 3,
  ) {}

  step(players: Actor[], enemies: number, nowMs: number): void {
    const alive = players.filter((p) => p.alive);
    if (alive.length === 0) return;
    while (enemies < this.groupMax && this.next < this.points.length && this.pos >= this.points[this.next].at) {
      const sp = this.points[this.next++];
      if (sp.wait) { this.waiting = true; this.goTimerMs = 0; } else { sp.spawn(); enemies++; }
    }
    if (this.waiting) {
      if (enemies === 0) { this.waiting = false; this.goTimerMs = nowMs + 3000; }
      return;
    }
    const lm = Math.min(...alive.map((p) => p.x));
    const rm = Math.max(...alive.map((p) => p.x));
    let to = rm - lm > this.screenW ? this.x : (lm + rm) / 2 - this.screenW / 2 + this.offsetX;
    to = Math.max(0, Math.min(this.levelW - this.screenW, to));
    if (to > this.x) this.x = Math.min(to, this.x + this.speed);
    this.pos = Math.floor(this.x);
  }
}

export {}
