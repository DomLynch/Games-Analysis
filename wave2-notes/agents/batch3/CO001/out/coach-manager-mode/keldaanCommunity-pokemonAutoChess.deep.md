# keldaanCommunity-pokemonAutoChess (coach-manager-mode, cell 37)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` (symbol `checkForLazyTeam`, plus `rooms/game-room.ts` `onLeave`) | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | TypeScript | symbol `checkForLazyTeam`

Checked: verdict STRONG, confidence high for the fill and the leave ladder (both read end to end, numbers checked against config files). camera_scope: n/a. Opened: rooms/commands/game-commands.ts (1155-1185 timer loop, 1328-1341 phase switch, 1456-1489 checkDeath, 1491-1494 pick timer, 1815-1863 checkForLazyTeam, 2093 fight timer); rooms/game-room.ts (316, 713-730 startGame, 768-881 onDrop/onLeave, 883-968 onDispose, 971-1026 updatePlayerAfterGame); utils/board.ts (34-56, 72-78); core/bot.ts (whole); core/bot-manager.ts (whole); core/bot-logic.ts (31, 33-37, 107-117, 162-177, 261-279); core/matchmaking.ts (125-135); core/dps.ts (whole); core/pending-game-manager.ts (13); models/colyseus-models/player.ts (140); config/game/{game,stages,elo,experience}.ts; config/server/network.ts (12). NOT read: rooms/commands/preparation-commands.ts (1094 lines; manual placement checks), the simulation build (initializeFightingPhase 2090-2247), stopFightingPhase (1896) and how it resolves an unfinished fight, computeElo, the shop. Note: there is no separate AI for an absent coach. The same end-of-pick fill runs for every human, so an absent human is a human who placed nothing.

## 1. Mechanism

- Pick phase is timed per stage. `initializePickingPhase` sets `state.time` to `StageDuration[stage] ?? StageDuration.DEFAULT` seconds (1491-1494). The server timer loop subtracts each tick's delta (1157) and, when `time < 0`, sets `updatePhaseNeeded` (1161-1162). Then `OnUpdatePhaseCommand` runs (1184-1185).
- At the PICK-to-FIGHT switch (1337-1340), the order is: `stopPickingPhase()`, then `checkForLazyTeam()` (1339), then `initializeFightingPhase()`. So the fill runs once, at the moment the pick timer runs out, before any fight is built.
- `checkForLazyTeam` (1815-1863): for each non-bot player (1817-1818), count units on the board that count toward the team (`getTeamSize`), compute the cap `getMaxTeamSize(level, rule)` (1820-1824), and move `cap - teamSize` bench units onto the board. Each step picks the leftmost bench unit that can be placed (1828-1830), then calls `getFirstAvailablePositionOnBoard` with the unit's range, with DARK melee (range 1) using range 3 (1832-1837). Positions are filled row by row: melee `[3,2,1]`, range 2 `[2,1,3]`, range 3+ `[1,2,3]` (utils/board.ts:41, 45, 50). Within a row, x runs 0 to 7. It then updates synergies and `boardSize` (1857-1860).
- Team cap: `getMaxTeamSize` = player level, or level + 3 in the CROWDED special rule (utils/board.ts:76).
- Leaving (game-room.ts:800-881). A disconnect first opens a reconnect window of 300 s (`ALLOWED_GAME_RECONNECTION_TIME`, game.ts:3, used at game-room.ts:786). If the player does not come back and has not consented, the outcome depends on stage. First, a join lockout: if the leave is before the end (player alive, game not finished) and another human is in the room, `givePlayerTimeout` starts a 300 s lockout (830-843; pending-game-manager.ts:13). This runs before the stage test, so it also applies to early leaves. Then the stage split. Stage 5 or earlier (`stageLevel <= 5`): removed from `state.players` with no reward (845-855). Stage 6 or later: `hasLeftGame` set (861), and if the player was alive and the game was not over, `life = -99` and `rankPlayers()` run (866-868), so the player ranks last. The player is NOT removed here. The matchmaking filter uses `alive` only (matchmaking.ts:129), and `alive` is a separate flag that stays true (player.ts:140; set false only in checkDeath at game-commands.ts:1470). So the surrendered player stays in matchups until the board actually loses its life.
- XP and ELO gates. XP only if `stageLevel >= MinStageForGameToCount` (10, elo.ts:4) and at least 2 players (game-room.ts:927-929, 973-975; the award is paid at 1025-1026). ELO also counts an early leave: `stageLevel >= 10 || hasLeftBeforeEnd` with at least 2 humans (991-992). XP amount = `ExpPlace[rank-1]`, table `[700, 400, 350, 300, 250, 200, 200, 200]` (experience.ts:2).
- Scripted opponents (bots), separate from absence. Each bot holds a list of stage boards (`MAX_BOTS_STAGE` 30, bot-logic.ts:31). `updateBots` is called at game start (game-room.ts:728) and once per round (game-commands.ts:1998). `updateProgress` adds 1 to progress (bot.ts:52) and steps when progress reaches the next step's `roundsRequired` (57), carrying the leftover (60). Bots are skipped by the fill (1818).

