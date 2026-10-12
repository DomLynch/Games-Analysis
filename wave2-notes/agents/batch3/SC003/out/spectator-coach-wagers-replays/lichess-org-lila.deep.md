# lichess-org-lila (spectator-coach-wagers-replays, cell 2)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/relay/src/main/RelayDelay.scala` (with `RelayRound.scala`, `RelayPush.scala`, `RelayFetch.scala`, `RelayRoundForm.scala`, `RelayApi.scala`) | Licence: GNU AGPL v3 (LICENSE line 1 "GNU AFFERO GENERAL PUBLIC LICENSE"; COPYING.md line 10: "version 3 or (at your option) any later version") | Scala | symbol `RelayDelay`

Checked: Read in full: `modules/relay/src/main/RelayDelay.scala` (all 141 lines), `RelayRound.scala` Sync lines 108-162 (`pollingLag`, `delayMinusLag`), `RelayPush.scala` 30-60 (delayed push), `RelayFetch.scala` 205-225 (source routing). Read in part: `RelayRoundForm.scala` (delay field at line 93 only), `RelayApi.scala` 570-590 (early start window). Callers of `RelayDelay` checked: `RelayFetch.scala` 214-220 is the only caller of `urlSource` / `internalSource`; `delayedUntil` has no caller in the relay module (grep over `modules/`). Confidence: high on the delayed-read order and the numbers (receipts verified); medium on the duplicate-id race (depends on the unique index of the delay collection, not read). Wagers: grep for `wager`, `betting`, `bet` over `modules/`, `app/`, `ui/` found no code. Coach: `modules/coach` read by grep and `CoachProfile.scala`/`CoachEditUi.scala` lines only; the coach module is a profile with a free-text hourly rate, no fight-level pricing and no mid-game instructions (not read in full). Secondary mechanism (TV spotlight, `modules/tv/src/main/ChannelSyncActor.scala`) was read in full and is listed in section 6, not written as a second note (one note per game and category).

Best transferable idea: Show spectators a fight only as it stood a fixed time ago, read from the one record by time (not from a second copy), with the start position shown until the first delayed time, so a spectator with a wager cannot act on what is still live.
Decision (proposed): adapt - take the delayed read and the start-position fallback; drop the second snapshot store and read the one fight record at (now minus delay). Frankendom's one-ledger ruling rules out a copied PGN-style table.
Acceptance: A Pit bout test with a 30 s spectator delay asserts that a view requested at 10 s shows the start state (no hits), and a view at 45 s shows events up to 15 s; the record holds one copy of each event.

## 1. Mechanism

- Source fetch. `RelayFetch.fetchGames` (RelayFetch.scala 212-221) sends each upstream kind through the delayer: internal ids or users go to `internalSource` (214-215), a URL goes to `urlSource` (216). Several URLs are fetched in parallel (217-221).
- Dedup of URL fetches (RelayDelay.scala 59-80). The cache is keyed by URL. A round that has not yet seen the cached result takes it and is added to `seenBy` (73-76); a round that has seen it, or a missing entry, starts a new fetch that only it has seen (78). So several broadcasts on one upstream URL share one fetch until one of them asks twice.
- Delayed branch (`fromSource`, 42-55). Order of operations: (a) fetch the latest games (47-49); (b) read the effective delay `delayMinusLag` (50). If there is none, return the latest games at once (51). Otherwise (c) store the latest games if they changed (53, `putIfNew`: compares the new PGN text with the newest stored one and inserts only when different, 87-95, 90); (d) return the newest stored snapshot whose time is at or before now minus the effective delay (54, `get` at 97-99 and `getPgn` at 104-112, cutoff at 107); if no snapshot is old enough yet, return the latest games reset to the setup position (54: `_ | latest.map(_.resetToSetup)`), so no move is shown.
- Effective delay. `delayMinusLag = delay - pollingLag`, kept only if positive (RelayRound.scala 156-157). `pollingLag` is 1 s for push-fed rounds and 6 s for upstream-pulled rounds (156). The code comment calls the lag an estimate of source polling lag, subtracted from the transmission delay (RelayRound.scala 155).
- Push-fed rounds (RelayPush.scala 43-49). A pushed PGN is delayed by scheduling the push only when it has moves (`ifTrue(games.exists(_.root.children.nonEmpty))` at 44-45, then `scheduleOnce(delay.value.seconds)` at 49); a push with no moves (setup only) goes in at once.
- Countdown (`delayedUntil`, RelayDelay.scala 22-40). For an ongoing round not yet started: the first snapshot with a first move (`pgn` matches `1. `, 114-124), plus the delay (36). If there is none, the round start time, at least now plus the delay (39-40).
- Limits. The form accepts 0 to `RelayDelay.maxSeconds` (RelayRoundForm.scala 93), which is 60 x 60 seconds (RelayDelay.scala 128). The early-start window for an upstream round is 60 minutes plus delay/60, capped at 90 (RelayApi.scala 585).

