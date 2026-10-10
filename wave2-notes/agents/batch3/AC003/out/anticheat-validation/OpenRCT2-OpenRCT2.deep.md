# OpenRCT2-OpenRCT2 (anticheat-validation, cell 3)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` | Licence: GPL-3.0 (file header: "OpenRCT2 is licensed under the GNU General Public License version 3."; repo `licence.txt` is "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | C++ | symbols `NetworkBase::ServerHandleGameAction` (per-command cooldown), `NetworkBase::DecayCooldown`, `NetworkBase::TickServer`, `NetworkBase::Tick`, `GameAction::GetCooldownTime`

Checked: The hint file does contain the mechanism: the cooldown path sits inside the server's game-action handler, in a 4409-line network file. I searched the repo for rate-limit, cooldown and flood words (grep for `cooldown`, `RATE_LIMIT`, `ratelimit`, `flood`); the only command limiter that grep found is this one. Read in full: `ServerHandleGameAction` (NetworkBase.cpp 3034-3104), `DecayCooldown` (219-230), `Tick` (480-500), `TickServer` (540-562), the `Network::Tick`/`Update` wrappers (3322-3336). Read in part: `Update` (465-478), the end of `Tick` and `Flush` (500-527). Read as excerpts: `GameAction.hpp` 155-166 (default cooldown), `SmallSceneryPlaceAction.cpp` 59-70 and `RideDemolishAction.cpp` 46-56 (overrides), `NetworkPlayer.h` 40-52 (the per-player map), `GameState.cpp` 183-191 (the game-loop caller). Grep only: `NetworkBase.h` 196 (delta member), the legacy timer callers (3480-3497 read; callers not traced), `GameState.cpp` 263 (second `Tick` call, not read). Not read: `NetworkGroup::canPerformCommand` (the permission check, named only), `GameActions::Enqueue` and the execution path (so whether a failed action refunds the timer is not known), `ProcessConnection`, the strings behind the error messages, and any client-side cooldown (grep found none: `cooldownTime` appears only on the server). Camera: not applicable. Confidence: high on the order of checks, the non-extending refusal and the decay (read in full); the values 20 and 1000 are read, but their receipts are short lines (see Receipts note below).

## 1. Mechanism

- Entry. A client sends a game action (`GameCommand` plus payload and a target tick). The server handles it in `ServerHandleGameAction` (3034). It reads the tick and command, then refuses `togglePause` and `loadOrQuit` from clients (3047-3048, read).
- Order of steps (as the code runs):
  (a) Permission first. For any command other than `custom`, the sender's group must allow it (`canPerformCommand`), or the sender gets the permission-denied error and the function returns (3053-3061).
  (b) The action object is created from the command (`GameActions::Create`). If the command is not registered, log and return (3065-3072, read as excerpt).
  (c) Cooldown, skipped for the hosting player (3074-3076). Look up the command in the player's map (3077). If a timer is still above zero (3080), refuse with the rate-limit message and return (3082-3083). Nothing is written in that path, so a refused command does not restart the timer.
  (d) If the command is accepted, read the action's own cooldown (`GetCooldownTime`, 3087). If it is above zero, start the timer for this command on this player (3088-3090). The timer starts at accept time, before the action is queued and run (3103).
  (e) Serialise the payload, set the sender to the connection's player (3099-3101), and queue the action for the client's target tick (`GameActions::Enqueue`, 3103).
