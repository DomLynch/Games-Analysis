# clockworklabs-SpacetimeDB (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/templates/chat-console-rs/spacetimedb/src/lib.rs` (Rust module, lines 1-96 read) and `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/templates/chat-react-ts/spacetimedb/src/index.ts` (TypeScript module, same design, read in full) with the client `templates/chat-react-ts/src/App.tsx` (24-62) | Licence: repo root `LICENSE.txt` is "SPACETIMEDB BUSINESS SOURCE LICENSE AGREEMENT", Business Source License 1.1; both template folders carry an Apache License 2.0 `LICENSE` (line 2 "Version 2.0, January 2004"). The two conflict and I did not resolve them, so I treat the code as restricted and clean-room | Rust and TypeScript | symbols `identity_connected` / `identity_disconnected` (Rust), `onConnect` / `onDisconnect` (TS), `send_message`

Checked: Read the Rust module lines 1-96 (tables, `set_name`, `send_message`, the connect and disconnect reducers) and the whole TypeScript module (89 lines). Read `App.tsx` 24-62 (the two presence views and their callbacks). The rest of `lib.rs` (97-425) is tests; I searched its test names by grep only. `index.test.ts` was not read (test names by grep only). Not read: the SpacetimeDB SDK and server internals, meaning how a `where(online.eq(...))` subscription is pushed to a client (`sdks/`, `docs/.../subscription-semantics.md`); the client-side claims below rely only on the donor's own callbacks in `App.tsx`. Confidence: high on the module (every reducer read), medium on the client's view behaviour (callbacks read, SDK not). Not a camera cell (`camera_scope` not applicable).

Best transferable idea: Take the author and the server time from the server's call context, never from the client, and keep presence as one online flag on the account row set by connect and disconnect hooks.
Decision (proposed): adapt — Server-verified authorship is Frankendom's rule and this module shows it in a few lines; the donor has no session count, so one closed tab would mark a player offline, and the licence is restricted, so only the shape transfers.
Acceptance: Server test: an account with two open sockets stays online after one closes and goes offline only when the last closes; a chat line carries the server's author id and server time whatever the client sent.

## 1. Mechanism

A small chat in which identity, presence and time all come from the server's call context. It is the closest donor to Frankendom's "server-verified" rule. The rest of the game is not here.

- Tables: `user` (identity as the primary key, an optional name, an `online` bool) and `message` (sender identity, server timestamp, text), both public (`lib.rs` 3-13 and 11; `index.ts` 6-18; `index.ts` 9 and 11 for the TS keys and flag).
- Identity: every reducer uses `ctx.sender()` (Rust) or `ctx.sender` (TS) as the author. The client cannot pass an author; `send_message` takes only the text (`lib.rs` 50; `index.ts` 42-43 "{ text: t.string() }" in the reducer signature).
- Time: a message is stored with `ctx.timestamp` (`lib.rs` 59; `index.ts` 53).
- Presence, order of operations on connect (`lib.rs` 68-83, `index.ts` 61-76):
  1. Look up the user row by sender identity.
  2. If found: set `online` true and keep the name (`lib.rs` 73; `index.ts` 66).
  3. If not found: insert a row with `online` true and no name (`lib.rs` 77-80; `index.ts` 70-74; the TS sets `name: undefined`, line 71).
- Presence on disconnect (`lib.rs` 85-94, `index.ts` 78-89): look up the row and set `online` false. A missing row is logged as unreachable.
- Name: `set_name` (`lib.rs` 27-39) updates the existing row only; an unknown identity is refused. An empty name is refused (`lib.rs` 19-20; TS `index.ts` 24).
- Client view: `App.tsx` subscribes to `user where online = true` (line 30) and to `user where online = false` (line 59). Its callbacks on the online view write a "has connected" line on insert (`onInsert`, line 32) and a "has disconnected" line on delete (`onDelete`, line 44). A row whose flag flips leaves one view and enters the other.

## 2. Key functions

