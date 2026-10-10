// Licence: clean-room sketch written from the mechanism in the donor note (donor is GPL-2.0-or-later; no donor lines copied).
// Numbers below are our sample values, not the donor's.

export type Ms = number;
export interface Frame<T> { duration: Ms; value: T; }
export interface Clip<T> { preRoll: Ms; frames: Frame<T>[]; cycles: boolean; } // preRoll: time of the first frame, negative = starts before impact
export interface Seg { from: number; to: number; ms: Ms; }                    // one piece of a per-frame parameter ramp

// 1) Clip choice: specificity score; any failed condition rejects the clip; best score wins; random tie-break.
export const MATCH_FAIL = -10;

export interface Ctx { event: string; hit: "miss" | "hit" | "kill"; facing: string; attackName: string; }
export interface Rule<T> {
  clip: Clip<T>;
  base: number;
  event?: string;
  hit?: Ctx["hit"];
  facing?: string[];
  attackName?: string;
  oneIn?: number;   // random gate: the clip is skipped with probability 1/oneIn
}

function score<T>(r: Rule<T>, c: Ctx, roll: (n: number) => number): number {
  let s = r.base;
  if (r.event !== undefined) { if (c.event !== r.event) return MATCH_FAIL; s++; }
  if (r.hit !== undefined) { if (c.hit !== r.hit) return MATCH_FAIL; s++; }
  if (r.facing !== undefined) { if (!r.facing.includes(c.facing)) return MATCH_FAIL; s++; }
  if (r.attackName !== undefined) { if (c.attackName !== r.attackName) return MATCH_FAIL; s++; }
  if (r.oneIn !== undefined && roll(r.oneIn) === 0) return MATCH_FAIL;
  return s;
}

export function choose<T>(rules: Rule<T>[], c: Ctx, roll: (n: number) => number): Rule<T> | null {
  let best = MATCH_FAIL;
  let options: Rule<T>[] = [];
  for (const r of rules) {
    const s = score(r, c, roll);
    if (s > MATCH_FAIL && s === best) options.push(r);
    else if (s > best) { best = s; options = [r]; }
  }
  if (best === MATCH_FAIL) return null;
  return options[roll(options.length)];
}

// 2) Timeline: an anchor on a clock, pause shifts the anchor, frames advance by time, cycles skip whole loops when far behind.
export class Timeline<T> {
  private anchor = 0;
  private pausedAt: number | null = null;
  private index = 0;
  private next = 0;
  private finished = false;
  private cycles = false;

  constructor(private readonly clip: Clip<T>) {}

  start(now: number, offset: Ms, cycles = false): void {
    this.cycles = cycles;
    this.index = 0;
    this.finished = false;
    this.pausedAt = null;
    this.anchor = now - offset; // elapsed starts at offset (for example -450 ms: impact is at elapsed 0)
    this.next = this.anchor + this.clip.preRoll + this.clip.frames[0].duration;
  }

  elapsed(now: number): Ms { return (this.pausedAt ?? now) - this.anchor; }

  pause(now: number): void { if (this.pausedAt === null) this.pausedAt = now; }

  resume(now: number): void {
    if (this.pausedAt === null) return;
    const d = now - this.pausedAt;
    this.anchor += d; // hitstop: the rest of the clip keeps its frame order, just later
    this.next += d;
    this.pausedAt = null;
  }

  private total(): Ms { return this.clip.frames.reduce((a, f) => a + f.duration, 0); }

  advance(now: number): void {
    if (this.pausedAt !== null || this.clip.frames.length === 0) return;
    const total = this.total();
    if (this.cycles && total > 0 && now > this.next + total) {
      this.next += Math.floor((now - this.next) / total) * total; // skip whole loops
    }
    while (now >= this.next) {
      const nextIndex = this.index + 1;
      if (!this.cycles && nextIndex === this.clip.frames.length) { this.finished = true; return; }
      this.index = nextIndex % this.clip.frames.length;
      this.next += this.clip.frames[this.index].duration;
    }
  }

  current(): T { return this.clip.frames[this.index].value; }
  isFinished(): boolean { return this.finished; }
}

// 3) A per-frame parameter (for example alpha 0 to 1 over 300 ms) as a piecewise-linear ramp.
export function rampAt(segs: Seg[], t: Ms): number {
  const total = segs.reduce((a, s) => a + s.ms, 0);
  const clamped = Math.min(Math.max(t, 0), total);
  let acc = 0;
  let i = 0;
  while (acc < clamped && i < segs.length) { acc += segs[i].ms; i++; }
  if (i !== 0) { i--; acc -= segs[i].ms; }
  const s = segs[i];
  if (!s) return 0;
  return s.ms > 0 ? s.from + ((clamped - acc) / s.ms) * (s.to - s.from) : s.to;
}

// 4) Cosmetic HP drain: the server already decided the damage; the display removes it in slices until the clip ends.
export function drainStep(damageLeft: number, clipEnd: Ms, elapsed: Ms, slice: Ms = 50): { remove: number; left: number } {
  let steps = Math.floor((clipEnd - elapsed) / slice);
  if (steps < 1) steps = 1;
  let remove = Math.floor(damageLeft / steps);
  if (remove < 1) remove = 1;
  return { remove, left: damageLeft - remove };
}

// 5) Shared clock: all clips start at the earliest preRoll, so the impact (elapsed 0) lines up across attacker and defender.
export function sharedStart(clips: Clip<unknown>[]): Ms {
  return Math.min(...clips.map((c) => c.preRoll));
}
