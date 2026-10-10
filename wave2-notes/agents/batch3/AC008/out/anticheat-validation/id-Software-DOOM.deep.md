# id-Software-DOOM (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/g_game.c` (check in `G_Ticker`, 654-695; with `d_net.c`) | Licence: unclear, read exactly. `g_game.c` header lines 8-10: "This source is available for distribution and/or modification / only under the terms of the DOOM Source Code License as / published by id Software." The donor's `/mnt/frankendom-donors/id-Software-DOOM/LICENSE.TXT` is GNU GPL v2 text (lines 1-2 "GNU GENERAL PUBLIC LICENSE / Version 2, June 1991"). Treated as restricted: clean-room, shape only | C | symbol `G_Ticker` (with `G_BuildTiccmd`, `NetUpdate`, `TryRunTics`)

Checked: The list hint `m_cheat.c` is the player cheat-code key matcher (static table line 25, scramble table 35, matcher 62; grep only), not an anticheat, so I did not use it. The mechanism is in `g_game.c` and `d_net.c`. Read in full: `G_Ticker` check (g_game.c 654-695), `G_BuildTiccmd` (237-253), `TryRunTics` (d_net.c 636-767), `NetUpdate` send side (d_net.c 368-440), `ticcmd_t` (d_ticcmd.h 36-44), the send-side byte swap (i_net.c 136-146), `P_Random` and `M_Random` (m_random.c 50-66, 71). Grep only: `BACKUPTICS` (d_net.h 49), `fixed_t` (m_fixed.h 38, p_mobj.h 213), `rndindex` (all uses). Not read: the receive path in `i_net.c`, `I_Error` beyond its first lines (i_system.c 162-168), `I_BaseTiccmd`, `M_Random`'s callers, the demo and menu branches. Confidence: high on the check, its order and the constants. Medium on the exact lag, which I derived from the ring indexing (not run).

Best transferable idea: Each side writes a small summary of the shared state into a ring once per tic, sends the summary with its command, and compares the received value with its own copy one ring-lap earlier. A mismatch is a desync report, so the check costs a lag but never sends the state.

Decision (proposed): adapt - Frankendom's server holds the authoritative fight, so the transferable part is a lagged state digest that a client's replay or Pit re-simulation sends with each fight tick. The server compares it with its own record and flags drift into the one ledger. The donor's stop-the-session on mismatch is rejected, and the digest never decides a hit or a kill.

