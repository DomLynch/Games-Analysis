// Licence: donor is GNU GPL v2 or later (gadget header). clean-room sketch of the pattern, not a translation of the donor lines.
type Team = number;
type Kind = 'guard' | 'repair' | 'movestate' | 'other';

interface Cmd {
  tag: number;
  kind: Kind;
  noTarget?: boolean;        // no target unit given
  areaRepair?: boolean;      // repair over an area, not a unit
  targetAllied?: boolean;    // target belongs to an allied team
  targetComplete?: boolean;  // target is finished building
  targetBuildStep?: boolean; // target spends resources when assisted
  moveRoam?: boolean;        // move state set to roam
}

interface Unit { id: number; team: Team; dead: boolean; canBuildStep: boolean; commands: Cmd[]; }

interface Sampler { seed: number; armed: boolean; }

// Same rules as the donor's builder allow-list, per command kind.
function allowedForBuilder(c: Cmd): boolean {
  if (c.kind === 'guard') return !c.targetAllied || (!!c.targetComplete && !c.targetBuildStep);
  if (c.kind === 'repair') return !!c.areaRepair || !!c.noTarget || !c.targetAllied || !!c.targetComplete;
  if (c.kind === 'movestate') return !c.moveRoam;
  return true;
}

// Synchronous filter at issue time. Units that cannot spend resources are never checked.
function allowCommand(u: Unit, c: Cmd): boolean {
  return u.canBuildStep ? allowedForBuilder(c) : true;
}

// Deferred sweep: each queued unit has every disallowed command removed, by tag, before the next frame's orders.
function sweep(queue: Set<number>, units: Map<number, Unit>): number[] {
  const removeTags: number[] = [];
  for (const id of Array.from(queue)) {
    queue.delete(id);
    const u = units.get(id);
    if (!u || u.dead) continue;
    for (const c of u.commands) if (!allowedForBuilder(c)) removeTags.push(c.tag);
  }
  return removeTags;
}

// Sampling: armed only on frames that are multiples of the seed. On the first unarmed frame after an armed one,
// the sampler disarms and draws a new seed from 1..119 (draw is the synced random source in the donor).
function sampleFrame(s: Sampler, frame: number, draw: (lo: number, hi: number) => number): boolean {
  if (frame % s.seed === 0) {
    s.armed = true;
    return true;
  }
  if (s.armed) {
    s.armed = false;
    s.seed = draw(1, 119);
  }
  return false;
}

// Build-step hook. It only runs while the sampler is armed (the donor registers the callin only then).
// A cross-team step on an unfinished unit is refused and the builder is queued for the sweep.
function allowBuildStep(
  s: Sampler, part: number, builderId: number, builderTeam: Team, unitTeam: Team, beingBuilt: boolean, queue: Set<number>
): boolean {
  if (!s.armed) return true;
  if (part > 0 && builderTeam !== unitTeam && beingBuilt) {
    queue.add(builderId);
    return false;
  }
  return true;
}

export {};
