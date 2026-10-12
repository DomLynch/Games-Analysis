# id-Software-Quake (determinism-replay, cell 1)

Donor: `/mnt/frankendom-donors/id-Software-Quake/QW/server/sv_user.c` | Licence: GPL-2.0-or-later (per the header of QW/client/cl_demo.c lines 4-7: "either version 2 of the License, or (at your option) any later version"; readme.txt:16 says all code is GPL) | C (QuakeWorld engine) | symbol `SV_ExecuteClientMessage` + `SV_RunCmd`

Checked: opened QW/server/sv_user.c 1371-1420 and 1544-1665 (read in full for the clc_move path), QW/client/cl_input.c 333-360 and 405-470 (send path; CL_SendCmd header at 383), QW/client/cl_pred.c 37-180 (prediction), QW/client/net_chan.c 400-420, QW/client/protocol.h 246 and 274-281, QW/server/sv_phys.c 870-906, QW/server/sv_main.c 1230-1242, QW/client/cl_demo.c 60-250, QW/client/common.c 2180-2260, WinQuake/host_cmd.c 465-470 and 520-556 (save writer; the middle is not read). Not read: the body of `PlayerMove` in pmove.c, `MSG_ReadDeltaUsercmd`/`MSG_WriteDeltaUsercmd`, `CL_Record_f`, `Host_Loadgame_f` body, `ED_Write` body. Confidence: high for the input intake and catch-up order (read end to end, and the donor's own comments agree with the code); medium for the demo file layout (the writer and reader are read, the recorder is not). Not a camera cell.

## 1. Mechanism

- The client never sends a position. Every 'move' packet carries the three newest input frames (usercmds), so one lost packet can be recovered from the next one. Client: CL_SendCmd writes `outgoing_sequence-2`, then `-1`, then the newest (cl_input.c:435, 440, 445), each as a delta against the one before, plus a 1-byte checksum (cl_input.c:450) and the "lossage" byte.
- Each frame's step time is the client's own `msec`. The client computes `ms = host_frametime * 1000` (cl_input.c:356, truncated to an integer), replaces anything above 250 with 100 (cl_input.c:357-358), and writes it into the usercmd (cl_input.c:359).
- Server, per packet (SV_ExecuteClientMessage, sv_user.c 1544-1665): decode the three frames (1620, 1622). Ignore the move if the client is not spawned (1624). Check the checksum over the move bytes (1628, 1633); a mismatch ends the packet. Then, only if the server is not paused (1640), run the catch-up. `net_drop` is the sequence gap counted in Netchan_Process (net_chan.c:410).
- Catch-up order (sv_user.c 1643-1655), with `d` = net_drop:
  - if d < 20: while d > 2 run `cl->lastcmd` and count d down (1645-1647); if d > 1 run the oldest real frame (1650-1651); if d > 0 run the previous real frame (1653).
  - always last: run the newest frame (1655).
  - Total frames run = d + 1 when d < 20 (checked by hand for d = 1, 2, 3); = 1 when d >= 20.
- After the run: `cl->lastcmd = newcmd` (1660) and its buttons are cleared (1661), so replayed frames never re-fire a button.
- The donor never runs the same frame twice on the normal path. Duplicate or old packets are rejected in Netchan_Process before this code (net_chan.c, "Out of order packet" branch).
- Client prediction mirrors it: CL_PredictMove starts from the last server frame and re-runs every unacknowledged frame with the same PlayerMove (cl_pred.c 168-176), stopping once a frame's send time reaches the clock (174). Server and client build the same pmove.c (Makefile.Linux:122 server, :247 client; the server rule uses `$(CLIENT_DIR)/pmove.c` at :196).

## 2. Key functions

- `SV_ExecuteClientMessage`: `/mnt/frankendom-donors/id-Software-Quake/QW/server/sv_user.c` 1544-1665. Reads the three frames, checks the checksum, runs the catch-up and the newest frame.
- `SV_RunCmd`: `/mnt/frankendom-donors/id-Software-Quake/QW/server/sv_user.c` 1371-1420+. Splits msec above 50 into two halves (1380-1385), sets the step from msec clamped to 0.1 s (1413-1415), then runs think and PlayerMove.
- `CL_FinishMove`: `/mnt/frankendom-donors/id-Software-Quake/QW/client/cl_input.c` 333-360. Converts frame time to msec (356-359); drops the first two move messages (339-342).
- `CL_SendCmd`: `/mnt/frankendom-donors/id-Software-Quake/QW/client/cl_input.c` 383-470 (read 405-470). Packs the three frames and the checksum.
- `CL_PredictMove` / `CL_PredictUsercmd`: `/mnt/frankendom-donors/id-Software-Quake/QW/client/cl_pred.c` 64-180. Local re-run of unacknowledged frames on the shared pmove.
- `Netchan_Process` (gap count only): `/mnt/frankendom-donors/id-Software-Quake/QW/client/net_chan.c` 410-413.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (where) |
|---|---|
| Carry the last 3 input frames in every packet | 3 frames (cl_input.c:435-445, "oldest / previous / newest") |
| Replay real missed frames first, then repeat the last run frame | real frames for drop 1-2; repeat-last for drop above 2 (sv_user.c:1645-1653) |
| Cut-off: beyond this many missing frames, run only the newest | 20 (sv_user.c:1643). Engine constant. |
| Never re-fire buttons from a replayed frame | buttons cleared on lastcmd (sv_user.c:1661) |
| Long input step is split in two | threshold 50 ms (sv_user.c:1380; cl_pred.c:67). Engine constant. |
| Client-side step cap | 250 ms, else sends 100 (cl_input.c:357-358). Engine constant. |
| Server step cap | 0.1 s (sv_user.c:1415). Engine constant (also the sv_maxtic cvar default, sv_main.c:37). |
| Frame backup depth for delta and prediction | 64 (protocol.h:246). Engine constant. |
| Per-packet checksum, keyed by sequence | 1 byte (common.c:2233 returns `byte`; keyed at sv_user.c:1575 and cl_input.c:403) |

Donor defects, each with the fix (keep the idea, fix the defect):
- Odd msec loses one millisecond on every halving: `cmd.msec = oldmsec/2;` runs for both halves (sv_user.c:1383, 1385), and cl_pred.c:73 `split.msec /= 2;` does the same. fix: second half = msec minus first half.
- Client msec is truncated to whole ms with no carry (cl_input.c:356). fix: a fixed tick per frame, no client duration at all (see section 4).
- A frame time over 250 ms is replaced by 100 ms rather than rejected (cl_input.c:357-358), so a hitch becomes a fake 100 ms step. fix: clamp to one tick and count it as a warning.
- The server takes any msec up to 0.1 s per command, and no per-second budget exists. The only msec references in sv_user.c are lines 1375-1415 (grep). fix: one input frame per server tick, extra frames rejected.
- The checksum is one byte (common.c:2233). It detects a corrupted packet with about 255/256 probability for random damage and is not a signature. Its own comment says "For proxy protecting" (common.c:2230). fix: do not rely on it for cheating; use a server-side rate and tick check.

## 4. TypeScript sketch

simplified: keeps the donor's order (catch-up, then the newest frame, then lastcmd update with buttons cleared) and its counts (3 frames, cut-off 20, repeat above 2). Two deliberate changes: (a) each frame is one fixed server tick, so the client's msec is not read at all (the donor's 50 ms split, 250 ms replacement and 0.1 s clamp are gone); (b) the function returns the frames and the caller steps them, so there is no shared global state. Omitted: the delta decode of the three frames, the checksum check, the spawn and pause gates, the lossage byte, the one-move-per-packet guard, PlayerMove, and the duplicate-packet path beyond "return nothing".

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Cmd = { seq: number; fwd: number; side: number; buttons: number; yaw: number };
type Packet = [Cmd, Cmd, Cmd]; // three newest frames, oldest first; packet[2].seq is the newest

const CATCHUP_LIMIT = 20; // donor: the catch-up block runs only when the drop count is below 20
const REPEAT_ABOVE = 2;   // donor: while the drop count is above 2, the last run frame is repeated

interface Intake {
  lastSeq: number; // newest frame already simulated
  lastRun: Cmd;    // last simulated frame with buttons cleared (donor: cl->lastcmd)
}

// Returns the frames to simulate, in order, one fixed server tick each.
function intakePacket(st: Intake, packet: Packet): Cmd[] {
  const newest = packet[2];
  if (newest.seq <= st.lastSeq) return []; // duplicate or old packet: nothing to run
  const drop = newest.seq - (st.lastSeq + 1); // frames lost before this packet
  const out: Cmd[] = [];
  if (drop > 0 && drop < CATCHUP_LIMIT) {
    let k = drop;
    while (k > REPEAT_ABOVE) { out.push(st.lastRun); k--; } // unknown frames: repeat last
    if (k > 1) out.push(packet[0]); // oldest real frame still missing
    if (k > 0) out.push(packet[1]); // previous real frame still missing
  }
  out.push(newest);
  st.lastSeq = newest.seq;
  st.lastRun = { ...newest, buttons: 0 }; // replayed frames never repeat a button press
  return out;
}

// Server tick: each returned frame is one fixed step; the client never sends a duration.
function onPacket(st: Intake, packet: Packet, step: (c: Cmd) => void): number {
  const frames = intakePacket(st, packet);
  for (const c of frames) step(c);
  return frames.length;
}
```

Typecheck: the block plus `export {};` saved as work/quake-input-intake.ts, copied to the VPS /tmp and run with `npx -y -p typescript@5.6.3 tsc --noEmit --strict --target es2020` on the VPS: exit 0. (Note: the local post-write hook reported tsc as unavailable on this Mac; the check was run on the VPS, as the brief requires.)

## 5. Lands in

- TARGET `src/fight/intake.ts` (proposed new module; the name is a suggestion, no Frankendom file was read for this note). The engine calls `onPacket` once per received input packet, then steps the returned frames inside the server tick.
- today: not read in Frankendom (out of scope of this donor read; the current input path has not been checked).
- Parity row: 5 (controls/input intake). The server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" sits under row 18 and is only referenced here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape not code)
- Brief rule served: 1 (one engine: the server runs every frame; the client only sends intent). Rules 7-9 n/a.

Decision (proposed): adapt - keep the three-frame redundancy, the repeat-last catch-up and the cut-off, but run one fixed server tick per frame and never read a client-sent duration; the donor trusts client msec up to 0.1 s per command.
Acceptance: a server test sends packets with seq 1-3, then seq 7 (frames 4-6 lost), and asserts the frames run are [repeat of frame 3, frame 5, frame 6, frame 7] in that order; a packet after 20 or more lost frames runs only its newest frame; a duplicate packet runs nothing; a client cannot make the server run more than one frame per tick.

Best transferable idea: send the last three input frames in every packet and, on a gap, replay the real missed frames before the newest one, so a single lost packet costs no movement and no ordering error.

## 6. Gaps and risks

- The donor trusts client time: msec is client-chosen (sv_user.c:1413) and bounded only per command (1415). Frankendom's server-verified rulings need the server's own tick, so the msec path must not be ported. This is the main reason for "adapt", not "adopt".
- The 20-frame cut-off (1643) is a hard switch: a loss of 19 frames is replayed, a loss of 20 is not. Frankendom should treat the cut-off as a data value and test both sides of it. The donor gives no reason for 20 (no comment at 1643).
- Repeat-last (1645-1647) means an unknown frame is simulated with the old input. In PvP that is a movement guess, not a fact. Keep it for movement; never replay attacks or blocks (the donor clears buttons at 1661, but a guard or stamina spend in a replay would need its own rule, which the donor does not have).
- Checksum and pmove sharing do not give desync detection. The donor has no state hash in the stream; the only comparison is the 1-byte packet check and the map checksum at connect (sv_user.c:252-253, `sv_mapcheck`). Frankendom's fight record (row 19) needs a state hash the donor does not have.
- Replay: the demo recorder writes client usercmds (cl_demo.c:94, a `dem_cmd` record) and the server's message bytes (`dem_read`, reader at cl_demo.c 226-236). Playback is paced by each record's recorded wall-clock stamp (cl_demo.c:79, 155, 172-179), not by a fixed tick, and the server's world is not re-simulated. A demo therefore shows what the client saw; it cannot prove the server is deterministic. Not a substitute for a seeded replay.
- The server RNG is not seeded and is one shared stream: no srand/srandom call exists in QW/server, qw-qc or the WinQuake game files (grep); the only seeds are display modules (QW/client/vid_x.c:384 `srandom(getpid());`, and WinQuake vid files). The stream is drawn by the connection challenge (sv_main.c:484), once per server frame (sv_main.c:1237-1238, "keep the random time dependent"), by monster direction choices (sv_move.c:341) and by QuakeC `random()` (pr_cmds.c:411, 15-bit). A replay of the server cannot be rebuilt from a seed, and gameplay numbers depend on how many packets arrived. Frankendom needs separate seeded streams per system (see Rulings).
- Save/load (WinQuake only, no QW save): the writer stores version, spawn parms, skill, map name, `sv.time` (host_cmd.c:525-532), light styles, globals and every edict as text (545, 548); the reader parses edicts back (684). It stores no RNG state and no input ring, so a loaded game is not a deterministic continuation. (Not read: ED_Write body.)
- Fixed-step is absent on the server world: SV_Physics runs on wall-clock deltas, skipped below sv_mintic 0.03 (sv_phys.c:901; sv_main.c:36) and clamped to sv_maxtic 0.1 (903; sv_main.c:37). After the clamp `old_time = realtime` (905), so time beyond 0.1 s is dropped, not carried: a 0.5 s stall makes the world run 0.1 s and the server clock falls behind. Frankendom's one-engine rule needs an accumulator with a cap instead (not this note's target; noted for row 18).

## 7. As-data shape, provenance, patch history, rulings

As-data shape:
- Table: `typedef struct usercmd_s` at `/mnt/frankendom-donors/id-Software-Quake/QW/client/protocol.h` 274-281. Row fields: msec: byte; angles: vec3_t (three floats); forwardmove: short; sidemove: short; upmove: short; buttons: byte; impulse: byte.
- Row count: the frame history ring is 64 frames (protocol.h:246, UPDATE_BACKUP).
- A new X is one row: no. A new input field is a struct field plus the delta encoder on both sides (MSG_WriteDeltaUsercmd on the client, MSG_ReadDeltaUsercmd on the server; both not read). The number of catch-up frames is an engine constant in code, not a row.

Provenance per claim (donor repo: id-Software-Quake, licence GPL-2.0-or-later, copyleft class):
- Input intake and catch-up: QW/server/sv_user.c 1544-1665, lines cited in section 1 and receipts.tsv.
- Send side (three frames, msec, checksum): QW/client/cl_input.c 333-470.
- Prediction re-run: QW/client/cl_pred.c 64-180.
- Gap count: QW/client/net_chan.c 410.
- Licence: QW/client/cl_demo.c:7; readme.txt:16; gnu.txt:1 (GPL v2 text).

What they patched later (from the donor's own history):
- Checksums: "Proxy checksumming code changed to less CPU intensive algorithm." (QW/qwrlnote.txt:43). The 1-byte check was reworked for cost, not strength.
- Cheating: the 2.4 protocol break was made "in the prevention of cheating." (QW/release233_notes.txt:15).
- Prediction: "is noted and the clients are updated with the change so that their prediction" (QW/qwchangelog.txt:86); mismatched prediction with old servers is listed at qwchangelog.txt:95.
- Demo: "Demo recording lock ups fixed" (QW/qwrlnote.txt:61).
- The msec chop (1380-1385), the 250 ms replacement (cl_input.c:357-358) and the 20-frame cut-off (1643): no history line found (grep of the changelog and notes for msec, drop, predict, cheat).

Rulings for Dom (answer each in one line):
1. Should the fight input step one fixed server tick per input frame, so the client never sends a time? Recommend yes (the donor's msec path is the source of the speed and desync risk).
2. On a lost packet, should movement be replayed up to the cut-off (donor: repeat-last to 19 frames) and attacks never replayed? Recommend yes for movement, no for attacks and blocks, with the cut-off as a data field.
3. Separate seeded RNG streams per system (spawns, drops, AI, net challenge), recorded in the replay? Recommend yes; the donor has one shared unseeded stream.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No errors found; catch-up order and d<20 cutoff, msec halving, clamps, UPDATE_BACKUP 64, CRC, licence and changelog quotes all verified. Nothing material missed.
