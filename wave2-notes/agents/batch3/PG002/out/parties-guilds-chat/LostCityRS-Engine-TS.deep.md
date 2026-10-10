# LostCityRS-Engine-TS (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts` (with `FriendServer.ts`) | Licence: MIT (`/mnt/frankendom-donors/LostCityRS-Engine-TS/LICENSE`: "MIT License", Copyright (c) 2023-2026 Lost City) | TypeScript (Node, WebSocket) | symbol `FriendServerRepository.isVisibleTo` (with `FriendServer` login, logout, friend and ignore handlers, `sendPlayerWorldUpdate`, `broadcastWorldToFollowers`)

Checked: The list's hint file (`src/server/friend/FriendServer.ts`) is the real start of the mechanism (a separate friend server). Read: `FriendServer.ts` 1-135, 135-286, 410-560, 640-688; `FriendServerRepository.ts` 11-387 (all); `FriendThread.ts` 1-107 (all); `engine/entity/ChatModes.ts` 1-17; `engine/entity/Player.ts` 392, 455-486; `engine/World.ts` 120, 340-380 and 405-420 (cycle; 381-404 not read), 1139-1151, 1647-1659, 1985-2030; `network/game/client/handler/MessagePrivateHandler.ts` (all); `IgnoreListAddHandler.ts` line 9 (grep). Confidence high for presence, friend and ignore lists, the caps, the PM path and the per-tick flag. Medium for the absence claim (no server-side ignore check on PM delivery): I searched the donor's `src` for ignore and mode checks and found none on this path; client-side enforcement is not in this repo and was not read. Not read: `FriendServer.ts` 286-409 (public chat log and staff relay ops) and 560-639 (client wrappers for friend and ignore ops); `FriendListAddHandler.ts` (corrected after the checker: lines 9 and 14 read and set `socialProtect`, as do `FriendListDelHandler.ts` 9 and 14; verified on the VPS). camera_scope: n/a (not a camera cell).

## 1. Mechanism

A separate friend server holds the social state for every logged-in account across all worlds. Each world connects to it over a socket (WORLD_CONNECT, with a profile check). For each logged-in account the server keeps: the world id, the private chat mode, a staff flag, and in-memory caches of the friend and ignore lists. Presence is derived from those, per viewer, on every change.