## 2. Key functions

- `RelayDelay.fromSource`: `/mnt/frankendom-donors/lichess-org-lila/modules/relay/src/main/RelayDelay.scala` 42-55 (order above).
- `RelayDelay.dedupCache.apply`: same file 67-80.
- `RelayDelay.store.putIfNew`: same file 87-95. `store.get` / `getPgn`: 97-112.
- `RelayDelay.delayedUntil`: same file 22-40.
- `Sync.pollingLag` and `delayMinusLag`: `/mnt/frankendom-donors/lichess-org-lila/modules/relay/src/main/RelayRound.scala` 156-157.
- Push delay: `/mnt/frankendom-donors/lichess-org-lila/modules/relay/src/main/RelayPush.scala` 43-49.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Spectators see state from (now minus delay) | Per round, form range 0 to 3600 s (RelayRoundForm.scala 93; RelayDelay.scala 128) |
| Subtract the source's polling lag before reading | Push 1 s, pull 6 s (RelayRound.scala 156) |
| No delay if the lag eats it all | Positive-only rule (RelayRound.scala 157) |
| Store only changes | Compare with the newest stored PGN (RelayDelay.scala 90) |
| Start position until a delayed snapshot exists | Setup reset (RelayDelay.scala 54) |
| Snapshot time key | Key plus whole seconds (RelayDelay.scala 84) |
| Early start | 60 min + delay/60, cap 90 (RelayApi.scala 585) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (store only changes, subtract the lag, read the newest snapshot at or before now minus the effective delay, otherwise the start position) and uses in-memory arrays instead of a collection with string ids. It fixes the countdown: `firstMoveVisibleAtMs` uses the same effective delay as `observe`, where the donor's `delayedUntil` adds the full delay (RelayDelay.scala 36). It adds `prune`, which the donor does not do in this file (no pruning seen in RelayDelay.scala; other files not searched). It omits the URL dedup cache, the parallel source fetch, the PGN-to-games conversion, the 999-game split limit, and the push path. Typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: GNU AGPL v3 (donor LICENSE line 1; COPYING.md line 10). clean-room: shape only, no donor lines copied.
// clean-room
const MAX_DELAY_S = 3600; // form-level cap in the donor (validation), kept here as an engine constant
const FIXED_POLL_LAG_PUSH_S = 1; // donor's pollingLag for push-fed rounds
const FIXED_POLL_LAG_PULL_S = 6; // donor's pollingLag for upstream-pulled rounds

interface Snapshot { atMs: number; state: string; } // one stored copy of the source state, oldest first

class SpectatorDelay {
	private snaps: Snapshot[] = [];

	constructor(
		private readonly delayS: number,            // zone or event data, 0..MAX_DELAY_S
		private readonly lagS: number,              // FIXED_POLL_LAG_*
		private readonly startState: string,        // the position before any move
	) {
		if (delayS < 0 || delayS > MAX_DELAY_S) throw new Error('delay out of range');
	}

	// delay minus the source's polling lag; undefined means no delay is applied (as in delayMinusLag)
	private effectiveS(): number | undefined {
		const s = this.delayS - this.lagS;
		return s > 0 ? s : undefined;
	}

	// One fetch from the source. Store the state only when it changed, then return what a spectator may see now.
	observe(nowMs: number, state: string): string {
		const last = this.snaps[this.snaps.length - 1];
		if (!last || last.state !== state) this.snaps.push({ atMs: nowMs, state });
		const s = this.effectiveS();
		if (s === undefined) return state;
		const cutoff = nowMs - s * 1000;
		for (let i = this.snaps.length - 1; i >= 0; i--) {
			if (this.snaps[i].atMs <= cutoff) return this.snaps[i].state; // newest snapshot old enough
		}
		return this.startState; // nothing is old enough yet: the start position, no moves
	}