## 2. Key functions

- `checkForLazyTeam`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 1815-1863. Fill to the cap from the bench, leftmost first, row-ordered by range. Called only from the PICK-to-FIGHT switch (1339).
- `OnUpdatePhaseCommand.execute`: same file, 1328-1341. Order: TOWN, then PICK (stop, fill, start fight), then FIGHT.
- Leave handling `onLeave`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` 800-881. Early removal (845-855), surrender (860-871).
- `getFirstAvailablePositionOnBoard`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/board.ts` 34-56 (row order by range).
- `updatePlayerAfterGame`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` 971-1026 (XP and ELO gates).
- `Bot.updateProgress`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/bot.ts` 51-64.

## 3. Numbers vs mechanism

Table rows (name | what | formula | ranges | file:line). Coach-topic rows not listed here were not read: see Checked.

| Row | What | Formula | Ranges | file:line |
|---|---|---|---|---|
| Pick window | seconds to place units | `StageDuration[stage] ?? DEFAULT` x 1000 ms | 20 s (stages 1-3) to 50 s (stages 10, 20); default 30 s; stage 0 is 23 s | game-commands.ts:1493-1494; config/game/stages.ts:1-15 |
| Fight cap | hard length of a fight | `state.time = FIGHTING_PHASE_DURATION`; phase ends when `time < 0` | 45 s | stages.ts:16; game-commands.ts:2093, 1161-1162 |
| Fight input path | commands during a fight | none on the path read: the fight branch only calls `simulation.update(deltaTime)` | n/a | game-commands.ts:1163-1168 |
| Team cap | units that count toward team | `getMaxTeamSize` = level; CROWDED = level + 3 | level (levels not read); +3 under CROWDED | utils/board.ts:72-78 |
| Default placement | bench to board at pick end | leftmost bench unit to first free cell in `rowOrder(min(range,3))` until cap | rows melee 3,2,1 / range 2 2,1,3 / range 3+ 1,2,3 | game-commands.ts:1815-1863; utils/board.ts:41-50 |
| Power score | scouting readout of a board | sum of `POWER_SCORE_BY_CATEGORY[category] ?? 1` over units with y>0 | category values 1 to 8 (default 1) | core/bot-logic.ts:162-172 |
| Power evaluation | score vs stage average | `clamp(50 + 100*(score - avg)/avg, 0, 100)`, avg = `POWER_AVERAGES[stage] ?? 40` | 50 at average; 0 to 100 | core/bot-logic.ts:174-176 |
| Difficulty band | label from evaluation | thresholds 10, 26, 42, 58, 74, 90 | Incomplete to Illegal | core/bot-logic.ts:107-117 |
| Bot ELO estimate | rating of a scripted bot | mean evaluation over stages 3+; 500 per band, 100 per 10 points | 500 to 1400 | core/bot-logic.ts:261-278 |
| Bot step rule | when a scripted bot advances | progress += 1 per round; step when progress >= next `roundsRequired` | 31 stages (0-30); `roundsRequired` default 1 | core/bot.ts:51-64; core/bot-logic.ts:31-37; game-room.ts:728; game-commands.ts:1998 |
| Matchmaking view | who can be matched | filter `p.alive` | n/a | core/matchmaking.ts:129 |
| Early leave | removed, no reward | stage <= 5 and not consented | stage 0-5 | game-room.ts:845-855 |
| Late leave | surrender, ranked last | `life = -99`; `rankPlayers()`; `alive` stays true | n/a | game-room.ts:860-871 |
| Reconnect window | grace before leave is final | 300 s | 300 s | config/game/game.ts:3; game-room.ts:786 |
| Join lockout | after any leave before the end, with another human present | 300 s | 300 s | core/pending-game-manager.ts:13; game-room.ts:830-843 |
| XP gate | XP paid | stage >= 10 and >= 2 players | stage 10 | config/game/elo.ts:4; game-room.ts:927-929, 973-975, 1025 |
| XP by rank | XP per placing | `ExpPlace[rank-1]` | 700, 400, 350, 300, 250, 200, 200, 200 | config/game/experience.ts:2 |
| ELO gate | rating counts | stage >= 10 OR left before end; >= 2 humans | stage 10 | game-room.ts:989-992 |
| Stat sheet | per-unit damage counters | writes only when a value changes (delta write) | counters: physical, special, true, reduced, shield, heal | core/dps.ts:22-56 |
| Server tick | simulation step | variable step: `Math.min(MAX_SIMULATION_DELTA_TIME, deltaTime)` | clamp 50 ms | game-room.ts:716-719; config/server/network.ts:12 |
| Level-up threshold | growth | `ExpThreshold` = 1000 (use not traced) | 1000 | config/game/experience.ts:4 |

