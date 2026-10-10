# keldaanCommunity-pokemonAutoChess (instancing-dungeons, cell 3)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` (primary; with `preparation-room.ts`, `after-game-room.ts`, `commands/preparation-commands.ts`, `commands/lobby-commands.ts`, and `config/server/network.ts`, `config/game/game.ts`, `config/game/elo.ts`) | Licence: GNU GPL version 3 (`/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/LICENSE`, line 2 "Version 3, 29 June 2007"); clean-room only | TypeScript (Colyseus rooms) | symbol `GameRoom` lifecycle (onCreate, onJoin, onDrop, onLeave, onDispose)

Checked: the hint file `app/rooms/custom-lobby-room.ts` is the lobby list, not the instance, so I read it only by grep (its `onCreate` at line 121, `onJoin` at 453, `onLeave` at 505, `onDispose` at 509; it has no `onDrop`). The instance lifecycle is spread across the rooms listed above. Read in full: `after-game-room.ts` (100 lines). Read in part: `preparation-room.ts` (86-190, 420-515), `preparation-commands.ts` (318-430), `game-room.ts` (152-200, 366-382, 751-935), `lobby-commands.ts` (706-722), and the three config files (grep for the constants). camera_scope: not applicable. Confidence: high on phase order, timers and constants as read; medium on the leave rules (I read the branch conditions, not the OnLeave dispatch targets). Not read: `OnJoinCommand` / `OnLeaveCommand` / `OnGameStartRequestCommand` bodies in `commands/`, `game-room.ts` `startGame` and the match simulation (1677 lines in total; only lifecycle lines), the Colyseus `allowReconnection` internals, and the presence layer behind `setPendingGame` / `givePlayerTimeout`. Depth: thin. Confidence the verdict is STRONG: medium-high, since the phase machine and timers are real and self-contained, but the donor is not a fight and I did not read every step.

Best transferable idea: a party instance walks a fixed phase machine (prep, loading, live, after, dispose), and each phase owns its own reconnect window, its own timeout, and its own leave rule, with the rating decision made once at dispose.
Decision (proposed): adapt - the phase machine with per-phase grace windows is the shape we want for zone instances and the reconnect grace (row 23); copy none of the code (GPL), and fix the inverted memory gate before the admission rule is reused.
Acceptance: a server test where a player who drops during a live match rejoins within 5 minutes and keeps their seat; a player who quits before stage 6 without consent is removed with no reward; a match whose clients never report loaded starts at 3 minutes regardless.

## 1. Mechanism

Each match is a chain of three or four rooms, one per phase, and each room has its own rules.

