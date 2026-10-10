// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MAX_LEVEL = 50;

// XP needed to reach level n is XP_TO_LEVEL[n - 1]. Index MAX_LEVEL is the sentinel above the cap.
const XP_TO_LEVEL: number[] = [0, 50, 250, 850, 2300, 6350, 15950, 37950, 88950, 203950, 459950, 839950, 1399950, 2199950, 3399950, 5199950, 7899950, 11799950, 17499950, 25899950, 38199950, 54699950, 76999950, 106999950, 146999950, 199999950, 269999950, 359999950, 479999950, 639999950, 849999950, 1119999950, 1469999950, 1929999950, 2529999950, 3319999950, 4299999950, 5499999950, 6899999950, 8599999950, 12899999950, 20699999950, 29999999950, 40799999950, 53999999950, 69599999950, 88499999950, 110999999950, 137999999950, 169999999950, 999999999950];

const CAMP_FULL = 0.55; // max camp bonus (server property default)
const CAMP_WINDOW_MS = 1800000; // a respawn older than this gets the full camp bonus
const XP_CAP_PCT = 125; // per-kill cap, percent of the monster XP value for the player's level
const GROUP_CAP_PCT = 125;
const GROUP_STEP = 0.125; // group bonus per in-range group member, times the base XP

interface Gainer {
  id: number;
  level: number;
  alive: boolean;
  groupId: number | null;
  damage: number;
  inRange: boolean;
  staff: boolean;     // donor: a player with PrivLevel above 1 zeroes the kill
  greyToNpc: boolean; // donor IsObjectGreyCon: the NPC is grey to this gainer (any gainer, player or pet)
}

interface Npc {
  charmedRecently: boolean; // donor: charmed within the no-XP timeout
  controlled: boolean;      // donor: the brain is a controlled (pet) brain
  xpValue: number;
  spawnTimeMs: number;
  nowMs: number;
  campBonus: number; // starts at 1, decays per gainer
  inDungeon: boolean;
}

interface Player {
  id: number;
  xp: number;
  level: number;
  advanced: boolean; // class advancement done (gate at level 5)
  secondStage: boolean;
}

function xpToReach(level: number): number {
  if (level > MAX_LEVEL) return XP_TO_LEVEL[MAX_LEVEL];
  if (level <= 0) return XP_TO_LEVEL[0];
  return XP_TO_LEVEL[level - 1];
}

// donor IsWorthReward: no XP and no award if charmed recently, controlled, nobody hit it, or any gainer is staff or grey con.
function isWorthReward(npc: Npc, gainers: Gainer[]): boolean {
  if (npc.charmedRecently || npc.controlled) return false;
  if (gainers.length === 0) return false;
  return !gainers.some((g) => g.staff || g.greyToNpc);
}

function campPercent(npc: Npc): number {
  let pct: number;
  if (npc.nowMs - npc.spawnTimeMs > CAMP_WINDOW_MS) {
    pct = CAMP_FULL;
    npc.campBonus = 0.95;
  } else {
    pct = CAMP_FULL * npc.campBonus;
    if (npc.campBonus >= 0.05) npc.campBonus -= 0.05;
  }
  if (npc.inDungeon) pct *= 1.2;
  if (pct < 0.01) return 0;
  if (pct > CAMP_FULL) return CAMP_FULL;
  return pct;
}

// Per-kill split. Grouped gainers take the full NPC value; solo gainers take their damage share.
// Returns the XP each gainer is owed before rates (rates are applied when the XP is granted).
function splitKill(
  npc: Npc,
  gainers: Gainer[],
  killerId: number,
  highest: { level: number; con: number } | undefined,
  livingXp: (level: number) => number,
  levelFromCon: (level: number, con: number) => number,
): Map<number, number> {
  if (!isWorthReward(npc, gainers)) return new Map<number, number>();
  const inRange = gainers.filter((g) => g.inRange);
  const totalDamage = gainers.reduce((t, g) => t + g.damage, 0);
  const groupSize = new Map<number, number>();
  for (const g of inRange) {
    if (g.groupId !== null) groupSize.set(g.groupId, (groupSize.get(g.groupId) ?? 0) + 1);
  }
  const groupInRange = inRange.some((g) => g.groupId !== null && g.id !== killerId);
  const awards = new Map<number, number>();

  for (const g of gainers) {
    if (!g.inRange) continue;
    const grouped = g.groupId !== null && groupSize.has(g.groupId);
    let base = grouped ? npc.xpValue : Math.floor(npc.xpValue * (g.damage / totalDamage));

    let cap = livingXp(g.level) * (grouped && groupInRange ? GROUP_CAP_PCT : XP_CAP_PCT) / 100;
    if (highest !== undefined && highest.con < 0) cap = livingXp(levelFromCon(g.level, highest.con)); // challenge code replaces the cap
    base = Math.min(base, Math.floor(cap));

    const camp = Math.floor(base * campPercent(npc)); // decays once per gainer, as in the donor loop
    const group = grouped ? Math.floor(GROUP_STEP * base * (groupSize.get(g.groupId as number) ?? 0)) : 0;
    let total = base + camp + group;
    if (!g.alive) total = Math.floor(total * 0.25);
    if (total > 0) awards.set(g.id, total);
  }
  return awards;
}

// Grants XP to a player. Rates apply to the base only; extras are added after the hard cap.
function grantXp(p: Player, base: number, extras: number, allowMultiply: boolean, xpRate: number, hardCapPct: number, livingXp: (level: number) => number): number {
  let amount = base;
  if (allowMultiply) {
    amount = Math.floor(amount * xpRate);
    const hardCap = Math.floor(livingXp(p.level) * hardCapPct / 100);
    if (amount > hardCap) amount = hardCap;
  }
  amount += extras;

  const floor = p.secondStage
    ? 1 + xpToReach(p.level) + Math.floor((xpToReach(p.level + 1) - xpToReach(p.level)) / 2)
    : xpToReach(p.level);
  if (p.xp + amount < floor) amount = floor - p.xp; // a loss never takes XP below the floor

  p.xp += amount;
  if (amount >= 0) {
    const secondFloor = 1 + xpToReach(p.level) + Math.floor((xpToReach(p.level + 1) - xpToReach(p.level)) / 2);
    if (p.level >= 5 && !p.advanced) {
      // blocked until class advancement; XP is still stored
    } else if (p.level >= 40 && p.level < MAX_LEVEL && !p.secondStage && p.xp >= secondFloor) {
      p.secondStage = true;
    } else if (p.level < MAX_LEVEL && p.xp >= xpToReach(p.level + 1)) {
      p.level += 1; // one step per call; a zero-XP call catches up one more level
    }
  }
  return amount;
}
