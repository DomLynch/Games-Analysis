// Licence: Valve Source 1 SDK licence (donor; restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shadow budget: rank visible casters by on-screen area, redraw only up to a cap, blob the rest.

export interface ShadowCandidate {
  id: number;
  screenArea: number;    // squared pixel diameter of the caster's bounding sphere
  needsRedraw: boolean;  // caster moved or animated since its texture was drawn
  hasTexture: boolean;   // a texture slot is currently held for this caster
}

export type ShadowMode = 'redraw' | 'cached' | 'blob';

// Largest on-screen area first. Ties broken by id (the donor's selection sort gives no tie order).
export function prioritize(c: ShadowCandidate[]): ShadowCandidate[] {
  return c.slice().sort((a, b) => (b.screenArea - a.screenArea) || (a.id - b.id));
}

// Smallest power p (texture side = 2^p) whose square covers the area, clamped to [minPow, maxPow].
export function desiredPower(area: number, minPow: number, maxPow: number): number {
  let p = minPow;
  while (p < maxPow && (1 << p) * (1 << p) < area) p++;
  return p;
}

// Hysteresis: keep the held texture when nothing needs a redraw and it is at most one step away.
export function keepHeld(currentPow: number, desired: number, redraw: boolean, maxPow: number): boolean {
  return !redraw && desired < maxPow && desired - currentPow <= 1;
}

// Redraws are capped, uses are not. A valid cached texture is kept over the cap (the donor blobs it).
export function planShadows(cands: ShadowCandidate[], redrawCap: number): Map<number, ShadowMode> {
  const plan = new Map<number, ShadowMode>();
  let redrawn = 0;
  for (const c of prioritize(cands)) {
    if (!c.hasTexture) {
      plan.set(c.id, 'blob');
    } else if (c.needsRedraw) {
      if (redrawn < redrawCap) {
        plan.set(c.id, 'redraw');
        redrawn++;
      } else {
        plan.set(c.id, 'blob');   // stale texture and no budget left
      }
    } else {
      plan.set(c.id, 'cached');
    }
  }
  return plan;
}

export {};
