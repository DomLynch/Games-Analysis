export {};

// clean-room sketch: cull in two stages (cheap sphere first, exact box second), then sort the
// survivors by definition, texture, then static uniforms, and rebind state only on change.
type Vec3 = { x: number; y: number; z: number };
type Sphere = { c: Vec3; r: number };
type Box = { min: Vec3; max: Vec3 };
type Plane = { n: Vec3; d: number }; // inside when n.p + d >= 0
type Frustum = { planes: Plane[] };

interface Model {
  id: number;
  defId: number;       // one shared mesh per model definition
  texId: number;       // diffuse texture
  uniformKey: string;  // static uniforms, as a comparable key
  visible: boolean;    // gameplay visibility (line of sight), client-side
  sphere: Sphere;      // stage 1 bound (swept bounds in the donor)
  worldBox: () => Box; // stage 2 bound, computed lazily after stage 1 passes
}

function sphereVisible(f: Frustum, s: Sphere): boolean {
  for (const p of f.planes) {
    const dist = p.n.x * s.c.x + p.n.y * s.c.y + p.n.z * s.c.z + p.d;
    if (dist < -s.r) return false; // whole sphere is behind this plane
  }
  return true;
}

function boxVisible(f: Frustum, b: Box): boolean {
  for (const p of f.planes) {
    // farthest corner along the plane normal
    const x = p.n.x > 0 ? b.max.x : b.min.x;
    const y = p.n.y > 0 ? b.max.y : b.min.y;
    const z = p.n.z > 0 ? b.max.z : b.min.z;
    if (p.n.x * x + p.n.y * y + p.n.z * z + p.d < 0) return false;
  }
  return true;
}

interface Sink {
  setDef(defId: number): void;
  setTexture(texId: number): void;
  setUniforms(key: string): void;
  drawModel(m: Model): void;
}

interface SubmitStats { draws: number; defBinds: number; texBinds: number; uniBinds: number; culledStage1: number; culledStage2: number }

function submit(models: Model[], f: Frustum, sink: Sink): SubmitStats {
  const stats: SubmitStats = { draws: 0, defBinds: 0, texBinds: 0, uniBinds: 0, culledStage1: 0, culledStage2: 0 };
  const survivors: Model[] = [];
  for (const m of models) {
    if (!m.visible) continue;
    if (!sphereVisible(f, m.sphere)) { stats.culledStage1++; continue; }
    if (!boxVisible(f, m.worldBox())) { stats.culledStage2++; continue; }
    survivors.push(m);
  }
  survivors.sort((a, b) =>
    a.defId - b.defId ||
    a.texId - b.texId ||
    (a.uniformKey < b.uniformKey ? -1 : a.uniformKey > b.uniformKey ? 1 : 0));

  let curDef = -1, curTex = -1, curUni = "";
  for (const m of survivors) {
    if (m.defId !== curDef) { curDef = m.defId; sink.setDef(curDef); stats.defBinds++; }
    if (m.texId !== curTex) { curTex = m.texId; sink.setTexture(curTex); stats.texBinds++; }
    if (m.uniformKey !== curUni) { curUni = m.uniformKey; sink.setUniforms(curUni); stats.uniBinds++; }
    sink.drawModel(m);
    stats.draws++;
  }
  return stats;
}
