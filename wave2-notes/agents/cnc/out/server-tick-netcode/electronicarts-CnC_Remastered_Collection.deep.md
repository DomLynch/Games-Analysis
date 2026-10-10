# electronicarts-CnC_Remastered_Collection (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` | Licence: GPL-3.0-or-later with EA Section 7 additional terms (QUEUE.CPP lines 7-10; LICENSE.md line 3), clean-room only | C++ | symbol `Queue_AI_Multiplayer`

Checked: The hint file, `PACKET.CPP`, is not sync code. It is a packet field parser from the "Westwood Auto Registration App" (PACKET.CPP:18; constructor at 97); a grep of PACKET.CPP and PACKET.H for frame, sync, lockstep, latency and delay returned nothing. The real sync layer is `QUEUE.CPP`: `Queue_AI` 318, `Queue_AI_Multiplayer` 514-766 (read in full), `Wait_For_Players` 800-1053 (read in full), `Can_Advance` 1820-1863 (read in full), `Process_Send_Period` 1328-1348 (read in full), `Send_FrameSync` 1505-1538 (read in full), `Process_Receive_Packet` 1575- (read 1575-1640), `Build_Send_Packet` 2108-2150 (read), `Execute_DoList` 2839-3069 (read 2839-2960 and 3012-3040), `Generate_Real_Timing_Event` 1157- (read 1200-1240). Not read: the body of `Send_Packets` (1377-1505, header comment only), `Handle_Timeout` (1976), `Process_Serial_Packet`, `Process_Reconnect_Dialog`, `Compute_Game_CRC`, `Generate_Process_Time_Event` (1268), and `Execute_DoList` lines 2960-3012 and 3040-3069. A grep of `TIBERIANDAWN/*.CPP` and `*.H` for rollback, roll back, re-simulate and resimulate returned no hits, so this is lockstep with no rollback.

## 1. Mechanism

- Deterministic peer-to-peer lockstep. There is no server tick. Every machine runs the same simulation and exchanges commands; the donor's own header calls this the frame-sync logic, "the heart & soul of network play" (QUEUE.CPP 412-...). The gate that matters: a machine may run frame F only when F is less than the slowest peer's frame plus MaxAhead, and only after every command the peers say they sent has arrived (1852, 1857). A machine that is blocked does not predict or re-simulate; it waits.
- Order of operations for one game frame. `Queue_AI` (340) calls `Queue_AI_Multiplayer` once per game-loop pass; the frame counter is incremented after the frame logic (CONQUER.CPP 1663-1666), so one call is one frame.
  (a) Frame 0 only: send a FRAMESYNC and wait until every peer reports ready (585-650).
  (b) Every 128 frames, `(Frame & 0x007f) == 0` (653): every machine sends its process time (664); the host alone, `MPlayerID[0]` (669), sends the timing event that retunes MaxAhead and DesiredFrameRate (670).
  (c) Store this frame's CRC (684).
  (d) `Process_Send_Period` (693). It returns 0 unless Frame is a multiple of FrameSendRate (1334). On a 0 the whole function returns right there: no send, no wait, no execute on that frame. The gate below therefore runs only on every FrameSendRate-th frame.
  (e) Send the queued commands (704). Each command is stamped with the frame it will run on: the next multiple of FrameSendRate at or after Frame + delay (2126-2127). The header carries the local CRC (2137), the number of commands in this packet (`num_cmds`, 2138; the running total is `my_sent`, and `Send_Packets` was not read), and the delay (2139).
  (f) `Wait_For_Players` (720-721), with a resend interval of `MPlayerMaxAhead << 3`. Each pass of its loop: resend FRAMESYNC when the retry timer fires (850-859); service connections; read up to five messages (918); feed each to `Process_Receive_Packet` (970); then test `Can_Advance` (1018). If the gate is shut, the loop calls `Call_Back` (1032) and keeps the map drawn and the input live, then loops. The timeout is `FRAMESYNC_TIMEOUT` (523) times 2 times `timeout_factor` (723), where the factor is 6 for internet and 1 otherwise (526).
  (g) `Can_Advance` (1820-1863). With `MPlayerCount == 1` it returns 1 at once (1831), so a lone player never waits. Otherwise `oldest` = min over `their_frame[]`, starting from `Frame + 1000` (1837). `count_ok` requires every peer's `their_recv` to reach its `their_sent` (1852). It advances iff `count_ok` and `Frame < oldest + MaxAhead` (1857).
  (h) `Execute_DoList` (called at 751; body 2839-3069). It walks `MPlayerHouses` in a fixed order (2892) so every machine runs commands in the same order (2883). A command whose frame is already past (`Frame > event frame`, and not a FRAMEINFO) is a fatal "packet too late" (2932-2937); the caller then stops the game (751-753). A FRAMEINFO's CRC is compared with this machine's stored CRC for frame `(event frame - delay) & 31` (3024); a mismatch raises the OUT_OF_SYNC prompt.
