# saomin0317-knight-duel (spectator-coach-wagers-replays, cell 3)

Donor: `/mnt/frankendom-donors/saomin0317-knight-duel/src/main.ts` (attract loop: 1088-1089, 1279-1281, 1479, 1568-1575, 1789-1792, 1863-1867; KO and ledger: 1560-1615) | Licence: GPL-3.0 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE"; README line 29 "[GPL-3.0](LICENSE)"; `_RESTRICTED-NOTE.txt` line 1: shape/idea only, clean-room, no code or assets into Frankendom) | TypeScript | symbol `handleVictory` (attract branch)

Checked: Read in full: `handleVictory` (src/main.ts 1560-1615, all branches), the attract start path (1862-1868), the attract frame step (1785-1796), `randomShape` (530-534). Read by grep and nearby lines only: the title flag (1279-1281), the stage lock (1102-1103), `updateAI` (1662 header only; body not read), `restart()` (not read), `ARENA_SHAPES` values (172-178, not read). Read in full: `src/account.ts` (67 lines: login, cloud save, leaderboard; no spectating code). Keyword grep over every file in `src/` (`replay`, `spectat`, `wager`, `betting`, `coach`, `ghost`, `record`) found no replay, spectator, wager or coach code; the hits are TypeScript `Record<...>` types and the label `acc.record` (win/loss text). Confidence: high on the attract flow and the ledger branches (receipts verified, sketch typechecked on the VPS); high that replay, coach and wager code is absent; medium on pacing beyond the KO reset (restart not read). `camera_scope` not applicable (no camera note).

Best transferable idea: Run the title screen as an AI-vs-AI fight on the same fight code, with no payout and no ledger write, and reset after each KO in a new random arena, so the menu always shows a live fight without touching a player's record.
Decision (proposed): adopt - the loop is one step with two brains, and its no-ledger early return matches our one-ledger ruling. The first-visit gate in sessionStorage is client-only and stays a client flag.
Acceptance: The title screen shows AI-vs-AI fights; after a KO the next fight starts after 2.4 s in a new arena with three obstacles; after three attract fights the player's wins, losses and gold are unchanged (a server test compares the ledger before and after).

## 1. Mechanism

- Mode is chosen at load (src/main.ts 1088-1089). `mode` starts as `battle` or `menu` from local storage; it is `attract` when the session has no `kd_title_seen` flag. The flag is set at 1281 (the surrounding handler was not read) and hides the title on later loads (1279).
- Start (1862-1867). In attract mode the battle buttons are hidden, three obstacles are built (1866), and the fight restarts (1867).
- Each frame (1785-1796). In attract mode and before a KO (`!gameOver`), both fighters take an AI step: the enemy against the player (1791), then the player against the enemy (1792). The human key branch runs only in battle mode.
- Flash messages are suppressed (1479): `if (gameOver || mode === 'attract') return;`.
- KO (`handleVictory`, 1563-1575). It sets `gameOver`, shatters the loser and plays the winner's victory pose (1565-1567). In attract mode it stops here: a timer of 2400 ms (1573) rebuilds the arena with a random shape (1572, `randomShape`, 530-534), builds three obstacles and restarts, then returns (1574). No gold, wins, losses or stage change is written on this path.
- Battle KO (1576-1615, not the attract path). A loss adds one to `losses` (1578) and saves. A win adds the reward to gold (1582) and one to `wins` (1583). If the win is on the top unlocked stage, `maxLevel` advances (1585-1586) and the game moves to the next stage. A stage above `maxLevel` stays locked (1102-1103).
- Random arena per battle: `arenaShape = randomShape()` (1127, not read in detail).

## 2. Key functions

