// Licence: CC0-1.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; }

interface PendingRespawn {
  ownerId: number;
  unitData: unknown;        // snapshot taken before the unit died
  endTurnsElapsed: number;
  durationEndTurns: number; // donor: 1
}

interface Board {
  cols: number;
  rows: number;
  isFree(p: Pos): boolean;  // on board and unoccupied (donor: isOnBoard + obstruction check)
  place(p: Pos, ownerId: number, unitData: unknown): void;
}

// Called at the moment a unit is killed by the respawn effect: the snapshot is queued, not placed.
function queueRespawn(pending: PendingRespawn[], ownerId: number, unitData: unknown): void {
  pending.push({ ownerId, unitData, endTurnsElapsed: 0, durationEndTurns: 1 });
}

// Called once per end turn. Only the authoritative side chooses a cell; non-authoritative sessions do not (donor flag, replay not read).
function onEndTurn(pending: PendingRespawn[], board: Board, isAuthoritative: boolean, rng: () => number): void {
  for (const r of pending) {
    if (isAuthoritative) {
      const free: Pos[] = [];
      for (let x = 0; x < board.cols; x++) {
        for (let y = 0; y < board.rows; y++) {
          if (board.isFree({ x, y })) free.push({ x, y });
        }
      }
      if (free.length > 0) {
        const pick = free[Math.floor(rng() * free.length)];
        board.place(pick, r.ownerId, r.unitData);
      }
      // no free cell: nothing is placed and the entry is still removed below (donor behaviour)
    }
  }

  // duration phase, after the queue drains: count the end turn, expire entries at their duration
  for (const r of pending) r.endTurnsElapsed += 1;
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].endTurnsElapsed >= pending[i].durationEndTurns) pending.splice(i, 1);
  }
}

export {};
