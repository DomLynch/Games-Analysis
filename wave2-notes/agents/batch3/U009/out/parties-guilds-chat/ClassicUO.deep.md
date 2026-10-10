# ClassicUO (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/PartyManager.cs` | Licence: BSD-2-Clause (LICENSE.md line 1: "BSD 2-Clause License", Copyright (c) 2025, andreakarasho; per-file header `SPDX-License-Identifier: BSD-2-Clause`) | C# | symbol `PartyManager.ParsePacket`

Checked: `PartyManager.cs` read in full (263 lines); `WorldMapEntityManager.cs` read in full; `PartyInviteGump.cs` read in full; `ChatManager.cs` read in full (102 lines, channel table and strings only); `PacketHandlers.cs` 355-375, 1095-1115, 4185-4195, 5630-5680 read; `HealthBarGump.cs` 1870-1895 read; `WorldMapGump.cs` 528-545 read; `World.cs` 296-335 and 386-394 read; `GameObject.cs` 30-52 read; `OutgoingPackets.cs` 2490-2545 read for the write lines only; `MessageManager.cs` 100-135 read; `PartyGump.cs` 270-285 read. Callers checked: `ParsePacket` has one caller (PacketHandlers.cs:4193, case 6); `AddOrUpdate` has three call sites (PacketHandlers.cs:5662, World.cs:318, World.cs:331); `RemoveUnupdatedWEntity` has two (PacketHandlers.cs:5675, World.cs:392). Not read: the server side of the roster packets and of the 0xF0 reply (not in the donor); the value of `Constants.MAX_VIEW_RANGE`; the body of `Mobile.Distance` past line 52 of GameObject.cs; the UI manager's update loop; guild gumps (grep only). Confidence: high on the roster rules and the poll cadence (read, receipted); medium on the roughly 2 s marker expiry, which is derived from the offsets and was not run. Depth: full for the party roster and the map position feed; thin for chat (only the channel table and the name-matching in MessageManager read). camera: not applicable.

Best transferable idea: the server sends the whole party roster and the client rebuilds from it, and a teammate's map marker is queried only when that teammate is out of sight, at most one query per 250 ms poll, and disappears about 2 s after its last update.
Decision (proposed): adapt - the roster mirror and the one-query-per-poll budget fit Frankendom's one-ledger, server-verified rule, but the client must never write the leader locally before the server confirms it, and the 10 s trust window that accepts local guesses must not be copied.
Acceptance: a server test sends a 3-member roster and then a removal of slot 0 and asserts the client view is empty; a poll test with two teammates out of view asserts exactly one party-position query per 250 ms; a marker not refreshed for 2 s is gone from the map.

## 1. Mechanism

The server owns the party. The client keeps a mirror and draws it. Three parts:

(a) Roster packets (`PacketHandlers.cs:4193` dispatches party packets to `PartyManager.ParsePacket`). Sub-code 1 is "add", sub-code 2 is "remove or full list". Order of steps for sub-code 1 and 2:
- If the list holds one serial or none (`count <= 1`, PartyManager.cs:47), the roster, leader and pending invite are all cleared (lines 48-78). For sub-code 2 the slot's serial is zeroed first, only if a health-bar gump exists for it.
- Otherwise the roster is cleared (line 80), then, for sub-code 2, the serial named for removal is read (line 86). `remove_all` is set when the named serial is the local player (line 91).
- The loop walks the serials in packet order (lines 94-131). A serial named for removal is skipped; if that removal is at index 0, `remove_all` is set and the whole party is cleared (line 99-102). Every other serial goes into slot `i` of the 10-slot array (lines 106-108) and counts toward `done` (line 111). Slot `i` is the packet position, so a removed member leaves a null gap rather than shifting the others.
- The first serial in the packet becomes the leader (lines 114-117).
- After the loop, for sub-code 2 only, if `done <= 1` the remaining members are nulled and the roster is cleared (lines 133-148).
- Sub-code 7 stores the inviter serial (line 182) and opens `PartyInviteGump` only if the profile setting is on (lines 184-186).

(b) Invite accept and decline (`PartyInviteGump.cs`, 61-80). Accept runs only when an inviter is set and no leader is set (line 63). It sends the accept request, then writes `Leader = Inviter` locally before any server reply (lines 65-67), then clears the inviter. Decline has the same gate (line 75) and sends a decline (line 77). The local leader write is optimistic. The server's reply was not read, so the note cannot say what happens if the server refuses. A later roster packet would overwrite it (this follows from the code in (a), not from a read of the server).

