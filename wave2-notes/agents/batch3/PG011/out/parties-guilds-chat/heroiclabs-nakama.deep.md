# heroiclabs-nakama (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go` | Licence: Apache-2.0 (header of party_presence.go; repo `LICENSE`: "Apache License, Version 2.0") | Go | symbol `PartyPresenceList` (`Reserve`, `Release`, `Join`, `Leave`, `Oldest`), with the caller `PartyHandler.Accept` in `server/party_handler.go`

Best transferable idea: hold a seat for a pending join while it is confirmed elsewhere, so the cap counts it and a failed confirm gives it back; a batch join is all-or-nothing against the cap.
Decision (proposed): adapt — keep the seat hold for async confirms (reserve, confirm, release on failure), the all-or-nothing batch check, and the oldest-member leader succession; reject the copy-on-write read snapshot unless Frankendom's server is multi-threaded, which the brief does not say.
Acceptance: a server test with max 3: an accept whose stream confirm fails leaves the roster at its old size and frees the seat, so the next accepted request still succeeds; a fourth accept while three members are present returns full.

Checked: The hint file `server/party_presence.go` (166 lines, read in full) is the party presence list: seats, reservations, join, leave, snapshot and oldest member. Its callers were read: `server/party_handler.go` 132-168 (JoinRequest, read to line 170), 203-262 (the `PartyHandler.Join` hook: first joiner becomes leader at 222-236; `members.Join` at 246), 298-352 (Leave and leader succession), 409-475 (Accept), 112-122 (party creation: leader joins). Callers of Reserve, Release, Join and Leave were found by grep: `server/match_handler.go` 517 and 552, `server/party_registry.go` 262 and 270. Not read: `server/api_party.go` (where `maxSize` comes from; the value is passed into `Create` at `party_registry.go` 201), the stream manager, the tracker, and the matchmaker removal. Confidence: high on the list and on the accept flow; medium on the Join hook beyond line 262.

## 1. Mechanism

- A party's presence list has a cap, `maxSize`, set at construction (`party_presence.go` 41). Members are kept in a slice in join order, plus a map from session to node. A second map holds reserved seats (`reservedMap`, 26-33). A capacity check counts members and reserved seats together (`Size`, 156; `Reserve`, 59).
- Reserve (53-66): a session that already holds a seat returns success (55-58). If members plus reservations reach the cap, it returns `runtime.ErrPartyFull` (59-62). Otherwise it stores the seat (63). Reserve is the authoritative gate for accepts.
- Release (68-72) deletes the seat. Used only when the confirm fails (`party_handler.go` 459).
- Join (74-116), for a batch: count the sessions that are neither reserved nor present (79-83). If there are new sessions and reservations plus members plus new sessions exceed the cap, refuse the whole batch (85-88). Otherwise, for each session: delete its reservation (91), and append it as a member if it is not already present (92-107). If anything changed, publish a fresh copy of the slice for readers (109-113).
- Leave (118-147): for each session, delete its reservation and report it (123-126); if it is a member, shift the slice left over it, clear the tail, and delete it from the map (127-136). Return the removed members and the released reservations. A publish follows (140-144).
- List (149-151) reads the published copy with no lock. Oldest (159-166) returns the first member in the slice, which is the oldest join.
- Accept (`party_handler.go` 409-475), in order: fast cap check under the handler lock (425); find the pending join request (430-443); `Reserve` the seat (445); remove the request (450-452); unlock; confirm through the stream (457). The comment at 456 says the stream join triggers the `PartyHandler.Join` hook, which runs `members.Join` (246); the mechanism of the stream join itself was not read. If the confirm fails, `Release` the seat and return an error (459-460). After success, a second `members.Join` is called directly (462). It is harmless: Join skips sessions already present (92).
- Leader succession (`party_handler.go` 317-352): when the leader leaves, the oldest remaining member becomes leader and a promotion message goes to the stream (324-347). If no member is left, the party stops (326-330). The hook gives the first joiner the leader role when there is none (222-236).
- Join requests are capped at the same `MaxSize` (158).
- Tick: none. Changes are event-driven (join, leave, accept). No timers in this file.

## 2. Key functions

