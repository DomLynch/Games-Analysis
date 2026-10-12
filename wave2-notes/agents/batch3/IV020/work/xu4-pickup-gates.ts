// Clean-room shape of a location-gated pickup with a capped stack.
// Shape only, written from the donor's gate-then-grant order (GPL-3 donor, no line-by-line translation).
// fix: the grant checks ownership itself (donor relies on its caller); the roll is injected (donor uses rand()).

export type Gate = 'newMoons' | 'fullAvatar' | 'reagentDelay';

export interface PickupDef {
  readonly id: string;
  readonly locationLabel: string; // map label that places the object (zone data)
  readonly kind: 'flag' | 'stack';
  readonly xp: number;            // XP tier for one-time finds (data); stacks award no XP here
  readonly gates: readonly Gate[];
  readonly stackCap?: number;     // consumables: donor caps reagents at 99
}

export interface WorldState {
  readonly newMoons: boolean;
  readonly allKarmaZero: boolean;
  readonly moveBucket: number;    // moves & 0xF0 (bits 4-7 of the low byte): values 0..240 in steps of 16
}

export interface Ledger {
  readonly owned: Set<string>;        // one-time items
  readonly stacks: Map<string, number>; // consumables
  lastGrantBucket: number;            // move bucket at the last grant
  xp: number;
  karma: number;
}

export type SearchResult =
  | { kind: 'nothing' }
  | { kind: 'found'; id: string; dropped: number };

export function conditionsMet(gates: readonly Gate[], w: WorldState, l: Ledger): boolean {
  if (gates.includes('newMoons') && !w.newMoons) return false;
  if (gates.includes('fullAvatar') && !w.allKarmaZero) return false;
  // Reagent delay: no grant while the move bucket equals the bucket of the last grant.
  if (gates.includes('reagentDelay') && w.moveBucket === l.lastGrantBucket) return false;
  return true;
}

// Gate first, then grant. A one-time item already held returns 'nothing' (fix: checked here, not by the caller).
// roll(n) must return 0..n-1.
export function search(
  def: PickupDef,
  w: WorldState,
  l: Ledger,
  roll: (n: number) => number,
): SearchResult {
  if (!conditionsMet(def.gates, w, l)) return { kind: 'nothing' };

  if (def.kind === 'flag') {
    if (l.owned.has(def.id)) return { kind: 'nothing' };
    l.owned.add(def.id);
    l.xp += def.xp;
    l.karma += 1; // placeholder: donor calls adjustKarma(KA_FOUND_ITEM); the amount was not read
    l.lastGrantBucket = w.moveBucket;
    return { kind: 'found', id: def.id, dropped: 0 };
  }

  // Stack: donor grants 2..9 (roll(8) + 2), then caps. The overflow is returned, not lost silently.
  const cap = def.stackCap ?? 99;
  const before = l.stacks.get(def.id) ?? 0;
  const want = before + roll(8) + 2;
  const after = Math.min(want, cap);
  l.stacks.set(def.id, after);
  l.karma += 1; // placeholder, same as above
  l.lastGrantBucket = w.moveBucket;
  return { kind: 'found', id: def.id, dropped: want - after };
}

export {};
