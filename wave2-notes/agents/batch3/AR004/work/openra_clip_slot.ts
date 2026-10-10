// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Tier = 0 | 1 | 2 | 3 | 4; // 0 undamaged, 1 light, 2 medium, 3 heavy, 4 critical

const SIM_STEP_MS = 40; // the fixed sim step the clip clock runs on
const DEFAULT_FRAME_MS = 40; // frame time when a clip has none of its own

interface Clip { name: string; frames: number; frameMs?: number; }
type Lookup = (name: string) => Clip | undefined;

// Worst damage variant that exists, else the base clip (worst tier checked first).
const TIER_PREFIXES: [Tier, string][] = [[4, "critical-"], [3, "damaged-"], [2, "scratched-"], [1, "scuffed-"]];
export function damageVariant(base: string, tier: Tier, has: (n: string) => boolean): string {
  for (const [need, prefix] of TIER_PREFIXES) {
    if (tier >= need && has(prefix + base)) return prefix + base;
  }
  return base;
}

// Death clip: first declared key that matches a damage type, then a random variant from its list (sim RNG).
export function deathClip(base: string, damageTypes: string[], table: Map<string, string[]>, simRandom: () => number): string | null {
  for (const [key, variants] of table) {
    if (damageTypes.includes(key)) return base + variants[Math.floor(simRandom() * variants.length)];
  }
  return null; // no matching type: no death clip
}

// Charge-driven pose: frame = lerp(0, frames, charge, maxCharge + 1) with integer division, as in the donor.
export function chargeFrame(frames: number, charge: number, maxCharge: number): number {
  return Math.trunc((frames * charge) / (maxCharge + 1));
}

// One clip slot. Loops by default; a one-shot runs to its last frame, holds it, then returns to the locomotion clip.
export class ClipSlot {
  private clip: Clip | null = null;
  private frame = 0;
  private toNextMs = 0; // accumulator: ms left before the next frame
  private oneShot = false;
  private done: (() => void) | null = null;
  private locomotion = "idle";

  constructor(private lookup: Lookup) {}

  private start(name: string, once: boolean, after: (() => void) | null): void {
    const c = this.lookup(name);
    if (!c) throw new Error(`missing clip ${name}`);
    this.clip = c;
    this.frame = 0;
    this.toNextMs = c.frameMs ?? DEFAULT_FRAME_MS;
    this.oneShot = once;
    this.done = after;
  }

  playLoop(name: string): void { this.start(name, false, null); }

  playOnce(name: string, after?: () => void): void { this.start(name, true, after ?? null); }

  // Locomotion changes do not interrupt a running one-shot; the new state applies when it ends.
  setLocomotion(name: string): void {
    this.locomotion = name;
    if (!this.oneShot) this.playLoop(name);
  }

  // Swap the clip, keep the frame index, and never stall the clock (donor ReplaceAnim behaviour).
  replace(name: string): void {
    const c = this.lookup(name);
    if (!c || !this.clip) return;
    this.clip = c;
    this.frame %= c.frames;
    this.toNextMs = Math.min(c.frameMs ?? DEFAULT_FRAME_MS, this.toNextMs);
  }

  // Call once per sim tick.
  tick(): void {
    if (!this.clip) return;
    this.toNextMs -= SIM_STEP_MS;
    while (this.toNextMs <= 0) {
      if (this.oneShot) {
        this.frame++;
        if (this.frame >= this.clip.frames) {
          this.frame = this.clip.frames - 1;
          const after = this.done;
          this.oneShot = false;
          this.done = null;
          this.playLoop(this.locomotion);
          after?.();
          return;
        }
      } else {
        this.frame = (this.frame + 1) % this.clip.frames;
      }
      this.toNextMs += this.clip.frameMs ?? DEFAULT_FRAME_MS;
    }
  }

  get currentFrame(): number { return this.frame; }
  get currentClip(): string | null { return this.clip?.name ?? null; }
}

// Idle timer: the interval is rolled on the sim RNG (replayable); the chosen idle clip uses a cosmetic RNG.
function rollInterval([lo, hi]: [number, number], rng: () => number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
export class IdleTimer {
  private left: number;
  constructor(
    private interval: [number, number],
    private clips: string[],
    private simRandom: () => number,
    private cosmeticRandom: () => number,
    private slot: ClipSlot,
  ) {
    this.left = rollInterval(interval, simRandom);
  }
  tick(): void {
    if (--this.left > 0) return;
    this.slot.playOnce(this.clips[Math.floor(this.cosmeticRandom() * this.clips.length)]);
    this.left = rollInterval(this.interval, this.simRandom);
  }
}

// Attack clip with a wind-up delay counted in ticks from preparation.
export class AttackCue {
  private left = 0;
  constructor(private clip: string, private delayTicks: number, private slot: ClipSlot) {}
  onPreparing(): void {
    if (this.delayTicks > 0) this.left = this.delayTicks;
    else this.slot.playOnce(this.clip);
  }
  tick(): void {
    if (this.delayTicks > 0 && --this.left === 0) this.slot.playOnce(this.clip);
  }
}
