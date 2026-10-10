// Licence: GPL-3.0 (donor, "version 3" as stated in the file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type ActionId = string;

interface ActionDef {
  clip: string;            // clip name shown while the action runs
  frames: number;          // clip length; the action ends when the frame index passes it
  contactFrame?: number;   // frame index that fires an event (donor: throw-up at frame 15)
  onFrame?: () => void;    // event hook for contactFrame
}

interface PeepState {
  action: ActionId;        // "idle", "walk" or an action name
  frame: number;           // frame index inside the current action clip
  walkFrame: number;       // walk-cycle index, advanced per movement step
  clip: string;            // clip whose frame is drawn
  nextClip: string | null; // deferred clip switch, applied when idle
}

const WALK = { clip: "walk", frames: 8 }; // walk cycle length (illustrative)

// One clip frame per update call. When the frame index passes the clip length the action ends and the peep returns to walk.
export function stepAction(p: PeepState, defs: Record<ActionId, ActionDef>): void {
  const def = defs[p.action];
  if (!def) return;
  p.frame++;
  if (p.frame >= def.frames) {
    p.action = "walk";
    p.frame = 0;
    p.clip = WALK.clip;
    return;
  }
  if (def.contactFrame !== undefined && p.frame === def.contactFrame) def.onFrame?.();
  p.clip = def.clip;
}

// Walk cycle advances only on a real movement step (donor: not at the destination tolerance).
export function stepWalk(p: PeepState, moved: boolean): void {
  if (!moved) return;
  p.walkFrame = (p.walkFrame + 1) % WALK.frames;
}

// Only idle or walking can be interrupted; any other action must run out first.
export function canInterrupt(p: PeepState): boolean {
  return p.action === "idle" || p.action === "walk";
}

export function requestAction(p: PeepState, action: ActionId, defs: Record<ActionId, ActionDef>): boolean {
  if (!canInterrupt(p) || !defs[action]) return false;
  p.action = action;
  p.frame = 0;
  p.clip = defs[action].clip;
  return true;
}

// Deferred clip switch: the next clip is applied only when the peep is not mid-action.
export function applyDeferredClip(p: PeepState): void {
  if (p.nextClip !== null && p.nextClip !== p.clip && canInterrupt(p)) p.clip = p.nextClip;
}

// Chance roll on the game RNG: a value of 0..65535 at or below the threshold (donor: low 16 bits of ScenarioRand).
export function rollChance(rng: () => number, threshold: number): boolean {
  return Math.floor(rng() * 65536) <= threshold;
}
