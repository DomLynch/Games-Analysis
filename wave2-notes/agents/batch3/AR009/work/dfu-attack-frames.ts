// Licence: MIT (donor, Daggerfall Unity). Clean-room sketch of the mechanism, not a translation of the donor lines.
const HIT_MARK = -1;                 // frame index that marks the damage moment; it is never shown

interface AttackVariant { weight: number; frames: number[]; }   // weight in percent (a bucket width, not a threshold)
interface AttackDef { variants: AttackVariant[]; fallback: number[]; }

type Phase =
  | { kind: "idle" }
  | { kind: "attack"; frames: number[]; next: number };          // next = index of the next frame to read

interface Creature {
  phase: Phase;
  frame: number;                     // frame currently shown
  hitRaised: boolean;                // read by the attack component, which clears it
}

// Roll 1..100. Each variant takes its own bucket width in turn; the fallback takes what is left.
function pickVariant(def: AttackDef, roll: number): number[] {
  let r = roll;
  for (const v of def.variants) {
    if (r <= v.weight) return v.frames;
    r -= v.weight;
  }
  return def.fallback;
}

// Called once on entering the attack state. Shows the first frame; if that is the hit marker, raise it and show the next.
function beginAttack(c: Creature, def: AttackDef, roll: number): void {
  const frames = pickVariant(def, roll);
  c.phase = { kind: "attack", frames, next: 1 };
  c.frame = frames[0];
  if (c.frame === HIT_MARK) {
    c.hitRaised = true;
    if (c.phase.next < frames.length) c.frame = frames[c.phase.next++];
  }
}

// One animation tick. Returns "ended" when the sequence is used up; the caller then returns to idle.
function stepAttack(c: Creature): "playing" | "ended" {
  if (c.phase.kind !== "attack") return "ended";
  const p = c.phase;
  if (p.next >= p.frames.length) {
    c.phase = { kind: "idle" };
    return "ended";
  }
  c.frame = p.frames[p.next++];
  if (c.frame === HIT_MARK) {
    c.hitRaised = true;
    if (p.next < p.frames.length) c.frame = p.frames[p.next++];
  }
  return "playing";
}

// Playback rate: base fps divided by the speed divisor (at least 1), with a 4 fps floor when slowed.
// The donor divides ints, so the division truncates; the sketch keeps that.
function fpsFor(baseFps: number, permanentSpeed: number, liveSpeed: number): number {
  const speed = Math.max(liveSpeed, 8);
  const divisor = Math.max(1, Math.trunc(permanentSpeed / speed));
  let fps = Math.trunc(baseFps / divisor);
  if (divisor > 1 && fps < 4) fps = 4;
  return fps;
}

export {};
