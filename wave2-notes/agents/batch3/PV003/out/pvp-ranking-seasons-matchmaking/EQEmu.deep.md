# EQEmu (pvp-ranking-seasons-matchmaking, cell 2)

Donor: `/mnt/frankendom-donors/EQEmu/world/adventure_manager.cpp` (LoadLeaderboardInfo 1096-1171, DoLeaderboardRequest 1174-1245, DoLeaderboardRequestPercentage 1343-1372, comparators 958-1091) | Licence: GPL-3.0 (repo LICENSE.md, GNU GPL version 3) | C++ | symbol `LoadLeaderboardInfo`

Checked: Read `LoadLeaderboardInfo` 1096-1146 directly; lines 1147-1170 (the push and flag reset lines) were seen only as grep output of lines containing "leaderboard", and 1171 (closing brace) was not read; the timer and update loop (36-75), the win and win-rate comparators (958-1000 and the other theme comparators by grep), `DoLeaderboardRequest` cases 1-8 (1174-1245), and `DoLeaderboardRequestPercentage` up to the place loop (1343-1372). Read `world/world_boot.cpp` 382 (boot call) and `zone/client_packet.cpp` 12293-12318 (PvP leaderboard handler). Callers of `LoadLeaderboardInfo`: two (boot, and the timer at adventure_manager.cpp 73). Confidence: high on the load, sort and serve path; the claim that the percentage sort never reorders is derived from the predicate (not run). Not read: the body of `DoLeaderboardRequestWins` and the other theme reply functions, the packet send after line 1372, and the `adventure_stats` table schema. This board covers adventure win counts, not PvP rating; the PvP board is a stub (below). Camera: not applicable.

## 1. Mechanism

- A live board is a server-side snapshot of one table, rebuilt on a timer and served from memory. Timer: 180000 ms (adventure_manager.cpp 39), checked in the manager's periodic update (71-74). The board is also built once at world boot (world/world_boot.cpp 382).
- Reload (`LoadLeaderboardInfo`, 1096-1171): first clears all twelve lists (1098-1109). Then one SQL join of `adventure_stats` with `character_data` (1111-1113). If the query fails it returns at once (1114-1116), with the lists already empty (defect D1 below). For each row: skip rows with no name (1120-1121). Overall wins = sum of five theme win columns (1125-1134); overall losses = sum of five theme loss columns (1135-1144). The same row is pushed into twelve lists: wins and win-rate for the overall board, and for each of five themes (guk, mir, mmc, ruj, tak) (1146-1157). After the push, every "sorted" flag is set to false (1159-1170).
- Lazy sort: `DoLeaderboardRequest` sorts a list only when its flag is false, then sets the flag true (for example 1179-1183 for wins, 1187-1191 for win-rate). So each board is sorted at most once per reload, on the first request after it.
- Predicates: wins board: more wins first, `lbi1.wins > lbi2.wins` (959-962), no tie-break. Win-rate board: basis points, `wins * 10000 / (wins + losses)` (971), with 10000 as the value when a player has no games (967-968; 969-977). Result: `per1 > per2` (978).
- Serve: `DoLeaderboardRequestPercentage` walks at most 100 entries (1357). The requester's place (`place = i`, 1362) is set only inside that loop, so a player below 100 is not given a place (place stays -1, 1352).
- Order of operations on a reload: clear, query, fill twelve lists, mark all sorts dirty. On a request: sort if dirty, then slice the first 100.
- Tick: timer-driven, not per frame. Synchronous inside the manager's update.
- PvP board (not this mechanism): `Handle_OP_PVPLeaderBoardRequest` (zone/client_packet.cpp 12293-12318) documents three sort modes (kills, points, infamy, 12297-12299) and then sends an empty reply, with the comment `// TODO: Record and send this data.` (12314). So the donor has no PvP ranking or leaderboard data.

## 2. Key functions

