// clean-room sketch: box-vs-frustum classification, chunk-level entity culling, and a nearest-first light cap.
// Written from the mechanism in afritz1/OpenTESArena (MIT). Not a translation of the donor.
type Vec3 = [number, number, number];
interface Box { min: Vec3; max: Vec3 }
interface Plane { n: Vec3; d: number } // inside when dot(n, p) + d >= 0
interface Camera { eye: Vec3; planes: Plane[] } // forward plus four side planes, all through the eye
type Vis = "visible" | "partial" | "hidden";
interface Entity { id: number; pos: Vec3; box: Box }
interface Entry { id: number; pos: Vec3 }
interface Light { id: number; pos: Vec3; radius: number }

const MAX_LIGHTS = 256; // donor RenderLightManager.h 40

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function dist2(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function dist2XZ(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return dx * dx + dz * dz;
}

function corners(b: Box): Vec3[] {
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  return [
    [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
  ];
}

function unionBox(boxes: Box[]): Box {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], b.min[i]);
      max[i] = Math.max(max[i], b.max[i]);
    }
  }
  return { min, max };
}

// Donor RendererUtils.cpp 166-226: a box is hidden if all 8 corners are outside one plane,
// visible if all 8 are inside every plane, otherwise partial.
function classify(b: Box, cam: Camera): Vis {
  const cs = corners(b);
  let allInside = true;
  for (const p of cam.planes) {
    let inside = 0;
    for (const c of cs) {
      if (dot(p.n, c) + p.d >= 0) inside++;
    }
    if (inside === 0) return "hidden";
    if (inside < cs.length) allInside = false;
  }
  return allInside ? "visible" : "partial";
}

// Chunk-level test first (donor EntityVisibilityChunk.cpp 25-100). A hidden chunk returns nothing,
// a visible chunk returns every entity with no per-entity test, a partial chunk tests each entity.
// simplified: the donor sorts inside each chunk here; drawOrder below sorts across chunks once.
// simplified: maxDist is an addition. The donor has no distance cap (its planes are sides and a forward plane only).
function chunkEntries(entities: Entity[], cam: Camera, maxDist: number): Entry[] {
  if (entities.length === 0) return [];
  const chunkBox = unionBox(entities.map((e) => e.box));
  const cv = classify(chunkBox, cam);
  if (cv === "hidden") return [];

  const kept = cv === "visible" ? entities : entities.filter((e) => classify(e.box, cam) !== "hidden");
  const limit = maxDist * maxDist;
  return kept
    .filter((e) => dist2XZ(e.pos, cam.eye) <= limit)
    .map((e) => ({ id: e.id, pos: e.pos }));
}

// fix: one far-to-near sort over every chunk's entries. The donor draws chunks in grid order
// (ChunkManager.cpp 106-119) and does not re-sort the draw calls (RenderDrawCommand.cpp 22-37).
function drawOrder(chunks: Entity[][], cam: Camera, maxDist: number): Entry[] {
  const all: Entry[] = [];
  for (const chunk of chunks) {
    for (const e of chunkEntries(chunk, cam, maxDist)) all.push(e);
  }
  return all.sort((a, b) => dist2XZ(b.pos, cam.eye) - dist2XZ(a.pos, cam.eye));
}

// Donor RenderLightManager.cpp 122-188: the player light first (no test), each entity light
// whose box is not hidden, then nearest first, then the cap.
// simplified: the donor builds its light box with BoundingBox3D::init (centring not read); this sketch centres a cube of side 2 x radius on the light.
// simplified: ties at distance 0 are not ordered by std::sort in the donor; the player light is placed first here.
function selectLights(player: Light | null, entityLights: Light[], cam: Camera): Light[] {
  const out: Light[] = [];
  if (player) out.push(player);

  for (const l of entityLights) {
    const r = l.radius;
    const box: Box = {
      min: [l.pos[0] - r, l.pos[1] - r, l.pos[2] - r],
      max: [l.pos[0] + r, l.pos[1] + r, l.pos[2] + r],
    };
    if (classify(box, cam) !== "hidden") out.push(l);
  }

  out.sort((a, b) => dist2(a.pos, cam.eye) - dist2(b.pos, cam.eye));
  return out.slice(0, MAX_LIGHTS);
}

export {};
