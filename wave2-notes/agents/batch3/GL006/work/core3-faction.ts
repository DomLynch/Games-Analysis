// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Faction standing per faction: a kill raises enemy factions, lowers the victim's faction by twice that, and lowers allies.
// PvP factions (rebel, imperial) are capped by the player's own rank; other PvP factions are capped at 1000.

const STANDING_MIN = -5000;   // data: floor for any faction
const STANDING_MAX = 5000;    // data: cap for non-PvP factions
const PVP_OTHER_CAP = 1000;   // data: cap for the PvP faction the player does not belong to
const PVP = new Set(["rebel", "imperial"]);

interface FactionRow {
  name: string;
  playerAllowed: boolean;
  enemies: string[];
  allies: string[];
  adjust: number;   // per-kill multiplier (data row)
}

type Standing = Map<string, number>;

interface Ctx {
  table: Map<string, FactionRow>;
  standing: Standing;
  ownFaction: string | null;   // the player's PvP faction, if any
  rankCost: number;            // cost of the player's current faction rank (data table, not read)
}

// Rank cap for the player's own PvP faction: max(1000, rank cost * 20).
function rankCap(rankCost: number): number {
  return Math.max(1000, rankCost * 20);
}

function capFor(ctx: Ctx, faction: string): number {
  if (!PVP.has(faction)) return STANDING_MAX;
  return faction === ctx.ownFaction ? rankCap(ctx.rankCost) : PVP_OTHER_CAP;
}

// Gains are clamped to the cap, but a gain never lowers a standing that is already above the cap.
// Fix to the donor: the donor writes min(cap, current + amount), which drops an over-cap value on a zero gain.
function raise(ctx: Ctx, faction: string, amount: number): void {
  const cur = ctx.standing.get(faction) ?? 0;
  const next = Math.max(cur, Math.min(capFor(ctx, faction), cur + amount));
  ctx.standing.set(faction, next);
}

function lower(ctx: Ctx, faction: string, amount: number): void {
  const cur = ctx.standing.get(faction) ?? 0;
  ctx.standing.set(faction, Math.max(STANDING_MIN, cur - amount));
}

// One NPC kill of faction `victim` at `level`.
function awardKill(ctx: Ctx, victim: string, level: number): void {
  const row = ctx.table.get(victim);
  if (!row || !row.playerAllowed) return;

  const gain = level * row.adjust;
  const lose = gain * 2;
  const victimIsPvp = PVP.has(victim);

  for (const e of row.enemies) {
    if (PVP.has(e) && !victimIsPvp) continue;   // PvP standing only moves from PvP kills
    const er = ctx.table.get(e);
    if (!er || !er.playerAllowed) continue;
    raise(ctx, e, gain);
  }

  lower(ctx, victim, lose);

  for (const a of row.allies) {
    if (PVP.has(a)) continue;
    const ar = ctx.table.get(a);
    if (!ar || !ar.playerAllowed) continue;
    lower(ctx, a, lose);
  }
}

// Cries-style bonus: 10 percent of a gain, on top of the faction that is winning.
// Fix to the donor: the donor truncates the bonus to an int, so gains under 10 give nothing.
// Here the bonus stays fractional; the display rounds it.
function coaBonus(ctx: Ctx, faction: string, amount: number): void {
  const bonus = amount * 0.1;
  if (bonus <= 0) return;
  raise(ctx, faction, bonus);
}

export {};
