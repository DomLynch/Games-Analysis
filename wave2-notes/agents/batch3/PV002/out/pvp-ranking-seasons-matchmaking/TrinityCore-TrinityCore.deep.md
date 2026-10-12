# TrinityCore-TrinityCore (pvp-ranking-seasons-matchmaking, cell 2)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Battlegrounds/ArenaTeam.cpp` | Licence: GNU GPL v2 (as read: COPYING line 1 "GNU GENERAL PUBLIC LICENSE", Version 2, June 1991) | C++ | symbols `ArenaTeam::GetRatingMod`, `ArenaTeam::WonAgainst`, `BattlegroundQueue::Update` (arena branch)

Checked: Opened in the read ranges: ArenaTeam.cpp 36-41, 120-145, 500-660 (team-rating path in full); the member bodies MemberLost/MemberWon were NOT read in full, only their matching lines via grep (667-679, 693-701, 707-728 region, partly read), so the per-member personal-rating step is described from those lines only; ArenaTeam.h 166-174; Arena.cpp 119-128 and 140-200; BattlegroundQueue.cpp 156-170, 345-370, 862-975; ArenaTeamMgr.cpp 79-88; GameEventMgr.cpp 985-1015. Grep only, not opened: BattlegroundMgr.cpp 593-604 (getters, opened as grep lines), World.cpp 824-830 and 920-923 (config defaults, grep lines), CharacterHandler.cpp 1231-1234 (season info sent to client). Confidence: high for the rating formulas and the pairing window (read end to end). Medium-high for the match-end wiring, which is broken in this copy (see section 6). The season reset: none found (grep); the week-counter reset `FinishWeek` was found afterwards. Camera scope: not applicable.

## 1. Mechanism

- Two ratings per team and per member. The team rating is the ladder number (`Stats.Rating`). The matchmaker rating (MMR) is a second number that only decides who is paired with whom and is written back after each match. Each member also has a personal rating (`PersonalRating`).
- Pairing (BattlegroundQueue.cpp 879-975). The anchor is the rating of the team that just joined. If no team just joined (`arenaRating` is 0), the anchor is the front of the premade queue that has waited longest (879-897). The window is anchor +/- MaxRatingDifference (903-904, default 150). The discard time is now minus RatingDiscardTimer (910, default 10 minutes). A waiting team is eligible if its MMR is inside the window OR it joined before the discard time (925-926 and 948-949). So after 10 minutes of waiting the rating is ignored and any team pairs. Pools are the two premade queues; if only one team is found the same queue is scanned for the second (the `found == 1` branch).
- Win chance (ArenaTeam.cpp 534-538): `chance = 1 / (1 + 10^((opp - own) / 650))` (computed as exp(ln10 x (opp - own) / 650)). Elo-style logistic on a 650 scale.
- MMR change (541-564): `mod = (won ? 1 : 0) - chance`, times the MMR modifier (default 24, World.cpp 923), then `ceil`.
- Team rating change (567-594): on a win, the modifier depends on own team rating: below 1000 it is W1 (48); from 1000 to 1299 it tapers linearly from W1 to W1/2 (`(W1/2) + (W1/2)(1300 - own)/300`, 586); at 1300 and above it is W2 (24). Change = modifier x (1 - chance), then `ceil`. On a loss the change is `-L x chance` (L = 24, 592), then `ceil`. The donor's own comments in GetMatchmakerRatingMod and GetRatingMod say the formula is a simulation with not much known about how the real system works.
- Settlement order, as written (Arena.cpp 165-192, if the guard passes): (a) `WonAgainst` (or `LostAgainst`) computes the MMR change, then the team rating change, then calls `FinishGame(change)` which floors the rating at 0 (599-604), adds one week game and one season game (613-614), and recomputes the rank as 1 plus the number of same-type teams with a higher rating; (b) both MMRs are written back (183-184); (c) each member's personal rating moves by `GetRatingMod(personal, opponentMMR, won)` (667, 715), floored at 0 (440-448), and their MMR moves by the team's MMR change (MemberWon/MemberLost, 452-458).
- Starting values: team rating 0 (World.cpp 828), MMR 1500 (830), personal rating from config `CONFIG_ARENA_START_PERSONAL_RATING` if above 0, else 1000 if the team rating is already 1000 or more, else 0 (ArenaTeam.cpp 126-130).
- Leave penalty (BattlegroundQueue.cpp 358-368): if a group leaves a rated queue after being invited to the match, the team gets `MemberLost(player, opponentMMR)` with the default MMR change of -12 (ArenaTeam.h 173). Intended as a dodge penalty.
- Season: `GameEventMgr::StartArenaSeason` (GameEventMgr.cpp 987-1008) looks up the season's event id in the world DB table `game_event_arena_seasons` (SQL not read) and starts that game event. No code resets ratings, MMR or season counters. The one periodic reset is the weekly one: `ArenaTeam::FinishWeek` (ArenaTeam.cpp 777-795) zeroes the team's and every member's week games and week wins, and is called from `Player::ResetCurrencyWeekCap` (Player.cpp 7259). Season counters are set to 0 only when a team is created (ArenaTeam.cpp 36-37), and loaded from DB (201-205).

