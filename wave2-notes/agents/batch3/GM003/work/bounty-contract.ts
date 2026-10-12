// Licence: MIT (donor FPtje-DarkRP). Shape adapted; written from the mechanism, not copied line by line.

interface Ledger {
  balance(accountId: string): number;
  // The one money door: every change of balance is a signed row, applied together.
  settle(rows: ReadonlyArray<{ accountId: string; delta: number; reason: string }>): void;
}

interface BountyRules {
  minPrice: number;          // donor: minHitPrice 200 (config.lua:524)
  maxPrice: number;          // donor: maxHitPrice 50000, clamp in setHitPrice (sv_init.lua:68)
  maxDistance: number;       // donor: minHitDistance 150 (config.lua:528), compared squared (sh_init.lua:3, :32)
  targetCooldownS: number;   // donor: hitTargetCooldown 120 (config.lua:534), starts at the kill (sv_init.lua:205)
  customerCooldownS: number; // donor: hitCustomerCooldown 240 (config.lua:536), starts at accept (sv_init.lua:186)
}

interface Contract {
  id: string;
  hitmanId: string;
  customerId: string;
  targetId: string;
  price: number;
}

interface BountyState {
  byHitman: Map<string, Contract>;   // donor: hits[hitman]; one active contract per hitman (:129)
  lastKillAt: Map<string, number>;   // donor: target lastHitTime
  lastAcceptAt: Map<string, number>; // donor: customer.lastHitAccepted
}

interface Request {
  hitmanId: string; customerId: string; targetId: string; price: number;
  distance: number; hitmanIsHitman: boolean; customerAlive: boolean; customerBalance: number;
}

// Donor gate order (sh_init.lua:31-40). Returns a refusal reason, or null if the request may proceed.
export function requestBlock(r: Request, rules: BountyRules, st: BountyState, now: number): string | null {
  if (!r.hitmanIsHitman) return "not a hitman";
  if (r.distance > rules.maxDistance) return "too far";
  if (!r.customerAlive) return "customer dead";
  if (r.targetId === r.hitmanId) return "no suicide";
  if (r.customerId === r.hitmanId) return "no self order";
  if (r.customerBalance < r.price) return "cannot afford";
  if (r.price < rules.minPrice) return "price too low";
  if (st.byHitman.has(r.hitmanId)) return "hitman busy";
  const lastKill = st.lastKillAt.get(r.targetId);
  if (lastKill !== undefined && now - lastKill < rules.targetCooldownS * 1000) return "target cooling down";
  const lastAccept = st.lastAcceptAt.get(r.customerId);
  if (lastAccept !== undefined && now - lastAccept < rules.customerCooldownS * 1000) return "customer cooling down";
  return null;
}

// Accept: the customer's money goes into an escrow account, not to the hitman (fix; donor pays the hitman here).
export function acceptContract(c: Contract, st: BountyState, ledger: Ledger, now: number): boolean {
  if (st.byHitman.has(c.hitmanId)) return false;                       // donor :129
  if (ledger.balance(c.customerId) < c.price) return false;            // donor :44
  ledger.settle([
    { accountId: c.customerId, delta: -c.price, reason: "bounty escrow " + c.id },
    { accountId: "escrow:" + c.id, delta: c.price, reason: "bounty escrow " + c.id },
  ]);
  st.byHitman.set(c.hitmanId, c);
  st.lastAcceptAt.set(c.customerId, now);                              // donor :186
  return true;
}

// Kill: paid out only when the hitman kills the named target (donor :227-229, completion).
export function onKill(killerId: string, victimId: string, st: BountyState, ledger: Ledger, now: number): void {
  const c = st.byHitman.get(killerId);
  if (!c || c.targetId !== victimId) return;
  ledger.settle([
    { accountId: "escrow:" + c.id, delta: -c.price, reason: "bounty paid " + c.id },
    { accountId: c.hitmanId, delta: c.price, reason: "bounty paid " + c.id },
  ]);
  st.lastKillAt.set(victimId, now);                                    // donor :205
  st.byHitman.delete(c.hitmanId);
}

// Abort (hitman died or left, target died to someone else, customer left, hitman arrested or changed team).
// Donor: abortHit moves no money (sv_init.lua:81-90). Fix: refund the customer from escrow.
export function abortContract(hitmanId: string, st: BountyState, ledger: Ledger): void {
  const c = st.byHitman.get(hitmanId);
  if (!c) return;
  ledger.settle([
    { accountId: "escrow:" + c.id, delta: -c.price, reason: "bounty refund " + c.id },
    { accountId: c.customerId, delta: c.price, reason: "bounty refund " + c.id },
  ]);
  st.byHitman.delete(hitmanId);
}
export {};
