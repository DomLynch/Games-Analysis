# dhewm-dhewm3 (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/async/AsyncServer.cpp` (with `async/AsyncNetwork.cpp`, `UsercmdGen.h`, `BuildDefines.h`, `Common.cpp`) | Licence: GPL-3.0-or-later (per the header of `AsyncServer.cpp`, `Session.cpp`: "either version 3 of the License, or (at your option) any later version"; the donor's COPYING.txt is GPL v3) | C++ | symbol `idAsyncServer::RunFrame`

Checked: Read in full: `idAsyncServer::RunFrame` (AsyncServer.cpp 2349-2489, including the snapshot send loop), `idAsyncServer::UpdateTime` (2337-2345), `idAsyncServer::DuplicateUsercmds` (603-619), `idAsyncServer::CheckClientTimeouts` (802-831), the usercmd case of `ProcessUnreliableClientMessage` (1290-1332), `idAsyncNetwork::DuplicateUsercmd` (AsyncNetwork.cpp 251-273), the network cvars (AsyncNetwork.cpp 49-54), and the constants (UsercmdGen.h 40-41; BuildDefines.h 113-115). Read in part: `SendSnapshotToClient` (AsyncServer.cpp 1140-1200), `Com_UpdateTicNumber` and `Com_UpdateFrameTime` (Common.cpp 264-309) and `com_preciseFrameLengthMS` (Common.cpp 121). Not read: client-side prediction (`AsyncClient.cpp`), the packet read path before line 1290, the body of `game->RunFrame`. The hinted `Session.cpp` is the session and local loop, not the server tick; I read only its header and the grep lines (for example 559-561, 2704, 2867-2904), so it is not the basis of this note. Confidence: high on the server frame loop and the duplicate-decay rule (read end to end); medium on the snapshot path (read only in part); the 62.5 frames per second figure is my arithmetic on the constants, not a measured run. This is not a camera topic.

