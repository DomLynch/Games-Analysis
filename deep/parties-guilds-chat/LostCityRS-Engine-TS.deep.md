# LostCityRS-Engine-TS (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServer.ts | Licence: MIT | TypeScript | symbol FriendServer (input line 62 verified: `export class FriendServer`; repository at src/server/friend/FriendServerRepository.ts)

## 1. Mechanism
- A standalone WebSocket server (FriendServer, 62-498) runs beside the game worlds. Each world process connects over a socket and identifies itself with WORLD_CONNECT (89-105): the profile must match, or the socket is closed (98-101). Only one socket per world is kept; `initializeWorld` terminates the old one (412-419). Every other opcode handler (login, logout, set-mode, friend and ignore changes, private message) that arrives before WORLD_CONNECT sets `world` from the message and calls `initializeWorld` itself with no profile check (e.g. 108-115), so the profile gate can be bypassed by sending any other opcode first.
- Each client message is a JSON packet with an opcode (84-87). Handlers are async and run per message inside one try/catch (85, 400-402, errors are only logged); they are not serialised per socket, so two messages from one world can interleave at their awaits.
- PLAYER_LOGIN (107-142): an invalid private-chat value falls back to ON (120-123). The player is first unregistered from any previous world (126), then `register` (repo 71-92) takes the first free slot in that world (a fixed array of 2000, `initializeWorld` 418; a full world logs and returns false, and the login is dropped with no reply, lines 128-132), records the world, chat mode and (if staffLvl > 1) staff status, and loads the friends list from the DB. The server then sends the player their friends and ignore lists (138-139) and sends each follower an update about the player's world (142). PLAYER_LOGOUT (143-161) unregisters and broadcasts the same way.
- Visibility: `isVisibleTo(viewer, other)` (repo 331-354) returns true for staff viewers (staff = logged in with staffLvl > 1, repo 82). It returns false if the other player ignores the viewer. Otherwise it reads the other player's private-chat mode: OFF hides them; FRIENDS shows them only to their friends; ON shows them. A hidden player is reported as world 0 (offline) (FriendServer 475). A missing chat-mode entry counts as OFF (343).
- FRIENDLIST_ADD (185-204; `addFriend`, repo 204-245): returns silently if already friends, or if either account is missing in the DB. The cap is checked against the DB row count (224-231): 200 for member accounts, 100 for others. It pushes to the in-memory list (235), then inserts the DB row (237). Whatever the outcome, the handler then sends the viewer an update about the target (200) and broadcasts the viewer's world to the viewer's followers (204).
- PRIVATE_MESSAGE (256-285): looks up both accounts (`executeTakeFirstOrThrow`; an unknown name throws and the outer catch at 400 logs it, so the message is dropped), writes a private_chat row, and forwards the message to the target's world socket if the target is online (`sendPrivateMessage` 480-497; nothing is sent if the target has no world). The staff level and message id are copied from the world's message, not looked up. There is no ignore or visibility check on this path (not seen in 256-285 or 480-497).
- PUBLIC_CHAT_LOG (286-297): writes a public_chat row. No fan-out.
- Relay opcodes (298-396: mute, kick, shutdown, broadcast, track, reload, clear-logins, clear-logouts, queue-script) are forwarded to the world socket named by `nodeId` if one is connected; otherwise silently dropped. Unknown opcodes are logged (397-399).
- Output: JSON messages to worlds, DB rows. No server tick; all work is message-driven.