Not in the table, not read: fatigue or injury, hiring or contracts (shop), training schedules, scouting screens, post-fight replay.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (bench sort, row order by range, cap check, then the leave tests in the donor order). It omits the donor's retry on the same bench unit (we stop instead), the bot skip (the caller's job), the GOLD_BOW and INANIMATE team-size nuance beyond a flag, the synergy and `boardSize` updates, the `hasLeftGame` and `gameFinished` checks in surrender, and the rank call. The surrender branch sets `elo: true` because in that branch the donor's left-before-end half of the ELO rule is always true.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Range = 1 | 2 | 3;

interface Unit {
  id: string;
  x: number;              // column 0..cols-1
  y: number;              // row 1..3 on the board, 0 = bench
  range: number;
  canPlace: boolean;      // eggs stay on the bench
  countsForTeam: boolean; // inanimate and gold-bow units do not count toward the team cap
}

interface Board {
  units: Unit[];
  cols: number;
}

const PAC_DEFAULTS = {
  cols: 8,
  crowdedBonus: 3,        // team cap = level, +3 in CROWDED
  removeBeforeStage: 5,   // leaving on stage <= 5: removed, no reward
  xpMinStage: 10,
  surrenderLife: -99,
} as const;

// Melee fills the front row first; mid-range the middle row; long-range the back row.
function rowOrder(range: number): number[] {
  const r = Math.min(range, 3);
  if (r === 2) return [2, 1, 3];
  if (r === 3) return [1, 2, 3];
  return [3, 2, 1];
}

function firstFreeCell(board: Board, range: number): { x: number; y: number } | null {
  for (const y of rowOrder(range)) {
    for (let x = 0; x < board.cols; x++) {
      if (!board.units.some((u) => u.y === y && u.x === x)) return { x, y };
    }
  }
  return null;
}

// Default tactics for an absent coach: move bench units onto the board, leftmost bench first, until the level cap.
// simplified: the donor loop runs a fixed number of attempts and retries the same bench unit when no cell is free;
// this version stops instead. The donor also skips bot players (caller's job here) and does not stop for a
// fully-blocked row.
function fillDefaultTeam(board: Board, level: number, crowded: boolean): number {
  const cap = crowded ? level + PAC_DEFAULTS.crowdedBonus : level;
  const onBoard = board.units.filter((u) => u.y > 0 && u.countsForTeam).length;
  const toMove = Math.max(0, cap - onBoard);
  let moved = 0;
  for (let i = 0; i < toMove; i++) {
    const next = board.units
      .filter((u) => u.y === 0 && u.canPlace)
      .sort((a, b) => a.x - b.x)[0];
    if (!next) break;
    const cell = firstFreeCell(board, next.range);
    if (!cell) break;
    next.x = cell.x;
    next.y = cell.y;
    moved++;
  }
  return moved;
}

