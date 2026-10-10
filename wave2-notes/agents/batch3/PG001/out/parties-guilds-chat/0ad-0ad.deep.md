# 0ad-0ad (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/gui/gamesetup/Controllers/PlayerAssignmentsController.js` | Licence: GPL version 2 or later (0 A.D. `LICENSE.txt`: "binaries/data/ / GPL version 2 (or later)"; the controller file has no header of its own) | JavaScript (GUI script) | symbol `onClientJoin`

Checked: Read in full `onClientJoin` (96-139) and its helpers `updatePlayerAssignments` (144-152), `onPlayerAssignmentMessage` (157-172), `assignClient` (174-183). Read `BuddyButton.js` in full (70 lines). Read the buddy list global (`gamedescription.js` 30), the lobby buddy rank (`Game.js` 176-201), the game-list comparator (`GameList.js` 127-130), the player-list buddy key (`PlayerList.js` 104) and the presence table (`PlayerList.js` 195-215). Not read: the C++ side of `Engine.AssignNetworkPlayer`, the XMPP presence source, the column-click code that sets the sort order, and the construction order of the other join handlers. Confidence: high on the seat-assignment mechanism (read end to end); medium on how the buddy-column sort direction behaves in use (see section 6). This is a lobby/setup feature, not a fight; rated on the mechanism only.

Best transferable idea: On a join, seat the newcomer in their own last seat if it is in range and free, otherwise in the lowest free seat, with an optional friends-only gate in front.
Decision (proposed): adapt - the seat memory and friend gate fit a 3-attacker fight (MAX_ATTACKERS = 3) when a player drops and rejoins; the donor keys memory by display name and has no timer, so Frankendom must key by server account id and set an explicit grace window as data.
Acceptance: A server test where a player who leaves a 3-attacker fight and rejoins inside the grace window gets the old attacker seat back if it is free, gets the lowest free seat otherwise, and a non-friend join gets no attacker seat when friends-only is on.

## 1. Mechanism

- Trigger: a net `players` message. `onPlayerAssignmentMessage` (157-172) loops over the new assignment list; for each GUID not yet in the current `g_PlayerAssignments` it calls every join handler with the new list (161-163). Only after that loop does it replace `g_PlayerAssignments` (170-171). So a join handler sees the list as it was before the join.
- `onClientJoin` (96-139), in order:
  - (a) Returns unless this client is the controller (`g_IsController`, `gamesetup.js` 35) and the joiner has no seat yet (98).
  - (b) The host's own GUID skips the policy (102).
  - (c) Reads the user setting `gui.gamesetup.assignplayers` (104; default `everyone`, `default.cfg` 433). `disabled` returns with no seat (105). `buddies` returns with no seat unless the joiner's nick is in the buddy list (106).
  - (d) Seat pool is 1 to `nbPlayers` (111).
  - (e) Rejoin: if the nick's remembered seat is above 0 and at most `nbPlayers` (116), and no current assignment holds that seat (118-124), take it (126).
  - (f) Otherwise take the lowest seat in the pool that no current assignment holds (128-134). If none is free, return with no seat (135-136).
  - (g) `assignClient` (138): on a networked game it calls `Engine.AssignNetworkPlayer` (176-177); in single player it writes the seat locally (179-182).
- Memory: `updatePlayerAssignments` (147-148) writes `lastAssigned[name] = player` for every entry in the current list, including `-1`. A name that leaves the list is no longer written, so its last value stays. A host unassign (player `-1`) overwrites the memory, so that player gets the lowest free seat next time.
- Timing: the logic runs once per join message. No loop, no tick, no timer.
- Separate friend list: `g_Buddies` is a comma-separated string from the user config key `lobby.buddies` (`gamedescription.js` 30). `BuddyButton.onPress` (45-66) removes or adds the nick (50-54), saves the list back to the user config (56-60) and tells the list views. The button is enabled only when the XMPP client is connected and the selected nick is not you (`BuddyButton.js` 39). The list is per client; nothing in this code sends it to a server. No cap on list length was found in `BuddyButton.js`.
- Lobby game list rank (`Game.js` 176-201): starts at 0 (177). A playing buddy in the game sets it to 2; a spectating buddy sets it to 1 only while it is below 2 (190-191). The sort value is the rank as a string followed by the game name (201). The comparator (`GameList.js` 128-130) multiplies by the column order, which defaults to `"1"` for the game-name column (`GameList.xml` 5). So with ascending order rank 0 sorts first and rank 2 last. Whether the buddy column is ascending or descending after a header click was not read.
- Player list buddy key (`PlayerList.js` 104): `(isBuddy ? 1 : 2) + statusIndex`, then the lower-cased name. The status index is the position of the presence in the key order of `PlayerStatuses` (11; 195-220): available 0, away 1, playing 2 (shown as "Busy", line 209), offline 3, unknown 4.

## 2. Key functions

