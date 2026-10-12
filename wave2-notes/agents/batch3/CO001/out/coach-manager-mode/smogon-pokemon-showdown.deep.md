# smogon-pokemon-showdown (coach-manager-mode, cell 37)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/room-battle.ts` (symbol `RoomBattleTimer`; also `sim/side.ts` `autoChoose`) | Licence: MIT (LICENSE file: "The MIT License (MIT)", Copyright 2011-2026 Guangcong Luo and other contributors) | TypeScript | symbol `RoomBattleTimer`

Checked: verdict STRONG, confidence high for the three clocks, the refill, the disconnect clock and the default-or-forfeit path (read end to end: server/room-battle.ts 41-52, 163-215, 268-460; sim/side.ts 552-640 (move auto-choose, read to the auto branch), 915-950 (switch), 1031-1062 (team preview), 1280-1296 (choice dispatch), 1359-1379 (autoChoose); sim/battle.ts 2980-2994; sim/dex-formats.ts 304-341; data/rulesets.ts 718-757). camera_scope: n/a. NOT read: how the `>slot default` stream line is parsed beyond the dispatch at side.ts 1290-1293; open team sheets (`wantsOpenTeamSheets`, room-battle.ts 63); the source of `battle.requestCount`; per-format timer rules beyond the rule table; the forfeit ending path. Note: this donor is a turn-based battle server, not a real-time fight. Its value for us is the timer and command budget shape, not the battle rules.

## 1. Mechanism

- Three clocks per player (room-battle.ts 65-97). The bank (`secondsLeft`) is the total time left for the whole battle. The turn clock (`turnSecondsLeft`) is the time left for the current decision. The disconnect clock (`dcSecondsLeft`) runs only while the player is away.
- Start. Bank = `starting + grace` (209): ladder `starting` = 150 (45, 197), grace 60 (48), so 210 s. Challenge `starting` = 300 (47). The disconnect clock starts at 300 in bank mode (211, bank mode = challenge only, 196). Outside bank mode, `checkActivity` sets it to 60 when the player drops (403), or to 600 ("arbitrary large number", 405-406) when `dcTimer` is off.
- Refill, once per new turn (updateTurn 289-307). The bank gets `addPerTurn` (10 for singles, 25 for other game types, 199), capped at `starting` (306). So grace is never refilled above the cap. Accelerate is on by default for ladder singles with no format timer rule (203). Then, after turn 100 the refill loses one tick (296-297; 10 becomes 5). After turn 200 the refill is 0 whenever `floor(requestCount / 2)` is odd (300-301), otherwise it stays at 5.
- Decision (nextRequest 309-342). The turn clock is `min(bank, cap)` (326-327), where cap = `maxFirstTurn` on the first request, else `maxPerTurn` (150 ladder, 300 challenge; 200). Grace = bank minus `starting`, shown to the player (330-332).
- Tick (nextTick 343-389). Fixed tick, `TICK_TIME` = 5 s (41), re-armed as `setTimeout(..., TICK_TIME * 1000)` (387). Each tick, a connected player (352) loses 5 s from the bank and the turn clock (353-354). A disconnected player loses 5 s from the disconnect clock (356); unless the bank mode is on, the bank and turn clock also lose 5 s (357-359). If the disconnect clock is at or below 0, the turn clock is set to 0 (364-365).
- Timeout (checkTimeout 438-460). If every player's turn clock is at or below 0 and auto-choose is off (or every bank is spent), the battle is a tie (441-444). Otherwise each player whose turn clock is at 0 is handled: if auto-choose is on, the bank is above 0 and the player is connected (451), the server sends the default choice (452). Anything else forfeits with "lost due to inactivity" (455).
- The default choice (sim/side.ts). Auto-choose for a move takes the first enabled move in slot order (628-637, the check at 630). For team preview it takes the roster in order, trimmed to the picked size (1046; 1361-1362). For a switch with no forced switch it passes (936), otherwise it takes the first bench slot that is not fainted and not already switched in (938). The revival-blessing branch (932-934) is not read in full. `makeChoices()` with no arguments auto-chooses every side (battle.ts 2989-2990, then commits).
- Picked team size (team preview, dex-formats.ts 336-341): 4 for doubles and rotation, 6 for triples, otherwise 3.
- Format timer rules (dex-formats.ts 306-334) override the defaults: starting, grace, addPerTurn, maxPerTurn, maxFirstTurn, timeoutAutoChoose (rule at 328-329), accelerate (331-332). The DC bank rule is the defect below.

