# heroiclabs-nakama (progression, cell 10)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_leaderboard.go` (with `server/core_tournament.go`, `server/db.go`, `migrate/sql/20180805174141-tournaments.sql`) | Licence: Apache License 2.0 (LICENSE file, "Apache License Version 2.0, January 2004"; source headers "Copyright 2018 The Nakama Authors") | Go + SQL | symbols `LeaderboardRecordWrite` (score write with operators) and `TournamentRecordWrite` (attempt-capped tournament write)

Checked: No XP, level or skill progression is in this repo. The only progression references are the Hiro permission and console flags (`console/acl/acl.go` 159-168, read by grep only; `server/console_extensions.go` 47-51, read) and a test RPC notification (`data/modules/clientrpc.lua` 51, read, a fixture string). I opened and read: `server/core_leaderboard.go` 415-580 (score write, end to end), `server/core_tournament.go` 77-150 and 422-636 (attempt top-up, join, tournament write, end to end for the write path), `server/db.go` 308-360 (transaction helper), `server/leaderboard_cache.go` 40-130 (operator and sort-order definitions), the tournament migration line 25, and `data/modules/tournament.lua` (grep). Callers: the write path has two callers in `server/api_leaderboard.go` 202 and `server/api_tournament.go` 364 (the client API, read by grep only) and runtime wrappers in Go, Lua and JS (read by grep only). Confidence: high on the write rules; medium that this is "progression" (it is points accrual per board and period, the closest real mechanism in this repo). Depth: full for the score write and the attempt cap; the rank cache and the tournament list/records paths were not read. Camera: not applicable.

## 1. Mechanism

A board row per owner, per board, per reset period holds a score, a subscore (tie-break), a count of writes and an attempt cap. One write call applies an operator, and the rules differ for ordinary boards and for tournaments.

Ordinary board (`LeaderboardRecordWrite`, 415-580). Order of steps: (1) board must exist (416-418, cache lookup); (2) an authoritative board refuses writes from a user caller (uuid.Nil is the trusted runtime caller); (3) the period end is the next reset time from the board's cron schedule (427); (4) the operator is the board's default unless the call overrides it (430-443; 4 operators: best, set, incr, decr; unknown values refused at 442); (5) the SQL differs per operator: incr adds the delta (454) and is skipped when the delta is zero (455); decr subtracts and floors at zero with GREATEST (461-462); set overwrites and is skipped when both values are unchanged (469); best takes the greater value (desc, 483) or lesser (asc, 479), and is skipped unless a value is strictly better (484, 480). (6) The upsert also sets `num_score = num_score + 1` (495), but the filter sits in the same statement, so a skipped write does not count. (7) If no row came back (filter failed) the stored row is read back (542) and marked unchanged; otherwise the rank is inserted into the rank cache (rank for unchanged rows is looked up instead).

Tournament (`TournamentRecordWrite`, 422-635). Same operator rules (464-489) with two differences. (a) Every submission counts, including ones that do not beat the stored value: the join-required UPDATE has no operator filter (its only WHERE gate is the attempt gate at 529), and the open branch counts before checking (559, 563). (b) The attempt cap is `max_num_score` on the row, where 0 means unlimited (migration default 1000000, line 25). Join-required tournaments (527-535): the UPDATE carries the gate `(max_num_score = 0 OR num_score < max_num_score)` (529); the code then runs the UPDATE and checks only for an error (531-536), never the number of rows updated, so a capped write returns no error and the stored row is read back (605) and returned unchanged. Open tournaments (else branch from 538 to 590): the upsert has no gate; inside one transaction the code computes the new count (559-563) and returns `ErrTournamentWriteMaxNumScoreReached` when count > cap (568-570); the transaction helper commits only if the callback returns nil (`server/db.go` 333-334), so that error rolls the write back. Board size (open branch 574-582; join branch 154-160): a row that is new (count <= 1) takes a slot with `size < max_size` in SQL; a full board refuses the new row.

Attempt top-up (`TournamentAddAttempt`, 77-109): the caller adds `count` to `max_num_score` on the owner's row (101), only while the tournament window is open (96). This is how an extra attempt is sold or granted without changing the score.

Tick and timing: none. The write is a single request-driven call; the reset is a cron schedule that picks the expiry timestamp (427). No loop, no accumulator.

## 2. Key functions