	// Time when the first move becomes visible to spectators. The donor adds the full delay here,
	// while observe() subtracts the lag; this uses the same effective delay as observe().
	firstMoveVisibleAtMs(firstMoveAtMs: number): number {
		const s = this.effectiveS() ?? 0;
		return firstMoveAtMs + s * 1000;
	}

	// Frankendom addition (not in donor): drop snapshots that no spectator can ask for any more.
	prune(nowMs: number): void {
		const s = this.effectiveS();
		if (s === undefined) { this.snaps = []; return; }
		const cutoff = nowMs - s * 1000;
		let keepFrom = 0;
		for (let i = 0; i < this.snaps.length; i++) {
			if (this.snaps[i].atMs <= cutoff) keepFrom = i; // keep the newest one at or before the cutoff
		}
		this.snaps = this.snaps.slice(keepFrom);
	}
}

export { SpectatorDelay, MAX_DELAY_S, FIXED_POLL_LAG_PUSH_S, FIXED_POLL_LAG_PULL_S };
```

## 5. Lands in

- TARGET `src/fight/record.ts` (the delayed spectator read: `viewAt(now - delay)` over the one fight record; no second store). Parity-checklist row 19 (fight record / replay). The Pit client only renders the view it is sent; the server applies the delay.
- Reuse tag: adapt-idea (AGPL v3: clean-room; shape only, nothing copied)
- Brief rule served: one ledger (the delayed view is a query on the record, not a copy); server-verified information (the server decides what a spectator may see, so a client cannot read live state).

## 6. Gaps and risks

- Wagers: none in this donor (grep for `wager`, `betting`, `bet` over `modules/`, `app/`, `ui/` found no code). The delay is the only part of spectator integrity here; no wager, odds or payout logic was found or taken.
- Coach: `modules/coach` is a coach profile with an optional free-text hourly rate (CoachProfile.scala; CoachProfileForm.scala 21 `"hourlyRate" -> optional(text(minLength = 3, maxLength = 140))`). No fight-level pricing and no mid-game instructions were found. The module was read by name and in part only.
- Lobby shape: not read for this cell (the pool and matchmaking module `modules/pool` exists, not opened).
- Defect (possible, not run): `idOf` uses whole seconds (RelayDelay.scala 84). Two stored changes for the same key in the same second get the same id, and `putIfNew` (87-95) checks the latest PGN before inserting, so two rounds on one URL racing in the same second could insert the same id. Whether that fails depends on the unique index of `colls.delay`, which I did not read. Fix: a random suffix or a sequence in the id, and sort on the time field.
- Defect (as read): `delayedUntil` adds the full `delay.value` (RelayDelay.scala 36) but `fromSource` returns snapshots at `delay - lag` (51-54). The countdown can run 1 s (push) or 6 s (pull) later than the real reveal. Fix: use the effective delay in `delayedUntil`. The sketch's `firstMoveVisibleAtMs` does this.
- Storage: every changed state is inserted as a full PGN (RelayDelay.scala 93). Nothing in this file removes old snapshots; pruning elsewhere was not searched. Frankendom has one ledger, so store nothing extra: keep the record and prune by the maximum delay.
- Cap: the store splits the snapshot into at most 999 games (RelayDelay.scala 99, `MultiPgn.split(pgn, Max(999))`). Not a Frankendom limit; ignore.
- Secondary mechanism, not written as a note: the TV spotlight (`modules/tv/src/main/ChannelSyncActor.scala`, `Env.scala` 37-38, `Tv.scala` 219-243). A selector runs every 3 s after 12 s (Env.scala 37). Candidates are clocked games that start and match a channel filter, kept for 3 minutes (ChannelSyncActor.scala 32, 57; TvSyncActor.scala 54-60). Engine-flagged accounts are removed from the candidates (66-67). The current game is replaced only if a candidate scores more than 1.17 times the current score (83). Score is each player's stable rating (default 1300) plus a title bonus above 2100 (103-114). Defect as read: the flagged-account filter applies to candidates, not to the game already on air. Best idea for a later note: a spectator spotlight with hysteresis (replace only if 17 percent better) and per-channel freshness windows as data (Tv.scala 219: blitz-class 120 s).
- Not read: the rest of `RelayApi.scala`, the study propagation, the pool module, the TV UI, and the tests.