Acceptance: A recorded fight replayed on a client whose digest is altered (for example, one fighter's HP changed at tic N) produces one desync flag at tic N or within one ring lap after it, the server keeps its own result, and the fight continues.

## 1. Mechanism

- Setting: a lockstep peer game. Peers exchange only per-tic commands and run the same simulation. Each command has a 16-bit `consistancy` field (d_ticcmd.h 41).
- Build (`NetUpdate` 399-410, `G_BuildTiccmd` 252-253): `NetUpdate` builds commands at most `BACKUPTICS/2-1` = 5 tics ahead of `gametic/ticdup` (404-405). Each built command copies the local slot for that tic: `cmd->consistancy = consistancy[consoleplayer][maketic%BACKUPTICS]`.
- Send (`NetUpdate` 416-440): commands are packed from `resendto` up to `maketic` and sent to each node. `i_net.c` 143 converts the field to network order (`htons`).
- Lockstep driver (`TryRunTics`, d_net.c 653-733): call `NetUpdate`; `lowtic` is the smallest `nettics` across nodes in the game (655-663); `availabletics = lowtic - gametic/ticdup` (666); `counts` is the number of tics to run, bounded by `realtics` and `availabletics` (669-677). The loop waits while `lowtic < gametic/ticdup + counts`, calling `NetUpdate` each time, and gives up after 20 real tics so the menu can run (715-732).
- Run (`TryRunTics` 736-766): for each count and each `ticdup`: `M_Ticker`, `G_Ticker`, `gametic++`, then `NetUpdate`.
- The check (`G_Ticker`, g_game.c 654-695), in this order:
  (a) `buf = (gametic/ticdup)%BACKUPTICS` (656).
  (b) For each player in the game (658-660): `cmd = &netcmds[i][buf]` (662-664).
  (c) If `netgame`, not `netdemo`, and `gametic%ticdup == 0` (681): if `gametic > BACKUPTICS` and the stored slot differs from `cmd->consistancy`, call `I_Error("consistency failure ...")` (683-687).
  (d) Store the slot: `players[i].mo->x` if the player has a body, else `rndindex` (689-692). The store happens after the compare.
- Lag, derived from the indexing (not run): the value a node attaches to command T is the slot T mod 12, which that node last wrote one ring-lap earlier. Because building runs at most 5 tics ahead, that write has already happened. So the check at tic T compares both nodes' values for the same player from 12 slots earlier.

## 2. Key functions

- `G_Ticker`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/g_game.c` 605 (header), check 654-695.
- `G_BuildTiccmd`: same file, 237-253 (attaches the local slot to the command).
- `NetUpdate`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/d_net.c` 368-440 (build-ahead cap at 404-405, send at 416-440).
- `TryRunTics`: same file, 636-767 (lowest-tic lockstep, wait loop, run loop).
- `ticcmd_t`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/d_ticcmd.h` 36-44 (the 16-bit field).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ring of per-tick state summaries, one slot per tick, depth = the lag | 12 slots (theirs, `#define BACKUPTICS 12`, d_net.h 49) |
| Build ahead of the simulation, capped at half the ring minus one | Cap 5 (theirs, `BACKUPTICS/2-1`, d_net.c 404) |
| Warm-up: skip the check until one full ring has run | Skip while `gametic <= BACKUPTICS` (theirs, g_game.c 683) |
| Summary is one number per player: the player's x coordinate | x is `fixed_t` = `int` (m_fixed.h 38, p_mobj.h 213); stored in a `short` (g_game.c 140, 690), so only 16 bits are kept |
| Check only on the first tic of each duplicated group | `gametic%ticdup == 0` (theirs, g_game.c 681) |
| Fallback summary when no body exists | `rndindex`, which `M_Random` increments (theirs, m_random.c 65-66; reset at 71) |
| Escape from a lockstep wait so the menu runs | 20 real tics (theirs, d_net.c 728) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order for one node and one tic: attach the own slot when building, then on the run side compare the received value with the own slot, then store the local value, skipping the first ring. It truncates the stored value to a signed 16-bit value as the donor's `short` does. It omits the lockstep driver and wait loop (`TryRunTics`), the `ticdup` duplication and the tic-boundary test (the sketch assumes `ticdup` is 1), the in-game, demo and netdemo filters, the body-missing fallback, the build-ahead cap, the packet send and receive, and the fatal exit (the sketch returns a report rather than stopping). The state summary is an input.

```ts
// Licence: unclear (donor file header: "DOOM Source Code License as published by id Software"; donor LICENSE.TXT is GPL-2.0 text). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const RING = 12;          // donor: BACKUPTICS = 12 (slots in the ring)
type Desync = { playerId: number; tic: number; got: number; want: number };

class LaggedStateChecksum {
  private ring: number[][]; // [player][slot], each slot holds a 16-bit signed summary

  constructor(players: number) {
    this.ring = Array.from({ length: players }, () => new Array<number>(RING).fill(0));
  }

  // Build side: the value this node attaches to its own command for `tic` (donor: G_BuildTiccmd reads the slot).
  attachFor(tic: number, ownId: number): number {
    return this.ring[ownId][tic % RING];
  }

  // Run side: compare the command's value with this node's own slot, then overwrite the slot with this tic's summary.
  // Donor order: compare first, store second. The check is skipped for the first RING tics.
  verifyAndStore(playerId: number, tic: number, got: number, localState: number): Desync | null {
    const slot = tic % RING;
    const want = this.ring[playerId][slot];
    let report: Desync | null = null;
    if (tic > RING && got !== want) {
      report = { playerId, tic, got, want };
    }
    this.ring[playerId][slot] = (localState << 16) >> 16; // truncate to a 16-bit signed value, as the donor's short does
    return report;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/fight-record.ts` (new, server-owned): keeps a per-tic digest of the fight the server ran and compares a client's lagged digest with it. A mismatch writes one flag to the ledger and never changes the fight result.
- Parity-checklist row: 19 (fight record / replay). This is the closest row, since the donor's check exists to keep replays and peers in step.
- Reuse tag: rewrite-from-idea (licence unclear; clean-room only, shape only)
- Brief rule served: one ledger (the flag goes to the one ledger); server-verified kills (the digest is a check on state, never a judge of a hit or a kill).

## 6. Gaps and risks

- Only x is compared (g_game.c 690). Y, Z, HP, stamina, guard and any pending action are not compared, so a divergence in them is missed until x also drifts. Frankendom's digest has to cover the whole fight state.
- The value is 16 bits (g_game.c 140 and 690, d_ticcmd.h 41). Assigning the `int` x to a `short` keeps only the low 16 bits (inference from the declared types). Two different states can give the same value. Frankendom should use a wider digest.
- A mismatch stops the process: `G_Ticker` calls `I_Error` (g_game.c 686-687), and `I_Error` prints and exits (i_system.c 162-168; the exit itself not read). Do not port the stop. A desync is a flag in the ledger and the server decides what happens next.
- The lag is one ring lap, so a desync is reported up to 12 tics after it starts (derived, not run). That is fine for a replay check and too late for a live kill decision. Kills stay server-verified and do not wait on the digest.
- The fallback summary is `rndindex` (g_game.c 692), a counter that `M_Random` increments and that is 0 until `M_Random` runs (m_random.c 65-66, 71). Whether `M_Random` is used only for cosmetic effects is not read. Do not port the fallback; a player with no body should be a flag, not a random number.
- Lockstep itself (`TryRunTics` 715-733) makes every peer wait for the slowest one. Frankendom is server-authoritative, so only the digest idea transfers, not the wait loop.
- The `ticdup` and tic-boundary behaviour (g_game.c 681) and the demo and netdemo paths were not analysed beyond the test.
- Licence unclear: clean-room only. The sketch was written from the described mechanism.
