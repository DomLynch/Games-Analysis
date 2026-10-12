// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RNG = () => number; // returns a value in [0, 1)

interface Item { id: number; equipped: boolean; }
type Where = "inventory" | "equip" | "all";
interface DropEntry { itemId: number | "random"; where: Where; ratePer10k: number; }

// Take-one: each entry rolls ONCE and removes at most ONE eligible item.
// Fix: the donor rolls once per matching slot for a named item (a 50% entry on two matching slots drops 75%).
function takeOneOnDeath(inv: Item[], entries: DropEntry[], rng: RNG): Item[] {
  const dropped: Item[] = [];
  for (const e of entries) {
    const pool = inv.filter((it) => matches(it, e));
    if (pool.length === 0) continue;
    if (rng() * 10000 >= e.ratePer10k) continue;      // one roll for this entry
    const pick = pool[Math.floor(rng() * pool.length)];
    inv.splice(inv.indexOf(pick), 1);                 // the item leaves inventory and becomes a world drop
    dropped.push(pick);
  }
  return dropped;
}

function matches(it: Item, e: DropEntry): boolean {
  const whereOk = e.where === "all" || (e.where === "equip" ? it.equipped : !it.equipped);
  const idOk = e.itemId === "random" || it.id === e.itemId;
  return whereOk && idOk;
}

interface ExpState { baseExp: number; jobExp: number; nextBaseExp: number; nextJobExp: number; }
interface ExpRules { type: 1 | 2; basePer10k: number; jobPer10k: number; }
interface DeathCtx { killerIsPlayer: boolean; pkMode: boolean; isMaxLevel: boolean; hasNoExpPenalty: boolean; }

// Exp tax: percent of next-level exp (type 1) or of total exp (type 2). Doubled when a player killed in pk mode.
// Capped at current exp. A spent insurance item skips the whole tax.
function expTax(s: ExpState, r: ExpRules, ctx: DeathCtx, hasInsurance: boolean): { lostBase: number; lostJob: number; insuranceUsed: boolean } {
  if (ctx.hasNoExpPenalty || ctx.isMaxLevel) return { lostBase: 0, lostJob: 0, insuranceUsed: false };
  const mult = ctx.pkMode && ctx.killerIsPlayer ? 2 : 1;
  const baseRaw = (r.type === 1 ? s.nextBaseExp : s.baseExp) * (r.basePer10k / 10000) * mult;
  const jobRaw = (r.type === 1 ? s.nextJobExp : s.jobExp) * (r.jobPer10k / 10000) * mult;
  const lostBase = Math.min(s.baseExp, Math.floor(baseRaw));
  const lostJob = Math.min(s.jobExp, Math.floor(jobRaw));
  if (lostBase === 0 && lostJob === 0) return { lostBase: 0, lostJob: 0, insuranceUsed: false };
  if (hasInsurance) return { lostBase: 0, lostJob: 0, insuranceUsed: true };
  return { lostBase, lostJob, insuranceUsed: false };
}

// Zeny tax: fix — applied only when a player killed (the donor's own config comment says so; the donor gate has no killer check).
function zenyTax(zeny: number, ratePer10k: number, ctx: DeathCtx): number {
  if (!ctx.killerIsPlayer || ctx.hasNoExpPenalty || ratePer10k <= 0) return 0;
  return Math.floor(zeny * (ratePer10k / 10000));
}

// Smoke check: a 50% entry on two matching slots, 2000 rolls, should land near 50%, not 75%.
const rng: RNG = () => Math.random();
let hits = 0;
for (let i = 0; i < 2000; i++) {
  const inv: Item[] = [{ id: 7, equipped: false }, { id: 7, equipped: false }];
  if (takeOneOnDeath(inv, [{ itemId: 7, where: "inventory", ratePer10k: 5000 }], rng).length > 0) hits++;
}
void hits;
void expTax;
void zenyTax;
export {};