- Lobby (`lobby-commands.ts` 712) creates a preparation room with mode, rank range, password and owner. Tournament lobbies also set an autostart delay of 10 minutes (`tournament-commands.ts` 248, 312).
- Preparation room (`preparation-room.ts` onCreate, 89-190). Max clients 8 (47; `MAX_PLAYERS_PER_GAME = 8`, network.ts 6). Tournament rooms turn off autoDispose (48-50). The autostart timer (138) is the only way a room starts a game by itself. When it fires: if the game already started, force close (NORMAL_CLOSURE); else if fewer than two users, close as empty (146, 160); else dispatch the start command. Countdown chat messages are scheduled ahead of the start.
- Preparation room drop and leave (450, 458). A dropped player has a 10 s reconnect window (450) and aborts a pending start. Leave dispatches an OnLeave command (body not read).
- Start command (`preparation-commands.ts`, around 318-410). A memory admission gate runs first (333-365). Refuse below 10% free (342). Refuse bot games below 20% free when humans are fewer than the max (`freeMemory < 0.2 * totalMemory`). Refuse solo below 40% free. Note: `freeMemory` is `heapUsed` (333), which inverts the check (see D1). On pass: stamp `gameStartedAt` (370), lock the preparation room (372), re-enable autoDispose (373), optionally pair players for Double Up (honour partner choices first, then shuffle and pair the rest), create the game room with the users, the preparation id and the mode (407), write a pending-game record for every user, and publish "game-started".
- Game room onCreate (152-200). Subscribe to "room-deleted". Ranked and tournament games turn off autoDispose (189). A loading clock of `MAX_LOADING_TIME` (3 minutes, network.ts 13) starts the match if loading has not completed (370-377). A match also starts as soon as every player reports 100% loading (onLeave tail, 874-881).
- Game join (751-766). Banned accounts are refused. If the pending-game record names this room, clear it; if it names another room and has not expired, leave with USER_IN_ANOTHER_GAME.
- Game drop (768-792). A spectator who drops is removed at once. A player gets a pending-game record and a reconnect window of `ALLOWED_GAME_RECONNECTION_TIME` (786; config/game/game.ts 3 = 300 s).
- Game leave (800-). A spectator who leaves is removed. A non-consented leave with no pending record is ignored (the player reconnected another way). A leave before stage 6 (`stageLevel <= 5`, 845) and not consented removes the player from the list with no reward and updates the room metadata. A later leave while alive and not finished sets life to -99 (surrender, worst rank), ranks everyone, and writes the player's after-game record. If other humans remain and the player is not an admin, a 5-minute block on joining another game is set (`givePlayerTimeout`).
- Game dispose (883-). Unsubscribe, clear pending records. If two or more players are alive and at least one is human, the game is unfinished: skip rating and history. Otherwise, if the stage reached `MinStageForGameToCount` (10, config/game/elo.ts 4), compute rating and XP for humans and bots.
- After-game room (`after-game-room.ts`). Created with the result payload. Auth checks a token, a display name and the ban list (53-72). It disconnects itself after 120 s (47-50). A dropped player has 20 s to reconnect (81).

## 2. Key functions

- Preparation room onCreate: `app/rooms/preparation-room.ts` 89-190 (autostart 138, empty close 146-160, countdown messages 166-190).
- Preparation room onDrop, onLeave, onDispose: same file, 441-456 (onDrop; reconnect call at 450), 458 (onLeave), 471 (onDispose).
- Start command: `app/rooms/commands/preparation-commands.ts` 318-410 (memory gate 333-365, lock 372, autoDispose 373, createRoom "game" 407).
- Lobby create: `app/rooms/commands/lobby-commands.ts` 712.
- Game room onCreate: `app/rooms/game-room.ts` 152-200 (autoDispose for ranked and tournament, 189) and the loading clock at 370-377.
- Game room onJoin, onDrop, onLeave, onDispose: same file, 751-766 (onJoin), 768-792 (onDrop; reconnect call at 786), 800-880 (onLeave; early-leave branch at 845; loading check at 874-881), 883 (onDispose).
- After-game room: `app/rooms/after-game-room.ts` 18-99 (whole file read).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Phase machine per instance (prep, loading, live, after, dispose) | Phases are separate room classes in the donor; the transitions are in the rooms (above). |
| Grace window per phase on drop | Prep 10 s (450); live 300 s (786, config/game/game.ts 3); after 20 s (81). |
| Timed phase end | Loading 3 min (network.ts 13); after-game room 120 s (48-50). |
| Early-leave rule by stage | Stage 5 or below, not consented: remove with no reward (845). |
| Surrender rule | Life -99 for a live leave that is not an early-leave (867). |
| Quit penalty | 5 minutes, no joining another game (givePlayerTimeout; presence-based, not read). |
| Memory admission thresholds | 10% (342), 20% (bots, with humans below max), 40% (solo). Ratios as written against heapUsed (see D1). |
| Rating only when the game counts | Stage 10 (elo.ts 4), and unfinished skipped at dispose. |

