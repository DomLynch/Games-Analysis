// Licence: MIT (donor LICENSE, permission grant). Written in our own words from the described mechanism; the donor's shape is kept.
interface BoonRow { shrineType: string; itemBaseId: number; amount: number; }
interface Shrine { type: string; favours: number; }
interface Offering { itemBaseId: number; count: number; owned: boolean; }

const DECAY_KEEP = 0.9;   // donor: decay keeps 90 percent (Shrine.decay, 10 percent off per call)

// Offering: the boon table decides how much favour an item adds; the item is used up.
function offer(s: Shrine, item: Offering, table: BoonRow[]): number {
  if (!item.owned) return 0;
  const row = table.find(b => b.itemBaseId === item.itemBaseId && b.shrineType === s.type);
  if (!row) return 0;                       // not a boon item for this shrine
  const add = row.amount * item.count;     // donor: boon.getAmount() * numOfItems
  s.favours += add;
  return add;
}

// Rank: 0 is the shrine with the most favour in its type (donor: sorted by favour, index).
function rankOf(s: Shrine, sameType: Shrine[]): number {
  return sameType.slice().sort((a, b) => b.favours - a.favours).indexOf(s);
}

// Claim: one favour buys a power whose strength is set by rank: 40 minus 10 per rank, floor 0.
// Fix: the empty check sits with the debit. The donor checks outside its lock and the debit has no floor.
function claimBoon(
  s: Shrine,
  rank: number,
  r8Tree: boolean,
  ctx: { guildMember: boolean; gateOk: boolean; hasBoon: boolean },
): { ok: boolean; trains: number; reason: string } {
  if (!ctx.guildMember) return { ok: false, trains: 0, reason: "guild" };
  if (ctx.hasBoon) return { ok: false, trains: 0, reason: "already" };
  if (!ctx.gateOk) return { ok: false, trains: 0, reason: "gate" };
  if (s.favours <= 0) return { ok: false, trains: 0, reason: "empty" };
  s.favours -= 1;
  let r = Math.max(0, rank);
  if (r8Tree && r !== 0) r = 1;            // donor: an R8 tree treats every non-first shrine as index 1
  const trains = Math.max(0, 40 - r * 10); // donor: trains = 40 - rank * 10, floored at 0
  return { ok: true, trains: trains, reason: "" };
}

// Decay (called by the job for the top two ranks). Fix: round to nearest; the donor truncates with an int cast,
// so a pool of 1 falls to 0 and a pool of 5 falls to 4 (a 20 percent drop).
function decay(s: Shrine): void {
  if (s.favours === 0) return;
  s.favours = Math.max(0, Math.round(s.favours * DECAY_KEEP));
}

export {};