- Receiver side, `Process_Receive_Packet` (1575-). `their_frame[index] = event.Frame - event.Delay` (1608), moved forward only (1597). `their_sent[index]` is the largest CommandCount seen (1616). A non-FRAMEINFO packet has its commands added to the DoList.
- Sender side, `Send_FrameSync` (1505-1538). The FRAMESYNC carries `packet.Frame = ((Frame + MPlayerMaxAhead + (FrameSendRate - 1)) / FrameSendRate) * FrameSendRate` (1517) and `Delay = MPlayerMaxAhead` (1527).
- Lead retune, `Generate_Real_Timing_Event` (1157-). Response time is in 60ths of a second (1211). `maxahead = (resp_time * DesiredFrameRate) / (2 * 60)` (1227). It is rounded up to a multiple of FrameSendRate (1234) and floored at `FrameSendRate * 3` (1235). DesiredFrameRate is capped at `60 / GameSpeed` (1207).
- No rollback. The per-frame cross-machine check I read is the CRC at 3024; a mismatch shows the player a continue-or-stop choice (3026). The start-up scenario CRC (`ScenarioCRC`, 1525) was not traced beyond that line.

## 2. Key functions

- `Queue_AI_Multiplayer`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 514-766. Per-frame driver: timing, send period, send, wait, execute, clean. Receipts: 514, 693, 704, 720-721, 751.
- `Wait_For_Players`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 800-1053. Blocking loop: resend, timeout, drain, gate. Receipts: 850, 918, 970, 1018.
- `Can_Advance`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 1820-1863. The whole gate: lone-player bypass, oldest frame, count rule, lead window. Receipts: 1820, 1831, 1837, 1852, 1857.
- `Process_Send_Period`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 1328-1348. Send-frame gate. Receipt: 1334.
- `Send_FrameSync`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 1505-1538. Sync stamp and delay. Receipts: 1517, 1527.
- `Build_Send_Packet`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 2108-2150 (read). Command stamp and CRC. Receipts: 2126, 2137.
- `Process_Receive_Packet`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 1575-1640 (read). Receipts: 1608, 1616.
- `Execute_DoList`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 2839-3069 (partly read). Fixed order, too-late error, CRC check. Receipts: 2839, 2883, 2892, 2932, 2937, 3024.
- `Generate_Real_Timing_Event`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/QUEUE.CPP` 1157- (read 1200-1240). Lead retune. Receipts: 1207, 1211, 1227, 1234, 1235.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stamp a command with (now + lead), rounded up to a send boundary | FrameSendRate = 3 (theirs, INIT.CPP 862); the INI default for SendRate is also 3 (theirs, INTERNET.CPP 306) |
| Advance only while Frame < slowest peer's frame + lead | MaxAhead = 3 (theirs, GLOBALS.CPP 594); WChat INI default 9 (theirs, INTERNET.CPP 305); lone player never waits (1831) |
| Advance only once every command the peers claim to have sent has arrived | none (the rule itself, 1852) |
| Retune the lead from measured round-trip time | DesiredFrameRate = 30 (theirs, INIT.CPP 867); divisor 2 * 60 (1227); floor 3 * FrameSendRate (1235) |
| Resend the sync packet while waiting | interval MaxAhead << 3 ticks (721) |
| Retune only every 128 frames | mask 0x007f (653) |
| Give up after a silence | FRAMESYNC_TIMEOUT = 25 * 60 ticks (523); times 2 times the factor 6 for internet (723, 526) |

Worked numbers from the code. At DesiredFrameRate 30 a frame is 60 / 30 = 2 ticks (framedelay at CONQUER.CPP 1533). With the defaults (lead 3, send rate 3), a command is stamped for the first send boundary at or after Frame + 3, so it runs 3 to 5 frames later (0.1 to about 0.17 s at 30 fps).

Retune check, taking the formula at 1227 with the floor at 1235: round-trip 60 ticks (1 s) gives 60 * 30 / 120 = 15 frames, already a multiple of 3, and max(15, 9) = 15 frames (0.5 s). Round-trip 4 ticks gives 4 * 30 / 120 = 1, rounded up to 3, and max(3, 9) = 9 frames (0.3 s). The floor of 9 comes from FrameSendRate * 3 with the default send rate.

The FORCE_WINSOCK default at INIT.CPP 1737 (MaxAhead = FrameSendRate * 3) sits under `#ifdef FORCE_WINSOCK`; TCPIP.H:46 defines it as 1. Whether INIT.CPP sees that define was not checked (not read).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order at the gate (send-frame check, then the count rule and lead window), but it does not send: the caller must send first, as the donor does (704 before 720). It omits the frame-0 ready handshake, the FRAMESYNC resend, the timeouts and the reconnect dialog, the 128-frame timing retune and the response-time formula, the CRC desync check, the too-late error (the donor stops the game; the sketch only returns a step kind), the five-messages-per-loop receive cap, and the execution of queued commands in player order. Lead and send rate are parameters here, where the donor reads them from the host event and the INI.