Defects found while reading (each with fix):
- D1. The memory gate uses `heapUsed` as "free" (333) against `heapTotal` (334), and the thresholds then fire when the heap is nearly empty, not when memory is short. The commented-out code above it (325-332) used `os.freemem()`. fix: free = total minus used (or `os.freemem()`), then the same ratios. The sketch takes real free bytes.
- D2 (risk, not a defect seen). Ranked and tournament game rooms set autoDispose to false (189). The parts I read show no timeout that disposes such a room if result registration never comes. (Not read: whether one exists elsewhere in the 1677-line file.)

## 4. TypeScript sketch

simplified: the sketch keeps the donor's phase order (prep, loading, live, after, dispose) and its per-phase reconnect windows, the stage-5 early-leave removal, the surrender rule, the admission ratios, and the rating gate at dispose. It omits Colyseus state, the presence layer and pending-game storage (the donor stores these outside the room), the Double Up pairing, the ban check, the countdown messages, the ELO and XP math, and the autostart "fewer than two users" close. It moves the quit penalty from presence (global) to the instance (per match), which is a simplification, not a fix. It reorders nothing else. D1 is fixed in `admitStart`: the caller passes real free bytes.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Phase = "prep" | "loading" | "live" | "after" | "disposed";

interface Config {
  maxPlayers: number;       // donor: 8 (config/server/network.ts:6)
  loadingMs: number;        // donor: 3 min, then the match starts regardless (network.ts:13)
  liveReconnectMs: number;  // donor: 5 min (config/game/game.ts:3)
  prepReconnectMs: number;  // donor: 10 s (preparation-room.ts onDrop)
  afterReconnectMs: number; // donor: 20 s (after-game-room.ts onDrop)
  afterLifeMs: number;      // donor: 120 s, then disconnect (after-game-room.ts onCreate)
  countStage: number;       // donor: 10 (config/game/elo.ts:4)
  earlyLeaveStage: number;  // donor: 5 (game-room.ts onLeave: stage <= 5 and not consented)
  quitPenaltyMs: number;    // donor: 5 min, no joining another match (givePlayerTimeout)
}

interface Slot {
  id: string;
  isBot: boolean;
  alive: boolean;
}

interface Instance {
  phase: Phase;
  stage: number;                      // game stage reached
  finished: boolean;
  endsAt: number;                     // deadline for the current timed phase, ms
  players: Map<string, Slot>;
  reconnectUntil: Map<string, number>; // per player, set on drop
  quitUntil: Map<string, number>;      // per player, blocks the next join
}

// Admission gate on match start. fix: the donor passes heapUsed as "free" memory, which inverts the check;
// here the caller passes real free bytes (total minus used).
function admitStart(
  freeBytes: number,
  totalBytes: number,
  humans: number,
  maxPlayers: number,
): "ok" | "no-memory" | "no-bots" | "no-solo" {
  const freeRatio = freeBytes / totalBytes;
  if (freeRatio < 0.1) return "no-memory";
  if (freeRatio < 0.2 && humans < maxPlayers) return "no-bots";
  if (freeRatio < 0.4 && humans === 1) return "no-solo";
  return "ok";
}

function startMatch(inst: Instance, cfg: Config, now: number, freeBytes: number, totalBytes: number, humans: number): boolean {
  if (inst.phase !== "prep") return false;
  if (admitStart(freeBytes, totalBytes, humans, cfg.maxPlayers) !== "ok") return false;
  inst.phase = "loading";
  inst.endsAt = now + cfg.loadingMs;
  return true;
}

// Loading ends when everyone reports 100%, or when the loading clock runs out.
function tickLoading(inst: Instance, now: number, allLoaded: boolean): void {
  if (inst.phase !== "loading") return;
  if (allLoaded || now >= inst.endsAt) inst.phase = "live";
}

// Drop: the player keeps a reconnect window that depends on the room they are in.
function onDrop(inst: Instance, cfg: Config, id: string, now: number): void {
  const window =
    inst.phase === "prep" ? cfg.prepReconnectMs : inst.phase === "after" ? cfg.afterReconnectMs : cfg.liveReconnectMs;
  inst.reconnectUntil.set(id, now + window);
}

