// Licence: MIT (donor LICENSE, Lost City). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export interface ClipDef {
  priority: number; // 0 = yields to any later request in the same tick
}

export interface ClipCatalog {
  count: number;
  get(id: number): ClipDef | undefined;
}

export interface ActorClipState {
  clipId: number;     // -1 = none chosen this tick
  delayTicks: number; // -1 = none; client meaning of the delay not read
  protect: boolean;   // when true every request is refused, including the reset
}

const DEFAULT_PRIORITY = 5; // donor default for a clip with no priority opcode

// One request for this actor in the current tick. Returns true if it was kept.
export function requestClip(a: ActorClipState, cat: ClipCatalog, clipId: number, delay: number): boolean {
  if (a.protect) return false;             // protect refuses everything, even clipId -1
  if (clipId >= cat.count) return false;   // unknown clip id is ignored

  const current = a.clipId === -1 ? undefined : cat.get(a.clipId);
  let accept: boolean;
  if (clipId === -1 || current === undefined) {
    accept = true;                         // reset, or nothing chosen yet this tick
  } else {
    const next = cat.get(clipId) ?? { priority: DEFAULT_PRIORITY };
    // strictly higher priority replaces; equal priority keeps the first request;
    // a current clip with priority 0 can be replaced by anything.
    accept = next.priority > current.priority || current.priority === 0;
  }
  if (!accept) return false;

  a.clipId = clipId;
  a.delayTicks = delay;
  return true;
}

// Called once per tick when the actor's update is written to clients.
export function clipForTick(a: ActorClipState): { clipId: number; delay: number } | null {
  if (a.clipId === -1) return null;
  return { clipId: a.clipId, delay: a.delayTicks };
}

// Called in the tick cleanup phase: the arbiter is empty again for the next tick.
export function clearTick(a: ActorClipState): void {
  a.clipId = -1;
  a.delayTicks = -1;
}

export {};
