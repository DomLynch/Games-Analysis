# 0ad-0ad (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/0ad-0ad/source/simulation2/system/TurnManager.cpp` (with `network/NetServerTurnManager.cpp`, `network/NetClientTurnManager.cpp`, `network/NetServer.cpp`) | Licence: GPL-2.0-or-later (per the header of each file: "either version 2 of the License, or (at your option) any later version"; the donor's LICENSE.txt says "GPL version 2 (or later) - see license_gpl-2.0.txt") | C++ | symbol `CTurnManager::Update`

Checked: Read in full: `CTurnManager::Update` (TurnManager.cpp 65-155), `UpdateFastForward` (157-193), `AddCommand` and `FinishedAllCommands` (209-241), `TurnNeedsFullHash` (243-257); `CNetServerTurnManager` (all of NetServerTurnManager.cpp 1-226 and its header); `CNetClientTurnManager` (all of NetClientTurnManager.cpp 1-147); the frame caller `CGame::Update` (ps/Game.cpp 394-425). Read only in part: NetServer.cpp (425-455, 862-870, 1160-1220, 1370-1395), Simulation2.cpp (359-412, 513-545, 735-760). Not read: `RewindTimeWarp` and `QuickLoad` bodies, the lobby caller of `SetTurnLength`, the rest of the Simulation2 update phases after line 545. Confidence: high on the client turn loop, the input path and the server gate (read end to end); medium on the out-of-sync check (read, but not traced into every callee). This is not a camera topic. The 3-tick catch-up in section 1 is my arithmetic on the donor lines, not a measured run.

Best transferable idea: Stamp each input for a tick a fixed number ahead, store it in a per-tick batch keyed by a stable player id, and run that batch in sorted order on a fixed tick, so every tick is applied the same way however messages arrive.
Decision (proposed): adapt — keep the fixed step, debt clamp, stamped input with late rejection and stable per-tick order; drop the lockstep wait and client hash check, because kills are server-verified and one slow connection must not freeze a fight with up to MAX_ATTACKERS = 3.
Acceptance: Server test: two inputs for the same tick arrive in both orders and run in the same player-id order; an input for an already-run tick is rejected and counted in the fight record; a client that sends nothing for tick T does not stop tick T+1 from running.

## 1. Mechanism

- Model: deterministic lockstep. Every client runs the whole simulation. The server does not simulate: no file under network/ references CSimulation2 except the client turn manager (grep). The server orders the inputs and says when a turn may run. Clients send a state hash after each turn, and the server compares them.
- Client frame loop (ps/Game.cpp 399-409): real frame time is multiplied by the sim rate, and `TurnManager.Update(deltaSimTime, maxTurns)` is called with `maxTurns = (size_t)m_SimRate` (407-409). At normal speed the comment says one turn per frame (403-406).
- `CTurnManager::Update` (TurnManager.cpp 65-155), in order:
  1. Add the frame time to the debt `m_DeltaSimTime` (70), then clamp the debt to two turn lengths (75). A turn is run while the debt is not negative.
  2. Wait gate: if the next turn is not ready (`m_ReadyTurn <= m_CurrentTurn`, and the command delay is above 1), reset the debt to 0 and return false (84-97). The reset means it does not rush to catch up later.
  3. Loop while the debt is not negative and fewer than `maxTurns` turns have run (99-104). Re-check the ready gate (108). Send this client's own commands for `current + delay` (115). Increment the turn (118). Flush destroyed entities (123). If time-warp recording is on, save a snapshot (126-132). Gather the queued commands for this turn from queue slot 0, in ascending key order (136-137). Pop the queue (139-140). Log for replay (142). Run `Simulation2.Update(m_TurnLength, commands)` (146). Send the state hash for this turn (148). Subtract one turn length from the debt (151).
