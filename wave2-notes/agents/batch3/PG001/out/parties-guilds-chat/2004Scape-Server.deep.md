# 2004Scape-Server (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/server/friend/FriendServerRepository.ts` (with `FriendServer.ts` as the message handler) | Licence: MIT License, "Copyright (c) 2023-2025 Lost City" (`LICENSE`) | TypeScript | symbol `isVisibleTo`

Checked: Read in full `FriendServerRepository.ts` (387 lines) and `FriendThread.ts` (121 lines). Read `FriendServer.ts` 1-530 and 528-600 and 663-723 (the world-side client methods 601-662 not read). Read `ChatModes.ts` (18 lines), `FriendListAddHandler.ts`, `ChatSetModeHandler.ts`, `MessagePrivateHandler.ts` 11-40, the friend-message dispatch in `World.ts` 1988-2036, the chat-mode and private-message senders in `World.ts` 1568-1576 and 1609-1615 and 1669-1682, the social flag in `Player.ts` 405 and 453-466, and the tick driver in `World.ts` 120, 362-384, 407-410, 444, 537, 1148-1158. Not read: `World.addIgnore` and the ignore handlers, the bodies of the tick steps between 384 and 444, the client UI, the public-chat filter, and the database schema. Confidence: high on the visibility rule and the follower fan-out (both callers of `isVisibleTo` read: `getFriends` and `sendPlayerWorldUpdate`); high on the per-tick social gate; medium on the tick timing (driver read, middle steps not). Camera: not applicable.

Best transferable idea: Decide each viewer's view of a friend's online status with one ordered rule (staff, then the friend's ignore list, then the friend's privacy mode, where "friends only" means the friend must list the viewer), and push one status entry to each online player whose list holds the changed player.
Decision (proposed): adapt - keep the ordered visibility rule and the follower fan-out, but store friends, ignores and the privacy mode in Frankendom's one ledger on the server and enforce the ignore list on private messages, which this donor does not do.
Acceptance: A server test where player B sets privacy to "friends only" and does not list A: A's friend list shows B with world 0; after B adds A, A's list shows B's world within the same tick; an ignored player's private message to the target is refused by the server and never delivered.

## 1. Mechanism

