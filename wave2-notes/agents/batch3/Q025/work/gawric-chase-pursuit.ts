// Licence of donor: Apache-2.0 (root LICENSE). Clean-room sketch of the mechanism (shape only; not a line-by-line port).
// clean-room
interface Pos { x: number; z: number; }
interface Pursuit { targetId: string; stopDistance: number; done: boolean; }

function dist2(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// One fixed step. The target is re-read every step (live), not taken from a stored point.
// move() may be blocked (returns the same position); a step that does not move ends the chase.
function pursueStep(
  p: Pursuit,
  me: Pos,
  getTarget: (id: string) => Pos | null,
  move: (from: Pos, dir: Pos) => Pos,
): Pos {
  if (p.done) return me;
  const t = getTarget(p.targetId);
  if (t === null || dist2(me, t) < p.stopDistance) {
    p.done = true;           // arrived (or target gone): stop where we are
    return me;
  }
  const len = Math.hypot(t.x - me.x, t.z - me.z);
  if (len * len <= 0.0001) {
    return me;               // donor: squared length 0.0001 or less means no move and no finish (183)
  }
  const after = move(me, { x: (t.x - me.x) / len, z: (t.z - me.z) / len });
  if (after.x === me.x && after.z === me.z) {
    p.done = true;           // no progress this step: blocked
  }
  return after;
}

// Default stop distance when the server sends none (donor: 0.1).
function stopDistanceFrom(serverDistance: number | undefined): number {
  return serverDistance !== undefined && serverDistance > 0.01 ? serverDistance : 0.1;
}
export {};
