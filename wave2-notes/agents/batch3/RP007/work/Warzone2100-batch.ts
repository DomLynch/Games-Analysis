// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Instanced unit batcher: one draw per (shader, mesh, flags) key per pass; colour, team colour, alpha and matrix per instance.

export type Pass = 'opaque' | 'translucent' | 'translucentNoDepthWrite' | 'additive';
const PASS_ORDER: Pass[] = ['opaque', 'translucent', 'translucentNoDepthWrite', 'additive'];

export interface MeshKey { shader: number; mesh: number; flags: number; }

export interface InstanceRecord {
  matrix: number[];      // 16 floats, column-major
  colour: number;        // packed RGBA; alpha already set by the caller for translucent passes
  teamColour: number;    // packed RGBA
  stretch: number;
  frame: number;         // frame index for multi-frame meshes
}

export interface DrawCall { key: MeshKey; pass: Pass; first: number; count: number; }

// Route test (donor 1329, 1341): additive OR premultiplied goes to the additive pass; then translucent
// (no-depth-write split); everything else is opaque. Only ADDITIVE and TRANSLUCENT get their alpha replaced.
export const FLAG_ADDITIVE = 1, FLAG_PREMULTIPLIED = 2, FLAG_TRANSLUCENT = 4, FLAG_NODEPTHWRITE = 8;
export function passOf(flags: number): Pass {
  if (flags & (FLAG_ADDITIVE | FLAG_PREMULTIPLIED)) return 'additive';
  if (flags & FLAG_TRANSLUCENT) return (flags & FLAG_NODEPTHWRITE) ? 'translucentNoDepthWrite' : 'translucent';
  return 'opaque';
}

const keyString = (k: MeshKey): string => `${k.shader}|${k.mesh}|${k.flags}`;

// Shadow casters are added only when squared distance to the camera is under the cap.
export const SHADOW_END_DIST_SQ = 8000 * 8000;
export function shadowEligible(distSq: number): boolean {
  return distSq < SHADOW_END_DIST_SQ;
}

interface Batch { key: MeshKey; items: InstanceRecord[]; }

export class InstanceBatcher {
  private maps: Map<Pass, Map<string, Batch>> = new Map(PASS_ORDER.map((p) => [p, new Map()] as [Pass, Map<string, Batch>]));
  private frames = 0;
  constructor(private compactEvery: number) {}

  // Start of frame: keep batches (and their arrays) for next frame. Every compactEvery frames,
  // drop batches that were empty during the previous frame.
  begin(): void {
    this.frames++;
    const sweep = this.frames >= this.compactEvery;
    if (sweep) this.frames = 0;
    for (const [pass, map] of this.maps) {
      if (pass !== 'opaque') {
        // Donor: translucent, no-depth and additive maps are insertion-ordered and
        // cleared every frame (compacted on the sweep frame), so they never keep empties.
        map.clear();
        continue;
      }
      for (const [k, b] of map) {
        if (sweep && b.items.length === 0) map.delete(k);
        else b.items.length = 0;
      }
    }
  }

  add(pass: Pass, key: MeshKey, rec: InstanceRecord): void {
    const map = this.maps.get(pass)!;
    const k = keyString(key);
    let b = map.get(k);
    if (!b) {
      b = { key, items: [] };
      map.set(k, b);   // Map keeps insertion order, so each pass draws in first-use order
    }
    b.items.push(rec);
  }

  // Concatenate each non-empty batch into one instance array, one draw call per batch.
  finalize(): { instances: InstanceRecord[]; calls: DrawCall[] } {
    const instances: InstanceRecord[] = [];
    const calls: DrawCall[] = [];
    for (const pass of PASS_ORDER) {
      for (const b of this.maps.get(pass)!.values()) {
        if (b.items.length === 0) continue;
        calls.push({ key: b.key, pass, first: instances.length, count: b.items.length });
        for (const r of b.items) instances.push(r);
      }
    }
    return { instances, calls };
  }
}

export {};