- `onClientJoin`: `PlayerAssignmentsController.js` 96-139 (policy gate, rejoin memory, lowest free seat).
- `updatePlayerAssignments`: `PlayerAssignmentsController.js` 144-152 (memory write from every current entry).
- `onPlayerAssignmentMessage`: `PlayerAssignmentsController.js` 157-172 (join detection, handler fan-out before the list is replaced).
- `BuddyButton.onPress`: `BuddyButton.js` 45-66 (friend toggle, config save).
- Buddy rank in the game list: `Game.js` 176-201.
- Game-list comparator: `GameList.js` 127-130.
- Player-list buddy key: `PlayerList.js` 100-110 (read the key at 104).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Seat memory: reuse the last seat if it is in range and free | Range 1 to `nbPlayers` (theirs, `PlayerAssignmentsController.js` 111, 116); `nbPlayers` is the match's player-count game setting. No timer (none in the file). |
| Fallback: lowest free seat | None (the scan at 129-134). |
| Join policy switch | Values `everyone` (default), `buddies`, `disabled` (theirs, `default.cfg` 433; checks at 105-106). |
| Friend rank for a list row | 2 playing, 1 spectating, 0 neither (theirs, `Game.js` 177, 190-191). |
| Status index for sort | 0 available, 1 away, 2 playing, 3 offline, 4 unknown (key order, `PlayerList.js` 195-220). Used as an additive offset (104). |
| Remember a seat only while it is above 0 | `> 0` check (theirs, 116). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: policy gate, then the remembered seat if free, then the lowest free seat, then remember the seat. It differs in four ways: it keys memory by an account id instead of the display name; for an account that already holds a seat it returns that seat, where the donor does nothing (the guard at 98 means the search never runs for a seated player); it has no unassign method, so an explicit unassign does not clear memory (the donor writes `-1` at 147-148); and it omits the networked engine call, the single-player branch, the host exemption at 102 and the fan-out to other join handlers. The donor's `buddies` value is named `friends` in the sketch.

```ts
// Clean-room sketch: join-time seat assignment with a friend-only gate and rejoin seat memory.
// Donor licence: GPL version 2 or later (0 A.D. LICENSE.txt, binaries/data/). Written from the described mechanism, not translated.
// clean-room
type JoinPolicy = "everyone" | "friends" | "disabled";

class SeatBook {
  private seatOf = new Map<string, number>();   // account -> seat it holds now
  private lastSeat = new Map<string, number>(); // account -> last seat > 0 it held; kept after leave

  constructor(private seatCount: number, private policy: JoinPolicy) {}

  // Returns the seat for a joiner, or null when they stay a spectator.
  onJoin(accountId: string, isFriend: boolean): number | null {
    if (this.policy === "disabled") return null;
    if (this.policy === "friends" && !isFriend) return null;
    if (this.seatOf.has(accountId)) return this.seatOf.get(accountId)!;

    const taken = new Set(this.seatOf.values());
    let seat: number | undefined;

    // Rejoin: take the old seat if it is in range and free right now.
    const old = this.lastSeat.get(accountId) ?? 0;
    if (old > 0 && old <= this.seatCount && !taken.has(old)) seat = old;

    // Otherwise the lowest free seat.
    if (seat === undefined) {
      for (let s = 1; s <= this.seatCount; s++) {
        if (!taken.has(s)) { seat = s; break; }
      }
    }
    if (seat === undefined) return null;

    this.seatOf.set(accountId, seat);
    this.lastSeat.set(accountId, seat);
    return seat;
  }

  // The seat is freed, but the memory of it stays (the donor keeps lastAssigned when a name leaves the list).
  onLeave(accountId: string): void {
    this.seatOf.delete(accountId);
  }
}
```

Typecheck: the block above with `export {}` appended, run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/attacker-seats.ts` (new, proposed): the server-side seat book for the attacker slots (MAX_ATTACKERS = 3). The client only shows the seats.
- Parity row: 17 (death/respawn). Weak fit: the donor is a lobby seat assignment, and only the seat return on rejoin lands in a fight. The friend gate and the buddy sort fit none of rows 1-23, so they are "none" and are not placed.
Reuse tag: rewrite-from-idea (GPL version 2 or later; clean-room only)
Brief rule served: one engine (seat logic runs in the server engine, not the client); one ledger (seats keyed by account id); MAX_ATTACKERS = 3 as the seat count.

## 6. Gaps and risks

- GPL version 2 or later (copyleft): clean-room only. The sketch is written from the mechanism.
- Memory is keyed by display name (`PlayerAssignmentsController.js` 116, 126, 148). Two players with the same name share memory, and a name can be taken by someone else on rejoin. Frankendom must key by account id.
- No timer: memory lasts for the whole setup session. Frankendom needs an explicit grace window (zone data), or a seat is held forever.
- An explicit unassign writes `-1` into memory (147-148), so a host unassign clears the seat memory. Decide whether a kick should do the same.
- The friend gate reads a per-client config list (`BuddyButton.js` 58), not server state. Frankendom's friend rows must live in the one ledger and be checked on the server.
- The buddy-first sort does not hold. `PlayerList.js` 104 adds the status index to the buddy flag. Buddy-available = 1, non-buddy-available = 2, buddy-away = 2, buddy-busy = 3, non-buddy-away = 3. Ascending, a non-buddy who is available sorts before a buddy who is busy, and a buddy who is away ties with a non-buddy who is available, broken by name. Do not copy this key; sort on a tuple (buddy first, then presence).
- The game-list rank comment says playing buddies sort above spectating buddies (`Game.js` 189). The sort value is "2"/"1"/"0" plus the name, so in ascending order "0" comes first and "2" last. Which one shows first depends on the column order after a header click, which was not read.
- Not read: `Engine.AssignNetworkPlayer` (engine side), the XMPP presence feed, and the order in which the other join handlers register (`ReadyController.js` 29, `GameSettingsController.js` 36, `ClientConnection.js` 7, `SoundNotification.js` 6). The controller's own handler is registered at `PlayerAssignmentsController.js` 38.