- `LoadLeaderboardInfo`: `/mnt/frankendom-donors/EQEmu/world/adventure_manager.cpp` 1096-1171. Clear, query, fill, dirty flags.
- `pred_sort_by_win_percentage`: `/mnt/frankendom-donors/EQEmu/world/adventure_manager.cpp` 965-979. Basis-point win rate, with the defect at 976.
- `DoLeaderboardRequest`: `/mnt/frankendom-donors/EQEmu/world/adventure_manager.cpp` 1174-1245. Lazy sort per board, then serve.
- `DoLeaderboardRequestPercentage`: `/mnt/frankendom-donors/EQEmu/world/adventure_manager.cpp` 1343-1372. Top 100 reply, requester place.
- Timer: `/mnt/frankendom-donors/EQEmu/world/adventure_manager.cpp` 39 and 71-74.
- PvP stub: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 12293-12318.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Timed snapshot of one table, served from memory until the next reload | 180000 ms refresh (theirs, adventure_manager.cpp 39) |
| Sort each board once per reload, on first request, dirty flags reset on reload | None (the flag, 1159-1170 and 1179-1183) |
| Win rate as an integer in basis points, `wins * scale / games` | Scale 10000 (theirs, 967, 971) |
| Player with no games gets the top value | 10000 (theirs, 967-968): a 0-0 record sorts as 100% (defect D3) |
| Capped reply with the requester's own place | Cap 100 (theirs, 1357) |
| Several boards from one row set | Five themes plus overall = twelve lists (theirs, 1146-1157) |
| Win-rate comparator | Writes the second player's value into `per1` (976, defect D2) |

Derived consequence (not run): because `per1` is at most 10000 and `per2` stays at 10000 (976-978), `per1 > per2` is never true, so the win-rate predicate returns false for every pair and the percentage board is never reordered.

## 4. TypeScript sketch

simplified: keeps the donor shape (one snapshot per reload, lazy sort per board on first request, dirty flags reset on reload, top-N reply). Omits the SQL, the five theme boards and the requester's place lookup. Changes three donor behaviours on purpose: a failed fetch keeps the last good snapshot (D1: the donor clears first and returns at 1114-1116); the win-rate board drops players with no games instead of giving them 10000 (D3), and it uses one correct comparator for both sides (D2, 976). Uses one base array and two index arrays instead of twelve copies (1146-1157). Basis points use `Math.floor`, which equals C++ integer division for non-negative counts.

```ts
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
```

## 5. Lands in

- TARGET `origins/server/leaderboard.ts` (new, server-side read model over the fight-record ledger; the board is read-only and the client never writes it). Parity-checklist row 19 (fight record / replay): the board reads the server-verified results recorded per fight. No row covers leaderboards directly; row 19 is the closest.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one ledger, server-verified results); copyleft clean-room; rule 8 satisfied by the row-19 target above.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- The donor board is adventure win counts, not PvP. The PvP board is a stub (zone/client_packet.cpp 12314). Frankendom's ladder board needs the rating from the ACEmulator-ACE note (`src/fight/ladder.ts`); this board only shows what the ladder writes.
- Staleness: the board can be up to 180 s old (39, 71-74). Frankendom calls this "live": decide whether a timed snapshot is enough or whether a recorded result should mark the board dirty.
- Defect D1 (fix: build the new list, swap on success): the donor clears twelve lists (1098-1109) before the query (1111-1113) and returns on failure (1114-1116), so one failed query empties every board until the next timer. The sketch keeps the last good snapshot.
- Defect D2 (fix: `per2` at 976 and the same line in each of the five other win-rate comparators, 999, 1022, 1045, 1068, 1091): the second value is written into `per1`, so the win-rate sort never reorders (derived). Frankendom must test its comparator on a sample with known order.
- Defect D3 (fix: exclude no-game rows or sort them last): a player with 0 wins and 0 losses gets 10000 (967-968) and sorts as a perfect record. The sketch excludes them.
- Gap G1 (no tie-break, 961): players with equal wins sort in whatever order the list holds. Frankendom needs a fixed tie-break (for example earliest result, then name) so the board does not reshuffle on a reload.
- Gap G2 (requester place, 1352, 1357, 1362): a player below 100 has no place in the reply. Phone UI needs "your rank" outside the top 100, which the donor cannot give.
- Ruling check: one character and one ledger. The board must read the same ledger the rating step writes, not a separate stats table like `adventure_stats`.
- Phone: 100 rows is more than a 375-wide list shows at once; the page size, not the cap, should drive the UI.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one ledger, server-verified results); copyleft clean-room.

Best transferable idea: a timed server snapshot of the results, sorted lazily once per reload per board, with the win rate in basis points and no-game players kept off the rate board.
Decision (proposed): adapt - keep the snapshot and lazy-sort shape for ladder rows, but fix the failed-reload, comparator and no-game defects and add a tie-break, because a board that empties or reorders wrongly on a reload is worse than a stale one.
Acceptance: a server test asserts that a failed reload leaves the previous list on screen, that the win-rate board never lists a player with 0 games, that a 2-0 record (100%) ranks above a 3-1 record (75%) on the rate board, and that two players with equal wins keep a fixed order across reloads.
