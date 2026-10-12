// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor.
type EffectName = "DealDamage" | "GainControl" | "Counter";
type ExpiryRule = "endOfTurn" | "endOfCombat" | "leavesPlay";

interface SpellRow {
  id: string;
  effect: EffectName;
  manaFixed: number;             // fixed part of the cost
  xPaid: boolean;                // X is the mana paid on cast
  targetMin: number;
  targetMax: number;
  extraTargetCost: number;       // mana added per target beyond the first
  divideEvenly: boolean;         // split X across the surviving targets, rounded down
  expiry?: ExpiryRule;           // only for GainControl
  cantFizzle?: boolean;          // donor CantFizzle param: the spell resolves even with no legal target
}

interface TargetState {
  id: string;
  alive: boolean;
  stillLegal: boolean;           // still a legal target at resolution
}

interface StackedCast {
  row: SpellRow;
  x: number;
  targets: TargetState[];
}

interface ResolveResult {
  fizzled: boolean;
  damage: Map<string, number>;
  controlLeases: { targetId: string; expiry: ExpiryRule }[];
}

// The donor's hasFizzled removes illegal targets from the spell's target list before the effect runs, so the
// divisor is the SURVIVING targets (MagicStack.java 777-780, DamageDealEffect.java 177). It omits the replacement hooks, the excess-damage
// branch, the counter's destination choice, the UnlessCost branch, and the 'SacMe' AI hint that the donor
// attaches to a lease that ends at end of turn, and the bestow/mutate continue-as-creature case.
function resolveCast(cast: StackedCast): ResolveResult {
  const result: ResolveResult = { fizzled: false, damage: new Map(), controlLeases: [] };
  const legal = cast.targets.filter((t) => t.alive && t.stillLegal);

  // Fizzle rule: a spell with targets fizzles only when no chosen target is still legal.
  if (cast.targets.length > 0 && legal.length === 0 && !cast.row.cantFizzle) {
    result.fizzled = true;
    return result;
  }

  if (cast.row.effect === "DealDamage") {
    const perTarget = cast.row.divideEvenly && legal.length > 0
      ? Math.floor(cast.x / legal.length)
      : cast.x;
    for (const t of legal) {
      result.damage.set(t.id, perTarget);
    }
  } else if (cast.row.effect === "GainControl" && cast.row.expiry !== undefined) {
    for (const t of legal) {
      result.controlLeases.push({ targetId: t.id, expiry: cast.row.expiry });
    }
  }
  return result;
}

export {};