- Decay. Every server tick, for each valid connection whose processing succeeds, `DecayCooldown` runs (`TickServer` 558). `DecayCooldown` subtracts `_currentDeltaTime` from each timer (226) and removes the entry when it reaches zero or below (228). The delta is the real time since the last `Tick`, at least 1 ms (`Tick` 486: `max(ticks - _lastUpdateTime, 1)`). So the timer runs on real milliseconds, not on frames or game ticks.
- Tick driver. `Network::Tick()` (wrapper at 3333) is called from `GameState.cpp` 190 when the frame ran no logic tick, with the comment "Network has to always tick." (187), and from a second site at `GameState.cpp` 263 (not read). `Update()` (465) only dispatches to `UpdateServer` (528-538), which calls `connection->update()` per connection and does not decay timers.
- Values. `GameAction::GetCooldownTime` returns 0 by default (`GameAction.hpp` 160-163), meaning no cooldown. The doc comment says it is "the wait time in milliseconds" (157). Two actions override it: small-scenery placement returns 20 (`SmallSceneryPlaceAction.cpp` 59-62, value on line 61), and ride demolish returns 1000 (`RideDemolishAction.cpp` 46-49, value on line 48).
- Keying. The map is per player and per command type (`NetworkPlayer.h` 47: `unordered_map<GameCommand, int32_t>`). A player can run different commands at the same time, but cannot repeat the same command type inside its timer. The target (which tile, which ride) is not part of the key.
- Tick: decay is by measured elapsed real time (see above). The check itself is per received command.

## 2. Key functions

- `ServerHandleGameAction`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 3034-3104. Pause and quit refusal, permission, cooldown check and start, enqueue.
- `DecayCooldown`: same file, 219-230. Per-player timer decay in real milliseconds.
- `TickServer` and `Tick`: same file, 540-562 and 480-500. Decay driver and the delta-time source.
- `GameAction::GetCooldownTime`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/actions/GameAction.hpp` 157-163. Default 0, override per action.
- Overrides: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/actions/scenery/SmallSceneryPlaceAction.cpp` 59-62 (20) and `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/actions/ride/RideDemolishAction.cpp` 46-49 (1000).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-player, per-command timer; refuse while it runs; start it on accept | None (mechanism, NetworkBase.cpp 3077-3090) |
| Refused commands do not restart the timer | None (mechanism, the refusal returns at 3083 before 3090) |
| Timers decay by measured real time, removed at zero | Minimum delta 1 ms (theirs, `max(ticks - _lastUpdateTime, 1)`, NetworkBase.cpp 486) |
| Each command type sets its own wait | Small-scenery placement 20 ms (theirs, SmallSceneryPlaceAction.cpp 61); ride demolish 1000 ms (theirs, RideDemolishAction.cpp 48); base default 0 (theirs, GameAction.hpp 160-163) |
| Host is exempt from the limit | Host flag `PlayerFlags::kIsServer` (theirs, NetworkBase.cpp 3076) |
| Permission check before any limit | None (mechanism, 3053-3061) |

## 4. TypeScript sketch

simplified: keeps the donor's order: refuse while the command's timer runs, without extending it; otherwise start the command's own timer on accept (the host is exempt and never gets a timer); decay every tick by the measured elapsed time and remove timers at zero. It omits the permission check that runs before this (NetworkBase.cpp 3053-3061), the pause and quit refusal, the action object and its validation, the enqueue at the client's target tick, the error message, the disconnect path, and the legacy `GetPlayerLastAction` timer (3480-3497). It does not model whether a failed action refunds the timer, because the execution path was not read.

```ts
// Licence: GPL-3.0 (OpenRCT2 header: "licensed under the GNU General Public License version 3"; repo licence.txt is GPL v3). Clean-room sketch written from the described steps, not a translation of the donor lines.
// clean-room
export class CommandCooldowns {
  // One instance per connected player. Map: command name -> ms still to wait.
  private remaining = new Map<string, number>();

  constructor(private readonly isHost: boolean) {}

  // Called for each incoming command after its permission check. Returns false when refused.
  tryAccept(command: string, cooldownOnAcceptMs: number): boolean {
    if (!this.isHost) {                                       // the host is never limited
      const left = this.remaining.get(command);
      if (left !== undefined && left > 0) return false;       // refused: the running timer is NOT extended
      if (cooldownOnAcceptMs > 0) this.remaining.set(command, cooldownOnAcceptMs);
    }
    return true;
  }

  // Called once per network tick. elapsedMs is the real time since the previous tick (at least 1).
  decay(elapsedMs: number): void {
    for (const [cmd, left] of this.remaining) {
      const next = left - elapsedMs;
      if (next <= 0) this.remaining.delete(cmd);
      else this.remaining.set(cmd, next);
    }
  }
}

// The per-command cooldown values are data on the command, not on the player.
export const cooldownMs: Record<string, number> = {
  placeSmallScenery: 20,   // donor SmallSceneryPlaceAction::GetCooldownTime
  demolishRide: 1000,      // donor RideDemolishAction::GetCooldownTime
};
```

