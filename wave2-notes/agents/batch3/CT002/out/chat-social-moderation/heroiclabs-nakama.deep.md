# heroiclabs-nakama (chat-social-moderation, cell 35)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_friend.go` 722-810 (`BlockFriends`, `blockFriend`; with `deleteFriend` 690-716), `server/core_channel.go` 594-679 (`BuildChannelId`, DM gate), `server/core_user.go` 200-212 (`UserExistsAndDoesNotBlock`), `server/pipeline_channel.go` 190-222 (send path) | Licence: Apache-2.0 (`/mnt/frankendom-donors/heroiclabs-nakama/LICENSE` line 3: "Version 2.0, January 2004"; file header `server/login_attempt_cache.go` line 3: "Licensed under the Apache License, Version 2.0") | Go | symbol `blockFriend`

Checked: Read in full: `core_friend.go` 684-810 (deleteFriend, BlockFriends, blockFriend), `core_channel.go` 594-679 (BuildChannelId), `core_user.go` 200-212, `pipeline_channel.go` 190-222, `core_channel.go` 296-343 (ChannelMessageSend), `server/login_attempt_cache.go` 1-175 (whole file). Read in part: `core_friend.go` 596-606 (friend-add guard) and grep hits at 485-503, `console_authenticate.go` 90-170 and 420-445. Not read: `ChannelMessagesList` (`core_channel.go` 63-), the rest of the friend-add path, the notification send, the Go/Lua/JS runtime wrappers (grep only). The lockout callers were found by grep; the game login path has no reference to the cache (grep of `api_authenticate.go`, empty). Nothing was run: the one-way gate claim in section 6 comes from reading the arguments of a SQL-backed call. The sketch typechecks (`tsc --noEmit --strict --target es2020` on the VPS, exit 0). Not a camera cell. Confidence: high on the block write path and the DM gate; medium on what the history read allows (not read).

Best transferable idea: Model a block as a one-way edge stored on the blocker's side, make every DM and friend gate read it, untrack an open DM the moment a block lands, and answer unknown and blocked targets with the same error.
Decision (proposed): adapt - Frankendom's friends list and blocking (Strategy addition) needs this shape; adapt it by making the DM gate check both directions and by extending the gate to party, guild and zone chat, which the donor does not gate.
Acceptance: A server test: after A blocks B, B's DM join with A and B's friend add of A both fail with the same text as an unknown id, A and B are untracked from their open DM in the same request, and A's own DM join with B is also refused.

## 1. Mechanism

- Storage: a `user_edge` row per ordered pair (source, destination) with a `state`. State 3 is the block value in every SQL that checks it (`core_friend.go` 487, 601, 745; `core_user.go` 206). The other state values were not read.
- Block, `BlockFriends` (722-742): the unique ids are de-duplicated, then `blockFriend` runs for each inside one transaction (`ExecuteInTx`, 728).
- Block, `blockFriend` (743-810), in this order:
  (a) UPDATE the blocker's edge to the target to state 3 (745-746). Any earlier state (friend, invite) is overwritten.
  (b) If no row changed, INSERT a state-3 edge, but only when the target user exists (756-763). If still no row, return nil silently (769-771), and do not change the counter. Otherwise increment the blocker's `edge_count` (775).
  (c) Delete the target-to-blocker edge unless that edge is itself a block (782). If one row was removed, decrement the target's `edge_count` (788-789). The blocker's own edge is kept.
  (d) Build the DM stream key from the two ids, smaller id first (795-805).
  (e) `tracker.UntrackByStream(stream)` (807): both users lose the presence on that DM stream, so an open DM is closed at the moment of the block.
