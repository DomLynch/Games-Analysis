// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface TierRow { level: number; cost: number; itemId: number; }
interface TributeRow { id: number; tiers: TierRow[]; }
interface Slot { tributeId: number | null; tier: number; }
interface Player {
  level: number;
  favour: number;        // one ledger row: the spendable balance
  active: boolean;
  timeLeftMs: number;
  slots: Slot[];
}

const TRIBUTE_DURATION_MS = 600000;   // engine constant (donor: common/features.h:157)

// Activation: check every slot first. A too-low level refuses the WHOLE activation (fix: the donor
// skips the slot, still charges the rest and still turns the blessing on).
function activate(p: Player, catalog: Map<number, TributeRow>): { ok: boolean; reason: string; cost: number } {
  let cost = 0;
  for (const s of p.slots) {
    if (s.tributeId === null) continue;
    const row = catalog.get(s.tributeId);
    if (!row) continue;
    const tier = row.tiers[s.tier];
    if (!tier) continue;
    if (p.level < tier.level) return { ok: false, reason: "level", cost: 0 };
    cost += tier.cost;
  }
  if (cost > p.favour) return { ok: false, reason: "favour", cost: 0 };
  p.favour -= cost;
  p.timeLeftMs = TRIBUTE_DURATION_MS;
  p.active = true;
  return { ok: true, reason: "", cost: cost };
}

// Tier change while active: the same level check applies, and the upgrade is paid now.
// Fix: the donor takes the new tier with no level check and no charge until the next renewal.
function setTierWhileActive(p: Player, slot: number, tier: number, catalog: Map<number, TributeRow>): boolean {
  const s = p.slots[slot];
  const row = s && s.tributeId !== null ? catalog.get(s.tributeId) : undefined;
  if (!row || !row.tiers[tier]) return false;
  const want = row.tiers[tier];
  if (p.level < want.level) return false;
  const old = row.tiers[s.tier] ? row.tiers[s.tier].cost : 0;
  const diff = Math.max(0, want.cost - old);
  if (diff > p.favour) return false;
  p.favour -= diff;
  s.tier = tier;
  return true;
}

// Timer step, called with the ms elapsed since the last step. When the timer runs out the blessing
// renews and pays again; if the balance is short it switches off. Overshoot past zero is dropped.
function tick(p: Player, elapsedMs: number, catalog: Map<number, TributeRow>): void {
  if (!p.active) return;
  p.timeLeftMs -= elapsedMs;
  if (p.timeLeftMs > 0) return;
  const r = activate(p, catalog);
  if (!r.ok) { p.active = false; p.timeLeftMs = 0; }
}

export {};
