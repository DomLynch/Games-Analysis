// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface PoseClip {
  poses: number[];  // pose ids, one per slot of the clip group
  ends: number[];   // running end time of each slot inside one cycle, seconds; ends[last] = cycle length
}

// Pose to show at client clock `clockS` for an actor whose fixed phase is `phaseS` (seconds).
export function poseAt(clip: PoseClip, clockS: number, phaseS: number): number {
  const n = clip.poses.length;
  if (n === 1) return clip.poses[0];
  const cycle = clip.ends[n - 1];
  const t = (clockS + phaseS) % cycle;    // wrap into one cycle
  let i = 0;
  while (i < n - 1 && clip.ends[i] <= t) i++;  // first slot whose end is after t; else the last slot
  return clip.poses[i];
}

// Per-actor phase, in seconds, added to the shared client clock once when the actor is created.
export function actorPhase(syncRandom: boolean, rng: () => number): number {
  return syncRandom ? rng() : 0;  // donor: (rand() & 0x7fff) / 0x7fff, so 0 to 1 inclusive
}

export {};
