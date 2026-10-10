# AAEmu-AAEmu (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TeamManager.cs` (party/raid member state sync, 500 ms tick, delta cache; with Core/Managers/TickManager.cs and Models/Game/Team/Team.cs) | Licence: LGPL-3.0 per README.md:36 wording; LICENSE.GPL is GPL-3.0 text; LICENSE.MIT (Rain0Ash 2019) also present; treated as copyleft, clean-room only | C# | symbol `TeamManager.UpdateAllTeams` / `TeamManager.TryClaimSnapshot` / `MemberSyncState.HasSameSnapshotAs`

Checked: Read: TeamManager.cs 25-52 (constants and cache), 699-840 (tick subscription, sync walk, claim), 881-900 (cache clear), 956-1008 (region test, MemberSyncState); TickManager.cs 1-127 (loop and handler scheduling); Team.cs 12-20 and 30-52; TeamManager.cs 558-600 (`SetOffline`); Character.cs:302 (one line). Callers: `UpdateAllTeams` is subscribed once (TeamManager.cs:705); `ClearSyncState` has four callers (406, 440, 591, 866), of which 591 (inside `SetOffline`) was read. Not read: TeamManager.cs 52-698 (invite, join, leave, looting, roles), 840-880 (`DisbandOfflineTeam` body), 900-955; Team.cs 52-304 (loot winner, packing); the packet contents of SCTeamRemoteMembersExPacket; the normal broadcast pipeline that the donor's comment relies on. Guild side: FamilyManager.cs and ExpeditionManager.cs exist, not read. Chat: ChatManager.cs (442 lines) not read; the only spam-delay code found is a packet sent from FinishStatePacket.cs:54, no rate logic found in grep, not read. Confidence: high on the cadence, the claim rule and the cache; medium on the disband path. camera_scope: not applicable.

## 1. Mechanism

- Tick. `TickManager` runs one dedicated thread (TickManager.cs:34). Each pass calls `OnTick.Invoke()` and then sleeps 20 ms (23, 27). A handler runs only when more than its rate has passed since its last run (91-92); the first run is immediate (91). The sync handler is subscribed at 500 ms, synchronous, on the tick thread (TeamManager.cs:705). So the real period is 500 ms plus up to one 20 ms sleep, plus any handler time. Handlers get the elapsed time as `delta`; there is no fixed step.
- Per pass, `UpdateAllTeams` (TeamManager.cs:732-786) walks every active team.
  1. Zombie teams: if every member has been offline for at least 5 minutes (`OfflineTeamDisbandGrace`, 40; check 745-746), the team is disbanded (748-749).
  2. Collect online members (752-757). Skip the team if one or none is online (758-759).
  3. Walk the pairs as an upper triangle, i < j (763-768). Skip a pair when the two are in the same region or in neighbouring regions (771-772). The donor's comment says the normal broadcast covers those pairs (not read).
  4. For each remaining pair, claim both directions: a claim asks "does recipient need source's current snapshot?" (776-777).
- `TryClaimSnapshot` (794-818). Snapshot = HP, max HP, MP, max MP, position, object id, and the time (796-805). Send if there is no previous entry, or the previous entry differs (`HasSameSnapshotAs`: HP/MP exact, position within 0.01 on each axis, object id equal, 1000-1006), or the last send was 5000 ms or more ago (809-811). Otherwise return false. The new snapshot replaces the old one in the cache before the packet goes out (815-816).
- Send. Each recipient gets one `SCTeamRemoteMembersExPacket` per team per pass, holding all sources that claimed (781-784). The donor's remark says a 50-man raid produces about 50 packets a tick instead of about 2,450 (727-730); this is a comment, not measured.
- Cleanup. `ClearSyncState` removes every cache entry that names a character (881-896). `SetOffline` calls it for the character who goes offline (591), so the cache for that character is dropped and the first claim after a reconnect is a send. The other callers (406, 440, 866) were not read.
- Offline. `Character` calls `SetOffline` when it goes offline (Character.cs:302; TeamManager.cs:558-600). If no member is online afterwards, `AllOfflineSince` is set to now (598-599; a timestamp, Team.cs:37-42). The tick disbands the team once that is 5 minutes old (745-749).

