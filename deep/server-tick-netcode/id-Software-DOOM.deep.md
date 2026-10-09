# id-Software-DOOM (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/d_net.c` | Licence: GPL-2 | C | symbol `TryRunTics` / `NetUpdate`

Checked: (verified: `TryRunTics` at 636-767, `NetUpdate` at 368-446, `GetPackets` 261-358, all read in full; `ExpandTics` 120-135 read; `BACKUPTICS` = 12 at d_net.h 49).

## 1. Mechanism

- Peer-to-peer lockstep. Each node builds one command per local tic from its input (`G_BuildTiccmd`) into a ring of `BACKUPTICS` entries, and every `NetUpdate` sends the unacknowledged range to each node in the game.
- A tic can run only when every node in the game has delivered its command for it. `TryRunTics` (636-767) computes `lowtic`, the minimum delivered tic across nodes in the game, and runs `counts` tics, bounded by the clock (`realtics`) and by `availabletics = lowtic - gametic/ticdup`.
- If a node is behind (`lowtic < gametic/ticdup + counts`), the loop calls `NetUpdate` and waits (715-733). After 20 tics of waiting it calls `M_Ticker` (the menu) and returns without running a game tic, so the UI stays alive (728-732). `counts` is forced to at least 1 (676-677) and the loop errors if `lowtic < gametic` (724).
- A small pacing adjustment (`gametime`, `frameskip`, `skiptics`, in `TryRunTics` 686-712, skipped during demo playback) aims to keep node 0's tic count 1 to 3 tics above `lowtic` (comment, 688). The first player in game is the key player and does not adapt (693-696). Any other player: if `nettics[0] <= nettics[nodeforplayer[key]]`, the local clock is pulled back one step (`gametime--`, 699-703); each frame it records a flag for whether the previous `nettics[0]` was above the key node's delivered count (704-705), and only when the last four flags are all set does it set `skiptics = 1` (706-709), which `NetUpdate` uses to drop one new tic of local command building (384-393). Node 0 is the local loopback (`HSendPacket` with node 0, 149; only the head was read).
- `NetUpdate` (368-446) reads the clock (`I_GetTime()/ticdup`), applies `skiptics`, builds new local commands (capped at `BACKUPTICS/2-1` ahead of the game tic, 404), returns early in single-tic mode (413), then for each node in game sends the commands from `resendto[i]` to `maketic` (420-429), sets `resendto[i] = maketic - extratics` (425), and adds a retransmit request with `retransmitfrom = nettics[i]` when WE saw a gap from that node (`remoteresend[i]`, 431-435). It then polls (`GetPackets`).
- `GetPackets` (261-358): skips setup packets, expands the one-byte tic numbers around `maketic` (`ExpandTics`), handles the exit flag (clears the node and player, sets a leave message) and the kill flag (`I_Error`), records a peer's retransmit request into `resendto` (rate-limited by `resendcount`, `RESENDCOUNT` = 10), ignores duplicate (316) and out-of-order (319) packets, flags a gap as `remoteresend` (329-337), otherwise copies the new commands into `netcmds[player][tic % BACKUPTICS]` and advances `nettics[node]` (340-356).
- Inputs: local input and peer packets. Outputs: the ordered command stream that every node applies to `G_Ticker`.
- Tick: the tic clock (`I_GetTime / ticdup`). Every tic applies all players' commands in the same order.

## 2. Key functions

- `TryRunTics`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/d_net.c` lines 636-767. Computes the lowest delivered tic, decides how many tics to run, waits for stragglers, then runs the tics.
- `NetUpdate`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/d_net.c` lines 368-446. Builds local commands, sends the unacknowledged range to each node, requests retransmit when needed, then polls.
- `GetPackets`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/d_net.c` lines 261-358. Drains pending packets, orders and de-duplicates them, flags gaps, stores commands. `HGetPacket` and `HSendPacket` bodies were not read beyond their head.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Run a tic only when all peers have delivered it: min over delivered tics | `BACKUPTICS` ring = 12 (theirs, d_net.h 49) |
| Catch up when behind by a bounded count; wait when no tic is available | 20-tic menu escape (theirs, 728) |
| Send only the range the peer has not acked, resend on request | `doomcom->extratics` (theirs) |
| Pace a fast node toward the slowest with a skip counter | `ticdup` duplication factor (theirs) |
| Clock divided into game tics by a duplication factor | `I_GetTime` tic clock (theirs) |

## 4. TypeScript sketch

simplified: omits retransmit and gap handling, duplicate and out-of-order packet rejection, the exit and kill flags, `ticdup` duplication, the 20-tic menu escape and the `gametime--` half of the pacing rule. `mayAdvance` stands in for the donor's wait loop (`lowtic < gametic/ticdup + counts`). The ring size here is a placeholder, the donor uses 12.

```ts
// Licence: GPL-2 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Node { inGame: boolean; ticsReceived: number; } // highest tic whose command is held from this node
const RING = 16; // placeholder ring size, not the donor value

// Each side builds one command per local tic and keeps a ring of them.
function buildLocalTic(ring: Uint8Array[], made: number, cmd: Uint8Array): number {
  ring[made % RING] = cmd;
  return made + 1;
}

// A tic may run only when every node in the game has delivered its command for it.
function availableTics(nodes: Node[], gameTic: number): number {
  let low = Infinity;
  for (const n of nodes) if (n.inGame && n.ticsReceived < low) low = n.ticsReceived;
  return low - gameTic;
}

// How many tics to run now: bounded by the wall clock and by what is delivered.
function ticksToRun(realDue: number, available: number): number {
  if (realDue < available - 1) return realDue + 1; // small catch-up
  if (realDue < available) return realDue;
  return Math.max(1, available);
}

// Wait, do not run, when nothing is delivered yet.
function mayAdvance(available: number): boolean {
  return available >= 1;
}

// Pacing (non-key node only): record a flag each frame for "my previous count was above the key node's";
// skip one tic of local command building only when the last four flags are all set.
function recordFrame(flags: boolean[], frame: number, prevMine: number, keyNodeTics: number): boolean {
  flags[frame & 3] = prevMine > keyNodeTics;
  return flags[0] && flags[1] && flags[2] && flags[3]; // true: skip one tic
}
```

## 5. Lands in

- TARGET `src/fight/tick-pacing.ts` (new), the engine tick pacing under `src/fight/`. Parity-checklist row 4 (fight loop at 60 Hz) and row 18 (post-K item 3: server tick). Only the "run N tics bounded by clock and by what is available" rule transfers; Frankendom's fixed-step loop already exists for the clients.
- today: pacing lives in `src/net/rollback.ts` (intents scheduled `delay` ticks ahead, the delay picked from 90th-percentile round trips in `pvp.ts`); the fight loop is duplicated in Zone 1 and the origins (checklist row 4). No server pacing module exists. (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- This is a peer-to-peer model: every node runs the full game and trusts every other node's commands. No node is authoritative. Conflicts with the ruling that the server verifies kills, and with the one-engine ruling in that the donor has no server engine at all.
- Any lockstep design lets one client desync the rest. Nothing here detects or corrects a cheating or diverged node.
- The ring and lowest-delivered rule would only fit a server tick that waits for all inputs of one fight instance; waiting on the slowest client would let one client stall a zone, which breaks zones as data on a shared server. A cap on the wait is needed (the donor's cap is the 20-tic menu escape, which still stalls the game).
- No state is sent. Late join and reconnect are not in these functions.
