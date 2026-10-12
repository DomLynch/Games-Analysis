// Licence: GPL-3.0 (donor EQEmu). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Pt = { x: number; y: number };
export type KillerKind = "npc" | "pvp" | "duel";
export type LootMode = "none" | "one" | "all" | "defined";

export interface DeathRules {
  leaveCorpses: boolean;      // rule LeaveCorpses
  nakedCorpses: boolean;      // rule LeaveNakedCorpses
  itemLossLevel: number;      // rule DeathItemLossLevel
  expLossMinLevel: number;    // rule DeathExpLossLevel
  expLossMaxLevel: number;    // rule DeathExpLossMaxLevel
  keepLevel: boolean;         // rule DeathKeepLevel
  resWindowS: number;         // rule CorpseResTime, seconds
  duelResWindowS: number;     // rule DuelCorpseResTime, seconds
}

export interface DeathOutcome {
  xpLost: number;
  corpse: boolean;
  itemsToCorpse: boolean;
  rezWindowS: number;
}

// Order: XP loss first, then the corpse decision. The killer kind must come from the server.
export function resolveDeath(
  level: number, xp: number, xpAtLevelFloor: number, killer: KillerKind, r: DeathRules,
): DeathOutcome {
  let xpLost = Math.floor(level * (level / 18) * 12000);
  if (level < r.expLossMinLevel || level > r.expLossMaxLevel || killer !== "npc") xpLost = 0;
  if (r.keepLevel) xpLost = Math.min(xpLost, Math.max(0, xp - xpAtLevelFloor));
  const itemsToCorpse = r.leaveCorpses && level >= r.itemLossLevel;
  const corpse = itemsToCorpse || r.nakedCorpses;
  const rezWindowS = killer === "duel" ? r.duelResWindowS : r.resWindowS;
  return { xpLost, corpse, itemsToCorpse, rezWindowS };
}

export interface CorpseItem { id: string; topLevel: boolean; }
export interface PlayerCorpse {
  owner: string;
  claimedBy: string | null;   // first non-owner looter
  mode: LootMode;             // set from the PvP reward at death
  definedId: string | null;   // item for mode "defined"
  items: CorpseItem[];
  rezXp: number;              // XP held on the corpse for a full rez
  alreadyRezzed: boolean;     // corpse gate: rezzed once already
}

// Non-owner take. "one", "all" and "defined" only take top-level items (bag contents stay).
// Any take except "all" closes the corpse to everyone else.
export function takeFromCorpse(c: PlayerCorpse, who: string, index: number): string | null {
  const it = c.items[index];
  if (!it) return null;
  if (who === c.owner) { c.items.splice(index, 1); return it.id; }
  if (c.claimedBy !== null && c.claimedBy !== who) return null;
  if (c.mode === "none") return null;
  if (!it.topLevel) return null;
  if (c.mode === "defined" && it.id !== c.definedId) return null;
  c.claimedBy = who;
  c.items.splice(index, 1);
  if (c.mode !== "all") c.mode = "none";
  return it.id;
}

// XP returned by a rez. A corpse already rezzed gives no XP (corpse gate).
export function rezXpReturned(c: PlayerCorpse): number {
  return c.alreadyRezzed ? 0 : c.rezXp;
}

// Rez clock runs only while the owner is online; it pauses when they leave.
export function tickRezClock(remainingS: number, dtS: number, ownerOnline: boolean): number {
  return ownerOnline ? Math.max(0, remainingS - dtS) : remainingS;
}

// Hover window choice: "rez" puts HP at one fifth at the corpse; "bind" goes to the bind point.
export function hoverRespawn(
  choice: "rez" | "bind", maxHp: number, corpse: Pt | null, bind: Pt,
): { at: Pt; hp: number | null } {
  if (choice === "rez" && corpse) return { at: corpse, hp: Math.floor(maxHp / 5) };
  return { at: bind, hp: null };
}

// Summon a corpse to the caster. A spell summon skips consent and distance.
export function canSummonCorpse(viaSpell: boolean, isOwner: boolean, consented: boolean, distSq: number): boolean {
  if (viaSpell) return true;
  if (!isOwner && !consented) return false;
  return distSq <= 10000; // 100 units, squared
}
export {};
