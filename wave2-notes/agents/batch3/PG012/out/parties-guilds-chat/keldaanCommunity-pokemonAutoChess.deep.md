# keldaanCommunity-pokemonAutoChess (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/lobby-commands.ts` | Licence: GPL-3.0 (project `LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 3") | TypeScript (Colyseus + Mongoose) | symbols `OnNewMessageCommand`, `RemoveMessageCommand`, `BanUserCommand`, `LobbyState.addMessage` / `removeMessage` / `removeMessages`

Checked: Read in full `LobbyState` (`rooms/states/lobby-state.ts`, all 82 lines), `chat-v2.ts` (model, all), `colyseus-models/message.ts` (all), lobby `OnNewMessageCommand` (259-280), `RemoveMessageCommand` (282-300), `BanUserCommand` (388-440), `UnbanUserCommand` (441-485), preparation-room `OnNewMessageCommand` (435-457) and `RemoveMessageCommand` (459-478, read to the role check), the `Role` enum (`types/index.ts` 56-62), `custom-lobby-room.ts` (grep plus 425, 461, 522 region), and the preparation-room handler (300-310). Callers: read the lobby and preparation handlers; read `addAnnouncement` (lobby-state 56-58) as the one other caller of `addMessage`; `preparation-state.addMessage` was located (line 71) but not read. Not read: `cleanProfanity`, `UserMetadata`, the Discord announcements, the client chat UI, and `fetchChat` (commented out, see below). Two chat channels read: the lobby (global, staff-only posting) and the preparation room (in-game, any non-anonymous user). Confidence: high on the lobby and ban order of operations; moderate on the preparation channel (its state class was not read). camera_scope not applicable. Depth: full for the chat and ban rules; the party and guild parts of the topic are NOT in this donor (no friend list, no clubs or guilds, no party code found; see Section 6).

## 1. Mechanism

- Chat is a per-room list of `Message` records (`LobbyState.messages`, `@type([Message])`). Two rooms post to it: the lobby (`custom-lobby-room.ts` handler at 210 forwards `Transfer.NEW_MESSAGE` to `OnNewMessageCommand`) and the preparation room (`preparation-room.ts` 303-304).
- Lobby post (`OnNewMessageCommand`, lobby-commands.ts 259-280): the text is cut to 250 characters (265-266), run through the profanity filter (266), then posted only if the sender's server-side role is ADMIN or MODERATOR and the text is not empty (271-274). So in the donor's lobby, ordinary users cannot post; the rule is enforced on the server.
- Preparation-room post (`OnNewMessageCommand`, preparation-commands.ts 435-457): the same 250-character cut and profanity filter (441), then posted when the sender is known, not anonymous and the text is not empty (445). Ordinary non-anonymous users can post here.
- Lobby post order (`LobbyState.addMessage`, lobby-state 14-35): push to memory (23) first, then `chatV2.create` (25) as a fire-and-forget write with no await. A failed write leaves the message in memory only.
- Delete (`RemoveMessageCommand`, 282-300): only ADMIN or MODERATOR (292). In `LobbyState.removeMessage` (36-44) the store delete runs first (37) and the in-memory splice happens only after the store reports back (41). The preparation room has the same role check (459-478).
- Ban (`BanUserCommand`, 388-440): the actor must be ADMIN or MODERATOR (407) and the target must not be ADMIN (408). Order: set `banned: true` in the user store (410), purge the user's lobby messages in memory and in the store (`removeMessages`, 411; the store delete by author is lobby-state 53), send a notice, then disconnect every session of that user with `CloseCodes.USER_BANNED` (429). The disconnect runs even when the store reports no change; only the notice differs.
- Join gate: a banned user is refused on join (`custom-lobby-room.ts` 461-462).
- Retention: stored chat documents expire after 7 days (`chat-v2.ts` 28, Mongo TTL). Chat history is NOT reloaded on room start: the call `this.fetchChat()` is commented out (custom-lobby-room.ts 425).
- Server announcements use the same path: `addAnnouncement` posts as author `server` (lobby-state 56-58).

## 2. Key functions

- `OnNewMessageCommand` (lobby): `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/lobby-commands.ts` 259-280. Length cap, filter, staff-only post.
- `RemoveMessageCommand` (lobby): same file 282-300. Staff-only delete.
- `BanUserCommand`: same file 388-440. Admin protection, flag, purge, disconnect.
- `OnNewMessageCommand` (preparation): `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/preparation-commands.ts` 435-457. Non-anonymous post.
- `LobbyState.addMessage` / `removeMessage` / `removeMessages`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/states/lobby-state.ts` 14-54. Memory and store ordering.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cut the text to a fixed length before any other step | 250 characters, both channels (lobby-commands.ts 265; preparation-commands.ts 441) |
| Post only if the sender's role is in the allowed set, per channel | Lobby: ADMIN, MODERATOR (271). Preparation room: non-anonymous (445). |
| Staff can delete; staff can ban anyone except an ADMIN | Role set ADMIN, MODERATOR (delete 292; ban actor 407); ADMIN protection (408) |
| Ban = flag + purge + disconnect, in that order | No timing constants |
| Stored messages expire | 7 days, expressed in seconds (chat-v2.ts 28) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for each action (post: cut, filter, role check, memory push, store write; remove: role check, store delete, memory splice; ban: role check, admin protection, flag, purge memory and store, disconnect). It turns the two channels' posting rules into data (`LOBBY`, `PREP`) and the retention into a constant. It OMITS: the Mongo and Colyseus types, the profanity filter body, the Discord announcement, the notice messages, the "already banned" branch, the title and role model, and the `fetchChat` reload (commented out in the donor). It differs on purpose in one place: the donor's `ban` also purges even when the flag was already set; the sketch does the same, but the donor's "no change" branch is not modelled.

```ts
// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch from the described mechanism, not a translation of the donor.
type Role = "ADMIN" | "MODERATOR" | "BASIC" | "BOT" | "BOT_MANAGER";
interface Author { uid: string; name: string; role: Role; anonymous: boolean; banned: boolean; }
interface ChatMsg { id: string; authorId: string; author: string; payload: string; time: number; }
interface ChannelRules { maxLen: number; canPost: (u: Author) => boolean; }
interface ChatStore {
  save(m: ChatMsg): Promise<void>;
  deleteById(id: string): Promise<void>;
  deleteByAuthor(uid: string): Promise<void>;
}

