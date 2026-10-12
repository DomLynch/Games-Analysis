// Licence: LGPL-3.0 per README; the repo also ships LICENSE.GPL and LICENSE.MIT, so the licence of this file is unclear. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Permission = "Private" | "Guild" | "Public" | "Family";

interface Plot {
  ownerAccountId: number;     // 0 = no owner
  ownerFamilyId: number;      // 0 = none
  ownerExpeditionId: number;  // 0 = none
  permission: Permission;
  paidThroughMs: number;      // donor ProtectionEndDate
  heavy: boolean;             // template HeavyTax
}

interface Viewer { accountId: number; familyId: number; expeditionId: number; }

// Fixed: every permission has an explicit answer. The donor's guarded cases fall through to Public.
function canUse(p: Plot, v: Viewer): boolean {
  switch (p.permission) {
    case "Private":
      return p.ownerAccountId !== 0 && v.accountId === p.ownerAccountId;
    case "Family":
      return v.familyId > 0 && v.familyId === p.ownerFamilyId;
    case "Guild":
      return v.expeditionId > 0 && v.expeditionId === p.ownerExpeditionId;
    case "Public":
      return true;
    default:
      return false;
  }
}

type TaxState = "paid" | "tax-due" | "lapsed";

// warnBeforeMs comes from the same config as the paid period (donor hard-codes 7 days).
function taxState(p: Plot, nowMs: number, warnBeforeMs: number): TaxState {
  if (nowMs >= p.paidThroughMs) return "lapsed";
  if (nowMs >= p.paidThroughMs - warnBeforeMs) return "tax-due";
  return "paid";
}

// Fixed: a payment starts from the later of the paid-through date and now.
function payPeriod(p: Plot, nowMs: number, periodMs: number): void {
  p.paidThroughMs = Math.max(p.paidThroughMs, nowMs) + periodMs;
}

const MAX_HEAVY_COUNTED = 10;

// heavyOwned includes the plot being bought (donor CalculateBuildingTaxInfo adds it).
function weeklyTax(baseTax: number, heavyOwned: number, isHeavy: boolean): number {
  const multiplier = isHeavy && heavyOwned >= 3 ? Math.min(heavyOwned, MAX_HEAVY_COUNTED) * 0.5 : 1;
  return Math.ceil(baseTax * multiplier);
}

function demolish(p: Plot, nowMs: number): void {
  p.paidThroughMs = nowMs - 1000; // donor: AddSeconds(-1)
  p.ownerAccountId = 0;
  p.ownerFamilyId = 0;
  p.ownerExpeditionId = 0;
  p.permission = "Public";
}

// Runs every 10 seconds (donor: scheduled after 30 s, repeating every 10 s).
function taxScan(plots: Plot[], nowMs: number): Plot[] {
  const lapsed = plots.filter((p) => p.ownerAccountId !== 0 && nowMs >= p.paidThroughMs);
  lapsed.forEach((p) => demolish(p, nowMs));
  return lapsed;
}

interface Account { gold: number; }

// Fixed order: check money and the design, then consume the design, then charge.
// The donor charges first and consumes second, so a failed consume loses the gold.
function buildHouse(acct: Account, cost: number, designInBag: boolean, consumeDesign: () => boolean): boolean {
  if (!designInBag || acct.gold < cost) return false;
  if (!consumeDesign()) return false;
  acct.gold -= cost;
  return true;
}

export {};