- Input path: `PostCommand` stamps each command with `m_CurrentTurn + m_CommandDelay` and sends it to the server (NetClientTurnManager.cpp 50). The server checks that the player id matches the sender, unless cheats are on (NetServer.cpp 1178-1182; line 1181 is the check). It then broadcasts the command to all in-game clients (1186) and stores it by its target turn (1189-1191). The server does not reorder commands.
- Client-side intake (`AddCommand`, TurnManager.cpp 209-232): a command for a turn that has already run is rejected with a warning (213-222). Otherwise it goes into queue slot `turn - (current + 1)`, keyed by client id (231). Within a turn, the batch is sorted by that client key (the map is `std::map<u32, ...>`, TurnManager.h 197), so every client applies the same order.
- Server gate (NetServerTurnManager.cpp): a client reports that it has finished its commands for turn N (`NotifyFinishedClientCommands`). It must report exactly the next turn, or it is disconnected (58-62). `CheckClientsReady` (75-104) loops over clients. Observers are skipped when no lag limit is set, or when they are within the limit (86-87). If any counted client has `readyTurn <= m_ReadyTurn`, it returns (89-90). Otherwise it increments `m_ReadyTurn` (93), broadcasts the end-of-batch message with the turn length (99-101), and saves the turn length (104). A joining client starts at its join turn plus `COMMAND_DELAY_MP - 1` (190).
- Out-of-sync check: `NotifyFinishedClientUpdate` (107-) stores each client's hash per turn. It compares only turns that every client has simulated. It takes the lowest client id's hash as the expected value (147; the comment says "host"). The first mismatch sets `m_HasSyncError` (154-157) and broadcasts a sync-error message (175). Full hashes are taken on turn 1 and every 20 turns; other turns get a quick hash (TurnManager.cpp 247-256).
- Simulation step (Simulation2.cpp 359-412, 513-545): the turn length in ms becomes fixed seconds (364). `UpdateComponents` broadcasts `TurnStart` (526), calls `FlushTurn(commands)` (533) and then runs the update phases with the fixed step (544). The sim is driven only by the fixed turn length passed in (364, 544); I did not check every component for real-time reads.
- Rejoin: `UpdateFastForward` (TurnManager.cpp 157-193) runs every ready turn at once with no wait. `NetClient.cpp` calls it after `FinishedAllCommands` (813-816).
- Catch-up arithmetic (my reading, not measured): the debt is clamped to 2 turn lengths (75), and a turn runs while the debt is not negative (78, 104). Each turn subtracts one turn length (151). So a clamped debt of two turns runs three turns in one update.

## 2. Key functions

- `CTurnManager::Update`: `/mnt/frankendom-donors/0ad-0ad/source/simulation2/system/TurnManager.cpp` 65-155. Debt add and clamp, wait gate, per-turn loop (own commands, advance, flush, sorted batch, sim step, hash, debt payback).
- `CTurnManager::AddCommand`: `/mnt/frankendom-donors/0ad-0ad/source/simulation2/system/TurnManager.cpp` 209-232. Rejects past turns (214-222); queue slot by turn offset, keyed by client (231).
- `CNetServerTurnManager::CheckClientsReady`: `/mnt/frankendom-donors/0ad-0ad/source/network/NetServerTurnManager.cpp` 75-105. The one gate that decides when a turn may run for everyone.
- `CNetServerWorker::OnSimulationCommand`: `/mnt/frankendom-donors/0ad-0ad/source/network/NetServer.cpp` 1160-1195. Sender check (1178-1182), relay (1186), save by turn (1189-1191).
- `CNetClientTurnManager::PostCommand`: `/mnt/frankendom-donors/0ad-0ad/source/network/NetClientTurnManager.cpp` 45-56. Stamps the command with the target turn (50).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed step with a debt clamp: run whole ticks while owed time is not negative, cap the owed time | Tick length 200 ms default (theirs, TurnManager.h 55; NetServerTurnManager.cpp 38) |
| Input lead: an input is stamped for a tick a fixed number ahead | Command delay 4 turns in multiplayer (theirs, TurnManager.h 74). At 200 ms that is 800 ms of lead (arithmetic) |
| Debt clamp | 2 turn lengths (theirs, TurnManager.cpp 75) = 400 ms at the default |
| Late input rejected | Reject when the target turn has already run (theirs, TurnManager.cpp 214) |
| Stable order within a tick | Ascending client key (theirs, TurnManager.cpp 136-137; map type TurnManager.h 197) |
| Wait for everyone before the next tick | Lockstep: the server waits for each counted client (theirs, NetServerTurnManager.cpp 89-90) |
| Hash check every N ticks | Full hash every 20 turns (theirs, TurnManager.cpp 253), which is 4 s at the default |
| Observer exemption | No limit by default: `max_observer_lag = -1` (theirs, NetServerTurnManager.cpp 77) |

## 4. TypeScript sketch

simplified: keeps the donor's debt clamp and run-while-not-negative loop, the stamped input intake that rejects late inputs, and the per-tick batch sorted in a stable order. It omits the donor's lockstep wait (the donor pauses and resets the debt; the sketch never waits, so a missing input is simply absent for that tick), the sending of this client's own commands for `tick + delay`, the flush of destroyed entities, time-warp snapshots, the replay log, the state hash, and fast-forward. It sorts by player id, while the donor sorts by client id. It keys the queue by tick in a Map, where the donor uses a deque indexed by turn offset.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PlayerId = number;
interface Cmd { player: PlayerId; payload: unknown; }

const TICK_MS = 200;          // fixed tick length (donor DEFAULT_TURN_LENGTH)
const INPUT_DELAY_TICKS = 4;  // inputs are stamped for now + this many ticks (donor COMMAND_DELAY_MP)