- `identity_connected` (Rust): `lib.rs` 68-83, `#[spacetimedb::reducer(client_connected)]` at 68.
- `identity_disconnected` (Rust): `lib.rs` 85-94, lifecycle attribute at 85.
- `send_message` (Rust): `lib.rs` 49-62; TODO comments at 52-53.
- `set_name` (Rust): `lib.rs` 26-39.
- `onConnect`, `onDisconnect`, `send_message`, `set_name` (TS): `index.ts` 61-76, 78-89, 42-56, 27-36.
- Presence views (client): `App.tsx` 28-59 (predicate views); callbacks at 32 (`onInsert`) and 44 (`onDelete`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Author and time come from the server call context; the client sends text only | None (rule): `ctx.sender()` (Rust), `ctx.sender` (TS), `ctx.timestamp` (`lib.rs` 59; `index.ts` 53) |
| Presence is a flag on the account row, set by connect and disconnect hooks | None (rule): `online` true or false (`lib.rs` 73, 88; `index.ts` 66, 81) |
| A returning account keeps its name across sessions | None (rule): the update spreads the old row (`lib.rs` 73; `index.ts` 66) |
| Two predicate views over one table; a flip is a leave and an enter | Predicates `online = true` and `online = false` (`App.tsx` 30, 59) |
| Name fallback for display: the name, else the first 8 hex digits of the identity | 8 characters (`App.tsx` 34) |

No tunable numbers beyond the 8-character display fallback. The module has no rate limit, no message length limit and no session count. The TODO comments at `lib.rs` 52-53 name rate limiting and rejection of unnamed senders as not done.

## 4. TypeScript sketch

simplified: the sketch keeps the server-set author and time, the connect and disconnect flag rules, the unnamed-on-first-connect rule, the name check, and the client's leave-and-enter events from the two views. It omits: the SDK and its subscriptions (the sketch takes two arrays as input), the reducer wrappers and `SenderError`, the logging, the Rust variant (same shape), the `Timestamp` type (the sketch uses a number), and the test harness. It also changes one thing on purpose: the donor's disconnect branch logs an unreachable case, and the sketch returns an error value instead. It adds no session count, because the donor does not have one either; the sketch's disconnect marks the identity offline on any disconnect, as the donor does.

```ts
// Licence: BSL 1.1 at the repo root; the template folder LICENSE is Apache 2.0. Treated as restricted: clean-room sketch from the described mechanism, not a translation.
type Identity = string;

interface UserRow { identity: Identity; name?: string; online: boolean; }
interface MessageRow { sender: Identity; sent: number; text: string; }

interface Db { users: Map<Identity, UserRow>; messages: MessageRow[]; }
// The server sets sender and timestamp; a client cannot choose them.
interface Ctx { sender: Identity; timestamp: number; db: Db; }

type Result = { ok: true } | { ok: false; error: string };

// Lifecycle: connect. A returning identity keeps its name; a new one gets a row with no name.
function onConnect(ctx: Ctx): void {
  const existing = ctx.db.users.get(ctx.sender);
  if (existing) existing.online = true;
  else ctx.db.users.set(ctx.sender, { identity: ctx.sender, online: true });
}

// Lifecycle: disconnect. No count of open sessions is kept, so any disconnect marks the identity offline.
function onDisconnect(ctx: Ctx): Result {
  const existing = ctx.db.users.get(ctx.sender);
  if (!existing) return { ok: false, error: "disconnect for unknown identity" };
  existing.online = false;
  return { ok: true };
}

function setName(ctx: Ctx, name: string): Result {
  if (!name) return { ok: false, error: "Names must not be empty" };
  const user = ctx.db.users.get(ctx.sender);
  if (!user) return { ok: false, error: "Cannot set name for unknown user" };
  user.name = name;
  return { ok: true };
}

function sendMessage(ctx: Ctx, text: string): Result {
  if (!text) return { ok: false, error: "Messages must not be empty" };
  // Not done in the donor either: rate limit, and rejecting senders without a name.
  ctx.db.messages.push({ sender: ctx.sender, sent: ctx.timestamp, text });
  return { ok: true };
}

// Client: one users table, two predicate views. A row whose online flag flips leaves one view and enters the other.
type ViewEvent = { kind: "connected" | "disconnected"; label: string };

function onlineViewEvents(before: UserRow[], after: UserRow[]): ViewEvent[] {
  const wasOnline = new Set(before.filter((u) => u.online).map((u) => u.identity));
  const events: ViewEvent[] = [];
  for (const u of after) {
    const label = u.name || u.identity.slice(0, 8);
    if (u.online && !wasOnline.has(u.identity)) events.push({ kind: "connected", label });
    if (!u.online && wasOnline.has(u.identity)) events.push({ kind: "disconnected", label });
  }
  return events;
}
```

## 5. Lands in

- TARGET `origins/server/social-chat.ts` (new, proposed; not checked against the Frankendom repo). The same module as the cell 1 mute list and the cell 2 relay.
- Parity row: 14 (HUD) is the nearest row: the presence list and the join and leave lines are HUD. The server-side identity and presence flag fit no row in 1-23, so they have no parity row (none).
- Reuse tag: clean-room (restricted licence: BSL 1.1 at the root, with Apache 2.0 template LICENSE files that conflict; the sketch is written from the mechanism, not copied)
- Brief rule served: server-verified (the author and time come from the server, not the client); one ledger (presence and name are one row per identity)

## 6. Gaps and risks

- The donor does not reject an unnamed sender. Its own TODO says so (`lib.rs` 53; `index.ts` 47). Frankendom's chat needs a rule for that.
- No rate limit on `send_message` (`lib.rs` 52; `index.ts` 46). A spam path is open in this donor.
- Presence has no session count. Any disconnect sets `online` false (`lib.rs` 88), so a player with two open sockets (two tabs) shows offline when one closes. Frankendom needs a count per account, or the flag is wrong for the second tab.
- Presence is written on connect and disconnect only. A socket that drops without a close event is not covered by this module; the donor does not handle timeouts itself (SDK behaviour not read).
- Messages are kept in a public table (`lib.rs` 11) and this module never deletes them. No retention rule is in this module. Frankendom's social chat needs a retention rule as data, not a constant.
- The client's "has connected" lines come from the view callbacks (App.tsx 32 and 44), so they depend on the subscription's order of events, which the SDK defines and I did not read.
- No party, guild, rank, friend list or invite exists in this donor. The only transferable pieces are the server-set author, the presence flag, and the two-view client pattern.