(c) World-map position feed (`WorldMapEntityManager.cs`).
- `Enabled` is true only when the server supports the new movement system with an ack or does not, the connection is not encrypted (line 59), the profile's party-show setting is on, and the world map gump is open (receipt line 60-61).
- `RequestServerPartyGuildInfo` (line 200) is called from the world map gump's `Update` (WorldMapGump.cs:541). The frame loop that calls `Update` was not read, so "once per frame while that gump is open" is an inference. Gate 1: return unless forced or `Enabled`. Gate 2: return unless in game and the stored send time (`_lastPacketSend`) is in the past (line 207). On pass it writes `_lastPacketSend = now + 250` (line 211), sends the guild position query (sub-code 0x01, OutgoingPackets.cs:2505), then, only if the party has a leader (`Leader != 0`), walks the members (line 222). For the first member whose mobile is null or whose `Distance` is greater than `ClientViewRange` (line 228), it sends the party position query (sub-code 0x00, OutgoingPackets.cs:2537) and breaks (line 232). A member who is still in view is skipped. So: at most one party query per 250 ms, aimed only at members who are out of sight.
- Input to the feed: (i) server packets, the 0xF0 "special" handler (PacketHandlers.cs:5636-5679). Sub-code 0x00 is the ack that enables the feed (lines 5642-5643). Sub-codes 0x01 (custom party info) and 0x02 (guild track) read a list ended by a zero serial (line 5653). Sub-code 0x02 first reads a flag saying whether locations follow (line 5649). Each entry carries serial, x, y, map, and hits for 0x02, and calls `AddOrUpdate` with `from_packet = true` (lines 5662-5671), then `RemoveUnupdatedWEntity` runs (line 5675). (ii) local world updates for allies and for party members in view (World.cs:318 and 331). These call `AddOrUpdate` with `from_packet = false`.
- `AddOrUpdate` with `from_packet = true` sets a 10 s trust window: `_lastPacketRecv = now + 10000` (line 105). A `from_packet = false` update is dropped when `_lastPacketRecv < now` (line 107). So local guesses are accepted only while a server packet arrived in the last 10 s. Each accepted update sets `LastUpdate = now + 1000` (lines 132 and 146).
- Expiry: `RemoveUnupdatedWEntity` (declared at line 163) returns early unless `_lastUpdate` is in the past (line 165), then sets `_lastUpdate = now + 1000` (line 170). It computes `ticks = now - 1000` (line 172) and removes every entry with `LastUpdate < ticks` (line 176). An entry is therefore removed about 2 s after its last update (derived, see Checked).
- The clock: `Time.Ticks` is set from the game-time total in milliseconds at GameController.cs:388 (the enclosing method was not read; it is treated as per-frame, which is an inference). Every timer above is a millisecond value read from that clock. The poll is driven by the frame loop, not by its own timer thread.

(d) Heal shortcut (party gump buttons, `HealthBarGump.cs:1883-1884` and `1890-1891`; consumer `PacketHandlers.cs:359-372`). Casting a heal stores the target serial and writes `PartyHealTimer = now + 50`. When the server's target-cursor packet arrives, `TargetCursor` calls `Target(serial)` only if `PartyHealTimer < Time.Ticks` and the stored target is not zero (line 367), then clears both (lines 369-371). A cursor packet that arrives inside the 50 ms window does nothing and leaves the target stored, with no expiry.

(e) Chat. `ChatManager` holds a dictionary of channels keyed by name and the string table of channel messages (ChatManager.cs:15-62). It has no routing. Party, system and command lines reach `MessageManager.HandleMessage`: when the overhead party setting is on and there is no parent entity, the speaker is found by matching the message's name string against party member names (MessageManager.cs:119-121). That is a name match, not a serial match. Guild messages are dropped when the profile's ignore-guild setting is on (MessageManager.cs:147-148, grep only).

Tick: the roster is applied when a packet arrives (event-driven). The position poll and the sweep run once per frame, gated by their own timers. Nothing runs on a fixed simulation step.

## 2. Key functions