class TickScheduler {
  private current = 0;        // last tick that has run
  private owedMs = 0;         // time owed to the sim; a tick runs while owedMs >= 0
  private queued = new Map<number, Map<PlayerId, Cmd[]>>();

  // Input intake: an input for a tick that has already run is rejected, never run late.
  submit(player: PlayerId, tick: number, cmd: Cmd): boolean {
    if (tick <= this.current) return false;
    const byPlayer = this.queued.get(tick) ?? new Map<PlayerId, Cmd[]>();
    byPlayer.set(player, [...(byPlayer.get(player) ?? []), cmd]);
    this.queued.set(tick, byPlayer);
    return true;
  }

  // Frame loop: add real time, clamp the debt to two ticks, then run whole ticks (at most maxTicks).
  advance(elapsedMs: number, maxTicks: number, step: (tick: number, cmds: Cmd[]) => void): number {
    this.owedMs = Math.min(this.owedMs + elapsedMs, 2 * TICK_MS);
    let ran = 0;
    while (this.owedMs >= 0 && ran < maxTicks) {
      const tick = this.current + 1;
      const byPlayer = this.queued.get(tick) ?? new Map<PlayerId, Cmd[]>();
      this.queued.delete(tick);
      const ordered: Cmd[] = [];
      for (const p of [...byPlayer.keys()].sort((a, b) => a - b)) {
        ordered.push(...(byPlayer.get(p) ?? []));
      }
      this.current = tick;
      step(tick, ordered);
      this.owedMs -= TICK_MS;
      ran++;
    }
    return ran;
  }
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new engine module): the one fixed-step scheduler that the server runs for every fight. It owns the debt clamp, the stamped input intake and the per-tick batch. Clients use the same step for prediction only if we decide that; the donor shows the shape, not the authority.
- Parity-checklist row 18 (loot roll and XP award), sub-line post-K item 3 "server tick: fixed step, input intake, per-tick NPC budget". The server tick has no row of its own, so this is the row it cites.
- today: current Frankendom server tick location (not read). I did not open the Frankendom repo for this note.
- Decision (proposed): adapt. Keep the fixed step, the debt clamp, the stamped input with late rejection, and the stable per-tick order. Drop the lockstep wait and the client-side hash check. Reason in section 6.
- Acceptance: a server test in which two inputs for the same tick arrive in both orders and run in the same player-id order; an input for an already-run tick is rejected and counted in the fight record; a client that sends nothing for tick T does not stop tick T+1 from running.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: one tick step runs on the server, and clients render it). Server-verified kills: the donor has no server-verified kills; see section 6.

## 6. Gaps and risks

- Authority model is the reverse of ours. In the donor every client simulates the whole game, and the server only orders inputs and compares hashes. Frankendom rules say kills are server-verified, so the server must run the fight itself. Take the scheduler and the ordering; do not take the lockstep model.
- The wait gate (TurnManager.cpp 84-97; server NetServerTurnManager.cpp 89-90) would freeze the duel and every attacker when one connection is slow. MAX_ATTACKERS = 3 makes this worse, not better. The sketch never waits. A late input is simply absent for that tick.
- A 4-tick lead is 800 ms at the donor's 200 ms tick. That is far too much for a fast duel. The lead and the tick length should be tuned data values, not copied. The donor set them for its own game; the comment above the constant (TurnManager.h, just above line 74) asks for the lowest value that does not freeze play.
- Late inputs are dropped with a warning (TurnManager.cpp 214-222). Frankendom needs one rule: a late guard or parry is either applied on the next tick or dropped, and that choice is counted in the fight record (row 19). The donor gives no answer.
- Debt clamp and catch-up: by my reading the clamp allows three ticks in one frame (section 1). Each tick runs NPC AI, so the per-tick NPC budget (post-K item 3) must cap work per tick, not per frame.
- Ordering by client id (TurnManager.cpp 136-137): Frankendom must order by one stable player or character id in the one ledger, never by connection order.
- Observers: duels have no observers. The observer exemption (NetServerTurnManager.cpp 86-87) does not apply; reject it.
- Hash checks every 20 turns (TurnManager.cpp 253) exist to catch client divergence. With a server-verified fight they have no job. Keep at most a replay hash for row 19.
- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism. No donor lines are copied.
- Not read: the time-warp rewind (`RewindTimeWarp`, `QuickLoad`) and the lobby caller of `SetTurnLength` (so whether a host can change the tick length mid-game is not confirmed). The Simulation2 update phases after line 545.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine: one tick step); server tick sub-line post-K item 3; server-verified kills (donor has none, see section 6)
