# heroiclabs-nakama (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go | Licence: Apache-2.0 | Go | symbol PartyPresenceList.Join / Leave (input line 74 verified: `Join`)

## 1. Mechanism

- A party roster with a fixed capacity, held on the server. A slot is first reserved for a session (a hold), then turned into a member when the session joins, or dropped when it leaves or is released.
- Inputs: a batch of join presences, a batch of leave presences, or a single reserve or release call. Each presence has a session id and a node id.
- Reserve (53-66): a session already holding a reservation gets no error (55-58). A new reservation is refused with `ErrPartyFull` when members plus reservations are at or above the capacity (59-62).
- Join (74-116, batch, all or nothing): count the sessions that are neither reserved nor present (77-84). If reservations, members and those new sessions together exceed the capacity, the whole batch is refused with `ErrPartyFull` (85-88); if no session is new the check is skipped. Otherwise each session clears its reservation and is appended to the list and the session-to-node map, unless it is already present (90-108). Only the sessions actually added are returned.
- Leave (118-147): for each session, clears a reservation if there is one and returns it in the second list (123-126); if the session is in the map it removes the list entry (only where session id and node both match, 129) and deletes the map entry on session id alone (136), and returns it in the first list. A reservation-only leave appears only in the reservations list.
- Read path: after a join that added someone, or a leave that removed someone, a fresh copy of the list is stored in an atomic value (109-113, 140-144); `List` (149-151) reads it without the lock. Reserve and Release do not touch it (reservations are not visible in the list). `Size` (153-157) takes the read lock and counts members plus reservations.
- Output: the processed joins or leaves, and the released reservations. The member list is the authority; new members are appended, so `Oldest` (159-166) returns the first entry.

## 2. Key functions

- `PartyPresenceList.Reserve`, `/mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go`, lines 53-66. Hold a slot, refuse when full.
- `PartyPresenceList.Join`, same file, lines 74-116. Batch join, all-or-nothing capacity check, snapshot on change.
- `PartyPresenceList.Leave`, same file, lines 118-147. Removes members and returns released reservations.
- `PartyPresenceList.Release`, same file, lines 68-72. Drops a reservation.
- `PartyPresenceList.List` and `Size`, same file, lines 149-157. Lock-free snapshot read; capacity count.
- `PartyPresenceList.Oldest`, same file, lines 159-166. First member (the natural leader pick).
- `NewPartyPresenceList`, same file, lines 41-51. Capacity (`maxSize`) passed in.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-phase seat: reserve, then join; capacity counts both | Capacity passed in at creation (theirs, `NewPartyPresenceList(maxSize)`, line 41) |
| Batch join is all or nothing against capacity | None beyond the capacity value |
| Copy-on-change snapshot so reads never block writes | None |
| Idempotent reserve for the same session | None |

## 4. TypeScript sketch

simplified: single-threaded, so no lock and no atomic snapshot swap (the sketch copies the list into `snapshot` but nothing reads it). The sketch's `leave` removes a member by session id only, where the donor matches session id and node (129) and deletes the map entry on session id alone. The donor returns an error value (`ErrPartyFull`); the sketch returns null from `join` and false from `reserve`. The sketch has no `Oldest`, no `Size`, and keeps username but not the user id.

```ts
// Licence: Apache-2.0 - adapted from party_presence.go lines 53-147 (Nakama Authors); path cited. Roster with holds, all-or-nothing join.
type Member = { sessionId: string; node: string; username: string };
class PartyRoster {
  private members: Member[] = [];
  private reserved = new Set<string>();
  private snapshot: Member[] = [];
  constructor(private capacity: number) {}
  // Hold a seat for a session; refused when members plus holds fill the party.
  reserve(sessionId: string): boolean {
    if (this.reserved.has(sessionId)) return true;
    if (this.members.length + this.reserved.size >= this.capacity) return false;
    this.reserved.add(sessionId);
    return true;
  }
  // Batch join: refuse all if the new sessions would overflow; otherwise take each one.
  join(batch: Member[]): Member[] | null {
    const isMember = (id: string) => this.members.some((x) => x.sessionId === id);
    const fresh = batch.filter((m) => !this.reserved.has(m.sessionId) && !isMember(m.sessionId));
    if (fresh.length > 0 && this.members.length + this.reserved.size + fresh.length > this.capacity) return null;
    const processed: Member[] = [];
    for (const m of batch) {
      this.reserved.delete(m.sessionId);
      if (!isMember(m.sessionId)) { this.members.push(m); processed.push(m); }
    }
    if (processed.length > 0) this.snapshot = [...this.members];
    return processed;
  }
  // Remove members; return sessions that only held a seat.
  leave(batch: Member[]): { removed: Member[]; released: string[] } {
    const removed: Member[] = [];
    const released: string[] = [];
    for (const m of batch) {
      if (this.reserved.delete(m.sessionId)) released.push(m.sessionId);
      const i = this.members.findIndex((x) => x.sessionId === m.sessionId);
      if (i >= 0) removed.push(this.members.splice(i, 1)[0]);
    }
    if (removed.length > 0) this.snapshot = [...this.members];
    return { removed, released };
  }
}
```

## 5. Lands in

- Frankendom target: NEW `origins/presence/party.ts` (server-side roster; does not exist today; server side only). The presence service header (`origins/presence/server.ts` line 4, VPS snapshot /root/work-k7, not main) says guild/party lookup arrives with its own PR.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: `docs/specs/origins/one-shard.md` §5 (a joining player is assigned the layer of their party leader or an online guild-mate); parties, guilds and chat are a later phase.
- Reuse tag: adapt (Apache-2.0: the seat-hold and all-or-nothing join logic can be lifted with attribution; the presence types are Nakama's).
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks

- Holds have no expiry in this file (53-66): a reservation waits until a join or a release. Frankendom needs a timeout, or a dead client holds a seat forever.
- Capacity counts holds as members (59, 85), so a held seat blocks a join; correct for a party, but test it with a full party and holds outstanding.
- State is in memory only. If Frankendom persists party state it goes through the one-ledger rule, and the roster is keyed on the verified account id (the donor keys on session id).
- Leave removes the list entry only when session id and node both match (129) but deletes the map entry on session id alone (136), so the list and map can drift for a session seen on another node. Frankendom has one shard (one-shard spec), so key the roster on one id.
- Party capacity is a social limit and is independent of MAX_ATTACKERS = 3 (combat); do not let party size raise the number of attackers on one target.
- Pit is a client only; the roster is server code. Zones are data; the roster is keyed to accounts, not zones.
- Nothing here touches fight state or kill authority, so the one-engine and server-verified-kills rulings are untouched.
- Not read: callers of `PartyPresenceList` (the party handler, `Presence` and `PresenceID` types).