- DM gate, `BuildChannelId` DM case (619-653): the id must parse and not be nil. Then `UserExistsAndDoesNotBlock(target, sender)` (632). The query (`core_user.go` 204-206) is true only when the target row exists and there is no edge from the target to the sender with state 3. On false, return "User ID not found" (637), which is the same text as an unknown user. On pass, the key is again smaller id first (640-645) and the mode is DM (647).
- The gate runs once, at join: `pipeline_channel.go` 52 is the only caller of `BuildChannelId` in the channel pipeline. Runtime wrappers (Go, Lua, JS) also call it (grep).
- Friend add: an insert of the user-to-target edge is conditional on no state-3 edge from the target to the user (596-606). A user who was blocked cannot add the blocker; the code path is `ON CONFLICT ... DO NOTHING`, so the add fails silently (log at 634).
- Remove friend, `deleteFriend` (690-716): one SQL DELETE removes the edge in both directions except a block coming from the other side (691). The row count picks the counter update: 1 row (703, commented "Unblocking a blocked user") or 2 rows (a friend pair). The counter is correct for either, but the comment only describes one of the two cases.
- Send, `pipeline_channel.go` 190-222: the channel id is parsed by `ChannelIdToStream` (509-576), which splits "mode.subject.subcontext.label" into at most four parts. The content must be a JSON object: first byte '{' (202). The sender must be tracked on that stream, else "Must join channel before sending messages" (210-214). Then `ChannelMessageSend` (296-343) inserts the row if persistent and routes it to the stream.
- Delete a message: SQL `DELETE ... WHERE id = $1 AND sender_id = $2` (`core_channel.go` 436). Only the sender can remove a message in this file.

## 2. Key functions

- `blockFriend`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_friend.go` 743-810 (edge write, counters, DM key, untrack).
- `BlockFriends`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_friend.go` 722-742 (de-duplicate, one transaction).
- `BuildChannelId`, DM case: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_channel.go` 619-653 (inside 594-679).
- `UserExistsAndDoesNotBlock`: `/mnt/frankendom-donors/heroiclabs-nakama/server/core_user.go` 200-212.
- `channelMessageSend`: `/mnt/frankendom-donors/heroiclabs-nakama/server/pipeline_channel.go` 190-222.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One directed block edge per ordered pair | state 3 (theirs; `core_friend.go` 745, `core_user.go` 206) |
| Same-error gate for unknown and blocked targets | "User ID not found" (theirs; `core_channel.go` 637) |
| Canonical pair key for a DM, smaller id first | rule as written (`core_channel.go` 640-645; `core_friend.go` 798-805) |
| Room name length and control characters | 1 to 64 characters; no control characters (`core_channel.go` 608; `pipeline_channel.go` 47) |
| Chat content shape | JSON object, first byte '{' (`api.go` 62; `pipeline_channel.go` 202) |
| Socket message size cap (only size control on chat) | 4096 bytes default (`config.go` 903, theirs) |
| Console-only login lockout, for context | 5 failed attempts (`login_attempt_cache.go` 33) lock the account for 1 minute (34, 155); game login does not use it |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's block semantics (one directed edge per ordered pair, the target-to-blocker edge removed unless it is a block, the DM stream untracked on block, the same error for unknown and blocked targets, the smaller id first in the DM key). It differs in two places: the DM join check looks at both directions (the donor checks only whether the target blocked the sender), and the block is a plain function call with no transaction, no edge counters, no notification and no database. It omits the group and room channels (the donor does not gate them either) and the remove-friend path.

```ts
// Licence: Apache-2.0 (donor). Shape re-expressed from the described mechanism; not a translation of the Go source.
type EdgeState = "friend" | "invite" | "blocked";

interface PresenceHub {
  untrackStream(stream: string): void; // donor: tracker.UntrackByStream(stream)
}

class SocialGraph {
  // One state per ordered pair: "src>dst". A block is stored on the blocker's side only.
  private edges = new Map<string, EdgeState>();

  constructor(private users: Set<string>, private presence: PresenceHub) {}

  private key(src: string, dst: string): string {
    return `${src}>${dst}`;
  }

  state(src: string, dst: string): EdgeState | undefined {
    return this.edges.get(this.key(src, dst));
  }

