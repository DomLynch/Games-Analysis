// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Piece {
  id: string;
  name: string;
  cost: number;
  x: number;   // board column 0..7
  y: number;   // row, 0 = bench
}

interface Seat {
  uid: string;                 // set from the session at connect time, never from a message
  alive: boolean;
  money: number;
  level: number;
  shop: (string | null)[];     // server-held offer, slot index -> pokemon name
  pieces: Piece[];             // everything this seat owns on bench and board
}

const BOARD_WIDTH = 8;
const BOARD_SIDE_HEIGHT = 4; // row 0 is the bench
const MAX_SIM_DT_MS = 50;

// Team cap is a function of the server's level for this seat, not of anything the client sent.
function teamCap(level: number, crowded: boolean): number {
  return crowded ? level + 3 : level;
}

// Buy intent: the message carries one slot index. Anything else is rejected silently.
function buyFromShop(
  seat: Seat,
  slotIndex: number,
  price: (name: string) => number,
  nextId: () => string
): boolean {
  if (!seat.alive) return false;
  const name = seat.shop[slotIndex];
  if (!name) return false;
  const cost = price(name);
  const benchFree = seat.pieces.filter((p) => p.y === 0).length < 8;
  if (seat.money < cost || !benchFree) return false;
  seat.money -= cost;
  const x = [0, 1, 2, 3, 4, 5, 6, 7].find(
    (col) => !seat.pieces.some((p) => p.y === 0 && p.x === col)
  );
  seat.pieces.push({ id: nextId(), name, cost, x: x ?? -1, y: 0 });
  seat.shop[slotIndex] = null;
  return true;
}

// Drag intent: the message names a piece id and a target cell. The server checks ownership,
// range and the team cap, then either applies the move or asks the client to re-sync that piece.
function moveOnBoard(
  seat: Seat,
  pieceId: string,
  x: number,
  y: number,
  crowded: boolean
): { applied: boolean; resyncBoard: boolean } {
  if (!seat.alive) return { applied: false, resyncBoard: false };
  const piece = seat.pieces.find((p) => p.id === pieceId);
  const inRange =
    x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_SIDE_HEIGHT;
  if (!piece || !inRange) return { applied: false, resyncBoard: true };

  const target = seat.pieces.find((p) => p.x === x && p.y === y);
  const fromBench = piece.y === 0;
  const onBoardCount = seat.pieces.filter((p) => p.y > 0).length;
  const full = onBoardCount >= teamCap(seat.level, crowded);
  // Bench piece onto an empty board square while the team is at its cap: refused.
  if (fromBench && y > 0 && !target && full) {
    return { applied: false, resyncBoard: true };
  }
  piece.x = x;
  piece.y = y;
  return { applied: true, resyncBoard: false };
}

// Server tick: the step length is measured, then clamped, so a stall advances the sim by at most 50 ms.
function stepSimulation(measuredDtMs: number, sim: (dtMs: number) => void): void {
  sim(Math.min(MAX_SIM_DT_MS, measuredDtMs));
}

export {};
