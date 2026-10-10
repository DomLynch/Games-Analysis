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

export {};
