// Licence: Apache-2.0 (donor). Clean-room shape written from the described mechanism; no donor lines are translated.
export interface Rules {
  floorRatio: number;     // listing floor, share of the reference price
  undercutRatio: number;  // ask must undercut the cheapest rival ask by this share
  npcSellRatio: number;   // NPC liquidation price, share of base price
  adjustMin: number;      // lowest learned price multiplier, percent
  adjustStep: number;     // drop per unsold expiry, percent points
}

export interface Market {
  referencePrice: number; // min(scaled base price, cheapest NPC buy price)
  rivalAsk: number;       // cheapest ask from other sellers (Infinity if none)
  supplyUnits: number;    // units already offered by everyone else
  fundedUnits: number;    // demand that can pay the ask, in units
}

export type Decision =
  | { action: 'list'; count: number; price: number }
  | { action: 'hold' };   // keep in the warehouse: floor above the undercut price, or no room

// Ask ladder: a seller's fixed spread (70..90 percent of reference) times a learned multiplier.
export function preferredAsk(referencePrice: number, sellerSeed: number, adjustPercent: number, r: Rules): number {
  const spread = 70 + (Math.abs(sellerSeed) % 21);
  const adjust = Math.max(r.adjustMin, Math.min(100, adjustPercent));
  return Math.max(1, Math.floor(referencePrice * (spread * adjust) / 10000));
}

// Listing decision: list only what funded demand can absorb, at or below the undercut price, never below the floor.
export function decide(stock: number, preferred: number, m: Market, r: Rules): Decision {
  const floor = Math.max(1, Math.floor(m.referencePrice * r.floorRatio));
  const undercut = Number.isFinite(m.rivalAsk) ? Math.floor(m.rivalAsk * r.undercutRatio) : Infinity;
  if (floor > undercut) return { action: 'hold' };
  const available = Math.max(0, m.fundedUnits - m.supplyUnits);
  if (available <= 0) return { action: 'hold' };
  return { action: 'list', count: Math.min(stock, available), price: Math.max(floor, Math.min(preferred, undercut)) };
}

// Surplus goes to the NPC at a fixed share of base price: a sink, not a market.
export function npcSellPrice(basePrice: number, r: Rules): number {
  return Math.max(1, Math.floor(basePrice * r.npcSellRatio));
}

// Each unsold expiry lowers the learned multiplier; there is no step back up in the donor.
export function afterUnsoldExpiry(adjustPercent: number, r: Rules): number {
  return Math.max(r.adjustMin, adjustPercent - r.adjustStep);
}

export {};