- Slots. Each world has 2000 player slots (FriendServer.ts 57, 418). Login picks the first empty slot (FriendServerRepository.ts 75-76). If the world is full, the register call returns false and the login is silently dropped (FriendServer.ts 128-131, with a TODO that says "handle this better").
- Login (FriendServer.ts 107-142). Unregister from any previous world (126), then register (128). The private chat value is checked (120-122): anything other than 0, 1 or 2 becomes ON. Then the friend list (138) and ignore list (139) are sent to the player, and the new state is fanned out to followers (142).
- Presence rule (FriendServerRepository.ts 331-354, `isVisibleTo(viewer, other)`), in this order: a staff viewer sees everyone (335-337); if `other` has the viewer on its ignore list, hidden (339-341); if `other` has no chat record or is OFF, hidden (343-347, the default for a missing record is OFF); if FRIENDS, visible only when `other`'s friend list contains the viewer (349-350); otherwise (ON) visible.
- Presence value. The world id shown to a viewer is `isVisibleTo(viewer, other) ? world : 0` (FriendServer.ts 475). A zero means offline, and hidden looks the same as offline. The friend list uses the same rule: online and visible friends get their world id; every other friend, including hidden and offline ones, is listed with 0 (FriendServerRepository.ts 130-162, the `remainingFriends` loop at 156-158).
- Fan-out. Login (142), logout (161), chat-mode change (183-184), friend add (198-204), friend remove (218-221), ignore add (235-238) and ignore remove (252-255) each end with `broadcastWorldToFollowers`. That scans every loaded friend list for followers (`getFollowers`, FriendServerRepository.ts 176-180, which uses `Object.entries(this.playerFriends)`) and sends each follower one update about the changed account (FriendServer.ts 445-451, 462-478).
- Logout (FriendServer.ts 143-161). Unregister first (it clears the chat mode and the friend cache, FriendServerRepository.ts 105-106), then fan out. Followers now get 0 because the chat mode is missing, which reads as OFF.
- Caps. A friend add is refused when the account already has the friend (210-212) or when the DB row count is at the limit: 200 for member accounts, 100 otherwise (229, 231). An ignore add is refused at 100 (270). The cache push happens after the count check (235), and the count comes from the DB, so two overlapping adds can both pass (my reading, not tested).
- Private message (world side). `MessagePrivateHandler` refuses if the sender's `socialProtect` flag is set, if the text is over 100 characters, or if the sender is muted (H 13, 17-20, and `invalid_name` at 22-25). It sets the flag (33) and hands the message to the world (30). The world posts it to the friend thread (`engine/World.ts` 1647-1659), which calls the friend server. The friend server writes a `private_chat` row first (273-283), then calls `sendPrivateMessage` (285), which sends to the target's world socket if the target is on any world (480-497). The target's world delivers if the target is on it (World.ts 2016-2024), otherwise it prints an error.
- Nothing on that path checks the ignore list or the target's chat mode. Those two only feed presence. So an ignored player's private message is stored and delivered by the server (in what I read); any refusal would be on the receiving client, which is not in this repo.
- Per-tick social gate. `socialProtect` is set by the private message, public chat, friend add, friend remove, ignore add and ignore remove handlers (MessagePublicHandler, FriendListAddHandler and FriendListDelHandler 9-14, IgnoreListAddHandler 9-14, IgnoreListDelHandler 9-14). It is cleared in `resetEntity` (Player.ts 470-482), which `processCleanup` calls for every player (World.ts 1148-1149). `processCleanup` runs once per `cycle()` (World.ts 415), after input intake (`processClientsIn`, 355). So each player gets one of those social actions per tick. Friend add and remove read and set the flag too (FriendListAddHandler.ts and FriendListDelHandler.ts, lines 9 and 14), so all six social handlers share the one gate.
- Tick: fixed 600 ms (World.ts 120, "DO NOT CHANGE"). Each cycle is one step: world, then client input, then NPC and player processing, then output, then cleanup (340-420). The friend server is event-driven: it reacts to messages. A grep for setInterval, setTimeout and setImmediate in `src/server/friend/` found none, so it runs no tick of its own.

## 2. Key functions

- `FriendServerRepository.isVisibleTo`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts` 331-354. The visibility order.
- `FriendServerRepository.getFriends`: same file 130-162. The per-viewer friend list with world 0 for hidden and offline.
- `FriendServerRepository.getFollowers`: same file 176-180. Scan of loaded friend lists.
- `FriendServerRepository.addFriend`: same file 204-245. Cap check and cache push.
- `FriendServer` login, logout and friend handlers: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServer.ts` 107-286.
- `broadcastWorldToFollowers` and `sendPlayerWorldUpdate`: same file 445-478.
- `sendPrivateMessage`: same file 480-497.
- `MessagePrivateHandler.handle`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/game/client/handler/MessagePrivateHandler.ts` 10-35.
- `processCleanup` and `resetEntity`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 1139-1151 and `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 470-484.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Visibility of another player: staff sees all; an ignored viewer is hidden; a missing record is hidden; FRIENDS shows to the other's list; ON shows all | Chat values ON=0, FRIENDS=1, OFF=2 (theirs, ChatModes.ts 8-11); missing record is OFF (repository 343) |
| Hidden and offline look the same (zero) | Sentinel 0 (theirs, FriendServer.ts 475) |
| Push a changed state to everyone who has you as a friend, not to everyone online | Follower scan (repository 176-180) |
| Cap a friend list by account tier | 200 member, 100 other (theirs, repository 229) |
| Cap an ignore list | 100 (theirs, repository 270) |
| One social action per player per tick | Flag set on the action, cleared in cleanup (theirs, Player.ts 482; World.ts 415, 1149) |
| Cap a chat line | 100 characters (theirs, MessagePrivateHandler.ts 13) |
| Fixed-size world slot array | 2000 slots (theirs, FriendServer.ts 57) |
| Tick length | 600 ms (theirs, World.ts 120) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's visibility order (staff, ignore, missing record as OFF, FRIENDS by the other's list, ON), the zero-means-hidden value, the follower lookup, the two caps and the one-action-per-tick flag. It omits: the database loads and writes (friend and ignore rows, the `private_chat` row), the world socket sends and the update messages, the staff set maintenance at register and unregister, the 2000-slot array and the register refusal, the handler checks on length, mute and `invalid_name`, and the ignore cache that the donor does not clear at logout. The sketch's `addFriend` takes the current count as a parameter (the donor reads it from the DB before the push), so it does not show the donor's race. Nothing is added.

