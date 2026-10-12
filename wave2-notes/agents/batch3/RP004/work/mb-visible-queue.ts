// Licence: Apache-2.0 (donor). Clean-room shape written from the described mechanism; not a line-by-line translation.
// clean-room
export interface Vec3 { x: number; y: number; z: number; }
export interface Box { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number; }
export interface Frustum { testBox(b: Box): boolean; }

export interface ChunkDraw {
  id: string;
  ready: boolean;
  dirty: boolean;
  centre: Vec3;
  bounds: Box;                                  // world-space bounds
  tris: { opaque: number; cutout: number; water: number };
  animated: boolean;
}

export interface Budgets {
  maxShadowCasters: number;   // counts accepted casters, not list slots
  maxCutout: number;          // 0 = unlimited; counts accepted cutout draws
  maxAnimated: number;        // the first N visible chunks get animated = true
}

export interface Queues {
  opaque: ChunkDraw[];        // nearest first
  cutout: ChunkDraw[];        // nearest first, capped
  water: ChunkDraw[];         // farthest first (blended)
  shadow: ChunkDraw[];        // nearest first, capped
}

function dist2(c: ChunkDraw, cam: Vec3): number {
  const dx = c.centre.x - cam.x;
  const dy = c.centre.y - cam.y;
  const dz = c.centre.z - cam.z;
  return dx * dx + dy * dy + dz * dz;
}

// The frustum is camera-relative, so the box is shifted by the camera position first.
function relativeBox(b: Box, cam: Vec3): Box {
  return {
    minX: b.minX - cam.x, minY: b.minY - cam.y, minZ: b.minZ - cam.z,
    maxX: b.maxX - cam.x, maxY: b.maxY - cam.y, maxZ: b.maxZ - cam.z,
  };
}

// One pass over the frame's list: sort nearest first, then accept. Caps count accepted draws, not list slots.
export function buildQueues(list: ChunkDraw[], cam: Vec3, view: Frustum,
                            inLightView: (c: ChunkDraw) => boolean, budgets: Budgets): Queues {
  const ordered = [...list].sort((p, q) => dist2(p, cam) - dist2(q, cam));
  const queues: Queues = { opaque: [], cutout: [], water: [], shadow: [] };
  let visible = 0;
  for (const c of ordered) {
    if (!c.ready) continue;
    if (c.tris.opaque > 0 && queues.shadow.length < budgets.maxShadowCasters && inLightView(c)) {
      queues.shadow.push(c);
    }
    if (!view.testBox(relativeBox(c.bounds, cam))) continue;
    visible += 1;
    c.animated = visible <= budgets.maxAnimated;
    if (c.tris.opaque > 0) queues.opaque.push(c);
    if (c.tris.cutout > 0 && (budgets.maxCutout === 0 || queues.cutout.length < budgets.maxCutout)) {
      queues.cutout.push(c);
    }
    if (c.tris.water > 0) queues.water.push(c);
  }
  queues.water.reverse();
  return queues;
}

export interface BuildState {
  inFlight: Set<string>;
  finished: { id: string; upload: () => void }[];   // filled when a background build completes
}

// Start a build for every dirty, ready chunk that is not already in flight, nearest first.
export function startBuilds(list: ChunkDraw[], cam: Vec3, state: BuildState, start: (c: ChunkDraw) => void): number {
  const dirty = list.filter((c) => c.ready && c.dirty).sort((p, q) => dist2(p, cam) - dist2(q, cam));
  let started = 0;
  for (const c of dirty) {
    if (state.inFlight.has(c.id)) continue;
    state.inFlight.add(c.id);
    c.dirty = false;
    start(c);
    started += 1;
  }
  return started;
}

// At most maxUploadsPerFrame GPU uploads per frame; the rest wait for the next frame.
export function drainUploads(state: BuildState, maxUploadsPerFrame: number): number {
  let n = 0;
  while (n < maxUploadsPerFrame && state.finished.length > 0) {
    const done = state.finished.shift();
    if (done === undefined) break;
    done.upload();
    state.inFlight.delete(done.id);
    n += 1;
  }
  return n;
}

// Donor delay(): the LOD centre stays one unit short of the target on the side it came from.
export function lodCentreStep(prev: number, target: number): number {
  if (prev < target) return target - 1;
  if (prev === target) return target;
  return target + 1;
}

export {};