Best transferable idea: When a client's command is late, repeat the last command for a counted window, then drop the attack and shrink large move axes frame by frame, so a stalled connection cannot keep swinging.
Decision (proposed): adapt — take the repeat-then-decay rule and the clamped residual clock, with the repeat window as tuned data (the donor's 25 frames is about 400 ms, too long for a duel); reject the uncapped frame loop and the integer 16 ms step.
Acceptance: Server test: an attack sent on frame 10 and then no input repeats as stale through frame 35; from frame 36 no attack is applied and move axes shrink to at most 2 within a few frames; a fresh command resets the count to zero.

## 1. Mechanism

- Model: the server runs the game (`game->RunFrame`, AsyncServer.cpp 2445). Clients send their commands for recent frames, and the server sends snapshots back. This is server-authoritative, unlike the lockstep donors.
- Clock: `RunFrame` starts with `msec = UpdateTime(100)` (2361). `UpdateTime` adds the real elapsed time, clamped to the argument (2341), to `serverTime` (2343), and returns it. The clamp is 100 ms per call.
- Residual: the elapsed time goes into `gameTimeResidual` (2372). A spin loop (2375-2395) then reads packets with a blocking timeout of `USERCMD_MSEC - gameTimeResidual - 1` (2380), calling `UpdateTime(100)` after each read (2390-2391). It exits when the residual covers one frame (2395).
- Frame loop (2436-2453): `while (gameTimeResidual >= USERCMD_MSEC)`. Each iteration: sample the local client's input (2439), duplicate stale commands for every client (2442), run the game frame (2445), advance `gameFrame` (2450), add `USERCMD_MSEC` to `gameTime` (2451) and subtract it from the residual (2452). There is no cap on frames per call; the cap is only the 100 ms clamp per `UpdateTime` call, and the spin can call `UpdateTime` more than once.
- Input intake (`ProcessUnreliableClientMessage`, 1301-1322): a client packet carries its `gameFrame` (1306) and a count of commands (1307). The server writes the run of commands ending at that frame into `userCmds`, sets each command's frame, and clears `duplicateCount` (1312). It records the last frame as the client's frame (1320).
- Stale-input decay (`DuplicateUsercmds` 603-619, `DuplicateUsercmd` AsyncNetwork.cpp 254-273): for each occupied client slot, if the current frame's command has no newer time than the previous frame's (256), the server copies the previous command (258), sets the frame and time to the current ones, and increments `duplicateCount` (261). Past 25 repeats (263; `MAX_USERCMD_DUPLICATION`, BuildDefines.h 114), the attack button is cleared (264) and each move axis with absolute value above 2 is halved (265-266). The halving is applied to the copied command, so it compounds frame by frame until each axis is at most 2 in absolute value (my reading of 258 and 265).
- Snapshot send (2458-2489): for each client that is not free and not the local client, if the channel is ready, the server sends a snapshot (2483) or an empty message or ping. `SendSnapshotToClient` skips the send unless `serverSnapshotDelay` (50 ms) has passed since the last snapshot (1149; default AsyncNetwork.cpp 49). The snapshot also carries the next few commands of each other client that is in the recipient's potentially visible set (1177-1184), up to `maxRelay` (1186-1196; default cvar 5, maximum 10).
- Timeouts (`CheckClientTimeouts`, 802-831): zombie clients are freed after `serverZombieTimeout` (5 s, AsyncNetwork.cpp 53) and connected clients are dropped after `serverClientTimeout` (40 s, AsyncNetwork.cpp 54). Both are measured against `serverTime`.
- Common tic clock (Common.cpp 264-309, which the local session loop uses; I did not trace every caller): `Com_UpdateTicNumber` owes `1 + timeDiff * 0.06` tics when the due time has passed (270-282) and moves the due time by that many precise 1000/60 ms steps (287). `com_preciseFrameLengthMS` is `1000.0 / 60.0` (121).

## 2. Key functions

- `idAsyncServer::RunFrame`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/async/AsyncServer.cpp` 2349-2489. Clock, packet spin, frame loop, snapshots.
- `idAsyncServer::DuplicateUsercmds`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/async/AsyncServer.cpp` 603-619. Calls the duplicate helper for every client slot before each game frame.
- `idAsyncNetwork::DuplicateUsercmd`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/async/AsyncNetwork.cpp` 254-273. The stale-input rule: repeat, count, then decay the attack and move axes.
- `idAsyncServer::ProcessUnreliableClientMessage` (usercmd case): `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/async/AsyncServer.cpp` 1301-1322. Command intake keyed by frame.
- `idAsyncServer::CheckClientTimeouts`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/async/AsyncServer.cpp` 802-831.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Residual clock: add elapsed time, run whole frames while the residual covers one | Frame step `USERCMD_MSEC` = `1000 / 60` as integer division = 16 ms (theirs, UsercmdGen.h 40-41) |
| Clamp the time counted per update | 100 ms per `UpdateTime` call (theirs, AsyncServer.cpp 2361) |
| Repeat the last command when a new one is missing | Repeat until `duplicateCount` > 25 (theirs, AsyncNetwork.cpp 263; BuildDefines.h 114). 25 frames x 16 ms = 400 ms (arithmetic) |
| Decay after the repeat limit | Attack cleared; axes above 2 halved each frame (theirs, AsyncNetwork.cpp 264-266) |
| Fresh input resets the repeat count | Reset to 0 on each received command (theirs, AsyncServer.cpp 1312) |
| Snapshot rate limit | 50 ms between snapshots per client (theirs, AsyncNetwork.cpp 49) |
| Relay of other players' commands | Default 5, maximum 10 (theirs, AsyncNetwork.cpp 52; BuildDefines.h 115) |
| Command ring | 256 entries (theirs, BuildDefines.h 113) |
| Disconnect timeouts | Zombie 5 s; client 40 s (theirs, AsyncNetwork.cpp 53-54) |

## 4. TypeScript sketch

simplified: keeps the stale-input rule (repeat the last command, count repeats, clear the attack and halve axes above 2 past the limit, reset the count on a fresh command) and the residual frame loop (clamped elapsed time, run whole frames while the residual covers one). It omits the packet spin with its blocking read, the per-client slot table, the local-client sampling, the snapshot and relay send, the timeouts, the command ring of 256, and the 0.1 ms and integer details of the donor. It uses an integer 16 ms frame to match the donor step, and it has no cap on frames per call, as the donor has none. The halving uses the same shift as the donor, and the decay of the copied command compounds the same way.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const FRAME_MS = 16;          // server frame step (donor USERCMD_MSEC, integer 1000 / 60)
const MAX_DUPLICATES = 25;    // repeats of a stale command before decay starts (donor MAX_USERCMD_DUPLICATION)
const MAX_CLAMP_MS = 100;     // elapsed time counted per clock update (donor UpdateTime clamp)

interface Cmd {
  move: number[];             // [forward, right, up] as small integers
  attack: boolean;
  frame: number;
  dup: number;                // how many frames this command has been repeated
}

class ServerInput {
  private last: Cmd = { move: [0, 0, 0], attack: false, frame: -1, dup: 0 };

  // A fresh command from the client resets its repeat count.
  receive(cmd: Cmd): void {
    this.last = { ...cmd, dup: 0 };
  }

  // Called once per server frame when no new command arrived for that frame.
  // Repeats the previous command; past the limit, drops the attack and halves big move axes.
  duplicate(frame: number): Cmd {
    const next: Cmd = { ...this.last, move: [...this.last.move], frame, dup: this.last.dup + 1 };
    if (next.dup > MAX_DUPLICATES) {
      next.attack = false;
      next.move = next.move.map(v => (Math.abs(v) > 2 ? v >> 1 : v));
    }
    this.last = next;
    return next;
  }
}

// Server clock: add elapsed time (clamped), then run one frame per FRAME_MS of residual. No cap per call.
class ServerClock {
  residual = 0;

  advance(elapsedMs: number, runFrame: () => void): number {
    this.residual += Math.min(Math.max(elapsedMs, 0), MAX_CLAMP_MS);
    let ran = 0;
    while (this.residual >= FRAME_MS) {
      runFrame();
      this.residual -= FRAME_MS;
      ran++;
    }
    return ran;
  }
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (engine server tick): the residual clock and the per-frame input step. The stale-input rule runs inside the server's fight step, so a late command never reaches the fight as a fresh attack.
- Parity-checklist row 18 (loot roll and XP award), sub-line post-K item 3 "server tick: fixed step, input intake, per-tick NPC budget". Input intake and the repeat window are the intake part of that sub-line.
- today: current Frankendom intake (not read).
- Decision (proposed): adapt. Take the repeat-then-decay rule and the residual clock with a clamp. Set the repeat window as a tuned data value (not 25 frames, see section 6) and reject the uncapped frame loop.
- Acceptance: a server test in which a client sends an attack on frame 10 and then nothing: frames 11 to 35 repeat the attack as stale, and from frame 36 no attack is applied and the move axes shrink to at most 2 within a few frames; a fresh command resets the count to zero. (With the donor's 25-frame window, frame 36 is the first frame with the attack cleared. A duel will use a shorter window.)
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: one server frame step runs the fight); server-verified kills (the server runs the game, as ours does; the donor's clients are shown state, not the kill decision).

## 6. Gaps and risks

- Authority matches ours: the server runs the game and sends snapshots (AsyncServer.cpp 2445, 2483). This is the closest of the three donors to Frankendom's rulings. The client-side prediction that makes it feel responsive is in `AsyncClient.cpp`, which I did not read, so the prediction half is not assessed.
- The frame loop has no cap per call (2436). A stall is bounded only by the 100 ms clamp per `UpdateTime` call, and the spin can call it more than once. By arithmetic, one call can run more than six frames after a stall. The per-tick NPC budget (post-K item 3) must cap work per frame.
- Integer step: `USERCMD_MSEC` is `1000 / 60` in integer math, which is 16 ms (UsercmdGen.h 41). The server therefore runs 62.5 frames per real second (1000 / 16). The local tic clock uses `1000.0 / 60.0` as a double (Common.cpp 121). By arithmetic the server runs about 4% more frames per second than the local clock. Frankendom must use one tick length from one constant. Do not copy the integer.
- The repeat window of 25 frames is 400 ms at 16 ms (arithmetic). For a fast duel that lets a stale attack keep landing for almost half a second. The window must be a tuned data field, and probably far shorter.
- The move decay compounds each frame past the limit until each axis is 2 or less (AsyncNetwork.cpp 265-266). A designer needs to know the curve is geometric; decide it as data, not as a shift.
- The relay of other players' commands in snapshots (AsyncServer.cpp 1177-1196, only for clients in the recipient's visible set; default 5) exists for the donor's client prediction of other players. With server-verified kills, clients should be sent state, not other players' commands. Reject the relay.
- Snapshots go out at most every 50 ms per client (AsyncNetwork.cpp 49). That is per client, not per tick, so it is not a fixed relationship to the frame step. Keep the snapshot rate separate from the tick rate in our data.
- Timeouts are connection timeouts: 5 s for zombies and 40 s for clients (AsyncNetwork.cpp 53-54). A fight should mark a silent fighter absent through the ledger much sooner, and leave the connection timeout to the transport.
- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- Not read: client prediction (`AsyncClient.cpp`), the packet read before line 1290, the body of `game->RunFrame`, and the body of `SendSnapshotToClient` beyond line 1200.