- `PartyManager.ParsePacket`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/PartyManager.cs` 32-191. Roster rules: lines 47-78 (clear), 80-148 (rebuild and dissolve), 181-187 (invite).
- `PartyManager.Clear`: same file, 208-217. Nulls every slot and clears leader and inviter.
- `PartyInviteGump` accept and decline: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/UI/Gumps/PartyInviteGump.cs` 61-80.
- `WorldMapEntityManager.RequestServerPartyGuildInfo`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/WorldMapEntityManager.cs` 200-236.
- `WorldMapEntityManager.AddOrUpdate` (body read; the trust window is at 105-107, the update at 132 and 146): same file.
- `WorldMapEntityManager.RemoveUnupdatedWEntity`: same file, 163-180 (the expiry, lines 163-176).
- `PacketHandlers` 0xF0 special handler: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/PacketHandlers.cs` 5636-5680.
- Heal target shortcut: `TargetCursor` in PacketHandlers.cs 359-372; the buttons in `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/UI/Gumps/HealthBarGump.cs` 1880-1892.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Fixed party roster capacity, slot = packet position, removal leaves a gap | 10 slots (theirs, PartyManager.cs:16) |
| Leader is the first serial in the roster | Rule (theirs, PartyManager.cs:114-116) |
| Removing the slot-0 member clears the party | Rule (theirs, PartyManager.cs:99-102) |
| Removal that leaves 1 or 0 members dissolves the party | Threshold 1 (theirs, PartyManager.cs:133) |
| Position poll cadence | 250 ms (theirs, WorldMapEntityManager.cs:211) |
| Party position queries per poll | 1, then break (theirs, WorldMapEntityManager.cs:230-232) |
| Trust window after a server packet | 10000 ms (theirs, WorldMapEntityManager.cs:105) |
| Sweep period | 1000 ms (theirs, WorldMapEntityManager.cs:170) |
| Marker expiry | `LastUpdate = now + 1000` (theirs, lines 132 and 146) removed when `LastUpdate < now - 1000` (theirs, lines 172-176): about 2000 ms after the last update (derived) |
| Out-of-view test | `mob == null` or `Distance > ClientViewRange` (theirs, lines 228); the view-range value is not read |
| Heal pending window | 50 ms (theirs, HealthBarGump.cs:1883): not used, see section 6 |

## 4. TypeScript sketch

simplified: the sketch keeps the roster rules (leader, slot-0 clear, dissolve, slot gaps), the invite gate, the one-query-per-poll budget with the guild query always sent, and the trust window plus the 2 s stale sweep. It omits: the packet framing and the sub-code 1/2 read order; the Krrios 0xF0 protocol; the ack, encryption and InGame gates on the poll; the "still in view" check beyond a boolean; the duplicate-serial `Contains` check; the health-bar and gump refresh calls; the local-world feed from World.cs; the name-based overhead messages; and the heal shortcut (rejected). It also drops the `done` counter's duplicate handling and reorders nothing else. The sweep period (1000 ms) is kept but the sketch does not model the donor's `LastUpdate` offset arithmetic; it stores the last seen time directly and removes after STALE_MS.