## 5. Lands in

- TARGET `src/fight/intake-cooldown.ts` (new). It is the per-player, per-command intake limit that runs before a fight command is queued. It is a flood guard at intake, not the attack-speed rule; the duel step keeps its own timing.
- Parity row: 5 (controls/input intake). The addendum gives intake to row 5. Row 18's server-tick sub-line (input intake) also applies because decay runs in the server tick, but row 5 names the gate.
- today: not checked. No Frankendom repo was read in this pass.
- Reuse tag: adapt-shape (GPL-3.0: clean-room only)
- Brief rule served: server decides (the server refuses or accepts before queueing); one ledger (a refused command changes nothing, including the timer); rules 7-9 n/a

Best transferable idea: a per-player, per-command timer on the server that refuses while it runs, never restarts on a refusal, and decays by real elapsed time, so input spam is cut without any client-side trust.
Decision (proposed): adapt. Keep the shape (keyed by command, refusal does not extend, host exempt, real-time decay), but the wait values belong in the catalogue as data per command, and they must not duplicate the duel's attack speed; a fight cadence rule in the duel step is the source of truth for attack timing.
Acceptance: a server test asserts that a second "attack" from one client 10 ms after the first is refused with the rate-limit message and does not extend the timer; an "attack" 1000 ms after the first is accepted; the host's inputs are never refused by this gate; and under a slow server tick the same 1000 ms of real time passes before the next accept.

## 6. Gaps and risks

- Timer keys on the command type only. The target is not part of the key, so one player can run the same command on different targets as long as the timer is clear. For Frankendom, decide whether a cooldown keys on the command alone or on command plus target (for example, the same hero).
- The timer starts at accept (3090), not at execution. If the queued action later fails, the player still waits. Frankendom must decide whether a refused or failed input refunds the timer; the donor does not (not verified in the execution path, which was not read).
- In the code read there is no total cap across commands: each command type has its own timer, so one client's total rate is not capped by this mechanism. Frankendom needs a total per-player budget if that matters (the per-tick NPC budget in the server-tick sub-line is a different thing).
- Two timing mechanisms exist in the same file: the cooldown map here and an older per-player `lastActionTime` check (`GetPlayerLastAction`/`SetPlayerLastAction`, 3479-3497; a second definition at 4238 was not read), whose callers were not traced. Frankendom should pick one.
- Decay runs only for connections whose `ProcessConnection` returns true (`TickServer` 556-558). A connection that fails processing is disconnected.
- The real-time decay means a slow server tick shortens the wait in game-tick terms, which is the intended behaviour here, but a duel that depends on game ticks must not reuse this timer for pacing.
- Values are constants on the action class (theirs, 20 and 1000 ms). Frankendom should hold them as data fields per command in the catalogue, not as code constants.
- GPL-3.0: clean-room. The sketch was written from the described steps.

Receipts note: the values 20 (SmallSceneryPlaceAction.cpp 61) and 1000 (RideDemolishAction.cpp 48) are stated from the lines read, but their receipts are not in receipts.tsv because the quote would be under 15 characters (`return 20;`, `return 1000;`). The function headers at SmallSceneryPlaceAction.cpp 59 and RideDemolishAction.cpp 46 have receipts.

Reuse tag: adapt-shape (GPL-3.0: clean-room only)
Brief rule served: server decides before queueing; one ledger; rules 7-9 n/a
