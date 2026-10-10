// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface HitData {
  hitFrame: number;     // frame index of the hit inside the attack clip (catalogue, per creature)
  totalFrames: number;  // frames in the attack clip (catalogue, per creature)
}

export interface Attacker {
  speed: number;
  paralysed: boolean;   // halves speed for timing
}

export interface AttackTimings {
  attackMs: number;     // full attack length; also the cooldown before the next attack
  windUpMs: number;     // time from attack start to the hit frame, never less than half the attack
  flightMs: number;     // projectile flight time from distance
}

const BASE_PROJECTILE_SPEED = 3;      // cells per second before the speed factor
const LATENCY_COMPENSATION_MS = 20;   // client only: the visual starts this much early

export function attackTimings(a: Attacker, hit: HitData, distanceCells: number): AttackTimings {
  const speed = a.paralysed ? a.speed / 2 : a.speed;
  const attackMs = 1000 / (0.4 + speed * 0.007);
  const windUpMs = Math.max(attackMs / 2, (attackMs * hit.hitFrame) / hit.totalFrames);
  const flightMs = (distanceCells * 1000) / (BASE_PROJECTILE_SPEED * (1 + speed / 100));
  return { attackMs, windUpMs, flightMs };
}

// Cooldown set when an attack starts; the next attack may start when it reaches zero.
export function cooldownAfterAttack(a: Attacker): number {
  const speed = a.paralysed ? a.speed / 2 : a.speed;
  return Math.round(1000 / (0.4 + speed * 0.007));
}

// Delayed hits. Each tick subtracts dt; a hit resolves once its delay is below zero,
// and only if the attacker can still attack at that moment.
export interface PendingHit {
  remainingMs: number;
  attackerCanAttack: () => boolean;
  resolve: () => void;
}

export class HitQueue {
  private items: PendingHit[] = [];

  push(hit: PendingHit): void {
    this.items.push(hit);
  }

  tick(dt: number): void {
    for (const h of this.items) h.remainingMs -= dt;
    const due = this.items.filter((h) => h.remainingMs < 0);
    this.items = this.items.filter((h) => h.remainingMs >= 0);
    for (const h of due) {
      if (h.attackerCanAttack()) h.resolve();
    }
  }

  get pending(): number {
    return this.items.length;
  }
}

// Client presentation: the attack clip is stretched so it lasts attackMs, given its own frame count.
export function attackClipTimeScale(hit: HitData, speed: number, fps = 36): number {
  return (hit.totalFrames * (0.4 + speed * 0.007)) / fps;
}

// Client presentation: the visual starts this long after the attack starts.
export function clientVisualDelayMs(windUpMs: number): number {
  return windUpMs - LATENCY_COMPENSATION_MS;
}
export {}
