# STJr-SRB2 (server-tick-netcode, cell 2)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/i_time.c` (clock), `/mnt/frankendom-donors/STJr-SRB2/src/d_main.c` (frame loop), `/mnt/frankendom-donors/STJr-SRB2/src/netcode/d_clisrv.c` (TryRunTics, NetUpdate), `/mnt/frankendom-donors/STJr-SRB2/src/netcode/tic_command.c` (SV_Maketic, SV_SendTics, client packet receive) | Licence: GPL-2.0 (LICENSE line 2: "Version 2, June 1991"; i_time.c line 8: "terms of the GNU General Public License, version 2.") | C | symbol `TryRunTics` (with `NetUpdate`, `I_UpdateTime`, `D_RunFrame`, `SV_Maketic`)

Checked: confidence high on the clock, the frame loop and the server tic production (read in full). Read: i_time.c 33-84; d_main.c 792-958 (the frame body, tail and cap) and 767-771 (loop); d_clisrv.c 1252-1343 (TryRunTics), 1552-1655 (NetUpdate), 1782-1808 (Consistancy), 103-106 and 25 (cvars and window); tic_command.c 238-261 (client packet receive), 356-415 (SV_SendTics), 420-470 (Local_Maketic and SV_Maketic); doomdef.h 462-466; netcode/protocol.h 37. Callers: `TryRunTics` is called once from D_RunFrame (d_main.c 856); `NetUpdate` is called from TryRunTics (d_clisrv.c 1273). Other NetUpdate callers (d_main.c 652, hw_main.c) were NOT read, so the statements below describe the frame-loop path only. Not read in full: G_Ticker, the ack path (Net_AckTicker), Net_ConnectionTimeout, the place where consistancy[] is compared (tic_command.c around 118, not read in full), and the rest of GetPackets. camera_scope: not applicable to the tick; the chase-camera pointer is noted in section 6 only (d_main.c 867-872, not read in depth). The camera is not the subject of this cell.

Best transferable idea: Run a fixed-step tick from an accumulator; when the server falls more than 5 ticks behind, make one tick and forget the lost time (no burst), and repeat each player's last input for a tick whose input did not arrive, marked not received.
Decision (proposed): adapt — the stall-skip and repeat-last-input rules fix the two tick problems under load (bursts and gaps) for a server-authoritative fight; the client lockstep, per-tick checksum and netticbuffer are rejected because only the server runs the fight and kills are server-verified.
Acceptance: a server test feeds a 20-tick stall into the tick loop and asserts exactly one tick ran for that update, with no catch-up burst; a player with no input for 3 ticks gets its last input repeated with received=false; a quitting player moves zero and keeps its aim.

## 1. Mechanism

- Clock (i_time.c 56-84). Wall time in seconds accumulates into `tictimer` (67). While the accumulator is above one tic period (68-72, one period = 1/(35 x timescale) s), `entertic` advances by one per period, and the period is subtracted (70-71). `realtics` is the entertic difference since the last call (73). The game clock `g_time.time` advances by realtics (78). The leftover fraction is kept as `timefrac` for render interpolation (81-82). Rate: TICRATE 35 (doomdef.h 464). Timescale is a net cvar that scales the rate (i_time.c 26-27, 63).
- Frame (d_main.c 792-958). Each frame reads `entertic = I_GetTime()` (823) and `realtics = entertic - oldentertics` (824). If realtics is more than 8 it is reset to 1 (852-853), with the comment on line 850 saying "don't skip more than 10 frames at a time" (the code and the comment disagree: 8 versus 10). The frame then calls `TryRunTics(realtics)` (856), then draws, then sleeps to the frame-rate cap (949, not read in depth), and sets `deltatics = deltasecs * NEWTICRATE` (955).
- TryRunTics (d_clisrv.c 1252-1343). Order of steps: (a) its own cap: if realtics > TICRATE/7 (= 5), server or client alike, realtics is reduced (1255-1261: server to 1, client to 5). This value is used only for COM_BufTicker, the HUD-stopped flag and the demo path (1263-1277, 1297-1298, 1338-1339). It does NOT limit how many game tics run. (b) `NetUpdate()` (1273) produces the tics owed (below). (c) Packets are read (1284). (d) If `neededtic > gametic` (1295), run the loop at 1309-1332: `G_Ticker` (1318), `ExtraDataTicker` (1319), `gametic++` (1320), store the per-tic checksum `consistancy[gametic % BACKUPTICS] = Consistancy()` (1321). The loop breaks early on a client once `neededtic <= gametic + cv_netticbuffer` (1330-1331, after leveltime > 3), so a client keeps netticbuffer tics queued (the cvar is 0 to 3, default 1: d_clisrv.c 105-106).
- NetUpdate (d_clisrv.c 1552-1655). `realtics = nowtime - gametime` (1558-1559). If realtics > 5, the server takes 1 and a client takes 5 (1564-1570). `gametime = nowtime` (1574): the lost time is forgotten, not repaid. A client sets `maketic = neededtic` (1578-1579) and builds local input for the NetUpdate realtics (`Local_Maketic(realtics)`, 1581; tic_command.c 420-435). On the server: for each missing tic up to the window, `SV_Maketic()` (1624-1629) makes the tic, then `SV_SendTics()` (1634), then `neededtic = maketic` (1636), with the comment "The server is a client too".
- SV_Maketic (tic_command.c 438-470). For each player in the game, if this tic's input did not arrive (`TICCMD_RECEIVED` clear, 446): if the player is quitting, the inputs are zeroed and the previous aim is kept, and the tic is marked received (451-458). Otherwise the previous tic's input is copied (463) and the received flag is cleared (464). So a missing input is replaced by a repeat of the last input, and the tic is still produced. Then `maketic++` (470).
- SV_SendTics (tic_command.c 356-415). Per node, send from `supposedtic` up to `min(maketic, node.tic + 32)` (369-370). When there is nothing new, a resend of the unacknowledged tics happens about one call in four (383, `(I_GetTime() + n) & 3`). `supposedtic` is advanced by the packet size (409-413).
- Client receive (tic_command.c 238-261). The packet is read as `[realstart, realend)`; `realend` is capped at `gametic + 32` (241). A packet is applied only if `realstart <= neededtic` and `realend > neededtic` (244). Then `neededtic = realend` (261). Otherwise the packet is dropped (265, debug line).
- Checksum (d_clisrv.c 1782-1808). `Consistancy()` folds each player's mobj x and y, shield power and player index into one 16-bit value, plus the random seed in non-platform gametypes (1807-1808). The client sends its checksum back (tic_command.c 297). The comparison was not read in full (see Checked).

