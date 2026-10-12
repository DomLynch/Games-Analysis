// clean-room sketch from the described mechanism (donor is GPL-2.0-or-later; not a translation)
// Times in ms, angles in degrees, screen position in -1..1.
const DEFLECT_MS = 100; // donor: DAMAGE_DEFLECT_TIME
const RETURN_MS = 400;  // donor: DAMAGE_RETURN_TIME
const TOTAL_MS = DEFLECT_MS + RETURN_MS; // donor: DAMAGE_TIME = 500

export interface HitFeedback {
  pitchKick: number; // degrees at full strength
  rollKick: number;  // degrees at full strength
  blobX: number;     // -1..1, where the red blob sits on screen
  blobY: number;     // -1..1
  blobValue: number; // 5..10, used for the blob radius
  startMs: number;   // client time of the hit
}

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

// Kick from damage: scale 1 below 40 hp, 40 / hp above; then clamp to 5..10.
export function kickFor(damage: number, hp: number): number {
  const scale = hp < 40 ? 1 : 40 / hp;
  return Math.min(10, Math.max(5, damage * scale));
}

// front, left, up: dot products of the NEGATED attack direction with the view axes.
// centred: true for world damage (falls, slime), which has no direction.
export function makeFeedback(args: {
  damage: number; hp: number; startMs: number;
  centred: boolean; front: number; left: number; up: number;
}): HitFeedback {
  const kick = kickFor(args.damage, args.hp);
  if (args.centred) {
    return { pitchKick: -kick, rollKick: 0, blobX: 0, blobY: 0, blobValue: kick, startMs: args.startMs };
  }
  const dist = Math.max(0.1, Math.hypot(args.front, args.left));
  const front = Math.max(0.1, args.front);
  return {
    pitchKick: -kick * args.front, // raw front, as the donor (kick is set before its front clamp)
    rollKick: kick * args.left,
    blobX: clamp1(-args.left / front),
    blobY: clamp1(args.up / dist),
    blobValue: kick,
    startMs: args.startMs,
  };
}

// Triangle envelope: 0 to 1 over DEFLECT_MS, then 1 to 0 over RETURN_MS, 0 after that.
export function envelope(elapsedMs: number): number {
  if (elapsedMs < 0 || elapsedMs >= TOTAL_MS) return 0; // fix: donor kick branch has no t < 0 guard
  if (elapsedMs < DEFLECT_MS) return elapsedMs / DEFLECT_MS;
  return 1 - (elapsedMs - DEFLECT_MS) / RETURN_MS;
}

// View kick to add to the camera angles at nowMs (world camera only).
export function viewKick(f: HitFeedback, nowMs: number): { pitch: number; roll: number } {
  const e = envelope(nowMs - f.startMs);
  return { pitch: e * f.pitchKick, roll: e * f.rollKick };
}

// Blob alpha 200 * (1 - t / 500) for 0 < t < 500 (donor: returns when t <= 0 or t >= DAMAGE_TIME).
export function blobAlpha(f: HitFeedback, nowMs: number): number {
  const t = nowMs - f.startMs;
  if (t <= 0 || t >= TOTAL_MS) return 0;
  return 200 * (1 - t / TOTAL_MS);
}

export {};