Tick: not a per-frame loop. Pairing runs in `BattlegroundQueue::Update` (called from the BG manager's scheduled queue update, BattlegroundMgr.cpp 135-136, not read beyond that line). Settlement runs once, at match end.

## 2. Key functions

- `ArenaTeam::GetChanceAgainst`: ArenaTeam.cpp 534-538 (read).
- `ArenaTeam::GetMatchmakerRatingMod`: ArenaTeam.cpp 541-565 (read).
- `ArenaTeam::GetRatingMod`: ArenaTeam.cpp 567-595 (read); called from WonAgainst 630, LostAgainst 650, and MemberLost/MemberWon for personal ratings 667, 693, 715.
- `ArenaTeam::FinishGame`: ArenaTeam.cpp, after GetRatingMod (read).
- `ArenaTeam::WonAgainst` / `LostAgainst`: ArenaTeam.cpp around 623-657 (read).
- `ArenaTeam::MemberLost` / `MemberWon`: ArenaTeam.cpp 659-731 (partly read: header to 659 and matching lines via grep; bodies not read in full).
- `BattlegroundQueue::Update`, arena branch: BattlegroundQueue.cpp 879-975 (read; pool invite code after 975 not read).
- `Arena::EndBattleground`: Arena.cpp 140-200 (read).
- `GameEventMgr::StartArenaSeason`: GameEventMgr.cpp 987-1008 (read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Logistic win chance, Elo shape: `1 / (1 + 10^((opp - own)/S))` | S = 650 (theirs, ArenaTeam.cpp 538) |
| Win reward scales with (1 - chance); loss penalty scales with chance; zero-sum-ish | W1 48 below 1000, W2 24 at 1300+, L 24 (theirs, World.cpp 920-922; tiers 1000 and 1300 at ArenaTeam.cpp 579, 583) |
| Linear taper between two rating tiers | Taper from W1 at 1000 to W1/2 at 1300 (theirs, ArenaTeam.cpp 586) |
| Separate matchmaking number from the displayed rating | MMR start 1500 (theirs, World.cpp 830); MMR modifier 24 (theirs, World.cpp 923) |
| Pairing window around an anchor rating | Half-width 150 (theirs, World.cpp 824; BattlegroundQueue.cpp 903-904) |
| Widening valve: after a wait, ignore the rating | Discard after 10 min = 600000 ms (theirs, World.cpp 825) |
| Floor at zero for every rating | 0 (theirs, ArenaTeam.cpp 600-601, 440-441, 454-455) |
| Forced loss for leaving after an invite | MMR change -12 (theirs, ArenaTeam.h 173) |

Rounding: every change is `ceil`'d (ArenaTeam.cpp 564 and 594). For a loss, `ceil(-L x chance)` is 0 whenever `L x chance < 1`, i.e. chance < 1/24 (about 0.042). In the team-rating change the chance is computed against the opponent's MMR number, so this threshold is set by that scale.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's chance formula, win tiers, loss formula, floor at zero and the pairing window with the discard valve. It differs from the donor in three places, all marked in the code: (1) it carries the fractional part of each change instead of `ceil`, so small losses are not lost; (2) it takes the opponent's team rating (not MMR) for the team-rating change, which is the number the donor's queue already stores as `OpponentsTeamRating` (BattlegroundQueue.cpp 969); (3) it uses one queue and anchors on the first queued team, where the donor uses two premade pools and an anchor that is the joining team's MMR when a team has just joined. It omits the MMR writeback, the member personal ratings, the leave penalty, the rank loop, and the week and season counters.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described rule, not a translation of the donor lines.
// clean-room
interface Queued {
  teamRating: number;       // team rating (season ladder number)
  mmr: number;              // matchmaker rating (separate, drives pairing)
  joinMs: number;           // time the team joined the queue
}

interface Ledger { points: number; carry: number; }

// Data fields (donor defaults in comments; all tunable per zone or per season)
const SCALE = 650;          // chance = 1 / (1 + 10^((opp - own) / SCALE))
const WIN_LOW = 48;         // win modifier below TIER_LOW
const WIN_HIGH = 24;        // win modifier at or above TIER_HIGH
const LOSE_MOD = 24;        // loss modifier, applied as -LOSE_MOD * chance
const TIER_LOW = 1000;
const TIER_HIGH = 1300;
const MAX_MMR_DIFF = 150;   // pairing window half-width
const DISCARD_MS = 10 * 60 * 1000; // after this wait, rating is ignored for pairing

function chanceAgainst(own: number, opp: number): number {
  return 1 / (1 + Math.pow(10, (opp - own) / SCALE));
}

// Win modifier by rating tier; linear taper from WIN_LOW at TIER_LOW to half of it at TIER_HIGH.
function winModifier(own: number): number {
  if (own >= TIER_HIGH) return WIN_HIGH;
  if (own < TIER_LOW) return WIN_LOW;
  return WIN_LOW / 2 + (WIN_LOW / 2) * (TIER_HIGH - own) / (TIER_HIGH - TIER_LOW);
}

// Exact (fractional) change for one result. The opponent argument is the opponent's TEAM rating (donor passes MMR).
function exactChange(own: number, opp: number, won: boolean): number {
  const c = chanceAgainst(own, opp);
  return won ? winModifier(own) * (1 - c) : -LOSE_MOD * c;
}

// Fix for the donor's ceil(): keep the fraction in a carry so small losses are not lost.
function settle(ledger: Ledger, change: number): Ledger {
  const exact = change + ledger.carry;
  const whole = Math.trunc(exact);
  return { points: Math.max(0, ledger.points + whole), carry: exact - whole };
}

function inWindow(anchorMmr: number, c: Queued, nowMs: number): boolean {
  if (c.joinMs < nowMs - DISCARD_MS) return true;   // waited past the discard timer
  return c.mmr >= Math.max(0, anchorMmr - MAX_MMR_DIFF) && c.mmr <= anchorMmr + MAX_MMR_DIFF;
}

// The longest-waiting team sets the window; the first two teams inside it are paired.
function pickPair(queue: Queued[], nowMs: number): [number, number] | null {
  if (queue.length === 0) return null;
  const anchor = queue[0];
  const pool = queue.filter(c => inWindow(anchor.mmr, c, nowMs));
  if (pool.length < 2) return null;
  return [queue.indexOf(pool[0]), queue.indexOf(pool[1])];
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/pv002-trinity-arena-rating.ts): exit 0, no output.

## 5. Lands in

- TARGET `src/fight/ladder.ts` (new module: rating and pairing for ranked duels, written once at fight end from the server's fight result). Parity-checklist row 19 (fight record / replay): the rating change is computed from the recorded result, and the fight record is what proves it. Frankendom's current ladder code: (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only; no donor lines)
- Brief rule served: 1 (one ledger: rating writes happen once, on the server, after the server-verified result). Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the described rule.
- Match-end wiring is missing in this copy. In `Arena::EndBattleground` the two team pointers `winnerArenaTeam` and `loserArenaTeam` are declared `nullptr` (Arena.cpp 162-163; the same pattern at 119-120) and the guard at 165 needs both non-null. Nothing in Arena.cpp or the Battlegrounds folder assigns them (grep). So in this copy the rated settlement block (176-192 and the member updates) never runs, and no rating changes after a match. The formulas above are read; the path from a finished match to them is not present. Fix: look the team up by id from `sArenaTeamMgr` before the guard, and test the guard.
- Leave penalty looks up the team with the literal id 0 (BattlegroundQueue.cpp 360, also 354 and 163). Team ids come from `NextArenaTeamId++` (ArenaTeamMgr.cpp 86); the initial value of `NextArenaTeamId` was not read. If 0 is never issued, the forced-loss penalty never fires. Fix: pass the queued team's id.
- Rounding defect: `ceil` on every change makes a win always at least 1 point (any positive change under 1 rounds up to 1) and makes a loss 0 whenever the change is above -1 (chance under 1/24). The asymmetry is not stated anywhere. Fix: carry the fraction (sketch `settle`).
- Wrong scale in the team-rating change: `WonAgainst` and `LostAgainst` pass the opponent's MMR as the opponent number (ArenaTeam.cpp 630, 650), although the queue stores the opponent's team rating (BattlegroundQueue.cpp 969). Fix: pass the opponent team rating for the team change; keep MMR for the MMR change.
- Tier constants 1000, 1300 and 300 are hard-coded in GetRatingMod (ArenaTeam.cpp 579-586). Fix: make them season data.
- No season reset in the code. Ratings and season counters carry over forever; the season is only a game-event switch (GameEventMgr.cpp 987-1008); season counters are never zeroed except at team creation (ArenaTeam.cpp 36-37). A weekly reset of the week counters does exist (`FinishWeek`, ArenaTeam.cpp 777-795, called at Player.cpp 7259); it does not touch ratings. The `Arena.ArenaSeason.InProgress` flag is only read for the client's season info (CharacterHandler.cpp 1231-1234, grep only). Frankendom needs an explicit season reset as data (rating soft-reset, rank rows kept).
- Rank is recomputed inside FinishGame by looping over every team of that type (O(teams) per match). Acceptable at small scale; not a problem for the one-engine rule.
- Discard valve is a time, not a rating-window widening. After 10 minutes anyone pairs with anyone, so a long queue can produce very large rating gaps. Fix: widen the window in steps (for example by 50 per minute with a cap) and keep the valve as the last step, or accept the donor's behaviour and show the gap to players.
- Also found: a match that ends with no winner (time limit) takes `ARENA_TIMELIMIT_POINTS_LOSS` = -16 off both teams through `FinishGame` (Arena.cpp 206-213; Battleground.h 217). It sits in the same block as the unwired winner and loser pointers, so it is also dead in this copy. As a rule it transfers: a stalled ranked duel costs both sides a fixed amount.
- The donor's own comment says the change formula is a simulation with no published basis. Treat the numbers as tunable defaults, not as a known system.

Best transferable idea: a logistic win chance on a 650 scale, with the win bonus tiered by rating and the loss penalty proportional to the chance, paired inside a rating window that is dropped after a wait time, with the fraction carried so small changes are not lost.
Decision (proposed): adapt - the ranked-duel ladder and the wait-widening window fit our live leaderboards and scheduled duels; the 650 scale, the tiers and the constants become season data, the ceil is replaced by a carried fraction, and the team change uses the opponent's team rating, not MMR.
Acceptance: over 24 ranked losses to a player 900 points stronger, a player's ladder points drop by a whole number total equal to the carried exact sum (not zero), the score never goes below 0, and a queued duel with a 150 gap pairs immediately while a 400 gap pairs only after the 10-minute discard, shown in the queue status.

Reuse tag: rewrite-from-idea (GNU GPL-2.0; clean-room, shape only)
Brief rule served: 1 (one ledger: one server write per fight end; the client reads the result)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Claim: 'No season reset and no week reset in the code ... week and season counters are never zeroed except at team creation (ArenaTeam.cpp 36-37)' and 'season/week reset: none found'. Real: ArenaTeam::FinishWeek (ArenaTeam.cpp 777-795, declared ArenaTeam.h:176) zeroes team WeekGames/WeekWins and every member's WeekGames/WeekWins, called from Player::ResetCurrencyWeekCap (Player.cpp ~7259). Rating and season counters are indeed never reset, so the season half holds. Minor: personal starting rating omitted the config CONFIG_ARENA_START_PERSONAL_RATING path (ArenaTeam.cpp 126-127). All formula and wiring claims verified: GetChanceAgainst 534-538 (650 scale), MMR mod 541-565, GetRatingMod 567-595 (tiers 1000/1300, taper 586, ceil 594), FinishGame 597-621, WonAgainst/LostAgainst pass opponent MMR (630, 650), MemberWon/Lost 667/715, Floors 440/454, Arena.cpp nullptr teams 119-120/162-163 with guard 123/165 and no assignment anywhere (grep confirms), leave penalty id 0 at BattlegroundQueue.cpp 163/354/360 with default -12 (ArenaTeam.h:173), pairing 879-975 (anchor, window 903-904, discard 910, 925-926, 948-949, OpponentsTeamRating 969), World.cpp 824/825/828/830/920-923, StartArenaSeason 987-1008, COPYING GPL v2.
Missed: Arena.cpp 206-213: when no winner (time limit), both teams take ARENA_TIMELIMIT_POINTS_LOSS = -16 via FinishGame (Battleground.h:217); also FinishWeek as the only periodic reset. Both are simple, directly transferable rules the note did not cover.

Fixed 2026-10-12 (Sonnet fixer): week reset corrected (FinishWeek exists, verified ArenaTeam.cpp 777-795 and Player.cpp 7259; season half still holds); personal starting rating config path added (126-130); time-limit -16 rule added as Also found (Arena.cpp 206-213). No sketch change.