```ts
// Licence: MIT (donor, LICENSE: "MIT License", Copyright (c) 2023-2026 Lost City). Shape adapted; written from the described mechanism, not a translation of the TypeScript lines.
const FRIEND_CAP = 100;          // non-member accounts
const FRIEND_CAP_MEMBER = 200;   // member accounts
const IGNORE_CAP = 100;
const TICK_MS = 600;

type ChatMode = 'on' | 'friends' | 'off';

interface Online { world: number; mode: ChatMode; staff: boolean; }

class Presence {
  private online = new Map<string, Online>();     // only logged-in accounts
  private friends = new Map<string, string[]>();  // loaded at login, removed at logout
  private ignores = new Map<string, string[]>();
  private actedThisTick = new Set<string>();      // the donor's socialProtect flag

  login(name: string, world: number, mode: ChatMode, staff: boolean, friendList: string[]): void {
    this.online.set(name, { world, mode, staff });
    this.friends.set(name, friendList.slice());
  }

  logout(name: string): void {
    this.online.delete(name);
    this.friends.delete(name);
  }

  // Donor: isVisibleTo. Order: staff viewer sees all; an ignored viewer is hidden; a missing record is OFF; FRIENDS shows only to viewers on the other's list; ON shows all.
  visibleTo(viewer: string, other: string): boolean {
    if (this.online.get(viewer)?.staff === true) return true;
    if (this.ignores.get(other)?.includes(viewer)) return false;
    const mode: ChatMode = this.online.get(other)?.mode ?? 'off';
    if (mode === 'off') return false;
    if (mode === 'friends') return this.friends.get(other)?.includes(viewer) ?? false;
    return true;
  }

  // The world id the viewer is shown for `other`: 0 means offline (also used for hidden).
  worldSeenBy(viewer: string, other: string): number {
    const rec = this.online.get(other);
    if (rec === undefined || !this.visibleTo(viewer, other)) return 0;
    return rec.world;
  }

  // Donor: getFollowers. Online accounts that have `name` in their friend list.
  followersOf(name: string): string[] {
    const out: string[] = [];
    for (const [who, list] of this.friends) {
      if (list.includes(name)) out.push(who);
    }
    return out;
  }

  // Donor: addFriend cap check (count read before the push). Returns false when refused.
  addFriend(name: string, target: string, isMember: boolean, currentCount: number): boolean {
    const list = this.friends.get(name) ?? [];
    if (list.includes(target)) return false;
    const limit = isMember ? FRIEND_CAP_MEMBER : FRIEND_CAP;
    if (currentCount >= limit) return false;
    list.push(target);
    this.friends.set(name, list);
    return true;
  }

  addIgnore(name: string, target: string, currentCount: number): boolean {
    const list = this.ignores.get(name) ?? [];
    if (list.includes(target) || currentCount >= IGNORE_CAP) return false;
    list.push(target);
    this.ignores.set(name, list);
    return true;
  }

  // Donor: socialProtect. One social action per player per tick; the flag clears at the end of each tick.
  tryAct(name: string): boolean {
    if (this.actedThisTick.has(name)) return false;
    this.actedThisTick.add(name);
    return true;
  }

  endTick(): void {
    this.actedThisTick.clear();
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/social.ts` (new; server-held presence, friend and ignore state, and the one-action-per-tick gate, all in one ledger). The client renders what the server sends and does not decide visibility.
- Parity-checklist row: 5 (controls and input). The per-tick social-action gate sits at server input intake (the "server tick: fixed step, input intake, per-tick NPC budget" sub-line of post-K item 3). Presence and friend lists fit no row in 1-23.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted; the sketch is a rewrite of the shape)
- Brief rule served: server-verified state and one ledger (visibility and caps are computed on the server, once).