## 2. Key functions

- Clock: `/mnt/frankendom-donors/STJr-SRB2/src/i_time.c` 56-84 (`I_UpdateTime`): accumulator, whole tics, realtics, timefrac.
- Frame: `/mnt/frankendom-donors/STJr-SRB2/src/d_main.c` 792-856 (`D_RunFrame`): realtics from entertic, cap at 8, call TryRunTics.
- Tic runner: `/mnt/frankendom-donors/STJr-SRB2/src/netcode/d_clisrv.c` 1252-1343 (`TryRunTics`): own cap (1255-1261), NetUpdate (1273), run while neededtic is ahead (1309-1332).
- Tic producer: `/mnt/frankendom-donors/STJr-SRB2/src/netcode/d_clisrv.c` 1552-1655 (`NetUpdate`): lag cap (1564-1570), gametime reset (1574), server tic loop (1624-1629).
- Missing input and quit: `/mnt/frankendom-donors/STJr-SRB2/src/netcode/tic_command.c` 438-470 (`SV_Maketic`).
- Send window and resend: `/mnt/frankendom-donors/STJr-SRB2/src/netcode/tic_command.c` 356-415 (`SV_SendTics`).
- Client receive: `/mnt/frankendom-donors/STJr-SRB2/src/netcode/tic_command.c` 238-261.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step clock: accumulate wall time, emit whole ticks, keep the fraction for interpolation | 35 ticks per second (theirs, doomdef.h 464); timescale multiplies the rate (theirs, i_time.c 27) |
| Frame cap: a very long frame counts as one tic | 8 in code (theirs, d_main.c 852); 10 in its own comment (theirs, d_main.c 850). The two disagree; use one number as data |
| Server stall rule: if more than 5 tics are owed in one update, make 1 and forget the rest | 5 (theirs, d_clisrv.c 1564); server 1, client 5 (1566-1569) |
| Missing input repeats the last input; a quitting player is zeroed but keeps aim | Received flag and copy of previous tic (theirs, tic_command.c 446-464); quit zeroes inputs and keeps aim (451-458) |
| Send window per client, capped ahead of the last acknowledged tic | 32 tics (theirs, d_clisrv.h 25; tic_command.c 241, 370) |
| Client keeps a short lead in its input buffer | netticbuffer 1, range 0 to 3 (theirs, d_clisrv.c 105-106) |
| Give up on a client far behind | BACKUPTICS 1024 minus TICRATE 35 (theirs, d_clisrv.c 1619-1620; protocol.h 37) |

## 4. TypeScript sketch

simplified: keeps the donor order and numbers: wall time accumulates into a 35-per-second clock (the donor compares with `>` and so does not emit a tic exactly at the boundary; the sketch uses `>=`); the server makes the owed tics, takes one tic and forgets the lost time if the lag is more than 5 tics, and for each player repeats the last input when the input did not arrive, zeroes the inputs of a quitting player and keeps its aim. It omits the timescale cvar, the frame cap in D_RunFrame, the menu/console and demo paths, the send window and resend rule, the client packet receive and netticbuffer lead, the checksum, the server-is-a-client shortcut, and the donor's `TICCMD_RECEIVED` bit packed into the angle field (the sketch uses a separate `received` boolean). The sketch does not copy any donor line.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor code.
export const TICRATE = 35;              // ticks per second (engine constant)
export const LAG_TICS_BEFORE_SKIP = 5;  // server: a stall longer than this makes one tic and forgets the rest

