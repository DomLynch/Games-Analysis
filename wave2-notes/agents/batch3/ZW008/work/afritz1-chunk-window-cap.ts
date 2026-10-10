// Licence: MIT (donor afritz1-OpenTESArena). Shape adapted; sketch written from the described mechanism.
type ChunkPos = { x: number; y: number };
type Spawn = { male: number; female: number };

// Square window of (2r+1)^2 chunks around the centre chunk (donor ChunkUtils isWithinActiveRange).
function inWindow(c: ChunkPos, centre: ChunkPos, radius: number): boolean {
  return Math.abs(c.x - centre.x) <= radius && Math.abs(c.y - centre.y) <= radius;
}

// Which loaded chunks fall outside the window (free), and which window cells are not loaded yet (load).
function diffWindow(active: ChunkPos[], centre: ChunkPos, radius: number): { load: ChunkPos[]; free: ChunkPos[] } {
  const free = active.filter((c) => !inWindow(c, centre, radius));
  const load: ChunkPos[] = [];
  for (let y = centre.y - radius; y <= centre.y + radius; y++) {
    for (let x = centre.x - radius; x <= centre.x + radius; x++) {
      if (!active.some((a) => a.x === x && a.y === y)) load.push({ x, y });
    }
  }
  return { load, free };
}

// Scene cap: 5/4 of (per-chunk max x loaded chunks), integer division as in the donor.
function sceneCitizenCap(loadedChunks: number, perChunk: number): number {
  return Math.floor((5 * perChunk * loadedChunks) / 4);
}

// One streaming step. Citizens in freed chunks are assumed already removed (citizensKept).
// Each new chunk fills toward the scene cap, at most perChunk, half male and the rest female.
function planStep(active: ChunkPos[], centre: ChunkPos, radius: number, citizensKept: number, perChunk: number) {
  const { load, free } = diffWindow(active, centre, radius);
  const keptChunks = active.length - free.length;
  let citizens = citizensKept;
  const perNewChunk: Spawn[] = [];
  load.forEach((_, i) => {
    const loadedSoFar = keptChunks + i + 1; // the new chunk counts itself, as the donor's spawnChunk() runs first
    const headroom = sceneCitizenCap(loadedSoFar, perChunk) - citizens;
    const target = Math.max(0, Math.min(headroom, perChunk));
    const male = Math.floor(target / 2);
    perNewChunk.push({ male, female: target - male });
    citizens += target; // assumes every planned citizen finds a voxel
  });
  return { free, load, perNewChunk };
}

const demo = planStep([{ x: 0, y: 0 }], { x: 1, y: 0 }, 1, 0, 30);
console.log(demo.free.length, demo.load.length, demo.perNewChunk);

export {};
