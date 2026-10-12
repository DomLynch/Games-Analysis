// Licence: GPL-2.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
export interface Voice {
  readonly key: string;
  readonly priority: number;
  alive(): boolean;
  setGain(g: number): void;
  stop(): void;
}

// null = no explicit policy: legacy once-per-tick gate. limit: hard cap. duck: gain shared out, max 0 = uncapped.
export type Policy = { mode: "limit" | "duck"; max: number } | null;

export class VoicePool {
  private slots: (Voice | null)[];
  private startedOnTick = new Map<string, number>();

  constructor(size: number) {
    this.slots = new Array<Voice | null>(size).fill(null);
  }

  private liveVoices(): Voice[] {
    const out: Voice[] = [];
    for (const v of this.slots) {
      if (v !== null && v.alive()) out.push(v);
    }
    return out;
  }

  private countKey(key: string): number {
    let n = 0;
    for (const v of this.liveVoices()) {
      if (v.key === key) n++;
    }
    return n;
  }

  // A free (or dead) slot wins first. Otherwise the lowest-priority live voice is the victim,
  // but only if it is strictly below the new sound's priority.
  private pickSlot(priority: number): { index: number; victim: Voice | null } {
    for (let i = 0; i < this.slots.length; i++) {
      const v = this.slots[i];
      if (v === null || !v.alive()) return { index: i, victim: null };
    }
    let index = -1;
    let low = Infinity;
    for (let i = 0; i < this.slots.length; i++) {
      const v = this.slots[i];
      if (v !== null && v.priority < low) {
        low = v.priority;
        index = i;
      }
    }
    if (index < 0 || low >= priority) return { index: -1, victim: null };
    return { index, victim: this.slots[index] };
  }

  // simplified: the donor kicks the victim BEFORE the backend starts the new sound and does not
  // check the backend result before kicking. This sketch starts first and kicks only on success.
  // It also omits the same-emitter restart path, the donor's distance cut-off, and the
  // Non3D/ambient emitter that always uses the highest priority.
  play(
    key: string,
    priority: number,
    base: number,
    policy: Policy,
    tick: number,
    start: (gain: number) => Voice | null,
  ): Voice | null {
    if (policy === null) {
      if (this.startedOnTick.get(key) === tick) return null; // legacy: one start per key per tick
    } else if (policy.max > 0 && this.countKey(key) >= policy.max) {
      return null; // limit cap (or duck with a cap)
    }
    const pick = this.pickSlot(priority);
    if (pick.index < 0) return null;
    const duck = policy !== null && policy.mode === "duck";
    const gain = duck ? base / Math.sqrt(this.countKey(key) + 1) : base;
    const voice = start(gain);
    if (voice === null) return null; // backend refused: nothing is kicked
    if (pick.victim !== null) pick.victim.stop();
    this.slots[pick.index] = voice;
    if (policy === null) this.startedOnTick.set(key, tick);
    if (duck) this.rebalance(key, base);
    return voice;
  }

  // Duck mode: every live voice of this key gets base / sqrt(count). Call again when one ends.
  rebalance(key: string, base: number): void {
    const same: Voice[] = [];
    for (const v of this.liveVoices()) {
      if (v.key === key) same.push(v);
    }
    const g = base / Math.sqrt(Math.max(1, same.length));
    for (const v of same) v.setGain(g);
  }
}

// Cells ordered nearest-first around the camera (donor: 11 x 11 spiral). The first owned cell with a bed wins.
export interface BedCell {
  owned: boolean;
  bed: string | null;
}

export function pickBed(nearestFirst: readonly BedCell[]): string | null {
  for (const c of nearestFirst) {
    if (c.owned && c.bed !== null) return c.bed;
  }
  return null;
}

// Frame-rate independent linear fade toward target. fadeMs is zone data. Donor has no fade (hard cut).
export function stepFade(gain: number, target: number, dtMs: number, fadeMs: number): number {
  if (fadeMs <= 0) return target;
  const step = dtMs / fadeMs;
  const d = target - gain;
  if (Math.abs(d) <= step) return target;
  return gain + Math.sign(d) * step;
}

export {};
