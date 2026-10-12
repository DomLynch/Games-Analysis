// Licence: MIT (donor FPtje-DarkRP). Shape adapted; written from the mechanism, not copied line by line.

interface Ledger {
  balance(accountId: string): number;
  // The one money door: every change of balance is a signed row, applied together.
  settle(rows: ReadonlyArray<{ accountId: string; delta: number; reason: string }>): void;
}

interface Vendor {
  id: string;
  ownerId: string;
  ownerTeamAllowed: boolean; // donor: owner's team is in self.allowed
  listPrice: number;         // set by the owner; donor clamps to 50..500 (config)
  busy: boolean;             // donor: self.Once (one sale at a time per vendor)
}

const OWNER_RATE = 0.9;          // owner pays 90% of list (donor lab_base/init.lua:58)
const OWNER_RATE_ALLOWED = 0.8;  // owner pays 80% when their team is allowed (donor :56)
const DELIVER_DELAY_MS = 1000;   // item appears after 1 s (donor :118)

function rateFor(v: Vendor): number {
  return v.ownerTeamAllowed ? OWNER_RATE_ALLOWED : OWNER_RATE;
}

// Owner's own price, and the floor the owner's margin is measured from.
function ownerFloor(v: Vendor): number {
  return Math.ceil(v.listPrice * rateFor(v));
}

function costFor(v: Vendor, buyerId: string): number {
  return buyerId === v.ownerId ? ownerFloor(v) : v.listPrice;
}

export type BuyResult = "ok" | "busy" | "cannot_afford" | "owner_poor";

export function buyFromVendor(
  v: Vendor,
  buyerId: string,
  buyerOnline: () => boolean,
  ledger: Ledger,
  deliver: (buyerId: string, vendorId: string) => void,
  schedule: (ms: number, job: () => void) => void,
): BuyResult {
  if (v.busy) return "busy";                                          // donor :71
  const cost = costFor(v, buyerId);
  if (ledger.balance(buyerId) < cost) return "cannot_afford";         // donor :82
  const margin = cost - ownerFloor(v);                                // donor :87 (0 for the owner)
  if (margin < 0 && ledger.balance(v.ownerId) < -margin) return "owner_poor"; // donor :88
  v.busy = true;                                                      // donor :101
  const rows = [{ accountId: buyerId, delta: -cost, reason: "buy " + v.id }];
  if (buyerId !== v.ownerId && margin > 0) {
    rows.push({ accountId: v.ownerId, delta: margin, reason: "margin " + v.id });
  }
  ledger.settle(rows);                                                // donor :104, :111
  schedule(DELIVER_DELAY_MS, () => {                                  // donor :118
    if (buyerOnline()) {
      deliver(buyerId, v.id);
    } else {
      // Fix, not in the donor: undo both legs so a vanished buyer cannot leave money behind.
      const undo = [{ accountId: buyerId, delta: cost, reason: "refund " + v.id }];
      if (buyerId !== v.ownerId && margin > 0) {
        undo.push({ accountId: v.ownerId, delta: -margin, reason: "reverse margin " + v.id });
      }
      ledger.settle(undo);
    }
    v.busy = false;                                                   // donor :123
  });
  return "ok";
}
export {};
