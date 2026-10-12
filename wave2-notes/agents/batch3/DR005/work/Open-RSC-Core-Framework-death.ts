// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

export interface Item {
  id: string;
  amount: number;
  value: number;       // default price per item, from the item definition
  stackable: boolean;
  noted: boolean;
  untradable: boolean;
}

export interface DeathRule {
  keepUnflagged: number;  // protected items when not PvP-flagged (donor: 3)
  keepSkulled: number;    // protected items when skulled (donor: 0)
  prayerExtra: number;    // one more protected item while the protect prayer is on (donor: 1)
  takeCount: number;      // items that move to the killer; Infinity = donor (every unprotected item)
  ownerWindowMs: number;  // only the owner and the killer see a player-owned pile for this long (donor: 64000)
  pileLifeMs: number;     // pile despawns after this long (donor: GAME_TICK * 1000 = 640000)
  respawn: { x: number; y: number }; // respawn tile (donor: one global config point)
}

export interface Pile {
  item: Item;
  ownerId: string | null;   // null = owner-less (NPC killer): visible and takeable by all at once
  untradable?: boolean;     // donor: invisible and untakeable to everyone but the owner, permanently
  killerId: string | null;  // the player who made the kill, who always sees the pile
  spawnedAt: number;
}

// Protected = walk the ranked list, up to N + prayer items, stopping at the first stackable (donor tests isStackable only).
// Noted non-stackable items sort last (key -1) but ARE protectable when fewer than N real items exist.
export function settleDeath(
  inv: Item[],
  victimId: string,
  killerId: string | null,
  killerIronman: boolean,
  skulled: boolean,
  prayerOn: boolean,
  rule: DeathRule,
  nowMs: number,
): { kept: Item[]; piles: Pile[] } {
  // Stacks and noted items sort last (key -1); the rest by default price, highest first.
  const key = (it: Item): number => (it.stackable || it.noted ? -1 : it.value);
  const ranked = [...inv].sort((a, b) => key(b) - key(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // donor: the walk breaks at the first stackable item; a noted non-stackable item does not break it
  let keepable = 0;
  while (keepable < ranked.length && !ranked[keepable].stackable) keepable += 1;
  const n = (skulled ? rule.keepSkulled : rule.keepUnflagged) + (prayerOn ? rule.prayerExtra : 0);
  const protectedCount = Math.min(n, keepable);

  const kept: Item[] = ranked.slice(0, protectedCount);
  const piles: Pile[] = [];
  let takes = 0;

  for (const it of ranked.slice(protectedCount)) {
    if (it.untradable) {
      // untradable stays on the victim's tile, owned by the victim
      piles.push({ item: it, ownerId: victimId, killerId: null, spawnedAt: nowMs, untradable: true });
      continue;
    }
    if (killerId === null) {
      // no player killer: owner-less pile
      piles.push({ item: it, ownerId: null, killerId: null, spawnedAt: nowMs });
      continue;
    }
    if (takes >= rule.takeCount) {
      // adapt: beyond the take count the victim keeps the item (donor drops it)
      kept.push(it);
      continue;
    }
    takes += 1;
    // an ironman killer cannot take: the pile goes to the victim instead (donor rule)
    const ownerId = killerIronman ? victimId : killerId;
    piles.push({ item: it, ownerId, killerId, spawnedAt: nowMs });
  }
  return { kept, piles };
}

// Donor isInvisibleTo/belongsTo for player-owned piles: owner and killer see it at once; others wait the window.
export function canSee(p: Pile, viewerId: string, nowMs: number, rule: DeathRule): boolean {
  if (p.ownerId === null) return true;
  if (p.untradable) return p.ownerId === viewerId; // donor isInvisibleTo: untradable hides before any timer
  if (p.ownerId === viewerId || p.killerId === viewerId) return true;
  return nowMs - p.spawnedAt > rule.ownerWindowMs;
}

export function pileExpired(p: Pile, nowMs: number, rule: DeathRule): boolean {
  return nowMs - p.spawnedAt >= rule.pileLifeMs;
}