```ts
// Licence: GPL-3.0-or-later plus EA Section 7 terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface PeerClock {
  frame: number; // latest frame this peer's packets claim (-1 = not heard yet)
  sent: number;  // commands this peer says it has sent
  recv: number;  // commands I have received from this peer
}

interface LockState {
  frame: number;     // my simulation frame
  lead: number;      // frames I may run ahead of the slowest peer (donor default 3)
  sendRate: number;  // frames between command packets (donor default 3)
  peers: PeerClock[];
}

// Frame stamp for a command queued now: the next send boundary at or after frame + lead.
function stampFrame(w: LockState): number {
  return Math.ceil((w.frame + w.lead) / w.sendRate) * w.sendRate;
}

// Record one incoming packet from peer i. Both values only move forward.
function onPacket(w: LockState, i: number, stampedFrame: number, peerLead: number, commandCount: number): void {
  const p = w.peers[i];
  const theirFrame = stampedFrame - peerLead;
  if (p.frame < theirFrame) p.frame = theirFrame;
  if (commandCount > p.sent) p.sent = commandCount;
}

// Gate: may I run frame w.frame? A lone player never waits. Otherwise every peer's
// commands must have arrived, and I may run at most `lead` frames past the slowest peer.
function canAdvance(w: LockState): boolean {
  if (w.peers.length === 0) return true;
  let slowest = w.frame + 1000;
  for (const p of w.peers) if (p.frame < slowest) slowest = p.frame;
  for (const p of w.peers) if (p.recv < p.sent) return false;
  return w.frame < slowest + w.lead;
}

// One loop step. Non-send frames do nothing; on a send frame the caller sends first, then this gate decides.
type Step = { kind: 'idle' } | { kind: 'wait' } | { kind: 'run'; frame: number };

function step(w: LockState): Step {
  if (w.frame % w.sendRate !== 0) return { kind: 'idle' };
  return canAdvance(w) ? { kind: 'run', frame: w.frame } : { kind: 'wait' };
}
```

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new module; the server tick's input window and gate). Parity-checklist row 18 (post-K item 3: server tick unifies), per the brief's net-tick mapping. Note that the checklist's own label for row 18 is "Loot roll, XP / career award"; the post-K note on that row is the one that names the server tick. Input stamping at intake is row 5 (controls / input).
- today: no net-tick module located (the Frankendom tree was not opened in this cell).
- Ruling (Lead Dev, 2026-10-10): no new row for the server tick. It stays under row 18 / post-K item 3 as the named sub-line "server tick: fixed step, input intake, per-tick NPC budget". Acceptance is many-on-one (Proof 3: N NPC brains inside the tick budget).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with EA Section 7 terms; clean-room only)
- Brief rule served: 1 (one engine: one tick step, with the lead window as data).

## 6. Gaps and risks

- Lockstep is peer-to-peer. Every machine runs the whole simulation (Queue_AI_Multiplayer runs on each peer; Execute_DoList runs the DoList on each). Frankendom's rulings are server-verified kills and Pit as client. The donor has no authority: a kill is whatever every machine computes. The transferable part is the input window, not the lockstep model. Do not port the model as the authority.
- The donor's gate blocks every machine on the slowest peer (Can_Advance, 1857; the wait loop, 1018-1032). A fast duel with one slow client would stall the server tick for everyone. Frankendom must not wait on a client; the server should accept an input for a tick inside a window and clamp or drop anything late.
- The donor's late-input rule is fatal (2932-2937, then Stop_Game). Frankendom needs a non-fatal policy and a ledger entry for each dropped or clamped input (one ledger).
- The CRC check (3024) detects divergence between machines. It has no meaning when one server holds the state; it does not transfer.
- One engine: the donor's one simulation runs on every machine, so it has one copy of the rules per peer. That fits the one-engine ruling only if the server is the only place the step runs. Clients that hold a second copy of the rules (for prediction, say) are what the ruling forbids; the donor has no prediction to forbid, and this note does not port one.
- Zones as data: lead, send rate and frame rate are host or INI values (INTERNET.CPP 305-306; QUEUE.CPP 1227-1235). Frankendom should carry them as zone data fields with the donor defaults (lead 3, send rate 3) as defaults, not constants.
- Pit as client: the donor's model needs each client to run the full sim, which conflicts with Pit as a client that only renders and sends intents. This is a clean conflict with the ruling, not a gap to fill.
- MAX_ATTACKERS = 3: no attacker cap appears in the functions read here. The donor sync gate counts connections, not attackers. Combat code was not read, so the ruling is neither confirmed nor contradicted by this donor.
- Row 18 is the wrong donor to lean on alone. The checklist's own note (engine-parity-checklist.md, line 46) names EQEmu zone tick and rathena map-server as the first donor reads for rows 18 and 19. This note is a secondary read for the lockstep input window.
- Not read: `Send_Packets` body, `Handle_Timeout`, `Process_Serial_Packet`, `Compute_Game_CRC`, `Generate_Process_Time_Event`. The donor's timeout and reconnect behaviour is described only from the wait loop (723, 850-905), not from Handle_Timeout.
