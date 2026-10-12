// Licence: Apache-2.0 (donor crashkonijn-GOAP). Clean-room sketch from the described mechanism, not a translation of the C# job.
export type Vec3 = { x: number; y: number; z: number };

export interface PlanNode {
  id: number;
  requires: number[]; // condition ids that must hold (action preconditions, or goal conditions)
  provides: number[]; // condition ids this action makes true (empty for goals)
  cost: number; // base cost (action BaseCost, or goal cost)
  enabled: boolean;
  executable: boolean; // action may run right now (all preconditions met and the action agrees)
  pos?: Vec3; // target position; undefined means "same as the node we came from"
}

export interface PlanInput {
  nodes: PlanNode[];
  goalIds: number[];
  met: ReadonlySet<number>; // condition ids that are true right now
  agentPos: Vec3;
  distanceMultiplier: number;
  maxExpansions: number; // FIX: the donor has no expansion cap
}

export interface PlanOut {
  goalId: number | null;
  actionIds: number[]; // first element is the action to run now
  expansions: number;
  capped: boolean;
}

function distance(a: Vec3 | undefined, b: Vec3 | undefined): number {
  if (a === undefined || b === undefined) return 0; // donor: an invalid position costs no distance
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// Binary min-heap with lazy deletion. FIX: the donor sorts the whole open list on every pop; its own NativeHeap.cs (not used by the planner) is the same idea.
class MinHeap {
  private a: { key: number; v: number }[] = [];
  get size(): number {
    return this.a.length;
  }
  push(key: number, v: number): void {
    this.a.push({ key, v });
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].key <= this.a[i].key) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop(): { key: number; v: number } | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop();
    if (last !== undefined && this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.a.length && this.a[l].key < this.a[m].key) m = l;
        if (r < this.a.length && this.a[r].key < this.a[m].key) m = r;
        if (m === i) break;
        [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
        i = m;
      }
    }
    return top;
  }
}

interface Entry {
  id: number;
  P: number; // cost up to and including this node, as a parent
  G: number; // P plus the distance from the agent
  H: number; // sum of the cheapest producer cost for each unmet condition
  parent: number; // -1 for a goal
  pos: Vec3 | undefined;
}

// Backward A*: start at the goals, walk to producers of unmet conditions, stop at the first executable node.
export function plan(input: PlanInput): PlanOut {
  const byId = new Map<number, PlanNode>();
  for (const n of input.nodes) byId.set(n.id, n);

  const producers = new Map<number, number[]>();
  for (const n of input.nodes) {
    for (const c of n.provides) {
      const list = producers.get(c) ?? [];
      list.push(n.id);
      producers.set(c, list);
    }
  }

  const unmet = (n: PlanNode): number[] => n.requires.filter((c) => !input.met.has(c));
  const cheapest = (c: number): number =>
    Math.min(...(producers.get(c) ?? []).map((id) => byId.get(id)?.cost ?? Infinity));
  const heuristic = (n: PlanNode): number => unmet(n).reduce((sum, c) => sum + cheapest(c), 0);

  const closed = new Map<number, Entry>();
  const open = new Map<number, Entry>();
  const heap = new MinHeap();
  const m = input.distanceMultiplier;

  const expand = (cur: Entry, node: PlanNode): void => {
    for (const c of unmet(node)) {
      for (const pid of producers.get(c) ?? []) {
        if (closed.has(pid)) continue;
        const p = byId.get(pid);
        if (p === undefined || !p.enabled) continue;
        const pos = p.pos ?? cur.pos;
        const newP = cur.P + p.cost + distance(cur.pos, pos) * m;
        const newG = newP + distance(input.agentPos, pos) * m;
        const existing = open.get(pid);
        if (existing === undefined) {
          const e: Entry = { id: pid, P: newP, G: newG, H: heuristic(p), parent: cur.id, pos };
          open.set(pid, e);
          heap.push(e.G + e.H, pid);
        } else if (newG < existing.G) {
          existing.G = newG;
          existing.P = newP;
          existing.parent = cur.id;
          existing.pos = pos;
          heap.push(existing.G + existing.H, pid); // the older heap entry is now stale
        }
      }
    }
  };

  for (const gid of input.goalIds) {
    const g = byId.get(gid);
    if (g === undefined) continue;
    closed.set(gid, { id: gid, P: g.cost, G: g.cost, H: 0, parent: -1, pos: undefined });
  }
  for (const gid of input.goalIds) {
    const e = closed.get(gid);
    const g = byId.get(gid);
    if (e !== undefined && g !== undefined) expand(e, g);
  }

  let expansions = 0;
  while (heap.size > 0) {
    const top = heap.pop();
    if (top === undefined) break;
    const e = open.get(top.v);
    if (e === undefined || e.G + e.H !== top.key) continue; // stale entry
    open.delete(top.v);
    const node = byId.get(top.v);
    if (node === undefined) continue;

    if (node.executable) {
      const actions: number[] = [];
      let cur = e;
      while (cur.parent !== -1) {
        actions.push(cur.id);
        const next = closed.get(cur.parent);
        if (next === undefined) break;
        cur = next;
      }
      return { goalId: cur.id, actionIds: actions, expansions, capped: false };
    }

    if (expansions >= input.maxExpansions) {
      return { goalId: null, actionIds: [], expansions, capped: true };
    }
    expansions += 1;
    closed.set(e.id, e);

    // a condition nobody can produce makes this branch unresolvable (donor: no connections at all)
    if (unmet(node).some((c) => (producers.get(c) ?? []).length === 0)) continue;
    expand(e, node);
  }

  return { goalId: null, actionIds: [], expansions, capped: false };
}

// Example: goal needs condition 10; node 2 makes 10 true and needs 11; node 3 makes 11 true and can run now.
export function example(): PlanOut {
  const nodes: PlanNode[] = [
    { id: 1, requires: [10], provides: [], cost: 1, enabled: true, executable: false }, // the goal
    { id: 2, requires: [11], provides: [10], cost: 2, enabled: true, executable: false, pos: { x: 5, y: 0, z: 0 } },
    { id: 3, requires: [], provides: [11], cost: 3, enabled: true, executable: true },
  ];
  return plan({
    nodes,
    goalIds: [1],
    met: new Set<number>(),
    agentPos: { x: 0, y: 0, z: 0 },
    distanceMultiplier: 0.1,
    maxExpansions: 200,
  });
}

export {};