## 2. Key functions

- `RoomBattleTimer` constructor: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/room-battle.ts` 179-213 (settings: starting, grace, addPerTurn, maxPerTurn, timeoutAutoChoose, accelerate; starting bank per player at 209).
- `updateTurn`: same file 269-308 (refill per new turn; accelerate schedule 293-303; cap at starting 306).
- `nextRequest`: same file 309-342 (turn clock = min(bank, cap); grace display).
- `nextTick`: same file 343-389 (the drain; disconnect rules 356-365; re-arm at 387).
- `checkActivity`: same file 390-437 (disconnect clock set on disconnect, 403-406).
- `checkTimeout`: same file 438-460 (tie, default, forfeit).
- `Side.autoChoose`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/side.ts` 1360-1379 (default by request state).

## 3. Numbers vs mechanism

Table rows (name | what | formula | ranges | file:line)

| Row | What | Formula | Ranges | file:line |
|---|---|---|---|---|
| Total bank | time for the whole battle | start = starting + grace; refill per turn; cap = starting | ladder 150 + 60 = 210 s; challenge 300 + 60 = 360 s | room-battle.ts:45-52, 197, 209 |
| Refill per turn | bank gained at a new turn | `addPerTurn` capped at starting | 10 s singles; 25 s other game types | room-battle.ts:199, 306 |
| Accelerate (singles, default rule) | refill schedule | base 10; after turn 100 minus 5; after turn 200 zero on alternate request steps | 10 -> 5 -> 0 or 5 | room-battle.ts:203, 293-303 |
| Per-decision cap | longest one decision may take | min(bank, maxFirstTurn or maxPerTurn) | ladder 150 s; challenge 300 s | room-battle.ts:200-201, 326-327 |
| Tick | drain step | fixed 5 s per tick; re-armed every 5 s | 5 s | room-battle.ts:41, 353-356, 387 |
| Disconnect clock | time away before the turn ends | 60 s (dcTimer on); 600 s (dcTimer off); bank mode 300 s | 60 / 600 / 300 s | room-battle.ts:51-52, 403-406, 211 |
| Disconnect drain | what drains while away | dc clock always; bank and turn unless bank mode | 5 s per tick | room-battle.ts:356-359 |
| Disconnect ends turn | turn ends with the dc clock | turn = 0 when dc <= 0 | n/a | room-battle.ts:364-365 |
| Auto-choose gate | default choice allowed | timeoutAutoChoose AND bank > 0 AND connected | default off; format rule turns on | room-battle.ts:202, 441, 451; dex-formats.ts:328-329; data/rulesets.ts:752-757 |
| Default move | what auto-choose plays | first enabled move in request order | per the request's move list | sim/side.ts:628-637 (check at 630) |
| Default team | what auto-choose picks in team preview | roster order, trimmed to picked size | size 3 / 4 (doubles, rotation) / 6 (triples) | sim/side.ts:1046, 1361-1362; dex-formats.ts:336-341 |
| Default switch | what auto-choose does on a switch | pass if nothing forced; else first non-fainted bench slot | n/a | sim/side.ts:936-938 |
| Forfeit | loss on time | `forfeitPlayer(..., lost due to inactivity)` | n/a | room-battle.ts:455 |
| Tie | all out | every turn clock at 0 and auto-choose off (or all banks spent) | n/a | room-battle.ts:441-444 |
| Command budget (coach mapping) | seconds a coach may spend per fight | bank 210 s, refill 10 s per round, cap 150 s per decision | as above | room-battle.ts:199, 209, 306, 326-327 |

