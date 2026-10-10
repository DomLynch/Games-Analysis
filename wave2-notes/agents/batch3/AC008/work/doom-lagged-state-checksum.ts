// Licence: unclear (donor file header: "DOOM Source Code License as published by id Software"; donor LICENSE.TXT is GPL-2.0 text). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const RING = 12;          // donor: BACKUPTICS = 12 (slots in the ring)
type Desync = { playerId: number; tic: number; got: number; want: number };

class LaggedStateChecksum {
  private ring: number[][]; // [player][slot], each slot holds a 16-bit signed summary

  constructor(players: number) {
    this.ring = Array.from({ length: players }, () => new Array<number>(RING).fill(0));
  }

  // Build side: the value this node attaches to its own command for `tic` (donor: G_BuildTiccmd reads the slot).
  attachFor(tic: number, ownId: number): number {
    return this.ring[ownId][tic % RING];
  }

  // Run side: compare the command's value with this node's own slot, then overwrite the slot with this tic's summary.
  // Donor order: compare first, store second. The check is skipped for the first RING tics.
  verifyAndStore(playerId: number, tic: number, got: number, localState: number): Desync | null {
    const slot = tic % RING;
    const want = this.ring[playerId][slot];
    let report: Desync | null = null;
    if (tic > RING && got !== want) {
      report = { playerId, tic, got, want };
    }
    this.ring[playerId][slot] = (localState << 16) >> 16; // truncate to a 16-bit signed value, as the donor's short does
    return report;
  }
}

export {};
