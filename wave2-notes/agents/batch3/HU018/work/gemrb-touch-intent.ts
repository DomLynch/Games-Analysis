// Licence: GPL-2.0 (donor COPYING). Clean-room: written from the described mechanism, not a translation of the donor lines.
export type Gesture = { fingers: number; dTheta: number; dx: number; dy: number; pinch: number };
export type Intent =
  | { kind: "select-box" }
  | { kind: "pan"; dx: number; dy: number }
  | { kind: "rotate-formation" }
  | { kind: "swipe-up" }
  | { kind: "swipe-down" }
  | { kind: "ignore" };

export interface TouchState {
  latched: "rotate" | null; // set once a rotation passes the threshold; cleared on touch-up
}

// Donor value 0.2 with a TODO saying it is not tuned (units as SDL reports dTheta; not verified).
export const ROTATE_THRESHOLD = 0.2;
// Donor EventMgr.h mouseDragRadius = 10, screen pixels.
export const SWIPE_RADIUS = 10;

export function onTouchUp(s: TouchState): void {
  s.latched = null;
}

// One gesture event. The targeting flag swallows one- and two-finger input, as the donor does.
export function classify(s: TouchState, g: Gesture, targeting: boolean, selectedCount: number): Intent {
  if (g.fingers === 1) {
    return targeting ? { kind: "ignore" } : { kind: "select-box" };
  }
  if (g.fingers === 2) {
    // Fix (donor re-decides every event): rotation sticks for the rest of the touch.
    if (s.latched !== "rotate" && Math.abs(g.dTheta) > ROTATE_THRESHOLD) s.latched = "rotate";
    if (s.latched === "rotate") {
      return selectedCount > 1 ? { kind: "rotate-formation" } : { kind: "ignore" };
    }
    return { kind: "pan", dx: -g.dx, dy: -g.dy };
  }
  if (g.fingers === 3) {
    if (g.dy < -SWIPE_RADIUS) return { kind: "swipe-up" };
    if (g.dy > SWIPE_RADIUS) return { kind: "swipe-down" };
    return { kind: "ignore" };
  }
  return { kind: "ignore" };
}

// One finger landing on an actor shows that actor's head HP. Returns the actor id to show, if any.
export function touchDown(fingersDown: number, hoverActorId: number | null): number | null {
  return fingersDown === 1 ? hoverActorId : null;
}
export {};
