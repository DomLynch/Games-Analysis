// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Box { minX: number; minY: number; maxX: number; maxY: number; }
interface Ent { id: number; box: Box; origin: { x: number; y: number }; trigger: boolean; }

const DEPTH = 4; // leaves at depth 4: 16 leaves, 31 nodes in all

interface AreaNode {
  axis: 0 | 1 | -1;                 // -1 = leaf
  dist: number;
  children: [AreaNode, AreaNode] | null; // [upper, lower]
  triggers: Set<Ent>;
}

function axisMin(b: Box, axis: 0 | 1): number { return axis === 0 ? b.minX : b.minY; }
function axisMax(b: Box, axis: 0 | 1): number { return axis === 0 ? b.maxX : b.maxY; }
function overlaps(a: Box, b: Box): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

// Uniform split of the world box, always on its longer side, down to DEPTH.
export function buildTree(depth: number, b: Box): AreaNode {
  const node: AreaNode = { axis: -1, dist: 0, children: null, triggers: new Set<Ent>() };
  if (depth === DEPTH) return node;
  const axis: 0 | 1 = (b.maxX - b.minX) > (b.maxY - b.minY) ? 0 : 1;
  const dist = 0.5 * (axis === 0 ? b.minX + b.maxX : b.minY + b.maxY);
  const upper: Box = axis === 0 ? { ...b, minX: dist } : { ...b, minY: dist };
  const lower: Box = axis === 0 ? { ...b, maxX: dist } : { ...b, maxY: dist };
  node.axis = axis;
  node.dist = dist;
  node.children = [buildTree(depth + 1, upper), buildTree(depth + 1, lower)];
  return node;
}

// Link an entity into the first node its box crosses (one node per entity).
export function link(root: AreaNode, e: Ent, where: Map<Ent, AreaNode>): void {
  const old = where.get(e);
  if (old) { old.triggers.delete(e); where.delete(e); }
  let node = root;
  while (node.axis !== -1 && node.children) {
    if (axisMin(e.box, node.axis) > node.dist) node = node.children[0];
    else if (axisMax(e.box, node.axis) < node.dist) node = node.children[1];
    else break;
  }
  if (e.trigger) { node.triggers.add(e); where.set(e, node); }
}

// Triggers that `e` touches. Coarse test: box overlap. Fine test: `inside` (point or volume test on the origin).
function collect(node: AreaNode, e: Ent, inside: (t: Ent, origin: { x: number; y: number }) => boolean, out: Ent[]): void {
  for (const t of node.triggers) {
    if (t === e || !overlaps(e.box, t.box)) continue;
    if (inside(t, e.origin)) out.push(t);
  }
  if (node.axis === -1 || !node.children) return;
  if (axisMax(e.box, node.axis) > node.dist) collect(node.children[0], e, inside, out);
  if (axisMin(e.box, node.axis) < node.dist) collect(node.children[1], e, inside, out);
}

// Move an entity: relink, then report the triggers it touches (none while playersOnly is set).
export function moveEntity(
  root: AreaNode,
  where: Map<Ent, AreaNode>,
  e: Ent,
  playersOnly: boolean,
  inside: (t: Ent, origin: { x: number; y: number }) => boolean,
): Ent[] {
  link(root, e, where);
  const out: Ent[] = [];
  if (!playersOnly) collect(root, e, inside, out);
  return out;
}

export {};