function canRejoin(inst: Instance, id: string, now: number): boolean {
  const until = inst.reconnectUntil.get(id);
  return until !== undefined && until > now;
}

// Leave: an early technical drop removes the player with no reward; a leave during play is a surrender.
function onLeave(inst: Instance, cfg: Config, id: string, consented: boolean, now: number): void {
  const slot = inst.players.get(id);
  if (!slot) return;
  if (inst.stage <= cfg.earlyLeaveStage && !consented) {
    inst.players.delete(id);
    return;
  }
  if (slot.alive && !inst.finished) {
    slot.alive = false; // donor sets life to -99, which ranks last
    const otherHumans = [...inst.players.values()].filter((p) => !p.isBot && p.id !== id).length;
    if (!slot.isBot && otherHumans >= 1) inst.quitUntil.set(id, now + cfg.quitPenaltyMs);
  }
}

function canJoinNext(inst: Instance, id: string, now: number): boolean {
  const until = inst.quitUntil.get(id);
  return until === undefined || until <= now;
}

function finish(inst: Instance, cfg: Config, now: number): void {
  inst.finished = true;
  inst.phase = "after";
  inst.endsAt = now + cfg.afterLifeMs;
}

// Dispose rule: an unfinished match is not rated; a finished one is rated only from countStage on.
function disposeOutcome(inst: Instance, cfg: Config): "skip" | "rate" | "unrated" {
  const alive = [...inst.players.values()].filter((p) => p.alive);
  const aliveHumans = alive.filter((p) => !p.isBot);
  if (alive.length >= 2 && aliveHumans.length >= 1) return "skip";
  return inst.stage >= cfg.countStage ? "rate" : "unrated";
}

// The after-game room closes itself when its clock runs out.
function tick(inst: Instance, now: number): void {
  if (inst.phase === "after" && now >= inst.endsAt) inst.phase = "disposed";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ID003-pokemon-match-lifecycle.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (instance phase machine and per-phase grace windows for zone instances and parties). Parity-checklist row 23 (zone population: despawn with a grace timer). The donor's reconnect window is a grace timer on a player, not on an empty zone, so it covers only part of row 23.
- today: zone spawn logic in `origins/server/world-spawns.ts` (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, no code copied).
- Brief rule served: rule 4 (idea kept, defect D1 fixed in the sketch, per Dom 2026-10-10); rule 7 (licence stated exactly; clean-room); rule 8 (named target and row 23).

## 6. Gaps and risks

- One engine: the donor is three room classes plus a presence layer. Frankendom has one engine, so the phases should be state on the one instance record, not separate room classes.
- Zones as data: the 3-minute loading cap and the 10 s, 20 s, 5-minute and 120 s windows are fixed constants here. In Frankendom the reconnect window and loading cap are engine rules, and only the loading cap could be zone data.
- Server-verified: the surrender rank (life -99) and the rating at dispose are server-side in the donor. Frankendom's kills and rewards are server-verified, so the dispose rule must use the same ledger, not client reports.
- Loading completion trusts client reports (loadingProgress reaches 100 per player, onLeave tail 874-881). Frankendom must not let a client's loading report start a match. The 3-minute clock is the only server-side start.
- One ledger: pending-game and quit records live in the presence layer (not read), not in the room. Frankendom keeps the reconnect deadline and quit block on the character or instance record, in one ledger.
- MAX_ATTACKERS = 3: this donor caps a match at 8 players, which is a room size, not a fight cap. Do not reuse 8 as MAX_ATTACKERS.
- Pit as client: the match lifecycle is engine state. The Pit should be a client of it, not the place that owns the phase machine.
- The quit penalty is presence-based (global across rooms) in the donor. The sketch keeps it per instance; Frankendom should keep it per character in the ledger.
- Untested: no test of the lifecycle was read. Everything above is from reading the code paths listed in Checked.
