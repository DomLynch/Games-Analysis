// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Seat { occupant: string | null; }

interface Table {
  seats: Seat[];
  dealer: number;                 // seat index of the dealer
  spectators: string[];           // FIFO queue, first in first out
  spectatorVision: boolean;       // dealer toggle: spectators may see hidden hands
}

const RANGE_TILES = 5;            // donor passes 5 to InRange (InRange body not read; <= 5 assumed)

// First empty seat, starting at the dealer and wrapping round.
function nextSeat(t: Table): number {
  const n = t.seats.length;
  for (let k = 0; k < n; k++) {
    const i = (t.dealer + k) % n;
    if (t.seats[i].occupant === null) return i;
  }
  return -1;
}

// Promote queued spectators into open seats, FIFO, until one side runs out.
function promoteSpectators(t: Table): void {
  for (;;) {
    const seat = nextSeat(t);
    if (seat < 0 || t.spectators.length === 0) return;
    t.seats[seat].occupant = t.spectators.shift()!;
  }
}

// Join: a seated id keeps its seat; otherwise take the next open seat; otherwise queue (no duplicates).
function join(t: Table, id: string): "seat" | "queued" {
  if (t.seats.some(s => s.occupant === id)) return "seat";
  const seat = nextSeat(t);
  if (seat >= 0) { t.seats[seat].occupant = id; return "seat"; }
  if (!t.spectators.includes(id)) t.spectators.push(id);
  return "queued";
}

// Sweep: drop anyone out of range (queue and seats), free their seat, then promote.
// Donor runs this lazily on packets and context menus; here it is meant to run once per server tick.
function sweep(t: Table, distTiles: (id: string) => number): string[] {
  const dropped: string[] = [];
  t.spectators = t.spectators.filter(id => {
    if (distTiles(id) <= RANGE_TILES) return true;
    dropped.push(id);
    return false;
  });
  for (const s of t.seats) {
    if (s.occupant !== null && distTiles(s.occupant) > RANGE_TILES) {
      dropped.push(s.occupant);
      s.occupant = null;
    }
  }
  promoteSpectators(t);
  return dropped;
}

// Per-viewer view of one hidden hand value. Public hands, the owner, and (if the dealer allows it) spectators see it.
function visibleValue(t: Table, handSeat: number | null, isPublic: boolean, value: number, viewer: string): number {
  if (handSeat === null || isPublic) return value;
  if (t.seats[handSeat].occupant === viewer) return value;
  if (t.spectatorVision && t.spectators.includes(viewer)) return value;
  return 0;
}
export {}
