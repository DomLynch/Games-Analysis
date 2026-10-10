// Licence: MIT (donor LICENSE). Written as a shape sketch of the join handshake; not a line-by-line port.
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no 0/O/1/I
const ROOM_CODE_LENGTH = 5;

export function newRoomCode(rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)];
  }
  return code;
}

export interface Snapshot { tick: number; state: unknown; }

export interface Joiner {
  id: string;
  isCreator: boolean;
  hasPeerSnapshot: boolean;   // set once a peer snapshot is accepted (first wins)
  snapshot: Snapshot | null;  // what the client currently holds
}

// Step 1 of a join: the stored room snapshot is the starting state (may be seconds old).
export function loadStoredSnapshot(j: Joiner, stored: Snapshot): void {
  j.snapshot = stored;
}

// Step 2: peers answer the join with a snapshot addressed to the joiner.
// Accept only if addressed to us, not from ourselves, not a creator, and no peer snapshot yet.
export function acceptPeerSnapshot(j: Joiner, msg: { to: string; from: string; snap: Snapshot }): boolean {
  if (msg.to !== j.id || msg.from === j.id) return false;
  if (j.isCreator || j.hasPeerSnapshot) return false;
  j.hasPeerSnapshot = true;
  j.snapshot = msg.snap;
  return true;
}

export {};