const RETENTION_S = 7 * 24 * 60 * 60; // data field: store expiry in seconds
const LOBBY: ChannelRules = { maxLen: 250, canPost: (u) => u.role === "ADMIN" || u.role === "MODERATOR" };
const PREP: ChannelRules = { maxLen: 250, canPost: (u) => !u.anonymous };

const isStaff = (u: Author): boolean => u.role === "ADMIN" || u.role === "MODERATOR";

class Channel {
  readonly messages: ChatMsg[] = [];
  private nextId = 0;

  constructor(
    private readonly rules: ChannelRules,
    private readonly profanity: (s: string) => string,
    private readonly store: ChatStore
  ) {}

  // donor order: truncate, filter, role check, memory push, then fire-and-forget store write
  post(u: Author, raw: string, now: number): ChatMsg | null {
    const text = this.profanity(raw.slice(0, this.rules.maxLen));
    if (text === "" || !this.rules.canPost(u)) return null;
    const m: ChatMsg = { id: String(++this.nextId), authorId: u.uid, author: u.name, payload: text, time: now };
    this.messages.push(m);
    void this.store.save(m); // a failed save leaves the message in memory (donor behaviour)
    return m;
  }

  // donor order: role check, store delete, then memory splice
  async remove(actor: Author, id: string): Promise<void> {
    if (!isStaff(actor)) return;
    await this.store.deleteById(id);
    const i = this.messages.findIndex((m) => m.id === id);
    if (i >= 0) this.messages.splice(i, 1);
  }

  // donor order: memory first (synchronous), then store delete by author
  async purgeAuthor(uid: string): Promise<void> {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].authorId === uid) this.messages.splice(i, 1);
    }
    await this.store.deleteByAuthor(uid);
  }
}

// donor order: role check, admin protection, banned flag, purge messages, then disconnect
async function ban(
  actor: Author,
  target: Author,
  channel: Channel,
  setBanned: (uid: string) => Promise<void>,
  disconnect: (uid: string) => void
): Promise<boolean> {
  if (!isStaff(actor) || target.role === "ADMIN") return false;
  await setBanned(target.uid);
  target.banned = true;
  await channel.purgeAuthor(target.uid);
  disconnect(target.uid);
  return true;
}

export { LOBBY, PREP, RETENTION_S, Channel, ban };
```

Typecheck: the block above passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/pac-chat-channels.ts`, exit 0).

## 5. Lands in

- Parity row: NONE. No row of the 1-23 checklist covers chat, friends or guild permissions. Closest is row 14 (HUD) for the chat panel surface only; the rules here are not HUD.
- TARGET `origins/social/chat-channels.ts` (new): channel rules as data, the server-side role check on each action, and the ban order. Not `src/fight/`.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine: the role check and the ban run on the server, not in the client); one ledger (one message list per channel, one store write path)

Best transferable idea: a per-channel posting rule (who may post, a 250-character cut and a filter) kept as data, with the role check done on the server for every action, and a ban that purges the user's messages and then closes their sessions.
Decision (proposed): adapt - take the per-channel rule table and the server-side role checks; do NOT copy the fire-and-forget store write (a failed write keeps the message in memory and is never retried) and do not copy the lobby's staff-only posting unless Frankendom wants a broadcast-only channel.
Acceptance: a server test sends 300 characters and receives 250; a non-staff post to the broadcast channel is refused; a moderator's ban of another moderator succeeds and an ADMIN target is refused; after a ban the target's sessions close and their messages are gone from the channel.

## 6. Gaps and risks

- No party, friend list, guild or club system was found in the donor. A `grep -rn -i "friend\|clubs\?\b\|guild"` over models, rooms, core, services, types and utils returns only: title names GUILDMASTER and GUILD_HERO (`types/enum/Title.ts` 96-97), a title award in `models/expeditions.ts` (53), a cron title award (`services/cronjobs.ts` 270-271), an item name FRIEND_BOW (`rooms/commands/game-commands.ts` 915) and dungeon names. Do not cite this donor for guilds or friends. The word `party` was not searched on its own in this pass.
- Ordering is inconsistent: adding a message updates memory before the store (lobby-state 23 then 25), but removing it updates the store before memory (37 then 41). The write is fire-and-forget, so a crash after the memory push loses the message on restart, and no test covers it. Frankendom has one ledger and must pick one order and test it.
- The 7-day expiry (chat-v2.ts 28) is a Mongo TTL, not a rule of the game. Frankendom should make retention a data field, not a store default.
- History reload is commented out (custom-lobby-room.ts 425): the lobby does not show past messages after a restart. Do not treat that path as working.
- Moderator-on-moderator bans are allowed (408 only protects ADMIN). That is a rank rule Frankendom must decide on purpose; it is not a checked guild-rank model.
- Licence GPL-3.0: clean-room, shape only.