## 2. Key functions
- `FriendServer` class and constructor - /mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServer.ts lines 62-498 (the class closes at 498). Socket server, message dispatch.
- Message handler (`socket.on('message')`) - same file lines 84-403. Opcode dispatch, including PLAYER_LOGIN (107-142), FRIENDLIST_ADD (185-204), PRIVATE_MESSAGE (256-285), PUBLIC_CHAT_LOG (286-297), relay opcodes (298-396).
- `initializeWorld` - same file lines 412-419. Terminates and replaces the world socket; the 2000-slot array is created only if that world has none yet (repo 48-50).
- `broadcastWorldToFollowers` - same file lines 445-451. Sends a world update to each follower.
- `sendPlayerWorldUpdate` - same file lines 462-478. Applies the visibility rule before sending (sends to the viewer's world socket; skipped if the viewer has no world).
- `sendPrivateMessage` - same file lines 480-497. Routes to the target's world socket.
- `FriendServerRepository.register` - /mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts lines 71-92. Slot allocation and friend load.
- `FriendServerRepository.addFriend` - same file lines 204-245. Caps and DB insert.
- `FriendServerRepository.isVisibleTo` - same file lines 331-354. The visibility rule.
- `FriendServerRepository.getFollowers` - same file lines 176-180. Reverse lookup of who has this player as a friend.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Presence fan-out to followers, with a per-viewer visibility filter | World player limit 2000 (theirs, WORLD_PLAYER_LIMIT, FriendServer.ts line 57) |
| Visibility: staff see all; ignore list blocks; OFF hides; FRIENDS shows only friends; ON shows | Private-chat enum: ON 0, FRIENDS 1, OFF 2 (theirs, src/engine/entity/ChatModes.ts lines 8-12) |
| Friend list cap, larger for member accounts | Friend cap 200 for members, 100 otherwise (theirs, repo line 229); ignore cap 100 (repo line 270) |
| Free-slot allocation inside a fixed-size world | Slot count per world: 2000 (theirs, same as the world limit); staff = staffLvl > 1 (theirs, repo line 82) |
| Routing to the one world that holds the target | Node IDs and world sockets (theirs) |

## 4. TypeScript sketch
Sketch type: lift (MIT donor). The visibility rule and the follower fan-out are taken from the donor and trimmed; the donor paths are cited in the sketch.

simplified: no sockets, DB or async (state is plain maps passed in); register/unregister, slot allocation, caps, the ignore-list and friends-list sends, PRIVATE_MESSAGE and the world-0-for-hidden step is a separate function rather than inline in sendPlayerWorldUpdate. `followersOf` scans every user in the map, whereas the donor's follower list holds only registered (online) players because unregister deletes their friend entry (repo 106).

```ts
// Licence: MIT
// Lifted from /mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts (isVisibleTo, getFollowers) and FriendServer.ts (sendPlayerWorldUpdate), trimmed.
// ChatModePrivate in the donor: ON = 0, FRIENDS = 1, OFF = 2.
type ChatMode = 0 | 1 | 2;

type FriendState = {
  staff: Set<string>;
  ignores: Map<string, Set<string>>; // user -> the users that user ignores (donor playerIgnores[X] is X's own ignore list)
  chatMode: Map<string, ChatMode>;
  friends: Map<string, Set<string>>; // user -> users on their friend list
  worldOf: Map<string, number>;
};

export function isVisibleTo(s: FriendState, viewer: string, other: string): boolean {
  if (s.staff.has(viewer)) return true;
  if (s.ignores.get(other)?.has(viewer)) return false;
  const mode: ChatMode = s.chatMode.get(other) ?? 2;
  if (mode === 2) return false; // OFF
  if (mode === 1) return s.friends.get(other)?.has(viewer) ?? false; // FRIENDS
  return true; // ON
}

export function followersOf(s: FriendState, user: string): string[] {
  const out: string[] = [];
  for (const [u, list] of s.friends) if (list.has(user)) out.push(u);
  return out;
}

export function worldUpdateFor(s: FriendState, viewer: string, other: string): number {
  if (!isVisibleTo(s, viewer, other)) return 0; // hidden shows as offline
  return s.worldOf.get(other) ?? 0;
}
```

## 5. Lands in
- Frankendom target: NEW module `origins/presence/social.ts` (does not exist today). The presence service header (`origins/presence/server.ts` line 4, VPS snapshot /root/work-k7, not main) says names, guild/party lookup and speech arrive with their own PRs; the visibility and follower fan-out would sit beside `origins/presence/interest.ts`.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: `docs/specs/origins/one-shard.md` §1 (what syncs: name and guild tag), §5 (layer assignment by party leader or guild-mate) and §6a (chat, mute and block); parties, guilds and chat are a later phase.
- Reuse tag: adapt (the visibility rule and fan-out are reusable; the DB calls and the WebSocket relay model are tied to LostCity's stack)
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- Server-verified: the donor trusts the world process. Username, `staffLvl`, `pmId` and the chat text all come from the world's message (`staffLvl` is taken at login, 128, and stored at repo 82 until logout; PRIVATE_MESSAGE forwards the message's `staffLvl` unchecked, 268, 285). The only gate is the profile string, and it is skipped when any other opcode arrives first (108-115). Frankendom derives identity from the verified session, as the presence service already does with the access token.
- Private chat has no ignore, mute or rate check on its path (256-285, 480-497); the one-shard spec §6a requires server-side filter, mute and block from day one. The donor's ignore list only affects online-status visibility, not message delivery (as far as 256-285 and 480-497 show).
- No rate limit on PRIVATE_MESSAGE or PUBLIC_CHAT_LOG; every message is a DB insert.
- Handlers are not serialised per socket; a logout and a login for the same player can interleave at an await, so slot and world state can briefly disagree.
- Presence is in memory on the friend server (repo 16-41); a restart loses it until worlds reconnect. This matches the presence service's "rebuilt from nothing" design, but the friend and ignore data here is also DB-backed, which Frankendom would have to keep in the one ledger.
- A full world drops the login silently (128-132); Frankendom's layers (one-shard §5) assign a new layer instead.
- Pit is client only; this is server code and must not run in the Pit client. Zones are data: a social module must key off the account, not the zone.
- Conflict with one engine, server-verified kills, MAX_ATTACKERS = 3: none (no combat code in this donor path).
- Not read: `getPlayerWorldSocket`'s callers outside this file, and `db/query.js`. FriendServer.ts 50-498 and FriendServerRepository.ts (1-387) were read; the `FriendClient` class (FriendServer.ts 500-688) and the file's first 49 lines (imports, opcode enums) were not.
