// Pain compass, shape only (clean-room, Valve licence). World-space hits, projected onto the view each frame.
type Vec2 = { x: number; y: number };

// dir: unit vector from the player TO the attacker (world XY). dir null = on top of the player (all four sides).
export type Hit = { dir: Vec2 | null; strength: number };

export interface Compass { front: number; rear: number; left: number; right: number }

const ON_TOP_RADIUS = 50; // theirs: health.cpp:262 (donor uses 3D length; 2D here)
const SIDE_MIN = 0.3;     // theirs: health.cpp:270-288 sets at 0.3, draws only above 0.4 (308, 322, 336, 350); fixed: one value
const FADE_PER_S = 2;     // theirs: health.cpp:305 (frame delta * 2), linear to zero

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

// fix: a hit with no source is ignored (donor clears the compass on a zero vector, health.cpp:241-245)
export function addHit(hits: Hit[], attacker: Vec2 | null, player: Vec2): void {
  if (attacker === null) return;
  const dx = attacker.x - player.x;
  const dy = attacker.y - player.y;
  const len = Math.hypot(dx, dy);
  if (len <= ON_TOP_RADIUS) {
    hits.push({ dir: null, strength: 1 });
  } else {
    hits.push({ dir: { x: dx / len, y: dy / len }, strength: 1 });
  }
}

// fwd and right are the current view's unit vectors on the ground plane.
// fix: projected every frame, so an indicator turns with the player (donor stored four numbers once, at hit time).
export function compassFor(hits: Hit[], fwd: Vec2, right: Vec2): Compass {
  const c: Compass = { front: 0, rear: 0, left: 0, right: 0 };
  for (const h of hits) {
    if (h.dir === null) {
      c.front = Math.max(c.front, h.strength);
      c.rear = Math.max(c.rear, h.strength);
      c.left = Math.max(c.left, h.strength);
      c.right = Math.max(c.right, h.strength);
      continue;
    }
    const side = dot(h.dir, fwd);
    const across = dot(h.dir, right);
    if (side > SIDE_MIN) c.front = Math.max(c.front, side * h.strength);
    else if (-side > SIDE_MIN) c.rear = Math.max(c.rear, -side * h.strength);
    if (across > SIDE_MIN) c.right = Math.max(c.right, across * h.strength);
    else if (-across > SIDE_MIN) c.left = Math.max(c.left, -across * h.strength);
  }
  return c;
}

// Fade by frame delta. A hit is removed only at zero, so nothing snaps off at 0.4 (donor: health.cpp:320).
export function tick(hits: Hit[], dt: number): void {
  for (const h of hits) {
    h.strength = Math.max(0, h.strength - dt * FADE_PER_S);
  }
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i].strength === 0) hits.splice(i, 1);
  }
}

export {};