- Topology: a separate friends server (`FriendServer.ts`) keeps one repository per profile. Worlds connect over a websocket and send login, logout, chat-mode, friend and ignore edits; the server caches each logged-in player's friend list, ignore list and private chat mode, and sends updates back to the world that holds each affected player.
- Login (`FriendServer.ts` 104-140), in order: an invalid chat mode is coerced to ON (118-121); the player is removed from any previous slot (124); the player takes the first empty slot on that world (repository 76-81; if the world is full, the login returns here and no lists are sent, 126-130); the friend list is sent (136); the ignore list is sent (137); then followers are told about this player (140).
- Friend list for a viewer (repository `getFriends` 131-163): first, online friends who are visible to the viewer, grouped by world index, each as [world, name] (141-155); then every other friend, online-but-hidden or offline, as [0, name] (157-160). A hidden online friend looks exactly like an offline one.
- Visibility (repository `isVisibleTo` 332-355), first match wins: (1) viewer is staff, visible (336-338); (2) the subject's ignore list contains the viewer, hidden (340-341); (3) the subject's private mode is OFF, or unknown and therefore defaulted to OFF, hidden (344, 346-348); (4) the subject's mode is FRIENDS, visible only if the subject's own friend list contains the viewer (350-352); (5) otherwise (ON) visible (354). The check is one-directional and reads the subject's lists, not the viewer's.
- Fan-out: after a change to player P, the server computes P's followers (repository `getFollowers` 177-181: the players whose friend lists are cached, which are the logged-in players, and whose list holds P) and sends each follower one UPDATE_FRIENDLIST entry for P, carrying P's world number if P is visible to that follower, otherwise 0 (`FriendServer.ts` 473-479, 490-506, entry at 503). Changes that trigger it: login (140), logout (160), chat mode (183-184), friend add (205; the adder also receives the target's entry, 201), friend delete (223), ignore add (241), ignore delete (259).
- Friend add (`FriendServer.ts` 196-205; repository `addFriend` 210-247): skip if already in memory (216-218); both accounts must exist (226-229); skip if the account already has 100 friend rows (231-235); then push to memory (237) and insert the row.
- Ignore add (repository `addIgnore` 249-294): same shape; skip if already present; the cap is 100 rows (268).
- Private chat mode: stored per player in memory (repository `setChatMode` 319-323). The world sends only the private mode (`World.ts` 1609-1615, from `ChatSetModeHandler.ts` 8-12). Public mode (ON, FRIENDS, OFF, HIDE) and trade/duel mode are defined in `ChatModes.ts` 1-18 but are not sent to the friends server.
- Private message (`FriendServer.ts` 260-290): both accounts are looked up and must exist (275-276); the message row is written to `private_chat` (278-288); then the message is delivered to the target's world socket if the target is logged in on any world (290; `sendPrivateMessage` 508-513). No ignore check and no mode check on this path.
- Per-tick social gate: six social handlers (friend add and delete, ignore add and delete, public and private message) refuse a packet when `player.socialProtect` is set (for example `FriendListAddHandler.ts` 10) and set it when they accept one (15). The flag is cleared in `Player.resetEntity` (`Player.ts` 466), which `processCleanup` calls for every player at the end of each cycle (`World.ts` 444, 1158). So a player gets at most one social packet per tick, of any of the six kinds.
- Tick: the world cycle runs with a fixed rate of 600 ms (`World.ts` 120). The next cycle is scheduled with the drift since the planned time subtracted (372, 537). Client input intake (`processClientsIn`, 384) runs before cleanup (444), so the gate is reset after the tick's intake.

## 2. Key functions

- `FriendServerRepository.isVisibleTo`: `FriendServerRepository.ts` 332-355 (the ordered visibility rule).
- `FriendServerRepository.getFriends`: `FriendServerRepository.ts` 131-163 (the list a viewer is sent).
- `FriendServerRepository.getFollowers`: `FriendServerRepository.ts` 177-181 (who is told about a change).
- `FriendServer` message handler, login and chat mode: `FriendServer.ts` 104-140 and 161-184; friend and ignore edits 185-259; private message 260-290.
- `FriendServer.broadcastWorldToFollowers` and `sendPlayerWorldUpdate`: `FriendServer.ts` 473-506.
- `FriendServerRepository.addFriend` and `addIgnore`: `FriendServerRepository.ts` 210-247 and 249-294.
- Per-tick gate: `Player.ts` 405 and 466; `World.ts` 384, 444, 1158; `FriendListAddHandler.ts` 10-15.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Ordered visibility rule (staff, ignore, OFF, FRIENDS, ON) | Mode values ON 0, FRIENDS 1, OFF 2 (theirs, `ChatModes.ts` 8-12). Unknown subject defaults to OFF (theirs, repository 344). |
| Invalid login value becomes ON | Theirs, `FriendServer.ts` 118-121 and 176-179. Note: the default for an unknown subject is OFF, the default for a bad login value is ON. |
| Friend list cap | 100 rows, counted in the database (theirs, repository 233). |
| Ignore list cap | 100 rows, counted in the database (theirs, repository 268). |
| World slot array | 2000 slots (theirs, `FriendServer.ts` 57; slots are the first null entry, repository 76). |
| Social gate | One social packet per player per tick (theirs, `Player.ts` 466 reset; handlers as above). |
| Fixed tick with drift correction | 600 ms (theirs, `World.ts` 120). |
| Private message length | 100 characters at the sender (theirs, `MessagePrivateHandler.ts` 14). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's ordered visibility checks (staff, ignore, OFF, FRIENDS, ON), the friend list shape (visible online entries first, then world 0 for the rest), the fan-out to online followers, and the one-social-packet-per-tick flag. It omits the database reads and writes, the world slot array and its 2000 limit, the websocket routing and message types, the private message path and its database row, the public and trade/duel modes, and the database-counted caps (the sketch counts in memory). It also reorders the friend list: the donor groups visible online friends by world index, the sketch keeps the friend-list order. For a staff viewer and an offline subject the donor sends an undefined world; the sketch sends 0.

```ts
// Clean-room sketch: friend-list presence with a privacy rule and follower fan-out, plus a one-social-packet-per-tick gate.
// Donor licence: MIT (Lost City, 2023-2025; LICENSE). Written from the described mechanism; no donor lines copied.
// clean-room
export enum ChatPrivate { ON = 0, FRIENDS = 1, OFF = 2 }

interface Presence {
  world: number;
  chat: ChatPrivate;
  friends: string[];
  ignores: Set<string>;
  staff: boolean;
}

class PresenceBook {
  private online = new Map<string, Presence>();

  constructor(private readonly friendCap = 100) {}

  login(name: string, world: number, chat: ChatPrivate, friends: string[], ignores: string[], staff: boolean): void {
    this.online.set(name, { world, chat, friends, ignores: new Set(ignores), staff });
  }

  logout(name: string): void {
    this.online.delete(name);
  }

  setChat(name: string, chat: ChatPrivate): void {
    const p = this.online.get(name);
    if (p) p.chat = chat;
  }

  // Ordered checks, first match wins: staff viewer; ignored by the subject; subject OFF; subject FRIENDS (viewer must be on the subject's list); else visible.
  isVisibleTo(viewer: string, other: string): boolean {
    if (this.online.get(viewer)?.staff) return true;
    const o = this.online.get(other);
    if (o?.ignores.has(viewer)) return false;
    const chat = o?.chat ?? ChatPrivate.OFF;
    if (chat === ChatPrivate.OFF) return false;
    if (chat === ChatPrivate.FRIENDS) return o?.friends.includes(viewer) ?? false;
    return true;
  }

  // The friend list a viewer is sent at login: visible online friends with their world, then every other friend with world 0.
  friendListFor(viewer: string): [number, string][] {
    const friends = this.online.get(viewer)?.friends ?? [];
    const out: [number, string][] = [];
    for (const f of friends) {
      const p = this.online.get(f);
      if (p && this.isVisibleTo(viewer, f)) out.push([p.world, f]);
    }
    for (const f of friends) {
      if (!out.some(x => x[1] === f)) out.push([0, f]);
    }
    return out;
  }

  // When `who` changes (login, logout, chat mode, friend or ignore edit), every online player who lists `who` gets one entry.
  fanOut(who: string): { viewer: string; entry: [number, string] }[] {
    const updates: { viewer: string; entry: [number, string] }[] = [];
    for (const [viewer, p] of this.online) {
      if (!p.friends.includes(who)) continue;
      const subject = this.online.get(who);
      const world = this.isVisibleTo(viewer, who) && subject ? subject.world : 0;
      updates.push({ viewer, entry: [world, who] });
    }
    return updates;
  }

  canAddFriend(name: string): boolean {
    const p = this.online.get(name);
    return !!p && p.friends.length < this.friendCap;
  }
}

// One social packet per player per tick: the first is taken, the rest of the tick are refused, the flag clears at tick end.
class SocialGate {
  private used = new Set<string>();

  tryUse(name: string): boolean {
    if (this.used.has(name)) return false;
    this.used.add(name);
    return true;
  }

  endTick(): void {
    this.used.clear();
  }
}
```

Typecheck: the block above with `export {}` appended (the file ends that way), run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/social-presence.ts` (new, proposed): friends, ignores and private chat mode in the one ledger; the server computes each viewer's view and the follower fan-out. The client only renders what it is sent.
- Parity row: 5 (controls/input, intake) for the one-social-packet-per-tick gate, the closest of rows 1-23. The presence rule itself fits none of rows 1-23 (friend lists, privacy and fan-out are not in the parity checklist), so for that part the answer is "none". The fixed 600 ms tick with drift correction sits under the server tick sub-line (row 18 / post-K item 3), timing only.
Reuse tag: adapt-from-idea (MIT: code may be adapted; this sketch is clean-room shape only)
Brief rule served: one ledger (no second friends process holding the state); server-verified (the ignore check moves to the server send path); MAX_ATTACKERS and zones: not applicable.

## 6. Gaps and risks

- Ignore lists do not stop private messages on the server path read: the sender handler (`MessagePrivateHandler.ts` 14-34), the world send (`World.ts` 1669-1682), the friends server (`FriendServer.ts` 260-290) and the target delivery (`World.ts` 2036) have no ignore or mode check. The client may filter, which was not read. Frankendom must check the block list at send time, on the server.
- Friend traffic is dropped silently when the link is down: every world-side friend call returns with no send when the socket is not live (`FriendServer.ts` 558-560, and the same pattern in the other world-side methods). Nothing is queued. I did not read whether a reconnect replays logins, so stale presence after an outage is possible.
- The one-packet-per-tick gate is shared by all six social actions. A second action in the same tick is refused, and the handler returns false with no reply (what the caller does with that is not read). If Frankendom adopts the gate it needs an explicit "try again" reply.
- Self-add is not checked: `addFriend` (`FriendServerRepository.ts` 210-247) does not compare the target with the player. Not tested.
- Ignore lists are not cleared on logout: the unregister path clears the chat mode and the friend list (`FriendServerRepository.ts` 106-107) and does not touch the ignore cache, so the ignore list stays in memory until replaced.
- Staff edge: for a staff viewer and an offline subject, `sendPlayerWorldUpdate` sends the subject's world as undefined (`FriendServer.ts` 503, with the staff check at repository 336-338 returning before the online check). A donor edge; the sketch does not reproduce it.
- The comment and the code disagree on friend delete: `FriendServer.ts` 222 says the update goes to the ex-friend, but line 223 sends it to the removing player's followers. The removed player is not told by the server.
- Cap accounting: the cap is counted in the database (repository 231-235, 266-270) while the in-memory list is pushed before the insert (237, 239-246). A failed insert leaves memory and database out of step.
- Not read: `FriendServer.ts` 601-662 (world-side ignore and friend wrappers), `World.addIgnore` and the ignore handlers, the bodies of the tick steps between 384 and 444, the public-chat filter, the client UI, and the database schema.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: MessagePrivateHandler.ts 18-26 also refuses muted senders (muted_until) and bans 'invalid_name' targets for 2 days; the note lists only the length and socialProtect checks for the PM path