## 2. Key functions

- `TeamManager.UpdateAllTeams`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TeamManager.cs` 732-786. The walk, the region skip, the batch send.
- `TeamManager.TryClaimSnapshot`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TeamManager.cs` 794-818. The delta cache and forced resync.
- `MemberSyncState.HasSameSnapshotAs`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TeamManager.cs` 979-1007. What counts as a change.
- `TeamManager.AreInRenderDistance`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TeamManager.cs` 958-972. Same or neighbouring region.
- `TickManager.TickLoop` and `TickEventHandler.Invoke`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TickManager.cs` 16-30 and 71-126.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Send a state only when it changed, or when the last send is old | 500 ms cadence (TeamManager.cs:31, 705); forced resync 5000 ms (33) |
| Position change below a tolerance is not a change | 0.01 units per axis, float (TeamManager.cs:996, 1003-1005) |
| Exact compare for integer state | HP, max HP, MP, max MP exact (1001-1002) |
| Empty team teardown after grace | 5 minutes (40; 746) |
| Tick loop | Sleep 20 ms (TickManager.cs:27); handler runs after its rate (92) |
| Batch per recipient | One packet per recipient per team per pass (783) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's pair walk (upper triangle), the online-only filter, the same-region skip, the claim rule (change, or 5 s since the last send, position tolerance 0.01) and one batch per recipient. It omits the tick scheduler (the 500 ms cadence from a 20 ms loop), the offline teardown after 5 minutes, the cache cleanup on leave, the lock and Interlocked details, the packet contents, and the threading (the donor runs this synchronously on the tick thread). The region test is an injected callback; the donor's test checks the same region or a neighbouring region. The sketch compares against the last snapshot sent, as the donor does, so slow drift is sent once it exceeds the tolerance.

```ts
// Licence: LGPL-3.0 / GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Snap {
  hp: number; maxHp: number; mp: number; maxMp: number;
  x: number; y: number; z: number;
  objId: number;
  sentAt: number;                 // ms, when this snapshot was last claimed for sending
}

type Pose = Omit<Snap, "sentAt">;

interface Member { id: number; online: boolean; pose: () => Pose; }

const RESYNC_MS = 5000;   // send again after this long even if nothing changed
const POS_EPS = 0.01;     // position tolerance, units

function same(a: Snap, b: Snap): boolean {
  return a.hp === b.hp && a.maxHp === b.maxHp && a.mp === b.mp && a.maxMp === b.maxMp &&
    Math.abs(a.x - b.x) < POS_EPS && Math.abs(a.y - b.y) < POS_EPS && Math.abs(a.z - b.z) < POS_EPS &&
    a.objId === b.objId;
}

// Recipient-and-source cache. Returns true when the source's snapshot must be sent to this recipient now,
// and records it. Same as the donor: send on change, or when the last send is older than RESYNC_MS.
function claim(cache: Map<string, Snap>, key: string, next: Snap): boolean {
  const prev = cache.get(key);
  if (prev !== undefined && same(prev, next) && next.sentAt - prev.sentAt < RESYNC_MS) return false;
  cache.set(key, next);
  return true;
}

function push(batches: Map<number, Snap[]>, recipient: number, snap: Snap): void {
  const list = batches.get(recipient);
  if (list !== undefined) list.push(snap);
  else batches.set(recipient, [snap]);
}

