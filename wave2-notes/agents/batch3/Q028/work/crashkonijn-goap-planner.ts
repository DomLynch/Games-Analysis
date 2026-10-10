// Licence: Apache-2.0 (donor, LICENSE). Clean-room sketch of the described search, not a translation of the donor.
export type Cond = string;
export interface Vec2 { x: number; y: number }

export interface Node {
  id: string;
  cost: number;           // action cost, or the priority cost of a goal start
  pre: Cond[];            // conditions that must hold before this node
  eff: Cond[];            // conditions this node makes true
  pos?: Vec2;             // where the node happens, if it has a position
  executable?: boolean;   // true when the agent can run this action now
}

interface Entry { id: string; P: number; G: number; H: number; parent: string | null; pos: Vec2 | undefined }

const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

// Backward search from the goals. A goal starts with G = its own cost.
// Each step: P = parent P + action cost + distance(parent, node) * distMul; G = P + distance(agent, node) * distMul.
// H = sum of the cheapest producer cost of each unmet condition. The first executable node popped by F = G + H wins.
export function planCheapest(
  goals: Node[],
  actions: Node[],
  met: ReadonlySet<Cond>,
  agent: Vec2,
  distMul: number,
): { goal: string; steps: string[] } | null {
  const byId = new Map<string, Node>();
  for (const n of [...goals, ...actions]) byId.set(n.id, n);

  const producers = new Map<Cond, Node[]>();
  for (const a of actions) {
    for (const c of a.eff) {
      const list = producers.get(c);
      if (list) list.push(a);
      else producers.set(c, [a]);
    }
  }

  const unmet = (n: Node): Cond[] => n.pre.filter((c) => !met.has(c));
  const cheapest = (c: Cond): number => Math.min(...(producers.get(c) ?? []).map((p) => p.cost));
  const unmetCost = (n: Node): number => unmet(n).reduce((s, c) => s + cheapest(c), 0);
  const unresolvable = (n: Node): boolean => unmet(n).some((c) => (producers.get(c) ?? []).length === 0);

  const open = new Map<string, Entry>();
  const closed = new Map<string, Entry>();

  const expand = (cur: Entry): void => {
    const node = byId.get(cur.id);
    if (!node) return;
    for (const c of unmet(node)) {
      for (const nb of producers.get(c) ?? []) {
        if (closed.has(nb.id)) continue;
        const pos = nb.pos ?? cur.pos;                       // no own position: inherit the parent's
        const P = cur.P + nb.cost + (cur.pos && pos ? dist(cur.pos, pos) * distMul : 0);
        const G = P + (pos ? dist(agent, pos) * distMul : 0);
        const seen = open.get(nb.id);
        if (!seen) {
          open.set(nb.id, { id: nb.id, P, G, H: unmetCost(nb), parent: cur.id, pos });
        } else if (G < seen.G) {
          seen.P = P; seen.G = G; seen.parent = cur.id; seen.pos = pos;
        }
      }
    }
  };

  for (const g of goals) {
    const start: Entry = { id: g.id, P: g.cost, G: g.cost, H: 0, parent: null, pos: undefined };
    closed.set(g.id, start);
    expand(start);
  }

  while (open.size > 0) {
    let best: Entry | undefined;
    for (const e of open.values()) {
      if (best === undefined || e.G + e.H < best.G + best.H) best = e;
    }
    if (best === undefined) break;
    const node = byId.get(best.id);
    if (!node) break;
    if (node.executable) {
      const back: string[] = [];
      let cur: Entry = best;
      while (cur.parent !== null) {
        back.push(cur.id);
        const next = closed.get(cur.parent);
        if (!next) return null;
        cur = next;
      }
      return { goal: cur.id, steps: back.reverse() };
    }
    open.delete(best.id);
    closed.set(best.id, best);
    if (unresolvable(node)) continue;
    expand(best);
  }
  return null;
}

// Exclusive claim of a target: skip items claimed by another agent, take the nearest free one.
export interface Claimable { id: string; claimedBy: string | null; pos: Vec2 }

export function claimNearest(items: Claimable[], agentId: string, agent: Vec2): Claimable | null {
  let best: Claimable | null = null;
  let bestD = Number.MAX_VALUE;
  for (const it of items) {
    if (it.claimedBy !== null && it.claimedBy !== agentId) continue;
    const d = dist(agent, it.pos);
    if (d < bestD) { best = it; bestD = d; }
  }
  if (best !== null) best.claimedBy = agentId;
  return best;
}
