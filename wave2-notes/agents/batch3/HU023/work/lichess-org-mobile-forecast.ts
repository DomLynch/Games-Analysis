// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Move = string; // one action id; the donor uses UCI pairs

export const MAX_PLIES = 30;

const startsWith = (line: readonly Move[], prefix: readonly Move[]): boolean =>
  prefix.length <= line.length && prefix.every((m, i) => line[i] === m);

export class Forecast {
  constructor(
    readonly onMyTurn: boolean,
    readonly lines: readonly (readonly Move[])[] = [],
  ) {}

  // Two lines collide when the player to act cannot take both branches at the first point they differ.
  private collides(a: readonly Move[], b: readonly Move[]): boolean {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        return this.onMyTurn ? i !== 0 && i % 2 === 0 : i % 2 === 1;
      }
    }
    return false; // one is a prefix of the other: not a collision
  }

  // Cut to MAX_PLIES first, then make the line end on the viewer's own action.
  // Fix: the donor applies the parity step before truncating, so a long line can end on the wrong side.
  private truncate(line: readonly Move[]): Move[] {
    let t = line.slice(0, MAX_PLIES);
    const endsOnMine = this.onMyTurn ? t.length % 2 === 1 : t.length % 2 === 0;
    if (!endsOnMine) t = t.slice(0, -1);
    return t;
  }

  isCandidate(line: readonly Move[]): boolean {
    const c = this.truncate(line);
    if (c.length < (this.onMyTurn ? 1 : 2)) return false;
    return !this.lines.some(l => startsWith(l, c)); // no saved line already extends it
  }

  add(line: readonly Move[]): Forecast {
    const c = this.truncate(line);
    if (!this.isCandidate(c)) return this;
    const kept = this.lines.filter(l => !(startsWith(c, l) || this.collides(l, c)));
    return new Forecast(this.onMyTurn, [c, ...kept]); // newest first
  }

  // A move was played (by either side): lines that start with it keep their tail, the rest are dropped.
  playMove(move: Move): Forecast {
    const kept = this.lines
      .filter(l => l[0] === move)
      .map(l => l.slice(1))
      .filter(l => l.length > 0);
    return new Forecast(!this.onMyTurn, kept);
  }
}

export {};
