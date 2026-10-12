// Licence: MIT (donor). Code may be adapted; this sketch is a rewrite from the described mechanism.
interface ClockSettings {
  starting: number;        // bank cap, seconds (donor: 150 ladder, 300 challenge)
  grace: number;           // extra seconds given at start, above the cap (donor: 60)
  addPerTurn: number;      // bank refill at each new turn, seconds (donor: 10 singles, 25 longer formats)
  maxPerTurn: number;      // cap for one decision, seconds (donor: 150 ladder, 300 challenge)
  maxFirstTurn: number;    // cap for the first decision of the game, seconds (0 = use maxPerTurn)
  tickS: number;           // one tick, seconds (donor: 5, fixed)
  dcTimeoutS: number;      // disconnect clock, seconds (donor: 60 ladder)
  dcBank: boolean;         // true: a disconnected player's bank and turn do not drain (donor: challenge)
  timeoutAutoChoose: boolean; // donor default is false; a format rule turns it on
}

interface PlayerClock {
  bank: number;       // total seconds left
  turn: number;       // seconds left for this decision
  dc: number;         // disconnect seconds left
  knownActive: boolean;
  eliminated: boolean;
}

type TimeoutOutcome = "none" | "default" | "forfeit";

// Start: bank = starting + grace; the turn clock starts equal to the bank.
function startClock(s: ClockSettings): PlayerClock {
  const bank = s.starting + s.grace;
  return { bank, turn: bank, dc: s.dcTimeoutS, knownActive: true, eliminated: false };
}

// New turn: refill the bank by addPerTurn, capped at starting (grace is never refilled above starting).
function refillOnNewTurn(c: PlayerClock, s: ClockSettings): void {
  c.bank = Math.min(c.bank + s.addPerTurn, s.starting);
}

// New decision request: the turn clock is the bank, capped by the per-decision cap.
function beginDecision(c: PlayerClock, s: ClockSettings, firstOfGame: boolean): void {
  const cap = (firstOfGame ? s.maxFirstTurn : 0) || s.maxPerTurn;
  c.turn = Math.min(c.bank, cap);
}

// One fixed tick. Connected players drain the bank and the turn clock; disconnected players drain the
// disconnect clock, and also the bank and turn unless dcBank is set. A spent disconnect clock ends the turn.
function tick(c: PlayerClock, s: ClockSettings): void {
  if (c.eliminated) return;
  if (c.knownActive) {
    c.bank -= s.tickS;
    c.turn -= s.tickS;
  } else {
    c.dc -= s.tickS;
    if (!s.dcBank) {
      c.bank -= s.tickS;
      c.turn -= s.tickS;
    }
  }
  if (c.dc <= 0) c.turn = 0;
}

// simplified: the donor first checks whether every player is out (then a tie), and it sends the default
// choice through the battle stream. This sketch returns the outcome for one player only.
function checkTimeout(c: PlayerClock, s: ClockSettings): TimeoutOutcome {
  if (c.eliminated || c.turn > 0) return "none";
  if (s.timeoutAutoChoose && c.bank > 0 && c.knownActive) return "default";
  return "forfeit";
}

// Accelerate schedule. The donor applies it only when the format has no timer rule of its own.
// simplified: the every-other-request zeroing is passed in as a flag (the donor reads a request counter).
function addPerTurnAt(turn: number, base: number, tickS: number, accelerate: boolean, zeroThisRound: boolean): number {
  let add = base;
  if (accelerate && add) {
    if (turn > 100 && add > tickS) add -= tickS;
    if (turn > 200 && zeroThisRound) add = 0;
  }
  return add;
}

export {};
