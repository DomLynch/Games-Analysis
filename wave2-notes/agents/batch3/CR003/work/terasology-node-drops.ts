// Shape of the node-break pipeline (veto, destroy, drop roll, pickup). Written fresh; donor is Apache-2.0.
interface NodeRow {
  id: string;
  annihilationChance: number; // share of breaks that drop nothing (per damage source, data field)
  directPickup: boolean;      // try the breaker's inventory before the world
  impulsePower: number;       // magnitude of the world-drop kick (data field)
}

interface BreakContext {
  breaker: string;
  canTakeItem: (breaker: string, item: string) => boolean; // ledger write, may refuse (full bag)
  vetoed: boolean;            // a before-destroy handler can cancel the break
}

type Drop = { item: string; to: 'inventory' | 'world'; impulse: number };

// Returns null when vetoed (node stays). Otherwise the drops produced by the break.
// rng must be a seeded server RNG so replay reproduces the same drops.
function breakNode(node: NodeRow, ctx: BreakContext, rng: () => number): Drop[] | null {
  if (ctx.vetoed) return null;                       // 1. before-destroy veto
  const drops: Drop[] = [];
  const dropChance = 1 - node.annihilationChance;    // 2. drop roll, computed before the node is removed
  if (rng() < dropChance) {
    const item = node.id;
    const direct = node.directPickup && ctx.canTakeItem(ctx.breaker, item);
    drops.push(direct
      ? { item, to: 'inventory', impulse: 0 }        // 3a. straight into the breaker's inventory
      : { item, to: 'world', impulse: node.impulsePower }); // 3b. world pickup with a kick
  }
  return drops;                                      // 4. caller removes the node after this returns
}
