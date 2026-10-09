# FWGS-xash3d-fwgs (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/server/sv_main.c` | Licence: UNCLEAR (no licence file on disk). Treated as clean-room only. | C | symbol `SV_RunGameFrame / SV_ReadPackets`

Checked: Symbol `SV_RunGameFrame` opens at 600 and closes at 631 (verified). `SV_ReadPackets` is at 378-463. The per-frame caller `Host_ServerFrame` is at 676-717. All three read in full.

## 1. Mechanism

- The dedicated server's frame, in one place. Inputs: the socket (packets from clients), the host's real frame time, the server's simulation rate (`sv_fps`), and the clients' pending commands. Outputs: game-world steps, and the messages sent back to each client at the end of the frame.
- Order per host frame (`Host_ServerFrame`, 676-717): status line (dedicated only, every 0.5 s), return if the server is not initialised, add host time to the residual (only when `sv_fps != 0` and the server is simulating or not yet active, 684-685), set `sv.frametime` to the host frame time when `sv_fps == 0` (687-688), check the clients' command time window (`SV_CheckCmdTimes`), read all waiting packets (`SV_ReadPackets`), refresh movement variables, request missing resources, check timeouts, run the game frames (`SV_RunGameFrame`), send client messages, clear the per-frame flags, send a master heartbeat. If `SV_RunGameFrame` returns false the function returns early, so the send, prep and heartbeat steps are skipped. The bodies of `SV_CheckCmdTimes`, `SV_UpdateMovevars`, `SV_RequestMissingResources`, `SV_CheckTimeouts`, `SV_SendClientMessages`, `SV_PrepWorldFrame` and `SV_Physics` were not read.
- `SV_RunGameFrame` (600-631): if the server is not simulating it returns true without stepping (602-605). Fixed step (`sv_fps != 0`): while the residual is at least one step (1 / (sv_fps - 0.01), commented "FP issues"), run `SV_Physics`, subtract one step from the residual, add it to `sv.time`; returns true only if at least one step ran. Variable step (`sv_fps == 0`): one `SV_Physics` call, `sv.time += sv.frametime`, returns true.
- Packet intake (`SV_ReadPackets`, 378-463): reads every waiting packet. Connectionless packets (first four bytes all ones) go to a separate handler. Other packets are matched to a connected client by source address, skipping free slots and fake clients (396-404). `Netchan_Process` checks the sequence; on success the server adopts the source port (415-417), flags the client for a reply at end of frame if it is not yet spawned (or in a one-client local game, 419-420), and calls `SV_ExecuteClientMessage` if the client has a frames buffer and is not a zombie (423-428). Normal fragments are reassembled and executed the same way (432-448), file fragments go to `SV_ProcessFile` (450-453). Only the first matching client is handled (`break`, 455).
- Tick: the host loop. The game step runs at the fixed rate, possibly several steps in one host frame when the residual has built up.

## 2. Key functions

- `Host_ServerFrame`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/server/sv_main.c` 676-717. The order of steps for one server frame.
- `SV_RunGameFrame`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/server/sv_main.c` 600-631. Drain the residual in whole fixed steps (catch-up loop), or run one variable step.
- `SV_ReadPackets`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/server/sv_main.c` 378-463. Drain the socket, route connectionless packets, match clients by address, sequence check, fragments, command execution.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step accumulator: add real time, run whole steps, keep the rest | Step = 1 / (sv_fps - 0.01) (theirs, 609; the 0.01 is a float guard per the donor comment) |
| Catch-up: several steps in one host frame when behind | No cap in this loop (noted as a gap) |
| Read all packets before simulating, send after | Order (mechanism) |
| Route by address, sequence-check, then execute | Address match (mechanism) |
| Skip the send step when the game frame did not run | Rule (mechanism) |

## 4. TypeScript sketch

simplified: omits the not-simulating early return, the status line, the not-initialised return, the command time-window check, timeouts, movevars and resource requests, the per-client reply flags, and the post-send cleanup and heartbeat. Order changed to match the donor: the residual is added BEFORE inbound packets are read, not inside the step loop.

```ts
// Licence: UNCLEAR (no licence file on disk). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Sim { time: number; residual: number; step: (dt: number) => void; }

// One host frame: bank time, take all inbound messages, run whole fixed steps, then reply.
function serverFrame(sim: Sim, hostDt: number, fps: number,
                     readInbound: () => void, sendReplies: () => void): void {
  if (fps > 0) sim.residual += hostDt;             // time banked first
  readInbound();                                   // all waiting messages next
  let ran = 0;
  if (fps > 0) {
    const step = 1 / (fps - 0.01);                 // float guard, as in the donor
    while (sim.residual >= step) {
      sim.step(step);
      sim.residual -= step;
      sim.time += step;
      ran++;
    }
  } else {
    sim.step(hostDt);
    sim.time += hostDt;
    ran = 1;
  }
  if (ran > 0) sendReplies();                      // reply only when the world moved
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module, fight engine): the server tick loop for the fight: fixed step, read-then-step-then-reply order, and a catch-up cap that the donor lacks. Parity-checklist row 4 (fight loop at 60 Hz, events to page; K2b / K2c delete) and row 18 (post-K item 3 server tick).
- today: the 60 Hz step per tick already exists on the client side (`src/net/pvp.ts` driver stepped once per tick through `Match`'s pvp mode, `src/net/rollback.ts` `frame()` once per tick); there is no server tick loop and no catch-up cap. (read in worktree `frankendom-combat-p3`, commit 6adcab27e). Zone 1 and the origins each own a copy of the fight loop (checklist row 4).
- Reuse tag: rewrite-from-idea (clean-room; licence unclear)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Licence unclear: clean-room only. The sketch is written from the mechanism; no lines are copied. The licence should be confirmed before any reuse; Lead decides.
- The catch-up loop has no cap. If the host falls far behind, one frame can run many steps. Frankendom needs a cap (and a rule for what happens to the excess time).
- The fixed step is set by a cvar (`sv_fps`). Frankendom's zone data should set it per zone, with a default.
- Packet intake is a socket and netchannel layer (fragments, file transfer, NAT). Frankendom's Supabase and HTTP path is not a netchannel; only the order of steps transfers.
- The donor runs a full game world per server; Frankendom runs one fight per instance. Its tick must be per instance, not global.
- Only the three functions above were read. The netchannel and client-message parsers, `SV_Physics` and `SV_CheckTimeouts` were not read.
- The donor has no per-zone data and no kill authority in these functions; server-verified kills would sit in what runs inside the step, not in this loop.