// One pass per team per tick. Online members only; pairs that share a region are skipped
// (the normal broadcast covers them); upper-triangle walk; one batch per recipient.
function syncTeam(members: Member[], cache: Map<string, Snap>, now: number,
                  sameRegion: (a: number, b: number) => boolean,
                  send: (recipient: number, batch: Snap[]) => void): void {
  const online = members.filter(m => m.online);
  if (online.length <= 1) return;
  const batches = new Map<number, Snap[]>();
  for (let i = 0; i < online.length; i++) {
    for (let j = i + 1; j < online.length; j++) {
      const a = online[i];
      const b = online[j];
      if (sameRegion(a.id, b.id)) continue;
      const sa: Snap = { ...a.pose(), sentAt: now };
      const sb: Snap = { ...b.pose(), sentAt: now };
      if (claim(cache, `${a.id}:${b.id}`, sb)) push(batches, a.id, sb);
      if (claim(cache, `${b.id}:${a.id}`, sa)) push(batches, b.id, sa);
    }
  }
  for (const [recipient, batch] of batches) send(recipient, batch);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/party-sync.ts` (new; proposed, not checked against the repo). Server-side, in the server step, reads HP, MP and position of party members from the server's own state.
- Parity-checklist row 18. The server tick has no row of its own: the sub-line is row 18 / post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget". This sync belongs in that step, with its budget, and not in a 500 ms handler.
- Reuse tag: rewrite-from-idea (LGPL/GPL: clean-room; shape only)

## 6. Gaps and risks

- Scheduler is variable-step. The handler runs when its rate has elapsed, the loop sleeps 20 ms, and a slow handler delays every other handler (TickManager.cs:23, 27, 92). Frankendom must run this inside the fixed server step with a per-tick budget. Reject the 500 ms handler as it stands.
- Acknowledgement is missing. The forced resync is there "against packet loss" (TeamManager.cs:32, the donor's own comment). Nothing is acknowledged. If Frankendom needs reliable party state, it needs sequence numbers, not a 5 s repeat.
- Quadratic pair walk. The walk is upper-triangle over online members per team per pass. For parties this is small; the donor's raid estimate (727-730) is a comment. Frankendom's party size is not fixed by the brief; cap it and measure.
- The region skip hides data. Same-region or neighbouring pairs get no sync packet from this code; the donor relies on the normal broadcast (771-772; not read). Frankendom must show its own broadcast covers in-range teammates before skipping.
- Disband race is guarded in the donor by `Team.SyncLock` (Team.cs:44-51), and the disband body (840-880) was not read. Do not copy the teardown until read.
- Values are server values (Character HP/MP/position, TeamManager.cs:797-803). That fits the server-verified ruling; the client never sends them here.
- Chat and guilds are not covered. ChatManager and the family and expedition managers were not read; this note does not claim anything about them.

Best transferable idea: party member state is pushed on a fixed cadence, but only when it changed (HP and MP exact, position within a tolerance) or after a long gap, with one batch per recipient.
Decision (proposed): adapt — the change-only send with a tolerance and a forced resync is a good template for party HP in a fight; the 500 ms handler, the region skip and the missing acknowledgement must not be copied.
Acceptance: server test: a teammate's HP change reaches the other member in the next sync pass; an unchanged teammate is not resent for 5 s; a teammate moved by less than 0.01 units is not resent; an offline teammate is skipped.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All cites hold: 500 ms/5000 ms/5 min consts (31,33,40), Subscribe at 705 (useAsync false), UpdateAllTeams 732-786, TryClaimSnapshot 794-818, HasSameSnapshotAs 1000-1006, PositionEpsilon 0.01f (996), AreInRenderDistance 958-972, TickLoop sleep 20 ms (27), delta>rate (92), first run immediate (91), 2,450 comment (730), ClearSyncState callers 406/440/591/866, SetOffline 558-600, README LGPL v3-or-later at 36-38. Sketch order matches (one-sided claim per direction, batch per recipient).

**Missed:** UpdateAtLogin resets AllOfflineSince to MinValue (TeamManager.cs 650), so a reconnect cancels the zombie timer; DisbandOfflineTeam (839-877) re-verifies MembersOnlineCount under Team.SyncLock and clears InParty + sync state before TryRemove - note says 'not read' (honest) but both are cheap, relevant details. Cache is keyed (recipientId, sourceId) so region-skipped pairs keep stale entries.
