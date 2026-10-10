// Licence: Apache-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec2 = { x: number; z: number }; // ground plane only (donor: Distance2D drops height)
type Pending = { objectId: number; target: Vec2 };
type Live = { pos: Vec2; dead: boolean };
type Band = "none" | "walk" | "snap";

// Donor numbers: 0.15f walk floor, _trigger = 3.743f walk-vs-snap (donor comment pairs it with 197 units)
const WALK_FLOOR = 0.15;
const SNAP_AT = 3.743;

function classify(current: Vec2, target: Vec2): Band {
  const d = Math.hypot(target.x - current.x, target.z - current.z);
  if (d > WALK_FLOOR && d < SNAP_AT) return "walk";
  if (d > SNAP_AT) return "snap";
  return "none"; // inside the floor, or exactly on the trigger: the donor does nothing
}

interface Actions {
  walk(objectId: number, to: Vec2): void; // donor: StartWalk (move the actor over)
  snap(objectId: number, to: Vec2): void; // donor: Jump (hide, ground-snap, show)
}

// One pass per frame. lookup returns undefined while the world is not ready (keep the entry),
// null or dead (drop it), otherwise classify, act, and drop it.
function drainCorrections(
  queue: Pending[],
  lookup: (objectId: number) => Live | null | undefined,
  act: Actions,
): Pending[] {
  const kept: Pending[] = [];
  for (const p of queue) {
    const e = lookup(p.objectId);
    if (e === undefined) { kept.push(p); continue; }
    if (e === null || e.dead) continue;
    const band = classify(e.pos, p.target);
    if (band === "walk") act.walk(p.objectId, p.target);
    else if (band === "snap") act.snap(p.objectId, p.target);
  }
  return kept;
}

export {};