  // Canonical DM stream: the smaller id is always the first part, so both sides compute the same key.
  dmStream(a: string, b: string): string {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    return `dm.${lo}.${hi}`;
  }

  // Block: replace my edge to them with "blocked"; drop their invite/friend edge toward me unless it is a block;
  // then remove both users from the open DM stream.
  block(me: string, other: string): void {
    if (!this.users.has(other)) return; // donor: silent no-op when the target does not exist
    this.edges.set(this.key(me, other), "blocked");
    if (this.state(other, me) !== "blocked") this.edges.delete(this.key(other, me));
    this.presence.untrackStream(this.dmStream(me, other));
  }

  // Donor gate checks only whether the target blocked the sender.
  // Fix: refuse when either side has blocked the other. Unknown and blocked get the same error (no enumeration).
  canJoinDm(sender: string, target: string): { ok: true } | { ok: false; error: string } {
    if (!this.users.has(target)) return { ok: false, error: "User ID not found" };
    if (this.state(target, sender) === "blocked" || this.state(sender, target) === "blocked") {
      return { ok: false, error: "User ID not found" };
    }
    return { ok: true };
  }

  // A user who was blocked by the target cannot add the target as a friend.
  canAddFriend(sender: string, target: string): boolean {
    return this.state(target, sender) !== "blocked";
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/social-blocks.ts` (new): the block write, the DM and friend gates and the presence kick, on the server only (the client never decides a block). No row in the checklist covers server-side social gates. Parity-checklist row 14 (HUD: friends list and chat panel) is the closest row, and it covers the display, not the gate. The gate itself belongs with the server presence code in `origins/server`, not in the client.
- today: Frankendom's friends or block code was not checked for this note.
- Reuse tag: adapt (Apache-2.0, code may be adapted; the sketch is re-expressed from the mechanism)
- Brief rule served: one engine and server-verified (the gate runs on the server, and the blocked user gets nothing that reveals a block; the same error as an unknown id).

## 6. Gaps and risks

- One-way DM gate (derived from reading the arguments, not run): `UserExistsAndDoesNotBlock(target, sender)` at `core_channel.go` 632 checks only whether the target blocked the sender. The blocked user cannot join the DM; the blocker can still join a DM with the blocked user, and the blocker's join is not refused. The sketch fixes this.
- Blocks do not hide shared spaces: the room branch (607) and the group branch (656, membership at state 2) have no block check (grep for block in `core_channel.go` finds only 631-632). Blocked users still see messages in shared rooms and groups unless the history listing filters them (`ChannelMessagesList`, not read).
- History: a blocked user may or may not be able to read the persisted DM history, since `ChannelMessagesList` (63-) was not read in full.
- Message removal is sender-only (436). No staff or moderator delete exists in this file; moderation needs a separate path, which the Frankendom report and moderation cells must add.
- Chat limits: the only size control on chat content is the 4096-byte socket cap (903). No per-user message rate limit was found (grep for rate limit, ratelimit, rate_limit in `server/` found nothing), and no profanity filter or mute list was found (grep for profan, censor, ReportAbuse found nothing).
- Lockout reuse: the lockout is console-only in this tree. The IP lockout is commented out (160-173), so only the account counter works, and a griefer can lock the console admin account for one minute with five bad tries. If Frankendom reuses the idea for accounts, do not lock by username alone; add an IP or device signal, and the lock does not extend while it holds, because the check at `console_authenticate.go` 96 returns before `Add` (145) is reached.
- Friend removal comment: the one-row case (703) is described as an unblock; the counter is correct either way, but do not copy the comment.
- Frankendom rulings: the block list is account data, not zone data; the presence untrack must also cover the zone presence and any party or duel channel, not only the DM stream.

Reuse tag: adapt (Apache-2.0)
Brief rule served: one engine, server-verified; the gate and the untrack run on the server (row 14 for the display)
