# ioquake-ioq3 (server-performance-scaling, cell 2)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c` (SV_SendClientMessages, SV_SendClientSnapshot, SV_EmitPacketEntities, SV_AddEntitiesVisibleFromPoint) with `sv_main.c` (SV_Frame, SV_RateMsec) | Licence: GPL-2.0 (COPYING.txt, "Version 2, June 1991"; sv_snapshot.c header: "either version 2 of the License") | C | symbol `SV_SendClientMessages`

Checked: Read in full: `SV_Frame` (sv_main.c 1055-1160), `SV_RateMsec` (1178-1213), `SV_SendClientMessages` (sv_snapshot.c 643-684), `SV_SendClientSnapshot` (597-636), `SV_EmitPacketEntities` (55-108), `SV_WriteSnapshotToClient` delta-base selection (122-150), `SV_AddEntToSnapshot` (271-285). Read in part: `SV_AddEntitiesVisibleFromPoint` (292-400, the PVS bit test and area test; the portal recursion after 400 not read), `SV_BuildClientSnapshot` (442-500, the sort and the first-come entity list). `snaps` and `rate` userinfo parsing (sv_client.c 1410-1462). Not read: `SV_Frame` call site in `Com_Frame` (common.c:3192, called with the elapsed msec, not read), `SV_UpdateServerCommandsToClient`, the client-side delta ack that sets `client->deltaMessage`, and the client parse of a cleared (overflowed) snapshot. Confidence: high on the send gate and the fixed-step residual; high on the first-come silent cap; medium on the overflow path (read the sender, not the client's recovery). camera_scope: not applicable (server cell).

Best transferable idea: decide per client, per server frame, whether to build and send a snapshot at all (cadence, then a byte-rate gate, then "queue not full"), and skip rather than queue, so the delta base the server keeps is always one the client has.
Decision (proposed): adapt — take the cadence plus byte-budget gate and the skip-not-queue rule; reject the BSP portal visibility (Frankendom has discrete zones, not a BSP) and reject the first-come silent entity cap (keep the cap, rank by distance first).
Acceptance: a server test sends a 1200-byte snapshot to a viewer on a 3000 bytes/s budget and asserts the next send is no earlier than about 410 ms later ((1200 + 28) x 1000 / 3000), no send happens while the reliable queue holds unsent fragments, and with 300 entities in range the 256 kept are the nearest, not the first 256 by id.

## 1. Mechanism

- Two clocks. The game steps at a fixed rate and the network sends at a per-client rate, and they are decoupled. `SV_Frame` adds the elapsed msec to `sv.timeResidual` (sv_main.c:1095) and runs the game in fixed chunks of `1000 / sv_fps` ms (sv_main.c:1087, 1143-1149), so a slow frame runs several small steps rather than one big one. `sv_fps` defaults to 20 (sv_init.c:667), a 50 ms step.
- Once per frame, after the game steps, `SV_SendClientMessages` runs (sv_main.c:1160). For each connected client it applies three gates in this order:
  1. Cadence: skip unless `svs.time - lastSnapshotTime >= snapshotMsec` (sv_snapshot.c:656). `snapshotMsec` comes from the client's `snaps` userinfo value, clamped to 1..sv_fps, and is `1000 / snaps` ms; the default when unset is 50 ms (sv_client.c 1440-1461).
  2. Queue: skip (set `rateDelayed`) while the reliable channel still has unsent fragments (sv_snapshot.c:662-665). The comment in the donor says this drop is deliberate, because delta compression would break if the frame were sent.
  3. Byte budget: `SV_RateMsec` returns how many ms must pass before the next send. It is `(lastSentBytes + 28) x 1000 / rate` ms (sv_main.c:1207), minus the time since the last send (1208-1213). The 28 is the IPv4 UDP/IP header (defined at sv_main.c:1175, added at 1205). IPv6 adds 48 (defined at 1176, added at 1203).
- Only a client that passes all three gets `SV_SendClientSnapshot`, which builds the frame (sv_snapshot.c:602), writes the reliable server commands and the entity delta (622), checks overflow (629-631), sends (634), and stamps `lastSnapshotTime` (682).
- Delta compression is against the last frame the client acknowledged, if the base is recent (inside `PACKET_BACKUP - 3` packets, sv_snapshot.c:137) and its entities still sit in the ring (148). If not, it sends a full snapshot (`oldframe = NULL`, 132-150).
- The entity delta is a sorted merge of two lists keyed by entity number (`SV_EmitPacketEntities`, 55-108): equal numbers are delta-coded from the old state (91), a new number is coded from its baseline (99), a number that vanished is coded as a removal (106). An unchanged entity emits no bytes because `force` is false (comment at 88-90, call at 91).
- Visibility is per client, per snapshot: the viewer's area and PVS cluster bits come from the BSP (`CM_ClusterPVS`, sv_snapshot.c:317), then every entity is tested (319). Entities not linked, marked no-client, single-client or in another area are skipped (372). The PVS bit test is at 389. Entities seen through portals are de-duplicated with a per-snapshot counter (455, 360) and re-sorted before the delta (498).
- Cap: each snapshot holds at most 256 entities (MAX_SNAPSHOT_ENTITIES, qcommon.h:129, value read but not receipted because the define line has a tab). When full, `SV_AddEntToSnapshot` returns and the entity is discarded silently (278-279). The discard is first-come in entity-number order, not by distance.
- Overflow: the message is `allowoverflow`, and after writing, if it overflowed, it is cleared with `MSG_Clear` (611, 629-631). The cleared message is still passed to `SV_SendMessageToClient` (634), which records `messageSize = msg->cursize` for the frame (sv_snapshot.c:580) and transmits.

## 2. Key functions

- `SV_Frame` at `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_main.c` 1055-1160: residual accumulator and fixed game steps, then the send pass. Read in full.
- `SV_RateMsec` at `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_main.c` 1178-1213: byte budget to msec. Read in full.
- `SV_SendClientMessages` at `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c` 643-684: the three gates, in order. Read in full.
- `SV_EmitPacketEntities` at `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c` 55-108: the sorted-merge delta. Read in full.
- `SV_AddEntToSnapshot` at `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c` 271-285: the silent cap. Read in full.
- `SV_AddEntitiesVisibleFromPoint` at `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c` 292-400: area and PVS visibility, read in part (portal recursion not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed game step fed by a residual accumulator | step 1000 / sv_fps ms (sv_main.c:1087); sv_fps default 20 (sv_init.c:667) = 50 ms |
| Per-client snapshot cadence, clamped to the server rate | `snaps` clamped to 1..sv_fps, period 1000 / snaps ms (sv_client.c 1440-1461); unset = 50 ms |
| Byte-rate gate with per-datagram header cost | client rate clamped to 1000..90000 bytes/s (sv_client.c 1423-1426); unset = 3000 bytes/s (sv_client.c:1429); header 28 bytes IPv4, 48 IPv6 (sv_main.c:1175-1176, added at 1203-1205) |
| LAN bypass | 99999 bytes/s for LAN (sv_client.c:1417) and no gate for loopback or forced LAN (sv_snapshot.c 668-669) |
| Skip, do not queue, while the reliable queue is full | gate at sv_snapshot.c:662 |
| Delta base freshness | `PACKET_BACKUP - 3` (sv_snapshot.c:137); PACKET_BACKUP = 32 (qcommon.h:123, not receipted) |
| Entity cap per snapshot | 256 (MAX_SNAPSHOT_ENTITIES, qcommon.h:129, not receipted) |
| Max rate clamp (server-wide) | sv_maxRate default 0 = off (sv_init.c:644) |

Numbers for a phone and a small Node server, as arithmetic only (not measured): 50 ms snapshots are 20 per second, which is a normal choice for a phone game; the 3000 bytes/s default is a dial-up-era budget (about 24 kbit/s) and is a server-side cap to test, not a number to copy blindly. A duel with at most 3 attackers produces small snapshots, so the byte gate rarely binds there; the 256-entity cap is irrelevant to a duel.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three send gates in the donor order (cadence, queue, byte budget) and the residual fixed-step loop. It omits the 28/48-byte header split (it uses one header constant), the LAN and loopback bypass, the timescale multiplier, the delta-from-acknowledged-frame and the entity merge, the reliable command channel and the PVS and area tests. It reorders one thing on purpose: the cap in `capNearest` ranks candidates by distance before the cap, which fixes the donor's first-come silent discard (sv_snapshot.c:278-279).

```ts
// Licence: GPL-2.0 (donor ioquake-ioq3, COPYING.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

// One server frame at a fixed step; elapsed wall time is banked as a residual (donor SV_Frame, sv_main.c 1087-1149).
export function runFixedSteps(residual: number, elapsedMs: number, stepMs: number, step: () => void): number {
  let r = residual + elapsedMs;
  while (r >= stepMs) {
    r -= stepMs;
    step();
  }
  return r;
}

export interface Pipe {
  snapshotMs: number;      // per-client snapshot period, from the client's requested rate, clamped to the server fps
  rateBytesPerSec: number; // client byte budget, clamped to a floor and a ceiling
  lastSnapshotAt: number;  // ms, server clock
  lastSentAt: number;      // ms, server clock
  lastSentBytes: number;   // bytes of the previous datagram
  queuedFragments: number; // unsent reliable fragments
}

// Rate gate: how many ms until the next send may pass (donor SV_RateMsec, sv_main.c 1178-1213).
// The header term models the 28-byte IPv4 UDP/IP header the donor adds.
export function msecUntilSendAllowed(p: Pipe, now: number, headerBytes = 28): number {
  const rateMsec = Math.floor(((p.lastSentBytes + headerBytes) * 1000) / p.rateBytesPerSec);
  const elapsed = now - p.lastSentAt;
  return elapsed > rateMsec ? 0 : rateMsec - elapsed;
}

// Send decision for one client in one server frame (donor SV_SendClientMessages, sv_snapshot.c 643-682).
// Skipping is the whole policy: a skipped snapshot is not queued, so the next delta base stays valid.
export function mayBuildAndSend(p: Pipe, now: number): boolean {
  if (now - p.lastSnapshotAt < p.snapshotMs) return false;   // cadence
  if (p.queuedFragments > 0) return false;                    // queue still full: delta would break
  return msecUntilSendAllowed(p, now) === 0;                  // byte budget
}

// Fix for the donor's first-come cap (sv_snapshot.c 278-279 silently drops entities after 256):
// rank candidates by distance before the cap, so the nearest entities are the ones kept.
export function capNearest<T extends { dist: number }>(candidates: T[], cap: number): T[] {
  return [...candidates].sort((a, b) => a.dist - b.dist).slice(0, cap);
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run this turn). The local Quality Floor hook could not find tsc on the Mac; the VPS run is the check used here.

## 5. Lands in

- TARGET `src/fight/snapshot.ts` (new module: the server's per-viewer send gate and the nearest-first cap; the engine decides what is sent, the client only applies it).
- Parity-checklist row 18 (server tick), sub-line "server tick: fixed step, input intake, per-tick NPC budget"; post-K item 3. The residual fixed-step loop (sv_main.c 1087-1149) is the part of this note that belongs to that sub-line.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
- Brief rule served: rule 1 (one engine; the server decides what each viewer gets); no camera or client rule touched.

## 6. Gaps and risks

- Frankendom rulings, kills are server-verified: the skip-not-queue rule must never skip a hit or a kill. The donor sends reliable server commands alongside the snapshot (sv_snapshot.c:602-622, `SV_UpdateServerCommandsToClient`, body not read). Frankendom should put hit, death and loot confirmations on that reliable path, and let only the presence and state snapshot be gated.
- One ledger: the send gate reads the server's state, so there is still one ledger. The per-client `lastSentBytes` and `rateDelayed` are send bookkeeping, not game state, and should not be copied into the duel record.
- MAX_ATTACKERS = 3: a duel's snapshot is tiny, so the 256 cap and the 3000 bytes/s budget are irrelevant to a 1-to-3 fight. They matter for zones with many entities and open-PvP crowds (parity row 23, zone population, as a follow-up).
- Defect D1 (first-come silent cap, sv_snapshot.c:278-279): entities beyond 256 are dropped by id order, not distance, so a viewer can lose the enemy next to them and keep a far one. Fix: `capNearest` in the sketch ranks by distance before the cap.
- Defect D2 (overflow still sent and recorded, sv_snapshot.c:629-634 and 580): on overflow the body is cleared with `MSG_Clear` (631), but the empty message is still passed to `SV_SendMessageToClient` (634), which records the frame with its size and no entity body (580). Later deltas can then name a base the client never parsed. The donor's recovery (`deltaMessage` reset by the client) was not read, so whether the client resyncs is unverified. Fix: on overflow, do not record the frame as a delta base; send nothing this tick and rebuild next tick, or force a full snapshot.
- Minor (readability, no behaviour bug): `SV_RateMsec` reuses `rate` for elapsed time (sv_main.c:1208) after using it for the budget. Fix: a separate variable.
- Gap G1 (linear scan): visibility loops over every entity for each client each snapshot (sv_snapshot.c:319), so cost is clients x entities per frame. Not measured. At 1k or 10k players that is the first thing to replace with zone-indexed candidate lists.
- Not read: client-side delta ack and resync, the reliable command path, the portal recursion in visibility, the `Com_Frame` call site of `SV_Frame`. No load test or bot harness was read in this donor, so no 1k or 10k claim is checked.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
Brief rule served: rule 1 (one engine; server decides the send); no camera or client rule touched.
