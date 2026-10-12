// Licence: CC0-1.0 (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor.
type Layer = "rebase" | "normal" | "aura";

interface Modifier {
  id: string;
  layer: Layer;
  fixed: boolean;          // a fixed modifier stops later normal modifiers
  removable: boolean;      // silence / dispel removes it
  apply: (value: number) => number;
}

// simplified: the donor applies the last rebasing modifier, then normal modifiers in list order, then auras, then clamps
// to zero. Its stop point is the first fixed modifier of either kind in list order, and its aura step is skipped
// when that stop modifier is a normal one (the loop returns at it). This sketch changes both: the stop is the first fixed
// NORMAL modifier, and auras always apply (deliberate; ruling for Dom). It omits the stopAtBase variant used for base values, the per-attribute caches, the keyword rules,
// and the donor's silence flush.
function buffedAttribute(base: number, mods: Modifier[]): number {
  let value = base;

  const rebases = mods.filter((m) => m.layer === "rebase");
  if (rebases.length > 0) {
    value = rebases[rebases.length - 1].apply(value);
  }

  for (const m of mods.filter((m) => m.layer === "normal")) {
    value = m.apply(value);
    if (m.fixed) break;
  }

  for (const m of mods.filter((m) => m.layer === "aura")) {
    value = m.apply(value);
  }

  return Math.max(0, value);
}

// Intensify (donor SpellIntensifyDealDamage): damage scales with how many times this caster has played the card.
function intensifyDamage(damageAmount: number, timesPlayed: number): number {
  return damageAmount * timesPlayed;
}

// Silence / dispel: remove every removable modifier; non-removable ones (base effects) stay.
function silence(mods: Modifier[]): Modifier[] {
  return mods.filter((m) => !m.removable);
}

export {};
