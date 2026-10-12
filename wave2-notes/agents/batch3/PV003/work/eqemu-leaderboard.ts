// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface Row {
  name: string;
  wins: number;
  losses: number;
}

export const REFRESH_MS = 180000; // donor: reload timer, adventure_manager.cpp 39
export const BOARD_SIZE = 100;    // donor: reply cap, adventure_manager.cpp 1357

// Win rate in basis points (10000 = 100.00%). Null when the player has no games.
export function winRateBp(r: Row): number | null {
  const games = r.wins + r.losses;
  if (games === 0) return null;
  return Math.floor((r.wins * 10000) / games);
}

export class Board {
  private base: Row[] = [];
  private byWins: Row[] | null = null; // null = dirty, sorted again on next request
  private byPct: Row[] | null = null;

  // Replace the snapshot. A failed fetch keeps the last good snapshot.
  reload(fetch: () => Row[] | null): boolean {
    const fresh = fetch();
    if (fresh === null) return false;
    this.base = fresh.slice();
    this.byWins = null; // every board is dirty after a reload
    this.byPct = null;
    return true;
  }

  // Sorted once per reload, on the first request for that board.
  top(sort: 'wins' | 'pct', n: number = BOARD_SIZE): Row[] {
    if (sort === 'wins') {
      if (this.byWins === null) {
        this.byWins = this.base.slice().sort((a, b) => b.wins - a.wins);
      }
      return this.byWins.slice(0, n);
    }
    if (this.byPct === null) {
      this.byPct = this.base
        .filter((r) => winRateBp(r) !== null)
        .sort((a, b) => (winRateBp(b) ?? 0) - (winRateBp(a) ?? 0));
    }
    return this.byPct.slice(0, n);
  }
}

export {};
