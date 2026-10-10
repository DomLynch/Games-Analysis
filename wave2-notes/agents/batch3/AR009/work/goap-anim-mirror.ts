// Licence: Apache-2.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
type Facing = 1 | -1;

interface Actor {
  x: number;                 // position on the x axis (2D or side-on view)
  paused: boolean;           // set by the agent's pause flag
  moving: boolean;           // set by move events (see applyMoveEvent)
  targetX: number | null;    // null when there is no target
}

// What the presentation layer has pushed to the animator last time.
interface Clip {
  walking: boolean;          // the one animator bool
  facing: Facing;
  speed: 0 | 1;              // 0 freezes the clip
}

type MoveEvent =
  | { kind: "inRange" }
  | { kind: "targetChanged"; inRange: boolean; x: number }
  | { kind: "notInRange" }
  | { kind: "lost" };

// Move-layer events set the moving flag. Only these four transitions exist.
function applyMoveEvent(a: Actor, e: MoveEvent): void {
  switch (e.kind) {
    case "inRange": a.moving = false; break;
    case "targetChanged": a.moving = !e.inRange; a.targetX = e.x; break;
    case "notInRange": a.moving = true; break;
    case "lost": a.moving = false; a.targetX = null; break;
  }
}

// Movement step: frozen while paused; walks toward the target at 1 unit per second of dt.
function stepMove(a: Actor, targetX: number | null, dt: number): void {
  if (a.paused) return;
  if (!a.moving) return;
  if (targetX === null) return;
  const maxStep = dt * 1; // 1 unit/s
  const d = targetX - a.x;
  a.x += Math.abs(d) <= maxStep ? d : Math.sign(d) * maxStep;
}

// Presentation pass, run every frame. Each animator write happens only when the value changes.
function presentFrame(a: Actor, c: Clip): string[] {
  const changed: string[] = [];

  const speed: 0 | 1 = a.paused ? 0 : 1;
  if (c.speed !== speed) { c.speed = speed; changed.push("speed"); }

  if (c.walking !== a.moving) { c.walking = a.moving; changed.push("walking"); }

  // Facing is only updated while walking; with no target it faces right.
  if (c.walking) {
    const facing: Facing = a.targetX !== null && a.x > a.targetX ? -1 : 1;
    if (c.facing !== facing) { c.facing = facing; changed.push("facing"); }
  }
  return changed;
}

export {};