export interface Cmd { move: number; aim: number; received: boolean; }

// Fixed-step clock: wall time accumulates; each full step is one tick.
export class TickClock {
  private acc = 0;
  private lastSec: number;
  tick = 0;
  fraction = 0; // 0..1 into the next tick, for render interpolation

  constructor(nowSec: number, private rate: number = TICRATE) {
    this.lastSec = nowSec;
  }

  advance(nowSec: number): void {
    this.acc += nowSec - this.lastSec;
    this.lastSec = nowSec;
    const step = 1 / this.rate;
    while (this.acc >= step) {
      this.acc -= step;
      this.tick++;
    }
    this.fraction = this.acc / step;
  }
}

// One tic: a player whose input did not arrive repeats the previous tic's input, marked not received.
// A quit player gets zero movement but keeps the last aim.
export function makeTic(
  prev: Cmd[],
  inputFor: (player: number, k: number) => Cmd | undefined,
  quit: (player: number) => boolean,
  k: number
): Cmd[] {
  return prev.map((p, i) => {
    const got = inputFor(i, k);
    if (got !== undefined) return { ...got, received: true };
    if (quit(i)) return { move: 0, aim: p.aim, received: true };
    return { ...p, received: false };
  });
}

export class ServerTickLoop {
  private lastTick = 0;
  private prev: Cmd[];

  constructor(players: number) {
    this.prev = Array.from({ length: players }, () => ({ move: 0, aim: 0, received: false }));
  }

  // Produce the tics owed since the last update. A stall of more than 5 ticks makes one tic and forgets the lost time.
  update(
    nowTick: number,
    inputFor: (player: number, k: number) => Cmd | undefined,
    quit: (player: number) => boolean,
    run: (tic: Cmd[]) => void
  ): number {
    let lag = nowTick - this.lastTick;
    if (lag <= 0) return 0;
    if (lag > LAG_TICS_BEFORE_SKIP) lag = 1;
    this.lastTick = nowTick;
    for (let k = 0; k < lag; k++) {
      this.prev = makeTic(this.prev, inputFor, quit, k);
      run(this.prev);
    }
    return lag;
  }
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module: fixed-step tick clock, server tick loop, missing-input repeat). Parity-checklist row 18, post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget". The donor covers the fixed step and the input-intake fallback. It has no per-tick NPC budget.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only; no donor line copied)
- Brief rule served: rule 1 (one engine: one tick loop on the server); server-verified kills (the server alone produces the tics that decide kills)
- Decision (proposed): adapt. Take the fixed-step accumulator with a fraction for render interpolation, the stall rule (more than 5 owed ticks: make one tic and forget the rest, so NPC AI never bursts), and the repeat-last-input fallback for a missing input, marked not received. Reject the client-replays-every-tic lockstep (netticbuffer, per-tic checksum, client simulation), because Frankendom's kills are server-verified and only the server runs the fight. Why: the stall rule and the fallback fix the two problems a tick loop has under load (bursts and gaps); the lockstep needs every client to be deterministic, which our rulings do not ask for.
- Acceptance: a server test feeds a 20-tick stall into the tick loop and asserts exactly one tick ran for that update, then the loop continues at the tick rate with no catch-up burst. A second test drops a player's input for 3 ticks and asserts that the tics repeat the last input with received=false, and that a quitting player's movement is zero while its aim is kept. The client render fraction stays in [0, 1).

## 6. Gaps and risks

- The donor's clients replay every tic and compare checksums (d_clisrv.c 1321; tic_command.c 297 and around 118). Frankendom's clients are not simulators, so the checksum has no counterpart. Do not port it without a ruling.
- The donor forgets lost time (d_clisrv.c 1574) and so a hitch slows the fight rather than catching up. Anything that counts time in our fight (cooldowns, bleeds, stagger, parry windows) must count tics, not wall seconds, or it will keep running through a hitch. This is the main thing to check in our engine.
- A repeated input is a prediction. The ledger must never record a tic with received=false as a player action (one ledger, server-verified kills).
- The donor's frame cap says 10 in a comment and uses 8 in code (d_main.c 850-852). Pick one value as data; do not copy the mismatch.
- The server is also a client in the donor (d_clisrv.c 1636). Frankendom's Pit and zones are clients of one engine; the donor's single-process shortcut does not transfer.
- Camera pointer (not read in depth): the donor advances the chase camera once per realtic when the frame shows a stalled game (d_main.c 867-872, "Lagless camera"). This ties the camera to the tic count, not to the frame. It belongs to the camera cells; it is recorded here only.
- Unread: G_Ticker, Net_AckTicker and the ack logic, Net_ConnectionTimeout, the other NetUpdate callers (d_main.c 652, hw_main.c), the consistancy comparison, and GetPackets. The rules above describe the frame-loop path only.
- Licence GPL-2.0: clean-room, shape only. The sketch was written from the mechanism.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
Brief rule served: rule 1 (one engine); server-verified kills