- `PartyPresenceList.Reserve`: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go` 53-66. Seat hold with the cap check.
- `PartyPresenceList.Join`: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go` 74-116. All-or-nothing batch join; consumes reservations.
- `PartyPresenceList.Leave`: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go` 118-147. Releases reservations, removes members in order.
- `PartyPresenceList.Oldest`: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_presence.go` 159-166.
- `PartyHandler.Accept`: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_handler.go` 409-475. Reserve, confirm, join or release.
- `PartyHandler.Leave`: `/mnt/frankendom-donors/heroiclabs-nakama/server/party_handler.go` 298-352. Leader succession.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cap counts members plus held seats (theirs 59, 156) | `maxSize` per party, set by the creator (value not read; passed into `Create` at `party_registry.go` 201) |
| Batch join refused whole if the new sessions do not fit (theirs 85) | None |
| Seat held across an async confirm, released on failure (theirs 445, 459) | None |
| Join requests capped at the same size (theirs `party_handler.go` 158) | Same value as the party cap |
| Leader passes to the oldest member; empty party stops (theirs 324-330) | None |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for accept: check that the request exists, reserve the seat (the cap check happens inside reserve), remove the request, confirm while the seat is held, then join or release. It does not repeat the handler's fast cap check at line 425, since reserve is the authoritative gate. It keeps the batch join rule and the reservation-consuming join. It omits the copy-on-write read snapshot (`presencesRead`), the mutex, the presence and user-presence structs, the join-request cap and duplicate check, the open-party direct join, the matchmaker removal, the tracker and stream calls, and the leader state and party stop. The donor's second `Join` at line 462 is not repeated.

```ts
// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
class PartySeats {
  private members: string[] = [];        // join order; index 0 is the oldest
  private reserved = new Set<string>();  // seats held while a join is being confirmed

  constructor(private readonly max: number) {}

  // Reservations count against the cap, like members do.
  size(): number { return this.members.length + this.reserved.size; }

  reserve(id: string): void {
    if (this.reserved.has(id)) return;                 // already holds a seat
    if (this.size() >= this.max) throw new Error("full");
    this.reserved.add(id);
  }

  release(id: string): void { this.reserved.delete(id); }

  // All or nothing: if the new ids do not fit, nothing changes.
  join(ids: string[]): void {
    const fresh = ids.filter(id => !this.reserved.has(id) && !this.members.includes(id)).length;
    if (fresh > 0 && this.size() + fresh > this.max) throw new Error("full");
    for (const id of ids) {
      this.reserved.delete(id);
      if (!this.members.includes(id)) this.members.push(id);
    }
  }

  // Returns the ids that were members. A reservation is dropped silently.
  leave(ids: string[]): string[] {
    const gone: string[] = [];
    for (const id of ids) {
      this.reserved.delete(id);
      const i = this.members.indexOf(id);
      if (i >= 0) { this.members.splice(i, 1); gone.push(id); }
    }
    return gone;
  }

  oldest(): string | undefined { return this.members[0]; }
}

// Accept a pending request: hold the seat, confirm with the stream, then join, or give the seat back.
async function accept(
  seats: PartySeats,
  requests: Set<string>,
  id: string,
  confirm: (id: string) => Promise<boolean>,
): Promise<"ok" | "not-requested" | "full" | "confirm-failed"> {
  if (!requests.has(id)) return "not-requested";
  try {
    seats.reserve(id);
  } catch {
    return "full";
  }
  requests.delete(id);
  const ok = await confirm(id);          // the seat stays held while this is pending
  if (!ok) {
    seats.release(id);
    return "confirm-failed";
  }
  seats.join([id]);
  return "ok";
}

// Leader leaves: the oldest remaining member takes over. With no members left the party closes.
function leaderAfterLeave(seats: PartySeats): string | undefined {
  return seats.oldest();
}
```

Typecheck: the block plus `export {}` compiles with `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/party-roster.ts` (new, the same module as the gemrb-gemrb note; the server owns party membership). Not checked against the repo (not read).
- Parity row: none. No row 1-23 covers party membership or seat holds. Not claimed as any other row.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, the sketch is written from the mechanism)
- Brief rule served: one ledger (one member list with a seat count that includes holds); server-verified joins (the seat is checked and held on the server before the confirm).

## 6. Gaps and risks

- Apache-2.0 permits adaptation. The sketch was still written from the mechanism. Any copied code must keep the licence notice.
- The donor's read snapshot is there for lock-free reads in Go. Frankendom's server runtime is not stated in the brief; if it is single-threaded, the snapshot is not needed. Not adopted in the sketch.
- Maximum size is set by the creator, and its values are not read (`server/api_party.go` not read). Frankendom must decide a cap per party type (Lead). MAX_ATTACKERS = 3 limits attackers in a fight and is not a party size.
- The seat is only held while a join is confirmed. No timeout on the hold is visible in `Accept`: it waits on the stream call, so if that call never returns, the seat stays taken. The stream call's own timeout was not read. Frankendom needs an explicit timeout on a hold.
- The leader's succession takes the oldest member, by join order. A duel or a fight must not hand leadership to a player who is in the middle of a fight. Not read whether the donor checks that; the code shown does not.
- Join requests share the cap (158): a full party also cannot queue requests. That is a design choice, not a rule Frankendom has set.
- The stream join is a separate round trip. The Frankendom equivalent is an accept that writes the roster and the seat in one server step. The sketch keeps them as two steps to show the hold.
- Not read: the stream manager and the tracker (what a failed `UserJoin` means beyond `success == false`), the matchmaker removal at `party_handler.go` 472 (seen in the read, the function itself not read), the match handler's use of the presence list (`match_handler.go` 517, 552).