Not in the table, not read: hiring, scouting screens, stat sheets, fatigue and injury (not present in this battle server; the battle data is in sim/).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one player (refill then decision cap; tick drain with the disconnect rules and the turn-ends-on-dc rule; timeout as default or forfeit). It omits the donor's tie check across all players, the stream write of the default line, the per-request counter (passed in as a flag), the debug output, the `wait` states, and the bank-mode disconnect data which is taken as a flag.

```ts
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
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/CO001-showdown-coach-clock.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/coach-clock.ts` (new engine module): the coach's command budget. One bank per coach per bout, a refill per round, a cap per command, a disconnect clock, and a default-or-forfeit outcome. The clock is server-side; the client only displays it.
- Parity-checklist row 5 (controls/input): coach command intake and its budget.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this note is from the mechanism only)
- Brief rule served: 5 (controls/input, command intake on the server); 1 (one engine: the clock lives in the engine, not the client); 2 (default choice is an AI brain rule)

## 6. Gaps and risks

- Defect 1 (the DC bank rule is wired to the wrong key): the rule `dctimerbank` (dex-formats.ts 313-314) sets `timer.dcTimer = true`, not `timer.dcTimerBank`. The rule text says the setting is "hardcoded in server/room-battle.ts" (data/rulesets.ts:722), and there the bank is set only from the challenge type (room-battle.ts:196). So the rule cannot turn the bank on for a ladder format. Fix: our clock takes `dcBank` as an explicit data field per bout type; a test asserts the bank flag, not a side effect. The sketch keeps the flag explicit.
- Defect 2 (comment and code disagree on the accelerate schedule): the comments say "15s/turn -> 10s/turn" (295) and "10s/turn -> 7s/turn" (299). With the singles base of 10 (199) the code gives 10 -> 5 after turn 100 (296-297), and 0 or 5 alternating after turn 200 (300-301). The comments describe a different base. Fix: keep the numbers in the data table, not in comments, and test the schedule.
- Defect 3 (the drain is counted per tick, not by measured time): every tick drains exactly 5 s (353-356) and the next tick is armed for 5 s (387). `lastTick` is written at 340 and never read. So when server timers run late, the bank drains less than wall time and the displayed clock falls behind real time. Fix: drain by measured server dt (clamped, as PAC clamps its step at 50 ms), so a late tick cannot give extra time. This is the server-tick sub-line for row 5: fixed-step intake, not a fixed drain.
- Design point: a disconnect is a forfeit here (checkTimeout only auto-chooses a connected player, 451). The coach-mode owner wants default tactics when the coach is absent, so the forfeit path is rejected for the coach mode. Use the PAC default-fill (range-row order) as the default instead of the Showdown default (first move, roster order).
- The default move is "first enabled move in slot order" (630). That is a poor default for a coach: it ignores targets and cooldowns. Frankendom's default should use the coach's saved preset.
- Scope: this is a turn-based battle server; our fights are real time with MAX_ATTACKERS = 3 and a per-round command budget. The mechanism transfers at the shape level (bank, cap, refill, cost per command); the request-and-response loop does not.
- Not read, so not claimed: open team sheets (room-battle.ts 63) as a scouting rule; the request counter; how the default choice string is parsed beyond the dispatch.

Reuse tag: rewrite-from-idea (MIT; code may be adapted, this note is from the mechanism only)
Brief rule served: 5 (controls/input, command intake on the server); 1 (one engine); 2 (default choice)

Best transferable idea: give each coach a per-bout command bank that refills a fixed amount each round up to a cap, with a per-command cap and a disconnect clock, and resolve an empty bank with a server-side default rather than a free pass.
Decision (proposed): adapt — keep the bank, per-command cap and round refill as the coach command budget, but replace the forfeit-on-disconnect rule with the default-fill, and make the bank flag an explicit data field (the donor's rule is wired to the wrong key).
Acceptance: a coach with a 210 s bank, 10 s refill per round and a 150 s per-command cap issues commands; each round adds 10 s up to the cap; with the bank empty the next command is the coach's saved default and a fight-log row records it; a disconnected coach's clock ends at 60 s and the default is applied, not a forfeit.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No material errors. Imprecision (not applied, wording only): the accelerate default is 'not a challenge and no format timer rule' (room-battle.ts:203), not 'singles' only.
