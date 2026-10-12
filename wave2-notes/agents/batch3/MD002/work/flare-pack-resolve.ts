// Licence: GPL-3.0 (donor, COPYING). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Req { id: string; min: number; max: number }
interface Pack {
  id: string;
  version: number;          // donor uses a Version class; a number is enough for the sketch
  game: string;
  engineMin: number;
  engineMax: number;
  requires: Req[];
}

export interface PackPlan { order: Pack[]; errors: string[] }

// The list is priority order (a later entry overrides an earlier one), so only the requirement order
// is computed here: each pack's requirements come before it. A missing requirement is an error at
// any position in the list, including the first (the donor skips this check for the first mod).
export function resolvePacks(list: string[], catalogue: Map<string, Pack>, engine: number, game: string): PackPlan {
  const errors: string[] = [];
  const order: Pack[] = [];
  const state = new Map<string, "visiting" | "done">();

  function visit(id: string, needer: string): void {
    const seen = state.get(id);
    if (seen === "done") return;
    if (seen === "visiting") { errors.push(`${id}: requirement cycle`); return; }
    const p = catalogue.get(id);
    if (!p) { errors.push(`${needer} needs ${id}, which is not installed`); return; }
    if (p.game !== game) errors.push(`${id}: game ${p.game} is not ${game}`);
    if (engine < p.engineMin || engine > p.engineMax) errors.push(`${id}: engine ${engine} is outside ${p.engineMin}..${p.engineMax}`);
    state.set(id, "visiting");
    for (const r of p.requires) {
      visit(r.id, id);
      const dep = catalogue.get(r.id);
      if (dep && (dep.version < r.min || dep.version > r.max)) {
        errors.push(`${id}: needs ${r.id} ${r.min}..${r.max}, installed is ${dep.version}`);
      }
    }
    state.set(id, "done");
    order.push(p);
  }

  for (const id of list) visit(id, "list");
  return { order, errors };
}

export {};
