// Licence: GPL-3.0 (donor, Mindustry). clean-room
// Sketch of a drill that yields the dominant resource under its footprint, with a warmup ramp
// and a remainder carry so fractional progress becomes whole items. Shape only, not a translation.
export {};

interface Ore {
  name: string;
  id: number;
  lowPriority: boolean;   // low-priority items lose ties to everything else
  hardness: number;
}

interface Node {
  tier: number;                       // ores with hardness above this are not mined
  drillTime: number;                  // base time per item, in frames (donor: 300)
  hardnessMultiplier: number;         // extra time per hardness point (donor: 50)
  itemMultiplier: Map<string, number>;// per-item speed multiplier (donor default: 1)
  progress: number;
  warmup: number;
  itemsHeld: number;
  itemCapacity: number;
}

// Donor order: not lowPriority beats lowPriority, then more footprint tiles, then the higher id.
function better(a: { ore: Ore; count: number }, b: { ore: Ore; count: number }): boolean {
  if (a.ore.lowPriority !== b.ore.lowPriority) return !a.ore.lowPriority;
  if (a.count !== b.count) return a.count > b.count;
  return a.ore.id > b.ore.id;
}

// Dominant ore under the footprint. One entry per footprint tile; null = nothing minable on that tile.
// Simplified: the donor also skips blocked items and static blocks; the caller passes only minable tiles here.
function dominant(tiles: Array<Ore | null>, tier: number): { ore: Ore; count: number } | null {
  const counts = new Map<string, { ore: Ore; count: number }>();
  for (const ore of tiles) {
    if (ore === null || ore.hardness > tier) continue;
    const c = counts.get(ore.name);
    if (c !== undefined) c.count += 1;
    else counts.set(ore.name, { ore, count: 1 });
  }
  let best: { ore: Ore; count: number } | null = null;
  for (const c of counts.values()) {
    if (best === null || better(c, best)) best = c;
  }
  return best;
}

// Time for one item of this ore, in frames: (base + multiplier * hardness) / item speed multiplier.
function drillDelay(n: Node, ore: Ore): number {
  return (n.drillTime + n.hardnessMultiplier * ore.hardness) / (n.itemMultiplier.get(ore.name) ?? 1);
}

// Move v toward target by at most maxStep (sketch stand-in for the donor's approachDelta).
function approachTo(v: number, target: number, maxStep: number): number {
  if (v < target) return Math.min(v + maxStep, target);
  return Math.max(v - maxStep, target);
}

// One update of one node. Returns the number of whole items emitted this step.
// speed = efficiency times the boost (1 when unboosted); dt = frame delta.
// Simplified: the donor does not clamp the emitted amount to the free capacity; the sketch does
// (and keeps the remainder), and the donor's offload() was not read.
function step(n: Node, ore: Ore, count: number, speed: number, dt: number, warmupSpeed: number): number {
  if (n.itemsHeld >= n.itemCapacity || count <= 0 || speed <= 0) {
    n.warmup = approachTo(n.warmup, 0, warmupSpeed * dt);   // cool down while blocked or unpowered
    return 0;
  }

  const delay = drillDelay(n, ore);
  n.warmup = approachTo(n.warmup, speed, warmupSpeed * dt);  // warmup updated before progress, as in the donor
  n.progress += dt * count * speed * n.warmup;

  if (n.progress < delay) return 0;

  let amount = Math.floor(n.progress / delay);
  amount = Math.min(amount, n.itemCapacity - n.itemsHeld);
  n.itemsHeld += amount;
  n.progress %= delay;                                        // remainder carries to the next item
  return amount;
}