type LeaveOutcome =
  | { kind: "none" }                                  // already out of the fight
  | { kind: "removed"; reward: false }                // early leave: removed, no rewards
  | { kind: "surrendered"; life: number; xp: boolean; elo: boolean }; // stays in play, ranked last

// Order follows the donor: the early-removal test comes first (no life check), then the already-out test.
// simplified: the donor also checks gameFinished and a hasLeftGame flag before surrender; both omitted.
function onAbsent(stage: number, life: number, consented: boolean): LeaveOutcome {
  if (stage <= PAC_DEFAULTS.removeBeforeStage && !consented) return { kind: "removed", reward: false };
  if (life <= 0) return { kind: "none" };
  return {
    kind: "surrendered",
    life: PAC_DEFAULTS.surrenderLife,
    xp: stage >= PAC_DEFAULTS.xpMinStage,
    elo: true, // donor: stage >= 10 OR left before the end; in this branch the left-before-end half is true
  };
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/CO001-pac-absent-coach.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/coach-default.ts` (new engine module): default team fill at the end of pick, and the absence outcome. Both are engine rules, not client rules.
- Parity-checklist row 2 (AI brain): default tactics when the coach is absent.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 2 (AI brain: default tactics when absent); 1 (one engine: fill and leave rules sit in the engine, not a client); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and typechecks; no donor line is translated.
- No absence AI. The fill runs for every human at the end of pick; an absent human simply has no new placement. Frankendom should keep one default-tactics path, not a second one for absence.
- Defect 1: the fill picks the leftmost bench unit and places it by range row only; it ignores the coach's saved formation, roles, or the last placement. Fix: take the coach's saved formation first, then fall back to bench order.
- Defect 2: when no cell is free the donor loop tries the same bench unit again (game-commands.ts:1830-1839). It is harmless (no state change) but wasteful. Fix: stop, or try the next bench unit, as in the sketch.
- Defect 3 (design risk, not a bug): a surrendered player (life -99) keeps `alive = true` and stays in matchmaking (matchmaking.ts:129), so the absent board keeps fighting and can take kills. Frankendom kills are server-verified and loot is take-one, so an absent fighter must not earn kill credit or loot after withdrawal. Fix: withdraw the fighter at the next round boundary, one ledger row for the forfeit, no loot. This is why the decision is adapt, not adopt.
- Server tick: the donor step is variable (`setTimestep` with dt clamped to 50 ms, game-room.ts:716-719), not a fixed step. Frankendom's server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget") should be fixed-step; the clamp idea transfers, the variable step does not.
- The surrender and removal thresholds (stage 5, stage 10) are PAC progression numbers. Frankendom should express them as data (zones as data or a coach-mode row), not as constants in the function.
- Not read, so not claimed: how `stopFightingPhase` resolves a fight cut off by the 45 s cap, the simulation build, the manual placement checks in preparation-commands.ts, and the shop.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 2 (AI brain: default tactics when absent); 1 (one engine); rules 7-9 n/a

Best transferable idea: when a coach is absent, the engine fills the team from the bench by range row at the end of pick, and a graded leave rule (removed before stage 5 with no reward, surrendered after) is set by fixed numbers.
Decision (proposed): adapt — keep the default-fill and graded leave shape, but withdraw the absent fighter instead of letting it keep fighting, because our kills are server-verified and loot is take-one.
Acceptance: a server test where a coach who leaves a bout at stage 5 or earlier gets no reward or record; a coach who leaves later has the saved formation placed by range order (melee front, long back) at the next pick close, and the absent fighter earns no kill credit or loot after withdrawal.
