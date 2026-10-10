// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Vec = { x: number; y: number; z: number };
interface Fighter { pos: Vec; radius: number; hp: number; dead: boolean }

const STOP_MARGIN_MAX = 10;  // stop inside range by min(10, range / 4)
const DRAW_FRACTION = 0.644; // impact point inside one swing cycle (donor Attack.js 155)

function dist2d(a: Vec, b: Vec): number { return Math.hypot(a.x - b.x, a.y - b.y); }

// Effective range adds both collision radii.
function inRange(src: Fighter, dst: Fighter, range: number): boolean {
  return dist2d(src.pos, dst.pos) <= range + src.radius + dst.radius;
}

function stopRadius(range: number): number {
  return Math.max(0, range - Math.min(STOP_MARGIN_MAX, range / 4));
}

interface Approach { src: Fighter; dst: Fighter; range: number; dueAt: number }

// Position report during an approach. The donor takes the reported position as given (see gaps).
// The approach ends at once when in range; otherwise the deadline may only move earlier.
function onReport(a: Approach, reported: Vec, now: number, runSpeed: number): "arrived" | "waiting" {
  a.src.pos = reported;
  if (inRange(a.src, a.dst, a.range)) return "arrived";
  const travelMs = Math.max(0, dist2d(a.src.pos, a.dst.pos) - stopRadius(a.range)) / runSpeed * 1000;
  const dueAt = now + travelMs;
  if (dueAt < a.dueAt) a.dueAt = dueAt; // older or duplicate reports cannot extend the deadline
  return "waiting";
}

interface SwingPlan { hitLanded: boolean; impactAt: number; nextSwingAt: number }

// Swing start: range checked again, hit rolled on the server, impact scheduled at the draw point.
function startSwing(src: Fighter, dst: Fighter, range: number, now: number, cycleMs: number,
                    hitChance: number, rng: () => number): SwingPlan | null {
  if (src.dead || dst.dead || !inRange(src, dst, range)) return null;
  return {
    hitLanded: rng() < hitChance,
    impactAt: now + cycleMs * DRAW_FRACTION,
    nextSwingAt: now + cycleMs,
  };
}

// Impact: the target may have died or walked out of range during the draw. Damage is applied only then.
function impact(src: Fighter, dst: Fighter, range: number, plan: SwingPlan, damage: number): number {
  if (dst.dead || !inRange(src, dst, range)) return 0;
  if (!plan.hitLanded || damage <= 0) return 0;
  dst.hp -= damage;
  if (dst.hp <= 0) dst.dead = true;
  return damage;
}

export {}
