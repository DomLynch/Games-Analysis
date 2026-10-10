// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Action = "fold" | "check" | "call" | "bet" | "raise" | "allin";
type Verdict = "VALID" | "INVALID_STATE" | "NOT_YOUR_TURN" | "NOT_ALLOWED" | "IGNORED";

interface Seat { id: number; set: number; cash: number; }
interface Table {
  round: number;      // the server's current betting round
  turnId: number;     // seat id whose turn it is
  highest: number;    // highest bet this round
  minRaise: number;
  blind: number;      // small blind
}
interface Intent { round: number; playerId: number; action: Action; bet: number; }

// The rule for one action (the donor's checkMyAction shape). bet is the amount the client sent.
function ruleOk(t: Table, s: Seat, a: Action, bet: number): boolean {
  switch (a) {
    case "fold": return true;
    case "check": return s.set === t.highest;
    case "call": {
      if (!(s.set < t.highest && bet <= s.cash)) return false;
      if (s.cash + s.set >= t.highest) return bet === t.highest - s.set; // not all-in
      return bet === s.cash;                                             // short stack: whole stack
    }
    case "bet": return t.highest === 0 && bet <= s.cash && bet >= 2 * t.blind;
    case "raise": return t.highest > 0 && bet >= t.minRaise && bet <= s.cash;
    case "allin": return bet === s.cash;
  }
}

// Order: stale round, then turn, then the rule. The intent is checked as sent and never rewritten.
// Only a VALID result may change table state; every other result is a reply with a reason and no change.
function validate(t: Table, seat: Seat | undefined, i: Intent): Verdict {
  if (!seat) return "IGNORED";                     // spectators: no reply, as in the donor
  if (i.round !== t.round) return "INVALID_STATE";
  if (i.playerId !== t.turnId) return "NOT_YOUR_TURN";
  if (!ruleOk(t, seat, i.action, i.bet)) return "NOT_ALLOWED";
  return "VALID";
}

// Timer expiry for the player on turn: check if nothing is owed, otherwise fold.
function onTimeout(t: Table, seat: Seat): Action {
  return t.highest === seat.set ? "check" : "fold";
}
export {}