- `handleVictory`: `/mnt/frankendom-donors/saomin0317-knight-duel/src/main.ts` 1563-1615. Attract branch 1568-1575; battle branch 1576-1615.
- Attract frame step: same file 1789-1792.
- Attract start: same file 1862-1867.
- Flash gate: same file 1479.
- Arena pick: same file 530-534.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Attract fight restarts after a KO | 2400 ms pause (main.ts 1573) |
| New arena per attract fight | Random shape from the arena table (530-534; table values not read) |
| Obstacles per arena | 3 (main.ts 1866, 1572) |
| No payout in attract | 0 gold, no wins or losses change (main.ts 1568-1575) |
| Stage lock | Next stage locked until `maxLevel` reaches it (main.ts 1102-1103); advance by +1 (1586) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: one step runs both brains only in attract mode and not after a KO; a KO in attract returns before any ledger change, schedules the reset and picks the next arena; battle KOs update the ledger. It omits the rendering, the physics (the Rapier world), the shatter effect, the victory pose, the AI body, and the stage-unlock message. The flash rule is kept as a pure function. Typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: GPL-3.0 (donor LICENSE line 1; README line 29; restricted note: shape/idea only). clean-room.
// clean-room
type Mode = 'menu' | 'battle' | 'attract';

interface Brain { step(dt: number, opponent: Fighter): void; }
interface Fighter { hp: number; brain: Brain | null; } // brain null = driven by a person

interface Ledger { gold: number; wins: number; losses: number; }
interface Outcome { playerWon: boolean; reward: number; }

const ATTRACT_RESET_MS = 2400; // pause after a KO before the next attract fight (donor: setTimeout 2400, main.ts 1573)
const OBSTACLES_PER_ARENA = 3; // donor: buildObstacles(3) (main.ts 1866)

// Both sides run a brain only while an attract fight is live. Nothing else changes in attract mode.
function stepFight(mode: Mode, gameOver: boolean, a: Fighter, b: Fighter, dt: number): void {
	if (mode === 'attract' && !gameOver) {
		a.brain?.step(dt, b);
		b.brain?.step(dt, a);
	}
}

// Fight end for one KO. Attract fights pay nothing and touch no ledger; they reset in a new arena.
function onKo(
	mode: Mode,
	ledger: Ledger,
	outcome: Outcome,
	nowMs: number,
	pickArena: () => string,
): { ledger: Ledger; resetAtMs?: number; nextArena?: string } {
	if (mode === 'attract') {
		return { ledger, resetAtMs: nowMs + ATTRACT_RESET_MS, nextArena: pickArena() };
	}
	if (!outcome.playerWon) {
		return { ledger: { ...ledger, losses: ledger.losses + 1 } };
	}
	return { ledger: { ...ledger, gold: ledger.gold + outcome.reward, wins: ledger.wins + 1 } };
}

// Floating hit messages are suppressed in attract mode and after the fight is over (donor flashMsg, main.ts 1479).
function mayShowFlash(mode: Mode, gameOver: boolean): boolean {
	return !(gameOver || mode === 'attract');
}

export { stepFight, onKo, mayShowFlash, ATTRACT_RESET_MS, OBSTACLES_PER_ARENA };
```

## 5. Lands in

- TARGET `src/fight/attract.ts` (the title-screen fight: the same duel step with two AI brains and no ledger writes). Parity-checklist row 1 (duel step / sim).
- Reuse tag: adopt-idea (GPL-3.0: clean-room, shape only; nothing copied)
- Brief rule served: one engine (the attract fight is the same step as a real fight, with two brains); one ledger (attract fights write nothing).

## 6. Gaps and risks

- Replays, coach instructions, coached-fight pricing and spectator wagers are absent from this donor (keyword grep over `src/`). Only the watch-a-fight loop transfers.
- Lobby shape: the donor is single-player. The stage list is a ladder with a lock (1102-1103), which is a progression rule, not a lobby. Not a fighting-game lobby.
- Client-only flag: the first-visit gate uses sessionStorage (1089, 1281). It must not decide anything on the server. Frankendom's title flag should be a client preference only.
- Donor detail (not traced to a bug): the attract reset and the battle end both use one variable, `menuTimer`. The attract branch clears it at 1570 and the battle branch at 1601. I did not trace whether a switch from attract to the menu during the 2400 ms wait can fire a stale reset (restart and the menu switch were not read). Fix in Frankendom: one timer owner per mode, cancelled on every mode change.
- The attract fight reuses the same `updateAI` as the player's enemy (1790, 1792). Fine for a demo; it means attract fights run the full AI cost every frame. Frankendom's per-tick NPC budget (post-K item 3) should cap attract fights like any other fight.
- Not read: `updateAI` body, `restart()`, `buildArena`, `ARENA_SHAPES` values, and the title screen markup.