- `LeaderboardRecordWrite`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_leaderboard.go` 415-580. Operator choice 430-443, per-operator SQL 454-484; upsert with filter 490-496; unchanged read-back 542.
- `TournamentRecordWrite`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_tournament.go` 422-635. Window check 436-438; operator 441-462; join-required gate 527-536; open-path count and cap 559-572; size guard 574-582; read-back 605.
- `TournamentAddAttempt`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_tournament.go` 77-109 (window check 96, top-up 101).
- `ExecuteInTx` (commit only on nil callback): `/mnt/frankendom-donors/heroiclabs-nakama/server/db.go` 308-336.
- Operator and sort-order definitions: `/mnt/frankendom-donors/heroiclabs-nakama/server/leaderboard_cache.go` 40-130 (best = 0, set, incr, decr; `GetOperator` maps to "best", "set", "incr").

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Incr with no-op on zero delta | Filter `$8 <> 0 OR $9 <> 0` (core_leaderboard.go 455) |
| Decr floored at zero | GREATEST(score - delta, 0) (461; tournament 470) |
| Set writes only on change | Filter `score <> $4 OR subscore <> $5` (469) |
| Best keeps the better value per field, writes only when a field is strictly better | GREATEST / LEAST (479, 483) with filters (480, 484) |
| Count accepted writes (ordinary board) vs every submission (tournament) | num_score + 1 (495 vs 528, 542) |
| Attempt cap, 0 = unlimited | Default 1000000 (migration 25); gate at 529; check at 568 |
| Refuse-and-roll-back on cap in a transaction | ErrTournamentWriteMaxNumScoreReached (569-570), commit only on nil (db.go 333-334) |
| Board population cap by SQL guard | max_size (574; join 154) |
| Period from cron | ResetSchedule.Next (427) |

No tick, timer or per-frame numbers are involved.

## 4. TypeScript sketch

simplified: the sketch models one existing row (no new-row insert path, which seeds the score from the submitted value and not from zero), the four operators with the donor's no-op filters, the ordinary-board count (only accepted writes), and the open-tournament count (every submission) with the cap check after the write. It omits the authoritative caller check, the reset cron, the rank cache, the size guard, the join-required branch (which silently skips over-cap writes instead of returning an error), the transaction retry loop, and the SQL NULL handling for username and metadata.

```ts
// Licence: Apache-2.0 (donor, Copyright 2018 The Nakama Authors). Shape adapted from the donor's write rules; written from the described mechanism.
type Op = 'best' | 'set' | 'incr' | 'decr';

interface Row {
  score: number;
  subscore: number;     // tie-break value, moves with the score
  numScore: number;     // counted writes
  maxNumScore: number;  // attempt cap for a tournament row; 0 = no cap
}

// The new score and subscore for each operator (no gate applied here).
function combine(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): { score: number; subscore: number } {
  switch (op) {
    case 'incr': return { score: row.score + s, subscore: row.subscore + sub };
    case 'decr': return { score: Math.max(row.score - s, 0), subscore: Math.max(row.subscore - sub, 0) };
    case 'set':  return { score: s, subscore: sub };
    case 'best':
      return {
        score: higherIsBetter ? Math.max(row.score, s) : Math.min(row.score, s),
        subscore: higherIsBetter ? Math.max(row.subscore, sub) : Math.min(row.subscore, sub),
      };
  }
}

// True when the write would change nothing (zero delta, same value, or not better).
function isNoOp(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): boolean {
  if (op === 'incr' || op === 'decr') return s === 0 && sub === 0;
  if (op === 'set') return row.score === s && row.subscore === sub;
  return higherIsBetter ? !(row.score < s || row.subscore < sub) : !(row.score > s || row.subscore > sub);
}

// Board: a no-op leaves the stored row and its count untouched; a real change counts one write.
function boardWrite(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): Row {
  if (isNoOp(row, op, s, sub, higherIsBetter)) return row;
  return { ...row, ...combine(row, op, s, sub, higherIsBetter), numScore: row.numScore + 1 };
}

// Open tournament: every submission is counted. If the count passes the cap, the write is refused
// and the caller must discard the change (the donor rolls its transaction back).
function tournamentWrite(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): Row | 'max-attempts' {
  const next: Row = { ...row, ...combine(row, op, s, sub, higherIsBetter), numScore: row.numScore + 1 };
  if (next.maxNumScore > 0 && next.numScore > next.maxNumScore) return 'max-attempts';
  return next;
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new): a server-side score write for a per-period board (personal best per week, or points per duel), in the same server ledger as the XP and loot award. Parity-checklist row 18 (loot roll and XP award).
- today: (not read; no Frankendom file opened from this session)
- Reuse tag: rewrite-from-idea (Apache-2.0: code may be adapted; this sketch is written from the described rules)
- Brief rule served: server-verified (the write, the attempt cap and the refusal run on the server, not the client); one ledger (one conditional write per submission, count and value changed together)
Best transferable idea: a single conditional server write per submission that changes the stored value only when it is a real change, counts accepted attempts, and refuses over-cap submissions inside the same transaction so nothing is kept.
Decision (proposed): adapt - keep the no-op filters, the best/set/incr/decr split and the attempt cap with its refusal in one transaction; reject the Postgres-specific SQL and the silent join-path skip (a refused write must return an error).
Acceptance: A server test submits best-of scores 10, 7 and 12 to a daily board and asserts the stored best is 12 and the count is 3; a fourth submission against a cap of 3 is refused with an error and leaves the stored score and count unchanged.

## 6. Gaps and risks

- No XP, level or skill progression exists here. The Hiro progression system the console refers to is not in this repo (inference from its absence; not checked outside this repo). Frankendom must not read this note as an XP curve.
- Silent skip: in the join-required tournament path an over-cap write returns no error (core_tournament.go 531-536 never checks rows affected; the stored row is read back at 605). A Frankendom write path must return an explicit refusal.
- Client operator override: the client API passes the client's operator into `LeaderboardRecordWrite` (`api_leaderboard.go` 202, read by grep only). On a non-authoritative board a client can choose incr or set. Frankendom must fix the operator on the server, not accept it from the client.
- Authoritative boards refuse user callers (core_leaderboard.go 421-423); runtime calls pass uuid.Nil and bypass that check. Frankendom's server-verified kills need the same split made explicit.
- Open-tournament cap is enforced after the write inside a transaction; it depends on the rollback (db.go 333-334). A non-transactional port would keep the score.
- The count of attempts on open boards includes refused-as-not-better submissions (every submission counts), so a player's cap is spent by losing attempts too. That is a design choice to decide, not a bug.
- Not read: rank cache, list and records paths, the reset/cron helper, `TournamentJoin` body beyond the existence and size checks, and the Lua/JS/Go runtime wrappers beyond their call lines.

