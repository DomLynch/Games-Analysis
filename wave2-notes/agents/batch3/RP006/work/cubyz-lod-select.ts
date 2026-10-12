// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type V3 = [number, number, number];

// Camera-relative plane. The normal need not be unit length: the test is a sign test.
export interface Plane {
  pos: V3;
  norm: V3;
}

// False only when the box is entirely outside one of the planes (four side planes, no near or far).
export function boxInFrustum(planes: readonly Plane[], min: V3, size: number): boolean {
  for (const p of planes) {
    let d = (min[0] - p.pos[0]) * p.norm[0] + (min[1] - p.pos[1]) * p.norm[1] + (min[2] - p.pos[2]) * p.norm[2];
    // add the box corner that lies furthest along the normal
    d += size * (Math.max(0, p.norm[0]) + Math.max(0, p.norm[1]) + Math.max(0, p.norm[2]));
    if (d < 0) return false;
  }
  return true;
}

export interface Node {
  lod: number;        // 0 = finest; the edge doubles per level
  origin: V3;         // world min corner, aligned to its own edge length
  meshed: boolean;    // this node has a mesh ready
  childMask: number;  // bit i set when child i (eight octants at lod - 1) is meshed; 0xff = all ready
}

export interface NodeStore {
  get(origin: V3, lod: number): Node | undefined;
}

export const CHUNK = 32;   // blocks per chunk edge
export const TOP_LOD = 5;  // coarsest level

const edge = (lod: number): number => CHUNK * 2 ** lod;
const key = (n: Node): string => `${n.origin[0]},${n.origin[1]},${n.origin[2]}|${n.lod}`;
const relTo = (player: V3, o: V3): V3 => [o[0] - player[0], o[1] - player[1], o[2] - player[2]];

// Returns the nodes to draw this frame. Player and planes share one coordinate frame.
export function selectNodes(store: NodeStore, player: V3, planes: readonly Plane[]): Node[] {
  const topEdge = edge(TOP_LOD);
  const start: V3 = [
    Math.floor(player[0] / topEdge) * topEdge,
    Math.floor(player[1] / topEdge) * topEdge,
    Math.floor(player[2] / topEdge) * topEdge,
  ];
  const top = store.get(start, TOP_LOD);
  if (!top || !top.meshed) return []; // nothing is drawn until the coarsest node around the player is ready

  const queue: Node[] = [top];
  const seen = new Set<string>([key(top)]);
  const draw: Node[] = [];

  while (queue.length > 0) {
    const n = queue.shift() as Node;

    if (n.lod === TOP_LOD) {
      // flood to top-level neighbours, only on the far side of the player along each axis
      for (let axis = 0; axis < 3; axis++) {
        for (const sign of [1, -1]) {
          const rel = n.origin[axis] - player[axis];
          if (sign > 0 && rel + topEdge <= 0) continue;
          if (sign < 0 && rel > 0) continue;
          const o: V3 = [n.origin[0], n.origin[1], n.origin[2]];
          o[axis] += sign * topEdge;
          const nb = store.get(o, TOP_LOD);
          if (nb && nb.meshed && !seen.has(key(nb)) && boxInFrustum(planes, relTo(player, o), topEdge)) {
            seen.add(key(nb));
            queue.push(nb);
          }
        }
      }
    }

    if (n.lod > 0 && n.childMask === 0xff) {
      // all eight finer children are ready: replace this node by the children that are in view
      const half = edge(n.lod - 1);
      for (let i = 0; i < 8; i++) {
        const o: V3 = [
          n.origin[0] + (i & 1) * half,
          n.origin[1] + ((i >> 1) & 1) * half,
          n.origin[2] + ((i >> 2) & 1) * half,
        ];
        const child = store.get(o, n.lod - 1);
        if (child && !seen.has(key(child)) && boxInFrustum(planes, relTo(player, o), half)) {
          seen.add(key(child));
          queue.unshift(child); // children go to the front, as the donor pushes them to the front
        }
      }
    } else {
      draw.push(n); // children not all ready: draw this node at its own level
    }
  }
  return draw;
}

export {};
