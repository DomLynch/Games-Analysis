// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface TargetFrameData {
  holdMs: number;      // how long the last target stays after aim leaves it
  fadeMs: number;      // the last part of the hold, over which the name fades out
  rangeUnits: number;  // longest aim distance that can pick a target (zone data)
  nameAlphaScale: number; // extra factor on the name's alpha
}

export interface TargetFrame {
  targetId: number | null;
  lastSeenMs: number | null; // null = never seen (the donor uses 0 here, which loses a sighting at time 0)
}

// Once per client frame, from the input/tick path, with whatever the aim ray hit (or null).
// A miss or an out-of-range hit keeps the old target and its timestamp, as the donor does.
export function updateTarget(
  frame: TargetFrame,
  aimedId: number | null,
  distance: number,
  nowMs: number,
  data: TargetFrameData,
): void {
  if (aimedId === null || distance > data.rangeUnits) return;
  frame.targetId = aimedId;
  frame.lastSeenMs = nowMs;
}

// Alpha of the name at nowMs: 0 = hidden, 1 = full. Only reads state; the draw path calls this.
export function targetAlpha(frame: TargetFrame, nowMs: number, data: TargetFrameData): number {
  if (frame.targetId === null || frame.lastSeenMs === null) return 0;
  const elapsed = nowMs - frame.lastSeenMs;
  if (elapsed >= data.holdMs) return 0;
  const left = data.holdMs - elapsed;
  const fade = left < data.fadeMs ? left / data.fadeMs : 1;
  return fade * data.nameAlphaScale;
}

// Target for an order or command. Uses the same hold window, so a command sent just after aim
// leaves the enemy still reaches that enemy. Returns -1 when no target is held.
export function commandTarget(frame: TargetFrame, nowMs: number, data: TargetFrameData): number {
  if (frame.targetId === null || frame.lastSeenMs === null) return -1;
  return nowMs - frame.lastSeenMs < data.holdMs ? frame.targetId : -1;
}

export {};
