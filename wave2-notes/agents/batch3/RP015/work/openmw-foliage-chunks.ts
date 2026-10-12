// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Plant { id: number; x: number; y: number; z: number; scale: number; yaw: number; model: string; }
export interface Box { min: [number, number, number]; max: [number, number, number]; }
export interface ChunkBatch { model: string; count: number; offsets: Float32Array; yaws: Float32Array; box: Box; }

// Deterministic thinning: keeps about `density` of the plants, evenly spread, no random numbers.
// One accumulator for the whole chunk (the donor resets it per cell).
export function thinChunk(plants: Plant[], density: number): Plant[] {
  if (density >= 1) return plants;
  if (density <= 0) return [];
  const sorted = [...plants].sort((a, b) => a.id - b.id); // stable order: the kept set must not depend on load order
  const kept: Plant[] = [];
  let acc = 0;
  for (const p of sorted) {
    acc += density;
    if (acc >= 1) { acc -= 1; kept.push(p); }
  }
  return kept;
}

// One chunk: thin, group by model (one draw per model), chunk-local positions, per-instance bounds with a sway margin.
export function buildChunk(
  plants: Plant[],
  origin: [number, number, number],
  density: number,
  modelRadius: Record<string, number>,
): ChunkBatch[] {
  const thinned = thinChunk(plants, density);
  const byModel = new Map<string, Plant[]>();
  for (const p of thinned) {
    const list = byModel.get(p.model);
    if (list) list.push(p); else byModel.set(p.model, [p]);
  }
  const batches: ChunkBatch[] = [];
  for (const [model, list] of byModel) {
    const offsets = new Float32Array(list.length * 4);
    const yaws = new Float32Array(list.length);
    const r0 = modelRadius[model] ?? 0;
    const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    list.forEach((p, i) => {
      // Chunk-local positions keep float32 precision far from the world origin.
      const local: [number, number, number] = [p.x - origin[0], p.y - origin[1], p.z - origin[2]];
      offsets[i * 4] = local[0];
      offsets[i * 4 + 1] = local[1];
      offsets[i * 4 + 2] = local[2];
      offsets[i * 4 + 3] = p.scale;
      yaws[i] = p.yaw;
      const r = r0 * p.scale * 1.1; // 10% margin for sway animation
      for (let a = 0; a < 3; a++) {
        box.min[a] = Math.min(box.min[a], local[a] - r);
        box.max[a] = Math.max(box.max[a], local[a] + r);
      }
    });
    batches.push({ model, count: list.length, offsets, yaws, box });
  }
  return batches;
}

// Chunk-level distance cull: draw the chunk only if the eye is within viewDistance of its box.
export function chunkInRange(box: Box, eye: [number, number, number], viewDistance: number): boolean {
  let d2 = 0;
  for (let a = 0; a < 3; a++) {
    const v = eye[a];
    const gap = v < box.min[a] ? box.min[a] - v : v > box.max[a] ? v - box.max[a] : 0;
    d2 += gap * gap;
  }
  return d2 <= viewDistance * viewDistance;
}

export {};
