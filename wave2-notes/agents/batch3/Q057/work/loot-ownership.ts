// Licence: MIT (donor, LostCityRS-Engine-TS). clean-room
// Sketch of the ownership and reveal shape of dropped piles. Not a line-by-line translation.
export {};

const PUBLIC = -1;          // no owner: anyone can see and take the pile
const REVEAL_TICKS = 100;   // owner-only window; zone or encounter data in Frankendom
const PILE_CAP = 129;       // piles per zone before the oldest is evicted; zone data in Frankendom

interface Pile {
  itemId: number;
  count: number;
  stackable: boolean;
  tradeable: boolean;
  owner: number;            // player id, or PUBLIC
  revealIn: number;         // ticks until the pile goes public; -1 = not counting
  despawnIn: number;        // ticks until the pile is removed
}

interface Zone { piles: Pile[]; }   // array order = insertion order, oldest first

type PileEvent = 'revealed' | 'stays-private' | 'despawned';

function removePile(zone: Zone, pile: Pile): void {
  const i = zone.piles.indexOf(pile);
  if (i !== -1) zone.piles.splice(i, 1);
}

// Drop a pile. owner = the dropper or killer, or PUBLIC for a drop to everyone.
function addPile(zone: Zone, itemId: number, count: number, stackable: boolean, tradeable: boolean,
                 owner: number, despawnTicks: number, stackLimit: number): Pile {
  const duration = Math.max(1, despawnTicks);

  // Stackable piles of the same item and owner on this tile merge; the merged pile restarts its timer.
  if (stackable) {
    const existing = zone.piles.find(p => p.itemId === itemId && p.owner === owner);
    if (existing && existing.count + count <= stackLimit) {
      existing.count += count;
      existing.despawnIn = duration;
      return existing;
    }
  }

  // Full zone: evict the oldest pile. Static (non-despawning) piles are not modelled here.
  if (zone.piles.length >= PILE_CAP) {
    zone.piles.shift();
  }

  const pile: Pile = {
    itemId, count, stackable, tradeable, owner,
    revealIn: owner === PUBLIC ? -1 : REVEAL_TICKS,
    despawnIn: duration,
  };
  zone.piles.push(pile);
  return pile;
}

// Visibility (the donor's per-player update filters): a private pile is only shown to its owner.
function isVisibleTo(pile: Pile, player: number): boolean {
  return pile.owner === PUBLIC || pile.owner === player;
}

// Pickup gate: returns the count taken, or 0 if refused (not present, empty, or not allowed for this player).
// Donor: a non-owner is refused only while the reveal countdown runs (revealIn > -1); ownerOnlyForever = true is the stricter Frankendom rule.
function takePile(zone: Zone, pile: Pile, player: number, ownerOnlyForever: boolean): number {
  if (!zone.piles.includes(pile) || pile.count < 1) return 0;
  const refused = ownerOnlyForever ? !isVisibleTo(pile, player)
                                   : pile.revealIn > -1 && pile.owner !== PUBLIC && pile.owner !== player;
  if (refused) return 0;
  const taken = pile.count;
  removePile(zone, pile);
  return taken;
}

// One server tick for one pile: reveal countdown first, then despawn countdown.
function tickPile(zone: Zone, pile: Pile): PileEvent[] {
  const events: PileEvent[] = [];
  if (!zone.piles.includes(pile)) return events;

  if (pile.revealIn > 0) {
    pile.revealIn -= 1;
    if (pile.revealIn === 0) {
      pile.revealIn = -1;
      if (pile.tradeable) {
        pile.owner = PUBLIC;
        events.push('revealed');
      } else {
        // Untradeable piles keep their owner and stay private until they despawn.
        events.push('stays-private');
      }
    }
  }

  if (pile.despawnIn > 0) {
    pile.despawnIn -= 1;
    if (pile.despawnIn === 0) {
      removePile(zone, pile);
      events.push('despawned');
    }
  }
  return events;
}