```ts
// Licence: BSD-2-Clause (donor, permissive). Written from the described mechanism, not a line-by-line translation.
// clean-room
type Serial = number;
interface PartyView { leader: Serial | null; inviter: Serial | null; slots: (Serial | null)[]; }

const PARTY_SIZE = 10;     // donor PARTY_SIZE = 10 (PartyManager.cs:16)
const POLL_MS = 250;       // donor poll cadence (WorldMapEntityManager.cs:211)
const TRUST_MS = 10000;    // donor packet trust window (WorldMapEntityManager.cs:105)
const STALE_MS = 2000;     // donor: LastUpdate = now + 1000 and sweep removes when LastUpdate < now - 1000

function emptyParty(): PartyView {
  return { leader: null, inviter: null, slots: new Array<Serial | null>(PARTY_SIZE).fill(null) };
}

// A roster packet replaces the whole roster. `removed` is set only for a removal packet.
// Removing yourself, or the slot-0 member, clears the party. A removal that leaves <= 1 member dissolves it.
function applyRoster(serials: Serial[], removed: Serial | null, me: Serial): PartyView {
  if (serials.length <= 1) return emptyParty();
  if (removed !== null && (removed === me || removed === serials[0])) return emptyParty();

  const view = emptyParty();
  let kept = 0;
  serials.forEach((s, i) => {
    if (s === removed) return;           // slot stays null; later slots do not shift
    if (i < PARTY_SIZE) view.slots[i] = s;
    kept++;
  });
  if (removed !== null && kept <= 1) return emptyParty();
  view.leader = serials[0];              // first serial in the roster is the leader
  return view;
}

// Accept is only possible when an invite is pending and no leader is set.
function canAccept(v: PartyView): boolean {
  return v.inviter !== null && v.leader === null;
}

interface MemberView { serial: Serial; inView: boolean; }   // inView: a live mobile within view range

// One poll per POLL_MS. The guild query always goes out; at most ONE party-position query per poll,
// aimed at the first member that is not visible locally.
function pollPlan(now: number, nextAllowedAt: number, enabled: boolean, v: PartyView, members: MemberView[]):
  { send: boolean; guildQuery: boolean; partyQueryFor: Serial | null; nextAllowedAt: number } {
  if (!enabled || now < nextAllowedAt) return { send: false, guildQuery: false, partyQueryFor: null, nextAllowedAt };
  let partyQueryFor: Serial | null = null;
  if (v.leader !== null) {
    for (const m of members) {
      if (!m.inView) { partyQueryFor = m.serial; break; }
    }
  }
  return { send: true, guildQuery: true, partyQueryFor, nextAllowedAt: now + POLL_MS };
}

// Map markers. A server packet opens a trust window; local updates are accepted only inside it.
class MapMarkers {
  private lastSeen = new Map<Serial, number>();
  private trustUntil = -Infinity;
  private nextSweepAt = 0;

  packetUpdate(serial: Serial, now: number): void {
    this.trustUntil = now + TRUST_MS;
    this.lastSeen.set(serial, now);
  }

  localUpdate(serial: Serial, now: number): boolean {
    if (now > this.trustUntil) return false;   // no recent server packet: ignore the local guess
    this.lastSeen.set(serial, now);
    return true;
  }

  // Runs at most once per second, drops anything not seen for STALE_MS.
  sweep(now: number): void {
    if (now < this.nextSweepAt) return;
    this.nextSweepAt = now + 1000;
    for (const [serial, seen] of this.lastSeen) {
      if (now - seen > STALE_MS) this.lastSeen.delete(serial);
    }
  }

  has(serial: Serial): boolean { return this.lastSeen.has(serial); }
}
```

## 5. Lands in

- TARGET `origins/server/party.ts` (new, proposed): the server owns the roster and every marker; the client receives a mirror. Parity-checklist row 18 (loot roll and XP award), sub-point: the party's loot-share flag. The donor's only party state that changes a reward is `CanLoot` (PartyGump.cs:277-280, client sets it and sends the change). The roster and the position feed have no row of their own: this is a gap, not a fit.
- today: not checked in this pass (no Frankendom repo was read, so whether a party model exists is unknown).
- Reuse tag: rewrite-from-idea (BSD-2-Clause permits adaptation; the sketch is written from the mechanism, and no donor line is copied).
- Brief rule served: one ledger and server-verified state (the client holds a mirror only and never writes the leader before the server confirms it).

## 6. Gaps and risks

- The donor is a client mirror. Frankendom's one-ledger rule means the server writes the roster. Do not copy the optimistic `Leader = Inviter` write (PartyInviteGump.cs:66): the client should show "pending" until the server's roster arrives.
- Roster slots are packet positions with nulls left by removal (PartyManager.cs:106-108). Decide whether slot numbers are stable on purpose (the donor uses slot numbers for numbered tell targets, SystemChatControl.cs:497-499, grep-read only) or compact the roster and test it.
- Removing the slot-0 member clears the whole party for this client (PartyManager.cs:99-102). Whether that is the server's intent was not read (server code is not in the donor). Frankendom needs an explicit rule for leader leave.
- Overhead party messages match speakers by name (MessageManager.cs:119-121). Two members with the same name would collide. Frankendom must key by serial.
- The heal shortcut (HealthBarGump.cs:1883; PacketHandlers.cs:367) has no expiry: a target cursor that arrives inside the 50 ms window leaves the target pending for a later, unrelated prompt. Reject. Frankendom has no target-cursor step.
- The position feed depends on a non-standard 0xF0 sub-protocol (PacketHandlers.cs:5636) and an ack (5642). Encrypted sessions turn it off (the `Enabled` check at WorldMapEntityManager.cs:59; the warning is logged at line 81). Frankendom owns its server protocol, so define one budgeted query per poll ourselves.
- The 10 s trust window accepts local guesses after any server packet (WorldMapEntityManager.cs:105-107). Do not copy this for anything that decides a kill or a fight state (server-verified kills).
- Read gaps: the server side of the roster and the 0xF0 reply; the value of `Constants.MAX_VIEW_RANGE`; the metric in `Mobile.Distance` past GameObject.cs:52; the UI update loop; the guild gumps.