## 6. Gaps and risks

- No server-side ignore on private messages. The donor stores and delivers a message from an ignored player (in the code read). Frankendom must check the ignore list on the server before delivery; a test asserts the message is not delivered.
- Store before deliver. The donor writes the `private_chat` row before knowing the target is online, and the sender gets no answer when the target is offline (FriendServer 273-285, 480-485). Frankendom should decide what an undeliverable message means and test that it is not recorded as delivered.
- Login dropped on a full world (FriendServer 128-131). Frankendom must refuse the login with a reason, not drop it silently.
- Cap race. The cap is read from the DB and the cache is pushed after the await (repository 229-235). Two overlapping adds can both pass. Frankendom should check and write in one ledger step.
- Follower fan-out cost. Every change scans every loaded friend list (176-180). With one runtime and many zones, keep an inverse index (who has me as a friend) instead of a scan.
- The per-tick gate covers friend add and remove as well (FriendListAddHandler.ts and FriendListDelHandler.ts 9 and 14, verified), so friend ops cannot run more than once per tick; the earlier claim to the contrary was wrong. All six social handlers share the gate.
- Stale ignore cache: unregister clears chat mode and friends (105-106) but not the ignore cache (the next login reloads it). Harmless here; Frankendom's one ledger must not keep a second copy at all.
- Zero is used for both offline and hidden. That is the privacy point (a hidden player looks offline), and it should be kept deliberately, not mistaken for a bug.
- The friend server is a separate process linked by sockets, with state split across the friend server and each world. Frankendom runs zones as data on one runtime; the cross-process split does not port, the visibility rule does.
- Not read: `FriendServer.ts` 286-409 (public chat log, staff relay operations) and 560-639 (client wrappers), (`FriendListAddHandler.ts` was read after the checker pass: it checks and sets `socialProtect` and refuses the `invalid_name` target).
- Friend add and delete handlers (`FriendListAddHandler.ts`, `FriendListDelHandler.ts` 9) also refuse an `invalid_name` target, like the ignore handlers.

Best transferable idea: Compute each viewer's presence on the server from the other player's chat mode, ignore list and friend list (hidden when unknown), show hidden and offline the same, push changes only to followers, and allow one social action per player per tick.
Decision (proposed): adapt - the visibility order, zero-as-hidden and follower push fit server-verified social state; the private message path with no server ignore check, and the silent login drop on a full world, do not fit, so enforce ignore before delivery and refuse full logins with a reason.
Acceptance: a player on another's ignore list sees that player as offline, and a whisper to them is refused by the server, not only hidden; a FRIENDS-mode player is seen only by viewers on their list; a 101st non-member friend is refused with a reason; a second social action in one tick (including friend add and remove, which share the gate) is refused and accepted on the next tick; a login into a full world is refused with a message, not dropped.

Reuse tag: rewrite-from-idea (MIT; code may be adapted; the sketch is a rewrite)
Brief rule served: server-verified state and one ledger.

## Checker findings

- Verdict: MINOR
- Corrected: friend add and remove do read socialProtect (FriendListAddHandler.ts and FriendListDelHandler.ts 9 and 14): fixed the Checked line, the per-tick gate bullet, the gap bullet, the not-read line and the acceptance wording
- Missed (also added to section 6): mute check and invalid_name ban in MessagePrivateHandler 17-25 (already cited in passing); friend add/del handlers share socialProtect (the corrected fact)
